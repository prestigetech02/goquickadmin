import { http } from '@/lib/http';
import {
  unwrapApiData,
  type AdminCoupon,
  type AdminCouponInput,
  type AdminCouponListResponse,
  type AdminCouponRedemptionListResponse,
  type AdminCouponStats,
  type AdminCouponUserSearchResponse,
  type ListQueryParams,
} from '@/types/api';
import type { ApiResponse } from '@/types';

export async function fetchAdminCouponStats() {
  const { data } = await http.get<ApiResponse<AdminCouponStats>>('/admin/coupons/stats');
  return unwrapApiData(data, 'Failed to load coupon stats.');
}

export async function fetchAdminCoupons(params: ListQueryParams = {}) {
  const { data } = await http.get<ApiResponse<AdminCouponListResponse>>('/admin/coupons', { params });
  return unwrapApiData(data, 'Failed to load coupons.');
}

export async function fetchAdminCoupon(id: number) {
  const { data } = await http.get<ApiResponse<AdminCoupon>>(`/admin/coupons/${id}`);
  return unwrapApiData(data, 'Failed to load coupon.');
}

export async function createAdminCoupon(input: AdminCouponInput) {
  const { data } = await http.post<ApiResponse<AdminCoupon>>('/admin/coupons', input);
  return unwrapApiData(data, 'Failed to create coupon.');
}

export async function updateAdminCoupon(id: number, input: Partial<AdminCouponInput>) {
  const { data } = await http.put<ApiResponse<AdminCoupon>>(`/admin/coupons/${id}`, input);
  return unwrapApiData(data, 'Failed to update coupon.');
}

export async function deleteAdminCoupon(id: number) {
  const { data } = await http.delete<ApiResponse<null>>(`/admin/coupons/${id}`);
  if (!data.success) {
    throw new Error(data.error?.message || data.message || 'Failed to delete coupon.');
  }
}

export async function fetchAdminCouponRedemptions(id: number, params: ListQueryParams = {}) {
  const { data } = await http.get<ApiResponse<AdminCouponRedemptionListResponse>>(
    `/admin/coupons/${id}/redemptions`,
    { params },
  );
  return unwrapApiData(data, 'Failed to load redemptions.');
}

export async function searchAdminCouponUsers(search: string) {
  const { data } = await http.get<ApiResponse<AdminCouponUserSearchResponse>>('/admin/coupons/users', {
    params: { search, per_page: 8 },
  });
  return unwrapApiData(data, 'Failed to search users.');
}
