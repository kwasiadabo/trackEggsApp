import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// ── Attach access token to every request ──────────────────
api.interceptors.request.use(config => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Auto-refresh on 401 ────────────────────────────────────
let isRefreshing = false;
let failedQueue  = [];

function processQueue(error, token) {
  failedQueue.forEach(p => error ? p.reject(error) : p.resolve(token));
  failedQueue = [];
}

api.interceptors.response.use(
  res => res,
  async err => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        });
      }
      original._retry = true;
      isRefreshing = true;
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        isRefreshing = false;
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(err);
      }
      try {
        const res = await axios.post('/api/auth/refresh', { refreshToken });
        const { accessToken, refreshToken: newRefresh } = res.data;
        localStorage.setItem('accessToken',  accessToken);
        localStorage.setItem('refreshToken', newRefresh);
        api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
        processQueue(null, accessToken);
        original.headers.Authorization = `Bearer ${accessToken}`;
        return api(original);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }
    const message = err.response?.data?.message || err.message || 'Request failed';
    return Promise.reject(new Error(message));
  }
);

// ── Auth ───────────────────────────────────────────────────
export const authApi = {
  login:          (data) => axios.post('/api/auth/login', data),
  logout:         (data) => api.post('/auth/logout', data),
  me:             ()     => api.get('/auth/me'),
  changePassword: (data) => api.put('/auth/change-password', data),
  listUsers:      ()     => api.get('/auth/users'),
  updateUser:     (id, data) => api.put(`/auth/users/${id}`, data),
  listRoles:      ()     => api.get('/auth/roles'),
  register:       (data) => api.post('/auth/register', data),
};

// ── Dashboard ─────────────────────────────────────────────
export const dashboardApi = { get: () => api.get('/dashboard') };

// ── Inventory ─────────────────────────────────────────────
export const inventoryApi = { get: () => api.get('/inventory') };

// ── Purchases ─────────────────────────────────────────────
export const purchasesApi = {
  getAll:       ()         => api.get('/purchases'),
  getOne:       (id)       => api.get(`/purchases/${id}`),
  create:       (data)     => api.post('/purchases', data),
  createBatch:  (data)     => api.post('/purchases/batch', data),
  update:       (id, data) => api.put(`/purchases/${id}`, data),
  remove:       (id)       => api.delete(`/purchases/${id}`),
};

// ── Sales ─────────────────────────────────────────────────
export const salesApi = {
  getAll:         ()         => api.get('/sales'),
  getOne:         (id)       => api.get(`/sales/${id}`),
  create:         (data)     => api.post('/sales', data),
  createInvoice:  (data)     => api.post('/sales/invoice', data),
  update:         (id, data) => api.put(`/sales/${id}`, data),
  remove:         (id)       => api.delete(`/sales/${id}`),
};

// ── Customers ─────────────────────────────────────────────
export const customersApi = {
  getAll:  ()         => api.get('/customers'),
  getOne:  (id)       => api.get(`/customers/${id}`),
  create:  (data)     => api.post('/customers', data),
  update:  (id, data) => api.put(`/customers/${id}`, data),
  remove:  (id)       => api.delete(`/customers/${id}`),
};

// ── Payments ──────────────────────────────────────────────
export const paymentsApi = {
  getAll:        ()         => api.get('/payments'),
  create:        (data)     => api.post('/payments', data),
  update:        (id, data) => api.put(`/payments/${id}`, data),
  remove:        (id)       => api.delete(`/payments/${id}`),
  getByCustomer: (cid)      => api.get(`/payments/customer/${cid}`),
};

// ── Debtors ───────────────────────────────────────────────
export const debtorsApi = { get: () => api.get('/debtors') };

// ── Expenses ──────────────────────────────────────────────
export const expensesApi = {
  getAll:     ()         => api.get('/expenses'),
  getSummary: ()         => api.get('/expenses/summary'),
  create:     (data)     => api.post('/expenses', data),
  update:     (id, data) => api.put(`/expenses/${id}`, data),
  remove:     (id)       => api.delete(`/expenses/${id}`),
};

// ── Report Recipients ─────────────────────────────────────
export const recipientsApi = {
  getAll:  ()         => api.get('/report-recipients'),
  create:  (data)     => api.post('/report-recipients', data),
  update:  (id, data) => api.put(`/report-recipients/${id}`, data),
  remove:  (id)       => api.delete(`/report-recipients/${id}`),
};

// ── Email Logs ────────────────────────────────────────────
export const emailLogsApi = {
  getAll: (params) => api.get('/email-logs', { params }),
};

// ── Email Schedule ────────────────────────────────────────
export const emailScheduleApi = {
  get:    ()     => api.get('/email-schedule'),
  update: (data) => api.put('/email-schedule', data),
};

// ── Farms ─────────────────────────────────────────────────
export const farmsApi = {
  getAll:    ()         => api.get('/farms'),
  getActive: ()         => api.get('/farms/active'),
  create:    (data)     => api.post('/farms', data),
  update:    (id, data) => api.put(`/farms/${id}`, data),
  remove:    (id)       => api.delete(`/farms/${id}`),
};

export default api;
