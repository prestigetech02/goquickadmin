import type { AdminTransactionFilters, AdminTransactionRow, TransactionKind, TransactionMethodKey, TransactionTab } from '@/types/api';

export type Tone = { bg: string; color: string };

const GREEN: Tone = { bg: '#eaf6ed', color: '#0d5e27' };
const BLUE: Tone = { bg: '#eef5fb', color: '#2c73b9' };
const PURPLE: Tone = { bg: '#f3f0fa', color: '#735ca8' };
const AMBER: Tone = { bg: '#fff5e5', color: '#b06d12' };
const RED: Tone = { bg: '#fdeded', color: '#b84545' };
const GRAY: Tone = { bg: '#f1f4f2', color: '#45514a' };

export const KIND_LABELS: Record<TransactionKind, string> = {
  payment: 'Payment',
  escrow: 'Escrow',
  release: 'Release',
  refund: 'Refund',
  withdrawal: 'Withdrawal',
  fee: 'Fee',
  adjustment: 'Adjustment',
  referral: 'Referral',
  other: 'Other',
};

const KIND_TONES: Record<TransactionKind, Tone> = {
  payment: GREEN,
  escrow: PURPLE,
  release: BLUE,
  refund: RED,
  withdrawal: AMBER,
  fee: AMBER,
  adjustment: GRAY,
  referral: GREEN,
  other: GRAY,
};

export function kindTone(kind: TransactionKind): Tone {
  return KIND_TONES[kind] ?? GRAY;
}

const STATUS_LABELS: Record<string, string> = {
  successful: 'Successful',
  pending: 'Pending',
  failed: 'Failed',
  reversed: 'Reversed',
  held: 'Held',
  released: 'Released',
  refunded: 'Refunded',
  requested: 'Requested',
  processing: 'Processing',
  paid: 'Paid out',
  rejected: 'Rejected',
  settled: 'Settled',
};

export function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function statusTone(status: string): Tone {
  if (['successful', 'paid', 'released', 'settled'].includes(status)) return GREEN;
  if (['pending', 'requested', 'processing'].includes(status)) return AMBER;
  if (status === 'held') return PURPLE;
  if (status === 'refunded') return BLUE;
  if (['failed', 'rejected'].includes(status)) return RED;
  return GRAY;
}

export const METHOD_COLORS: Record<TransactionMethodKey, string> = {
  card: '#167d35',
  bank_transfer: '#3478b7',
  ussd: '#b06d12',
  other: '#a9b3ac',
};

export const CHANNEL_LABELS: Record<TransactionMethodKey, string> = {
  card: 'Card',
  bank_transfer: 'Transfer',
  ussd: 'USSD',
  other: 'Other',
};

export function providerLabel(row: Pick<AdminTransactionRow, 'provider' | 'channel'>): { title: string; detail: string | null } {
  if (row.provider === 'wallet') return { title: 'Wallet', detail: 'Internal' };
  return { title: 'Paystack', detail: row.channel ? CHANNEL_LABELS[row.channel] : null };
}

export function userTone(role: string | null | undefined): Tone {
  if (role === 'runner') return BLUE;
  if (role === 'admin') return PURPLE;
  return GREEN;
}

export const TABS: Array<{ value: TransactionTab; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'payments', label: 'Payments' },
  { value: 'escrow', label: 'Escrow' },
  { value: 'refunds', label: 'Refunds' },
  { value: 'fees', label: 'Fees' },
];

export type LedgerFilters = {
  tab: TransactionTab;
  status: '' | NonNullable<AdminTransactionFilters['status']>;
  direction: '' | NonNullable<AdminTransactionFilters['direction']>;
  provider: '' | NonNullable<AdminTransactionFilters['provider']>;
  amount: '' | NonNullable<AdminTransactionFilters['amount']>;
  useRange: boolean;
};

export const DEFAULT_LEDGER_FILTERS: LedgerFilters = {
  tab: 'all',
  status: '',
  direction: '',
  provider: '',
  amount: '',
  useRange: true,
};

export const STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'successful', label: 'Successful' },
  { value: 'pending', label: 'Pending' },
  { value: 'held', label: 'Held in escrow' },
  { value: 'failed', label: 'Failed' },
  { value: 'reversed', label: 'Reversed' },
];

export const DIRECTION_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'credit', label: 'Money in (credit)' },
  { value: 'debit', label: 'Money out (debit)' },
];

export const PROVIDER_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'paystack', label: 'Paystack' },
  { value: 'wallet', label: 'Wallet (internal)' },
];

export const AMOUNT_OPTIONS = [
  { value: '', label: 'Any' },
  { value: 'under_5k', label: 'Under ₦5,000' },
  { value: '5k_20k', label: '₦5,000 – ₦20,000' },
  { value: '20k_100k', label: '₦20,000 – ₦100,000' },
  { value: 'over_100k', label: '₦100,000+' },
];

export function ledgerParams(
  filters: LedgerFilters,
  search: string,
  range: { start: string; end: string },
): AdminTransactionFilters {
  const params: AdminTransactionFilters = { tab: filters.tab };
  if (filters.status) params.status = filters.status;
  if (filters.direction) params.direction = filters.direction;
  if (filters.provider) params.provider = filters.provider;
  if (filters.amount) params.amount = filters.amount;
  if (search.trim()) params.search = search.trim();
  if (filters.useRange) {
    params.start_date = range.start;
    params.end_date = range.end;
  }
  return params;
}
