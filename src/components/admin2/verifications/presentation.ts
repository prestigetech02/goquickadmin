import { Bike, IdCard, Landmark, ScanFace, Users, type LucideIcon } from 'lucide-react';
import type { AdminKycFilters, AdminKycOverview, AdminKycRow, KycCheck, KycCheckKey, KycStage, RiskTone } from '@/types/api';
import type { Tone } from '../transactions/presentation';

const GREEN: Tone = { bg: '#eaf6ed', color: '#0d5e27' };
const BLUE: Tone = { bg: '#eef5fb', color: '#2c73b9' };
const AMBER: Tone = { bg: '#fff5e5', color: '#b06d12' };
const RED: Tone = { bg: '#fdeded', color: '#b84545' };
const GRAY: Tone = { bg: '#f1f4f2', color: '#45514a' };

export const RISK_TONES: Record<RiskTone, Tone> = { green: GREEN, amber: AMBER, red: RED };

export const STAGE_LABELS: Record<KycStage, string> = {
  ready: 'Ready for review',
  incomplete: 'Incomplete',
  approved: 'Approved',
  rejected: 'Rejected',
};

const STAGE_TONES: Record<KycStage, Tone> = { ready: BLUE, incomplete: GRAY, approved: GREEN, rejected: RED };

export function statusChip(row: Pick<AdminKycRow, 'stage' | 'sla_breached'>): { label: string; tone: Tone } {
  if (row.sla_breached) return { label: 'Overdue', tone: AMBER };
  return { label: row.stage === 'ready' ? 'Awaiting review' : STAGE_LABELS[row.stage], tone: STAGE_TONES[row.stage] };
}

/** Summary label plus a count of the other risk signals not already named. */
export function riskChipLabel(row: Pick<AdminKycRow, 'risk' | 'risks'>): string {
  const others = row.risks.filter((risk) => risk.label !== row.risk.label).length;
  return others > 0 ? `${row.risk.label} +${others}` : row.risk.label;
}

export const CHECK_ICONS: Record<KycCheckKey, LucideIcon> = {
  id_document: IdCard,
  selfie: ScanFace,
  guarantors: Users,
  payout: Landmark,
  vehicle_area: Bike,
};

export const CHECK_COLORS: Record<KycCheck['status'], { color: string; bg: string; label: string }> = {
  pass: { color: '#167d35', bg: '#eaf6ed', label: 'Done' },
  warn: { color: '#b06d12', bg: '#fff5e5', label: 'Check' },
  missing: { color: '#9aa39d', bg: '#f1f4f2', label: 'Missing' },
};

export type QueueStage = KycStage | 'all';

export function stageTabs(overview?: AdminKycOverview): Array<{ value: QueueStage; label: string; count?: number | null }> {
  const counts = overview?.tab_counts;
  return [
    { value: 'ready', label: 'Ready for review', count: counts?.ready },
    { value: 'incomplete', label: 'Incomplete', count: counts?.incomplete },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'all', label: 'All' },
  ];
}

export type QueueFilters = {
  stage: QueueStage;
  documentType: string;
  risk: '' | NonNullable<AdminKycFilters['risk']>;
  useRange: boolean;
};

export const DEFAULT_QUEUE_FILTERS: QueueFilters = { stage: 'ready', documentType: '', risk: '', useRange: false };

export const RISK_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'flagged', label: 'Any risk signal' },
  { value: 'clear', label: 'All checks passed' },
  { value: 'missing', label: 'Missing items' },
  { value: 'duplicate_id', label: 'Duplicate ID number' },
  { value: 'duplicate_bvn', label: 'Duplicate BVN' },
  { value: 'shared_account', label: 'Shared payout account' },
  { value: 'underage', label: 'Under 18' },
  { value: 'name_mismatch', label: 'Account name mismatch' },
  { value: 'guarantor_conflict', label: 'Guarantor conflict' },
  { value: 'sla_breached', label: 'Past review target' },
];

export function documentOptions(types: string[] | undefined) {
  return [{ value: '', label: 'All documents' }, ...(types ?? []).map((type) => ({ value: type, label: type }))];
}

export function queueParams(filters: QueueFilters, search: string, range: { start: string; end: string }): AdminKycFilters {
  const params: AdminKycFilters = { stage: filters.stage };
  if (filters.documentType) params.document_type = filters.documentType;
  if (filters.risk) params.risk = filters.risk;
  if (search.trim()) params.search = search.trim();
  if (filters.useRange) {
    params.start_date = range.start;
    params.end_date = range.end;
  }
  return params;
}

export const REJECTION_PRESETS = [
  'ID document is blurry or unreadable',
  "Selfie doesn't match the photo on the ID",
  'ID document has expired',
  'Guarantor details are incomplete or unreachable',
  "Bank account name doesn't match your profile",
  'ID number is already linked to another account',
];

export const DUPLICATE_FIELDS: Record<'id_number' | 'bvn' | 'account', string> = {
  id_number: 'Same ID number',
  bvn: 'Same BVN',
  account: 'Same payout account',
};
