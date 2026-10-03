import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { AlertCircle, ArrowLeft, Copy, KeyRound, Pencil, ReceiptText, RefreshCw, ShieldCheck, UserRound } from 'lucide-react';
import { fetchAdminRunnerProfile } from '@/api/adminRunnersApi';
import { Chip } from '@/components/admin2/errand/parts';
import { formatCount, relativeAgo } from '@/components/admin2/format';
import { watDate } from '@/components/admin2/errand/errandPresentation';
import { Skeleton } from '@/components/admin2/overview/primitives';
import { ActionMenu } from '@/components/admin2/users/ActionMenu';
import { SendMessageModal } from '@/components/admin2/users/SendMessageModal';
import { UserErrandsCard } from '@/components/admin2/userDetails/UserErrandsCard';
import { ActiveErrandCard } from '@/components/admin2/runnerDetails/ActiveErrandCard';
import { AvailabilityCard } from '@/components/admin2/runnerDetails/AvailabilityCard';
import { DocumentsCard } from '@/components/admin2/runnerDetails/DocumentsCard';
import { PayoutHistoryCard } from '@/components/admin2/runnerDetails/PayoutHistoryCard';
import { RatingsCard } from '@/components/admin2/runnerDetails/RatingsCard';
import { RunnerActionModals, type RunnerModal } from '@/components/admin2/runnerDetails/RunnerActionModals';
import { RunnerActionsCard } from '@/components/admin2/runnerDetails/RunnerActionsCard';
import { RunnerIdentityCard } from '@/components/admin2/runnerDetails/RunnerIdentityCard';
import { RunnerMetricCards } from '@/components/admin2/runnerDetails/RunnerMetricCards';
import { VehicleZoneCard } from '@/components/admin2/runnerDetails/VehicleZoneCard';
import { presence, VERIFICATION } from '@/components/admin2/runnerDetails/presentation';
import { useAuth } from '@/context/AuthContext';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import { canAccessPage, getAdmin2RunnerId, getAdmin2UserHref, getPageHref, getPagePath } from '@/lib/adminNavigation';
import { queryKeys } from '@/lib/queryKeys';

const OUTLINE_BUTTON =
  'flex h-[38px] items-center justify-center gap-[6px] rounded-[24px] border border-[#1a7a0a] bg-white px-[18px] text-[12px] font-bold text-[#1a7a0a] transition-colors hover:bg-[#f3faf5] disabled:cursor-not-allowed disabled:opacity-50';
const PRIMARY_BUTTON =
  'flex h-[38px] items-center justify-center rounded-[24px] bg-[#1a7a0a] px-[18px] text-[12px] font-bold text-white transition-colors hover:bg-[#156608] disabled:cursor-not-allowed disabled:opacity-50';

export function Admin2RunnerDetailsPage() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user: admin } = useAuth();
  const runnerId = getAdmin2RunnerId(pathname) ?? 0;
  const [modal, setModal] = useState<RunnerModal | null>(null);
  const [messaging, setMessaging] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const profileQuery = useQuery({
    queryKey: queryKeys.runners.profile(runnerId),
    queryFn: () => fetchAdminRunnerProfile(runnerId),
    enabled: runnerId > 0,
    placeholderData: keepPreviousData,
    refetchInterval: 30_000,
  });
  const profile = profileQuery.data;
  const runnersPath = getPagePath('admin2-runners');

  if (runnerId > 0 && (profileQuery.isLoading || (!profile && !profileQuery.isError))) {
    return (
      <div className="flex w-full flex-col gap-[20px]">
        <Skeleton className="h-[64px] w-[420px]" />
        <div className="grid grid-cols-2 gap-[12px] xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-[126px] w-full rounded-[12px]" />
          ))}
        </div>
        <div className="flex flex-col gap-[12px] xl:flex-row">
          <Skeleton className="h-[260px] w-full rounded-[12px]" />
          <Skeleton className="h-[260px] w-full rounded-[12px] xl:w-[392px]" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-[12px] border border-[#f1d4d4] bg-[#fff0f0] p-[18px] text-[12px] text-[#b84545]">
        <span className="flex items-center gap-2 font-semibold">
          <AlertCircle className="size-4" />
          {runnerId > 0 ? getApiErrorMessage(profileQuery.error, 'Could not load this runner.') : 'No runner selected.'}
        </span>
        <div className="flex gap-3">
          {runnerId > 0 ? (
            <button type="button" onClick={() => void profileQuery.refetch()} className="flex items-center gap-1 font-semibold hover:underline">
              <RefreshCw className="size-3.5" /> Retry
            </button>
          ) : null}
          <Link to={runnersPath} className="flex items-center gap-1 font-semibold hover:underline">
            <ArrowLeft className="size-3.5" /> Back to runners
          </Link>
        </div>
      </div>
    );
  }

  const { runner, metrics } = profile;
  const isClosed = runner.deleted_at != null;
  const blocked = isClosed || runner.is_suspended;
  const canFinance = canAccessPage(admin, 'admin2-transactions');
  const canReviewKyc = canAccessPage(admin, 'admin2-verifications');
  const status = presence(runner);
  const verification = VERIFICATION[runner.verification_status];
  const area = profile.zone.assigned?.name ?? profile.zone.area;
  const lastPing = runner.last_location_at
    ? `Last location update ${relativeAgo(runner.last_location_at)}`
    : runner.last_seen_at
      ? `Last seen ${relativeAgo(runner.last_seen_at)}`
      : 'No location shared yet';
  const subtitle = [area, runner.created_at ? `Joined ${watDate(runner.created_at)}` : null, lastPing].filter(Boolean).join(' · ');
  const ledgerHref = canFinance ? `${getPagePath('admin2-transactions')}?user=${runner.id}` : null;
  const kycHref = canReviewKyc && profile.verification ? getPageHref('admin2-verifications', { openId: profile.verification.id }) : null;
  const errandsFooter = [
    `${formatCount(metrics.errands_completed)} completed`,
    `${formatCount(metrics.errands_cancelled)} cancelled`,
    `${formatCount(metrics.errands_active)} active`,
  ].join(' · ');

  return (
    <div className="flex w-full flex-col gap-[20px]">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-[6px]">
          <p className="text-[10px] font-semibold uppercase text-[#167d35]">
            <Link to={runnersPath} className="hover:underline">
              Runners
            </Link>
            <span className="px-[6px] text-[#a3c9ad]">/</span>
            {runner.code}
          </p>
          <div className="flex min-w-0 flex-wrap items-center gap-[10px]">
            <h1 className="truncate text-[25px] font-bold leading-normal tracking-[-0.5px] text-[#17211b]">{runner.name}</h1>
            <Chip tone={status.tone} label={status.label} dot />
            <Chip tone={verification.tone} label={verification.label} />
          </div>
          <p className="text-[13px] text-[#6b6f66]">{subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-[9px]">
          <button type="button" disabled={isClosed} onClick={() => setMessaging(true)} className={OUTLINE_BUTTON}>
            Message runner
          </button>
          <ActionMenu
            align="right"
            className={OUTLINE_BUTTON}
            items={[
              { label: 'Edit profile', icon: Pencil, disabled: isClosed, onSelect: () => setModal('edit') },
              { label: 'Send password reset', icon: KeyRound, disabled: isClosed || !runner.email, onSelect: () => setModal('reset-password') },
              {
                label: 'Copy runner ID',
                icon: Copy,
                onSelect: () => {
                  void navigator.clipboard?.writeText(runner.code);
                  setNotice(`Copied ${runner.code}.`);
                },
              },
              { label: 'Review KYC', icon: ShieldCheck, disabled: !kycHref, onSelect: () => kycHref && navigate(kycHref) },
              { label: 'View wallet ledger', icon: ReceiptText, disabled: !ledgerHref, onSelect: () => ledgerHref && navigate(ledgerHref) },
              { label: 'Open user profile', icon: UserRound, onSelect: () => navigate(getAdmin2UserHref(runner.id)) },
            ]}
          >
            More actions
          </ActionMenu>
          <button
            type="button"
            disabled={blocked}
            title={blocked ? 'Restore runner access before assigning errands' : undefined}
            onClick={() => setModal('assign')}
            className={PRIMARY_BUTTON}
          >
            Assign errand
          </button>
        </div>
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

      <RunnerMetricCards profile={profile} />

      <div className="flex w-full flex-col gap-[12px] xl:flex-row xl:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-[12px]">
          <ActiveErrandCard profile={profile} canAssign={!blocked} onAssign={() => setModal('assign')} />
          <UserErrandsCard
            userId={runner.id}
            isRunner
            total={metrics.errands_total}
            title="Recent & active errands"
            subtitle="Jobs this runner accepted, newest first"
            footer={errandsFooter}
          />
          <PayoutHistoryCard profile={profile} />
          <RatingsCard ratings={profile.ratings} />
        </div>
        <div className="flex w-full flex-col gap-[12px] xl:w-[392px] xl:flex-shrink-0">
          <RunnerIdentityCard profile={profile} onEdit={isClosed ? undefined : () => setModal('edit')} />
          <AvailabilityCard profile={profile} onTakeOffline={() => setModal('offline')} />
          <VehicleZoneCard profile={profile} onEdit={isClosed ? undefined : () => setModal('assignment')} />
          <DocumentsCard documents={profile.documents} manageHref={kycHref} />
          <RunnerActionsCard isSuspended={runner.is_suspended} isClosed={isClosed} onAction={setModal} />
        </div>
      </div>

      <RunnerActionModals
        profile={profile}
        modal={modal}
        canManageZones={canAccessPage(admin, 'zones')}
        withdrawalsHref={canFinance ? getPagePath('admin2-withdrawals') : null}
        onClose={() => setModal(null)}
        onDone={(message) => {
          setModal(null);
          setNotice(message);
        }}
      />
      <SendMessageModal open={messaging} onClose={() => setMessaging(false)} userIds={[runner.id]} />
    </div>
  );
}
