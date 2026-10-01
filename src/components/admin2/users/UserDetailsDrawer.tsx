import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ExternalLink, Mail, Phone } from 'lucide-react';
import { fetchAdminUser } from '@/api/adminUsersApi';
import { UserWalletPanel } from '@/components/payments/UserWalletPanel';
import { Drawer } from '@/components/ui/Drawer';
import { useAuth } from '@/context/AuthContext';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import { getAdmin2UserHref, getPageHref } from '@/lib/adminNavigation';
import { queryKeys } from '@/lib/queryKeys';
import type { UserListItem } from '@/types/api';
import { formatNaira, personInitials } from '../format';
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
  const profileHref = isAdmin ? getPageHref('users', { openId: merged.id }) : getAdmin2UserHref(merged.id);

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
          {merged.avatar_url ? (
            <img src={merged.avatar_url} alt="" className="size-[48px] rounded-full object-cover" />
          ) : (
            <span
              className="flex size-[48px] items-center justify-center rounded-full text-[15px] font-bold"
              style={{ backgroundColor: tone.bg, color: tone.color }}
            >
              {personInitials(name)}
            </span>
          )}
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
