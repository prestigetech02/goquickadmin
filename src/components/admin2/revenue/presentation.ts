import type { AdminRevenueFilters, AdminRevenueOverview, AdminRevenueRow, RevenueChannel, RevenueStatus } from '@/types/api';
import { categoryLabel } from '../errand/errandPresentation';
import { formatNaira } from '../format';

export type Tone = { bg: string; color: string };

const GREEN: Tone = { bg: '#eaf6ed', color: '#0d5e27' };
const AMBER: Tone = { bg: '#fff5e5', color: '#b06d12' };
const RED: Tone = { bg: '#fdeded', color: '#b84545' };
const BLUE: Tone = { bg: '#eef5fb', color: '#2c73b9' };

export const STATUS_META: Record<RevenueStatus, { label: string; tone: Tone; hint: string }> = {
  settled: { label: 'Settled', tone: GREEN, hint: 'Escrow released to the runner; company revenue recognised.' },
  pending: { label: 'Pending', tone: AMBER, hint: 'Escrow still held while the errand is in progress. Revenue shown is the expected service fee.' },
  refunded: { label: 'Refunded', tone: BLUE, hint: 'Escrow refunded to the requester; any cancellation fee is kept.' },
  review: {
    label: 'Review',
    tone: RED,
    hint: 'Escrow state and ledger disagree: held on a closed errand, or released/refunded without a ledger entry.',
  },
};

const CHANNEL_LABELS: Record<AdminRevenueRow['channel'], string> = {
  wallet: 'Wallet',
  card: 'Card',
  bank_transfer: 'Transfer',
  ussd: 'USSD',
  other: 'Checkout',
};

export function channelLabel(channel: AdminRevenueRow['channel']): string {
  return CHANNEL_LABELS[channel] ?? 'Wallet';
}

export const CATEGORY_COLORS = ['#167d35', '#3478b7', '#735ca8', '#b06d12', '#b84545', '#4b9f8c', '#a9b3ac'];

/** "−₦1,620,000" for costs, keeping the sign outside the currency symbol. */
export function signedNaira(amount: number): string {
  return amount < 0 ? `−${formatNaira(Math.abs(amount))}` : formatNaira(amount);
}

export type RevenueTableFilters = {
  status: '' | RevenueStatus;
  channel: '' | RevenueChannel;
  zone: string;
  category: string;
  useRange: boolean;
};

export const DEFAULT_REVENUE_FILTERS: RevenueTableFilters = { status: '', channel: '', zone: '', category: '', useRange: true };

export const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'settled', label: 'Settled' },
  { value: 'pending', label: 'Pending' },
  { value: 'refunded', label: 'Refunded' },
  { value: 'review', label: 'Needs review' },
];

export const CHANNEL_OPTIONS = [
  { value: '', label: 'All channels' },
  { value: 'wallet', label: 'Wallet balance' },
  { value: 'checkout', label: 'Direct checkout' },
];

export function revenueParams(filters: RevenueTableFilters, search: string, range: { start: string; end: string }): AdminRevenueFilters {
  const params: AdminRevenueFilters = {};
  if (filters.status) params.status = filters.status;
  if (filters.channel) params.channel = filters.channel;
  if (filters.zone) params.zone = filters.zone;
  if (filters.category) params.category = filters.category;
  if (search.trim()) params.search = search.trim();
  if (filters.useRange) {
    params.start_date = range.start;
    params.end_date = range.end;
  }
  return params;
}

function csvCell(value: string | number | null | undefined): string {
  const text = value == null ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function revenueReportCsv(overview: AdminRevenueOverview): string {
  const { range, totals, changes, rates, health } = overview;
  const rows: Array<Array<string | number | null>> = [
    ['GoQuick company revenue report'],
    ['Period', range.start_date, range.end_date],
    ['Compared with', range.previous_start_date, range.previous_end_date],
    [],
    ['Metric', 'Amount (NGN)', 'Change vs previous period (%)'],
    ['Gross transaction value', totals.gtv, changes.gtv],
    ['Successful transactions', totals.gtv_count, null],
    ['Refunds & reversals', totals.refunds, changes.refunds],
    ['Runner service earnings (before commission)', totals.runner_earnings, null],
    ['Runner payouts released', totals.payouts, null],
    [],
    ['Runner commissions', totals.commission, changes.commission],
    ['Requester platform fees', totals.service_fee, changes.service_fee],
    ['Cancellation fees', totals.cancellation_fee, null],
    ['Withdrawal fees', totals.withdrawal_fee, null],
    ['Gross company earnings', totals.gross, changes.gross],
    ['Processing & bank costs (Paystack)', -totals.processing, null],
    ['Coupon subsidies', -totals.subsidies, null],
    ['Referral rewards', -totals.referral, null],
    ['Net company revenue', totals.net, changes.net],
    [],
    ['Effective net take rate (%)', rates.net_take_pct, null],
    ['Blended commission (%)', rates.blended_commission_pct, null],
    ['Average requester fee (NGN)', rates.average_service_fee, null],
    ['Refunds share of gross value (%)', rates.refund_share_pct, null],
    [],
    ['Settlement', 'Count', 'Amount (NGN)'],
    ['Reconciled', health.reconciled.count, health.reconciled.amount],
    ['Pending settlement', health.pending.count, health.pending.amount],
    ['Needs reconciliation', health.review.count, health.review.amount],
    [],
    ['Category', 'Errand net revenue (NGN)', 'Share (%)', 'Errands'],
    ...overview.categories.map((c) => [categoryLabel(c.key), c.revenue, c.share_pct, c.count]),
    [],
    ['Service zone', 'Errand net revenue (NGN)', 'Share (%)', 'Net take rate (%)'],
    ...overview.zones.map((z) => [z.zone ?? 'Unassigned', z.revenue, z.share_pct, z.take_rate_pct]),
    [],
    [overview.series.bucket === 'week' ? 'Week starting' : 'Date', 'Until', 'Gross value (NGN)', 'Transactions', 'Net revenue (NGN)'],
    ...overview.series.points.map((p) => [p.start, p.end, p.gtv, p.count, p.net]),
  ];
  return rows.map((row) => row.map(csvCell).join(',')).join('\n');
}
