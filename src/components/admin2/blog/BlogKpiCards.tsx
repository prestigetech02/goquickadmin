import { CalendarClock, ChartNoAxesCombined, FilePen, Newspaper } from 'lucide-react';
import type { Admin2RangePreset } from '@/context/Admin2DateRangeContext';
import type { BlogOverview } from '@/types/api';
import { formatCount } from '../format';
import { changePill } from '../shared/helpers';
import { MetricCard, MetricGrid } from '../shared/MetricCard';
import { rangeNoun, readTimeLabel, whenLabel } from './presentation';

const VIEW_LABELS: Partial<Record<Admin2RangePreset, string>> = {
  this_month: 'Monthly views',
  last_month: 'Monthly views',
  this_week: 'Weekly views',
  last_7: 'Weekly views',
};

export function BlogKpiCards({ overview, preset }: { overview?: BlogOverview; preset: Admin2RangePreset }) {
  const kpis = overview?.kpis;
  const publishedDelta = kpis ? kpis.published.in_range : 0;

  return (
    <MetricGrid columns={4}>
      <MetricCard
        label="Published posts"
        icon={Newspaper}
        iconColor="#167d35"
        iconBg="#eaf6ed"
        value={kpis ? formatCount(kpis.published.count) : undefined}
        pill={kpis && publishedDelta > 0 ? { label: `+${formatCount(publishedDelta)}`, tone: 'green' } : null}
        context={kpis ? `${formatCount(kpis.published.in_range)} published ${rangeNoun(preset)}` : undefined}
      />
      <MetricCard
        label="Drafts"
        icon={FilePen}
        iconColor="#b06d12"
        iconBg="#fff5e5"
        value={kpis ? formatCount(kpis.drafts.count) : undefined}
        context={kpis ? `${formatCount(kpis.drafts.awaiting_review)} awaiting review` : undefined}
      />
      <MetricCard
        label="Scheduled"
        icon={CalendarClock}
        iconColor="#2c73b9"
        iconBg="#eef5fb"
        value={kpis ? formatCount(kpis.scheduled.count) : undefined}
        context={kpis ? (kpis.scheduled.next_at ? `Next: ${whenLabel(kpis.scheduled.next_at)}` : 'Nothing scheduled') : undefined}
        title={kpis?.scheduled.next_title ? `Next up: ${kpis.scheduled.next_title}` : undefined}
      />
      <MetricCard
        label={VIEW_LABELS[preset] ?? 'Views'}
        icon={ChartNoAxesCombined}
        iconColor="#735ca8"
        iconBg="#f3f0fa"
        value={kpis ? formatCount(kpis.views.count) : undefined}
        pill={kpis ? changePill(kpis.views.change_pct) : null}
        context={
          kpis
            ? kpis.views.avg_read_seconds != null
              ? `Avg. engagement ${readTimeLabel(kpis.views.avg_read_seconds)}`
              : 'Read time appears once readers visit'
            : undefined
        }
      />
    </MetricGrid>
  );
}
