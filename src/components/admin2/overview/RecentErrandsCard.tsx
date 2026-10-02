import { useEffect, useRef, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronLeft, ChevronRight, ListFilter } from 'lucide-react';
import { fetchAdminErrands } from '@/api/adminErrandsApi';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import { getAdmin2ErrandHref, getPagePath } from '@/lib/adminNavigation';
import { queryKeys } from '@/lib/queryKeys';
import { formatErrandCode, titleCase } from '@/lib/utils';
import type { ErrandListItem, ListQueryParams } from '@/types/api';
import { formatNaira, partyName, personInitials, relativeAgo } from '../format';
import { Card, CardTitle, Skeleton } from './primitives';

const PAGE_SIZE = 5;

const FILTERS: Array<{ key: string; label: string; params: ListQueryParams; noun: string }> = [
  { key: 'all', label: 'All errands', params: {}, noun: 'errands' },
  { key: 'active', label: 'Active only', params: { scope: 'active' }, noun: 'active errands' },
  { key: 'in_progress', label: 'In progress', params: { status: 'in_progress' }, noun: 'in-progress errands' },
  { key: 'completed', label: 'Completed', params: { status: 'completed' }, noun: 'completed errands' },
  { key: 'disputed', label: 'Disputed', params: { status: 'disputed' }, noun: 'disputed errands' },
  { key: 'cancelled', label: 'Cancelled', params: { status: 'cancelled' }, noun: 'cancelled errands' },
];

const TYPE_LABELS: Record<string, string> = {
  pickup_drop: 'Pickup / drop',
};

type StatusStyle = { label: string; color: string; bg: string };

function statusStyle(status: string): StatusStyle {
  switch (status) {
    case 'on_my_way':
    case 'arrived':
    case 'in_progress':
    case 'delayed':
      return { label: 'In progress', color: '#3973a8', bg: '#eef5fb' };
    case 'completed':
      return { label: 'Completed', color: '#167d35', bg: '#eaf6ed' };
    case 'accepted':
      return { label: 'Matched', color: '#735ca8', bg: '#f3f0fa' };
    case 'waiting_for_buyer':
    case 'delivered':
      return { label: 'Confirming', color: '#735ca8', bg: '#f3f0fa' };
    case 'pending':
    case 'searching':
    case 'draft':
      return { label: 'Pending', color: '#b06d12', bg: '#fff5e5' };
    case 'disputed':
      return { label: 'Disputed', color: '#b84545', bg: '#fff0f0' };
    default:
      return {
        label: status.startsWith('cancelled') ? 'Cancelled' : titleCase(status),
        color: '#7c857f',
        bg: '#f1f3f1',
      };
  }
}

function errandAmount(errand: ErrandListItem): number | null {
  const amount = errand.escrow_payment?.amount ?? errand.base_price ?? errand.budget_max ?? errand.budget_min;
  return amount != null && Number.isFinite(Number(amount)) ? Number(amount) : null;
}

function Person({ name, tone }: { name: string | null; tone: 'green' | 'blue' }) {
  const colors = tone === 'green' ? 'bg-[#eaf6ed] text-[#167d35]' : 'bg-[#eef5fb] text-[#3973a8]';
  return (
    <span className="flex min-w-0 items-center gap-[7px]">
      <span className={`flex size-[25px] flex-shrink-0 items-center justify-center rounded-full text-[8px] font-bold ${colors}`}>
        {name ? personInitials(name) : '—'}
      </span>
      <span className="truncate text-[11px] font-medium text-[#17211b]">{name ?? '—'}</span>
    </span>
  );
}

const COLUMNS = 'grid grid-cols-[72px_126px_126px_94px_80px_92px_minmax(70px,1fr)_13px] items-center gap-x-[8px] px-[12px]';

export function RecentErrandsCard() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [filterKey, setFilterKey] = useState('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const filter = FILTERS.find((item) => item.key === filterKey) ?? FILTERS[0];

  useEffect(() => {
    if (!filterOpen) return;
    function onDocClick(event: MouseEvent) {
      if (!filterRef.current?.contains(event.target as Node)) setFilterOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [filterOpen]);

  const params: ListQueryParams = { per_page: PAGE_SIZE, page, ...filter.params };
  const errandsQuery = useQuery({
    queryKey: queryKeys.errands.list({ ...params, view: 'admin2-recent' }),
    queryFn: () => fetchAdminErrands(params),
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  });

  const rows = errandsQuery.data?.data ?? [];
  const total = errandsQuery.data?.total ?? 0;
  const lastPage = errandsQuery.data?.last_page ?? 1;
  const pageNumbers = [page - 1, page, page + 1].filter((n) => n >= 1 && n <= lastPage);

  return (
    <Card className="flex min-w-0 flex-1 flex-col gap-[14px] p-[16px] xl:min-h-[408px]">
      <div className="flex items-start justify-between gap-3">
        <CardTitle title="Recent errands" subtitle="Latest marketplace activity, newest first" />
        <div className="flex flex-shrink-0 items-center gap-[12px]">
          <div ref={filterRef} className="relative">
            <button
              type="button"
              onClick={() => setFilterOpen((value) => !value)}
              aria-expanded={filterOpen}
              className={`flex items-center gap-[6px] rounded-[8px] border px-[10px] py-[6px] text-[11px] font-medium ${
                filterKey === 'all'
                  ? 'border-[#e2e8e3] bg-white text-[#45514a] hover:bg-[#f8faf8]'
                  : 'border-[#167d35]/30 bg-[#eaf6ed] text-[#0d5e27]'
              }`}
            >
              <ListFilter className="size-[13px]" strokeWidth={1.8} />
              {filterKey === 'all' ? 'Filter' : filter.label}
            </button>
            {filterOpen ? (
              <div className="absolute right-0 top-full z-20 mt-1 w-[170px] overflow-hidden rounded-[10px] border border-[#e2e8e3] bg-white py-1 shadow-[0px_8px_24px_0px_rgba(16,33,23,0.12)]">
                {FILTERS.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => {
                      setFilterKey(option.key);
                      setPage(1);
                      setFilterOpen(false);
                    }}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-[12px] text-[#17211b] hover:bg-[#f8faf8]"
                  >
                    {option.label}
                    {option.key === filterKey ? <Check className="size-[13px] text-[#167d35]" strokeWidth={2} /> : null}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => navigate(`${getPagePath('admin2-errands')}${filter.params.scope === 'active' ? '?tab=live' : ''}`)}
            className="hidden text-[11px] font-semibold text-[#167d35] hover:underline sm:block"
          >
            View all errands →
          </button>
        </div>
      </div>

      <div className="-mx-[4px] overflow-x-auto px-[4px]">
        <div className="min-w-[760px]">
          <div className={`${COLUMNS} h-[34px] rounded-[8px] bg-[#f8faf8] text-[10px] font-semibold tracking-[0.4px] text-[#7c857f]`}>
            <span>ERRAND ID</span>
            <span>REQUESTER</span>
            <span>RUNNER</span>
            <span>TYPE</span>
            <span>AMOUNT</span>
            <span>STATUS</span>
            <span>TIME</span>
            <span />
          </div>

          {errandsQuery.isLoading ? (
            Array.from({ length: PAGE_SIZE }).map((_, i) => (
              <div key={i} className={`${COLUMNS} h-[48px] border-b border-[#e2e8e3]`}>
                <Skeleton className="col-span-7 h-[14px]" />
              </div>
            ))
          ) : errandsQuery.isError ? (
            <p className="py-10 text-center text-[12px] text-[#b84545]">
              {getApiErrorMessage(errandsQuery.error, 'Could not load errands.')}
            </p>
          ) : rows.length === 0 ? (
            <p className="py-10 text-center text-[12px] text-[#7c857f]">No {filter.noun} yet.</p>
          ) : (
            rows.map((errand) => {
              const status = statusStyle(errand.status);
              const amount = errandAmount(errand);
              return (
                <button
                  key={errand.id}
                  type="button"
                  onClick={() => navigate(getAdmin2ErrandHref(errand.id))}
                  className={`${COLUMNS} h-[48px] w-full border-b border-[#e2e8e3] text-left transition-colors hover:bg-[#fbfcfb]`}
                >
                  <span className="truncate text-[11px] font-semibold text-[#17211b]">
                    {formatErrandCode(errand.id, errand.created_at, errand.code)}
                  </span>
                  <Person name={partyName(errand.buyer)} tone="green" />
                  <Person name={partyName(errand.runner)} tone="blue" />
                  <span className="truncate text-[11px] text-[#45514a]">
                    {errand.category ? TYPE_LABELS[errand.category] ?? titleCase(errand.category) : '—'}
                  </span>
                  <span className="truncate text-[11px] font-semibold text-[#17211b]">
                    {amount != null ? formatNaira(amount) : '—'}
                  </span>
                  <span>
                    <span
                      className="inline-flex items-center gap-[5px] rounded-full px-[7px] py-[4px] text-[9px] font-semibold leading-none"
                      style={{ color: status.color, backgroundColor: status.bg }}
                    >
                      <span className="size-[5px] rounded-full" style={{ backgroundColor: status.color }} />
                      {status.label}
                    </span>
                  </span>
                  <span className="truncate text-[10px] text-[#7c857f]">{relativeAgo(errand.created_at)}</span>
                  <ChevronRight className="size-[13px] text-[#7c857f]" strokeWidth={1.8} />
                </button>
              );
            })
          )}
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between gap-3">
        <p className="text-[10px] text-[#7c857f]">
          {total > 0 ? `Showing ${rows.length} of ${total.toLocaleString('en-NG')} ${filter.noun}` : '\u00a0'}
        </p>
        {lastPage > 1 ? (
          <div className="flex items-center gap-[4px]">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              aria-label="Previous page"
              className="flex size-[26px] items-center justify-center rounded-[6px] border border-[#e2e8e3] bg-white text-[#45514a] disabled:opacity-40"
            >
              <ChevronLeft className="size-[13px]" strokeWidth={1.8} />
            </button>
            {pageNumbers.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setPage(n)}
                aria-current={n === page ? 'page' : undefined}
                className={`flex size-[26px] items-center justify-center rounded-[6px] text-[10px] font-semibold ${
                  n === page ? 'bg-[#167d35] text-white' : 'border border-[#e2e8e3] bg-white text-[#45514a] hover:bg-[#f8faf8]'
                }`}
              >
                {n}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
              disabled={page >= lastPage}
              aria-label="Next page"
              className="flex size-[26px] items-center justify-center rounded-[6px] border border-[#e2e8e3] bg-white text-[#45514a] disabled:opacity-40"
            >
              <ChevronRight className="size-[13px]" strokeWidth={1.8} />
            </button>
          </div>
        ) : null}
      </div>
    </Card>
  );
}
