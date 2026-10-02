import { useState, type ReactNode } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ClipboardCopy } from 'lucide-react';
import { fetchAdminCoupon, fetchAdminCouponRedemptions } from '@/api/adminCouponsApi';
import { Drawer } from '@/components/ui/Drawer';
import { useAuth } from '@/context/AuthContext';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import { canAccessPage, getAdmin2ErrandHref, getAdmin2UserHref } from '@/lib/adminNavigation';
import { queryKeys } from '@/lib/queryKeys';
import type { AdminCoupon, CouponRedemptionStatus } from '@/types/api';
import { Chip } from '../errand/parts';
import { formatCount, formatNaira } from '../format';
import { Skeleton } from '../overview/primitives';
import { Pager } from '../shared/Pager';
import { CodeBadge } from './CouponsTableCard';
import {
  AUDIENCE_LABELS,
  REDEMPTION_LABELS,
  REDEMPTION_TONES,
  categoriesLabel,
  dateTimeLabel,
  discountCap,
  discountHeadline,
  statusChip,
  usageBarColor,
  usageShare,
} from './presentation';

const REDEMPTIONS_PER_PAGE = 8;

const REDEMPTION_FILTERS: Array<{ value: '' | CouponRedemptionStatus; label: string }> = [
  { value: '', label: 'All' },
  { value: 'consumed', label: 'Redeemed' },
  { value: 'reserved', label: 'On hold' },
  { value: 'released', label: 'Released' },
];

function Section({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="flex flex-col gap-[8px]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[9px] font-semibold uppercase tracking-[0.27px] text-[#7c857f]">{title}</p>
        {action}
      </div>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-[#e2e8e3] py-[8px] text-[12px] last:border-b-0">
      <span className="flex-shrink-0 text-[#7c857f]">{label}</span>
      <span className="min-w-0 break-words text-right font-semibold text-[#17211b]">{value}</span>
    </div>
  );
}

function RedemptionHistory({ coupon }: { coupon: AdminCoupon }) {
  const { user: admin } = useAuth();
  const [status, setStatus] = useState<'' | CouponRedemptionStatus>('');
  const [pageState, setPageState] = useState({ key: '', page: 1 });
  const page = pageState.key === status ? pageState.page : 1;
  const params = { page, per_page: REDEMPTIONS_PER_PAGE, ...(status ? { status } : {}) };
  const query = useQuery({
    queryKey: queryKeys.coupons.redemptions(coupon.id, params),
    queryFn: () => fetchAdminCouponRedemptions(coupon.id, params),
    placeholderData: keepPreviousData,
  });
  const rows = query.data?.redemptions ?? [];
  const canOpenErrands = canAccessPage(admin, 'admin2-errand');
  const canOpenUsers = canAccessPage(admin, 'admin2-user');

  return (
    <Section
      title="Redemption history"
      action={
        <div className="flex gap-[3px]">
          {REDEMPTION_FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => setStatus(filter.value)}
              className={`rounded-full px-[8px] py-[3px] text-[10px] font-semibold ${
                status === filter.value ? 'bg-[#eaf6ed] text-[#0d5e27]' : 'text-[#7c857f] hover:text-[#17211b]'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      }
    >
      {query.isLoading ? (
        <div className="flex flex-col gap-[6px]">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-[44px] w-full" />
          ))}
        </div>
      ) : query.isError ? (
        <p className="text-[11px] text-[#b84545]">{getApiErrorMessage(query.error, 'Could not load redemptions.')}</p>
      ) : rows.length === 0 ? (
        <p className="rounded-[8px] bg-[#f8faf8] px-[10px] py-[10px] text-[11px] text-[#7c857f]">
          {status ? 'Nothing with this status yet.' : 'No requester has used this code yet.'}
        </p>
      ) : (
        <div className={`flex flex-col ${query.isPlaceholderData ? 'opacity-60' : ''}`}>
          {rows.map((row) => {
            const at = row.consumed_at ?? row.released_at ?? row.reserved_at;
            return (
              <div key={row.id} className="flex items-center gap-[10px] border-b border-[#e2e8e3] py-[8px] last:border-b-0">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-semibold text-[#17211b]">
                    {row.user && canOpenUsers ? (
                      <Link to={getAdmin2UserHref(row.user.id)} className="hover:text-[#167d35] hover:underline">
                        {row.user.name}
                      </Link>
                    ) : (
                      (row.user?.name ?? 'Deleted requester')
                    )}
                  </p>
                  <p className="truncate text-[9px] text-[#7c857f]">
                    {row.errand ? (
                      canOpenErrands ? (
                        <Link to={getAdmin2ErrandHref(row.errand.id)} className="font-medium text-[#167d35] hover:underline">
                          {row.errand.code}
                        </Link>
                      ) : (
                        row.errand.code
                      )
                    ) : (
                      'Errand removed'
                    )}
                    {at ? ` · ${dateTimeLabel(at)}` : ''}
                  </p>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[11px] font-semibold text-[#17211b]">−{formatNaira(row.discount_amount)}</span>
                  <span className="text-[9px] text-[#7c857f]">
                    {formatNaira(row.listed_amount)} → {formatNaira(row.payable_amount)}
                  </span>
                </div>
                <Chip tone={REDEMPTION_TONES[row.status]} label={REDEMPTION_LABELS[row.status]} />
              </div>
            );
          })}
        </div>
      )}
      {query.data && query.data.pagination.last_page > 1 ? (
        <div className="flex justify-end pt-[4px]">
          <Pager page={page} lastPage={query.data.pagination.last_page} onChange={(next) => setPageState({ key: status, page: next })} />
        </div>
      ) : null}
    </Section>
  );
}

export function CouponDetailsDrawer({
  id,
  busy,
  onClose,
  onEdit,
  onToggle,
  onCopyCode,
  onRemove,
}: {
  id: number;
  busy: boolean;
  onClose: () => void;
  onEdit: (coupon: AdminCoupon) => void;
  onToggle: (coupon: AdminCoupon) => void;
  onCopyCode: (coupon: AdminCoupon) => void;
  onRemove: (coupon: AdminCoupon) => void;
}) {
  const query = useQuery({ queryKey: queryKeys.coupons.detail(id), queryFn: () => fetchAdminCoupon(id) });
  const coupon = query.data;
  const chip = coupon ? statusChip(coupon.status) : null;
  const share = coupon ? usageShare(coupon.usage.used, coupon.max_redemptions) : null;

  const footer = coupon ? (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <button type="button" onClick={() => onRemove(coupon)} disabled={busy} className="text-[12px] font-semibold text-[#b84545] hover:underline disabled:opacity-60">
        Delete coupon
      </button>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onToggle(coupon)}
          disabled={busy}
          className="h-[36px] rounded-[8px] border border-[#d4ddd6] bg-white px-[14px] text-[12px] font-semibold text-[#17211b] hover:bg-[#f8faf8] disabled:opacity-60"
        >
          {coupon.is_active ? 'Pause coupon' : 'Resume coupon'}
        </button>
        <button
          type="button"
          onClick={() => onEdit(coupon)}
          className="h-[36px] rounded-[8px] bg-[#167d35] px-[14px] text-[12px] font-semibold text-white hover:bg-[#0d5e27]"
        >
          Edit coupon
        </button>
      </div>
    </div>
  ) : undefined;

  return (
    <Drawer open onClose={onClose} title={coupon?.name ?? 'Coupon'} subtitle={coupon ? `Created ${dateTimeLabel(coupon.created_at)}` : undefined} width="lg" footer={footer}>
      {query.isLoading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-[90px] w-full" />
          <Skeleton className="h-[70px] w-full" />
          <Skeleton className="h-[180px] w-full" />
        </div>
      ) : null}
      {query.isError ? (
        <p className="rounded-[8px] bg-[#fdeded] px-3 py-2 text-[12px] font-medium text-[#b84545]">{getApiErrorMessage(query.error, 'Could not load this coupon.')}</p>
      ) : null}

      {coupon && chip ? (
        <div className="flex flex-col gap-[18px] font-inter">
          <div className="flex flex-col gap-[12px] rounded-[12px] bg-[linear-gradient(135deg,#f3faf5,#ffffff)] p-[16px] ring-1 ring-[#dcebe0]">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-[8px]">
                <CodeBadge code={coupon.code} />
                <button
                  type="button"
                  onClick={() => onCopyCode(coupon)}
                  className="flex items-center gap-[4px] text-[10px] font-semibold text-[#167d35] hover:underline"
                >
                  <ClipboardCopy className="size-[12px]" strokeWidth={1.8} />
                  Copy
                </button>
              </div>
              <Chip tone={chip.tone} label={chip.label} dot />
            </div>
            <div>
              <p className="text-[26px] font-bold leading-none tracking-[-0.5px] text-[#17211b]">{discountHeadline(coupon)}</p>
              <p className="mt-[6px] text-[11px] text-[#45514a]">
                {[discountCap(coupon), coupon.min_order_amount != null ? `on errands from ${formatNaira(coupon.min_order_amount)}` : 'on any errand amount']
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>
            {coupon.description ? <p className="text-[11px] leading-relaxed text-[#7c857f]">{coupon.description}</p> : null}
          </div>

          <Section title="Performance">
            <div className="grid grid-cols-4 gap-[8px]">
              {[
                { label: 'Redeemed', value: formatCount(coupon.usage.consumed) },
                { label: 'On hold', value: formatCount(coupon.usage.reserved) },
                { label: 'Released', value: formatCount(coupon.usage.released) },
                { label: 'Funded', value: formatNaira(coupon.subsidy_absorbed) },
              ].map((item) => (
                <div key={item.label} className="rounded-[8px] bg-[#f8faf8] px-[10px] py-[8px]">
                  <p className="text-[9px] text-[#7c857f]">{item.label}</p>
                  <p className="truncate text-[13px] font-semibold text-[#17211b]">{item.value}</p>
                </div>
              ))}
            </div>
            {share != null && coupon.max_redemptions != null ? (
              <div className="flex flex-col gap-[5px]">
                <span className="h-[6px] w-full overflow-hidden rounded-full bg-[#f1f4f2]">
                  <span className="block h-full rounded-full" style={{ width: `${share}%`, backgroundColor: usageBarColor(share) }} />
                </span>
                <p className="text-[10px] text-[#7c857f]">
                  {formatCount(coupon.usage.used)} of {formatCount(coupon.max_redemptions)} uses taken · {formatCount(coupon.usage.remaining ?? 0)} left. Codes on hold
                  count until their errand is paid for or cancelled.
                </p>
              </div>
            ) : (
              <p className="text-[10px] text-[#7c857f]">No overall usage limit. Each requester can use it {coupon.max_redemptions_per_user}×.</p>
            )}
          </Section>

          <Section title="Rules">
            <div className="rounded-[10px] border border-[#e2e8e3] px-[12px] py-[2px]">
              <Row label="Audience" value={AUDIENCE_LABELS[coupon.audience]} />
              <Row label="Errand types" value={categoriesLabel(coupon.categories)} />
              <Row label="Minimum errand amount" value={coupon.min_order_amount != null ? formatNaira(coupon.min_order_amount) : 'None'} />
              {coupon.discount_type === 'percent' ? (
                <Row label="Maximum discount" value={coupon.max_discount_amount != null ? formatNaira(coupon.max_discount_amount) : 'No cap'} />
              ) : null}
              <Row label="Uses per requester" value={formatCount(coupon.max_redemptions_per_user)} />
              <Row label="Total uses" value={coupon.max_redemptions != null ? formatCount(coupon.max_redemptions) : 'Unlimited'} />
              <Row label="Starts" value={coupon.starts_at ? dateTimeLabel(coupon.starts_at) : 'As soon as it is active'} />
              <Row label="Ends" value={coupon.expires_at ? dateTimeLabel(coupon.expires_at) : 'No end date'} />
            </div>
            {coupon.audience === 'specific_users' ? (
              <div className="flex flex-wrap gap-[6px]">
                {coupon.assigned_users.map((user) => (
                  <span key={user.id} className="rounded-full bg-[#f3f0fa] px-[9px] py-[4px] text-[10px] font-semibold text-[#735ca8]" title={user.email ?? user.phone ?? undefined}>
                    {user.name}
                  </span>
                ))}
              </div>
            ) : null}
          </Section>

          <RedemptionHistory coupon={coupon} />
        </div>
      ) : null}
    </Drawer>
  );
}
