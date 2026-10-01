import type { UserAccountStatus, UserKycStatus, UserListItem } from '@/types/api';

export type Tone = { bg: string; color: string };

const GREEN: Tone = { bg: '#eaf6ed', color: '#0d5e27' };
const BLUE: Tone = { bg: '#eef5fb', color: '#3477b8' };
const PURPLE: Tone = { bg: '#f3f0fa', color: '#7257a7' };
const AMBER: Tone = { bg: '#fff5e5', color: '#b06d12' };
const RED: Tone = { bg: '#fdeded', color: '#b84545' };
export const GRAY: Tone = { bg: '#f8faf8', color: '#45514a' };

export const ROLE_LABELS: Record<string, string> = { buyer: 'Requester', runner: 'Runner', admin: 'Admin' };
export const ROLE_TONES: Record<string, Tone> = { buyer: GREEN, runner: BLUE, admin: PURPLE };

export const STATUS_LABELS: Record<UserAccountStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
  suspended: 'Suspended',
  deleted: 'Deleted',
};
export const STATUS_TONES: Record<UserAccountStatus, Tone> = { active: GREEN, inactive: GRAY, suspended: RED, deleted: GRAY };

export const KYC_LABELS: Record<UserKycStatus, string> = {
  verified: 'Verified',
  pending: 'Pending',
  needs_review: 'Needs review',
  unverified: 'Unverified',
};
export const KYC_TONES: Record<UserKycStatus, Tone> = { verified: GREEN, pending: AMBER, needs_review: RED, unverified: GRAY };

export function avatarTone(user: Pick<UserListItem, 'role' | 'is_suspended'>): Tone {
  if (user.is_suspended) return RED;
  if (user.role === 'admin') return PURPLE;
  if (user.role === 'runner') return BLUE;
  return { bg: GREEN.bg, color: '#167d35' };
}

export function userDisplayName(user: Pick<UserListItem, 'first_name' | 'last_name' | 'name' | 'email'>): string {
  return [user.first_name, user.last_name].filter(Boolean).join(' ').trim() || user.name || user.email || 'Unnamed user';
}

export function accountStatusOf(user: UserListItem): UserAccountStatus {
  return user.account_status ?? (user.is_suspended ? 'suspended' : 'active');
}

export function kycStatusOf(user: UserListItem): UserKycStatus {
  if (user.kyc_status) return user.kyc_status;
  return user.role === 'admin' || user.phone_verified || user.email_verified_at ? 'verified' : 'unverified';
}

export function jobsOf(user: UserListItem): { value: string; unit: string } {
  if (user.role === 'runner') return { value: user.errands_as_runner_count.toLocaleString('en-NG'), unit: 'jobs' };
  if (user.role === 'buyer') return { value: user.errands_as_buyer_count.toLocaleString('en-NG'), unit: 'errands' };
  return { value: '—', unit: 'staff' };
}

export function lastActiveLabel(iso: string | null | undefined): string {
  if (!iso) return 'Never';
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 2) return 'Now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 60) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function joinedLabel(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
