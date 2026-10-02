import type { AdminAnalyticsOverview, AnalyticsCategoryRow, ZoneHealth } from '@/types/api';
import { categoryLabel } from '../errand/errandPresentation';
import { formatMinutes, formatPct } from '../format';

export type Tone = { bg: string; color: string };

export const HEALTH_META: Record<ZoneHealth, { label: string; tone: Tone; hint: string }> = {
  healthy: { label: 'Healthy', tone: { bg: '#eaf6ed', color: '#0d5e27' }, hint: 'Match rate 85%+ and cancellations under target' },
  watch: { label: 'Watch', tone: { bg: '#fff5e5', color: '#b06d12' }, hint: 'Match rate under 85% or cancellations above target' },
  at_risk: { label: 'At risk', tone: { bg: '#fdeded', color: '#b84545' }, hint: 'Match rate under 75% or cancellations at 10%+' },
};

export const CATEGORY_COLORS = ['#167d35', '#3478b7', '#735ca8', '#b06d12', '#b84545', '#4b9f8c', '#a9b3ac'];

export const FUNNEL_COLORS = ['#3478b7', '#735ca8', '#b06d12', '#167d35', '#0d5e27'];

export function signedPts(value: number): string {
  return `${value > 0 ? '+' : ''}${Number(value.toFixed(1))} pts`;
}

export function monthLabel(month: string): string {
  const [year, m] = month.split('-').map(Number);
  return new Date(year, m - 1, 1).toLocaleDateString('en-GB', { month: 'short' });
}

export type CategorySort = 'completed' | 'requested' | 'growth' | 'order_value';

export const SORT_OPTIONS: Array<{ value: CategorySort; label: string }> = [
  { value: 'completed', label: 'Completed errands' },
  { value: 'requested', label: 'Requested errands' },
  { value: 'growth', label: 'Growth' },
  { value: 'order_value', label: 'Avg order value' },
];

export function sortCategories(rows: AnalyticsCategoryRow[], sort: CategorySort): AnalyticsCategoryRow[] {
  const value = (row: AnalyticsCategoryRow): number => {
    switch (sort) {
      case 'requested':
        return row.requested;
      case 'growth':
        return row.growth_pct ?? Number.NEGATIVE_INFINITY;
      case 'order_value':
        return row.average_order_value ?? Number.NEGATIVE_INFINITY;
      default:
        return row.completed;
    }
  };
  return [...rows].sort((a, b) => value(b) - value(a));
}

function csvCell(value: string | number | null | undefined): string {
  const text = value == null ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function analyticsReportCsv(overview: AdminAnalyticsOverview, categories: AnalyticsCategoryRow[]): string {
  const { range, kpis, fulfillment, growth } = overview;
  const rows: Array<Array<string | number | null>> = [
    ['GoQuick marketplace analytics'],
    ['Period', range.start_date, range.end_date],
    ['Compared with', range.previous_start_date, range.previous_end_date],
    [],
    ['Metric', 'This period', 'Previous period', 'Change'],
    ['Errands requested', kpis.requested.value, kpis.requested.previous, kpis.requested.change_pct],
    ['Completed errands', kpis.completed.value, kpis.completed.previous, kpis.completed.change_pct],
    ['Completion rate (%)', kpis.completed.completion_rate_pct, null, kpis.completed.completion_rate_change_pts],
    ['Active requesters', kpis.requesters.value, kpis.requesters.previous, kpis.requesters.change_pct],
    ['First-time requesters', kpis.requesters.first_time, null, null],
    ['Active runners', kpis.runners.value, kpis.runners.previous, kpis.runners.change_pct],
    ['Cancellation rate (%)', kpis.cancellation.rate_pct, kpis.cancellation.previous_pct, kpis.cancellation.change_pts],
    [],
    ['Median fulfilment (min)', fulfillment.median_minutes],
    [`Matched within ${fulfillment.fast_match_minutes} min (%)`, fulfillment.fast_match_pct],
    ['Completed within quoted ETA (%)', fulfillment.on_time_pct],
    ['Requesters per active runner', growth.requesters_per_runner],
    [],
    ['Funnel stage', 'Errands', 'Share of requested (%)'],
    ...overview.funnel.stages.map((s) => [s.label, s.count, s.pct]),
    [],
    ['Service zone', 'Jobs', 'Match rate (%)', 'Median fulfilment (min)', 'Cancellation (%)', 'Health'],
    ...overview.zones.map((z) => [z.zone ?? 'Unassigned', z.jobs, z.match_rate_pct, z.median_minutes, z.cancellation_rate_pct, HEALTH_META[z.health].label]),
    [],
    ['Category', 'Requested', 'Completed', 'Completion (%)', 'Median time (min)', 'Cancellation (%)', 'Avg order value (NGN)', 'Growth (%)'],
    ...categories.map((c) => [
      categoryLabel(c.key),
      c.requested,
      c.completed,
      c.completion_rate_pct,
      c.median_minutes,
      c.cancellation_rate_pct,
      c.average_order_value,
      c.growth_pct,
    ]),
    [],
    [overview.activity.bucket === 'week' ? 'Week starting' : 'Date', 'Until', 'Requested', 'Completed', 'Previous period requested'],
    ...overview.activity.points.map((p) => [p.start, p.end, p.requested, p.completed, p.previous_requested]),
  ];
  return rows.map((row) => row.map(csvCell).join(',')).join('\n');
}

/** One actionable line built from the weakest zone, or a healthy-state fallback. */
export function recommendation(overview: AdminAnalyticsOverview): { text: string; zone: string | null } {
  const weakest = overview.zones
    .filter((z) => z.zone && z.jobs >= 5 && z.health !== 'healthy')
    .sort((a, b) => (a.match_rate_pct ?? 100) - (b.match_rate_pct ?? 100))[0];
  if (weakest?.zone) {
    return {
      zone: weakest.zone,
      text: `Recommended action: add runner supply or incentives in ${weakest.zone}. Only ${formatPct(weakest.match_rate_pct)} of its ${weakest.jobs} requests were matched, with ${formatPct(weakest.cancellation_rate_pct)} cancelled${
        weakest.median_minutes != null ? ` and a ${formatMinutes(weakest.median_minutes)} median fulfilment` : ''
      }.`,
    };
  }
  const gap = overview.growth.supply_gap_pts;
  if (gap != null && gap > 10) {
    return {
      zone: null,
      text: `Recommended action: requester demand is outgrowing runner supply by ${Number(gap.toFixed(1))} index points. Plan runner recruitment before matching slows.`,
    };
  }
  return { zone: null, text: 'Supply and demand look balanced across service zones this period. No intervention needed.' };
}
