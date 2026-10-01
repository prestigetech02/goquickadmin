import { useEffect, useMemo, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Download, Plus } from 'lucide-react';
import { downloadAdminUsersExport, fetchAdminUsersSummary } from '@/api/adminUsersApi';
import { AccountHealthCard } from '@/components/admin2/users/AccountHealthCard';
import { DEFAULT_FILTERS, filtersToParams, type DirectoryFilters } from '@/components/admin2/users/directoryFilters';
import { InviteAdminModal } from '@/components/admin2/users/InviteAdminModal';
import { UserDirectoryCard } from '@/components/admin2/users/UserDirectoryCard';
import { UsersKpiCards } from '@/components/admin2/users/UsersKpiCards';
import { useAuth } from '@/context/AuthContext';
import { useAdmin2DateRange } from '@/context/Admin2DateRangeContext';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import { queryKeys } from '@/lib/queryKeys';

function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export function Admin2UsersPage() {
  const { user } = useAuth();
  const { range } = useAdmin2DateRange();
  const [filters, setFilters] = useState<DirectoryFilters>(DEFAULT_FILTERS);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounced(search, 350);
  const params = useMemo(() => filtersToParams(filters, debouncedSearch), [filters, debouncedSearch]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const summaryParams = { start_date: range.start, end_date: range.end };
  const summaryQuery = useQuery({
    queryKey: queryKeys.users.summary(summaryParams),
    queryFn: () => fetchAdminUsersSummary(summaryParams),
    placeholderData: keepPreviousData,
  });

  const exportUsers = async () => {
    setExporting(true);
    setExportError(null);
    try {
      await downloadAdminUsersExport(params);
    } catch (error) {
      setExportError(getApiErrorMessage(error, 'Could not export users.'));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex w-full flex-col gap-[20px]">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-[6px]">
          <h1 className="text-[25px] font-bold leading-normal tracking-[-0.5px] text-[#17211b]">User Management</h1>
          <p className="text-[13px] text-[#6b6f66]">Manage requester, runner and staff access, verification and account health.</p>
        </div>
        <div className="flex items-center gap-[10px]">
          <button
            type="button"
            onClick={exportUsers}
            disabled={exporting}
            className="flex h-[38px] items-center gap-[7px] rounded-[8px] border border-[#d4ddd6] bg-white px-[13px] text-[12px] font-semibold text-[#17211b] hover:bg-[#f8faf8] disabled:opacity-60"
          >
            <Download className="size-[15px]" strokeWidth={1.8} />
            {exporting ? 'Exporting…' : 'Export users'}
          </button>
          {user?.permissions.is_super_admin ? (
            <button
              type="button"
              onClick={() => setInviteOpen(true)}
              className="flex h-[38px] items-center gap-[7px] rounded-[8px] bg-[#167d35] px-[13px] text-[12px] font-semibold text-white hover:bg-[#0d5e27]"
            >
              <Plus className="size-[15px]" strokeWidth={2} />
              Add user
            </button>
          ) : null}
        </div>
      </div>

      {exportError ? (
        <p className="rounded-[8px] bg-[#fdeded] px-3 py-2 text-[11px] font-medium text-[#b84545]">{exportError}</p>
      ) : null}
      {summaryQuery.isError ? (
        <p className="rounded-[8px] bg-[#fdeded] px-3 py-2 text-[11px] font-medium text-[#b84545]">
          {getApiErrorMessage(summaryQuery.error, 'Could not load user metrics.')}
        </p>
      ) : null}

      <UsersKpiCards summary={summaryQuery.data} />

      <UserDirectoryCard
        filters={filters}
        onFiltersChange={setFilters}
        search={search}
        onSearchChange={setSearch}
        params={params}
        summary={summaryQuery.data}
      />

      <AccountHealthCard summary={summaryQuery.data} />

      <InviteAdminModal open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </div>
  );
}
