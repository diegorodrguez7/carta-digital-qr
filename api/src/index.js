import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { PrismaClient, Role } from '@prisma/client';

const app = express();
const prisma = new PrismaClient();
const client = process.env.GOOGLE_CLIENT_ID ? new OAuth2Client(process.env.GOOGLE_CLIENT_ID) : null;

const BASE_CATEGORIES = [
  'Entrantes',
  'Platos principales',
  'Postres',
  'Bebidas',
  'Vinos',
];

app.use(cors());
app.use(express.json({ limit: '4mb' }));

const superadmins =
  process.env.SUPERADMIN_EMAILS?.split(',').map((v) => v.trim().toLowerCase()).filter(Boolean) || [];

const signToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '7d' });

async function verifyGoogleToken(idToken) {
  if (!client) throw new Error('GOOGLE_CLIENT_ID not configured');
  const ticket = await client.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  return ticket.getPayload();
}

async function ensureRestaurantForUser(user) {
  if (user.role !== Role.CLIENT) return null;
  const existing = await prisma.restaurant.findFirst({
    where: { ownerId: user.id },
    include: { categories: true, dishes: true },
  });
  if (existing) return existing;

  const restaurant = await prisma.restaurant.create({
    data: {
      ownerId: user.id,
      companyName: '',
      address: '',
      phone: '',
      categories: {
        create: BASE_CATEGORIES.map((name) => ({ name })),
      },
    },
    include: { categories: true, dishes: true },
  });
  return restaurant;
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'No token provided' });
  const [, token] = header.split(' ');
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
    req.user = decoded;
    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

app.get('/health', (_req, res) => {
  res.json({ ok: true, version: '0.1.0' });
});

// Solo para desarrollo local sin Google: permite entrar como CLIENT o SUPERADMIN
app.post('/auth/dev', async (req, res) => {
  try {
    const role = req.body.role === 'SUPERADMIN' ? Role.SUPERADMIN : Role.CLIENT;
    const email = role === Role.SUPERADMIN ? 'superadmin@qarta.local' : 'cliente-demo@qarta.local';
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name: role === Role.SUPERADMIN ? 'Superadmin Qarta (dev)' : 'Propietario Demo',
          role,
        },
      });
    } else if (role === Role.SUPERADMIN && user.role !== Role.SUPERADMIN) {
      user = await prisma.user.update({ where: { id: user.id }, data: { role: Role.SUPERADMIN } });
    }
    const restaurant = await ensureRestaurantForUser(user);
    const token = signToken({ userId: user.id, role: user.role, email: user.email });
    return res.json({ token, user, restaurant });
  } catch (error) {
    console.error('auth/dev error', error);
    return res.status(500).json({ error: 'Dev auth failed' });
  }
});

app.post('/auth/google', async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ error: 'credential is required' });
    const payload = await verifyGoogleToken(credential);
    const email = payload.email?.toLowerCase();
    if (!email) return res.status(400).json({ error: 'Email not found in token' });

    const role = superadmins.includes(email) ? Role.SUPERADMIN : Role.CLIENT;
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name: payload.name || email,
          avatar: payload.picture || null,
          role,
        },
      });
    } else if (role === Role.SUPERADMIN && user.role !== Role.SUPERADMIN) {
      user = await prisma.user.update({ where: { id: user.id }, data: { role: Role.SUPERADMIN } });
    }

    const restaurant = await ensureRestaurantForUser(user);
    const token = signToken({ userId: user.id, role: user.role, email: user.email });
    return res.json({ token, user, restaurant });
  } catch (error) {
    console.error('auth/google error', error);
    return res.status(400).json({ error: 'Google verification failed', details: error.message });
  }
});

// Perfil y restaurante del usuario autenticado
app.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    const restaurant = await ensureRestaurantForUser(user);
    return res.json({ user, restaurant });
  } catch (error) {
    console.error('me error', error);
    return res.status(500).json({ error: 'Error fetching profile' });
  }
});

// Cliente: obtener restaurante + categorías + platos
app.get('/me/restaurant', authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    if (!user) return res.status(401).json({ error: 'User not found' });
    const restaurant = await ensureRestaurantForUser(user);
    return res.json({ restaurant });
  } catch (error) {
    console.error('me/restaurant error', error);
    return res.status(500).json({ error: 'Error fetching restaurant' });
  }
});

// Cliente: actualizar datos de empresa
app.put('/me/restaurant', authMiddleware, async (req, res) => {
  try {
    const { companyName, address, phone, qrColor, tagline } = req.body;
    const restaurant = await prisma.restaurant.update({
      where: { ownerId: req.user.userId },
      data: {
        companyName: companyName ?? undefined,
        address: address ?? undefined,
        phone: phone ?? undefined,
        qrColor: qrColor ?? undefined,
        tagline: tagline ?? undefined,
      },
      include: { categories: true, dishes: true },
    });
    return res.json({ restaurant });
  } catch (error) {
    console.error('update restaurant error', error);
    return res.status(500).json({ error: 'Error updating restaurant' });
  }
});

// Cliente: crear categoría
app.post('/categories', authMiddleware, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    const restaurant = await prisma.restaurant.findFirst({ where: { ownerId: req.user.userId } });
    if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' });
    const category = await prisma.category.create({
      data: {
        name,
        restaurantId: restaurant.id,
      },
    });
    return res.json({ category });
  } catch (error) {
    console.error('create category error', error);
    return res.status(500).json({ error: 'Error creating category' });
  }
});

// Cliente: crear plato
app.post('/dishes', authMiddleware, async (req, res) => {
  try {
    const { title, description, price, allergens = [], imageUrl, categoryId, translations } = req.body;
    if (!title || !description || !price || !categoryId) {
      return res.status(400).json({ error: 'title, description, price, categoryId are required' });
    }
    const restaurant = await prisma.restaurant.findFirst({ where: { ownerId: req.user.userId } });
    if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' });
    const category = await prisma.category.findFirst({ where: { id: categoryId, restaurantId: restaurant.id } });
    if (!category) return res.status(400).json({ error: 'Category not found in your restaurant' });

    const dish = await prisma.dish.create({
      data: {
        title,
        description,
        price,
        allergens,
        imageUrl: imageUrl || null,
        restaurantId: restaurant.id,
        categoryId,
        translations: translations || null,
      },
    });
    return res.json({ dish });
  } catch (error) {
    console.error('create dish error', error);
    return res.status(500).json({ error: 'Error creating dish' });
  }
});

// Cliente: borrar plato
app.delete('/dishes/:id', authMiddleware, async (req, res) => {
  try {
    const dish = await prisma.dish.findUnique({ where: { id: req.params.id } });
    if (!dish) return res.status(404).json({ error: 'Dish not found' });
    const restaurant = await prisma.restaurant.findFirst({ where: { ownerId: req.user.userId } });
    if (!restaurant || dish.restaurantId !== restaurant.id) {
      return res.status(403).json({ error: 'Dish does not belong to your restaurant' });
    }
    await prisma.dish.delete({ where: { id: req.params.id } });
    return res.json({ ok: true });
  } catch (error) {
    console.error('delete dish error', error);
    return res.status(500).json({ error: 'Error deleting dish' });
  }
});

// Cliente: publicar/despublicar/eliminar carta
app.post('/menu/publish', authMiddleware, async (req, res) => {
  try {
    const restaurant = await prisma.restaurant.update({
      where: { ownerId: req.user.userId },
      data: {
        published: true,
        setupCompleted: true,
        menuLink: `https://qarta.xyzdigital.es/menu/${req.user.userId}`,
      },
      include: { categories: true, dishes: true },
    });
    return res.json({ restaurant });
  } catch (error) {
    console.error('publish error', error);
    return res.status(500).json({ error: 'Error publishing menu' });
  }
});

app.post('/menu/unpublish', authMiddleware, async (req, res) => {
  try {
    const restaurant = await prisma.restaurant.update({
      where: { ownerId: req.user.userId },
      data: { published: false },
      include: { categories: true, dishes: true },
    });
    return res.json({ restaurant });
  } catch (error) {
    console.error('unpublish error', error);
    return res.status(500).json({ error: 'Error unpublishing menu' });
  }
});

app.post('/menu/delete', authMiddleware, async (req, res) => {
  try {
    const restaurant = await prisma.restaurant.findFirst({ where: { ownerId: req.user.userId } });
    if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' });
    await prisma.dish.deleteMany({ where: { restaurantId: restaurant.id } });
    const updated = await prisma.restaurant.update({
      where: { id: restaurant.id },
      data: { published: false, menuLink: null, setupCompleted: false },
      include: { categories: true, dishes: true },
    });
    return res.json({ restaurant: updated });
  } catch (error) {
    console.error('delete menu error', error);
    return res.status(500).json({ error: 'Error deleting menu' });
  }
});

// Superadmin
app.get('/admin/restaurants', authMiddleware, async (req, res) => {
  if (req.user.role !== Role.SUPERADMIN) return res.status(403).json({ error: 'Forbidden' });
  const restaurants = await prisma.restaurant.findMany({
    include: { categories: true, dishes: true, owner: true },
    orderBy: { createdAt: 'desc' },
  });
  return res.json({ restaurants });
});

app.post('/admin/restaurants/:id/toggle-status', authMiddleware, async (req, res) => {
  if (req.user.role !== Role.SUPERADMIN) return res.status(403).json({ error: 'Forbidden' });
  const restaurant = await prisma.restaurant.findUnique({ where: { id: req.params.id } });
  if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' });
  const updated = await prisma.restaurant.update({
    where: { id: restaurant.id },
    data: { status: restaurant.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE' },
    include: { categories: true, dishes: true },
  });
  return res.json({ restaurant: updated });
});

app.post('/admin/restaurants/:id/toggle-menu', authMiddleware, async (req, res) => {
  if (req.user.role !== Role.SUPERADMIN) return res.status(403).json({ error: 'Forbidden' });
  const restaurant = await prisma.restaurant.findUnique({ where: { id: req.params.id } });
  if (!restaurant) return res.status(404).json({ error: 'Restaurant not found' });
  const updated = await prisma.restaurant.update({
    where: { id: restaurant.id },
    data: { published: !restaurant.published },
    include: { categories: true, dishes: true },
  });
  return res.json({ restaurant: updated });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Qarta API escuchando en http://localhost:${PORT}`);
});
