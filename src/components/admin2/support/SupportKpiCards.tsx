import { CircleCheckBig, Inbox, MessageSquarePlus, Timer } from 'lucide-react';
import type { AdminSupportOverview } from '@/types/api';
import { formatCount, formatMinutes, formatPct } from '../format';
import { changePill } from '../shared/helpers';
import { MetricCard, MetricGrid } from '../shared/MetricCard';

export function SupportKpiCards({ overview }: { overview?: AdminSupportOverview }) {
  const kpis = overview?.kpis;
  const withinTarget = kpis?.first_response.within_target_pct;

  return (
    <MetricGrid columns={4}>
      <MetricCard
        label="Open tickets"
        icon={Inbox}
        iconColor="#b06d12"
        iconBg="#fff5e5"
        value={kpis ? formatCount(kpis.open.count) : undefined}
        pill={kpis?.open.overdue ? { label: `${formatCount(kpis.open.overdue)} overdue`, tone: 'red' } : null}
        context={kpis ? `${formatCount(kpis.open.needs_reply)} need a reply · ${formatCount(kpis.open.unassigned)} unassigned` : undefined}
        title="Tickets that are still open right now, regardless of the date range: waiting on us or waiting on the customer."
      />
      <MetricCard
        label="New tickets"
        icon={MessageSquarePlus}
        iconColor="#2c73b9"
        iconBg="#eef5fb"
        value={kpis ? formatCount(kpis.created.count) : undefined}
        pill={kpis ? changePill(kpis.created.change_pct, true) : null}
        context={kpis ? `${formatCount(kpis.created.by_requester)} from requesters · ${formatCount(kpis.created.by_runner)} from runners` : undefined}
        title="Tickets opened in this period, compared with the previous period of the same length."
      />
      <MetricCard
        label="First reply time"
        icon={Timer}
        iconColor="#735ca8"
        iconBg="#f3f0fa"
        value={kpis ? formatMinutes(kpis.first_response.median_minutes) : undefined}
        pill={
          withinTarget != null
            ? { label: `${formatPct(withinTarget, 0)} on target`, tone: withinTarget >= 90 ? 'green' : withinTarget >= 70 ? 'amber' : 'red' }
            : null
        }
        context={
          kpis
            ? kpis.first_response.unanswered > 0
              ? `${formatCount(kpis.first_response.unanswered)} new ticket${kpis.first_response.unanswered === 1 ? '' : 's'} not answered yet`
              : `Median across ${formatCount(kpis.first_response.responded)} answered tickets`
            : undefined
        }
        title="Median time from a ticket being opened to our first reply, for tickets opened in this period. Targets: urgent 1h, high 4h, normal 8h, low 24h."
      />
      <MetricCard
        label="Resolved"
        icon={CircleCheckBig}
        iconColor="#0d5e27"
        iconBg="#eaf6ed"
        value={kpis ? formatCount(kpis.resolved.count) : undefined}
        pill={kpis ? changePill(kpis.resolved.change_pct) : null}
        context={
          kpis
            ? `Median ${kpis.resolved.median_hours != null ? formatMinutes(kpis.resolved.median_hours * 60) : '—'} to resolve · ${formatCount(kpis.awaiting_user.count)} waiting on customer`
            : undefined
        }
        title="Tickets resolved or closed in this period, and the median time from opening to resolution."
      />
    </MetricGrid>
  );
}
