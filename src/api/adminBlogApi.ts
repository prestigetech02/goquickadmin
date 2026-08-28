import { http } from '@/lib/http';
import {
  unwrapApiData,
  type BlogListResponse,
  type BlogPostDetail,
  type BlogPostInput,
  type BlogPostUpdateInput,
  type ListQueryParams,
} from '@/types/api';
import type { ApiResponse } from '@/types';

export type BlogListParams = ListQueryParams & {
  search?: string;
  published?: boolean | 0 | 1;
};

export async function fetchAdminBlogPosts(params: BlogListParams = {}) {
  const { data } = await http.get<ApiResponse<BlogListResponse>>('/admin/blog/posts', { params });
  return unwrapApiData(data, 'Failed to load blog posts.');
}

export async function fetchAdminBlogPost(id: number) {
  const { data } = await http.get<ApiResponse<BlogPostDetail>>(`/admin/blog/posts/${id}`);
  return unwrapApiData(data, 'Failed to load blog post.');
}

export async function createAdminBlogPost(input: BlogPostInput) {
  const { data } = await http.post<ApiResponse<BlogPostDetail>>('/admin/blog/posts', input);
  return unwrapApiData(data, 'Failed to create blog post.');
}

export async function updateAdminBlogPost(id: number, input: BlogPostUpdateInput) {
  const { data } = await http.put<ApiResponse<BlogPostDetail>>(`/admin/blog/posts/${id}`, input);
  return unwrapApiData(data, 'Failed to update blog post.');
}

export async function deleteAdminBlogPost(id: number) {
  const { data } = await http.delete<ApiResponse<null>>(`/admin/blog/posts/${id}`);
  if (!data.success) {
    throw new Error(data.error?.message || data.message || 'Failed to delete blog post.');
  }
}

export async function uploadAdminBlogImage(
  file: File,
  onUploadProgress?: (percent: number) => void,
) {
  const form = new FormData();
  form.append('image', file);

  const { data } = await http.post<ApiResponse<{ url: string }>>('/admin/blog/upload-image', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (evt) => {
      if (!evt.total) return;
      const percent = Math.round((evt.loaded * 100) / evt.total);
      onUploadProgress?.(Math.max(0, Math.min(100, percent)));
    },
  });

  return unwrapApiData(data, 'Image upload failed.');
}
