const BASE = 'http://localhost:3001/api';

async function req(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw data;
  return data;
}

export const getIngredients = () => req('/ingredients');
export const getIngredientMovements = (id) => req(`/ingredients/${id}/movements`);
export const getRecipes = () => req('/recipes');
export const getOrders = (status) => req(`/orders${status ? `?status=${status}` : ''}`);
export const getOrder = (id) => req(`/orders/${id}`);
export const createOrder = (body) => req('/orders', { method: 'POST', body: JSON.stringify(body) });
export const releaseOrder = (id) => req(`/orders/${id}/release`, { method: 'POST' });
export const completeOrder = (id) => req(`/orders/${id}/complete`, { method: 'POST' });
export const cancelOrder = (id) => req(`/orders/${id}/cancel`, { method: 'POST' });
