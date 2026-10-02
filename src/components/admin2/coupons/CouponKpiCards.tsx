import { HandCoins, ReceiptText, Ticket, TimerReset } from 'lucide-react';
import type { CouponOverview } from '@/types/api';
import { formatCount, formatNaira, formatPct } from '../format';
import { changePill, plural } from '../shared/helpers';
import { MetricCard, MetricGrid } from '../shared/MetricCard';

function discountContext(kpis: CouponOverview['kpis']): string {
  if (kpis.discount.average == null) return 'No discounts yet';
  const share = kpis.discount.share_of_listed_pct != null ? ` · ${formatPct(kpis.discount.share_of_listed_pct)} of errand value` : '';
  return `Avg. ${formatNaira(kpis.discount.average)}${share}`;
}

export function CouponKpiCards({ overview, rangeNoun }: { overview?: CouponOverview; rangeNoun: string }) {
  const kpis = overview?.kpis;

  return (
    <MetricGrid columns={4}>
      <MetricCard
        label="Active coupons"
        icon={Ticket}
        iconColor="#167d35"
        iconBg="#eaf6ed"
        value={kpis ? formatCount(kpis.active.count) : undefined}
        context={kpis ? `${formatCount(kpis.active.scheduled)} scheduled · ${formatCount(kpis.active.paused)} paused` : undefined}
      />
      <MetricCard
        label="Redemptions"
        icon={ReceiptText}
        iconColor="#2c73b9"
        iconBg="#eef5fb"
        value={kpis ? formatCount(kpis.redemptions.count) : undefined}
        pill={kpis ? changePill(kpis.redemptions.change_pct) : null}
        context={kpis ? `${plural(kpis.redemptions.requesters, 'requester')} ${rangeNoun}` : undefined}
        title="Coupons applied to errands that were paid for in this period"
      />
      <MetricCard
        label="Discount funded"
        icon={HandCoins}
        iconColor="#b06d12"
        iconBg="#fff5e5"
        value={kpis ? formatNaira(kpis.discount.amount) : undefined}
        pill={kpis ? changePill(kpis.discount.change_pct, true) : null}
        context={kpis ? discountContext(kpis) : undefined}
        title="GoQuick pays this gap so runners still earn the full errand price"
      />
      <MetricCard
        label="Held on open errands"
        icon={TimerReset}
        iconColor="#1f9d8f"
        iconBg="#e8f6f4"
        value={kpis ? formatCount(kpis.reserved.count) : undefined}
        context={kpis ? (kpis.reserved.count > 0 ? `${formatNaira(kpis.reserved.discount)} pending` : 'No codes on hold') : undefined}
        title="Codes reserved on errands that have not been paid for yet; they count against usage limits until released"
      />
    </MetricGrid>
  );
}
