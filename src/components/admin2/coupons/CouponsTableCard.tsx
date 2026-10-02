import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { EllipsisVertical, X } from 'lucide-react';
import { fetchAdminCoupons } from '@/api/adminCouponsApi';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import { queryKeys } from '@/lib/queryKeys';
import type { AdminCoupon, AdminCouponListParams, CouponOverview } from '@/types/api';
import { Chip } from '../errand/parts';
import { formatCount, formatNaira } from '../format';
import { Card, Skeleton } from '../overview/primitives';
import { pageForKey } from '../shared/helpers';
import { Pager } from '../shared/Pager';
import { CardTabs, SearchField, TABLE_HEADER } from '../shared/TableControls';
import { ActionMenu } from '../users/ActionMenu';
import { FilterDropdown } from '../users/FilterDropdown';
import {
  AUDIENCE_OPTIONS,
  DEFAULT_COUPON_FILTERS,
  FLAG_LABELS,
  TABS,
  TYPE_OPTIONS,
  audienceLabel,
  categoriesLabel,
  daysLeftUrgent,
  discountCap,
  discountHeadline,
  statusChip,
  usageBarColor,
  usageShare,
  validityLabel,
  type CouponFilters,
} from './presentation';
import { couponActions, type CouponHandlers } from './rowActions';

const PER_PAGE = 10;

const GRID_COLUMNS =
  'grid grid-cols-[minmax(220px,2fr)_minmax(120px,1fr)_minmax(130px,1fr)_minmax(150px,1.2fr)_96px_minmax(120px,1fr)_84px_36px] items-center gap-x-[12px] px-[16px]';

export function CodeBadge({ code }: { code: string }) {
  return (
    <span className="inline-flex w-fit max-w-full truncate rounded-[5px] border border-dashed border-[#b9d9c2] bg-[#f3faf5] px-[6px] py-[2px] font-mono text-[10px] font-bold tracking-[0.4px] text-[#0d5e27]">
      {code}
    </span>
  );
}

function UsageCell({ coupon }: { coupon: AdminCoupon }) {
  const { used, reserved } = coupon.usage;
  const share = usageShare(used, coupon.max_redemptions);
  return (
    <div className="flex min-w-0 flex-col gap-[5px]">
      <p className="truncate text-[10px] font-medium text-[#17211b]">
        {coupon.max_redemptions != null ? `${formatCount(used)} / ${formatCount(coupon.max_redemptions)} used` : `${formatCount(used)} used`}
      </p>
      {share != null ? (
        <span className="h-[5px] w-full overflow-hidden rounded-full bg-[#f1f4f2]">
          <span className="block h-full rounded-full" style={{ width: `${Math.max(share, used > 0 ? 3 : 0)}%`, backgroundColor: usageBarColor(share) }} />
        </span>
      ) : null}
      <p className="truncate text-[9px] text-[#7c857f]">
        {[share == null ? 'No usage limit' : null, reserved > 0 ? `${formatCount(reserved)} on hold` : null, `${coupon.max_redemptions_per_user} per requester`]
          .filter(Boolean)
          .join(' · ')}
      </p>
    </div>
  );
}

export function CouponsTableCard({
  overview,
  filters,
  onFiltersChange,
  search,
  onSearchChange,
  params,
  handlers,
  busy,
}: {
  overview?: CouponOverview;
  filters: CouponFilters;
  onFiltersChange: (filters: CouponFilters) => void;
  search: string;
  onSearchChange: (value: string) => void;
  params: AdminCouponListParams;
  handlers: CouponHandlers;
  busy: boolean;
}) {
  const paramsKey = JSON.stringify(params);
  const [pageState, setPageState] = useState({ key: paramsKey, page: 1 });
  const page = pageForKey(pageState, paramsKey);
  const setPage = (next: number) => setPageState({ key: paramsKey, page: next });

  const listParams = { ...params, page, per_page: PER_PAGE };
  const listQuery = useQuery({
    queryKey: queryKeys.coupons.list(listParams),
    queryFn: () => fetchAdminCoupons(listParams),
    placeholderData: keepPreviousData,
  });

  const rows = listQuery.data?.coupons ?? [];
  const total = listQuery.data?.pagination.total ?? 0;
  const lastPage = listQuery.data?.pagination.last_page ?? 1;
  const hasAnyFilter = filters.audience !== '' || filters.type !== '' || filters.flag !== '' || search.trim() !== '';
  const tabs = TABS.map((tab) => ({ ...tab, count: overview?.tab_counts[tab.value] ?? null }));

  const update = <K extends keyof CouponFilters>(key: K, value: CouponFilters[K]) => onFiltersChange({ ...filters, [key]: value });
  const resetAll = () => {
    onFiltersChange(DEFAULT_COUPON_FILTERS);
    onSearchChange('');
  };

  return (
    <Card id="coupon-list" className="w-full scroll-mt-[80px] overflow-hidden">
      <div className="flex flex-col gap-[4px] px-[16px] pb-[4px] pt-[16px]">
        <p className="text-[14px] font-semibold text-[#17211b]">Coupon codes</p>
        <p className="text-[11px] text-[#7c857f]">Every code requesters can apply at checkout, with its rules, usage and cost</p>
      </div>

      <CardTabs tabs={tabs} value={filters.tab} onChange={(tab) => onFiltersChange({ ...filters, tab, flag: '' })} />

      <div className="flex flex-wrap items-center gap-[10px] border-b border-[#e2e8e3] px-[16px] py-[12px]">
        <SearchField value={search} onChange={onSearchChange} placeholder="Search code or coupon name…" />
        <FilterDropdown label="Audience" value={filters.audience} options={AUDIENCE_OPTIONS} onChange={(v) => update('audience', v as CouponFilters['audience'])} />
        <FilterDropdown label="Type" value={filters.type} options={TYPE_OPTIONS} onChange={(v) => update('type', v as CouponFilters['type'])} align="right" />
        {filters.flag ? (
          <span className="flex h-[30px] items-center gap-[6px] rounded-full bg-[#fff5e5] pl-[10px] pr-[6px] text-[10px] font-semibold text-[#b06d12]">
            {FLAG_LABELS[filters.flag]}
            <button type="button" onClick={() => update('flag', '')} aria-label="Remove this filter" className="rounded-full p-[2px] hover:bg-[#fbe6c4]">
              <X className="size-[12px]" />
            </button>
          </span>
        ) : null}
        {hasAnyFilter ? (
          <button
            type="button"
            onClick={() => {
              onFiltersChange({ ...DEFAULT_COUPON_FILTERS, tab: filters.tab });
              onSearchChange('');
            }}
            className="text-[10px] font-semibold text-[#167d35] hover:underline"
          >
            Clear filters
          </button>
        ) : null}
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[1080px]">
          <div className={`${GRID_COLUMNS} ${TABLE_HEADER}`}>
            <span>Coupon</span>
            <span>Discount</span>
            <span>Audience</span>
            <span>Usage</span>
            <span className="text-right">Funded</span>
            <span>Validity</span>
            <span>Status</span>
            <span className="sr-only">Actions</span>
          </div>

          {listQuery.isLoading
            ? Array.from({ length: 5 }, (_, i) => (
                <div key={i} className={`${GRID_COLUMNS} h-[68px] border-b border-[#e2e8e3]`}>
                  <div className="flex flex-col gap-[6px]">
                    <Skeleton className="h-[16px] w-[90px]" />
                    <Skeleton className="h-[8px] w-[160px]" />
                  </div>
                  {Array.from({ length: 6 }, (_, j) => (
                    <Skeleton key={j} className="h-[10px] w-[64px]" />
                  ))}
                  <span />
                </div>
              ))
            : null}

          {listQuery.isError ? (
            <p className="px-[16px] py-[28px] text-center text-[12px] text-[#b84545]">{getApiErrorMessage(listQuery.error, 'Could not load coupons.')}</p>
          ) : null}

          {listQuery.isSuccess && rows.length === 0 ? (
            <div className="px-[16px] py-[36px] text-center">
              <p className="text-[12px] font-semibold text-[#17211b]">{hasAnyFilter ? 'No coupons match these filters' : 'No coupons here yet'}</p>
              {hasAnyFilter || filters.tab !== 'all' ? (
                <button type="button" onClick={resetAll} className="mt-1 text-[11px] font-semibold text-[#167d35] hover:underline">
                  Show all coupons
                </button>
              ) : null}
            </div>
          ) : null}

          {rows.map((coupon) => {
            const chip = statusChip(coupon.status);
            const validity = validityLabel(coupon);
            const cap = discountCap(coupon);
            const urgent = coupon.status === 'active' && daysLeftUrgent(coupon.expires_at);
            return (
              <div
                key={coupon.id}
                className={`${GRID_COLUMNS} h-[68px] border-b border-[#e2e8e3] transition-colors hover:bg-[#fafcfa] ${
                  listQuery.isPlaceholderData ? 'opacity-60' : ''
                }`}
              >
                <button type="button" onClick={() => handlers.open(coupon)} className="flex min-w-0 flex-col items-start gap-[5px] text-left">
                  <CodeBadge code={coupon.code} />
                  <span className="w-full truncate text-[11px] font-semibold text-[#17211b] hover:text-[#167d35]" title={coupon.description ?? coupon.name}>
                    {coupon.name}
                  </span>
                </button>
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-semibold text-[#17211b]">{discountHeadline(coupon)}</p>
                  <p className="truncate text-[9px] text-[#7c857f]">
                    {[cap, coupon.min_order_amount != null ? `Min ${formatNaira(coupon.min_order_amount)}` : null].filter(Boolean).join(' · ') || 'Any errand amount'}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[10px] font-medium text-[#17211b]" title={coupon.assigned_users.map((user) => user.name).join(', ') || undefined}>
                    {audienceLabel(coupon)}
                  </p>
                  <p className="truncate text-[9px] text-[#7c857f]" title={categoriesLabel(coupon.categories)}>
                    {categoriesLabel(coupon.categories)}
                  </p>
                </div>
                <UsageCell coupon={coupon} />
                <p className="truncate text-right text-[11px] font-semibold text-[#17211b]">
                  {coupon.subsidy_absorbed > 0 ? formatNaira(coupon.subsidy_absorbed) : '—'}
                </p>
                <div className="min-w-0">
                  <p className="truncate text-[10px] font-medium text-[#17211b]">{validity.main}</p>
                  <p className={`truncate text-[9px] ${urgent ? 'font-semibold text-[#b06d12]' : 'text-[#7c857f]'}`}>{validity.sub}</p>
                </div>
                <div>
                  <Chip tone={chip.tone} label={chip.label} dot />
                </div>
                <div className="flex justify-end">
                  <ActionMenu
                    items={couponActions(coupon, handlers, busy)}
                    ariaLabel={`Actions for ${coupon.code}`}
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
          Showing {formatCount(rows.length)} of {formatCount(total)} coupon{total === 1 ? '' : 's'}
        </p>
        <Pager page={page} lastPage={lastPage} onChange={setPage} />
      </div>
    </Card>
  );
}
