import type { AuthProvider, DataProvider } from '@refinedev/core';
import axios from 'axios';

export const API_URL = import.meta.env.VITE_API_URL || '/api';
export const api = axios.create({ baseURL: API_URL });
const APP_BASE_PATH = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '') || '/';

function resolveAppPath(path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  if (APP_BASE_PATH === '/') return normalizedPath;
  return `${APP_BASE_PATH}${normalizedPath}`;
}

function clearAuthSession() {
  localStorage.removeItem('clinic-token');
  localStorage.removeItem('clinic-user');
}

function redirectToLogin() {
  if (typeof window === 'undefined') return;
  const loginPath = resolveAppPath('/login');
  if (window.location.pathname === loginPath) return;
  window.location.assign(loginPath);
}

// Resolves a relative backend path (e.g. /uploads/...) to an absolute URL.
// publicUrl values stored in DB are root-relative; the backend serves them
// on the same host as the API but without the /api prefix.
export function resolveFileUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('//')) return url;
  const backendOrigin = API_URL.replace(/\/api\/?$/, '');
  return backendOrigin + (url.startsWith('/') ? url : `/${url}`);
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('clinic-token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      clearAuthSession();
      redirectToLogin();
    }
    return Promise.reject(error);
  },
);

export const authProvider: AuthProvider = {
  login: async ({ email, identifier, password }) => {
    try {
      const { data } = await api.post('/auth/login', { identifier: identifier || email, password });
      localStorage.setItem('clinic-token', data.accessToken);
      localStorage.setItem('clinic-user', JSON.stringify(data.user));
      return { success: true, redirectTo: resolveAppPath('/') };
    } catch {
      return { success: false, error: { name: 'LoginError', message: 'Thông tin đăng nhập hoặc mật khẩu không đúng' } };
    }
  },
  logout: async () => {
    clearAuthSession();
    return { success: true, redirectTo: resolveAppPath('/login') };
  },
  check: async () =>
    localStorage.getItem('clinic-token')
      ? { authenticated: true }
      : { authenticated: false, redirectTo: resolveAppPath('/login') },
  onError: async (error) =>
    error?.status === 401 ? { logout: true, redirectTo: resolveAppPath('/login'), error } : { error },
  getIdentity: async () => JSON.parse(localStorage.getItem('clinic-user') || 'null'),
};

export const dataProvider: DataProvider = {
  getApiUrl: () => API_URL,
  getList: async ({ resource, pagination, filters }) => {
    const current = (pagination as { current?: number })?.current || 1;
    const pageSize = (pagination as { pageSize?: number })?.pageSize || 20;
    const search = (filters || []).find((filter) => 'field' in filter && filter.field === 'search');
    const response = await api.get(`/records/${resource}`, {
      params: { page: current, pageSize, search: search && 'value' in search ? search.value : undefined },
    });
    return response.data;
  },
  getOne: async ({ resource, id }) => (await api.get(`/records/${resource}/${id}`)).data,
  create: async ({ resource, variables }) => (await api.post(`/records/${resource}`, variables)).data,
  update: async ({ resource, id, variables }) => (await api.patch(`/records/${resource}/${id}`, variables)).data,
  deleteOne: async ({ resource, id }) => (await api.delete(`/records/${resource}/${id}`)).data,
  getMany: async ({ resource, ids }) => ({
    data: await Promise.all(ids.map(async (id) => (await api.get(`/records/${resource}/${id}`)).data.data)),
  }),
  createMany: async () => ({ data: [] }),
  deleteMany: async () => ({ data: [] }),
  updateMany: async () => ({ data: [] }),
  custom: async ({ url, method, payload, query }) => {
    const response = await api.request({ url, method, data: payload, params: query });
    return response.data;
  },
};
