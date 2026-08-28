import axios from 'axios';
import { clearAdminToken, getAdminToken } from './auth';

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1';

/** Fired when a protected request gets 401 so AuthProvider can clear UI state without a hard reload. */
export const ADMIN_AUTH_EXPIRED_EVENT = 'goquick-admin:auth-expired';

export const http = axios.create({
  baseURL,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

http.interceptors.request.use((config) => {
  const token = getAdminToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      const url = String(error?.config?.url ?? '');
      const isLoginAttempt = url.includes('/admin/auth/login');
      if (!isLoginAttempt && getAdminToken()) {
        clearAdminToken();
        window.dispatchEvent(new Event(ADMIN_AUTH_EXPIRED_EVENT));
      }
    }
    return Promise.reject(error);
  },
);
