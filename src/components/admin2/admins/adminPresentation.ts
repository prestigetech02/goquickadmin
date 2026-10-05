import { Laptop, Monitor, Smartphone, Tablet, type LucideIcon } from 'lucide-react';
import type { AdminAccessFilter, AdminAccountItem, AdminAccountsSummary } from '@/api/adminAdminsApi';
import type { Tone } from '../errand/errandPresentation';
import { titleCase } from '../errand/errandPresentation';

export function adminName(admin: AdminAccountItem): string {
  const fromParts = [admin.first_name, admin.last_name].filter(Boolean).join(' ').trim();
  return fromParts || admin.name?.trim() || admin.email || `Admin #${admin.id}`;
}

export function roleLabel(admin: AdminAccountItem): string {
  if (admin.is_super_admin) return 'Super admin';
  if (admin.admin_role) return titleCase(admin.admin_role);
  return 'Staff admin';
}

export function roleTone(admin: AdminAccountItem): Tone {
  if (admin.is_super_admin) return { bg: '#f1ecfb', color: '#6b46c1' };
  if (admin.admin_modules.includes('finance') && !admin.admin_modules.includes('operations')) return { bg: '#eaf6ed', color: '#167d35' };
  return { bg: '#e8f1fb', color: '#2563a8' };
}

export const MODULE_TONES: Record<string, Tone> = {
  operations: { bg: '#e8f1fb', color: '#2563a8' },
  finance: { bg: '#eaf6ed', color: '#167d35' },
  content: { bg: '#fdf0e6', color: '#b5541c' },
  insights: { bg: '#f1ecfb', color: '#6b46c1' },
  administration: { bg: '#eef1ee', color: '#45514a' },
};

export type Presence = { label: string; color: string; detail: string };

/** Online if a session was used in the last 15 minutes; otherwise how recently they were around. */
export function presenceOf(admin: AdminAccountItem, now = Date.now()): Presence {
  const seen = admin.last_seen_at ? new Date(admin.last_seen_at).getTime() : null;
  const minutes = seen != null ? (now - seen) / 60_000 : null;
  if (minutes != null && minutes <= 15) return { label: 'Online', color: '#167d35', detail: 'Active in the last 15 minutes' };
  if (minutes != null && minutes <= 24 * 60) return { label: 'Today', color: '#b06d12', detail: 'Active in the last 24 hours' };
  if ((admin.active_sessions ?? 0) > 0) return { label: 'Signed in', color: '#7c857f', detail: 'Has a live session but has been idle' };
  return { label: 'Offline', color: '#c9d2cc', detail: 'No live session' };
}

export function deviceIcon(deviceType: string | null | undefined): LucideIcon {
  if (deviceType === 'mobile' || deviceType === 'app') return Smartphone;
  if (deviceType === 'tablet') return Tablet;
  if (deviceType === 'desktop') return Monitor;
  return Laptop;
}

export const ACCESS_TABS: Array<{ value: AdminAccessFilter | 'all'; label: string; summaryKey: Exclude<keyof AdminAccountsSummary, 'active_7d'> }> = [
  { value: 'all', label: 'All admins', summaryKey: 'total' },
  { value: 'super', label: 'Super admins', summaryKey: 'super_admins' },
  { value: 'operations', label: 'Operations', summaryKey: 'operations' },
  { value: 'finance', label: 'Finance', summaryKey: 'finance' },
  { value: 'content', label: 'Content', summaryKey: 'content' },
  { value: 'insights', label: 'Insights', summaryKey: 'insights' },
  { value: 'administration', label: 'Administration', summaryKey: 'administration' },
  { value: 'pending', label: 'Pending setup', summaryKey: 'pending_password' },
];
