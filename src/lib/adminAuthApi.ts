import axios from 'axios';
import { http } from './http';
import type { AdminUser, ApiResponse } from '@/types';

export type AdminLoginResult = {
  mfa_required?: boolean;
  token?: string;
  challenge_token?: string;
  token_type: string;
  expires_in_minutes?: number;
  user: AdminUser;
};

export type MfaSetupResult = {
  secret: string;
  otpauth_url: string;
  issuer: string;
  account: string;
};

export type MfaConfirmResult = {
  user: AdminUser;
  recovery_codes: string[];
};

export async function loginAdmin(email: string, password: string) {
  const { data } = await http.post<ApiResponse<AdminLoginResult>>('/admin/auth/login', {
    email: email.trim(),
    password,
  });

  if (!data.success || !data.data) {
    throw new Error(data.error?.message || data.message || 'Login failed.');
  }

  if (data.data.mfa_required) {
    if (!data.data.challenge_token) {
      throw new Error('Two-factor challenge missing from server response.');
    }
    return data.data;
  }

  if (!data.data.token) {
    throw new Error(data.error?.message || data.message || 'Login failed.');
  }

  return data.data;
}

export async function verifyAdminMfa(challengeToken: string, code: string) {
  const { data } = await http.post<ApiResponse<AdminLoginResult>>(
    '/admin/auth/mfa/verify',
    { code: code.trim() },
    { headers: { Authorization: `Bearer ${challengeToken}` } },
  );

  if (!data.success || !data.data?.token) {
    throw new Error(data.error?.message || data.message || 'Invalid authenticator code.');
  }

  return data.data;
}

export async function fetchAdminMe() {
  const { data } = await http.get<ApiResponse<{ user: AdminUser }>>('/admin/auth/me');
  if (!data.success || !data.data?.user) {
    throw new Error(data.error?.message || data.message || 'Failed to load admin session.');
  }
  return data.data.user;
}

export async function logoutAdmin() {
  await http.post('/admin/auth/logout');
}

export async function changeAdminPassword(input: {
  current_password: string;
  password: string;
  password_confirmation: string;
}) {
  const { data } = await http.post<ApiResponse<{ user: AdminUser }>>('/admin/auth/change-password', input);
  if (!data.success || !data.data?.user) {
    throw new Error(data.error?.message || data.message || 'Failed to update password.');
  }
  return data.data.user;
}

export async function setupAdminMfa() {
  const { data } = await http.post<ApiResponse<MfaSetupResult>>('/admin/auth/mfa/setup');
  if (!data.success || !data.data?.secret) {
    throw new Error(data.error?.message || data.message || 'Could not start MFA setup.');
  }
  return data.data;
}

export async function confirmAdminMfa(code: string) {
  const { data } = await http.post<ApiResponse<MfaConfirmResult>>('/admin/auth/mfa/confirm', {
    code: code.trim(),
  });
  if (!data.success || !data.data?.user) {
    throw new Error(data.error?.message || data.message || 'Could not confirm MFA.');
  }
  return data.data;
}

export function getApiErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (axios.isAxiosError(error)) {
    const body = error.response?.data as
      | {
          error?: { message?: string; details?: Record<string, string[] | string> };
          message?: string;
          errors?: Record<string, string[] | string>;
        }
      | undefined;
    const fromBag = (bag?: Record<string, string[] | string>) => {
      if (!bag) return undefined;
      const first = Object.values(bag)[0];
      if (Array.isArray(first)) return first[0];
      return typeof first === 'string' ? first : undefined;
    };
    return (
      body?.error?.message ||
      fromBag(body?.error?.details) ||
      fromBag(body?.errors) ||
      body?.message ||
      fallback
    );
  }
  if (error instanceof Error) return error.message;
  return fallback;
}
