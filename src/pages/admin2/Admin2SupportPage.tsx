import { useMemo, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { LifeBuoy, RefreshCw } from 'lucide-react';
import { assignAdminSupportTicket, fetchAdminSupportOverview, updateAdminSupportTicket } from '@/api/adminSupportDeskApi';
import { SupportAttentionCard } from '@/components/admin2/support/SupportAttentionCard';
import { SupportKpiCards } from '@/components/admin2/support/SupportKpiCards';
import { TeamWorkloadCard } from '@/components/admin2/support/TeamWorkloadCard';
import { TicketQueueCard } from '@/components/admin2/support/TicketQueueCard';
import { TicketTrendCard } from '@/components/admin2/support/TicketTrendCard';
import { TicketWorkspaceDrawer } from '@/components/admin2/support/TicketWorkspaceDrawer';
import { TopicMixCard } from '@/components/admin2/support/TopicMixCard';
import { DEFAULT_SUPPORT_FILTERS, isSupportTab, supportParams, type SupportFilters } from '@/components/admin2/support/presentation';
import { OUTLINE_BUTTON, PageHeader } from '@/components/admin2/shared/PageHeader';
import { NoticeBar, type Notice } from '@/components/admin2/shared/TableControls';
import { useDebounced } from '@/components/admin2/shared/useDebounced';
import { useAdmin2DateRange } from '@/context/Admin2DateRangeContext';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import { queryKeys } from '@/lib/queryKeys';
import type { AdminSupportTicketRow, SupportTicketStatus } from '@/types/api';

type RowAction = { row: AdminSupportTicketRow } & ({ kind: 'take' } | { kind: 'release' } | { kind: 'status'; status: SupportTicketStatus });

export function Admin2SupportPage() {
  const queryClient = useQueryClient();
  const { range } = useAdmin2DateRange();
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState<SupportFilters>(DEFAULT_SUPPORT_FILTERS);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounced(search, 350);
  const params = useMemo(() => supportParams(filters, debouncedSearch), [filters, debouncedSearch]);
  const [notice, setNotice] = useState<Notice | null>(null);

  const tabParam = searchParams.get('tab');
  const [seenTabParam, setSeenTabParam] = useState<string | null>(null);
  if (tabParam !== seenTabParam) {
    setSeenTabParam(tabParam);
    if (isSupportTab(tabParam)) setFilters({ ...DEFAULT_SUPPORT_FILTERS, tab: tabParam });
  }

  const openParam = searchParams.get('open');
  const [seenOpenParam, setSeenOpenParam] = useState<string | null>(null);
  const [ticketId, setTicketId] = useState<number | null>(null);
  if (openParam !== seenOpenParam) {
    setSeenOpenParam(openParam);
    const id = Number(openParam);
    if (openParam && Number.isInteger(id) && id > 0) setTicketId(id);
  }

  const closeTicket = () => {
    setTicketId(null);
    if (openParam) window.history.replaceState(window.history.state, '', window.location.pathname);
  };

  const overviewParams = { start_date: range.start, end_date: range.end };
  const overviewQuery = useQuery({
    queryKey: queryKeys.tickets.deskOverview(overviewParams),
    queryFn: () => fetchAdminSupportOverview(overviewParams),
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.tickets.all });
    void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.badges });
  };

  const rowAction = useMutation({
    mutationFn: (action: RowAction) => {
      if (action.kind === 'status') return updateAdminSupportTicket(action.row.id, { status: action.status });
      return assignAdminSupportTicket(action.row.id, action.kind === 'release' ? null : undefined);
    },
    onSuccess: (result) => {
      setNotice({ tone: 'ok', text: result.message || 'Ticket updated.' });
      refresh();
    },
    onError: (error) => setNotice({ tone: 'error', text: getApiErrorMessage(error, 'Could not update the ticket.') }),
  });
  const busyId = rowAction.isPending ? (rowAction.variables?.row.id ?? null) : null;
  const take = (row: AdminSupportTicketRow) => rowAction.mutate({ row, kind: 'take' });
  const release = (row: AdminSupportTicketRow) => rowAction.mutate({ row, kind: 'release' });
  const changeStatus = (row: AdminSupportTicketRow, status: SupportTicketStatus) => rowAction.mutate({ row, kind: 'status', status });

  const focusBoard = (next: SupportFilters) => {
    setFilters(next);
    setSearch('');
    document.getElementById('ticket-board')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setNotice({ tone: 'ok', text: `Copied ${code} to the clipboard.` });
    } catch {
      setNotice({ tone: 'error', text: 'Could not copy to the clipboard.' });
    }
  };

  return (
    <div className="flex w-full flex-col gap-[20px]">
      <PageHeader
        eyebrow="Administration · Customer care"
        title="Support tickets"
        subtitle="Reply to requesters and runners quickly, keep every ticket owned, and close the loop once the problem is solved."
        actions={
          <button type="button" onClick={refresh} disabled={overviewQuery.isFetching} className={OUTLINE_BUTTON}>
            <RefreshCw className={`size-[15px] ${overviewQuery.isFetching ? 'animate-spin' : ''}`} strokeWidth={1.8} />
            Refresh
          </button>
        }
      />

      <NoticeBar notice={notice} onDismiss={() => setNotice(null)} />
      {overviewQuery.isError ? (
        <p className="rounded-[8px] bg-[#fdeded] px-3 py-2 text-[11px] font-medium text-[#b84545]">
          {getApiErrorMessage(overviewQuery.error, 'Could not load support metrics.')}
        </p>
      ) : null}

      <SupportKpiCards overview={overviewQuery.data} />

      <div className="flex w-full flex-col gap-[16px] xl:flex-row">
        <SupportAttentionCard
          overview={overviewQuery.data}
          busyId={busyId}
          onOpen={setTicketId}
          onFlag={(flag) => focusBoard({ ...DEFAULT_SUPPORT_FILTERS, tab: 'attention', flag: flag === 'any' ? '' : flag })}
          onTake={take}
        />
        <TeamWorkloadCard
          overview={overviewQuery.data}
          onShowUnassigned={() => focusBoard({ ...DEFAULT_SUPPORT_FILTERS, tab: 'unassigned' })}
          onShowNeedsReply={() => focusBoard({ ...DEFAULT_SUPPORT_FILTERS, tab: 'needs_reply' })}
        />
      </div>

      <div className="flex w-full flex-col gap-[16px] xl:flex-row">
        <TicketTrendCard overview={overviewQuery.data} />
        <TopicMixCard
          overview={overviewQuery.data}
          onCategory={(category) => focusBoard({ ...DEFAULT_SUPPORT_FILTERS, tab: 'all', category })}
          onPriority={(priority) => focusBoard({ ...DEFAULT_SUPPORT_FILTERS, tab: 'all', priority })}
        />
      </div>

      <div id="ticket-board" className="scroll-mt-[90px]">
        <TicketQueueCard
          overview={overviewQuery.data}
          filters={filters}
          onFiltersChange={setFilters}
          search={search}
          onSearchChange={setSearch}
          params={params}
          busyId={busyId}
          onOpen={setTicketId}
          onTake={take}
          onRelease={release}
          onStatus={changeStatus}
          onCopy={(code) => void copyCode(code)}
        />
      </div>

      <div className="flex flex-wrap items-center gap-[12px] rounded-[12px] border border-[#cfe5d5] bg-[#f3faf5] px-[16px] py-[14px]">
        <span className="flex size-[32px] flex-shrink-0 items-center justify-center rounded-[8px] bg-white">
          <LifeBuoy className="size-[16px] text-[#167d35]" strokeWidth={1.8} />
        </span>
        <p className="min-w-[240px] flex-1 text-[11px] leading-[1.5] text-[#45514a]">
          Customers get an in-app notification for every reply and when a ticket is resolved. Internal notes stay inside the team. Replying to an
          unassigned ticket makes you its owner, and a customer reply moves the ticket back to Needs reply.
        </p>
      </div>

      {ticketId != null ? (
        <TicketWorkspaceDrawer
          key={ticketId}
          id={ticketId}
          onClose={closeTicket}
          onOpenTicket={setTicketId}
          onNotice={(text) => setNotice({ tone: 'ok', text })}
        />
      ) : null}
    </div>
  );
}
