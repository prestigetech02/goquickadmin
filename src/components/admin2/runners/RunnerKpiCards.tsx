import { BadgeCheck, Clock3, Radio, Star, UserX, Users } from 'lucide-react';
import type { AdminRunnerBoardOverview } from '@/types/api';
import { formatCount, formatPct } from '../format';
import { MetricCard, MetricGrid } from '../shared/MetricCard';
import type { MetricPill } from '../shared/helpers';

function ratingPill(change: number | null): MetricPill {
  if (change == null || change === 0) return null;
  return { label: `${change > 0 ? '+' : ''}${change.toFixed(2)}`, tone: change < 0 ? 'red' : 'green' };
}

export function RunnerKpiCards({ overview }: { overview?: AdminRunnerBoardOverview }) {
  const k = overview?.kpis;
  return (
    <MetricGrid columns={6}>
      <MetricCard
        label="Total runners"
        icon={Users}
        iconColor="#167d35"
        iconBg="#eaf6ed"
        value={k ? formatCount(k.total.value) : undefined}
        context={k ? `+${formatCount(k.total.new)} joined in this period` : undefined}
      />
      <MetricCard
        label="Online now"
        icon={Radio}
        iconColor="#167d35"
        iconBg="#eaf6ed"
        value={k ? formatCount(k.online.value) : undefined}
        pill={k ? { label: `${formatCount(k.online.available)} available`, tone: 'green' } : null}
        context={k ? `${formatPct(k.online.share_pct, 0)} of network` : undefined}
        title={k ? `${formatCount(k.online.on_errand)} runners are on an errand right now` : undefined}
      />
      <MetricCard
        label="Verified"
        icon={BadgeCheck}
        iconColor="#2c73b9"
        iconBg="#eef5fb"
        value={k ? formatCount(k.verified.value) : undefined}
        context={k ? `${formatPct(k.verified.share_pct, 0)} verified` : undefined}
      />
      <MetricCard
        label="Pending verification"
        icon={Clock3}
        iconColor="#b06d12"
        iconBg="#fff5e5"
        value={k ? formatCount(k.pending.value) : undefined}
        pill={k && k.pending.overdue > 0 ? { label: `${formatCount(k.pending.overdue)} overdue`, tone: 'amber' } : null}
        context={k ? (k.pending.overdue > 0 ? `older than ${k.pending.sla_hours}h` : `All within ${k.pending.sla_hours}h`) : undefined}
      />
      <MetricCard
        label="Suspended"
        icon={UserX}
        iconColor="#b84545"
        iconBg="#fdeded"
        value={k ? formatCount(k.suspended.value) : undefined}
        context={k ? `${formatCount(k.suspended.in_range)} suspended in this period` : undefined}
      />
      <MetricCard
        label="Average rating"
        icon={Star}
        iconColor="#735ca8"
        iconBg="#f3f0fa"
        value={k ? (k.rating.value != null ? k.rating.value.toFixed(2) : '—') : undefined}
        pill={k ? ratingPill(k.rating.change) : null}
        context={k ? `Across ${formatCount(k.rating.reviews)} rating${k.rating.reviews === 1 ? '' : 's'}` : undefined}
        title={k?.rating.change != null ? 'Change compares ratings given in this period with the previous period' : undefined}
      />
    </MetricGrid>
  );
}
