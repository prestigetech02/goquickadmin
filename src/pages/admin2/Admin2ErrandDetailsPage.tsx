import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { AlertCircle, ArrowLeft, Copy, Mail, RefreshCw, SlidersHorizontal } from 'lucide-react';
import { fetchAdminErrandView } from '@/api/adminErrandsApi';
import { ActionMenu } from '@/components/admin2/users/ActionMenu';
import { SendMessageModal } from '@/components/admin2/users/SendMessageModal';
import { ErrandActionModals, type ErrandModal } from '@/components/admin2/errand/ErrandActionModals';
import { ItemsCard } from '@/components/admin2/errand/ItemsCard';
import { NotesCard } from '@/components/admin2/errand/NotesCard';
import { OperationalActionsCard } from '@/components/admin2/errand/OperationalActionsCard';
import { ParticipantsCard } from '@/components/admin2/errand/ParticipantsCard';
import { PricingCard } from '@/components/admin2/errand/PricingCard';
import { ProofCard } from '@/components/admin2/errand/ProofCard';
import { RouteServiceCard } from '@/components/admin2/errand/RouteServiceCard';
import { SummaryCards } from '@/components/admin2/errand/SummaryCards';
import { TimelineCard } from '@/components/admin2/errand/TimelineCard';
import { Chip } from '@/components/admin2/errand/parts';
import { statusLabel, statusTone, watDate, watTime } from '@/components/admin2/errand/errandPresentation';
import { relativeAgo } from '@/components/admin2/format';
import { Skeleton } from '@/components/admin2/overview/primitives';
import { useAuth } from '@/context/AuthContext';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import { canAccessPage, getAdmin2ErrandId, getPagePath } from '@/lib/adminNavigation';
import { queryKeys } from '@/lib/queryKeys';

const OUTLINE_BUTTON =
  'flex h-[38px] items-center justify-center gap-[6px] rounded-[24px] border border-[#1a7a0a] bg-white px-[18px] text-[12px] font-bold text-[#1a7a0a] transition-colors hover:bg-[#f3faf5] disabled:cursor-not-allowed disabled:opacity-50';

export function Admin2ErrandDetailsPage() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const errandId = getAdmin2ErrandId(pathname) ?? 0;
  const [now, setNow] = useState(() => Date.now());
  const [modal, setModal] = useState<ErrandModal | null>(null);
  const [messageTo, setMessageTo] = useState<'runner' | 'requester' | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const viewQuery = useQuery({
    queryKey: queryKeys.errands.view(errandId),
    queryFn: () => fetchAdminErrandView(errandId),
    enabled: errandId > 0,
    placeholderData: keepPreviousData,
    refetchInterval: 30_000,
  });
  const view = viewQuery.data;

  if (viewQuery.isLoading || (!view && !viewQuery.isError)) {
    return (
      <div className="flex w-full flex-col gap-[20px]">
        <Skeleton className="h-[64px] w-[420px]" />
        <div className="grid grid-cols-2 gap-[12px] xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-[78px] w-full rounded-[12px]" />
          ))}
        </div>
        <Skeleton className="h-[220px] w-full rounded-[12px]" />
      </div>
    );
  }

  if (!view) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-[12px] border border-[#f1d4d4] bg-[#fff0f0] p-[18px] text-[12px] text-[#b84545]">
        <span className="flex items-center gap-2 font-semibold">
          <AlertCircle className="size-4" />
          {getApiErrorMessage(viewQuery.error, 'Could not load this errand.')}
        </span>
        <div className="flex gap-3">
          <button type="button" onClick={() => void viewQuery.refetch()} className="flex items-center gap-1 font-semibold hover:underline">
            <RefreshCw className="size-3.5" /> Retry
          </button>
          <Link to={getPagePath('admin2-errands')} className="flex items-center gap-1 font-semibold hover:underline">
            <ArrowLeft className="size-3.5" /> Back to errands
          </Link>
        </div>
      </div>
    );
  }

  const { errand, runner, requester, pricing } = view;
  const tone = statusTone(errand.status);
  const canFinance = canAccessPage(user, 'admin2-transactions');
  const refundHint = !canFinance
    ? 'Finance access required'
    : pricing.status !== 'held'
      ? 'No escrow is held on this errand'
      : null;
  const location = errand.zone ?? errand.city;
  const subtitle = [
    errand.created_at ? `Created ${watDate(errand.created_at)} at ${watTime(errand.created_at)}` : null,
    location,
    errand.updated_at ? `Last updated ${relativeAgo(errand.updated_at)}` : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const messageTarget = messageTo === 'runner' ? runner : messageTo === 'requester' ? requester : null;

  return (
    <div className="flex w-full flex-col gap-[20px]">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-[6px]">
          <p className="text-[10px] font-semibold uppercase text-[#167d35]">
            <Link to={getPagePath('admin2-errands')} className="hover:underline">
              Errands
            </Link>
            <span className="px-[6px] text-[#a3c9ad]">/</span>
            {errand.code}
          </p>
          <div className="flex min-w-0 flex-wrap items-center gap-[10px]">
            <h1 className="truncate text-[25px] font-bold leading-normal tracking-[-0.5px] text-[#17211b]">
              {errand.title?.trim() || 'Untitled errand'}
            </h1>
            <Chip tone={tone} label={statusLabel(errand.status)} dot />
          </div>
          <p className="text-[13px] text-[#6b6f66]">{subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-[9px]">
          <button type="button" disabled={!runner} onClick={() => setMessageTo('runner')} className={OUTLINE_BUTTON}>
            Message runner
          </button>
          <ActionMenu
            align="right"
            className={OUTLINE_BUTTON}
            items={[
              { label: 'Message requester', icon: Mail, disabled: !requester, onSelect: () => setMessageTo('requester') },
              { label: 'Change status…', icon: SlidersHorizontal, disabled: !errand.can_intervene, onSelect: () => setModal('status') },
              {
                label: 'Copy errand ID',
                icon: Copy,
                onSelect: () => {
                  void navigator.clipboard?.writeText(errand.code);
                  setNotice(`Copied ${errand.code}.`);
                },
              },
            ]}
          >
            More actions
          </ActionMenu>
          <button
            type="button"
            disabled={!errand.can_intervene}
            onClick={() => setModal('complete')}
            title={errand.can_intervene ? undefined : 'Errand is no longer in progress'}
            className="flex h-[38px] items-center justify-center rounded-[24px] bg-[#1a7a0a] px-[18px] text-[12px] font-bold text-white transition-colors hover:bg-[#156608] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Mark complete
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
      {viewQuery.isError ? (
        <p className="rounded-[8px] bg-[#fff5e5] px-3 py-2 text-[11px] font-medium text-[#b06d12]">
          Showing the last loaded data — refresh failed: {getApiErrorMessage(viewQuery.error, 'network error')}
        </p>
      ) : null}

      <SummaryCards view={view} now={now} />

      <div className="flex w-full flex-col gap-[12px] xl:flex-row xl:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-[12px]">
          <RouteServiceCard view={view} now={now} />
          <ParticipantsCard view={view} onAssignRunner={errand.can_intervene ? () => setModal('reassign') : undefined} />
          <ItemsCard view={view} />
          <TimelineCard view={view} />
        </div>
        <div className="flex w-full flex-col gap-[12px] xl:w-[392px] xl:flex-shrink-0">
          <PricingCard view={view} />
          <ProofCard view={view} />
          <NotesCard view={view} />
          <OperationalActionsCard
            canIntervene={errand.can_intervene}
            canRefund={canFinance && pricing.status === 'held'}
            refundHint={refundHint}
            onAction={setModal}
          />
        </div>
      </div>

      <ErrandActionModals
        view={view}
        modal={modal}
        onClose={() => setModal(null)}
        onDone={(message) => {
          setModal(null);
          setNotice(message);
        }}
      />
      <SendMessageModal
        open={messageTarget != null}
        onClose={() => setMessageTo(null)}
        userIds={messageTarget ? [messageTarget.id] : []}
      />
    </div>
  );
}
