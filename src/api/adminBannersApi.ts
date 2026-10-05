import { http } from '@/lib/http';
import { unwrapApiData, type AdminBanner, type AdminBannerInput, type AdminBannerListResponse } from '@/types/api';
import type { ApiResponse } from '@/types';

export async function fetchAdminBanners() {
  const { data } = await http.get<ApiResponse<AdminBannerListResponse>>('/admin/banners');
  return unwrapApiData(data, 'Failed to load banners.');
}

export async function createAdminBanner(input: AdminBannerInput) {
  const { data } = await http.post<ApiResponse<AdminBanner>>('/admin/banners', input);
  return unwrapApiData(data, 'Failed to create banner.');
}

export async function updateAdminBanner(id: number, input: AdminBannerInput) {
  const { data } = await http.put<ApiResponse<AdminBanner>>(`/admin/banners/${id}`, input);
  return unwrapApiData(data, 'Failed to update banner.');
}

export async function setAdminBannerActive(id: number, isActive: boolean) {
  const { data } = await http.patch<ApiResponse<AdminBanner>>(`/admin/banners/${id}/status`, { is_active: isActive });
  return unwrapApiData(data, isActive ? 'Failed to switch the banner on.' : 'Failed to pause the banner.');
}

export async function reorderAdminBanners(ids: number[]) {
  const { data } = await http.post<ApiResponse<AdminBannerListResponse>>('/admin/banners/reorder', { ids });
  return unwrapApiData(data, 'Failed to reorder banners.');
}

export async function deleteAdminBanner(id: number) {
  const { data } = await http.delete<ApiResponse<null>>(`/admin/banners/${id}`);
  if (!data.success) {
    throw new Error(data.error?.message || data.message || 'Failed to delete banner.');
  }
}

export async function uploadAdminBannerImage(file: File, onUploadProgress?: (percent: number) => void) {
  const form = new FormData();
  form.append('image', file);

  const { data } = await http.post<ApiResponse<{ url: string; width: number | null; height: number | null }>>(
    '/admin/banners/upload-image',
    form,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (evt) => {
        if (!evt.total) return;
        const percent = Math.round((evt.loaded * 100) / evt.total);
        onUploadProgress?.(Math.max(0, Math.min(100, percent)));
      },
    },
  );

  return unwrapApiData(data, 'Image upload failed.');
}
