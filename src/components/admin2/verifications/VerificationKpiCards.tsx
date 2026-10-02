import { BadgeCheck, CircleX, Clock3, FileWarning, Timer } from 'lucide-react';
import type { AdminKycOverview } from '@/types/api';
import { formatCount, formatMinutes, formatPct, shortAge } from '../format';
import { changePill } from '../shared/helpers';
import { MetricCard, MetricGrid } from '../shared/MetricCard';

export function VerificationKpiCards({ overview }: { overview?: AdminKycOverview }) {
  const kpis = overview?.kpis;

  return (
    <MetricGrid>
      <MetricCard
        label="Awaiting review"
        icon={Clock3}
        iconColor="#b06d12"
        iconBg="#fff5e5"
        value={kpis ? formatCount(kpis.awaiting.count) : undefined}
        pill={kpis?.awaiting.over_sla ? { label: `${formatCount(kpis.awaiting.over_sla)} over ${overview?.sla_hours ?? 24}h`, tone: 'amber' } : null}
        context={
          kpis
            ? kpis.awaiting.oldest_at
              ? `Oldest waiting ${shortAge(kpis.awaiting.oldest_at)}${kpis.awaiting.flagged ? ` · ${formatCount(kpis.awaiting.flagged)} flagged` : ''}`
              : 'Queue is clear'
            : undefined
        }
      />
      <MetricCard
        label="Approved"
        icon={BadgeCheck}
        iconColor="#167d35"
        iconBg="#eaf6ed"
        value={kpis ? formatCount(kpis.approved.count) : undefined}
        pill={kpis ? changePill(kpis.approved.change_pct) : null}
        context={kpis ? `${formatCount(kpis.approved.verified_total)} verified runners in total` : undefined}
      />
      <MetricCard
        label="Rejected"
        icon={CircleX}
        iconColor="#b84545"
        iconBg="#fdeded"
        value={kpis ? formatCount(kpis.rejected.count) : undefined}
        pill={kpis?.rejected.rate_pct != null ? { label: formatPct(kpis.rejected.rate_pct), tone: kpis.rejected.rate_pct > 40 ? 'red' : 'gray' } : null}
        context={kpis ? 'Of decisions in this period' : undefined}
      />
      <MetricCard
        label="Median review time"
        icon={Timer}
        iconColor="#2c73b9"
        iconBg="#eef5fb"
        value={kpis ? formatMinutes(kpis.review_time.median_minutes) : undefined}
        pill={
          kpis?.review_time.within_sla_pct != null
            ? { label: `${formatPct(kpis.review_time.within_sla_pct)} in ${overview?.sla_hours ?? 24}h`, tone: kpis.review_time.within_sla_pct >= 90 ? 'green' : 'amber' }
            : null
        }
        context={kpis ? `Submission to decision · ${formatCount(kpis.review_time.reviewed_count)} decisions` : undefined}
      />
      <MetricCard
        label="Incomplete"
        icon={FileWarning}
        iconColor="#735ca8"
        iconBg="#f3f0fa"
        value={kpis ? formatCount(kpis.incomplete.count) : undefined}
        context={kpis ? `Missing ID or selfie · ${formatCount(kpis.incomplete.not_started)} runners not started` : undefined}
        title="Pending submissions without both an ID document and a selfie, plus runners who haven't started verification."
      />
    </MetricGrid>
  );
}
