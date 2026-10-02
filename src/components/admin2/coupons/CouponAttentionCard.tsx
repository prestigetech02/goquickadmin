import type { ComponentType } from 'react';
import { CalendarClock, ChevronRight, Gauge, Plus, TicketX, type LucideProps } from 'lucide-react';
import type { CouponOverview } from '@/types/api';
import { formatCount } from '../format';
import { Card, CardTitle, Skeleton } from '../overview/primitives';
import { OUTLINE_BUTTON } from '../shared/PageHeader';
import { dateTimeLabel } from './presentation';

function AttentionRow({
  icon: Icon,
  tint,
  color,
  title,
  detail,
  count,
  onClick,
}: {
  icon: ComponentType<LucideProps>;
  tint: string;
  color: string;
  title: string;
  detail: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={count === 0}
      className="group flex w-full items-center gap-[10px] rounded-[9px] px-[11px] py-[9px] text-left transition-[filter] hover:brightness-[0.98] disabled:cursor-default disabled:hover:brightness-100"
      style={{ backgroundColor: count > 0 ? tint : '#f8faf8' }}
    >
      <Icon className="size-[16px] flex-shrink-0" strokeWidth={1.8} color={count > 0 ? color : '#a3aca6'} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[11px] font-semibold text-[#17211b]">{title}</span>
        <span className="truncate text-[9px] text-[#7c857f]">{detail}</span>
      </span>
      <span className="text-[12px] font-bold" style={{ color: count > 0 ? color : '#a3aca6' }}>
        {formatCount(count)}
      </span>
      {count > 0 ? <ChevronRight className="size-[14px] flex-shrink-0 text-[#7c857f] opacity-0 transition-opacity group-hover:opacity-100" /> : null}
    </button>
  );
}

export function CouponAttentionCard({
  overview,
  onShowExpiring,
  onShowNearLimit,
  onShowUsedUp,
  onCreate,
}: {
  overview?: CouponOverview;
  onShowExpiring: () => void;
  onShowNearLimit: () => void;
  onShowUsedUp: () => void;
  onCreate: () => void;
}) {
  const attention = overview?.attention;
  const open = attention ? attention.expiring.count + attention.near_limit.count + attention.exhausted.count : 0;

  return (
    <Card className="flex w-full flex-col gap-[12px] p-[18px] xl:w-[360px] xl:flex-shrink-0">
      <div className="flex items-start justify-between gap-3">
        <CardTitle title="Needs attention" subtitle="Coupons that may need a decision" />
        {attention ? (
          <span
            className={`flex-shrink-0 rounded-full px-[8px] py-[3px] text-[10px] font-semibold ${
              open > 0 ? 'bg-[#fff5e5] text-[#b06d12]' : 'bg-[#eaf6ed] text-[#167d35]'
            }`}
          >
            {open > 0 ? `${formatCount(open)} open` : 'All clear'}
          </span>
        ) : null}
      </div>

      {attention ? (
        <div className="flex flex-col gap-[8px]">
          <AttentionRow
            icon={CalendarClock}
            tint="#fff8ec"
            color="#b06d12"
            title="Ending within 7 days"
            detail={
              attention.expiring.next_code && attention.expiring.next_at
                ? `${attention.expiring.next_code} ends ${dateTimeLabel(attention.expiring.next_at)}`
                : 'No live coupon ends this week'
            }
            count={attention.expiring.count}
            onClick={onShowExpiring}
          />
          <AttentionRow
            icon={Gauge}
            tint="#fdf3ea"
            color="#d9822b"
            title="Close to usage limit"
            detail={attention.near_limit.count > 0 ? '80% or more of their uses are taken' : 'Every capped coupon has room left'}
            count={attention.near_limit.count}
            onClick={onShowNearLimit}
          />
          <AttentionRow
            icon={TicketX}
            tint="#fdf1f1"
            color="#b84545"
            title="Used up but still switched on"
            detail={attention.exhausted.count > 0 ? 'Raise the limit or pause them' : 'No coupon has hit its limit'}
            count={attention.exhausted.count}
            onClick={onShowUsedUp}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-[8px]">
          <Skeleton className="h-[46px] w-full" />
          <Skeleton className="h-[46px] w-full" />
          <Skeleton className="h-[46px] w-full" />
        </div>
      )}

      <button type="button" onClick={onCreate} className={`${OUTLINE_BUTTON} self-start`}>
        <Plus className="size-[14px]" strokeWidth={2} />
        Create a coupon
      </button>
    </Card>
  );
}
