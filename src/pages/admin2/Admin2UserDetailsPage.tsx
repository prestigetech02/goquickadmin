import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { AlertCircle, ArrowLeft, Bike, Copy, ExternalLink, LogOut, Pencil, ReceiptText, RefreshCw } from 'lucide-react';
import { fetchAdminUserProfile } from '@/api/adminUsersApi';
import { Chip } from '@/components/admin2/errand/parts';
import { formatCount } from '@/components/admin2/format';
import { watDate } from '@/components/admin2/errand/errandPresentation';
import { Skeleton } from '@/components/admin2/overview/primitives';
import { ActionMenu } from '@/components/admin2/users/ActionMenu';
import { SendMessageModal } from '@/components/admin2/users/SendMessageModal';
import {
  KYC_LABELS,
  KYC_TONES,
  ROLE_LABELS,
  STATUS_LABELS,
  STATUS_TONES,
  lastActiveLabel,
} from '@/components/admin2/users/userPresentation';
import { AccountActionsCard, type UserAction } from '@/components/admin2/userDetails/AccountActionsCard';
import { AccountActivityCard } from '@/components/admin2/userDetails/AccountActivityCard';
import { IdentityCard } from '@/components/admin2/userDetails/IdentityCard';
import { ReferralsCard } from '@/components/admin2/userDetails/ReferralsCard';
import { SavedLocationsCard } from '@/components/admin2/userDetails/SavedLocationsCard';
import { SupportRiskCard } from '@/components/admin2/userDetails/SupportRiskCard';
import { UserActionModals, type UserModal } from '@/components/admin2/userDetails/UserActionModals';
import { UserErrandsCard } from '@/components/admin2/userDetails/UserErrandsCard';
import { UserMetricCards } from '@/components/admin2/userDetails/UserMetricCards';
import { VerificationCard } from '@/components/admin2/userDetails/VerificationCard';
import { WalletActivityCard } from '@/components/admin2/userDetails/WalletActivityCard';
import { useAuth } from '@/context/AuthContext';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import { canAccessPage, getAdmin2RunnerHref, getAdmin2UserId, getPageHref, getPagePath } from '@/lib/adminNavigation';
import { queryKeys } from '@/lib/queryKeys';
import type { UserAccountStatus, UserKycStatus } from '@/types/api';

const OUTLINE_BUTTON =
  'flex h-[38px] items-center justify-center gap-[6px] rounded-[24px] border border-[#1a7a0a] bg-white px-[18px] text-[12px] font-bold text-[#1a7a0a] transition-colors hover:bg-[#f3faf5] disabled:cursor-not-allowed disabled:opacity-50';
const PRIMARY_BUTTON =
  'flex h-[38px] items-center justify-center rounded-[24px] bg-[#1a7a0a] px-[18px] text-[12px] font-bold text-white transition-colors hover:bg-[#156608] disabled:cursor-not-allowed disabled:opacity-50';

export function Admin2UserDetailsPage() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user: admin } = useAuth();
  const userId = getAdmin2UserId(pathname) ?? 0;
  const [modal, setModal] = useState<UserModal | null>(null);
  const [messaging, setMessaging] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const profileQuery = useQuery({
    queryKey: queryKeys.users.profile(userId),
    queryFn: () => fetchAdminUserProfile(userId),
    enabled: userId > 0,
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  });
  const profile = profileQuery.data;
  const directoryPath = getPagePath('admin2-users');

  if (profileQuery.isLoading || (!profile && !profileQuery.isError)) {
    return (
      <div className="flex w-full flex-col gap-[20px]">
        <Skeleton className="h-[64px] w-[420px]" />
        <div className="grid grid-cols-2 gap-[12px] xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-[126px] w-full rounded-[12px]" />
          ))}
        </div>
        <Skeleton className="h-[220px] w-full rounded-[12px]" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-[12px] border border-[#f1d4d4] bg-[#fff0f0] p-[18px] text-[12px] text-[#b84545]">
        <span className="flex items-center gap-2 font-semibold">
          <AlertCircle className="size-4" />
          {getApiErrorMessage(profileQuery.error, 'Could not load this user.')}
        </span>
        <div className="flex gap-3">
          <button type="button" onClick={() => void profileQuery.refetch()} className="flex items-center gap-1 font-semibold hover:underline">
            <RefreshCw className="size-3.5" /> Retry
          </button>
          <Link to={directoryPath} className="flex items-center gap-1 font-semibold hover:underline">
            <ArrowLeft className="size-3.5" /> Back to users
          </Link>
        </div>
      </div>
    );
  }

  const { user } = profile;
  const isAdminAccount = user.role === 'admin';
  const isRunner = user.role === 'runner';
  const isClosed = user.deleted_at != null;
  const canFinance = canAccessPage(admin, 'payments');
  const status = user.account_status as UserAccountStatus;
  const kyc = user.kyc_status as UserKycStatus;
  const subtitle = [
    `${ROLE_LABELS[user.role] ?? 'User'} account`,
    user.created_at ? `Joined ${watDate(user.created_at)}` : null,
    `Last active ${lastActiveLabel(user.last_active_at).toLowerCase()}`,
  ]
    .filter(Boolean)
    .join(' · ');
  const ledgerHref = canFinance ? `${getPagePath('payments')}?tab=ledger&user=${user.id}` : null;

  const handleAction = (action: UserAction) => setModal(action);

  return (
    <div className="flex w-full flex-col gap-[20px]">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-[6px]">
          <p className="text-[10px] font-semibold uppercase text-[#167d35]">
            <Link to={directoryPath} className="hover:underline">
              User management
            </Link>
            <span className="px-[6px] text-[#a3c9ad]">/</span>
            {user.code}
          </p>
          <div className="flex min-w-0 flex-wrap items-center gap-[10px]">
            <h1 className="truncate text-[25px] font-bold leading-normal tracking-[-0.5px] text-[#17211b]">{user.name}</h1>
            <Chip tone={STATUS_TONES[status] ?? STATUS_TONES.inactive} label={STATUS_LABELS[status] ?? status} dot />
            <Chip tone={KYC_TONES[kyc] ?? KYC_TONES.unverified} label={KYC_LABELS[kyc] ?? kyc} />
          </div>
          <p className="text-[13px] text-[#6b6f66]">{subtitle}</p>
        </div>
        {!isAdminAccount ? (
          <div className="flex flex-wrap items-center gap-[9px]">
            <button type="button" disabled={isClosed} onClick={() => setMessaging(true)} className={OUTLINE_BUTTON}>
              Send message
            </button>
            <ActionMenu
              align="right"
              className={OUTLINE_BUTTON}
              items={[
                { label: 'Edit profile', icon: Pencil, disabled: isClosed, onSelect: () => setModal('edit') },
                {
                  label: 'Copy user ID',
                  icon: Copy,
                  onSelect: () => {
                    void navigator.clipboard?.writeText(user.code);
                    setNotice(`Copied ${user.code}.`);
                  },
                },
                { label: 'View wallet ledger', icon: ReceiptText, disabled: !ledgerHref, onSelect: () => ledgerHref && navigate(ledgerHref) },
                { label: 'Sign out everywhere', icon: LogOut, disabled: profile.sessions.length === 0, onSelect: () => setModal('sign-out') },
                ...(isRunner
                  ? [{ label: 'Open runner profile', icon: Bike, onSelect: () => navigate(getAdmin2RunnerHref(user.id)) }]
                  : []),
                {
                  label: 'Open in classic view',
                  icon: ExternalLink,
                  onSelect: () => navigate(getPageHref(isRunner ? 'runners' : 'users', { openId: user.id })),
                },
              ]}
            >
              More actions
            </ActionMenu>
            {canFinance ? (
              <button type="button" disabled={isClosed} onClick={() => setModal('wallet-credit')} className={PRIMARY_BUTTON}>
                Issue wallet credit
              </button>
            ) : (
              <button type="button" disabled={isClosed} onClick={() => setModal('edit')} className={PRIMARY_BUTTON}>
                Edit profile
              </button>
            )}
          </div>
        ) : null}
      </div>

      {notice ? (
        <div className="flex items-center justify-between gap-3 rounded-[10px] bg-[#eaf6ed] px-[14px] py-[10px] text-[12px] font-medium text-[#0d5e27]">
          {notice}
          <button type="button" onClick={() => setNotice(null)} className="text-[11px] font-semibold hover:underline">
            Dismiss
          </button>
        </div>
      ) : null}
      {profileQuery.isError ? (
        <p className="rounded-[8px] bg-[#fff5e5] px-3 py-2 text-[11px] font-medium text-[#b06d12]">
          Showing the last loaded data — refresh failed: {getApiErrorMessage(profileQuery.error, 'network error')}
        </p>
      ) : null}

      {isAdminAccount ? (
        <div className="rounded-[12px] border border-[#e2e8e3] bg-white p-[18px] text-[12px] text-[#45514a]">
          This is a staff admin account. Admin access, modules and passwords are managed from{' '}
          {admin?.permissions.is_super_admin ? (
            <Link to={getPagePath('user-management')} className="font-semibold text-[#167d35] hover:underline">
              Settings → User Management
            </Link>
          ) : (
            'Settings → User Management (super admins only)'
          )}
          .
        </div>
      ) : (
        <>
          <UserMetricCards profile={profile} />

          <div className="flex w-full flex-col gap-[12px] xl:flex-row xl:items-start">
            <div className="flex min-w-0 flex-1 flex-col gap-[12px]">
              <IdentityCard profile={profile} onEdit={isClosed ? undefined : () => setModal('edit')} />
              <UserErrandsCard
                userId={user.id}
                isRunner={isRunner}
                total={profile.metrics.errands_total}
                title={isRunner ? 'Recent jobs' : 'Recent errands'}
                subtitle={isRunner ? 'Latest runner activity, newest first' : 'Latest requester activity, newest first'}
                footer={`${formatCount(profile.metrics.errands_total)} total ${isRunner ? 'jobs' : 'errands'}${
                  profile.metrics.completion_pct != null ? ` · ${Math.round(profile.metrics.completion_pct)}% completion rate` : ''
                }`}
              />
              <WalletActivityCard profile={profile} ledgerHref={ledgerHref} />
              <SavedLocationsCard places={profile.saved_places} />
            </div>
            <div className="flex w-full flex-col gap-[12px] xl:w-[392px] xl:flex-shrink-0">
              <VerificationCard profile={profile} />
              {profile.referrals ? <ReferralsCard referrals={profile.referrals} /> : null}
              <SupportRiskCard profile={profile} canOpenTickets={canAccessPage(admin, 'tickets')} />
              <AccountActivityCard profile={profile} onSignOut={() => setModal('sign-out')} />
              <AccountActionsCard
                hasEmail={Boolean(user.email)}
                canCredit={canFinance && !isClosed}
                isSuspended={user.is_suspended}
                isClosed={isClosed}
                onAction={handleAction}
              />
            </div>
          </div>

          <UserActionModals
            profile={profile}
            modal={modal}
            onClose={() => setModal(null)}
            onDone={(message) => {
              setModal(null);
              setNotice(message);
            }}
          />
          <SendMessageModal open={messaging} onClose={() => setMessaging(false)} userIds={[user.id]} />
        </>
      )}
    </div>
  );
}
