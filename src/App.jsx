import React, { useEffect, useState } from 'react';
import QRCode from 'react-qr-code';
import clsx from 'clsx';
import { nanoid } from 'nanoid';
import { ALLERGENS, BASE_CATEGORIES, BRAND_PALETTE } from './constants';
import { translateDish } from './utils/translator';
import { clearState, loadState, saveState } from './utils/storage';
import * as api from './api';

const emptyAuth = {
  status: 'logged_out',
  role: null,
  email: null,
  name: null,
  avatar: null,
};

const buildRestaurant = (owner) => ({
  id: nanoid(8),
  ownerEmail: owner.email,
  ownerName: owner.name,
  company: { name: '', address: '', phone: '' },
  categories: BASE_CATEGORIES.map((c) => ({ ...c })),
  dishes: [],
  published: false,
  menuLink: '',
  qrColor: BRAND_PALETTE[0],
  tagline: 'Qarta: tu carta digital en 5 minutos. www.qarta.xyzdigital.es',
  status: 'active',
  setupCompleted: false,
  createdAt: Date.now(),
});

const slugify = (value) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');

const dishSkeleton = (categories) => ({
  id: nanoid(6),
  title: '',
  description: '',
  price: '',
  categoryId: categories?.[0]?.id || '',
  allergens: [],
  imageUrl: '',
  translations: { en: { title: '', description: '' }, de: { title: '', description: '' } },
});

const normalizeRestaurant = (rest) => {
  if (!rest) return null;
  const status = (rest.status || '').toLowerCase();
  return {
    ...rest,
    company: {
      name: rest.companyName || '',
      address: rest.address || '',
      phone: rest.phone || '',
    },
    status: status === 'paused' ? 'paused' : 'active',
    categories: rest.categories || [],
    dishes: (rest.dishes || []).map((dish) => ({
      ...dish,
      price: typeof dish.price === 'string' ? Number(dish.price) : Number(dish.price || 0),
    })),
  };
};

const GradientChip = ({ label }) => (
  <span className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand-500/10 to-brand-300/10 px-3 py-1 text-xs font-semibold text-brand-700 ring-1 ring-brand-100">
    <span className="h-2 w-2 rounded-full bg-brand-500" />
    {label}
  </span>
);

const SectionCard = ({ title, description, children, actions, className }) => (
  <div className={clsx('rounded-2xl border border-slate-200 bg-white p-6 shadow-sm', className)}>
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">Qarta</p>
        <h3 className="font-heading text-xl font-semibold text-slate-900">{title}</h3>
        {description && <p className="text-sm text-slate-500">{description}</p>}
      </div>
      {actions}
    </div>
    {children}
  </div>
);

const Header = ({ auth, onLogout, onEditProfile, showEditProfile = true }) => (
  <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
    <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-300 text-lg font-bold text-white shadow-glow">
          Q
        </div>
        <div>
          <p className="text-xs font-semibold uppercase text-brand-600">Panel Qarta</p>
          <h2 className="font-heading text-lg text-slate-900">Hola, {auth.name}</h2>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {showEditProfile && (
          <button
            onClick={onEditProfile}
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-brand-200 hover:text-brand-700"
          >
            Editar perfil de empresa
          </button>
        )}
        <button
          onClick={onLogout}
          className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-glow transition hover:bg-brand-600"
        >
          Cerrar sesión
        </button>
        {auth.avatar && (
          <img src={auth.avatar} className="h-10 w-10 rounded-full border border-slate-200 object-cover" alt={auth.name} />
        )}
      </div>
    </div>
  </header>
);

const Landing = ({ onLogin }) => {
  const sellingPoints = [
    'QR personalizado con marca Qarta listo para descargar.',
    'Onboarding guiado: empresa, platos y previsualización en minutos.',
    'Traducción automática a inglés y alemán sin instalar nada.',
    'Control total: publica, edita o pausa tu carta cuando quieras.',
  ];

  return (
    <div className="min-h-screen gradient-card text-white">
      <div className="relative mx-auto flex max-w-6xl flex-col gap-16 px-4 py-12 lg:flex-row lg:items-center">
        <div className="space-y-6 lg:w-1/2">
          <GradientChip label="Qarta: tu carta digital en 5 minutos" />
          <h1 className="font-heading text-4xl font-semibold leading-tight text-white sm:text-5xl">
            Carta digital QR para bares y restaurantes
            <span className="block text-orange-200">Un menú limpio, cuidado y listo sin PDFs feos.</span>
          </h1>
          <p className="text-lg text-orange-50">
            Qarta te guía para crear una carta moderna con Google Login, traducciones automáticas y un QR con tu marca. Olvídate
            de archivos pesados y menús desactualizados.
          </p>
          <div className="space-y-3">
            {sellingPoints.map((point) => (
              <div key={point} className="flex items-start gap-3 text-orange-50">
                <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-orange-200">•</span>
                <p>{point}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              onClick={() => onLogin('client')}
              className="flex items-center gap-3 rounded-xl bg-white px-5 py-3 text-slate-900 shadow-lg shadow-brand-500/20 transition hover:-translate-y-0.5"
            >
              <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">Google</span>
              <span className="text-sm font-semibold">Entrar como cliente</span>
            </button>
            <button
              onClick={() => onLogin('superadmin')}
              className="flex items-center gap-3 rounded-xl border border-white/40 px-5 py-3 text-white transition hover:bg-white/10"
            >
              <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white">Google</span>
              <span className="text-sm font-semibold">Entrar como superadmin</span>
            </button>
          </div>
        </div>
        <div className="lg:w-1/2">
          <div className="glass elevated rounded-3xl p-6 text-slate-900 shadow-glow">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-brand-600">Demostración</p>
                <p className="font-heading text-xl font-semibold text-slate-900">Así se ve tu carta en Qarta</p>
              </div>
              <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">QR listo</span>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 overflow-hidden rounded-xl">
                  <img
                    src="https://images.unsplash.com/photo-1521917441209-e886f0404a7b?auto=format&fit=crop&w=400&q=80"
                    alt="Restaurante"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Bar-Restaurante Carta digital</p>
                  <p className="text-xs text-slate-500">Entrantes, principales, postres y vinos en un solo QR</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase text-brand-600">Plato destacado</p>
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <p className="font-semibold text-slate-900">Croquetas mixtas</p>
                    <p className="text-xs text-slate-600">Crujientes con relleno cremoso</p>
                    <p className="mt-2 text-lg font-bold text-brand-700">11,50 €</p>
                    <div className="mt-2 flex gap-2">
                      <span className="flex items-center gap-1 rounded-full bg-orange-100 px-2 py-1 text-[11px] font-semibold text-orange-800 ring-1 ring-orange-200">
                        🥚 Huevo
                      </span>
                      <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-800 ring-1 ring-amber-200">
                        🥛 Lactosa
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-center rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <QRCode
                    value="https://qarta.xyzdigital.es/menu/demo"
                    bgColor="#fdf7f2"
                    fgColor="#1f1729"
                    className="h-32 w-32"
                  />
                </div>
              </div>
              <p className="mt-4 text-xs text-slate-500">Qarta: tu carta digital en 5 minutos. www.qarta.xyzdigital.es</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const CompanyForm = ({ company, onSave }) => {
  const [form, setForm] = useState(company);

  useEffect(() => setForm(company), [company]);

  const handleSubmit = (event) => {
    event.preventDefault();
    onSave(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-1">
          <label className="text-sm font-semibold text-slate-700">Nombre del local</label>
          <input
            className="w-full rounded-xl border-slate-200 text-sm shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="Ej. Restaurante Mar"
            required
          />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <label className="text-sm font-semibold text-slate-700">Dirección</label>
          <input
            className="w-full rounded-xl border-slate-200 text-sm shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
            value={form.address}
            onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
            placeholder="Calle, número, ciudad"
            required
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-semibold text-slate-700">Teléfono</label>
          <input
            className="w-full rounded-xl border-slate-200 text-sm shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
            value={form.phone}
            onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
            placeholder="+34 600 000 000"
            required
          />
        </div>
      </div>
      <div className="flex justify-end">
        <button
          type="submit"
          className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-glow transition hover:bg-brand-600"
        >
          Guardar datos
        </button>
      </div>
    </form>
  );
};

const DishForm = ({ categories, draft, setDraft, onAddDish, onTranslate, translationLoading }) => {
  const handleImage = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setDraft((prev) => ({ ...prev, imageUrl: e.target?.result || '' }));
    };
    reader.readAsDataURL(file);
  };

  const toggleAllergen = (id) => {
    setDraft((prev) => ({
      ...prev,
      allergens: prev.allergens.includes(id) ? prev.allergens.filter((a) => a !== id) : [...prev.allergens, id],
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!draft.title.trim()) return;
    onAddDish({
      ...draft,
      price: Number(draft.price || 0),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-sm font-semibold text-slate-700">Título del plato</label>
          <input
            className="w-full rounded-xl border-slate-200 text-sm shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
            value={draft.title}
            onChange={(e) => setDraft((prev) => ({ ...prev, title: e.target.value }))}
            placeholder="Ej. Croquetas de jamón"
            required
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-semibold text-slate-700">Precio (€)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            className="w-full rounded-xl border-slate-200 text-sm shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
            value={draft.price}
            onChange={(e) => setDraft((prev) => ({ ...prev, price: e.target.value }))}
            placeholder="11.50"
            required
          />
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-sm font-semibold text-slate-700">Descripción</label>
        <textarea
          rows={3}
          className="w-full rounded-xl border-slate-200 text-sm shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
          value={draft.description}
          onChange={(e) => setDraft((prev) => ({ ...prev, description: e.target.value }))}
          placeholder="Breve descripción apetecible"
          required
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-1">
          <label className="text-sm font-semibold text-slate-700">Categoría</label>
          <select
            className="w-full rounded-xl border-slate-200 text-sm shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
            value={draft.categoryId}
            onChange={(e) => setDraft((prev) => ({ ...prev, categoryId: e.target.value }))}
          >
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1 sm:col-span-2">
          <label className="text-sm font-semibold text-slate-700">Imagen</label>
          <div className="flex items-center gap-3">
            <input
              type="file"
              accept="image/*"
              onChange={handleImage}
              className="w-full rounded-xl border-slate-200 text-sm shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
            />
            {draft.imageUrl && <img src={draft.imageUrl} alt="Plato" className="h-12 w-12 rounded-xl object-cover" />}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-semibold text-slate-700">Alérgenos</p>
        <div className="flex flex-wrap gap-2">
          {ALLERGENS.map((allergen) => {
            const active = draft.allergens.includes(allergen.id);
            return (
              <button
                key={allergen.id}
                type="button"
                onClick={() => toggleAllergen(allergen.id)}
                className={clsx(
                  'flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold transition',
                  active ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-slate-200 text-slate-600',
                )}
              >
                <span>{allergen.emoji}</span>
                {allergen.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onTranslate}
          className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700 transition hover:bg-brand-100"
          disabled={translationLoading || !draft.title}
        >
          {translationLoading ? 'Traduciendo...' : 'Traducir a inglés y alemán'}
        </button>
        <button
          type="submit"
          className="rounded-xl bg-brand-500 px-5 py-2 text-sm font-semibold text-white shadow-glow transition hover:bg-brand-600"
        >
          Añadir plato
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase text-slate-600">Inglés</p>
          <p className="text-sm font-semibold text-slate-900">{draft.translations.en.title}</p>
          <p className="text-xs text-slate-600">{draft.translations.en.description}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase text-slate-600">Alemán</p>
          <p className="text-sm font-semibold text-slate-900">{draft.translations.de.title}</p>
          <p className="text-xs text-slate-600">{draft.translations.de.description}</p>
        </div>
      </div>
    </form>
  );
};

const MenuPreview = ({ restaurant, activeCategory, onChangeCategory }) => {
  const dishesByCategory = restaurant.dishes.filter((dish) => dish.categoryId === activeCategory);
  const activeCatName = restaurant.categories.find((c) => c.id === activeCategory)?.name || '';

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap gap-2 border-b border-slate-100 px-4 py-3">
        {restaurant.categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onChangeCategory(cat.id)}
            className={clsx(
              'rounded-full px-4 py-2 text-sm font-semibold transition',
              activeCategory === cat.id
                ? 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100',
            )}
          >
            {cat.name}
          </button>
        ))}
      </div>
      <div className="space-y-4 p-4">
        {dishesByCategory.length === 0 && (
          <p className="text-sm text-slate-500">No hay platos en {activeCatName}. Añade algunos para ver la vista previa.</p>
        )}
        {dishesByCategory.map((dish) => (
          <div key={dish.id} className="flex gap-4 rounded-xl border border-slate-100 bg-slate-50 p-3">
            <div className="h-20 w-20 overflow-hidden rounded-xl bg-slate-200">
              {dish.imageUrl ? (
                <img src={dish.imageUrl} alt={dish.title} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-slate-400">Sin imagen</div>
              )}
            </div>
            <div className="flex flex-1 flex-col gap-1">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">{dish.title}</p>
                  <p className="text-xs text-slate-500">{dish.translations.en.title || 'Traducido a EN/DE al publicar'}</p>
                </div>
                <p className="text-lg font-bold text-emerald-700">{dish.price.toFixed(2)} €</p>
              </div>
              <p className="text-sm text-slate-600">{dish.description}</p>
              <div className="flex flex-wrap gap-2">
                {dish.allergens.map((id) => {
                  const allergen = ALLERGENS.find((a) => a.id === id);
                  if (!allergen) return null;
                  return (
                    <span
                      key={id}
                      className={clsx(
                        'inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-semibold',
                        allergen.tone,
                      )}
                    >
                      <span>{allergen.emoji}</span>
                      {allergen.label}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const QrPreview = ({ link, color, tagline, onDownload }) => (
  <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-emerald-50 p-4 shadow-sm">
    <div className="rounded-2xl bg-white p-4 shadow-glow">
      <QRCode value={link} bgColor="#ffffff" fgColor={color} className="h-40 w-40" id="qarta-qr" />
      <div className="-mt-8 flex items-center justify-center">
        <div className="flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-emerald-700 shadow">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-sky-500 text-white">
            Q
          </div>
          Qarta
        </div>
      </div>
    </div>
    <p className="text-center text-xs text-slate-600">{tagline}</p>
    <button
      onClick={onDownload}
      className="rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold text-white shadow-glow transition hover:bg-emerald-600"
    >
      Descargar QR
    </button>
  </div>
);

const SuperAdminPanel = ({ restaurants, onToggleStatus, onToggleMenu, onImpersonate, onLogout, showEditProfile }) => {
  return (
    <div className="min-h-screen bg-slate-50">
      <Header
        auth={{ name: 'Superadmin Qarta', avatar: 'https://api.dicebear.com/8.x/shapes/svg?seed=qarta-owner' }}
        onLogout={onLogout}
        onEditProfile={() => {}}
        showEditProfile={!!showEditProfile}
      />
      <main className="mx-auto max-w-6xl px-4 py-8 space-y-6">
        <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 p-6 text-white shadow-glow">
          <p className="text-sm uppercase tracking-wide text-emerald-200">Superadmin</p>
          <h2 className="font-heading text-3xl font-semibold">Control de cartas digitales</h2>
          <p className="text-slate-200">
            Gestiona empresas, activa o pausa cartas y accede como cliente para soporte.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="grid grid-cols-6 gap-3 border-b border-slate-100 px-4 py-3 text-xs font-semibold uppercase text-slate-500">
            <span>Empresa</span>
            <span className="col-span-2">Carta</span>
            <span>Estado</span>
            <span>Acciones</span>
            <span>Menú</span>
          </div>
          <div className="divide-y divide-slate-100">
            {restaurants.map((rest) => (
              <div key={rest.id} className="grid grid-cols-6 items-center gap-3 px-4 py-3 text-sm">
                <div>
                  <p className="font-semibold text-slate-900">{rest.company.name || 'Sin nombre'}</p>
                  <p className="text-xs text-slate-500">{rest.ownerEmail}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-slate-500">Categorías: {rest.categories.length}</p>
                  <p className="text-xs text-slate-500">Platos: {rest.dishes.length}</p>
                  {rest.menuLink && (
                    <a href={rest.menuLink} target="_blank" className="text-xs font-semibold text-emerald-700">
                      {rest.menuLink}
                    </a>
                  )}
                </div>
                <div>
                  <span
                    className={clsx(
                      'rounded-full px-3 py-1 text-xs font-semibold',
                      rest.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700',
                    )}
                  >
                    {rest.status === 'active' ? 'Activa' : 'Pausada'}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => onToggleStatus(rest.id)}
                    className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:border-emerald-200 hover:text-emerald-700"
                  >
                    {rest.status === 'active' ? 'Pausar empresa' : 'Activar empresa'}
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggleMenu(rest.id)}
                    className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:border-amber-200 hover:text-amber-700"
                  >
                    {rest.published ? 'Despublicar carta' : 'Publicar carta'}
                  </button>
                </div>
                <div className="flex gap-2">
                  <span className="text-[11px] font-semibold text-slate-400">Vista cliente (pendiente)</span>
                </div>
              </div>
            ))}
            {restaurants.length === 0 && <p className="p-4 text-sm text-slate-500">Aún no hay empresas.</p>}
          </div>
        </div>
      </main>
    </div>
  );
};

const AdminExperience = ({
  auth,
  restaurant,
  onCompanySave,
  onAddDish,
  onDeleteDish,
  onAddCategory,
  onPublish,
  onUnpublish,
  onDeleteMenu,
  onChangeQrColor,
  onEditTagline,
  onFinishOnboarding,
  showProfileEditor,
  onCloseProfileEditor = () => {},
}) => {
  const [wizardStep, setWizardStep] = useState(0);
  const [draft, setDraft] = useState(dishSkeleton(restaurant.categories));
  const [translationLoading, setTranslationLoading] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [activeCategory, setActiveCategory] = useState(restaurant.categories[0]?.id || '');

  useEffect(() => setDraft(dishSkeleton(restaurant.categories)), [restaurant.categories]);
  useEffect(() => {
    if (restaurant.categories.length) {
      setActiveCategory(restaurant.categories[0].id);
    }
  }, [restaurant.categories]);

  const handleTranslate = async () => {
    if (!draft.title) return;
    setTranslationLoading(true);
    const translations = await translateDish(draft.title, draft.description);
    setDraft((prev) => ({ ...prev, translations }));
    setTranslationLoading(false);
  };

  const handleAddDish = (newDish) => {
    onAddDish(newDish);
    setDraft(dishSkeleton(restaurant.categories));
  };

  const handleAddCategory = () => {
    if (!categoryName.trim()) return;
    const id = slugify(categoryName);
    onAddCategory({ id: id || nanoid(4), name: categoryName });
    setCategoryName('');
  };

  const downloadQr = () => {
    const svg = document.getElementById('qarta-qr');
    if (!svg) return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svg);
    const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(source)}`;
    const link = document.createElement('a');
    link.href = url;
    link.download = 'qarta-qr.svg';
    link.click();
  };

  const onboardingSteps = [
    { title: 'Datos de la empresa', description: 'Nombre, dirección y teléfono.' },
    { title: 'Añade tus platos', description: 'Sube imágenes, precios y alérgenos.' },
    { title: 'Previsualiza y publica', description: 'Genera tu QR y confirma.' },
  ];

  const renderOnboarding = () => (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          {onboardingSteps.map((step, index) => (
            <div key={step.title} className="flex items-center gap-2">
              <div
                className={clsx(
                  'flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold',
                  index === wizardStep
                    ? 'bg-emerald-500 text-white'
                    : index < wizardStep
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-slate-100 text-slate-500',
                )}
              >
                {index + 1}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">{step.title}</p>
                <p className="text-xs text-slate-500">{step.description}</p>
              </div>
              {index < onboardingSteps.length - 1 && <div className="h-px w-8 bg-slate-200" />}
            </div>
          ))}
        </div>
      </div>

      {wizardStep === 0 && (
        <SectionCard
          title="Comencemos con tu restaurante"
          description="Solo pedimos lo esencial para montar tu carta digital."
          actions={<GradientChip label="Paso 1 de 3" />}
        >
          <CompanyForm company={restaurant.company} onSave={(data) => onCompanySave(data)} />
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => setWizardStep(1)}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5"
            >
              Siguiente: platos
            </button>
          </div>
        </SectionCard>
      )}

      {wizardStep === 1 && (
        <SectionCard
          title="Añade tus primeros platos"
          description="Sube una foto, marca alérgenos y traduce al instante."
          actions={<GradientChip label="Paso 2 de 3" />}
        >
          <DishForm
            categories={restaurant.categories}
            draft={draft}
            setDraft={setDraft}
            onAddDish={handleAddDish}
            onTranslate={handleTranslate}
            translationLoading={translationLoading}
          />
          <div className="mt-4 flex items-center justify-between">
            <button
              onClick={() => setWizardStep(0)}
              className="text-sm font-semibold text-slate-600 underline-offset-4 hover:text-emerald-700 hover:underline"
            >
              Volver a datos de empresa
            </button>
            <button
              onClick={() => setWizardStep(2)}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5"
              disabled={!restaurant.dishes.length}
            >
              Siguiente: previsualizar
            </button>
          </div>
        </SectionCard>
      )}

      {wizardStep === 2 && (
        <SectionCard
          title="Tu carta digital"
          description="Revisa cómo se verá y genera tu QR personalizado."
          actions={<GradientChip label="Paso 3 de 3" />}
        >
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <MenuPreview restaurant={restaurant} activeCategory={activeCategory} onChangeCategory={setActiveCategory} />
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">Color del QR</p>
                <div className="flex flex-wrap gap-2">
                  {BRAND_PALETTE.map((c) => (
                    <button
                      key={c}
                      onClick={() => onChangeQrColor(c)}
                      className={clsx(
                        'h-10 w-10 rounded-full border-2 transition',
                        restaurant.qrColor === c ? 'border-slate-900' : 'border-slate-200',
                      )}
                      style={{ backgroundColor: c }}
                      title={c}
                    />
                  ))}
                </div>
                <label className="mt-3 block text-sm font-semibold text-slate-700">Eslogan debajo del QR</label>
                <input
                  className="mt-1 w-full rounded-xl border-slate-200 text-sm shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                  value={restaurant.tagline}
                  onChange={(e) => onEditTagline(e.target.value)}
                />
              </div>
              <QrPreview
                link={restaurant.menuLink || 'https://qarta.xyzdigital.es/menu/preview'}
                color={restaurant.qrColor}
                tagline={restaurant.tagline}
                onDownload={downloadQr}
              />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={() => setWizardStep(1)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-emerald-200 hover:text-emerald-700"
            >
              Volver a platos
            </button>
            <button
              onClick={() => {
                onPublish();
                onFinishOnboarding();
              }}
              className="rounded-xl bg-emerald-500 px-5 py-2 text-sm font-semibold text-white shadow-glow transition hover:bg-emerald-600"
            >
              Confirmar y generar carta digital
            </button>
          </div>
        </SectionCard>
      )}
    </div>
  );

  if (!restaurant.setupCompleted) return renderOnboarding();

  return (
    <div className="space-y-6">
      {showProfileEditor && (
        <SectionCard
          title="Editar información de la empresa"
          description="Actualiza los datos visibles en tu carta digital."
          actions={
            <button className="text-xs font-semibold text-slate-500 underline" onClick={onCloseProfileEditor}>
              Cerrar
            </button>
          }
        >
          <CompanyForm company={restaurant.company} onSave={(data) => onCompanySave(data)} />
        </SectionCard>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="col-span-2 space-y-6">
          <SectionCard
            title="Añadir plato"
            description="Sube foto, marca alérgenos y traduce automáticamente."
            actions={<GradientChip label="Carta viva" />}
          >
            <DishForm
              categories={restaurant.categories}
              draft={draft}
              setDraft={setDraft}
              onAddDish={handleAddDish}
              onTranslate={handleTranslate}
              translationLoading={translationLoading}
            />
          </SectionCard>

          <SectionCard
            title="Categorías"
            description="Organiza tus platos en secciones o crea categorías especiales."
            actions={<span className="text-xs font-semibold text-slate-500">{restaurant.categories.length} categorías</span>}
          >
            <div className="mb-3 flex flex-wrap gap-2">
              {restaurant.categories.map((cat) => (
                <span key={cat.id} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  {cat.name}
                </span>
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              <input
                className="w-full flex-1 rounded-xl border-slate-200 text-sm shadow-sm focus:border-emerald-500 focus:ring-emerald-500"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                placeholder="Ej. Plato del mes, Especial Navidad..."
              />
              <button
                type="button"
                onClick={handleAddCategory}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5"
              >
                Añadir categoría
              </button>
            </div>
          </SectionCard>

          <SectionCard
            title="Platos añadidos"
            description="Elimina o ajusta precios antes de publicar."
            actions={<span className="text-xs font-semibold text-slate-500">{restaurant.dishes.length} platos</span>}
          >
            <div className="space-y-3">
              {restaurant.dishes.length === 0 && <p className="text-sm text-slate-500">Todavía no hay platos.</p>}
              {restaurant.dishes.map((dish) => (
                <div key={dish.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div>
                    <p className="font-semibold text-slate-900">{dish.title}</p>
                    <p className="text-xs text-slate-500">{dish.categoryId}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-semibold text-emerald-700">{dish.price.toFixed(2)} €</p>
                    <button
                      onClick={() => onDeleteDish(dish.id)}
                      className="text-xs font-semibold text-red-600 underline-offset-4 hover:underline"
                    >
                      Borrar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard
            title="Previsualización"
            description="Así verán tu carta los comensales."
            actions={restaurant.published ? <GradientChip label="Carta publicada" /> : <GradientChip label="Borrador" />}
          >
            <MenuPreview restaurant={restaurant} activeCategory={activeCategory} onChangeCategory={setActiveCategory} />
          </SectionCard>

          <SectionCard title="QR personalizado" description="Color de marca, descarga y enlace listo.">
            <QrPreview
              link={restaurant.menuLink || 'https://qarta.xyzdigital.es/menu/preview'}
              color={restaurant.qrColor}
              tagline={restaurant.tagline}
              onDownload={downloadQr}
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={restaurant.published ? onUnpublish : onPublish}
                className={clsx(
                  'rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-glow transition',
                  restaurant.published ? 'bg-amber-500 hover:bg-amber-600' : 'bg-brand-500 hover:bg-brand-600',
                )}
              >
                {restaurant.published ? 'Pausar carta' : 'Publicar carta'}
              </button>
              <button
                onClick={onDeleteMenu}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-red-200 hover:text-red-600"
              >
                Eliminar carta
              </button>
            </div>
            <div className="mt-3 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800">
              Solo se permite una carta activa por empresa. Borra o pausa la actual antes de generar otra.
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
};

function App() {
  const [token, setToken] = useState(() => loadState('token', null));
  const [user, setUser] = useState(() => loadState('user', null));
  const [restaurant, setRestaurant] = useState(null);
  const [adminRestaurants, setAdminRestaurants] = useState([]);
  const [booting, setBooting] = useState(!!loadState('token', null));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showProfileEditor, setShowProfileEditor] = useState(false);

  useEffect(() => {
    api.setToken(token);
    if (token) saveState('token', token);
    else clearState('token');
  }, [token]);

  useEffect(() => {
    if (user) saveState('user', user);
    else clearState('user');
  }, [user]);

  useEffect(() => {
    const init = async () => {
      if (!token) {
        setBooting(false);
        return;
      }
      setBooting(true);
      try {
        const { user: me, restaurant: rest } = await api.getMe();
        setUser(me);
        setRestaurant(normalizeRestaurant(rest));
        if (me.role === 'SUPERADMIN') {
          const { restaurants } = await api.adminRestaurants();
          setAdminRestaurants(restaurants.map(normalizeRestaurant));
        }
      } catch (err) {
        setError(err.message);
        setToken(null);
        setUser(null);
        setRestaurant(null);
      } finally {
        setBooting(false);
      }
    };
    init();
  }, [token]);

  const auth = user
    ? {
        status: 'logged_in',
        role: user.role === 'SUPERADMIN' ? 'superadmin' : 'client',
        email: user.email,
        name: user.name,
        avatar: user.avatar,
      }
    : emptyAuth;

  const login = async (role) => {
    setLoading(true);
    setError('');
    try {
      const payloadRole = role === 'superadmin' ? 'SUPERADMIN' : 'CLIENT';
      const { token: tk, user: u, restaurant: rest } = await api.authDev(payloadRole);
      setToken(tk);
      api.setToken(tk); // asegurar header antes de llamadas inmediatas
      setUser(u);
      setRestaurant(normalizeRestaurant(rest));
      if (u.role === 'SUPERADMIN') {
        const { restaurants } = await api.adminRestaurants();
        setAdminRestaurants(restaurants.map(normalizeRestaurant));
      } else {
        setAdminRestaurants([]);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
    api.setToken(null);
    setUser(null);
    setRestaurant(null);
    setAdminRestaurants([]);
    setError('');
    clearState('token');
    clearState('user');
  };

  const refreshRestaurant = async () => {
    if (!token) return;
    const { restaurant: rest } = await api.getRestaurant();
    setRestaurant(normalizeRestaurant(rest));
  };

  const handleCompanySave = async (company) => {
    const { restaurant: rest } = await api.updateRestaurant({
      companyName: company.name,
      address: company.address,
      phone: company.phone,
    });
    setRestaurant(normalizeRestaurant(rest));
  };

  const handleAddDish = async (dish) => {
    await api.createDish({ ...dish, price: Number(dish.price || 0) });
    await refreshRestaurant();
  };

  const handleDeleteDish = async (dishId) => {
    await api.deleteDish(dishId);
    await refreshRestaurant();
  };

  const handleAddCategory = async (category) => {
    await api.createCategory(category.name);
    await refreshRestaurant();
  };

  const handlePublish = async () => {
    const { restaurant: rest } = await api.publishMenu();
    setRestaurant(normalizeRestaurant(rest));
  };

  const handleUnpublish = async () => {
    const { restaurant: rest } = await api.unpublishMenu();
    setRestaurant(normalizeRestaurant(rest));
  };

  const handleDeleteMenu = async () => {
    const { restaurant: rest } = await api.deleteMenu();
    setRestaurant(normalizeRestaurant(rest));
  };

  const handleChangeQrColor = async (color) => {
    const { restaurant: rest } = await api.updateRestaurant({ qrColor: color });
    setRestaurant(normalizeRestaurant(rest));
  };

  const handleEditTagline = async (tagline) => {
    const { restaurant: rest } = await api.updateRestaurant({ tagline });
    setRestaurant(normalizeRestaurant(rest));
  };

  const finishOnboarding = async () => {
    const { restaurant: rest } = await api.publishMenu();
    setRestaurant(normalizeRestaurant(rest));
  };

  const toggleRestaurantStatus = async (id) => {
    try {
      await api.adminToggleStatus(id);
      const { restaurants } = await api.adminRestaurants();
      setAdminRestaurants(restaurants.map(normalizeRestaurant));
    } catch (err) {
      setError(err.message);
    }
  };

  const toggleMenuPublish = async (id) => {
    try {
      await api.adminToggleMenu(id);
      const { restaurants } = await api.adminRestaurants();
      setAdminRestaurants(restaurants.map(normalizeRestaurant));
    } catch (err) {
      setError(err.message);
    }
  };

  const impersonate = async () => {
    setError('Impersonar requiere endpoint dedicado. Usa login de cliente para probar.');
  };

  if (booting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="font-semibold text-slate-900">Cargando sesión...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        {error && <div className="absolute inset-x-0 top-0 bg-red-100 px-4 py-2 text-sm text-red-800">{error}</div>}
        <Landing onLogin={login} />
      </>
    );
  }

  if (auth.role === 'superadmin') {
    return (
      <SuperAdminPanel
        restaurants={adminRestaurants}
        onToggleStatus={toggleRestaurantStatus}
        onToggleMenu={toggleMenuPublish}
        onImpersonate={impersonate}
        onLogout={logout}
        showEditProfile={false}
      />
    );
  }

  if (!restaurant) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="font-semibold text-slate-900">Cargando restaurante...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Header
        auth={auth}
        onLogout={logout}
        onEditProfile={() => setShowProfileEditor(true)}
        showEditProfile={!!restaurant?.setupCompleted}
      />
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <div className="rounded-3xl bg-gradient-to-br from-[#1f1729] via-[#2a1e38] to-brand-800 p-6 text-white shadow-glow">
          <p className="text-sm uppercase tracking-wide text-brand-100">Bienvenido a Qarta</p>
          <h2 className="font-heading text-3xl font-semibold">Tu carta digital QR lista en minutos</h2>
          <p className="text-orange-50">
            Completa el onboarding, traduce tus platos y descarga el QR personalizado con el logo de Qarta.
          </p>
        </div>
        {error && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        <AdminExperience
          auth={auth}
          restaurant={restaurant}
          onCompanySave={handleCompanySave}
          onAddDish={handleAddDish}
          onDeleteDish={handleDeleteDish}
          onAddCategory={handleAddCategory}
          onPublish={handlePublish}
          onUnpublish={handleUnpublish}
          onDeleteMenu={handleDeleteMenu}
          onChangeQrColor={handleChangeQrColor}
          onEditTagline={handleEditTagline}
          onFinishOnboarding={finishOnboarding}
          showProfileEditor={showProfileEditor}
          onCloseProfileEditor={() => setShowProfileEditor(false)}
        />
      </main>
    </div>
  );
}

export default App;
