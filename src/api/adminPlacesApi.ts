import { http } from '@/lib/http';
import { unwrapApiData } from '@/types/api';
import type { ApiResponse } from '@/types';
import type { AdminPlace, AdminPlaceCategory, PlaceCategoryForm, PlaceForm } from '@/components/admin2/places/presentation';

export type AdminPlaceListResponse = {
  places: AdminPlace[];
  pagination: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
  summary: { total: number; active: number };
  filters: { states: string[]; cities: string[]; areas: string[] };
};

export type AdminPlaceCategoryListResponse = {
  categories: AdminPlaceCategory[];
  summary: { total: number; active: number };
};

function placePayload(form: PlaceForm) {
  return {
    name: form.name.trim(),
    category: form.category,
    description: form.description.trim(),
    address_line: form.address_line.trim(),
    area: form.area.trim(),
    city: form.city.trim(),
    state: form.state.trim(),
    latitude: Number(form.latitude),
    longitude: Number(form.longitude),
    phone: form.phone.trim() || null,
    notes: form.notes.trim() || null,
    images: form.images.filter(Boolean),
    is_active: form.is_active,
  };
}

export async function fetchAdminPlaces(params?: {
  q?: string;
  category?: string;
  state?: string;
  city?: string;
  area?: string;
  is_active?: boolean;
  per_page?: number;
  page?: number;
}) {
  const { data } = await http.get<ApiResponse<AdminPlaceListResponse>>('/admin/places', { params });
  return unwrapApiData(data, 'Failed to load places.');
}

export async function createAdminPlace(form: PlaceForm) {
  const { data } = await http.post<ApiResponse<AdminPlace>>('/admin/places', placePayload(form));
  return unwrapApiData(data, 'Failed to create place.');
}

export async function updateAdminPlace(id: number, form: PlaceForm) {
  const { data } = await http.put<ApiResponse<AdminPlace>>(`/admin/places/${id}`, placePayload(form));
  return unwrapApiData(data, 'Failed to update place.');
}

export async function setAdminPlaceActive(id: number, isActive: boolean) {
  const { data } = await http.patch<ApiResponse<AdminPlace>>(`/admin/places/${id}/status`, {
    is_active: isActive,
  });
  return unwrapApiData(data, isActive ? 'Failed to switch the place on.' : 'Failed to pause the place.');
}

export async function deleteAdminPlace(id: number) {
  const { data } = await http.delete<ApiResponse<null>>(`/admin/places/${id}`);
  if (!data.success) {
    throw new Error(data.error?.message || data.message || 'Failed to delete place.');
  }
}

export async function uploadAdminPlaceImage(file: File, onUploadProgress?: (percent: number) => void) {
  const form = new FormData();
  form.append('image', file);

  const { data } = await http.post<ApiResponse<{ url: string; width: number | null; height: number | null }>>(
    '/admin/places/upload-image',
    form,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (evt) => {
        if (!evt.total) return;
        onUploadProgress?.(Math.max(0, Math.min(100, Math.round((evt.loaded * 100) / evt.total))));
      },
    },
  );

  return unwrapApiData(data, 'Image upload failed.');
}

export async function fetchAdminPlaceCategories() {
  const { data } = await http.get<ApiResponse<AdminPlaceCategoryListResponse>>('/admin/place-categories');
  return unwrapApiData(data, 'Failed to load place categories.');
}

export async function createAdminPlaceCategory(form: PlaceCategoryForm) {
  const { data } = await http.post<ApiResponse<AdminPlaceCategory>>('/admin/place-categories', {
    name: form.name.trim(),
    slug: form.slug.trim() || undefined,
    description: form.description.trim() || null,
    icon: form.icon.trim() || 'store',
    is_active: form.is_active,
  });
  return unwrapApiData(data, 'Failed to create category.');
}

export async function updateAdminPlaceCategory(id: number, form: PlaceCategoryForm) {
  const { data } = await http.put<ApiResponse<AdminPlaceCategory>>(`/admin/place-categories/${id}`, {
    name: form.name.trim(),
    description: form.description.trim() || null,
    icon: form.icon.trim() || 'store',
    is_active: form.is_active,
  });
  return unwrapApiData(data, 'Failed to update category.');
}

export async function setAdminPlaceCategoryActive(id: number, isActive: boolean) {
  const { data } = await http.patch<ApiResponse<AdminPlaceCategory>>(`/admin/place-categories/${id}/status`, {
    is_active: isActive,
  });
  return unwrapApiData(data, isActive ? 'Failed to switch the category on.' : 'Failed to pause the category.');
}

export async function reorderAdminPlaceCategories(ids: number[]) {
  const { data } = await http.post<ApiResponse<AdminPlaceCategoryListResponse>>('/admin/place-categories/reorder', {
    ids,
  });
  return unwrapApiData(data, 'Failed to reorder categories.');
}

export async function deleteAdminPlaceCategory(id: number) {
  const { data } = await http.delete<ApiResponse<null>>(`/admin/place-categories/${id}`);
  if (!data.success) {
    throw new Error(data.error?.message || data.message || 'Failed to delete category.');
  }
}
