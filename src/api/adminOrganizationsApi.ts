import { http } from '@/lib/http';
import { unwrapApiData } from '@/types/api';
import type { ApiResponse } from '@/types';

export type AdminOrgStatus = 'pending' | 'active' | 'suspended' | string;
export type AdminOrgFulfillmentMode = 'managed' | 'marketplace';

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
  fulfillment_mode?: AdminOrgFulfillmentMode | string;
  partner_api_enabled?: boolean;
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
  wallet?: { id: number; balance: number; currency: string } | null;
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
  fulfillment_mode?: AdminOrgFulfillmentMode;
  partner_api_enabled?: boolean;
  owner_user_id?: number | null;
  owner_phone?: string | null;
};

export type AdminOrgApiKey = {
  id: number;
  name: string;
  environment: 'live' | 'test' | string;
  masked_key: string;
  allowed_ips?: string[];
  ip_allowlist_enabled?: boolean;
  last_used_at?: string | null;
  revoked_at?: string | null;
  is_active: boolean;
  created_at?: string | null;
};

export type AdminOrgApiKeysResponse = {
  partner_api_enabled: boolean;
  keys: AdminOrgApiKey[];
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

export async function fetchAdminOrganizationApiKeys(organizationId: number) {
  const { data } = await http.get<ApiResponse<AdminOrgApiKeysResponse>>(
    `/admin/organizations/${organizationId}/api-keys`,
  );
  return unwrapApiData(data, 'Failed to load API keys.');
}

export async function createAdminOrganizationApiKey(
  organizationId: number,
  payload: {
    name: string;
    environment?: 'live' | 'test';
    enable_partner_api?: boolean;
    allowed_ips?: string[] | string;
  },
) {
  const { data } = await http.post<
    ApiResponse<{ key: AdminOrgApiKey; token: string; partner_api_enabled: boolean }>
  >(`/admin/organizations/${organizationId}/api-keys`, payload);
  return unwrapApiData(data, 'Failed to create API key.');
}

export async function updateAdminOrganizationApiKey(
  organizationId: number,
  apiKeyId: number,
  payload: { name?: string; allowed_ips?: string[] | string | null },
) {
  const { data } = await http.put<ApiResponse<{ key: AdminOrgApiKey }>>(
    `/admin/organizations/${organizationId}/api-keys/${apiKeyId}`,
    payload,
  );
  return unwrapApiData(data, 'Failed to update API key.').key;
}

export async function revokeAdminOrganizationApiKey(organizationId: number, apiKeyId: number) {
  const { data } = await http.post<ApiResponse<{ key: AdminOrgApiKey }>>(
    `/admin/organizations/${organizationId}/api-keys/${apiKeyId}/revoke`,
  );
  return unwrapApiData(data, 'Failed to revoke API key.').key;
}

export type AdminOrgWebhookEndpoint = {
  id: number;
  organization_id: number;
  url: string;
  enabled_events: string[];
  is_active: boolean;
  secret_hint?: string;
  secret?: string;
  created_at?: string | null;
  updated_at?: string | null;
};

export type AdminOrgWebhookDelivery = {
  id: number;
  event_id: string;
  event: string;
  attempt: number;
  response_status?: number | null;
  response_body?: string | null;
  duration_ms?: number | null;
  success: boolean;
  error_message?: string | null;
  errand_id?: number | null;
  created_at?: string | null;
};

export async function fetchAdminOrganizationWebhook(organizationId: number) {
  const { data } = await http.get<
    ApiResponse<{ endpoint: AdminOrgWebhookEndpoint | null; available_events: string[] }>
  >(`/admin/organizations/${organizationId}/webhook`);
  return unwrapApiData(data, 'Failed to load webhook.');
}

export async function upsertAdminOrganizationWebhook(
  organizationId: number,
  payload: {
    url: string;
    is_active?: boolean;
    enabled_events?: string[];
    rotate_secret?: boolean;
  },
) {
  const { data } = await http.put<ApiResponse<{ endpoint: AdminOrgWebhookEndpoint }>>(
    `/admin/organizations/${organizationId}/webhook`,
    payload,
  );
  return unwrapApiData(data, 'Failed to save webhook.');
}

export async function fetchAdminOrganizationWebhookDeliveries(
  organizationId: number,
  params?: { page?: number; per_page?: number },
) {
  const { data } = await http.get<
    ApiResponse<{
      deliveries: AdminOrgWebhookDelivery[];
      pagination: { current_page: number; per_page: number; total: number; last_page: number };
    }>
  >(`/admin/organizations/${organizationId}/webhook/deliveries`, { params });
  return unwrapApiData(data, 'Failed to load webhook deliveries.');
}
