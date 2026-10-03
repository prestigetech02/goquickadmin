import type { PageKey } from '@/lib/adminNavigation';
import type { SystemHealthComponent, SystemHealthStatus } from '@/types/api';

export type Tone = { bg: string; color: string };

const GREEN: Tone = { bg: '#eaf6ed', color: '#167d35' };
const AMBER: Tone = { bg: '#fff5e5', color: '#b06d12' };
const RED: Tone = { bg: '#fdeded', color: '#b84545' };
const BLUE: Tone = { bg: '#e8f1fb', color: '#2563a8' };

export function statusTone(status: string): Tone {
  const s = status.toLowerCase();
  if (['healthy', 'up', 'configured'].includes(s)) return GREEN;
  if (['degraded', 'warning', 'missing'].includes(s)) return AMBER;
  if (s === 'info') return BLUE;
  return RED;
}

export function statusLabel(status: string): string {
  const s = status.toLowerCase();
  if (s === 'missing') return 'Not set up';
  if (s === 'down') return 'Down';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function isProblem(component: SystemHealthComponent): boolean {
  return !['healthy', 'up', 'configured'].includes(component.status.toLowerCase());
}

export const OVERALL: Record<SystemHealthStatus, { title: string; tone: Tone; border: string; surface: string }> = {
  healthy: { title: 'All systems operational', tone: GREEN, border: '#cfe8d6', surface: '#f3faf5' },
  degraded: { title: 'Running, but needs attention', tone: AMBER, border: '#f3e1c2', surface: '#fffaf1' },
  unhealthy: { title: 'Critical issue detected', tone: RED, border: '#f2cccc', surface: '#fff6f6' },
};

const CORE_KEYS = ['database', 'cache', 'queue', 'storage'];

export function splitComponents(components: SystemHealthComponent[]) {
  return {
    core: components.filter((c) => CORE_KEYS.includes(c.key)).sort((a, b) => CORE_KEYS.indexOf(a.key) - CORE_KEYS.indexOf(b.key)),
    integrations: components.filter((c) => !CORE_KEYS.includes(c.key)),
  };
}

export function latencyTone(ms: number | undefined): Tone {
  if (ms == null) return { bg: '#f1f4f2', color: '#45514a' };
  if (ms < 50) return GREEN;
  if (ms < 250) return AMBER;
  return RED;
}

/** Where an operational alert can be dealt with in admin2. */
export function alertTarget(title: string): { page: PageKey; label: string } | null {
  const t = title.toLowerCase();
  if (t.includes('kyc')) return { page: 'admin2-verifications', label: 'Review KYC' };
  if (t.includes('dispute')) return { page: 'admin2-disputes', label: 'Open disputes' };
  if (t.includes('withdrawal')) return { page: 'admin2-withdrawals', label: 'Review withdrawals' };
  if (t.includes('errand')) return { page: 'admin2-errands', label: 'View errands' };
  return null;
}

/** Laravel log timestamps are "2026-10-03 14:05:09" in the server's timezone. */
export function issueTime(raw: string): string {
  const parsed = new Date(raw.replace(' ', 'T'));
  if (Number.isNaN(parsed.getTime())) return raw;
  return parsed.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}
