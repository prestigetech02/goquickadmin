import { Ban, CircleCheckBig, PackagePlus, Radio, Wallet } from 'lucide-react';
import type { AdminErrandsOverview } from '@/types/api';
import { formatNaira, formatCount, formatPct } from '../format';
import { changePill } from '../shared/helpers';
import { MetricCard, MetricGrid } from '../shared/MetricCard';

export function ErrandKpiCards({ overview }: { overview?: AdminErrandsOverview }) {
  const kpis = overview?.kpis;

  return (
    <MetricGrid>
      <MetricCard
        label="Errands created"
        icon={PackagePlus}
        iconColor="#167d35"
        iconBg="#eaf6ed"
        value={kpis ? formatCount(kpis.created.count) : undefined}
        pill={kpis ? changePill(kpis.created.change_pct) : null}
        context={kpis ? `${formatCount(kpis.created.instant)} instant · ${formatCount(kpis.created.scheduled)} scheduled` : undefined}
      />
      <MetricCard
        label="Live right now"
        icon={Radio}
        iconColor="#2c73b9"
        iconBg="#eef5fb"
        value={kpis ? formatCount(kpis.live.count) : undefined}
        pill={kpis?.live.flagged ? { label: `${formatCount(kpis.live.flagged)} flagged`, tone: 'amber' } : null}
        context={kpis ? `${formatCount(kpis.live.unassigned)} without a runner · ${formatCount(kpis.live.in_flight)} on the move` : undefined}
        title="Errands that are open right now, regardless of the date range."
      />
      <MetricCard
        label="Completed"
        icon={CircleCheckBig}
        iconColor="#0d5e27"
        iconBg="#eaf6ed"
        value={kpis ? formatCount(kpis.completed.count) : undefined}
        pill={kpis ? changePill(kpis.completed.change_pct) : null}
        context={kpis ? `${formatPct(kpis.completed.completion_rate_pct)} completion rate` : undefined}
        title="Completion rate: completed out of errands created in this period that have finished (completed or cancelled)."
      />
      <MetricCard
        label="Errand value (GMV)"
        icon={Wallet}
        iconColor="#735ca8"
        iconBg="#f3f0fa"
        value={kpis ? formatNaira(kpis.value.gmv) : undefined}
        pill={kpis ? changePill(kpis.value.change_pct) : null}
        context={
          kpis
            ? `${kpis.value.avg_value != null ? `${formatNaira(kpis.value.avg_value)} average · ` : ''}${formatNaira(kpis.value.held_now)} in escrow now`
            : undefined
        }
        title="Requester payments secured in escrow during this period, whether still held or already released."
      />
      <MetricCard
        label="Cancelled"
        icon={Ban}
        iconColor="#b84545"
        iconBg="#fdeded"
        value={kpis ? formatCount(kpis.cancelled.count) : undefined}
        pill={
          kpis?.cancelled.rate_pct != null
            ? { label: formatPct(kpis.cancelled.rate_pct), tone: kpis.cancelled.rate_pct > 15 ? 'red' : 'gray' }
            : null
        }
        context={
          kpis
            ? `${formatCount(kpis.cancelled.by_requester)} by requesters · ${formatCount(kpis.cancelled.by_runner)} by runners · ${formatCount(kpis.cancelled.by_ops)} by ops`
            : undefined
        }
      />
    </MetricGrid>
  );
}
