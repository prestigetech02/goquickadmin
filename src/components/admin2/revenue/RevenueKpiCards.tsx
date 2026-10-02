import { Activity, Landmark, Percent, ReceiptText, Undo2 } from 'lucide-react';
import type { AdminRevenueOverview } from '@/types/api';
import { formatNaira, formatPct } from '../format';
import { changePill, plural } from '../shared/helpers';
import { MetricCard, MetricGrid } from '../shared/MetricCard';

export function RevenueKpiCards({ overview }: { overview?: AdminRevenueOverview }) {
  const totals = overview?.totals;
  const changes = overview?.changes;
  const rates = overview?.rates;

  return (
    <MetricGrid>
      <MetricCard
        label="Gross transaction value"
        icon={Activity}
        iconColor="#2c73b9"
        iconBg="#eef5fb"
        value={totals ? formatNaira(totals.gtv) : undefined}
        pill={changes ? changePill(changes.gtv) : null}
        context={totals ? `${plural(totals.gtv_count, 'successful transaction')}` : undefined}
        title="Requester charges held in escrow during the period, including service fees"
      />
      <MetricCard
        label="Net company revenue"
        icon={Landmark}
        iconColor="#167d35"
        iconBg="#eaf6ed"
        value={totals ? formatNaira(totals.net) : undefined}
        pill={changes ? changePill(changes.net) : null}
        context={rates ? (rates.net_take_pct != null ? `${formatPct(rates.net_take_pct)} effective net take rate` : 'No gross value yet') : undefined}
        title="Gross company earnings less Paystack processing fees, coupon subsidies and referral rewards"
      />
      <MetricCard
        label="Runner commissions"
        icon={Percent}
        iconColor="#735ca8"
        iconBg="#f3f0fa"
        value={totals ? formatNaira(totals.commission) : undefined}
        pill={changes ? changePill(changes.commission) : null}
        context={
          rates ? (rates.blended_commission_pct != null ? `${formatPct(rates.blended_commission_pct)} blended commission` : 'No releases yet') : undefined
        }
      />
      <MetricCard
        label="Requester platform fees"
        icon={ReceiptText}
        iconColor="#167d35"
        iconBg="#eaf6ed"
        value={totals ? formatNaira(totals.service_fee) : undefined}
        pill={changes ? changePill(changes.service_fee) : null}
        context={rates ? (rates.average_service_fee != null ? `${formatNaira(rates.average_service_fee)} average fee` : 'No releases yet') : undefined}
      />
      <MetricCard
        label="Refunds & reversals"
        icon={Undo2}
        iconColor="#b84545"
        iconBg="#fdecec"
        value={totals ? formatNaira(totals.refunds) : undefined}
        pill={changes ? changePill(changes.refunds, true) : null}
        context={rates ? (rates.refund_share_pct != null ? `${formatPct(rates.refund_share_pct, 2)} of gross value` : 'No gross value yet') : undefined}
      />
    </MetricGrid>
  );
}
