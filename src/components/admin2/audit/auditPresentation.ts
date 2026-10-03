import type { AdminAuditLogEntry } from '@/types/api';

export type Tone = { bg: string; color: string };

export type AuditTab = 'all' | 'failed' | 'approved' | 'sign_ins';

export const AUDIT_TABS: Array<{ value: AuditTab; label: string }> = [
  { value: 'all', label: 'All activity' },
  { value: 'failed', label: 'Failed or rejected' },
  { value: 'approved', label: 'Super admin approved' },
  { value: 'sign_ins', label: 'Sign-ins' },
];

const METHOD_TONES: Record<string, Tone> = {
  POST: { bg: '#eaf6ed', color: '#167d35' },
  PUT: { bg: '#e8f1fb', color: '#2563a8' },
  PATCH: { bg: '#e8f1fb', color: '#2563a8' },
  DELETE: { bg: '#fdeded', color: '#b84545' },
  GET: { bg: '#f1f4f2', color: '#45514a' },
};

export function methodTone(method: string): Tone {
  return METHOD_TONES[method.toUpperCase()] ?? METHOD_TONES.GET;
}

const AREA_PALETTE: Tone[] = [
  { bg: '#eaf6ed', color: '#167d35' },
  { bg: '#e8f1fb', color: '#2563a8' },
  { bg: '#f1ecfb', color: '#6b46c1' },
  { bg: '#fff5e5', color: '#b06d12' },
  { bg: '#e6f6f4', color: '#0f766e' },
  { bg: '#fdeef6', color: '#a83279' },
];

export function areaTone(resource: string): Tone {
  if (resource === 'auth') return { bg: '#f1f4f2', color: '#45514a' };
  let hash = 0;
  for (const char of resource) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return AREA_PALETTE[hash % AREA_PALETTE.length];
}

export function areaLabel(resource: string): string {
  if (resource === 'auth') return 'Sign-in';
  return resource
    .split('_')
    .map((word, index) => (index === 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word))
    .join(' ');
}

export function outcomeOf(entry: AdminAuditLogEntry): { label: string; tone: Tone } {
  if (entry.succeeded) return { label: 'Success', tone: { bg: '#eaf6ed', color: '#167d35' } };
  const code = entry.status_code;
  if (code === 403) return { label: 'Forbidden', tone: { bg: '#fdeded', color: '#b84545' } };
  if (code === 422) return { label: 'Rejected', tone: { bg: '#fff5e5', color: '#b06d12' } };
  return { label: code ? `Failed ${code}` : 'Failed', tone: { bg: '#fdeded', color: '#b84545' } };
}

/** Full timestamp in Lagos time, e.g. "3 Oct 2026, 14:05:09". */
export function auditTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', {
    timeZone: 'Africa/Lagos',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function auditClock(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-GB', { timeZone: 'Africa/Lagos', hour: '2-digit', minute: '2-digit' });
}

/** Submitted data minus the bookkeeping keys the logger adds, which are shown separately. */
export function submittedData(payload: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!payload) return null;
  const rest = Object.fromEntries(Object.entries(payload).filter(([key]) => key !== '_approved_by' && key !== '_route'));
  return Object.keys(rest).length ? rest : null;
}
