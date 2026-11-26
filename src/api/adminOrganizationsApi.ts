import { http } from '@/lib/http';
import { unwrapApiData } from '@/types/api';
import type { ApiResponse } from '@/types';

export type AdminOrgStatus = 'pending' | 'active' | 'suspended' | string;

export type AdminOrgOwner = {
  id: number;
  phone: string | null;
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  name?: string | null;
};

export type AdminOrgLocation = {
  id: number;
  organization_id: number;
  name: string;
  address: string;
  city?: string | null;
  state?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  is_active: boolean;
  sort_order: number;
};

export type AdminOrganization = {
  id: number;
  name: string;
  slug: string;
  status: AdminOrgStatus;
  contact_phone?: string | null;
  contact_email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  cac_number?: string | null;
  notes?: string | null;
  owner?: AdminOrgOwner | null;
  locations_count: number;
  errands_count: number;
  created_at?: string | null;
  updated_at?: string | null;
  locations?: AdminOrgLocation[];
  errand_stats?: { total: number; active: number; completed: number };
  recent_errands?: Array<{
    id: number;
    title: string;
    status: string;
    buyer_id: number;
    organization_location_id?: number | null;
    budget_max?: number | null;
    created_at?: string | null;
  }>;
};

export type AdminOrganizationListResponse = {
  organizations: AdminOrganization[];
  pagination: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
  summary: {
    total: number;
    pending: number;
    active: number;
    suspended: number;
  };
};

export type CreateAdminOrganizationPayload = {
  name: string;
  cac_number?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  notes?: string | null;
  status?: 'pending' | 'active';
  owner_user_id?: number | null;
  owner_phone?: string | null;
};

export async function fetchAdminOrganizations(params?: {
  q?: string;
  status?: string;
  per_page?: number;
  page?: number;
}) {
  const { data } = await http.get<ApiResponse<AdminOrganizationListResponse>>('/admin/organizations', {
    params,
  });
  return unwrapApiData(data, 'Failed to load organizations.');
}

export async function fetchAdminOrganization(id: number) {
  const { data } = await http.get<ApiResponse<{ organization: AdminOrganization }>>(
    `/admin/organizations/${id}`,
  );
  return unwrapApiData(data, 'Failed to load organization.').organization;
}

export async function createAdminOrganization(payload: CreateAdminOrganizationPayload) {
  const { data } = await http.post<ApiResponse<{ organization: AdminOrganization }>>(
    '/admin/organizations',
    payload,
  );
  return unwrapApiData(data, 'Failed to create organization.').organization;
}

export async function updateAdminOrganization(
  id: number,
  payload: Partial<CreateAdminOrganizationPayload>,
) {
  const { data } = await http.put<ApiResponse<{ organization: AdminOrganization }>>(
    `/admin/organizations/${id}`,
    payload,
  );
  return unwrapApiData(data, 'Failed to update organization.').organization;
}

export async function approveAdminOrganization(id: number) {
  const { data } = await http.post<ApiResponse<{ organization: AdminOrganization }>>(
    `/admin/organizations/${id}/approve`,
  );
  return unwrapApiData(data, 'Failed to approve organization.').organization;
}

export async function suspendAdminOrganization(id: number, reason?: string) {
  const { data } = await http.post<ApiResponse<{ organization: AdminOrganization }>>(
    `/admin/organizations/${id}/suspend`,
    { reason: reason?.trim() || undefined },
  );
  return unwrapApiData(data, 'Failed to suspend organization.').organization;
}

export async function reactivateAdminOrganization(id: number) {
  const { data } = await http.post<ApiResponse<{ organization: AdminOrganization }>>(
    `/admin/organizations/${id}/reactivate`,
  );
  return unwrapApiData(data, 'Failed to reactivate organization.').organization;
}

export async function setAdminOrganizationOwner(
  id: number,
  payload: { owner_user_id?: number | null; owner_phone?: string | null },
) {
  const { data } = await http.post<ApiResponse<{ organization: AdminOrganization }>>(
    `/admin/organizations/${id}/owner`,
    payload,
  );
  return unwrapApiData(data, 'Failed to set owner.').organization;
}
