import axios from 'axios';
import { http } from './http';
import type { AdminUser, ApiResponse } from '@/types';

export type AdminLoginResult = {
  token: string;
  token_type: string;
  expires_in_minutes?: number;
  user: AdminUser;
};

export async function loginAdmin(email: string, password: string) {
  const { data } = await http.post<ApiResponse<AdminLoginResult>>('/admin/auth/login', {
    email: email.trim(),
    password,
  });

  if (!data.success || !data.data?.token) {
    throw new Error(data.error?.message || data.message || 'Login failed.');
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

export function getApiErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (axios.isAxiosError(error)) {
    const body = error.response?.data as
      | { error?: { message?: string }; message?: string }
      | undefined;
    return body?.error?.message || body?.message || fallback;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}
