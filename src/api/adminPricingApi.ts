import { http } from '@/lib/http';
import {
  unwrapApiData,
  type ListQueryParams,
  type PricingRuleInput,
  type PricingRuleItem,
  type PricingRuleListResponse,
} from '@/types/api';
import type { ApiResponse } from '@/types';

export type { PricingRuleItem };

export async function fetchAdminPricingRules(params: ListQueryParams = {}) {
  const { data } = await http.get<ApiResponse<PricingRuleListResponse>>('/admin/pricing-rules', { params });
  return unwrapApiData(data, 'Failed to load pricing rules.');
}

export async function fetchAdminPricingRule(id: number) {
  const { data } = await http.get<ApiResponse<PricingRuleItem>>(`/admin/pricing-rules/${id}`);
  return unwrapApiData(data, 'Failed to load pricing rule.');
}

export async function createAdminPricingRule(input: PricingRuleInput) {
  const { data } = await http.post<ApiResponse<PricingRuleItem>>('/admin/pricing-rules', input);
  return unwrapApiData(data, 'Failed to create pricing rule.');
}

export async function updateAdminPricingRule(id: number, input: Partial<PricingRuleInput>) {
  const { data } = await http.put<ApiResponse<PricingRuleItem>>(`/admin/pricing-rules/${id}`, input);
  return unwrapApiData(data, 'Failed to update pricing rule.');
}

export async function deleteAdminPricingRule(id: number) {
  const { data } = await http.delete<ApiResponse<null>>(`/admin/pricing-rules/${id}`);
  if (!data.success) {
    throw new Error(data.error?.message || data.message || 'Failed to delete pricing rule.');
  }
}
