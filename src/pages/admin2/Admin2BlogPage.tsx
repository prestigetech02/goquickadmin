import { useMemo, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { blogPostAction, deleteAdminBlogPost, fetchBlogOverview } from '@/api/adminBlogApi';
import { BlogKpiCards } from '@/components/admin2/blog/BlogKpiCards';
import { BrokenLinksModal, DeletePostModal, EditorialCalendarModal, ScheduleModal } from '@/components/admin2/blog/BlogModals';
import { BlogPostsCard } from '@/components/admin2/blog/BlogPostsCard';
import { CategoryMixCard } from '@/components/admin2/blog/CategoryMixCard';
import { ContentPerformanceCard } from '@/components/admin2/blog/ContentPerformanceCard';
import { EditorialAttentionCard } from '@/components/admin2/blog/EditorialAttentionCard';
import { DEFAULT_POST_FILTERS, fullWhenLabel, postListParams, rangeNoun, type PostFilters } from '@/components/admin2/blog/presentation';
import type { QuickAction, RowHandlers } from '@/components/admin2/blog/rowActions';
import { TopArticlesCard } from '@/components/admin2/blog/TopArticlesCard';
import { PageHeader, PRIMARY_BUTTON } from '@/components/admin2/shared/PageHeader';
import { NoticeBar, type Notice } from '@/components/admin2/shared/TableControls';
import { useDebounced } from '@/components/admin2/shared/useDebounced';
import { useAdmin2DateRange } from '@/context/Admin2DateRangeContext';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import { getAdmin2BlogPostHref } from '@/lib/adminNavigation';
import { queryKeys } from '@/lib/queryKeys';
import type { BlogBoardRow } from '@/types/api';

type MutationInput = { row: BlogBoardRow; action: QuickAction } | { row: BlogBoardRow; action: 'schedule'; at: string } | { row: BlogBoardRow; action: 'delete' };

function successMessage(input: MutationInput, result: BlogBoardRow | null): string {
  const title = `"${input.row.title}"`;
  switch (input.action) {
    case 'publish':
      return `${title} is live on the blog.`;
    case 'schedule':
      return `${title} is scheduled for ${fullWhenLabel(result?.published_at ?? input.at)}.`;
    case 'review':
      return `${title} is waiting for an editor's review.`;
    case 'draft':
      return `${title} is back in drafts${input.row.status === 'published' ? ' and hidden from readers' : ''}.`;
    case 'archive':
      return `${title} is archived and hidden from readers.`;
    case 'restore':
      return `${title} is restored to drafts.`;
    case 'duplicate':
      return `Copied to a new draft: "${result?.title ?? 'Copy'}".`;
    case 'delete':
      return `${title} is deleted.`;
  }
}

export function Admin2BlogPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { range } = useAdmin2DateRange();
  const [filters, setFilters] = useState<PostFilters>(DEFAULT_POST_FILTERS);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounced(search, 350);
  const params = useMemo(() => postListParams(filters, debouncedSearch), [filters, debouncedSearch]);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [scheduling, setScheduling] = useState<BlogBoardRow | null>(null);
  const [deleting, setDeleting] = useState<BlogBoardRow | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [linksOpen, setLinksOpen] = useState(false);

  const overviewParams = { start_date: range.start, end_date: range.end };
  const overviewQuery = useQuery({
    queryKey: queryKeys.blog.overview(overviewParams),
    queryFn: () => fetchBlogOverview(overviewParams),
    placeholderData: keepPreviousData,
  });

  const actionMutation = useMutation({
    mutationFn: async (input: MutationInput): Promise<BlogBoardRow | null> => {
      if (input.action === 'delete') {
        await deleteAdminBlogPost(input.row.id);
        return null;
      }
      return blogPostAction(input.row.id, input.action, input.action === 'schedule' ? input.at : undefined);
    },
    onSuccess: (result, input) => {
      setScheduling(null);
      setDeleting(null);
      setNotice({ tone: 'ok', text: successMessage(input, result) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.blog.all });
    },
    onError: (error) => setNotice({ tone: 'error', text: getApiErrorMessage(error, 'That action failed.') }),
  });

  const handlers: RowHandlers = {
    edit: (row) => navigate(getAdmin2BlogPostHref(row.id)),
    act: (row, action) => actionMutation.mutate({ row, action }),
    schedule: (row) => setScheduling(row),
    remove: (row) => setDeleting(row),
  };

  const showPosts = (next: PostFilters) => {
    setFilters(next);
    setSearch('');
    document.getElementById('blog-posts')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="flex w-full flex-col gap-[20px]">
      <PageHeader
        eyebrow="Content studio · Public blog"
        title="Blog"
        subtitle="Plan, publish and improve useful GoQuick stories about errands, safety, Lagos productivity and the people powering every delivery."
        actions={
          <button type="button" onClick={() => navigate(getAdmin2BlogPostHref('new'))} className={PRIMARY_BUTTON}>
            <Plus className="size-[15px]" strokeWidth={2} />
            New post
          </button>
        }
      />

      <NoticeBar notice={notice} onDismiss={() => setNotice(null)} />
      {overviewQuery.isError ? (
        <p className="rounded-[8px] bg-[#fdeded] px-3 py-2 text-[11px] font-medium text-[#b84545]">
          {getApiErrorMessage(overviewQuery.error, 'Could not load blog metrics.')}
        </p>
      ) : null}

      <BlogKpiCards overview={overviewQuery.data} preset={range.preset} />

      <div className="flex w-full flex-col gap-[16px] xl:flex-row">
        <ContentPerformanceCard overview={overviewQuery.data} />
        <CategoryMixCard overview={overviewQuery.data} />
      </div>

      <div className="flex w-full flex-col gap-[16px] xl:flex-row">
        <TopArticlesCard
          overview={overviewQuery.data}
          rangeNoun={rangeNoun(range.preset)}
          onViewAll={() => showPosts({ ...DEFAULT_POST_FILTERS, tab: 'published' })}
        />
        <EditorialAttentionCard
          overview={overviewQuery.data}
          onOpenReviewQueue={() => showPosts({ ...DEFAULT_POST_FILTERS, tab: 'drafts', status: 'review' })}
          onOpenBrokenLinks={() => setLinksOpen(true)}
        />
      </div>

      <BlogPostsCard
        overview={overviewQuery.data}
        filters={filters}
        onFiltersChange={setFilters}
        search={search}
        onSearchChange={setSearch}
        params={params}
        handlers={handlers}
        busy={actionMutation.isPending}
        onOpenCalendar={() => setCalendarOpen(true)}
      />

      <ScheduleModal
        row={scheduling}
        busy={actionMutation.isPending}
        onClose={() => setScheduling(null)}
        onConfirm={(at) => scheduling && actionMutation.mutate({ row: scheduling, action: 'schedule', at })}
      />
      <DeletePostModal
        row={deleting}
        busy={actionMutation.isPending}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && actionMutation.mutate({ row: deleting, action: 'delete' })}
      />
      <EditorialCalendarModal open={calendarOpen} onClose={() => setCalendarOpen(false)} />
      <BrokenLinksModal open={linksOpen} onClose={() => setLinksOpen(false)} />
    </div>
  );
}
