import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { requestApproval } from './adminApproval';
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

type ApprovalRequired = {
  error?: { code?: string; message?: string; details?: { action?: string; label?: string; scope?: string } };
};

type RetryableConfig = InternalAxiosRequestConfig & { _approvalAttempted?: boolean };

function retryWithApproval(error: AxiosError<ApprovalRequired>) {
  const config = error.config as RetryableConfig | undefined;
  const body = error.response?.data;
  if (!config || config._approvalAttempted || body?.error?.code !== 'APPROVAL_REQUIRED') {
    return null;
  }

  const details = body.error.details ?? {};
  return requestApproval({
    action: details.action ?? '',
    label: details.label ?? 'This action',
    scope: details.scope ?? '',
  }).then(
    (token) => {
      config._approvalAttempted = true;
      config.headers.set('X-Admin-Approval', token);
      return http.request(config);
    },
    () => {
      body.error!.message = 'Cancelled. This action needs a super admin to approve it.';
      return Promise.reject(error);
    },
  );
}

http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 428) {
      const retry = retryWithApproval(error);
      if (retry) return retry;
    }
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
