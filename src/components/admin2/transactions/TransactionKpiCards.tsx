import { ArrowLeftRight, BadgeCheck, Landmark, LockKeyhole, Undo2 } from 'lucide-react';
import type { AdminTransactionsOverview } from '@/types/api';
import { formatNaira, formatCount, formatPct } from '../format';
import { changePill, plural } from '../shared/helpers';
import { MetricCard, MetricGrid } from '../shared/MetricCard';

export function TransactionKpiCards({ overview }: { overview?: AdminTransactionsOverview }) {
  const kpis = overview?.kpis;
  const fees = kpis?.fees.breakdown;

  return (
    <MetricGrid>
      <MetricCard
        label="Transaction volume"
        icon={ArrowLeftRight}
        iconColor="#167d35"
        iconBg="#eaf6ed"
        value={kpis ? formatNaira(kpis.volume.amount) : undefined}
        pill={kpis ? changePill(kpis.volume.change_pct) : null}
        context={kpis ? `${plural(kpis.volume.count, 'transaction')} · vs previous period` : undefined}
      />
      <MetricCard
        label="Successful payments"
        icon={BadgeCheck}
        iconColor="#2c73b9"
        iconBg="#eef5fb"
        value={kpis ? formatNaira(kpis.payments.amount) : undefined}
        pill={
          kpis?.payments.success_rate != null
            ? { label: `${formatPct(kpis.payments.success_rate)} success`, tone: kpis.payments.success_rate < 90 ? 'red' : 'green' }
            : null
        }
        context={kpis ? `${plural(kpis.payments.count, 'payment')} · ${formatCount(kpis.payments.failed_count)} failed` : undefined}
      />
      <MetricCard
        label="Escrow held"
        icon={LockKeyhole}
        iconColor="#735ca8"
        iconBg="#f3f0fa"
        value={kpis ? formatNaira(kpis.escrow.amount) : undefined}
        pill={kpis ? { label: 'Live', tone: 'gray' } : null}
        context={kpis ? `${plural(kpis.escrow.count, 'errand')} awaiting release` : undefined}
      />
      <MetricCard
        label="Refunds & failures"
        icon={Undo2}
        iconColor="#b84545"
        iconBg="#fdecec"
        value={kpis ? formatNaira(kpis.refunds.amount) : undefined}
        pill={kpis?.refunds.share_pct != null ? { label: `${formatPct(kpis.refunds.share_pct)} of entries`, tone: 'red' } : null}
        context={kpis ? `${plural(kpis.refunds.refund_count, 'refund')} · ${formatCount(kpis.refunds.failed_count)} failed` : undefined}
        title={
          kpis
            ? `Refunded ${formatNaira(kpis.refunds.refund_amount)} · failed checkouts ${formatNaira(kpis.refunds.failed_amount)}`
            : undefined
        }
      />
      <MetricCard
        label="Platform fees"
        icon={Landmark}
        iconColor="#b06d12"
        iconBg="#fff5e5"
        value={kpis ? formatNaira(kpis.fees.amount) : undefined}
        pill={kpis ? changePill(kpis.fees.change_pct) : null}
        context={kpis ? (kpis.fees.effective_pct != null ? `${formatPct(kpis.fees.effective_pct)} of errand value` : 'No errand value yet') : undefined}
        title={
          fees
            ? `Commission ${formatNaira(fees.commission)} · Service fees ${formatNaira(fees.service_fee)} · Cancellation ${formatNaira(fees.cancellation_fee)} · Withdrawal ${formatNaira(fees.withdrawal_fee)}`
            : undefined
        }
      />
    </MetricGrid>
  );
}
