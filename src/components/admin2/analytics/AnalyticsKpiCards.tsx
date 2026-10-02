import { Bike, CircleCheck, CircleX, PackagePlus, Users } from 'lucide-react';
import type { AdminAnalyticsOverview } from '@/types/api';
import { formatCount, formatPct } from '../format';
import { changePill, plural, type MetricPill } from '../shared/helpers';
import { MetricCard, MetricGrid } from '../shared/MetricCard';
import { signedPts } from './presentation';

function ptsPill(value: number | null, invert = false): MetricPill {
  if (value == null) return null;
  const bad = invert ? value > 0 : value < 0;
  return { label: signedPts(value), tone: value === 0 ? 'gray' : bad ? 'red' : 'green' };
}

export function AnalyticsKpiCards({ overview }: { overview?: AdminAnalyticsOverview }) {
  const kpis = overview?.kpis;

  return (
    <MetricGrid>
      <MetricCard
        label="Errands requested"
        icon={PackagePlus}
        iconColor="#167d35"
        iconBg="#eaf6ed"
        value={kpis ? formatCount(kpis.requested.value) : undefined}
        pill={kpis ? changePill(kpis.requested.change_pct) : null}
        context={kpis ? `vs ${formatCount(kpis.requested.previous)} previous period` : undefined}
      />
      <MetricCard
        label="Completed errands"
        icon={CircleCheck}
        iconColor="#167d35"
        iconBg="#eaf6ed"
        value={kpis ? formatCount(kpis.completed.value) : undefined}
        pill={kpis ? ptsPill(kpis.completed.completion_rate_change_pts) ?? changePill(kpis.completed.change_pct) : null}
        context={kpis ? `${formatPct(kpis.completed.completion_rate_pct)} completion rate` : undefined}
        title="Share of errands requested in this period that were completed"
      />
      <MetricCard
        label="Active requesters"
        icon={Users}
        iconColor="#2c73b9"
        iconBg="#eef5fb"
        value={kpis ? formatCount(kpis.requesters.value) : undefined}
        pill={kpis ? changePill(kpis.requesters.change_pct) : null}
        context={kpis ? `${plural(kpis.requesters.first_time, 'first-time requester')}` : undefined}
      />
      <MetricCard
        label="Active runners"
        icon={Bike}
        iconColor="#735ca8"
        iconBg="#f3f0fa"
        value={kpis ? formatCount(kpis.runners.value) : undefined}
        pill={kpis ? changePill(kpis.runners.change_pct) : null}
        context={kpis ? `accepted errands · ${formatCount(kpis.runners.registered)} registered` : undefined}
      />
      <MetricCard
        label="Cancellation rate"
        icon={CircleX}
        iconColor="#b06d12"
        iconBg="#fff5e5"
        value={kpis ? formatPct(kpis.cancellation.rate_pct) : undefined}
        pill={kpis ? ptsPill(kpis.cancellation.change_pts, true) : null}
        context={kpis ? `Target is below ${formatPct(kpis.cancellation.target_pct)}` : undefined}
        title={kpis ? `${plural(kpis.cancellation.cancelled, 'errand')} cancelled` : undefined}
      />
    </MetricGrid>
  );
}
