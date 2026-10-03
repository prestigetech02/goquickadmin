import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Activity, Download, KeyRound, RefreshCw, ShieldCheck, Trash2, Users } from 'lucide-react';
import { downloadAdminAuditLogExport, fetchAdminAuditLogOptions, fetchAdminAuditLogSummary, fetchAdminAuditLogs } from '@/api/adminAuditLogsApi';
import { AuditActivityCard } from '@/components/admin2/audit/AuditActivityCard';
import { AuditEntryDrawer } from '@/components/admin2/audit/AuditEntryDrawer';
import { AuditTrailCard, type AuditFilterState } from '@/components/admin2/audit/AuditTrailCard';
import { formatCount } from '@/components/admin2/format';
import { pageForKey } from '@/components/admin2/shared/helpers';
import { MetricCard, MetricGrid } from '@/components/admin2/shared/MetricCard';
import { OUTLINE_BUTTON, PageHeader, PRIMARY_BUTTON } from '@/components/admin2/shared/PageHeader';
import { NoticeBar, type Notice } from '@/components/admin2/shared/TableControls';
import { useDebounced } from '@/components/admin2/shared/useDebounced';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import { queryKeys } from '@/lib/queryKeys';
import type { AdminAuditLogEntry, AdminAuditLogFilters } from '@/types/api';

const PER_PAGE = 25;

export function Admin2AuditLogPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const userParam = Number(searchParams.get('user')) || null;
  const [filters, setFilters] = useState<AuditFilterState>(() => ({
    tab: 'all',
    search: '',
    adminId: searchParams.get('admin') ?? '',
    resource: '',
    from: '',
    to: '',
  }));
  const [knownUserName, setKnownUserName] = useState<string | null>(null);
  const [selected, setSelected] = useState<AdminAuditLogEntry | null>(null);
  const [exporting, setExporting] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const debouncedSearch = useDebounced(filters.search.trim(), 350);

  const apiFilters: AdminAuditLogFilters = {
    per_page: PER_PAGE,
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(filters.adminId ? { admin_id: Number(filters.adminId) } : {}),
    ...(filters.tab === 'sign_ins' ? { resource: 'auth' } : filters.resource ? { resource: filters.resource } : {}),
    ...(filters.tab === 'failed' ? { outcome: 'failed' as const } : {}),
    ...(filters.tab === 'approved' ? { approved: 1 as const } : {}),
    ...(filters.from ? { from: filters.from } : {}),
    ...(filters.to ? { to: filters.to } : {}),
    ...(userParam ? { target_user_id: userParam } : {}),
  };
  const filterKey = JSON.stringify(apiFilters);
  const [pageState, setPageState] = useState({ key: filterKey, page: 1 });
  const page = pageForKey(pageState, filterKey);

  const logsQuery = useQuery({
    queryKey: queryKeys.auditLogs.list({ ...apiFilters, page }),
    queryFn: () => fetchAdminAuditLogs({ ...apiFilters, page }),
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  });
  const summaryQuery = useQuery({
    queryKey: queryKeys.auditLogs.summary,
    queryFn: fetchAdminAuditLogSummary,
    refetchInterval: 60_000,
  });
  const optionsQuery = useQuery({
    queryKey: queryKeys.auditLogs.options,
    queryFn: fetchAdminAuditLogOptions,
    staleTime: 5 * 60_000,
  });

  const entries = logsQuery.data?.data ?? [];
  const summary = summaryQuery.data;
  const userName = knownUserName ?? entries.find((e) => e.target_user?.id === userParam)?.target_user?.name ?? null;

  const updateFilters = (next: Partial<AuditFilterState>) => setFilters((current) => ({ ...current, ...next }));

  const setUserFilter = (user: { id: number; name: string | null } | null) => {
    const params = new URLSearchParams(searchParams);
    if (user) params.set('user', String(user.id));
    else params.delete('user');
    setKnownUserName(user?.name ?? null);
    setSearchParams(params, { replace: true });
  };

  const refresh = () => {
    void logsQuery.refetch();
    void summaryQuery.refetch();
  };

  const runExport = async () => {
    setExporting(true);
    setNotice(null);
    try {
      await downloadAdminAuditLogExport(apiFilters);
      setNotice({ tone: 'ok', text: 'Export downloaded. The export itself is recorded in the audit log.' });
    } catch (error) {
      setNotice({ tone: 'error', text: getApiErrorMessage(error, 'Export failed.') });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex w-full flex-col gap-[20px]">
      <PageHeader
        eyebrow="Security · Live"
        title="Audit Log"
        subtitle="Who changed what, when, from where, and which actions needed a super admin's approval."
        actions={
          <>
            <button type="button" onClick={refresh} disabled={logsQuery.isFetching} className={OUTLINE_BUTTON}>
              <RefreshCw className={`size-[15px] ${logsQuery.isFetching ? 'animate-spin' : ''}`} strokeWidth={1.8} />
              Refresh
            </button>
            <button type="button" onClick={() => void runExport()} disabled={exporting} className={PRIMARY_BUTTON}>
              <Download className="size-[15px]" strokeWidth={1.8} />
              {exporting ? 'Exporting…' : 'Export CSV'}
            </button>
          </>
        }
      />

      <NoticeBar notice={notice} onDismiss={() => setNotice(null)} />

      <MetricGrid columns={5}>
        <MetricCard
          label="Changes · 24h"
          icon={Activity}
          iconColor="#167d35"
          iconBg="#eaf6ed"
          value={summary ? formatCount(summary.actions_24h) : undefined}
          pill={summary && summary.failed_24h > 0 ? { label: `${summary.failed_24h} failed`, tone: 'red' } : null}
          context={summary ? (summary.failed_24h ? 'Failed includes rejected input' : 'All succeeded') : undefined}
        />
        <MetricCard
          label="Active admins · 24h"
          icon={Users}
          iconColor="#2563a8"
          iconBg="#e8f1fb"
          value={summary ? formatCount(summary.active_admins_24h) : undefined}
          context="Signed in or made a change"
        />
        <MetricCard
          label="Super admin approvals · 7d"
          icon={ShieldCheck}
          iconColor="#6b46c1"
          iconBg="#f1ecfb"
          value={summary ? formatCount(summary.approved_actions_7d) : undefined}
          pill={summary && summary.approvals_denied_7d > 0 ? { label: `${summary.approvals_denied_7d} denied`, tone: 'amber' } : null}
          context="Protected actions by staff admins"
        />
        <MetricCard
          label="Deletions · 7d"
          icon={Trash2}
          iconColor="#b84545"
          iconBg="#fdeded"
          value={summary ? formatCount(summary.deletions_7d) : undefined}
          context="Records removed through the admin panel"
        />
        <MetricCard
          label="Failed sign-ins · 7d"
          icon={KeyRound}
          iconColor="#b06d12"
          iconBg="#fff5e5"
          value={summary ? formatCount(summary.failed_sign_ins_7d) : undefined}
          pill={summary && summary.failed_sign_ins_7d >= 10 ? { label: 'Review', tone: 'red' } : null}
          context="Wrong passwords and blocked accounts"
        />
      </MetricGrid>

      <AuditActivityCard
        summary={summary}
        loading={summaryQuery.isLoading}
        activeAdminId={filters.adminId ? Number(filters.adminId) : null}
        activeArea={filters.resource}
        onPickAdmin={(id) => updateFilters({ adminId: filters.adminId === String(id) ? '' : String(id) })}
        onPickArea={(key) => updateFilters({ tab: filters.tab === 'sign_ins' ? 'all' : filters.tab, resource: filters.resource === key ? '' : key })}
      />

      <AuditTrailCard
        entries={entries}
        options={optionsQuery.data}
        loading={logsQuery.isLoading}
        error={logsQuery.isError ? getApiErrorMessage(logsQuery.error, 'Could not load the audit log.') : null}
        dimmed={logsQuery.isPlaceholderData}
        filters={filters}
        onFiltersChange={updateFilters}
        targetUser={userParam ? { id: userParam, name: userName } : null}
        onClearTargetUser={() => setUserFilter(null)}
        page={page}
        lastPage={logsQuery.data?.last_page ?? 1}
        total={logsQuery.data?.total ?? 0}
        onPageChange={(next) => setPageState({ key: filterKey, page: next })}
        onOpen={setSelected}
      />

      {selected ? (
        <AuditEntryDrawer
          entry={selected}
          onClose={() => setSelected(null)}
          onFilterAdmin={(adminId) => {
            updateFilters({ adminId: String(adminId) });
            setSelected(null);
          }}
          onFilterUser={(user) => {
            setUserFilter(user);
            setSelected(null);
          }}
        />
      ) : null}
    </div>
  );
}
