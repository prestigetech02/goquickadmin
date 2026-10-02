import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { CalendarDays, EllipsisVertical, ImageOff } from 'lucide-react';
import { fetchBlogBoardPosts } from '@/api/adminBlogApi';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import { queryKeys } from '@/lib/queryKeys';
import type { BlogBoardListParams, BlogBoardRow, BlogOverview } from '@/types/api';
import { formatCount } from '../format';
import { Chip, PersonAvatar } from '../errand/parts';
import { Card, Skeleton } from '../overview/primitives';
import { pageForKey } from '../shared/helpers';
import { OUTLINE_BUTTON } from '../shared/PageHeader';
import { Pager } from '../shared/Pager';
import { CardTabs, SearchField, TABLE_HEADER } from '../shared/TableControls';
import { ActionMenu } from '../users/ActionMenu';
import { FilterDropdown } from '../users/FilterDropdown';
import {
  DATE_OPTIONS,
  DEFAULT_POST_FILTERS,
  STATUS_OPTIONS,
  TABS,
  authorTone,
  fullWhenLabel,
  postUrl,
  rowTiming,
  statusChip,
  whenLabel,
  type PostFilters,
} from './presentation';
import { rowActions, type RowHandlers } from './rowActions';

const PER_PAGE = 10;

const GRID_COLUMNS =
  'grid grid-cols-[minmax(300px,2.8fr)_minmax(110px,1fr)_minmax(140px,1.1fr)_100px_minmax(130px,1fr)_70px_36px] items-center gap-x-[12px] px-[16px]';

function Thumbnail({ row }: { row: BlogBoardRow }) {
  const [failed, setFailed] = useState(false);
  if (!row.image || failed) {
    return (
      <span className="flex h-[40px] w-[52px] flex-shrink-0 items-center justify-center rounded-[6px] bg-[#f1f4f2] text-[#a3aca6]">
        <ImageOff className="size-[15px]" strokeWidth={1.6} />
      </span>
    );
  }
  return <img src={row.image} alt="" loading="lazy" onError={() => setFailed(true)} className="h-[40px] w-[52px] flex-shrink-0 rounded-[6px] object-cover" />;
}

function TimingCell({ row }: { row: BlogBoardRow }) {
  const { prefix, at } = rowTiming(row);
  if (!at) return <p className="text-[10px] text-[#7c857f]">—</p>;
  return (
    <p className="truncate text-[10px] font-medium text-[#17211b]" title={fullWhenLabel(at)}>
      {prefix ? `${prefix} ${whenLabel(at)}` : fullWhenLabel(at)}
    </p>
  );
}

export function BlogPostsCard({
  overview,
  filters,
  onFiltersChange,
  search,
  onSearchChange,
  params,
  handlers,
  busy,
  onOpenCalendar,
}: {
  overview?: BlogOverview;
  filters: PostFilters;
  onFiltersChange: (filters: PostFilters) => void;
  search: string;
  onSearchChange: (value: string) => void;
  params: BlogBoardListParams;
  handlers: RowHandlers;
  busy: boolean;
  onOpenCalendar: () => void;
}) {
  const paramsKey = JSON.stringify(params);
  const [pageState, setPageState] = useState({ key: paramsKey, page: 1 });
  const page = pageForKey(pageState, paramsKey);
  const setPage = (next: number) => setPageState({ key: paramsKey, page: next });

  const listParams = { ...params, page, per_page: PER_PAGE };
  const listQuery = useQuery({
    queryKey: queryKeys.blog.board(listParams),
    queryFn: () => fetchBlogBoardPosts(listParams),
    placeholderData: keepPreviousData,
  });

  const rows = listQuery.data?.posts ?? [];
  const total = listQuery.data?.pagination.total ?? 0;
  const lastPage = listQuery.data?.pagination.last_page ?? 1;
  const hasAnyFilter = filters.author !== '' || filters.category !== '' || filters.status !== '' || filters.days !== '' || search.trim() !== '';
  const awaitingReview = overview?.kpis.drafts.awaiting_review ?? 0;

  const update = <K extends keyof PostFilters>(key: K, value: PostFilters[K]) => onFiltersChange({ ...filters, [key]: value });
  const clearFilters = () => {
    onFiltersChange({ ...DEFAULT_POST_FILTERS, tab: filters.tab });
    onSearchChange('');
  };

  const tabs = TABS.map((tab) => ({ ...tab, count: overview?.tab_counts[tab.value] ?? null }));
  const authorOptions = [
    { value: '', label: 'All authors' },
    ...(overview?.filters.authors ?? []).map((author) => ({ value: String(author.id), label: author.name })),
  ];
  const categoryOptions = [{ value: '', label: 'All categories' }, ...(overview?.filters.categories ?? []).map((name) => ({ value: name, label: name }))];

  return (
    <Card id="blog-posts" className="w-full scroll-mt-[80px] overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 px-[16px] pb-[4px] pt-[16px]">
        <div className="flex min-w-0 flex-col gap-[4px]">
          <p className="text-[14px] font-semibold text-[#17211b]">Blog posts</p>
          <p className="text-[11px] text-[#7c857f]">Manage GoQuick&apos;s public editorial calendar and article library</p>
        </div>
        <button type="button" onClick={onOpenCalendar} className={OUTLINE_BUTTON}>
          <CalendarDays className="size-[14px]" strokeWidth={1.8} />
          Editorial calendar
        </button>
      </div>

      <CardTabs tabs={tabs} value={filters.tab} onChange={(tab) => onFiltersChange({ ...filters, tab, status: '' })} />

      <div className="flex flex-wrap items-center gap-[10px] border-b border-[#e2e8e3] px-[16px] py-[12px]">
        <SearchField value={search} onChange={onSearchChange} placeholder="Search title, excerpt or keyword…" />
        <FilterDropdown label="Author" value={filters.author} options={authorOptions} onChange={(v) => update('author', v)} />
        <FilterDropdown label="Category" value={filters.category} options={categoryOptions} onChange={(v) => update('category', v)} />
        <FilterDropdown label="Status" value={filters.status} options={STATUS_OPTIONS} onChange={(v) => update('status', v as PostFilters['status'])} />
        <FilterDropdown label="Date" value={filters.days} options={DATE_OPTIONS} onChange={(v) => update('days', v as PostFilters['days'])} align="right" />
        {hasAnyFilter ? (
          <button type="button" onClick={clearFilters} className="text-[10px] font-semibold text-[#167d35] hover:underline">
            Clear filters
          </button>
        ) : null}
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[1040px]">
          <div className={`${GRID_COLUMNS} ${TABLE_HEADER}`}>
            <span>Post</span>
            <span>Category</span>
            <span>Author</span>
            <span>Status</span>
            <span>Publish / scheduled</span>
            <span className="text-right">Views</span>
            <span className="sr-only">Actions</span>
          </div>

          {listQuery.isLoading
            ? Array.from({ length: 5 }, (_, i) => (
                <div key={i} className={`${GRID_COLUMNS} h-[68px] border-b border-[#e2e8e3]`}>
                  <div className="flex items-center gap-[12px]">
                    <Skeleton className="h-[40px] w-[52px]" />
                    <div className="flex flex-col gap-[6px]">
                      <Skeleton className="h-[10px] w-[180px]" />
                      <Skeleton className="h-[8px] w-[240px]" />
                    </div>
                  </div>
                  {Array.from({ length: 5 }, (_, j) => (
                    <Skeleton key={j} className="h-[10px] w-[60px]" />
                  ))}
                  <span />
                </div>
              ))
            : null}

          {listQuery.isError ? (
            <p className="px-[16px] py-[28px] text-center text-[12px] text-[#b84545]">{getApiErrorMessage(listQuery.error, 'Could not load blog posts.')}</p>
          ) : null}

          {listQuery.isSuccess && rows.length === 0 ? (
            <div className="px-[16px] py-[36px] text-center">
              <p className="text-[12px] font-semibold text-[#17211b]">{hasAnyFilter ? 'No posts match these filters' : 'No posts here yet'}</p>
              {hasAnyFilter || filters.tab !== 'all' ? (
                <button
                  type="button"
                  onClick={() => {
                    onFiltersChange(DEFAULT_POST_FILTERS);
                    onSearchChange('');
                  }}
                  className="mt-1 text-[11px] font-semibold text-[#167d35] hover:underline"
                >
                  Show all posts
                </button>
              ) : null}
            </div>
          ) : null}

          {rows.map((row) => {
            const chip = statusChip(row.status);
            return (
              <div
                key={row.id}
                className={`${GRID_COLUMNS} h-[68px] border-b border-[#e2e8e3] transition-colors hover:bg-[#fafcfa] ${
                  listQuery.isPlaceholderData ? 'opacity-60' : ''
                }`}
              >
                <button type="button" onClick={() => handlers.edit(row)} className="flex min-w-0 items-center gap-[12px] text-left">
                  <Thumbnail row={row} />
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-[11px] font-semibold text-[#17211b] hover:text-[#167d35]" title={row.title}>
                      {row.title}
                    </span>
                    <span className="truncate text-[9px] text-[#7c857f]" title={row.excerpt ?? undefined}>
                      {row.excerpt || 'No excerpt yet'}
                    </span>
                  </span>
                </button>
                <p className="truncate text-[10px] text-[#45514a]">{row.category || '—'}</p>
                <div className="flex min-w-0 items-center gap-[8px]">
                  {row.author ? (
                    <>
                      <PersonAvatar name={row.author.name} tone={authorTone(row.author.id)} size={24} />
                      <p className="truncate text-[10px] font-medium text-[#17211b]">{row.author.name}</p>
                    </>
                  ) : (
                    <p className="text-[10px] text-[#7c857f]">—</p>
                  )}
                </div>
                <div>
                  <Chip tone={chip.tone} label={chip.label} dot />
                </div>
                <TimingCell row={row} />
                <p
                  className="text-right text-[11px] font-semibold text-[#17211b]"
                  title={row.views > 0 ? `${formatCount(row.engaged_reads)} engaged reads` : undefined}
                >
                  {row.status === 'published' || row.views > 0 ? formatCount(row.views) : '—'}
                </p>
                <div className="flex justify-end">
                  <ActionMenu
                    items={rowActions(row, handlers, busy, postUrl(row.slug))}
                    ariaLabel={`Actions for ${row.title}`}
                    className="flex size-[28px] items-center justify-center rounded-[7px] text-[#7c857f] hover:bg-[#eef2ef] hover:text-[#17211b]"
                  >
                    <EllipsisVertical className="size-[15px]" />
                  </ActionMenu>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 px-[16px] py-[12px]">
        <p className="text-[10px] text-[#7c857f]">
          Showing {formatCount(rows.length)} of {formatCount(total)} post{total === 1 ? '' : 's'}
          {awaitingReview > 0 ? ` · ${formatCount(awaitingReview)} draft${awaitingReview === 1 ? '' : 's'} awaiting review` : ''}
        </p>
        <Pager page={page} lastPage={lastPage} onChange={setPage} />
      </div>
    </Card>
  );
}
