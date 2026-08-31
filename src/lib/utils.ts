import type { AdminUser } from '@/types';

export function adminDisplayName(user: AdminUser | null | undefined): string {
  if (!user) return 'Admin';
  const name = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
  return name || user.email || 'Admin';
}

export function adminInitial(user: AdminUser | null | undefined): string {
  return adminDisplayName(user).charAt(0).toUpperCase();
}

export function adminRoleLabel(user: AdminUser | null | undefined): string {
  if (!user) return 'admin';
  return (user.admin_role || user.role || 'admin').replace(/_/g, ' ');
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatErrandCode(id: number | string | null | undefined): string {
  const n = Number(id);
  if (!Number.isFinite(n) || n <= 0) return '—';
  return `ER-${String(Math.trunc(n)).padStart(6, '0')}`;
}

export function partyDisplayName(
  party: { first_name?: string | null; last_name?: string | null; email?: string | null } | null | undefined,
): string {
  if (!party) return '';
  const name = [party.first_name, party.last_name].filter(Boolean).join(' ').trim();
  return name || party.email || '';
}

export function formatListedAmount(errand: {
  base_price?: number | null;
  budget_min?: number | null;
  budget_max?: number | null;
}): string {
  const amount = errand.base_price ?? errand.budget_min ?? errand.budget_max;
  if (amount == null || !Number.isFinite(Number(amount))) return '—';
  return formatCurrency(Number(amount));
}

export function formatBudgetRange(min: number | null | undefined, max: number | null | undefined): string {
  if (min == null && max == null) return '—';
  if (min != null && max != null) {
    if (Math.abs(min - max) < 0.005) return formatCurrency(min);
    return `${formatCurrency(min)} – ${formatCurrency(max)}`;
  }
  if (min != null) return formatCurrency(min);
  return formatCurrency(max as number);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(date: string): string {
  return new Date(date).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(date);
}

export function statusColor(status: string): string {
  const map: Record<string, string> = {
    active: 'bg-success-100 text-success-700',
    online: 'bg-success-100 text-success-700',
    completed: 'bg-success-100 text-success-700',
    approved: 'bg-success-100 text-success-700',
    verified: 'bg-success-100 text-success-700',
    paid: 'bg-success-100 text-success-700',
    resolved: 'bg-success-100 text-success-700',
    published: 'bg-success-100 text-success-700',
    awaiting_user: 'bg-warning-100 text-warning-700',
    closed: 'bg-ink-100 text-ink-600',
    pending: 'bg-warning-100 text-warning-700',
    in_transit: 'bg-brand-100 text-brand-700',
    in_progress: 'bg-brand-100 text-brand-700',
    busy: 'bg-warning-100 text-warning-700',
    investigating: 'bg-warning-100 text-warning-700',
    draft: 'bg-ink-100 text-ink-600',
    offline: 'bg-ink-100 text-ink-600',
    inactive: 'bg-ink-100 text-ink-600',
    unpaid: 'bg-error-100 text-error-700',
    cancelled: 'bg-error-100 text-error-700',
    rejected: 'bg-error-100 text-error-700',
    suspended: 'bg-error-100 text-error-700',
    open: 'bg-error-100 text-error-700',
    refunded: 'bg-error-100 text-error-700',
    error: 'bg-error-100 text-error-700',
    warning: 'bg-warning-100 text-warning-700',
    urgent: 'bg-error-100 text-error-700',
    high: 'bg-error-100 text-error-700',
    medium: 'bg-warning-100 text-warning-700',
    low: 'bg-ink-100 text-ink-600',
    info: 'bg-brand-100 text-brand-700',
  };
  return map[status.toLowerCase()] || 'bg-ink-100 text-ink-600';
}

export function titleCase(str: string): string {
  return str
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function downloadCSV(data: Record<string, unknown>[], filename: string) {
  if (data.length === 0) return;
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map((row) =>
      headers
        .map((header) => {
          const value = row[header];
          const str = value === null || value === undefined ? '' : String(value);
          return `"${str.replace(/"/g, '""')}"`;
        })
        .join(',')
    ),
  ].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
