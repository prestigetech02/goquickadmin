import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Edit3,
  ExternalLink,
  FileText,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react';
import {
  createAdminBlogPost,
  deleteAdminBlogPost,
  fetchAdminBlogPost,
  fetchAdminBlogPosts,
  updateAdminBlogPost,
  uploadAdminBlogImage,
} from '@/api/adminBlogApi';
import { BlogFormSidebar } from '@/components/BlogFormSidebar';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import { queryKeys } from '@/lib/queryKeys';
import { formatDate } from '@/lib/utils';
import type { BlogPostDetail, BlogPostListItem } from '@/types/api';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

type BlogView = 'list' | 'new' | 'edit';
type PublishedFilter = 'all' | 'published' | 'draft';

const LANDING_URL = import.meta.env.VITE_LANDING_URL || 'https://goquickapp.com.ng';

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return '';
  try {
    const date = new Date(iso);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  } catch {
    return '';
  }
}

function isPublished(post: Pick<BlogPostListItem, 'published_at'>): boolean {
  if (!post.published_at) return false;
  return new Date(post.published_at).getTime() <= Date.now();
}

function authorName(post: BlogPostListItem): string {
  return post.author?.name || 'GoQuick';
}

export function BlogPage() {
  const [view, setView] = useState<BlogView>('list');
  const [editingId, setEditingId] = useState<number | null>(null);

  if (view === 'new') {
    return (
      <BlogEditor
        mode="new"
        onBack={() => setView('list')}
        onCreated={(post) => {
          setEditingId(post.id);
          setView('edit');
        }}
      />
    );
  }

  if (view === 'edit' && editingId != null) {
    return (
      <BlogEditor
        mode="edit"
        postId={editingId}
        onBack={() => {
          setEditingId(null);
          setView('list');
        }}
      />
    );
  }

  return (
    <BlogList
      onNew={() => setView('new')}
      onEdit={(id) => {
        setEditingId(id);
        setView('edit');
      }}
    />
  );
}

function BlogList({
  onNew,
  onEdit,
}: {
  onNew: () => void;
  onEdit: (id: number) => void;
}) {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [publishedFilter, setPublishedFilter] = useState<PublishedFilter>('all');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, publishedFilter]);

  const listParams = useMemo(() => {
    const params: Record<string, string | number> = { per_page: 15, page };
    if (debouncedSearch) params.search = debouncedSearch;
    if (publishedFilter === 'published') params.published = 1;
    if (publishedFilter === 'draft') params.published = 0;
    return params;
  }, [page, debouncedSearch, publishedFilter]);

  const listQuery = useQuery({
    queryKey: queryKeys.blog.list(listParams),
    queryFn: () => fetchAdminBlogPosts(listParams),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteAdminBlogPost(id),
    onSuccess: () => {
      setActionError(null);
      setActionSuccess('Post deleted.');
      queryClient.invalidateQueries({ queryKey: ['admin-blog'] });
    },
    onError: (err) => {
      setActionSuccess(null);
      setActionError(getApiErrorMessage(err, 'Failed to delete post.'));
    },
  });

  const posts = listQuery.data?.posts ?? [];
  const pagination = listQuery.data?.pagination;
  const publishedCount = posts.filter(isPublished).length;

  const handleDelete = (post: BlogPostListItem) => {
    if (deleteMutation.isPending) return;
    if (!window.confirm(`Delete “${post.title}”? This cannot be undone.`)) return;
    deleteMutation.mutate(post.id);
  };

  const columns: Column<BlogPostListItem>[] = [
    {
      key: 'title',
      header: 'Title',
      render: (row) => (
        <button
          type="button"
          onClick={() => onEdit(row.id)}
          className="text-left font-semibold text-brand-700 hover:text-brand-800 hover:underline"
        >
          {row.title}
        </button>
      ),
    },
    {
      key: 'slug',
      header: 'Slug',
      render: (row) => <span className="text-ink-500 text-sm font-mono">{row.slug}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <Badge status={isPublished(row) ? 'published' : 'draft'} />
      ),
    },
    {
      key: 'author',
      header: 'Author',
      render: (row) => <span className="text-ink-600 text-sm">{authorName(row)}</span>,
    },
    {
      key: 'published_at',
      header: 'Published',
      render: (row) => (
        <span className="text-ink-500 text-sm">
          {row.published_at ? formatDate(row.published_at) : '—'}
        </span>
      ),
    },
    {
      key: 'updated_at',
      header: 'Updated',
      render: (row) => <span className="text-ink-500 text-sm">{formatDate(row.updated_at)}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onEdit(row.id)}
            className="p-1.5 rounded-lg text-ink-400 hover:bg-brand-50 hover:text-brand-700 transition-colors"
            title="Edit"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleDelete(row)}
            disabled={deleteMutation.isPending}
            className="p-1.5 rounded-lg text-ink-400 hover:bg-error-50 hover:text-error-600 transition-colors disabled:opacity-50"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Blog"
        subtitle={`Manage posts for the landing site · ${pagination?.total ?? posts.length} total`}
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => listQuery.refetch()}
              disabled={listQuery.isFetching}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-ink-200 bg-white text-sm font-medium text-ink-700 hover:bg-ink-50 disabled:opacity-60"
            >
              <RefreshCw className={`w-4 h-4 ${listQuery.isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              type="button"
              onClick={onNew}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New post
            </button>
          </div>
        }
      />

      {actionError ? (
        <div className="mb-4 flex items-start gap-2 rounded-xl bg-error-50 px-4 py-3 text-sm text-error-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>{actionError}</p>
        </div>
      ) : null}

      {actionSuccess ? (
        <div className="mb-4 flex items-start gap-2 rounded-xl bg-success-50 px-4 py-3 text-sm text-success-700">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>{actionSuccess}</p>
        </div>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">On this page</p>
          <p className="text-2xl font-bold text-ink-900 mt-1">{posts.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Published (page)</p>
          <p className="text-2xl font-bold text-success-700 mt-1">{publishedCount}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Total posts</p>
          <p className="text-2xl font-bold text-ink-900 mt-1">{pagination?.total ?? 0}</p>
        </Card>
      </div>

      <Card className="mb-4">
        <CardBody className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title, slug, excerpt…"
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-ink-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <select
            value={publishedFilter}
            onChange={(e) => setPublishedFilter(e.target.value as PublishedFilter)}
            className="rounded-xl border border-ink-200 px-3 py-2.5 text-sm text-ink-700 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="all">All posts</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
        </CardBody>
      </Card>

      {listQuery.isError ? (
        <Card className="p-8 text-center">
          <AlertCircle className="w-8 h-8 text-error-400 mx-auto mb-2" />
          <p className="text-error-700 font-medium">Failed to load blog posts</p>
          <p className="text-sm text-ink-500 mt-1">
            {getApiErrorMessage(listQuery.error, 'Check that the API is running and you have operations access.')}
          </p>
        </Card>
      ) : (
        <Card>
          <DataTable
            columns={columns}
            data={posts}
            loading={listQuery.isLoading}
            emptyMessage="No blog posts found"
            page={page}
            pageSize={pagination?.per_page}
            total={pagination?.total}
            onPageChange={setPage}
          />
        </Card>
      )}

      {!listQuery.isLoading && posts.length === 0 && !listQuery.isError ? (
        <Card className="mt-4 p-10 text-center">
          <FileText className="w-10 h-10 text-ink-300 mx-auto mb-2" />
          <p className="text-ink-500">No posts yet. Create your first post for the landing blog.</p>
          <button
            type="button"
            onClick={onNew}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-medium hover:bg-brand-700"
          >
            <Plus className="w-4 h-4" />
            New post
          </button>
        </Card>
      ) : null}
    </div>
  );
}

function BlogEditor({
  mode,
  postId,
  onBack,
  onCreated,
}: {
  mode: 'new' | 'edit';
  postId?: number;
  onBack: () => void;
  onCreated?: (post: BlogPostDetail) => void;
}) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [image, setImage] = useState('');
  const [publishedAt, setPublishedAt] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(mode === 'new');

  const postQuery = useQuery({
    queryKey: queryKeys.blog.detail(postId ?? 0),
    queryFn: () => fetchAdminBlogPost(postId!),
    enabled: mode === 'edit' && postId != null,
  });

  useEffect(() => {
    const post = postQuery.data;
    if (!post || hydrated) return;
    setTitle(post.title);
    setSlug(post.slug);
    setExcerpt(post.excerpt ?? '');
    setBody(post.body);
    setCategory(post.category ?? '');
    setTags(Array.isArray(post.tags) ? post.tags : []);
    setImage(post.image ?? '');
    setPublishedAt(toDatetimeLocal(post.published_at));
    setHydrated(true);
  }, [postQuery.data, hydrated]);

  const invalidateBlog = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-blog'] });
  };

  const createMutation = useMutation({
    mutationFn: () =>
      createAdminBlogPost({
        title,
        slug: slug || undefined,
        excerpt: excerpt || undefined,
        body,
        category: category || undefined,
        tags: tags.length ? tags : undefined,
        image: image || undefined,
        published_at: publishedAt ? publishedAt : null,
      }),
    onSuccess: (post) => {
      setActionError(null);
      setActionSuccess('Post created.');
      invalidateBlog();
      onCreated?.(post);
    },
    onError: (err) => {
      setActionSuccess(null);
      setActionError(getApiErrorMessage(err, 'Failed to create post.'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      updateAdminBlogPost(postId!, {
        title,
        slug: slug || undefined,
        excerpt: excerpt || undefined,
        body,
        category: category || undefined,
        tags: tags.length ? tags : undefined,
        image: image || undefined,
        published_at: publishedAt ? publishedAt : null,
      }),
    onSuccess: () => {
      setActionError(null);
      setActionSuccess('Post updated.');
      invalidateBlog();
      if (postId != null) {
        queryClient.invalidateQueries({ queryKey: queryKeys.blog.detail(postId) });
      }
    },
    onError: (err) => {
      setActionSuccess(null);
      setActionError(getApiErrorMessage(err, 'Failed to update post.'));
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;
  const post = postQuery.data;

  const quillModules = {
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'blockquote', 'code-block'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['link', 'image'],
      ['clean'],
    ],
  };

  async function handleImageUpload(file: File, onProgress?: (percent: number) => void) {
    try {
      const result = await uploadAdminBlogImage(file, onProgress);
      return result.url;
    } catch (err) {
      setActionError(getApiErrorMessage(err, 'Image upload failed.'));
      throw err;
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setActionError(null);
    setActionSuccess(null);
    if (mode === 'new') {
      createMutation.mutate();
      return;
    }
    updateMutation.mutate();
  }

  if (mode === 'edit' && postQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (mode === 'edit' && postQuery.isError) {
    return (
      <div>
        <button type="button" onClick={onBack} className="inline-flex items-center gap-2 text-sm text-ink-500 hover:text-ink-800 mb-4">
          <ArrowLeft className="w-4 h-4" />
          Back to blog
        </button>
        <Card className="p-8 text-center">
          <AlertCircle className="w-8 h-8 text-error-400 mx-auto mb-2" />
          <p className="text-error-700">{getApiErrorMessage(postQuery.error, 'Failed to load post.')}</p>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-medium text-ink-500 hover:text-ink-800"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to blog
        </button>
        {mode === 'edit' && post ? (
          <a
            href={`${LANDING_URL}/blog/${post.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-ink-200 bg-white text-sm font-medium text-ink-700 hover:bg-ink-50"
          >
            View on site
            <ExternalLink className="w-4 h-4" />
          </a>
        ) : null}
      </div>

      <PageHeader
        title={mode === 'new' ? 'New blog post' : `Edit: ${post?.title ?? 'Post'}`}
        subtitle="Posts with a publish date appear on the public landing blog"
      />

      {actionError ? (
        <div className="mb-4 flex items-start gap-2 rounded-xl bg-error-50 px-4 py-3 text-sm text-error-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>{actionError}</p>
        </div>
      ) : null}

      {actionSuccess ? (
        <div className="mb-4 flex items-start gap-2 rounded-xl bg-success-50 px-4 py-3 text-sm text-success-700">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>{actionSuccess}</p>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-4">
          <Card>
            <CardBody className="space-y-4">
            <div>
              <label htmlFor="blog-title" className="block text-sm font-medium text-ink-700 mb-1.5">
                Title *
              </label>
              <input
                id="blog-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                maxLength={255}
                className="w-full px-4 py-2.5 rounded-xl border border-ink-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label htmlFor="blog-slug" className="block text-sm font-medium text-ink-700 mb-1.5">
                Slug
              </label>
              <input
                id="blog-slug"
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="Auto-generated from title if empty"
                maxLength={255}
                className="w-full px-4 py-2.5 rounded-xl border border-ink-200 bg-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label htmlFor="blog-excerpt" className="block text-sm font-medium text-ink-700 mb-1.5">
                Excerpt
              </label>
              <textarea
                id="blog-excerpt"
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                rows={2}
                maxLength={500}
                className="w-full px-4 py-2.5 rounded-xl border border-ink-200 bg-white resize-none focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div className="rounded-xl border border-ink-100 bg-ink-50/60 p-4 space-y-3">
              <p className="text-sm font-medium text-ink-700">Publishing</p>
              <label className="flex items-start gap-2 text-sm text-ink-700">
                <input
                  type="checkbox"
                  checked={!!publishedAt}
                  onChange={(e) =>
                    setPublishedAt(e.target.checked ? new Date().toISOString().slice(0, 16) : '')
                  }
                  className="mt-0.5 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
                />
                <span>Publish (post will appear on the landing site when the date is reached)</span>
              </label>
              {publishedAt ? (
                <input
                  id="blog-published_at"
                  type="datetime-local"
                  value={publishedAt}
                  onChange={(e) => setPublishedAt(e.target.value)}
                  className="w-full max-w-xs px-3 py-2 rounded-xl border border-ink-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              ) : (
                <p className="text-sm text-ink-500">Draft — won&apos;t appear on the public blog until you set a publish date.</p>
              )}
            </div>

            <div>
              <label htmlFor="blog-body" className="block text-sm font-medium text-ink-700 mb-1.5">
                Body *
              </label>
              <div className="rounded-xl border border-ink-200 overflow-hidden bg-white focus-within:ring-2 focus-within:ring-brand-500">
                <ReactQuill
                  theme="snow"
                  modules={quillModules}
                  value={body}
                  onChange={(value) => setBody(value)}
                  style={{ height: 340 }}
                />
              </div>
              <p className="text-xs text-ink-400 mt-1">Rich text (stored as HTML).</p>
            </div>

            </CardBody>
          </Card>

          <BlogFormSidebar
            category={category}
            onCategoryChange={setCategory}
            tags={tags}
            onTagsChange={setTags}
            imageUrl={image}
            onImageUrlChange={setImage}
            onImageUpload={handleImageUpload}
          />
        </div>

        <div className="flex flex-wrap gap-2 justify-end">
          <button
            type="button"
            onClick={onBack}
            disabled={isPending}
            className="px-4 py-2.5 rounded-xl border border-ink-200 bg-white text-sm font-medium text-ink-700 hover:bg-ink-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-60"
          >
            {isPending ? 'Saving…' : mode === 'new' ? 'Create post' : 'Save changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
