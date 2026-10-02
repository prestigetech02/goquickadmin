import { CircleCheck, MailOpen, Send, TriangleAlert } from 'lucide-react';
import type { AdminNotificationsOverview } from '@/types/api';
import { formatCount, formatPct } from '../format';
import { changePill } from '../shared/helpers';
import { MetricCard, MetricGrid } from '../shared/MetricCard';

function pts(value: number): string {
  return `${value > 0 ? '+' : ''}${Number(value.toFixed(1))} pts`;
}

export function NotificationKpiCards({ overview }: { overview?: AdminNotificationsOverview }) {
  const kpis = overview?.kpis;

  return (
    <MetricGrid columns={4}>
      <MetricCard
        label="Sent"
        icon={Send}
        iconColor="#167d35"
        iconBg="#eaf6ed"
        value={kpis ? formatCount(kpis.sent.count) : undefined}
        pill={kpis ? changePill(kpis.sent.change_pct) : null}
        context={kpis ? 'Messages to individual people · vs previous period' : undefined}
      />
      <MetricCard
        label="Delivered"
        icon={CircleCheck}
        iconColor="#2c73b9"
        iconBg="#eef5fb"
        value={kpis ? formatCount(kpis.delivered.count) : undefined}
        pill={kpis?.delivered.rate != null ? { label: formatPct(kpis.delivered.rate), tone: kpis.delivered.rate < 90 ? 'amber' : 'green' } : null}
        context={kpis ? `In-app inbox · ${formatCount(kpis.delivered.push_sent)} also by push` : undefined}
        title="Every message is stored in the recipient's in-app inbox. It only counts as failed when its push notification was rejected."
      />
      <MetricCard
        label="Opened / read"
        icon={MailOpen}
        iconColor="#735ca8"
        iconBg="#f3f0fa"
        value={kpis ? formatCount(kpis.read.count) : undefined}
        pill={kpis?.read.rate != null ? { label: formatPct(kpis.read.rate), tone: 'green' } : null}
        context={kpis ? (kpis.read.change_pts != null ? `${pts(kpis.read.change_pts)} vs previous period` : 'Read in the app') : undefined}
      />
      <MetricCard
        label="Failed"
        icon={TriangleAlert}
        iconColor="#b84545"
        iconBg="#fdeded"
        value={kpis ? formatCount(kpis.failed.count) : undefined}
        pill={kpis?.failed.share_pct ? { label: formatPct(kpis.failed.share_pct), tone: 'red' } : null}
        context={
          kpis
            ? kpis.failed.count > 0
              ? `Push rejected · of ${formatCount(kpis.failed.push_attempts)} push attempts`
              : `No push failures in ${formatCount(kpis.failed.push_attempts)} attempts`
            : undefined
        }
      />
    </MetricGrid>
  );
}
