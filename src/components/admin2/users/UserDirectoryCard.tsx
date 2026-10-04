import { useEffect, useMemo, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bike,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Ellipsis,
  EllipsisVertical,
  Eye,
  Mail,
  Minus,
  RefreshCw,
  Search,
  UserCheck,
  UserRound,
  UserX,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { fetchAdminUsers, reactivateAdminUser, suspendAdminUser } from '@/api/adminUsersApi';
import { Modal } from '@/components/ui/Modal';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import { getAdmin2RunnerHref, getAdmin2UserHref } from '@/lib/adminNavigation';
import { queryKeys } from '@/lib/queryKeys';
import type { ListQueryParams, UserListItem, UsersSummary } from '@/types/api';
import { formatCount, formatNaira, relativeAgo } from '../format';
import { PersonAvatar } from '../errand/parts';
import { Card, Skeleton } from '../overview/primitives';
import { ActionMenu, type ActionMenuItem } from './ActionMenu';
import {
  DEFAULT_FILTERS,
  JOINED_OPTIONS,
  KYC_OPTIONS,
  ROLE_OPTIONS,
  STATUS_OPTIONS,
  activeChips,
  cityOptions,
  type DirectoryFilters,
  type RoleFilter,
} from './directoryFilters';
import { FilterDropdown } from './FilterDropdown';
import { SendMessageModal } from './SendMessageModal';
import { UserDetailsDrawer } from './UserDetailsDrawer';
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

const PER_PAGE = 10;

const GRID_COLUMNS =
  'grid grid-cols-[18px_minmax(210px,1fr)_82px_102px_82px_88px_60px_78px_74px_66px_18px] items-center gap-[10px] px-[10px]';

const TABS: Array<{ value: RoleFilter; label: string; countKey: keyof UsersSummary['tabs'] }> = [
  { value: 'all', label: 'All users', countKey: 'all' },
  { value: 'buyer', label: 'Requesters', countKey: 'buyer' },
  { value: 'runner', label: 'Runners', countKey: 'runner' },
  { value: 'admin', label: 'Admins', countKey: 'admin' },
];

const BAR_BUTTON =
  'flex h-[38px] items-center gap-[7px] rounded-[8px] border border-[#d4ddd6] bg-white px-[13px] text-[12px] font-semibold text-[#17211b] hover:bg-[#f8faf8]';

type StatusAction = { kind: 'suspend' | 'reactivate'; users: UserListItem[] };

function Checkbox({ state, onChange, label }: { state: 'on' | 'off' | 'mixed'; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={state === 'mixed' ? 'mixed' : state === 'on'}
      aria-label={label}
      onClick={(event) => {
        event.stopPropagation();
        onChange();
      }}
      className={`flex size-[16px] flex-shrink-0 items-center justify-center rounded-[4px] border ${
        state === 'off' ? 'border-[#c9d3cc] bg-white' : 'border-[#167d35] bg-[#167d35]'
      }`}
    >
      {state === 'on' ? <Check className="size-[11px] text-white" strokeWidth={3} /> : null}
      {state === 'mixed' ? <Minus className="size-[11px] text-white" strokeWidth={3} /> : null}
    </button>
  );
}

function pageList(current: number, last: number): Array<number | 'gap'> {
  if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1);
  const pages = new Set([1, last, current - 1, current, current + 1].filter((p) => p >= 1 && p <= last));
  const sorted = [...pages].sort((a, b) => a - b);
  const out: Array<number | 'gap'> = [];
  sorted.forEach((page, index) => {
    if (index > 0 && page - sorted[index - 1] > 1) out.push('gap');
    out.push(page);
  });
  return out;
}

function roleBreakdown(users: UserListItem[]): string {
  const counts = { runner: 0, buyer: 0, admin: 0 };
  users.forEach((user) => {
    if (user.role === 'runner' || user.role === 'buyer' || user.role === 'admin') counts[user.role] += 1;
  });
  const parts: string[] = [];
  if (counts.runner) parts.push(`${counts.runner} runner${counts.runner === 1 ? '' : 's'}`);
  if (counts.buyer) parts.push(`${counts.buyer} requester${counts.buyer === 1 ? '' : 's'}`);
  if (counts.admin) parts.push(`${counts.admin} admin${counts.admin === 1 ? '' : 's'}`);
  return parts.join(' · ');
}

function csvCell(value: string | number | null | undefined): string {
  const text = value == null ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function downloadSelectedCsv(users: UserListItem[]) {
  const header = ['ID', 'Name', 'Email', 'Phone', 'Role', 'City', 'State', 'Status', 'KYC', 'Jobs', 'Wallet balance', 'Joined', 'Last active'];
  const rows = users.map((user) => [
    user.id,
    userDisplayName(user),
    user.email,
    user.phone,
    user.role,
    user.city,
    user.state,
    accountStatusOf(user),
    kycStatusOf(user),
    user.role === 'runner' ? user.errands_as_runner_count : user.role === 'buyer' ? user.errands_as_buyer_count : '',
    user.wallet_balance ?? '',
    user.created_at,
    user.last_active_at ?? '',
  ]);
  const csv = [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `goquick-users-selected-${users.length}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function UserDirectoryCard({
  filters,
  onFiltersChange,
  search,
  onSearchChange,
  params,
  summary,
}: {
  filters: DirectoryFilters;
  onFiltersChange: (next: DirectoryFilters) => void;
  search: string;
  onSearchChange: (value: string) => void;
  params: ListQueryParams;
  summary?: UsersSummary;
}) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const paramsKey = JSON.stringify(params);
  const [pageState, setPageState] = useState({ key: paramsKey, page: 1 });
  const page = pageState.key === paramsKey ? pageState.page : 1;
  const setPage = (next: number) => setPageState({ key: paramsKey, page: next });

  const [selectionState, setSelectionState] = useState<{ key: string; users: Map<number, UserListItem> }>({
    key: paramsKey,
    users: new Map(),
  });
  const selected = selectionState.key === paramsKey ? selectionState.users : new Map<number, UserListItem>();
  const setSelected = (next: Map<number, UserListItem>) => setSelectionState({ key: paramsKey, users: next });

  const [detailId, setDetailId] = useState<number | null>(null);
  const [messageTargets, setMessageTargets] = useState<UserListItem[] | null>(null);
  const [statusAction, setStatusAction] = useState<StatusAction | null>(null);
  const [notice, setNotice] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const listParams = { ...params, page, per_page: PER_PAGE };
  const listQuery = useQuery({
    queryKey: queryKeys.users.list(listParams),
    queryFn: () => fetchAdminUsers(listParams),
    placeholderData: keepPreviousData,
  });

  const rows = useMemo(() => listQuery.data?.data ?? [], [listQuery.data]);
  const total = listQuery.data?.total ?? 0;
  const lastPage = listQuery.data?.last_page ?? 1;
  const selectedUsers = [...selected.values()];
  const detailUser = detailId != null ? (rows.find((row) => row.id === detailId) ?? selected.get(detailId) ?? null) : null;
  const [detailSnapshot, setDetailSnapshot] = useState<UserListItem | null>(null);
  const drawerUser = detailUser ?? (detailId != null ? detailSnapshot : null);

  const statusMutation = useMutation({
    mutationFn: async (action: StatusAction) => {
      const run = action.kind === 'suspend' ? suspendAdminUser : reactivateAdminUser;
      const results = await Promise.allSettled(action.users.map((user) => run(user.id)));
      const failed = results.filter((r) => r.status === 'rejected') as PromiseRejectedResult[];
      return { action, done: results.length - failed.length, failed };
    },
    onSuccess: ({ action, done, failed }) => {
      const verb = action.kind === 'suspend' ? 'Suspended' : 'Reactivated';
      if (failed.length === 0) {
        setNotice({ tone: 'ok', text: `${verb} ${done} user${done === 1 ? '' : 's'}.` });
      } else {
        setNotice({
          tone: 'error',
          text: `${verb} ${done}, ${failed.length} failed: ${getApiErrorMessage(failed[0].reason, 'Request failed.')}`,
        });
      }
      setStatusAction(null);
      setSelected(new Map());
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
  });

  const pageIds = rows.map((row) => row.id);
  const selectedOnPage = pageIds.filter((id) => selected.has(id)).length;
  const headerState: 'on' | 'off' | 'mixed' =
    selectedOnPage === 0 ? 'off' : selectedOnPage === pageIds.length ? 'on' : 'mixed';

  const toggleRow = (user: UserListItem) => {
    const next = new Map(selected);
    if (next.has(user.id)) next.delete(user.id);
    else next.set(user.id, user);
    setSelected(next);
  };

  const togglePage = () => {
    const next = new Map(selected);
    if (headerState === 'on') rows.forEach((row) => next.delete(row.id));
    else rows.forEach((row) => next.set(row.id, row));
    setSelected(next);
  };

  const openDetail = (user: UserListItem) => {
    setDetailSnapshot(user);
    setDetailId(user.id);
  };

  const askStatusChange = (kind: StatusAction['kind'], users: UserListItem[]) => {
    const eligible = users.filter((user) => user.role !== 'admin' && (kind === 'suspend' ? !user.is_suspended : user.is_suspended));
    if (eligible.length === 0) {
      setNotice({
        tone: 'error',
        text: kind === 'suspend' ? 'None of the selected users can be suspended.' : 'None of the selected users are suspended.',
      });
      return;
    }
    setStatusAction({ kind, users: eligible });
  };

  const rowMenu = (user: UserListItem): ActionMenuItem[] => {
    const items: ActionMenuItem[] = [{ label: 'Quick view', icon: Eye, onSelect: () => openDetail(user) }];
    if (user.role !== 'admin') {
      items.push({ label: 'Open full profile', icon: UserRound, onSelect: () => navigate(getAdmin2UserHref(user.id)) });
      if (user.role === 'runner') {
        items.push({ label: 'Open runner profile', icon: Bike, onSelect: () => navigate(getAdmin2RunnerHref(user.id)) });
      }
      items.push({ label: 'Send message', icon: Mail, onSelect: () => setMessageTargets([user]) });
      items.push(
        user.is_suspended
          ? { label: 'Reactivate account', icon: UserCheck, onSelect: () => askStatusChange('reactivate', [user]) }
          : { label: 'Suspend account', icon: UserX, danger: true, onSelect: () => askStatusChange('suspend', [user]) },
      );
    }
    return items;
  };

  const chips = activeChips(filters);
  const hasAnyFilter = chips.length > 0 || search.trim() !== '';
  const updateFilter = <K extends keyof DirectoryFilters>(key: K, value: DirectoryFilters[K]) =>
    onFiltersChange({ ...filters, [key]: value });

  const messageIds = (messageTargets ?? []).filter((user) => user.role !== 'admin').map((user) => user.id);
  const skippedAdmins = (messageTargets ?? []).length - messageIds.length;

  return (
    <Card className="w-full overflow-hidden">
      <div className="flex gap-[3px] overflow-x-auto border-b border-[#e2e8e3] px-[16px]" role="tablist">
        {TABS.map((tab) => {
          const active = filters.role === tab.value;
          const count = summary?.tabs[tab.countKey];
          return (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => updateFilter('role', tab.value)}
              className={`-mb-px flex flex-shrink-0 items-center gap-[6px] border-b-2 px-[13px] py-[10px] text-[12px] ${
                active ? 'border-[#167d35] font-semibold text-[#0d5e27]' : 'border-transparent font-medium text-[#45514a] hover:text-[#17211b]'
              }`}
            >
              {tab.label}
              {count != null ? (
                <span
                  className={`rounded-full px-[6px] py-[2px] text-[9px] font-semibold ${
                    active ? 'bg-[#eaf6ed] text-[#167d35]' : 'bg-[#f8faf8] text-[#7c857f]'
                  }`}
                >
                  {formatCount(count)}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-[10px] border-b border-[#e2e8e3] px-[16px] pb-[12px] pt-[14px]">
        <div className="flex flex-wrap items-center gap-[10px]">
          <label className="flex h-[36px] min-w-[220px] flex-1 items-center gap-[8px] rounded-[8px] border border-[#e2e8e3] bg-[#f8faf8] px-[11px] focus-within:border-[#167d35]">
            <Search className="size-[15px] flex-shrink-0 text-[#7c857f]" strokeWidth={1.8} />
            <input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search name, email, phone or user ID…"
              className="h-full min-w-0 flex-1 bg-transparent text-[11px] text-[#17211b] outline-none placeholder:text-[#7c857f]"
            />
            {search ? (
              <button type="button" onClick={() => onSearchChange('')} aria-label="Clear search" className="text-[#7c857f] hover:text-[#17211b]">
                <X className="size-[13px]" />
              </button>
            ) : null}
          </label>
          <FilterDropdown label="Role" value={filters.role} options={ROLE_OPTIONS} onChange={(v) => updateFilter('role', v as RoleFilter)} />
          <FilterDropdown
            label="Status"
            value={filters.status}
            options={STATUS_OPTIONS}
            onChange={(v) => updateFilter('status', v as DirectoryFilters['status'])}
          />
          <FilterDropdown
            label="KYC"
            value={filters.kyc}
            options={KYC_OPTIONS}
            onChange={(v) => updateFilter('kyc', v as DirectoryFilters['kyc'])}
            align="right"
          />
        </div>
        <div className="flex flex-wrap items-center gap-[10px]">
          <FilterDropdown label="City / zone" value={filters.city} options={cityOptions(summary?.cities)} onChange={(v) => updateFilter('city', v)} />
          <FilterDropdown
            label="Joined"
            value={filters.joined}
            options={JOINED_OPTIONS}
            onChange={(v) => updateFilter('joined', v as DirectoryFilters['joined'])}
          />
          {chips.map((chip) => (
            <span
              key={chip.key}
              className="flex items-center gap-[5px] rounded-full bg-[#eaf6ed] px-[9px] py-[5px] text-[10px] font-semibold text-[#0d5e27]"
            >
              {chip.label}
              <button
                type="button"
                aria-label={`Remove ${chip.label}`}
                onClick={() => updateFilter(chip.key, DEFAULT_FILTERS[chip.key])}
                className="text-[#0d5e27]/70 hover:text-[#0d5e27]"
              >
                <X className="size-[12px]" />
              </button>
            </span>
          ))}
          {hasAnyFilter ? (
            <button
              type="button"
              onClick={() => {
                onFiltersChange(DEFAULT_FILTERS);
                onSearchChange('');
              }}
              className="text-[10px] font-semibold text-[#167d35] hover:underline"
            >
              Clear all
            </button>
          ) : null}
          <p className="ml-auto text-[10px] text-[#7c857f]">
            {listQuery.data
              ? total === 0
                ? 'No matching users'
                : `Showing ${listQuery.data.from ?? 0}–${listQuery.data.to ?? 0} of ${formatCount(total)} matching users`
              : 'Loading users…'}
          </p>
        </div>
      </div>

      {notice ? (
        <div
          className={`flex items-center justify-between gap-3 border-b border-[#e2e8e3] px-[16px] py-[8px] text-[11px] font-medium ${
            notice.tone === 'ok' ? 'bg-[#f3faf5] text-[#0d5e27]' : 'bg-[#fff0f0] text-[#b84545]'
          }`}
        >
          {notice.text}
          <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss">
            <X className="size-[13px]" />
          </button>
        </div>
      ) : null}

      {selected.size > 0 ? (
        <div className="flex flex-wrap items-center gap-[12px] border-b border-[#e2e8e3] bg-[#f3faf5] px-[14px] py-[9px]">
          <Checkbox state="on" onChange={() => setSelected(new Map())} label="Clear selection" />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold text-[#17211b]">
              {selected.size} user{selected.size === 1 ? '' : 's'} selected
            </p>
            <p className="text-[10px] text-[#7c857f]">{roleBreakdown(selectedUsers)}</p>
          </div>
          <button type="button" className={BAR_BUTTON} onClick={() => setMessageTargets(selectedUsers)}>
            <Mail className="size-[15px]" strokeWidth={1.8} /> Send message
          </button>
          <ActionMenu
            className={BAR_BUTTON}
            items={[
              { label: 'Suspend accounts', icon: UserX, danger: true, onSelect: () => askStatusChange('suspend', selectedUsers) },
              { label: 'Reactivate accounts', icon: UserCheck, onSelect: () => askStatusChange('reactivate', selectedUsers) },
            ]}
          >
            <RefreshCw className="size-[15px]" strokeWidth={1.8} /> Change status
          </ActionMenu>
          <ActionMenu
            className={BAR_BUTTON}
            items={[
              { label: 'Export selected (CSV)', icon: Download, onSelect: () => downloadSelectedCsv(selectedUsers) },
              { label: 'Clear selection', icon: X, onSelect: () => setSelected(new Map()) },
            ]}
          >
            <Ellipsis className="size-[15px]" strokeWidth={1.8} /> More actions
          </ActionMenu>
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <div className="min-w-[1010px]">
          <div className={`${GRID_COLUMNS} h-[42px] bg-[#f8faf8] text-[9px] font-semibold uppercase tracking-[0.27px] text-[#7c857f]`}>
            <Checkbox state={rows.length ? headerState : 'off'} onChange={togglePage} label="Select all on this page" />
            <span>User &amp; contact</span>
            <span>Role</span>
            <span>Location</span>
            <span>Status</span>
            <span>KYC</span>
            <span>Jobs</span>
            <span>Wallet</span>
            <span>Joined</span>
            <span>Last active</span>
            <span />
          </div>

          {listQuery.isLoading
            ? Array.from({ length: 6 }, (_, i) => (
                <div key={i} className={`${GRID_COLUMNS} h-[66px] border-b border-[#e2e8e3]`}>
                  <Skeleton className="size-[16px]" />
                  <div className="flex items-center gap-[10px]">
                    <Skeleton className="size-[32px] rounded-full" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-[10px] w-[120px]" />
                      <Skeleton className="h-[8px] w-[170px]" />
                    </div>
                  </div>
                  {Array.from({ length: 8 }, (_, j) => (
                    <Skeleton key={j} className="h-[12px] w-[56px]" />
                  ))}
                  <span />
                </div>
              ))
            : null}

          {listQuery.isError ? (
            <p className="px-[16px] py-[28px] text-center text-[12px] text-[#b84545]">
              {getApiErrorMessage(listQuery.error, 'Could not load users.')}
            </p>
          ) : null}

          {listQuery.isSuccess && rows.length === 0 ? (
            <div className="px-[16px] py-[36px] text-center">
              <p className="text-[12px] font-semibold text-[#17211b]">No users match these filters</p>
              {hasAnyFilter ? (
                <button
                  type="button"
                  onClick={() => {
                    onFiltersChange(DEFAULT_FILTERS);
                    onSearchChange('');
                  }}
                  className="mt-1 text-[11px] font-semibold text-[#167d35] hover:underline"
                >
                  Clear all filters
                </button>
              ) : null}
            </div>
          ) : null}

          {rows.map((user) => {
            const name = userDisplayName(user);
            const tone = avatarTone(user);
            const jobs = jobsOf(user);
            const isSelected = selected.has(user.id);
            const contact = [user.email, user.phone].filter(Boolean).join(' · ');
            const location = [user.city, user.state].filter(Boolean).join(' · ');
            return (
              <div
                key={user.id}
                onClick={() => openDetail(user)}
                className={`${GRID_COLUMNS} h-[66px] cursor-pointer border-b border-[#e2e8e3] transition-colors ${
                  isSelected ? 'bg-[#f3faf5]' : 'hover:bg-[#fafcfa]'
                } ${listQuery.isPlaceholderData ? 'opacity-60' : ''}`}
              >
                <Checkbox state={isSelected ? 'on' : 'off'} onChange={() => toggleRow(user)} label={`Select ${name}`} />
                <div className="flex min-w-0 items-center gap-[10px]">
                  <PersonAvatar name={name} url={user.avatar_url} tone={tone} size={32} />
                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-semibold text-[#17211b]">{name}</p>
                    <p className="truncate text-[9px] text-[#7c857f]">{contact || `User #${user.id}`}</p>
                  </div>
                </div>
                <div>
                  <RoleBadge role={user.role} />
                </div>
                <p className="truncate text-[10px] text-[#45514a]">{location || '—'}</p>
                <div>
                  <StatusBadge status={accountStatusOf(user)} />
                </div>
                <div>
                  <KycBadge status={kycStatusOf(user)} />
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-[#17211b]">{jobs.value}</p>
                  <p className="text-[9px] text-[#7c857f]">{jobs.unit}</p>
                </div>
                <p className="truncate text-[10px] font-semibold text-[#17211b]">
                  {user.role === 'admin' || user.wallet_balance == null ? '—' : formatNaira(user.wallet_balance)}
                </p>
                <p className="text-[9px] text-[#45514a]">{joinedLabel(user.created_at)}</p>
                <p className="text-[9px] text-[#7c857f]">{lastActiveLabel(user.last_active_at)}</p>
                <ActionMenu
                  items={rowMenu(user)}
                  ariaLabel={`Actions for ${name}`}
                  className="flex size-[18px] items-center justify-center rounded text-[#7c857f] hover:bg-[#eef2ef] hover:text-[#17211b]"
                >
                  <EllipsisVertical className="size-[16px]" />
                </ActionMenu>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 px-[16px] py-[12px]">
        <p className="text-[10px] text-[#7c857f]">
          Showing {formatCount(rows.length)} of {formatCount(total)} users
          {listQuery.dataUpdatedAt ? ` · Updated ${relativeAgo(new Date(listQuery.dataUpdatedAt).toISOString())}` : ''}
        </p>
        {lastPage > 1 ? (
          <nav className="flex items-center gap-[6px]" aria-label="Pagination">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              aria-label="Previous page"
              className="flex size-[28px] items-center justify-center rounded-[6px] border border-[#d4ddd6] bg-white text-[#45514a] disabled:opacity-40"
            >
              <ChevronLeft className="size-[14px]" />
            </button>
            {pageList(page, lastPage).map((item, index) =>
              item === 'gap' ? (
                <span key={`gap-${index}`} className="px-[2px] text-[10px] text-[#7c857f]">
                  …
                </span>
              ) : (
                <button
                  key={item}
                  type="button"
                  onClick={() => setPage(item)}
                  aria-current={item === page ? 'page' : undefined}
                  className={`flex h-[28px] min-w-[28px] items-center justify-center rounded-[6px] px-[6px] text-[10px] ${
                    item === page
                      ? 'bg-[#167d35] font-bold text-white'
                      : 'border border-[#d4ddd6] bg-white font-medium text-[#45514a] hover:bg-[#f8faf8]'
                  }`}
                >
                  {item}
                </button>
              ),
            )}
            <button
              type="button"
              disabled={page >= lastPage}
              onClick={() => setPage(page + 1)}
              aria-label="Next page"
              className="flex size-[28px] items-center justify-center rounded-[6px] border border-[#d4ddd6] bg-white text-[#45514a] disabled:opacity-40"
            >
              <ChevronRight className="size-[14px]" />
            </button>
          </nav>
        ) : null}
      </div>

      <UserDetailsDrawer
        user={drawerUser}
        onClose={() => setDetailId(null)}
        busy={statusMutation.isPending}
        onMessage={(user) => setMessageTargets([user])}
        onToggleSuspension={(user) => askStatusChange(user.is_suspended ? 'reactivate' : 'suspend', [user])}
      />

      <SendMessageModal
        open={messageTargets != null}
        onClose={() => setMessageTargets(null)}
        userIds={messageIds}
        skippedAdmins={skippedAdmins}
      />

      <Modal
        open={statusAction != null}
        onClose={() => (statusMutation.isPending ? undefined : setStatusAction(null))}
        title={statusAction?.kind === 'suspend' ? 'Suspend accounts' : 'Reactivate accounts'}
        size="sm"
      >
        {statusAction ? (
          <div className="space-y-4 font-inter">
            <p className="text-[12px] text-[#45514a]">
              {statusAction.kind === 'suspend'
                ? 'Suspended users are signed out and cannot post or accept errands until reactivated.'
                : 'Reactivated users regain full access to their account.'}
            </p>
            <ul className="max-h-[160px] space-y-1 overflow-y-auto rounded-[8px] border border-[#e2e8e3] bg-[#f8faf8] p-2">
              {statusAction.users.map((user) => (
                <li key={user.id} className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="truncate font-semibold text-[#17211b]">{userDisplayName(user)}</span>
                  <RoleBadge role={user.role} />
                </li>
              ))}
            </ul>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={statusMutation.isPending}
                onClick={() => setStatusAction(null)}
                className="h-[36px] rounded-[8px] border border-[#d4ddd6] bg-white px-[14px] text-[12px] font-semibold text-[#45514a]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={statusMutation.isPending}
                onClick={() => statusMutation.mutate(statusAction)}
                className={`h-[36px] rounded-[8px] px-[14px] text-[12px] font-semibold text-white disabled:opacity-60 ${
                  statusAction.kind === 'suspend' ? 'bg-[#b84545]' : 'bg-[#167d35]'
                }`}
              >
                {statusMutation.isPending
                  ? 'Working…'
                  : `${statusAction.kind === 'suspend' ? 'Suspend' : 'Reactivate'} ${statusAction.users.length} user${
                      statusAction.users.length === 1 ? '' : 's'
                    }`}
              </button>
            </div>
          </div>
        ) : null}
      </Modal>
    </Card>
  );
}
