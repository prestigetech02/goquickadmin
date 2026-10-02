import type {
  AdminWithdrawalFilters,
  AdminWithdrawalRow,
  AdminWithdrawalsOverview,
  RiskTone,
  WithdrawalKycStatus,
  WithdrawalStage,
} from '@/types/api';
import type { Tone } from '../transactions/presentation';

const GREEN: Tone = { bg: '#eaf6ed', color: '#0d5e27' };
const BLUE: Tone = { bg: '#eef5fb', color: '#2c73b9' };
const PURPLE: Tone = { bg: '#f3f0fa', color: '#735ca8' };
const AMBER: Tone = { bg: '#fff5e5', color: '#b06d12' };
const RED: Tone = { bg: '#fdeded', color: '#b84545' };

export const STAGE_LABELS: Record<WithdrawalStage, string> = {
  pending: 'Pending',
  approved: 'Approved',
  processing: 'Processing',
  paid: 'Paid',
  rejected: 'Rejected',
};

const STAGE_TONES: Record<WithdrawalStage, Tone> = {
  pending: AMBER,
  approved: BLUE,
  processing: PURPLE,
  paid: GREEN,
  rejected: RED,
};

export function stageTone(stage: WithdrawalStage): Tone {
  return STAGE_TONES[stage] ?? AMBER;
}

/** Status chip for a row; a failed transfer on an approved request reads as "Payout failed". */
export function rowStatus(row: Pick<AdminWithdrawalRow, 'stage' | 'status' | 'payout_status'>): { label: string; tone: Tone } {
  if (row.status === 'cancelled') return { label: 'Cancelled', tone: RED };
  if (row.stage === 'approved' && (row.payout_status === 'failed' || row.payout_status === 'reversed')) {
    return { label: row.payout_status === 'reversed' ? 'Payout reversed' : 'Payout failed', tone: RED };
  }
  return { label: STAGE_LABELS[row.stage], tone: stageTone(row.stage) };
}

export const RISK_TONES: Record<RiskTone, Tone> = { green: GREEN, amber: AMBER, red: RED };

export const KYC_LABELS: Record<WithdrawalKycStatus, string> = {
  verified: 'Verified',
  pending: 'Pending review',
  needs_review: 'Rejected · needs review',
  unverified: 'Not verified',
};

export type QueueStage = WithdrawalStage | 'all';

export function stageTabs(overview?: AdminWithdrawalsOverview): Array<{ value: QueueStage; label: string; count?: number | null }> {
  const kpis = overview?.kpis;
  return [
    { value: 'pending', label: 'Pending', count: kpis?.pending.count },
    { value: 'approved', label: 'Approved', count: kpis?.approved.awaiting_count },
    { value: 'processing', label: 'Processing', count: kpis?.approved.processing_count },
    { value: 'paid', label: 'Paid' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'all', label: 'All' },
  ];
}

export type QueueFilters = {
  stage: QueueStage;
  bank: string;
  amount: '' | NonNullable<AdminWithdrawalFilters['amount']>;
  risk: '' | NonNullable<AdminWithdrawalFilters['risk']>;
  useRange: boolean;
};

export const DEFAULT_QUEUE_FILTERS: QueueFilters = {
  stage: 'pending',
  bank: '',
  amount: '',
  risk: '',
  useRange: false,
};

export const AMOUNT_OPTIONS = [
  { value: '', label: 'Any' },
  { value: 'under_10k', label: 'Under ₦10,000' },
  { value: '10k_50k', label: '₦10,000 – ₦50,000' },
  { value: '50k_100k', label: '₦50,000 – ₦100,000' },
  { value: 'over_100k', label: '₦100,000+' },
];

export const RISK_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'flagged', label: 'Any risk signal' },
  { value: 'clear', label: 'No signals' },
  { value: 'payout_failed', label: 'Payout failed' },
  { value: 'shared_account', label: 'Shared account' },
  { value: 'name_mismatch', label: 'Name mismatch' },
  { value: 'kyc_unverified', label: 'KYC not verified' },
  { value: 'first_payout', label: 'First payout' },
];

export function bankOptions(banks: string[] | undefined) {
  return [{ value: '', label: 'All banks' }, ...(banks ?? []).map((bank) => ({ value: bank, label: bank }))];
}

export function queueParams(filters: QueueFilters, search: string, range: { start: string; end: string }): AdminWithdrawalFilters {
  const params: AdminWithdrawalFilters = { stage: filters.stage };
  if (filters.bank) params.bank = filters.bank;
  if (filters.amount) params.amount = filters.amount;
  if (filters.risk) params.risk = filters.risk;
  if (search.trim()) params.search = search.trim();
  if (filters.useRange) {
    params.start_date = range.start;
    params.end_date = range.end;
  }
  return params;
}

export function bankLine(bank: { name: string | null; account_masked: string | null }): string {
  return [bank.name, bank.account_masked].filter(Boolean).join(' · ') || '—';
}
