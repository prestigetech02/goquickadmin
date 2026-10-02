import { useMemo, useRef, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Download, ScrollText, ShieldCheck, UserPlus } from 'lucide-react';
import { downloadAdminRunnersExport, fetchAdminRunnerBoardOverview } from '@/api/adminRunnerBoardApi';
import { AvailabilityCard } from '@/components/admin2/runners/AvailabilityCard';
import { CoachingCard } from '@/components/admin2/runners/CoachingCard';
import { KycAttentionCard } from '@/components/admin2/runners/KycAttentionCard';
import { DEFAULT_DIRECTORY, directoryParams, type DirectoryState } from '@/components/admin2/runners/presentation';
import { RunnerDirectoryCard } from '@/components/admin2/runners/RunnerDirectoryCard';
import { RunnerKpiCards } from '@/components/admin2/runners/RunnerKpiCards';
import { InviteRunnerModal, RunnerPolicyModal } from '@/components/admin2/runners/RunnerModals';
import { ZoneCoverageCard } from '@/components/admin2/runners/ZoneCoverageCard';
import { OUTLINE_BUTTON, PRIMARY_BUTTON, PageHeader } from '@/components/admin2/shared/PageHeader';
import { NoticeBar, type Notice } from '@/components/admin2/shared/TableControls';
import { useDebounced } from '@/components/admin2/shared/useDebounced';
import { useAdmin2DateRange } from '@/context/Admin2DateRangeContext';
import { useAuth } from '@/context/AuthContext';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import { canAccessPage, getPageHref, getPagePath } from '@/lib/adminNavigation';
import { queryKeys } from '@/lib/queryKeys';

export function Admin2RunnersPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { range } = useAdmin2DateRange();
  const [directory, setDirectory] = useState<DirectoryState>(DEFAULT_DIRECTORY);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounced(search, 350);
  const params = useMemo(() => directoryParams(directory, debouncedSearch), [directory, debouncedSearch]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [policyOpen, setPolicyOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const directoryRef = useRef<HTMLDivElement>(null);

  const rangeParams = { start_date: range.start, end_date: range.end };
  const overviewQuery = useQuery({
    queryKey: queryKeys.runners.boardOverview(rangeParams),
    queryFn: () => fetchAdminRunnerBoardOverview(rangeParams),
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  });
  const overview = overviewQuery.data;

  const zoneOptions = useMemo(
    () => [{ value: '', label: 'All zones' }, ...(overview?.zone_options ?? []).map((zone) => ({ value: String(zone.id), label: zone.name }))],
    [overview],
  );

  const canOpenVerifications = canAccessPage(user, 'admin2-verifications');
  const canOpenZones = canAccessPage(user, 'admin2-zones');

  const exportRunners = async () => {
    setExporting(true);
    setNotice(null);
    try {
      await downloadAdminRunnersExport(params);
    } catch (error) {
      setNotice({ tone: 'error', text: getApiErrorMessage(error, 'Could not export runners.') });
    } finally {
      setExporting(false);
    }
  };

  const openCoachingQueue = () => {
    setDirectory({ ...DEFAULT_DIRECTORY, performance: 'coaching' });
    setSearch('');
    requestAnimationFrame(() => directoryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  return (
    <div className="flex w-full flex-col gap-[20px]">
      <PageHeader
        eyebrow="Runner operations · Live marketplace"
        title="Runners"
        subtitle="Verify, support and grow a reliable runner network while monitoring availability and delivery performance across Lagos."
        actionsBesideTitle
        actions={
          <>
            <button type="button" onClick={exportRunners} disabled={exporting} className={OUTLINE_BUTTON} title="Exports runners matching the directory filters">
              <Download className="size-[15px]" strokeWidth={1.8} />
              {exporting ? 'Exporting…' : 'Export runners'}
            </button>
            <button type="button" onClick={() => setInviteOpen(true)} className={PRIMARY_BUTTON}>
              <UserPlus className="size-[15px]" strokeWidth={1.8} />
              Add or invite runner
            </button>
          </>
        }
      />

      <NoticeBar notice={notice} onDismiss={() => setNotice(null)} />
      {overviewQuery.isError ? (
        <p className="rounded-[8px] bg-[#fdeded] px-3 py-2 text-[11px] font-medium text-[#b84545]">
          {getApiErrorMessage(overviewQuery.error, 'Could not load runner overview.')}
        </p>
      ) : null}

      <RunnerKpiCards overview={overview} />

      <div className="flex w-full flex-col gap-[16px] xl:flex-row">
        <AvailabilityCard overview={overview} />
        <ZoneCoverageCard overview={overview} onOpenZones={canOpenZones ? () => navigate(getPagePath('admin2-zones')) : undefined} />
      </div>

      <div className="flex w-full flex-col gap-[16px] xl:flex-row">
        <KycAttentionCard
          overview={overview}
          onReview={canOpenVerifications ? (id) => navigate(getPageHref('admin2-verifications', { openId: id })) : undefined}
          onOpenQueue={canOpenVerifications ? () => navigate(getPagePath('admin2-verifications')) : undefined}
        />
        <CoachingCard overview={overview} onOpenQueue={openCoachingQueue} />
      </div>

      <div ref={directoryRef} className="scroll-mt-[90px]">
        <RunnerDirectoryCard
          state={directory}
          onStateChange={setDirectory}
          search={search}
          onSearchChange={setSearch}
          params={params}
          zoneOptions={zoneOptions}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-[#d4e9da] bg-[#f3faf5] px-[16px] py-[12px]">
        <div className="flex min-w-0 items-center gap-[10px]">
          <ShieldCheck className="size-[16px] flex-shrink-0 text-[#167d35]" strokeWidth={1.8} />
          <p className="text-[11px] text-[#45514a]">
            Suspensions require a reason and every bulk action is recorded in the runner's admin notes. Bulk actions show a confirmation preview first.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setPolicyOpen(true)}
          className="flex h-[32px] flex-shrink-0 items-center gap-[6px] rounded-[8px] border border-[#d4ddd6] bg-white px-[12px] text-[11px] font-semibold text-[#17211b] hover:bg-[#f8faf8]"
        >
          <ScrollText className="size-[13px]" strokeWidth={1.8} />
          Runner policy
        </button>
      </div>

      <InviteRunnerModal open={inviteOpen} onClose={() => setInviteOpen(false)} />
      <RunnerPolicyModal open={policyOpen} onClose={() => setPolicyOpen(false)} overview={overview} />
    </div>
  );
}
