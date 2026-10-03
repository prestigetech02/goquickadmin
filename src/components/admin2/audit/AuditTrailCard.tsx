import { Link } from 'react-router-dom';
import { ShieldCheck, X } from 'lucide-react';
import type { AdminAuditLogEntry, AdminAuditLogOptions } from '@/types/api';
import { getAdmin2UserHref } from '@/lib/adminNavigation';
import { formatCount, personInitials, relativeAgo } from '../format';
import { Chip } from '../errand/parts';
import { Card, Skeleton } from '../overview/primitives';
import { Pager } from '../shared/Pager';
import { CardTabs, SearchField, TABLE_HEADER } from '../shared/TableControls';
import { AUDIT_TABS, type AuditTab, areaLabel, areaTone, auditClock, auditTime, methodTone, outcomeOf } from './auditPresentation';

const GRID_COLUMNS =
  'grid grid-cols-[112px_minmax(150px,1fr)_minmax(240px,1.8fr)_minmax(110px,0.7fr)_minmax(140px,1fr)_92px_minmax(130px,0.9fr)] items-center gap-x-[12px] px-[16px]';

const SELECT =
  'h-[36px] rounded-[8px] border border-[#e2e8e3] bg-white px-[10px] text-[11px] text-[#17211b] outline-none focus:border-[#167d35] disabled:opacity-50';

export type AuditFilterState = {
  tab: AuditTab;
  search: string;
  adminId: string;
  resource: string;
  from: string;
  to: string;
};

export function AuditTrailCard({
  entries,
  options,
  loading,
  error,
  dimmed,
  filters,
  onFiltersChange,
  targetUser,
  onClearTargetUser,
  page,
  lastPage,
  total,
  onPageChange,
  onOpen,
}: {
  entries: AdminAuditLogEntry[];
  options: AdminAuditLogOptions | undefined;
  loading: boolean;
  error: string | null;
  dimmed: boolean;
  filters: AuditFilterState;
  onFiltersChange: (next: Partial<AuditFilterState>) => void;
  targetUser: { id: number; name: string | null } | null;
  onClearTargetUser: () => void;
  page: number;
  lastPage: number;
  total: number;
  onPageChange: (page: number) => void;
  onOpen: (entry: AdminAuditLogEntry) => void;
}) {
  const filtered = Boolean(filters.search || filters.adminId || filters.resource || filters.from || filters.to);

  return (
    <Card className="w-full overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-[16px] pb-[4px] pt-[16px]">
        <div className="flex min-w-0 flex-col gap-[4px]">
          <p className="text-[14px] font-semibold text-[#17211b]">Audit trail</p>
          <p className="text-[11px] text-[#7c857f]">Every change made through the admin API, plus sign-ins and exports. Entries can't be edited.</p>
        </div>
      </div>

      <CardTabs tabs={AUDIT_TABS} value={filters.tab} onChange={(tab) => onFiltersChange({ tab })} />

      <div className="flex flex-wrap items-center gap-[10px] border-b border-[#e2e8e3] px-[16px] py-[12px]">
        <SearchField value={filters.search} onChange={(search) => onFiltersChange({ search })} placeholder="Search action, path, admin or IP…" />
        <select value={filters.adminId} onChange={(e) => onFiltersChange({ adminId: e.target.value })} className={SELECT} aria-label="Admin">
          <option value="">All admins</option>
          {options?.admins.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        <select
          value={filters.tab === 'sign_ins' ? 'auth' : filters.resource}
          onChange={(e) => onFiltersChange({ resource: e.target.value })}
          disabled={filters.tab === 'sign_ins'}
          className={SELECT}
          aria-label="Area"
        >
          <option value="">All areas</option>
          {options?.resources.map((r) => (
            <option key={r.key} value={r.key}>
              {areaLabel(r.key)}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={filters.from}
          max={filters.to || undefined}
          onChange={(e) => onFiltersChange({ from: e.target.value })}
          className={SELECT}
          aria-label="From date"
        />
        <input
          type="date"
          value={filters.to}
          min={filters.from || undefined}
          onChange={(e) => onFiltersChange({ to: e.target.value })}
          className={SELECT}
          aria-label="To date"
        />
        {filtered ? (
          <button
            type="button"
            onClick={() => onFiltersChange({ search: '', adminId: '', resource: '', from: '', to: '' })}
            className="text-[11px] font-semibold text-[#45514a] hover:text-[#17211b]"
          >
            Clear filters
          </button>
        ) : null}
      </div>

      {targetUser ? (
        <div className="flex items-center gap-[8px] border-b border-[#e2e8e3] bg-[#f8faf8] px-[16px] py-[8px] text-[11px] text-[#45514a]">
          <span className="rounded-full bg-[#eaf6ed] px-[9px] py-[3px] font-semibold text-[#0d5e27]">
            Actions on {targetUser.name ?? `user #${targetUser.id}`}
          </span>
          <button type="button" onClick={onClearTargetUser} className="flex items-center gap-[3px] font-semibold hover:text-[#17211b]">
            <X className="size-[12px]" /> Clear
          </button>
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <div className="min-w-[1080px]">
          <div className={`${GRID_COLUMNS} ${TABLE_HEADER}`}>
            <span>Time (WAT)</span>
            <span>Admin</span>
            <span>Action</span>
            <span>Area</span>
            <span>Affected</span>
            <span>Result</span>
            <span>IP · device</span>
          </div>

          {loading
            ? Array.from({ length: 8 }, (_, i) => (
                <div key={i} className={`${GRID_COLUMNS} h-[60px] border-b border-[#e2e8e3]`}>
                  {Array.from({ length: 7 }, (_, j) => (
                    <Skeleton key={j} className="h-[10px] w-[70px]" />
                  ))}
                </div>
              ))
            : null}

          {error ? <p className="px-[16px] py-[28px] text-center text-[12px] text-[#b84545]">{error}</p> : null}

          {!loading && !error && entries.length === 0 ? (
            <div className="px-[16px] py-[40px] text-center">
              <p className="text-[12px] font-semibold text-[#17211b]">No admin activity matches these filters</p>
              <p className="mt-[4px] text-[11px] text-[#7c857f]">Try a wider date range or clear the filters.</p>
            </div>
          ) : null}

          {entries.map((entry) => {
            const outcome = outcomeOf(entry);
            const method = methodTone(entry.method);
            const name = entry.admin?.name ?? 'Unknown';
            return (
              <div
                key={entry.id}
                role="button"
                tabIndex={0}
                onClick={() => onOpen(entry)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onOpen(entry);
                }}
                className={`${GRID_COLUMNS} min-h-[60px] cursor-pointer border-b border-[#e2e8e3] py-[9px] transition-colors hover:bg-[#fafcfa] ${
                  dimmed ? 'opacity-60' : ''
                }`}
              >
                <div className="min-w-0" title={auditTime(entry.created_at)}>
                  <p className="text-[11px] font-semibold text-[#17211b]">{auditClock(entry.created_at)}</p>
                  <p className="truncate text-[10px] text-[#7c857f]">{relativeAgo(entry.created_at)}</p>
                </div>
                <div className="flex min-w-0 items-center gap-[8px]">
                  <span className="flex size-[26px] flex-shrink-0 items-center justify-center rounded-full bg-[#e8f1fb] text-[9px] font-bold text-[#2563a8]">
                    {entry.admin ? personInitials(name) : '?'}
                  </span>
                  <span className="truncate text-[11px] font-semibold text-[#17211b]">{name}</span>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[12px] font-semibold text-[#17211b]">{entry.label}</p>
                  <div className="mt-[3px] flex min-w-0 items-center gap-[6px]">
                    <span
                      className="flex-shrink-0 rounded-[4px] px-[5px] py-[1px] font-mono text-[9px] font-bold"
                      style={{ backgroundColor: method.bg, color: method.color }}
                    >
                      {entry.method}
                    </span>
                    <span className="truncate font-mono text-[10px] text-[#7c857f]">{entry.path}</span>
                  </div>
                  {entry.approved_by ? (
                    <p className="mt-[4px] flex items-center gap-[4px] text-[10px] font-semibold text-[#6b46c1]">
                      <ShieldCheck className="size-[11px]" /> Approved by {entry.approved_by.name ?? 'a super admin'}
                    </p>
                  ) : null}
                </div>
                <div>
                  <Chip tone={areaTone(entry.resource)} label={areaLabel(entry.resource)} />
                </div>
                <div className="min-w-0">
                  {entry.target_user ? (
                    <Link
                      to={getAdmin2UserHref(entry.target_user.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="block truncate text-[11px] font-semibold text-[#167d35] hover:underline"
                    >
                      {entry.target_user.name ?? `User #${entry.target_user.id}`}
                    </Link>
                  ) : entry.subject ? (
                    <span className="truncate text-[11px] text-[#45514a]">
                      {entry.subject.type} #{entry.subject.id}
                    </span>
                  ) : (
                    <span className="text-[11px] text-[#c2c9c4]">—</span>
                  )}
                </div>
                <div>
                  <Chip tone={outcome.tone} label={outcome.label} dot />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-mono text-[10px] text-[#45514a]">{entry.ip_address ?? '—'}</p>
                  {entry.device ? <p className="truncate text-[10px] text-[#7c857f]">{entry.device}</p> : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 px-[16px] py-[12px]">
        <p className="text-[10px] text-[#7c857f]">
          Showing {formatCount(entries.length)} of {formatCount(total)} entries
        </p>
        <Pager page={page} lastPage={lastPage} onChange={onPageChange} />
      </div>
    </Card>
  );
}
