const API_BASE = import.meta.env.VITE_API_URL || "/api";

async function request(path, options = {}) {
  const token = localStorage.getItem("clickbites_token");
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Something went wrong.");
  }
  return data;
}

export const api = {
  login: (payload) => request("/auth/login", { method: "POST", body: JSON.stringify(payload) }),
  register: (payload) => request("/auth/register", { method: "POST", body: JSON.stringify(payload) }),
  me: () => request("/auth/me"),
  products: () => request("/products"),
  shops: () => request("/shops"),
  favorites: () => request("/favorites"),
  addFavorite: (id) => request(`/favorites/${id}`, { method: "POST" }),
  removeFavorite: (id) => request(`/favorites/${id}`, { method: "DELETE" }),
  orders: () => request("/orders"),
  createOrder: (payload) => request("/orders", { method: "POST", body: JSON.stringify(payload) }),
  updateOrderStatus: (id, status) => request(`/orders/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  adminStats: () => request("/admin/stats")
};