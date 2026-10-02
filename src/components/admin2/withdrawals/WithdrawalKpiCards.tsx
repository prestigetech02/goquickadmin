import { CircleCheck, CircleX, Clock3, ListChecks, WalletCards } from 'lucide-react';
import type { AdminWithdrawalsOverview } from '@/types/api';
import { formatNaira, formatCount, formatPct } from '../format';
import { changePill, plural } from '../shared/helpers';
import { MetricCard, MetricGrid } from '../shared/MetricCard';

export function WithdrawalKpiCards({ overview }: { overview?: AdminWithdrawalsOverview }) {
  const kpis = overview?.kpis;
  const pending = kpis?.pending;

  return (
    <MetricGrid>
      <MetricCard
        label="Pending requests"
        icon={Clock3}
        iconColor="#b06d12"
        iconBg="#fff5e5"
        value={pending ? formatCount(pending.count) : undefined}
        pill={pending && pending.needs_attention > 0 ? { label: `${formatCount(pending.needs_attention)} need attention`, tone: 'amber' } : null}
        context={
          pending
            ? pending.overdue > 0
              ? `${formatCount(pending.overdue)} past payout SLA`
              : pending.needs_attention > 0
                ? 'Within payout SLA'
                : 'Nothing flagged'
            : undefined
        }
      />
      <MetricCard
        label="Pending amount"
        icon={WalletCards}
        iconColor="#735ca8"
        iconBg="#f3f0fa"
        value={pending ? formatNaira(pending.amount) : undefined}
        context={pending ? `Across ${plural(pending.wallets, 'wallet')}` : undefined}
      />
      <MetricCard
        label="Approved / processing"
        icon={ListChecks}
        iconColor="#2c73b9"
        iconBg="#eef5fb"
        value={kpis ? formatNaira(kpis.approved.amount) : undefined}
        context={
          kpis ? `${formatCount(kpis.approved.processing_count)} in flight · ${formatCount(kpis.approved.awaiting_count)} awaiting payout` : undefined
        }
        title={kpis ? `In flight with Flutterwave: ${formatNaira(kpis.approved.processing_amount)}` : undefined}
      />
      <MetricCard
        label="Paid in period"
        icon={CircleCheck}
        iconColor="#167d35"
        iconBg="#eaf6ed"
        value={kpis ? formatNaira(kpis.paid.amount) : undefined}
        pill={kpis ? changePill(kpis.paid.change_pct) : null}
        context={kpis ? plural(kpis.paid.count, 'payout') : undefined}
      />
      <MetricCard
        label="Rejected / failed"
        icon={CircleX}
        iconColor="#b84545"
        iconBg="#fdeded"
        value={kpis ? formatNaira(kpis.rejected.amount) : undefined}
        context={
          kpis
            ? `${plural(kpis.rejected.count, 'request')}${kpis.rejected.share_pct != null ? ` · ${formatPct(kpis.rejected.share_pct)}` : ''}`
            : undefined
        }
        title={kpis ? `${formatCount(kpis.rejected.rejected_count)} rejected · ${formatCount(kpis.rejected.failed_count)} failed payouts` : undefined}
      />
    </MetricGrid>
  );
}
