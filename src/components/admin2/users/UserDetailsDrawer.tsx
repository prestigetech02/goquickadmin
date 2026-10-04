import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Check, Copy, ExternalLink, Mail, Phone } from 'lucide-react';
import { fetchAdminUser } from '@/api/adminUsersApi';
import { UserWalletPanel } from '@/components/payments/UserWalletPanel';
import { Drawer } from '@/components/ui/Drawer';
import { useAuth } from '@/context/AuthContext';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import { canAccessPage, getAdmin2UserHref, getPageHref } from '@/lib/adminNavigation';
import { queryKeys } from '@/lib/queryKeys';
import type { UserListItem, UserReferralSummary } from '@/types/api';
import { formatCount, formatNaira } from '../format';
import { PersonAvatar } from '../errand/parts';
import { Skeleton } from '../overview/primitives';
import { KycBadge, RoleBadge, StatusBadge } from './UserBadges';
import {
  accountStatusOf,
  avatarTone,
  jobsOf,
  joinedLabel,
  kycStatusOf,
  lastActiveLabel,
  userDisplayName,
} from './userPresentation';

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 rounded-[10px] border border-[#e2e8e3] bg-[#f8faf8] px-3 py-2.5">
      <p className="text-[10px] font-medium uppercase tracking-[0.3px] text-[#7c857f]">{label}</p>
      <div className="mt-1 truncate text-[12px] font-semibold text-[#17211b]">{children}</div>
    </div>
  );
}

function ReferralSection({ referrals }: { referrals: UserReferralSummary }) {
  const [copied, setCopied] = useState(false);
  const referrer = referrals.referred_by;

  const copy = async () => {
    if (!referrals.code) return;
    try {
      await navigator.clipboard.writeText(referrals.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.3px] text-[#7c857f]">Referrals</p>
      <div className="grid grid-cols-3 gap-2">
        <Field label="Referral code">
          {referrals.code ? (
            <button
              type="button"
              onClick={() => void copy()}
              title="Copy code"
              className="inline-flex max-w-full items-center gap-1 font-mono tracking-[0.5px] text-[#0d5e27] hover:underline"
            >
              <span className="truncate">{referrals.code}</span>
              {copied ? <Check className="size-[12px] flex-shrink-0" /> : <Copy className="size-[12px] flex-shrink-0 text-[#7c857f]" />}
            </button>
          ) : (
            <span className="font-normal text-[#7c857f]">Not created yet</span>
          )}
        </Field>
        <Field label="Used their code">
          {formatCount(referrals.used_count)}
          <span className="ml-1 text-[10px] font-normal text-[#7c857f]">
            {referrals.pending_count > 0 ? `· ${formatCount(referrals.pending_count)} pending` : ''}
          </span>
        </Field>
        <Field label="Earned">{formatNaira(referrals.earned_total)}</Field>
      </div>
      <p className="text-[10px] leading-[1.45] text-[#7c857f]">
        {formatCount(referrals.used_by.requesters)} requesters and {formatCount(referrals.used_by.runners)} runners signed up with this code;{' '}
        {formatCount(referrals.qualified_count)} earned a bonus ({formatNaira(referrals.bonus_total)}).
        {referrals.welcome_total > 0 ? ` Includes their own ${formatNaira(referrals.welcome_total)} sign-up reward.` : ''}
        {referrer ? ` Referred by ${referrer.name}${referrer.code ? ` (${referrer.code})` : ''}.` : ''}
      </p>
    </div>
  );
}

export function UserDetailsDrawer({
  user,
  onClose,
  onToggleSuspension,
  onMessage,
  busy,
}: {
  user: UserListItem | null;
  onClose: () => void;
  onToggleSuspension: (user: UserListItem) => void;
  onMessage: (user: UserListItem) => void;
  busy: boolean;
}) {
  const { user: adminUser } = useAuth();
  const detailQuery = useQuery({
    queryKey: queryKeys.users.detail(user?.id ?? 0),
    queryFn: () => fetchAdminUser(user!.id),
    enabled: user != null,
  });

  if (!user) return null;

  const detail = detailQuery.data;
  const merged: UserListItem = { ...user, ...(detail ?? {}) };
  const name = userDisplayName(merged);
  const tone = avatarTone(merged);
  const jobs = jobsOf(merged);
  const status = accountStatusOf(merged);
  const isAdmin = merged.role === 'admin';
  const location = [detail?.city ?? merged.city, detail?.state ?? merged.state].filter(Boolean).join(', ');
  const profileHref = isAdmin
    ? getPageHref(canAccessPage(adminUser, 'admin2-admins') ? 'admin2-admins' : 'users', { openId: merged.id })
    : getAdmin2UserHref(merged.id);

  return (
    <Drawer
      open
      onClose={onClose}
      title={name}
      subtitle={`User #${merged.id}`}
      width="lg"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2 font-inter">
          <Link
            to={profileHref}
            className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#167d35] hover:underline"
          >
            Open full profile <ExternalLink className="size-[13px]" />
          </Link>
          {!isAdmin ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onMessage(merged)}
                className="h-[36px] rounded-[8px] border border-[#d4ddd6] bg-white px-[13px] text-[12px] font-semibold text-[#45514a]"
              >
                Send message
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => onToggleSuspension(merged)}
                className={`h-[36px] rounded-[8px] px-[13px] text-[12px] font-semibold text-white disabled:opacity-60 ${
                  merged.is_suspended ? 'bg-[#167d35]' : 'bg-[#b84545]'
                }`}
              >
                {merged.is_suspended ? 'Reactivate' : 'Suspend'}
              </button>
            </div>
          ) : null}
        </div>
      }
    >
      <div className="space-y-5 font-inter">
        <div className="flex items-center gap-3">
          <PersonAvatar name={name} url={merged.avatar_url} tone={tone} size={48} />
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap gap-1.5">
              <RoleBadge role={merged.role} />
              <StatusBadge status={status} />
              <KycBadge status={kycStatusOf(merged)} />
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[#45514a]">
              {merged.email ? (
                <a href={`mailto:${merged.email}`} className="inline-flex items-center gap-1 hover:text-[#167d35]">
                  <Mail className="size-[12px]" /> {merged.email}
                </a>
              ) : null}
              {merged.phone ? (
                <a href={`tel:${merged.phone}`} className="inline-flex items-center gap-1 hover:text-[#167d35]">
                  <Phone className="size-[12px]" /> {merged.phone}
                </a>
              ) : null}
            </div>
          </div>
        </div>

        {detailQuery.isError ? (
          <p className="rounded-[8px] bg-[#fdeded] px-3 py-2 text-[11px] font-medium text-[#b84545]">
            {getApiErrorMessage(detailQuery.error, 'Could not load the full profile.')}
          </p>
        ) : null}

        <div className="grid grid-cols-2 gap-2">
          <Field label="Location">{location || '—'}</Field>
          <Field label={jobs.unit === 'staff' ? 'Role' : `Total ${jobs.unit}`}>{jobs.unit === 'staff' ? 'Staff admin' : jobs.value}</Field>
          <Field label="Joined">{joinedLabel(merged.created_at)}</Field>
          <Field label="Last active">{lastActiveLabel(merged.last_active_at)}</Field>
          <Field label="Wallet balance">
            {isAdmin || merged.wallet_balance == null ? '—' : formatNaira(merged.wallet_balance)}
          </Field>
          <Field label="Phone verified">{merged.phone_verified ? 'Yes' : 'No'}</Field>
        </div>

        {!isAdmin && detail?.referrals ? <ReferralSection referrals={detail.referrals} /> : null}

        {detailQuery.isLoading ? <Skeleton className="h-[120px] w-full" /> : null}

        {!isAdmin && detail ? (
          <UserWalletPanel
            userId={merged.id}
            canAdjust={Boolean(adminUser?.permissions.is_super_admin || adminUser?.permissions.can_manage_finance)}
          />
        ) : null}
      </div>
    </Drawer>
  );
}
