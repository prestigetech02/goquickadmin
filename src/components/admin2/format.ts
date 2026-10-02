const NAIRA = '\u20A6';

export function formatNaira(amount: number): string {
  return `${NAIRA}${Math.round(amount).toLocaleString('en-NG')}`;
}

export function formatCount(value: number): string {
  return value.toLocaleString('en-NG');
}

export function formatPct(value: number | null | undefined, digits = 1): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return `${Number(value.toFixed(digits))}%`;
}

export function formatSignedPct(value: number): string {
  return `${value > 0 ? '+' : ''}${Number(value.toFixed(1))}%`;
}

export function formatMinutes(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  if (value >= 60) {
    const hours = value / 60;
    return `${Number(hours.toFixed(1))}h`;
  }
  return `${Math.round(value)}m`;
}

/** Compact age for queue items: 42m, 26h, 3d. */
export function shortAge(iso: string | null | undefined): string {
  if (!iso) return '';
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60_000));
  if (minutes < 60) return `${Math.max(1, minutes)}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

/** Relative time for table rows: 8 min ago, 1 hr ago, 3 days ago. */
export function relativeAgo(iso: string | null | undefined): string {
  if (!iso) return '—';
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60_000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function personInitials(name: string | null | undefined): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '—';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

export function partyName(party: { first_name: string | null; last_name: string | null; email?: string | null } | null | undefined): string | null {
  if (!party) return null;
  const name = [party.first_name, party.last_name].filter(Boolean).join(' ').trim();
  return name || party.email || null;
}

export function parseDate(value: string): Date {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** 1–29 Sep 2026, 23 Aug – 5 Sep 2026, 20 Dec 2025 – 3 Jan 2026 */
export function formatDateRange(start: string, end: string): string {
  const s = parseDate(start);
  const e = parseDate(end);
  const month = (d: Date) => d.toLocaleDateString('en-GB', { month: 'short' });
  if (s.getFullYear() !== e.getFullYear()) {
    return `${s.getDate()} ${month(s)} ${s.getFullYear()} – ${e.getDate()} ${month(e)} ${e.getFullYear()}`;
  }
  if (s.getMonth() !== e.getMonth()) {
    return `${s.getDate()} ${month(s)} – ${e.getDate()} ${month(e)} ${e.getFullYear()}`;
  }
  if (s.getDate() === e.getDate()) {
    return `${s.getDate()} ${month(s)} ${s.getFullYear()}`;
  }
  return `${s.getDate()}–${e.getDate()} ${month(e)} ${e.getFullYear()}`;
}
