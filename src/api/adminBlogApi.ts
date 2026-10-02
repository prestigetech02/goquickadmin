import { http } from '@/lib/http';
import {
  unwrapApiData,
  type BlogBoardListParams,
  type BlogBoardListResponse,
  type BlogBoardPost,
  type BlogBoardRow,
  type BlogCalendar,
  type BlogEditorInput,
  type BlogLinkIssue,
  type BlogOverview,
  type BlogPostAction,
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

export async function fetchBlogOverview(params: { start_date: string; end_date: string }) {
  const { data } = await http.get<ApiResponse<BlogOverview>>('/admin/blog/overview', { params });
  return unwrapApiData(data, 'Failed to load blog overview.');
}

export async function fetchBlogBoardPosts(params: BlogBoardListParams) {
  const { data } = await http.get<ApiResponse<BlogBoardListResponse>>('/admin/blog/posts', { params });
  return unwrapApiData(data, 'Failed to load blog posts.');
}

export async function fetchBlogBoardPost(id: number) {
  const { data } = await http.get<ApiResponse<BlogBoardPost>>(`/admin/blog/posts/${id}`);
  return unwrapApiData(data, 'Failed to load blog post.');
}

export async function saveBlogBoardPost(id: number | null, input: BlogEditorInput) {
  const { data } = id
    ? await http.put<ApiResponse<BlogBoardPost>>(`/admin/blog/posts/${id}`, input)
    : await http.post<ApiResponse<BlogBoardPost>>('/admin/blog/posts', input);
  return unwrapApiData(data, 'Failed to save blog post.');
}

export async function blogPostAction(id: number, action: BlogPostAction, publishedAt?: string) {
  const { data } = await http.post<ApiResponse<BlogBoardRow>>(`/admin/blog/posts/${id}/action`, {
    action,
    published_at: publishedAt,
  });
  return unwrapApiData(data, 'That action failed.');
}

export async function fetchBlogLinkIssues() {
  const { data } = await http.get<ApiResponse<{ issues: BlogLinkIssue[]; count: number }>>('/admin/blog/link-issues');
  return unwrapApiData(data, 'Failed to check links.');
}

export async function fetchBlogCalendar(month: string) {
  const { data } = await http.get<ApiResponse<BlogCalendar>>('/admin/blog/calendar', { params: { month } });
  return unwrapApiData(data, 'Failed to load the editorial calendar.');
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
