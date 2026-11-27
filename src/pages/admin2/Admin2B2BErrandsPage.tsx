import { useMemo, useState } from 'react';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  BriefcaseBusiness,
  Building2,
  CircleCheckBig,
  Copy,
  Ellipsis,
  ExternalLink,
  PackageCheck,
  Repeat2,
  UserRoundPlus,
} from 'lucide-react';
import {
  fetchAdminB2BErrands,
  fetchAdminB2BErrandsOverview,
  type AdminB2BErrandRow,
  type B2BErrandTab,
} from '@/api/adminB2BErrandsApi';
import { ErrandQuickActions, type BoardActionTarget } from '@/components/admin2/errands/ErrandQuickActions';
import { PAYMENT_META, boardStatusTone } from '@/components/admin2/errands/presentation';
import { categoryLabel, statusLabel, watShortDate, watTime } from '@/components/admin2/errand/errandPresentation';
import { Chip, PersonAvatar } from '@/components/admin2/errand/parts';
import { formatCount, formatNaira, relativeAgo } from '@/components/admin2/format';
import { Card, Skeleton } from '@/components/admin2/overview/primitives';
import { MetricCard, MetricGrid } from '@/components/admin2/shared/MetricCard';
import { PageHeader } from '@/components/admin2/shared/PageHeader';
import { Pager } from '@/components/admin2/shared/Pager';
import { CardTabs, NoticeBar, SearchField, TABLE_HEADER, type Notice } from '@/components/admin2/shared/TableControls';
import { useDebounced } from '@/components/admin2/shared/useDebounced';
import { pageForKey } from '@/components/admin2/shared/helpers';
import { userTone } from '@/components/admin2/transactions/presentation';
import { ActionMenu } from '@/components/admin2/users/ActionMenu';
import { FilterDropdown } from '@/components/admin2/users/FilterDropdown';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import { getAdmin2ErrandHref } from '@/lib/adminNavigation';
import { queryKeys } from '@/lib/queryKeys';

const PER_PAGE = 15;

const GRID =
  'grid grid-cols-[minmax(150px,1.2fr)_minmax(120px,1fr)_minmax(120px,1fr)_minmax(120px,1fr)_minmax(150px,1.2fr)_90px_minmax(110px,0.9fr)_96px] items-center gap-x-[12px] px-[16px]';

const ASSIGNMENT_OPTIONS = [
  { value: '', label: 'Any assignment' },
  { value: 'unassigned', label: 'Needs runner' },
  { value: 'assigned', label: 'Assigned' },
];

export function Admin2B2BErrandsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<B2BErrandTab>('needs_assign');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounced(search, 350);
  const [organizationId, setOrganizationId] = useState('');
  const [assignment, setAssignment] = useState('');
  const [notice, setNotice] = useState<Notice | null>(null);
  const [action, setAction] = useState<BoardActionTarget | null>(null);

  const listBase = useMemo(
    () => ({
      tab,
      search: debouncedSearch.trim() || undefined,
      organization_id: organizationId ? Number(organizationId) : undefined,
      assignment: (assignment || undefined) as 'assigned' | 'unassigned' | undefined,
      per_page: PER_PAGE,
    }),
    [tab, debouncedSearch, organizationId, assignment],
  );

  const paramsKey = JSON.stringify(listBase);
  const [pageState, setPageState] = useState({ key: paramsKey, page: 1 });
  const page = pageForKey(pageState, paramsKey);
  const setPage = (next: number) => setPageState({ key: paramsKey, page: next });

  const overviewQuery = useQuery({
    queryKey: queryKeys.b2bErrands.overview,
    queryFn: fetchAdminB2BErrandsOverview,
    refetchInterval: 60_000,
  });

  const listParams = { ...listBase, page };
  const listQuery = useQuery({
    queryKey: queryKeys.b2bErrands.list(listParams),
    queryFn: () => fetchAdminB2BErrands(listParams),
    placeholderData: keepPreviousData,
    refetchInterval: 30_000,
  });

  const summary = overviewQuery.data?.summary;
  const tabCounts = overviewQuery.data?.tab_counts;
  const orgs = overviewQuery.data?.organizations ?? [];
  const rows = listQuery.data?.data ?? [];
  const total = listQuery.data?.total ?? 0;
  const lastPage = listQuery.data?.last_page ?? 1;

  const orgOptions = [
    { value: '', label: 'All businesses' },
    ...orgs.map((org) => ({ value: String(org.id), label: org.name })),
  ];

  const tabs: Array<{ value: B2BErrandTab; label: string; count?: number | null }> = [
    { value: 'needs_assign', label: 'Needs assign', count: tabCounts?.needs_assign },
    { value: 'live', label: 'Live', count: tabCounts?.live },
    { value: 'completed', label: 'Completed', count: tabCounts?.completed },
    { value: 'cancelled', label: 'Cancelled', count: tabCounts?.cancelled },
    { value: 'all', label: 'All', count: tabCounts?.all },
  ];

  const openErrand = (id: number) => navigate(getAdmin2ErrandHref(id));

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setNotice({ tone: 'ok', text: `Copied ${code} to the clipboard.` });
    } catch {
      setNotice({ tone: 'error', text: 'Could not copy to the clipboard.' });
    }
  };

  const menuItems = (row: AdminB2BErrandRow) => [
    { label: 'Open errand', icon: ExternalLink, onSelect: () => openErrand(row.id) },
    {
      label: row.runner ? 'Reassign runner' : 'Assign / invite runner',
      icon: row.runner ? Repeat2 : UserRoundPlus,
      disabled: !row.can_reassign,
      onSelect: () => setAction({ kind: 'reassign', row }),
    },
    { label: 'Copy errand ID', icon: Copy, onSelect: () => void copyCode(row.code) },
  ];

  return (
    <div className="flex w-full flex-col gap-[20px]">
      <PageHeader
        eyebrow="Operations · Business"
        title="B2B Errands"
        subtitle="Organization-tagged jobs only. Assign or invite runners the same way as marketplace errands — businesses track progress on My Errands."
      />

      <NoticeBar notice={notice} onDismiss={() => setNotice(null)} />

      {overviewQuery.isError ? (
        <p className="rounded-[8px] bg-[#fdeded] px-3 py-2 text-[11px] font-medium text-[#b84545]">
          {getApiErrorMessage(overviewQuery.error, 'Could not load B2B metrics.')}
        </p>
      ) : null}

      <MetricGrid columns={4}>
        <MetricCard
          label="Needs assign"
          icon={UserRoundPlus}
          iconColor="#b06d12"
          iconBg="#fff5e5"
          value={summary ? formatCount(summary.needs_assign) : undefined}
          context="Pending / searching with no runner"
        />
        <MetricCard
          label="Live business jobs"
          icon={PackageCheck}
          iconColor="#167d35"
          iconBg="#eaf6ed"
          value={summary ? formatCount(summary.live) : undefined}
          context={summary ? `${formatCount(summary.in_flight)} in flight` : undefined}
        />
        <MetricCard
          label="Completed today"
          icon={CircleCheckBig}
          iconColor="#0d5e27"
          iconBg="#eaf6ed"
          value={summary ? formatCount(summary.completed_today) : undefined}
        />
        <MetricCard
          label="Partners with live jobs"
          icon={BriefcaseBusiness}
          iconColor="#3b5bdb"
          iconBg="#eef2ff"
          value={summary ? formatCount(summary.partners_with_live_jobs) : undefined}
        />
      </MetricGrid>

      <Card className="w-full overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-[16px] pb-[4px] pt-[16px]">
          <div className="flex min-w-0 flex-col gap-[4px]">
            <p className="text-[14px] font-semibold text-[#17211b]">Business errands</p>
            <p className="text-[11px] text-[#7c857f]">
              Same statuses as consumer jobs. Live rows refresh every 30 seconds.
            </p>
          </div>
        </div>

        <CardTabs tabs={tabs} value={tab} onChange={setTab} />

        <div className="flex flex-wrap items-center gap-[10px] border-b border-[#e2e8e3] px-[16px] py-[12px]">
          <SearchField
            value={search}
            onChange={setSearch}
            placeholder="Search ID, title, address, business, requester…"
          />
          <FilterDropdown
            label="Business"
            value={organizationId}
            options={orgOptions}
            onChange={setOrganizationId}
          />
          <FilterDropdown
            label="Runner"
            value={assignment}
            options={ASSIGNMENT_OPTIONS}
            onChange={setAssignment}
            align="right"
          />
          {(search || organizationId || assignment) && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setOrganizationId('');
                setAssignment('');
              }}
              className="text-[10px] font-semibold text-[#167d35] hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[1180px]">
            <div className={`${GRID} ${TABLE_HEADER}`}>
              <span>Errand</span>
              <span>Business</span>
              <span>Requester</span>
              <span>Runner</span>
              <span>Route</span>
              <span className="text-right">Amount</span>
              <span>Status</span>
              <span className="text-right">Actions</span>
            </div>

            {listQuery.isLoading
              ? Array.from({ length: 6 }, (_, i) => (
                  <div key={i} className={`${GRID} h-[60px] border-b border-[#e2e8e3]`}>
                    <Skeleton className="h-[10px] w-[120px]" />
                    {Array.from({ length: 6 }, (_, j) => (
                      <Skeleton key={j} className="h-[10px] w-[70px]" />
                    ))}
                    <Skeleton className="ml-auto h-[26px] w-[80px]" />
                  </div>
                ))
              : null}

            {listQuery.isError ? (
              <p className="px-[16px] py-[28px] text-center text-[12px] text-[#b84545]">
                {getApiErrorMessage(listQuery.error, 'Could not load B2B errands.')}
              </p>
            ) : null}

            {listQuery.isSuccess && rows.length === 0 ? (
              <div className="px-[16px] py-[36px] text-center">
                <Building2 className="mx-auto size-[28px] text-[#c5cdc7]" strokeWidth={1.5} />
                <p className="mt-2 text-[12px] font-semibold text-[#17211b]">
                  {tab === 'needs_assign' ? 'No business jobs waiting for a runner' : 'No business errands match'}
                </p>
                <p className="mt-[2px] text-[10px] text-[#7c857f]">
                  Org-tagged jobs from My Errands (Business) show up here for ops dispatch.
                </p>
              </div>
            ) : null}

            {rows.map((row) => {
              const payment = PAYMENT_META[row.amount.payment];
              const orgLine = row.organization
                ? [row.organization.name, row.organization.location?.name].filter(Boolean).join(' · ')
                : '—';
              return (
                <div
                  key={row.id}
                  className={`${GRID} h-[60px] border-b border-[#e2e8e3] transition-colors hover:bg-[#fafcfa] ${
                    listQuery.isPlaceholderData ? 'opacity-60' : ''
                  }`}
                >
                  <button type="button" onClick={() => openErrand(row.id)} className="min-w-0 text-left">
                    <p className="truncate text-[11px] font-semibold text-[#17211b] hover:text-[#167d35]">
                      {row.code}
                      {row.fulfillment_mode === 'managed' ? (
                        <span className="ml-[6px] rounded-full bg-[#fff5e5] px-[5px] py-[1px] text-[8px] font-semibold uppercase text-[#b06d12]">
                          Managed
                        </span>
                      ) : row.fulfillment_mode === 'marketplace' ? (
                        <span className="ml-[6px] rounded-full bg-[#eef5fb] px-[5px] py-[1px] text-[8px] font-semibold uppercase text-[#2c73b9]">
                          Market
                        </span>
                      ) : null}
                    </p>
                    <p className="truncate text-[9px] text-[#7c857f]" title={row.title ?? undefined}>
                      {[categoryLabel(row.category), row.title?.trim()].filter(Boolean).join(' · ') || '—'}
                    </p>
                  </button>
                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-medium text-[#17211b]">{orgLine}</p>
                    <p className="truncate text-[9px] text-[#7c857f]">
                      {row.created_at ? `${watShortDate(row.created_at)} · ${watTime(row.created_at)}` : '—'}
                    </p>
                  </div>
                  <PersonCell person={row.requester} empty="Unknown" />
                  <PersonCell
                    person={row.runner}
                    empty={row.is_active ? 'Not assigned' : '—'}
                    warn={!row.runner && row.is_active}
                  />
                  <div className="min-w-0" title={[row.route.pickup, row.route.dropoff].filter(Boolean).join(' → ')}>
                    <p className="truncate text-[11px] text-[#17211b]">{row.route.pickup ?? '—'}</p>
                    <p className="truncate text-[9px] text-[#7c857f]">{row.route.dropoff ?? row.area ?? '—'}</p>
                  </div>
                  <div className="min-w-0 text-right">
                    <p className="truncate text-[11px] font-semibold text-[#17211b]">
                      {row.amount.total != null ? formatNaira(row.amount.total) : '—'}
                    </p>
                    <p className="truncate text-[9px] font-medium" style={{ color: payment.tone.color }}>
                      {payment.label}
                    </p>
                  </div>
                  <div className="flex min-w-0 flex-col items-start gap-[3px]">
                    <Chip tone={boardStatusTone(row.status)} label={statusLabel(row.status)} dot />
                    {row.flags[0] ? (
                      <span className="max-w-full truncate text-[9px] font-semibold text-[#b06d12]">
                        {row.flags[0].label}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex items-center justify-end gap-[6px]">
                    {row.can_reassign && !row.runner ? (
                      <button
                        type="button"
                        onClick={() => setAction({ kind: 'reassign', row })}
                        className="h-[28px] rounded-[7px] bg-[#167d35] px-[10px] text-[10px] font-semibold text-white hover:bg-[#0d5e27]"
                      >
                        Assign
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => openErrand(row.id)}
                        className="h-[28px] rounded-[7px] border border-[#d4ddd6] bg-white px-[10px] text-[10px] font-semibold text-[#17211b] hover:bg-[#f8faf8]"
                      >
                        Open
                      </button>
                    )}
                    <ActionMenu
                      ariaLabel={`Actions for ${row.code}`}
                      className="flex size-[28px] items-center justify-center rounded-[7px] border border-[#d4ddd6] bg-white text-[#45514a] hover:bg-[#f8faf8]"
                      items={menuItems(row)}
                    >
                      <Ellipsis className="size-[14px]" strokeWidth={1.8} />
                    </ActionMenu>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 px-[16px] py-[12px]">
          <p className="text-[10px] text-[#7c857f]">
            Showing {formatCount(rows.length)} of {formatCount(total)} business errands
            {listQuery.dataUpdatedAt
              ? ` · Updated ${relativeAgo(new Date(listQuery.dataUpdatedAt).toISOString())}`
              : ''}
          </p>
          <Pager page={page} lastPage={lastPage} onChange={setPage} />
        </div>
      </Card>

      <ErrandQuickActions
        target={action}
        onClose={() => setAction(null)}
        onDone={(message) => {
          setAction(null);
          setNotice({ tone: 'ok', text: message });
          void queryClient.invalidateQueries({ queryKey: queryKeys.b2bErrands.all });
          void queryClient.invalidateQueries({ queryKey: queryKeys.errands.all });
        }}
      />
    </div>
  );
}

function PersonCell({
  person,
  empty,
  warn,
}: {
  person: AdminB2BErrandRow['requester'];
  empty: string;
  warn?: boolean;
}) {
  if (!person) {
    return (
      <span className={`truncate text-[11px] ${warn ? 'font-semibold text-[#b06d12]' : 'text-[#7c857f]'}`}>
        {empty}
      </span>
    );
  }
  return (
    <div className="flex min-w-0 items-center gap-[8px]">
      <PersonAvatar name={person.name} url={person.avatar_url} tone={userTone('buyer')} size={26} />
      <div className="min-w-0">
        <p className="truncate text-[11px] font-medium text-[#17211b]">{person.name}</p>
        <p className="truncate text-[9px] text-[#7c857f]">{person.phone ?? '—'}</p>
      </div>
    </div>
  );
}
