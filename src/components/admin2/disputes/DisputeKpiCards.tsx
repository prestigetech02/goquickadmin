import { CircleCheckBig, FilePlus2, Scale, Undo2, Wallet } from 'lucide-react';
import type { AdminDisputesOverview } from '@/types/api';
import { formatNaira, formatCount, formatMinutes, formatPct } from '../format';
import { changePill } from '../shared/helpers';
import { MetricCard, MetricGrid } from '../shared/MetricCard';

export function DisputeKpiCards({ overview }: { overview?: AdminDisputesOverview }) {
  const kpis = overview?.kpis;
  const targetHours = overview?.targets.resolve_hours ?? 48;

  return (
    <MetricGrid>
      <MetricCard
        label="Open disputes"
        icon={Scale}
        iconColor="#b06d12"
        iconBg="#fff5e5"
        value={kpis ? formatCount(kpis.open.count) : undefined}
        pill={kpis?.open.over_target ? { label: `${formatCount(kpis.open.over_target)} past ${targetHours}h`, tone: 'red' } : null}
        context={kpis ? `${formatCount(kpis.open.unassigned)} unassigned · ${formatCount(kpis.open.under_review)} in review` : undefined}
        title="Disputes waiting for a decision right now, regardless of the date range."
      />
      <MetricCard
        label="Disputes filed"
        icon={FilePlus2}
        iconColor="#b84545"
        iconBg="#fdeded"
        value={kpis ? formatCount(kpis.opened.count) : undefined}
        pill={kpis ? changePill(kpis.opened.change_pct, true) : null}
        context={
          kpis
            ? `${kpis.opened.rate_pct != null ? `${formatPct(kpis.opened.rate_pct)} of errands · ` : ''}${formatCount(kpis.opened.by_requester)} by requesters · ${formatCount(kpis.opened.by_runner)} by runners`
            : undefined
        }
        title="Dispute rate: disputes filed out of errands created in this period."
      />
      <MetricCard
        label="Decided"
        icon={CircleCheckBig}
        iconColor="#0d5e27"
        iconBg="#eaf6ed"
        value={kpis ? formatCount(kpis.resolved.count) : undefined}
        pill={kpis ? changePill(kpis.resolved.change_pct) : null}
        context={
          kpis
            ? `${formatPct(kpis.resolved.on_time_pct)} within ${targetHours}h · median ${kpis.resolved.median_hours != null ? formatMinutes(kpis.resolved.median_hours * 60) : '—'}`
            : undefined
        }
        title={`Disputes resolved or dismissed in this period, and how many were decided within the ${targetHours}h target.`}
      />
      <MetricCard
        label="Money at stake"
        icon={Wallet}
        iconColor="#735ca8"
        iconBg="#f3f0fa"
        value={kpis ? formatNaira(kpis.at_stake.amount) : undefined}
        pill={kpis?.at_stake.held_count ? { label: `${formatCount(kpis.at_stake.held_count)} held`, tone: 'amber' } : null}
        context={
          kpis
            ? kpis.at_stake.largest
              ? `Largest single case ${formatNaira(kpis.at_stake.largest)}`
              : 'No escrow held on open disputes'
            : undefined
        }
        title="Escrow still held on open disputes. A decision either refunds it to the requester or releases it to the runner."
      />
      <MetricCard
        label="Refunded to requesters"
        icon={Undo2}
        iconColor="#2c73b9"
        iconBg="#eef5fb"
        value={kpis ? formatNaira(kpis.settlements.refunded) : undefined}
        pill={kpis?.settlements.refund_count ? { label: `${formatCount(kpis.settlements.refund_count)} refunds`, tone: 'gray' } : null}
        context={
          kpis
            ? `${formatNaira(kpis.settlements.paid_out)} paid to runners in ${formatCount(kpis.settlements.paid_count)} case${kpis.settlements.paid_count === 1 ? '' : 's'}`
            : undefined
        }
        title="Money moved by dispute decisions made in this period."
      />
    </MetricGrid>
  );
}
