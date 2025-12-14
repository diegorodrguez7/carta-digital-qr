const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

let authToken = null;

export const setToken = (token) => {
  authToken = token;
};

const jsonHeaders = () => ({
  'Content-Type': 'application/json',
  ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
});

async function request(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...jsonHeaders(),
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = data?.error || 'Error de red';
    throw new Error(message);
  }
  return data;
}

export const authDev = async (role = 'CLIENT') =>
  request('/auth/dev', {
    method: 'POST',
    body: JSON.stringify({ role }),
  });

export const authGoogle = async (credential) =>
  request('/auth/google', {
    method: 'POST',
    body: JSON.stringify({ credential }),
  });

export const getMe = async () => request('/me');
export const getRestaurant = async () => request('/me/restaurant');
export const updateRestaurant = async (payload) =>
  request('/me/restaurant', { method: 'PUT', body: JSON.stringify(payload) });

export const createCategory = async (name) =>
  request('/categories', { method: 'POST', body: JSON.stringify({ name }) });

export const createDish = async (payload) =>
  request('/dishes', { method: 'POST', body: JSON.stringify(payload) });

export const deleteDish = async (id) => request(`/dishes/${id}`, { method: 'DELETE' });

export const publishMenu = async () => request('/menu/publish', { method: 'POST' });
export const unpublishMenu = async () => request('/menu/unpublish', { method: 'POST' });
export const deleteMenu = async () => request('/menu/delete', { method: 'POST' });

// Superadmin
export const adminRestaurants = async () => request('/admin/restaurants');
export const adminToggleStatus = async (id) =>
  request(`/admin/restaurants/${id}/toggle-status`, { method: 'POST' });
export const adminToggleMenu = async (id) =>
  request(`/admin/restaurants/${id}/toggle-menu`, { method: 'POST' });
