import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { AlertCircle, ArrowLeft, CalendarClock, ExternalLink, FileClock, RefreshCw, Send } from 'lucide-react';
import { blogPostAction, fetchBlogBoardPost, fetchBlogOverview, saveBlogBoardPost, uploadAdminBlogImage } from '@/api/adminBlogApi';
import { CategoryField, FIELD_INPUT, ImageField, PublishingCard, TagsField } from '@/components/admin2/blog/BlogEditorSidebar';
import { ScheduleModal } from '@/components/admin2/blog/BlogModals';
import { fullWhenLabel, postUrl, statusChip } from '@/components/admin2/blog/presentation';
import { Chip } from '@/components/admin2/errand/parts';
import { Card, Skeleton } from '@/components/admin2/overview/primitives';
import { OUTLINE_BUTTON, PRIMARY_BUTTON } from '@/components/admin2/shared/PageHeader';
import { NoticeBar, type Notice } from '@/components/admin2/shared/TableControls';
import { useAdmin2DateRange } from '@/context/Admin2DateRangeContext';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import { getAdmin2BlogPostHref, getAdmin2BlogPostId, getPagePath } from '@/lib/adminNavigation';
import { queryKeys } from '@/lib/queryKeys';
import { BLOG_CATEGORIES, type BlogBoardPost, type BlogEditorInput } from '@/types/api';

const QUILL_MODULES = {
  toolbar: [
    [{ header: [2, 3, false] }],
    ['bold', 'italic', 'underline', 'blockquote'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['link', 'image'],
    ['clean'],
  ],
};

const EXCERPT_LIMIT = 500;

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 255);
}

function plainText(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return (doc.body.textContent ?? '').replace(/\s+/g, ' ').trim();
}

function readMinutes(html: string): number {
  const words = plainText(html).split(' ').filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

type FormState = {
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  category: string;
  tags: string[];
  image: string;
};

function initialForm(post: BlogBoardPost | null): FormState {
  return {
    title: post?.title ?? '',
    slug: post?.slug ?? '',
    excerpt: post?.excerpt ?? '',
    body: post?.body ?? '',
    category: post?.category ?? '',
    tags: post?.tags ?? [],
    image: post?.image ?? '',
  };
}

type SaveRequest = {
  status?: BlogEditorInput['status'];
  then?: { action: 'publish' | 'schedule'; at?: string };
};

function savedMessage(post: BlogBoardPost, request: SaveRequest, created: boolean): string {
  if (request.then?.action === 'schedule') return `Scheduled for ${fullWhenLabel(post.published_at)}.`;
  if (request.then?.action === 'publish' || request.status === 'published') {
    return post.status === 'published' ? 'Published. It is live on the blog now.' : 'Saved.';
  }
  if (request.status === 'review') return 'Sent for review. Editors can find it in the review queue.';
  if (created) return 'Draft created.';
  return post.status === 'published' ? 'Changes are live on the blog.' : 'Changes saved.';
}

function BlogEditor({ post }: { post: BlogBoardPost | null }) {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { range } = useAdmin2DateRange();
  const [current, setCurrent] = useState<BlogBoardPost | null>(post);
  const [form, setForm] = useState<FormState>(() => initialForm(post));
  const [baseline, setBaseline] = useState<FormState>(() => initialForm(post));
  const [slugTouched, setSlugTouched] = useState(post != null);
  const [notice, setNotice] = useState<Notice | null>(() => (location.state as { notice?: Notice } | null)?.notice ?? null);
  const [scheduleOpen, setScheduleOpen] = useState(false);

  const overviewParams = { start_date: range.start, end_date: range.end };
  const overviewQuery = useQuery({
    queryKey: queryKeys.blog.overview(overviewParams),
    queryFn: () => fetchBlogOverview(overviewParams),
    staleTime: 5 * 60_000,
  });
  const categorySuggestions = useMemo(
    () => Array.from(new Set([...(overviewQuery.data?.filters.categories ?? []), ...BLOG_CATEGORIES])).sort((a, b) => a.localeCompare(b)),
    [overviewQuery.data],
  );

  const dirty = JSON.stringify(form) !== JSON.stringify(baseline);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((prev) => ({ ...prev, [key]: value }));
  const onTitleChange = (title: string) =>
    setForm((prev) => ({ ...prev, title: title.slice(0, 255), slug: slugTouched ? prev.slug : slugify(title) }));

  /** Quill re-emits loaded HTML in its own normalised form; only typing should count as an unsaved change. */
  const onBodyChange = (value: string, _delta: unknown, source: string) => {
    setForm((prev) => ({ ...prev, body: value }));
    if (source !== 'user') setBaseline((prev) => ({ ...prev, body: value }));
  };

  const bodyText = useMemo(() => plainText(form.body), [form.body]);
  const missing = !form.title.trim() ? 'Add a title before saving.' : !bodyText ? 'Write the post body before saving.' : null;

  const saveMutation = useMutation({
    mutationFn: async (request: SaveRequest) => {
      const input: BlogEditorInput = {
        title: form.title.trim(),
        slug: slugify(form.slug) || undefined,
        excerpt: form.excerpt.trim() || null,
        body: form.body,
        category: form.category.trim() || null,
        tags: form.tags,
        image: form.image || null,
      };
      if (request.status) input.status = request.status;
      let saved = await saveBlogBoardPost(current?.id ?? null, input);
      if (request.then) {
        const row = await blogPostAction(saved.id, request.then.action, request.then.at);
        saved = { ...saved, ...row };
      }
      return saved;
    },
    onSuccess: (saved, request) => {
      const created = current == null;
      const savedForm = { ...form, slug: saved.slug, title: saved.title };
      const message: Notice = { tone: 'ok', text: savedMessage(saved, request, created) };
      setCurrent(saved);
      setForm(savedForm);
      setBaseline(savedForm);
      setSlugTouched(true);
      setScheduleOpen(false);
      setNotice(message);
      queryClient.setQueryData(queryKeys.blog.editor(saved.id), saved);
      void queryClient.invalidateQueries({ queryKey: queryKeys.blog.all, predicate: (q) => q.queryKey[1] !== 'editor' });
      if (created) navigate(getAdmin2BlogPostHref(saved.id), { replace: true, state: { notice: message } });
    },
    onError: (error) => {
      setScheduleOpen(false);
      setNotice({ tone: 'error', text: getApiErrorMessage(error, 'Could not save this post.') });
    },
  });

  const save = (request: SaveRequest) => {
    if (missing) {
      setNotice({ tone: 'error', text: missing });
      return;
    }
    saveMutation.mutate(request);
  };

  const uploadImage = async (file: File, onProgress: (percent: number) => void) => {
    try {
      return (await uploadAdminBlogImage(file, onProgress)).url;
    } catch (error) {
      setNotice({ tone: 'error', text: getApiErrorMessage(error, 'Image upload failed.') });
      throw error;
    }
  };

  const status = current?.status ?? 'draft';
  const isLive = status === 'published';
  const busy = saveMutation.isPending;
  const chip = current ? statusChip(status) : null;
  const slugPreview = slugify(form.slug) || 'your-post-address';

  return (
    <div className="flex w-full flex-col gap-[20px]">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-[6px]">
          <p className="text-[10px] font-semibold uppercase text-[#167d35]">
            <Link to={getPagePath('admin2-blog')} className="hover:underline">
              Blog
            </Link>
            <span className="px-[6px] text-[#a3c9ad]">/</span>
            {current ? 'Edit post' : 'New post'}
          </p>
          <div className="flex min-w-0 flex-wrap items-center gap-[10px]">
            <h1 className="truncate text-[25px] font-bold leading-normal tracking-[-0.5px] text-[#17211b]">
              {form.title.trim() || (current ? 'Untitled post' : 'New post')}
            </h1>
            {chip ? <Chip tone={chip.tone} label={chip.label} dot /> : null}
          </div>
          <p className="text-[13px] text-[#6b6f66]">
            {bodyText ? `${readMinutes(form.body)} min read · ` : ''}
            {dirty ? 'Unsaved changes' : current ? 'All changes saved' : 'Not saved yet'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-[9px]">
          {isLive && current ? (
            <a href={postUrl(current.slug)} target="_blank" rel="noopener noreferrer" className={OUTLINE_BUTTON}>
              <ExternalLink className="size-[14px]" strokeWidth={1.8} />
              View on site
            </a>
          ) : null}
          {status === 'draft' ? (
            <>
              <button type="button" disabled={busy} onClick={() => save({ status: 'draft' })} className={OUTLINE_BUTTON}>
                Save draft
              </button>
              <button type="button" disabled={busy} onClick={() => save({ status: 'review' })} className={OUTLINE_BUTTON}>
                <FileClock className="size-[14px]" strokeWidth={1.8} />
                Send for review
              </button>
            </>
          ) : (
            <button type="button" disabled={busy || (!dirty && current != null)} onClick={() => save({})} className={OUTLINE_BUTTON}>
              Save changes
            </button>
          )}
          {!isLive && status !== 'archived' ? (
            <button type="button" disabled={busy} onClick={() => (missing ? setNotice({ tone: 'error', text: missing }) : setScheduleOpen(true))} className={OUTLINE_BUTTON}>
              <CalendarClock className="size-[14px]" strokeWidth={1.8} />
              {status === 'scheduled' ? 'Reschedule' : 'Schedule'}
            </button>
          ) : null}
          {!isLive && status !== 'archived' ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => save(status === 'scheduled' ? { then: { action: 'publish' } } : { status: 'published' })}
              className={PRIMARY_BUTTON}
            >
              <Send className="size-[14px]" strokeWidth={2} />
              {busy ? 'Saving…' : 'Publish now'}
            </button>
          ) : null}
          {isLive ? (
            <button type="button" disabled={busy || !dirty} onClick={() => save({})} className={PRIMARY_BUTTON}>
              <Send className="size-[14px]" strokeWidth={2} />
              {busy ? 'Saving…' : 'Update post'}
            </button>
          ) : null}
        </div>
      </div>

      <NoticeBar notice={notice} onDismiss={() => setNotice(null)} />
      {status === 'archived' ? (
        <p className="rounded-[8px] bg-[#f1f4f2] px-3 py-2 text-[11px] font-medium text-[#45514a]">
          This post is archived and hidden from readers. Restore it from the Blog posts table to publish it again.
        </p>
      ) : null}

      <div className="flex w-full flex-col gap-[16px] xl:flex-row xl:items-start">
        <Card className="flex min-w-0 flex-1 flex-col gap-[16px] p-[18px]">
          <label className="flex flex-col gap-[6px]">
            <span className="text-[11px] font-semibold text-[#17211b]">Title</span>
            <input
              value={form.title}
              onChange={(event) => onTitleChange(event.target.value)}
              placeholder="e.g. 7 ways to get more done in Lagos with GoQuick"
              className={`${FIELD_INPUT} h-[44px] text-[15px] font-semibold`}
            />
          </label>

          <label className="flex flex-col gap-[6px]">
            <span className="text-[11px] font-semibold text-[#17211b]">Web address</span>
            <div className="flex h-[38px] items-center overflow-hidden rounded-[8px] border border-[#d4ddd6] bg-white focus-within:border-[#167d35]">
              <span className="flex h-full flex-shrink-0 items-center border-r border-[#e2e8e3] bg-[#f8faf8] px-[10px] text-[11px] text-[#7c857f]">/blog/</span>
              <input
                value={form.slug}
                onChange={(event) => {
                  setSlugTouched(true);
                  set('slug', event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 255));
                }}
                onBlur={() => set('slug', slugify(form.slug))}
                placeholder="your-post-address"
                className="h-full min-w-0 flex-1 px-[10px] text-[12px] text-[#17211b] outline-none placeholder:text-[#a3aca6]"
              />
            </div>
            <span className="text-[10px] text-[#7c857f]">
              {isLive && current && slugify(form.slug) !== current.slug
                ? 'Changing the address of a live post breaks links people have already shared.'
                : `Readers will find it at ${postUrl(slugPreview).replace(/^https?:\/\//, '')}`}
            </span>
          </label>

          <label className="flex flex-col gap-[6px]">
            <span className="flex items-center justify-between text-[11px] font-semibold text-[#17211b]">
              Excerpt
              <span className={`font-normal ${form.excerpt.length > EXCERPT_LIMIT - 40 ? 'text-[#b06d12]' : 'text-[#7c857f]'}`}>
                {form.excerpt.length}/{EXCERPT_LIMIT}
              </span>
            </span>
            <textarea
              value={form.excerpt}
              onChange={(event) => set('excerpt', event.target.value.slice(0, EXCERPT_LIMIT))}
              rows={3}
              placeholder="One or two sentences shown on the blog card and in search results"
              className="w-full resize-y rounded-[8px] border border-[#d4ddd6] px-[11px] py-[9px] text-[12px] leading-relaxed text-[#17211b] outline-none placeholder:text-[#a3aca6] focus:border-[#167d35]"
            />
          </label>

          <div className="flex flex-col gap-[6px]">
            <span className="text-[11px] font-semibold text-[#17211b]">Body</span>
            <div className="overflow-hidden rounded-[8px] border border-[#d4ddd6] focus-within:border-[#167d35] [&_.ql-container]:border-0 [&_.ql-container]:font-inter [&_.ql-container]:text-[13px] [&_.ql-editor]:min-h-[380px] [&_.ql-editor]:leading-relaxed [&_.ql-toolbar]:border-0 [&_.ql-toolbar]:border-b [&_.ql-toolbar]:border-[#e2e8e3] [&_.ql-toolbar]:bg-[#f8faf8]">
              <ReactQuill theme="snow" modules={QUILL_MODULES} value={form.body} onChange={onBodyChange} placeholder="Write the story…" />
            </div>
          </div>
        </Card>

        <div className="flex w-full flex-col gap-[16px] xl:w-[320px] xl:flex-shrink-0">
          <PublishingCard post={current} />
          <ImageField value={form.image} onChange={(url) => set('image', url)} onUpload={uploadImage} />
          <CategoryField value={form.category} onChange={(value) => set('category', value)} suggestions={categorySuggestions} />
          <TagsField tags={form.tags} onChange={(tags) => set('tags', tags)} />
        </div>
      </div>

      <ScheduleModal
        row={scheduleOpen ? { title: form.title.trim() || 'This post', status, published_at: current?.published_at ?? null } : null}
        busy={busy}
        onClose={() => setScheduleOpen(false)}
        onConfirm={(at) => save({ then: { action: 'schedule', at } })}
      />
    </div>
  );
}

export function Admin2BlogEditorPage() {
  const location = useLocation();
  const id = getAdmin2BlogPostId(location.pathname);
  const postId = typeof id === 'number' ? id : null;

  const postQuery = useQuery({
    queryKey: queryKeys.blog.editor(postId ?? 0),
    queryFn: () => fetchBlogBoardPost(postId as number),
    enabled: postId != null,
  });

  if (id === 'new') return <BlogEditor key="new" post={null} />;

  if (postQuery.isError) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-[12px] border border-[#f1d4d4] bg-[#fff0f0] p-[18px] text-[12px] text-[#b84545]">
        <span className="flex items-center gap-2 font-semibold">
          <AlertCircle className="size-4" />
          {getApiErrorMessage(postQuery.error, 'Could not load this post.')}
        </span>
        <div className="flex gap-3">
          <button type="button" onClick={() => void postQuery.refetch()} className="flex items-center gap-1 font-semibold hover:underline">
            <RefreshCw className="size-3.5" /> Retry
          </button>
          <Link to={getPagePath('admin2-blog')} className="flex items-center gap-1 font-semibold hover:underline">
            <ArrowLeft className="size-3.5" /> Back to blog
          </Link>
        </div>
      </div>
    );
  }

  if (!postQuery.data) {
    return (
      <div className="flex w-full flex-col gap-[20px]">
        <div className="flex flex-col gap-[8px]">
          <Skeleton className="h-[10px] w-[90px]" />
          <Skeleton className="h-[30px] w-[320px]" />
          <Skeleton className="h-[12px] w-[160px]" />
        </div>
        <div className="flex flex-col gap-[16px] xl:flex-row">
          <Skeleton className="h-[560px] flex-1 rounded-[12px]" />
          <Skeleton className="h-[420px] w-full rounded-[12px] xl:w-[320px]" />
        </div>
      </div>
    );
  }

  return <BlogEditor key={postQuery.data.id} post={postQuery.data} />;
}
