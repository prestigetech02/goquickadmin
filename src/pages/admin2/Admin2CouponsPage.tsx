import { useMemo, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { deleteAdminCoupon, fetchCouponOverview, setAdminCouponActive } from '@/api/adminCouponsApi';
import { rangeNoun } from '@/components/admin2/blog/presentation';
import { AudienceMixCard } from '@/components/admin2/coupons/AudienceMixCard';
import { CouponAttentionCard } from '@/components/admin2/coupons/CouponAttentionCard';
import { CouponDetailsDrawer } from '@/components/admin2/coupons/CouponDetailsDrawer';
import { CouponFormDrawer, type CouponFormMode } from '@/components/admin2/coupons/CouponFormDrawer';
import { CouponKpiCards } from '@/components/admin2/coupons/CouponKpiCards';
import { CouponsTableCard } from '@/components/admin2/coupons/CouponsTableCard';
import { DeleteCouponModal } from '@/components/admin2/coupons/DeleteCouponModal';
import { DEFAULT_COUPON_FILTERS, STATUS_LABELS, couponListParams, type CouponFilters } from '@/components/admin2/coupons/presentation';
import { RedemptionTrendCard } from '@/components/admin2/coupons/RedemptionTrendCard';
import type { CouponHandlers } from '@/components/admin2/coupons/rowActions';
import { TopCouponsCard } from '@/components/admin2/coupons/TopCouponsCard';
import { PageHeader, PRIMARY_BUTTON } from '@/components/admin2/shared/PageHeader';
import { NoticeBar, type Notice } from '@/components/admin2/shared/TableControls';
import { useDebounced } from '@/components/admin2/shared/useDebounced';
import { useAdmin2DateRange } from '@/context/Admin2DateRangeContext';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import { queryKeys } from '@/lib/queryKeys';
import type { AdminCoupon } from '@/types/api';

type MutationInput = { coupon: AdminCoupon; action: 'toggle' } | { coupon: AdminCoupon; action: 'delete' };

function toggleMessage(coupon: AdminCoupon): string {
  if (!coupon.is_active) return `${coupon.code} is paused. Requesters can no longer apply it.`;
  if (coupon.status === 'active') return `${coupon.code} is live again.`;
  return `${coupon.code} is switched on, but it is ${STATUS_LABELS[coupon.status].toLowerCase()}, so requesters still can't apply it.`;
}

export function Admin2CouponsPage() {
  const queryClient = useQueryClient();
  const { range } = useAdmin2DateRange();
  const [filters, setFilters] = useState<CouponFilters>(DEFAULT_COUPON_FILTERS);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounced(search, 350);
  const params = useMemo(() => couponListParams(filters, debouncedSearch), [filters, debouncedSearch]);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [detailsId, setDetailsId] = useState<number | null>(null);
  const [formMode, setFormMode] = useState<CouponFormMode | null>(null);
  const [deleting, setDeleting] = useState<AdminCoupon | null>(null);

  const overviewParams = { start_date: range.start, end_date: range.end };
  const overviewQuery = useQuery({
    queryKey: queryKeys.coupons.overview(overviewParams),
    queryFn: () => fetchCouponOverview(overviewParams),
    placeholderData: keepPreviousData,
  });

  const mutation = useMutation({
    mutationFn: async (input: MutationInput): Promise<AdminCoupon | null> => {
      if (input.action === 'delete') {
        await deleteAdminCoupon(input.coupon.id);
        return null;
      }
      return setAdminCouponActive(input.coupon.id, !input.coupon.is_active);
    },
    onSuccess: (result, input) => {
      setDeleting(null);
      if (input.action === 'delete') {
        setDetailsId(null);
        setNotice({ tone: 'ok', text: `${input.coupon.code} is deleted.` });
      } else if (result) {
        setNotice({ tone: 'ok', text: toggleMessage(result) });
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.coupons.all });
    },
    onError: (error) => setNotice({ tone: 'error', text: getApiErrorMessage(error, 'That action failed.') }),
  });

  const copyCode = (coupon: AdminCoupon) => {
    navigator.clipboard
      .writeText(coupon.code)
      .then(() => setNotice({ tone: 'ok', text: `Copied ${coupon.code} to your clipboard.` }))
      .catch(() => setNotice({ tone: 'error', text: `Could not copy automatically. The code is ${coupon.code}.` }));
  };

  const handlers: CouponHandlers = {
    open: (coupon) => setDetailsId(coupon.id),
    edit: (coupon) => {
      setDetailsId(null);
      setFormMode({ kind: 'edit', coupon });
    },
    duplicate: (coupon) => setFormMode({ kind: 'duplicate', coupon }),
    copyCode,
    toggle: (coupon) => mutation.mutate({ coupon, action: 'toggle' }),
    remove: (coupon) => {
      setDetailsId(null);
      setDeleting(coupon);
    },
  };

  const showCoupons = (next: CouponFilters) => {
    setFilters(next);
    setSearch('');
    document.getElementById('coupon-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const onSaved = (coupon: AdminCoupon, mode: CouponFormMode) => {
    setFormMode(null);
    setNotice({
      tone: 'ok',
      text:
        mode.kind === 'edit'
          ? `${coupon.code} is updated.`
          : `${coupon.code} is created${coupon.is_active ? '' : ' and paused until you resume it'}.`,
    });
    void queryClient.invalidateQueries({ queryKey: queryKeys.coupons.all });
  };

  return (
    <div className="flex w-full flex-col gap-[20px]">
      <PageHeader
        eyebrow="Growth · Promotions"
        title="Coupons"
        subtitle="Create discount codes, control who can use them and track what each campaign costs. GoQuick funds every discount, so runners always earn the full errand price."
        actions={
          <button type="button" onClick={() => setFormMode({ kind: 'create' })} className={PRIMARY_BUTTON}>
            <Plus className="size-[15px]" strokeWidth={2} />
            New coupon
          </button>
        }
      />

      <NoticeBar notice={notice} onDismiss={() => setNotice(null)} />
      {overviewQuery.isError ? (
        <p className="rounded-[8px] bg-[#fdeded] px-3 py-2 text-[11px] font-medium text-[#b84545]">
          {getApiErrorMessage(overviewQuery.error, 'Could not load coupon metrics.')}
        </p>
      ) : null}

      <CouponKpiCards overview={overviewQuery.data} rangeNoun={rangeNoun(range.preset)} />

      <div className="flex w-full flex-col gap-[16px] xl:flex-row">
        <RedemptionTrendCard overview={overviewQuery.data} />
        <AudienceMixCard overview={overviewQuery.data} />
      </div>

      <div className="flex w-full flex-col gap-[16px] xl:flex-row">
        <TopCouponsCard
          overview={overviewQuery.data}
          rangeNoun={rangeNoun(range.preset)}
          onOpen={(id) => setDetailsId(id)}
          onViewAll={() => showCoupons({ ...DEFAULT_COUPON_FILTERS, tab: 'active' })}
        />
        <CouponAttentionCard
          overview={overviewQuery.data}
          onShowExpiring={() => showCoupons({ ...DEFAULT_COUPON_FILTERS, tab: 'active', flag: 'expiring' })}
          onShowNearLimit={() => showCoupons({ ...DEFAULT_COUPON_FILTERS, tab: 'active', flag: 'near_limit' })}
          onShowUsedUp={() => showCoupons({ ...DEFAULT_COUPON_FILTERS, tab: 'exhausted' })}
          onCreate={() => setFormMode({ kind: 'create' })}
        />
      </div>

      <CouponsTableCard
        overview={overviewQuery.data}
        filters={filters}
        onFiltersChange={setFilters}
        search={search}
        onSearchChange={setSearch}
        params={params}
        handlers={handlers}
        busy={mutation.isPending}
      />

      {detailsId != null ? (
        <CouponDetailsDrawer
          id={detailsId}
          busy={mutation.isPending}
          onClose={() => setDetailsId(null)}
          onEdit={handlers.edit}
          onToggle={handlers.toggle}
          onCopyCode={copyCode}
          onRemove={handlers.remove}
        />
      ) : null}
      {formMode ? <CouponFormDrawer key={formMode.kind === 'create' ? 'create' : `${formMode.kind}-${formMode.coupon.id}`} mode={formMode} onClose={() => setFormMode(null)} onSaved={onSaved} /> : null}
      <DeleteCouponModal
        coupon={deleting}
        busy={mutation.isPending}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && mutation.mutate({ coupon: deleting, action: 'delete' })}
        onPause={() => deleting && mutation.mutate({ coupon: deleting, action: 'toggle' })}
      />
    </div>
  );
}
