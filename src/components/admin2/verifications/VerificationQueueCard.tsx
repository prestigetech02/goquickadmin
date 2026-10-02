import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { fetchAdminKycQueue } from '@/api/adminKycApi';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import { queryKeys } from '@/lib/queryKeys';
import type { AdminKycFilters, AdminKycOverview, AdminKycRow } from '@/types/api';
import { formatCount, formatDateRange, relativeAgo, shortAge } from '../format';
import { watShortDate, watTime } from '../errand/errandPresentation';
import { Chip, PersonAvatar } from '../errand/parts';
import { Card, Skeleton } from '../overview/primitives';
import { pageForKey } from '../shared/helpers';
import { Pager } from '../shared/Pager';
import { CardTabs, DateRangeToggle, SearchField, TABLE_HEADER } from '../shared/TableControls';
import { userTone } from '../transactions/presentation';
import { FilterDropdown } from '../users/FilterDropdown';
import {
  CHECK_COLORS,
  CHECK_ICONS,
  DEFAULT_QUEUE_FILTERS,
  RISK_OPTIONS,
  RISK_TONES,
  STAGE_LABELS,
  documentOptions,
  riskChipLabel,
  stageTabs,
  statusChip,
  type QueueFilters,
} from './presentation';
import type { KycDecision } from './KycDecisionModal';

const PER_PAGE = 10;

const GRID_COLUMNS =
  'grid grid-cols-[minmax(170px,1.5fr)_minmax(130px,1.1fr)_128px_minmax(110px,0.9fr)_84px_minmax(120px,1fr)_minmax(110px,0.9fr)_92px_136px] items-center gap-x-[12px] px-[16px]';

const OUTLINE_SMALL =
  'h-[28px] rounded-[7px] border border-[#d4ddd6] bg-white px-[10px] text-[10px] font-semibold text-[#17211b] hover:bg-[#f8faf8]';

function ChecksCell({ row }: { row: AdminKycRow }) {
  return (
    <div className="flex items-center gap-[6px]">
      <div className="flex gap-[3px]">
        {row.checks.map((check) => {
          const Icon = CHECK_ICONS[check.key];
          const colors = CHECK_COLORS[check.status];
          return (
            <span
              key={check.key}
              title={`${check.label}: ${check.detail ?? colors.label}`}
              className="flex size-[18px] items-center justify-center rounded-[5px]"
              style={{ backgroundColor: colors.bg }}
            >
              <Icon className="size-[11px]" strokeWidth={2} color={colors.color} />
            </span>
          );
        })}
      </div>
      <span className="text-[10px] font-semibold text-[#45514a]">
        {row.checks_passed}/{row.checks_total}
      </span>
    </div>
  );
}

function ProgressCell({ row }: { row: AdminKycRow }) {
  if (row.stage === 'ready' || row.stage === 'incomplete') {
    const missing = row.checks.filter((check) => check.status === 'missing').length;
    return (
      <div className="min-w-0">
        <p className={`truncate text-[10px] font-semibold ${row.sla_breached ? 'text-[#b06d12]' : 'text-[#17211b]'}`}>
          {row.submitted_at ? `${shortAge(row.submitted_at)} waiting` : '—'}
        </p>
        <p className="truncate text-[9px] text-[#7c857f]">
          {row.stage === 'incomplete' ? `Waiting on runner · ${missing} missing` : row.sla_breached ? 'Past review target' : 'Within review target'}
        </p>
      </div>
    );
  }

  const note = row.stage === 'rejected' ? (row.rejection_reason ?? 'Rejected') : row.reviewed_at ? `${watShortDate(row.reviewed_at)} · ${watTime(row.reviewed_at)}` : 'Approved';
  return (
    <div className="min-w-0">
      <p className="truncate text-[10px] font-semibold text-[#17211b]">
        {row.reviewer?.name.split(' ')[0] ?? 'Admin'}
        {row.reviewed_at ? ` · ${shortAge(row.reviewed_at)}` : ''}
      </p>
      <p className="truncate text-[9px] text-[#7c857f]" title={note}>
        {note}
      </p>
    </div>
  );
}

export function VerificationQueueCard({
  overview,
  filters,
  onFiltersChange,
  search,
  onSearchChange,
  params,
  range,
  onReview,
  onAction,
}: {
  overview?: AdminKycOverview;
  filters: QueueFilters;
  onFiltersChange: (filters: QueueFilters) => void;
  search: string;
  onSearchChange: (value: string) => void;
  params: AdminKycFilters;
  range: { start: string; end: string };
  onReview: (id: number) => void;
  onAction: (kind: KycDecision, row: AdminKycRow) => void;
}) {
  const paramsKey = JSON.stringify(params);
  const [pageState, setPageState] = useState({ key: paramsKey, page: 1 });
  const page = pageForKey(pageState, paramsKey);
  const setPage = (next: number) => setPageState({ key: paramsKey, page: next });

  const listParams = { ...params, page, per_page: PER_PAGE };
  const listQuery = useQuery({
    queryKey: queryKeys.runners.kycQueue(listParams),
    queryFn: () => fetchAdminKycQueue(listParams),
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  });

  const rows = listQuery.data?.data ?? [];
  const total = listQuery.data?.total ?? 0;
  const lastPage = listQuery.data?.last_page ?? 1;
  const hasAnyFilter = filters.documentType !== '' || filters.risk !== '' || search.trim() !== '';
  const stageNoun = filters.stage === 'all' ? '' : `${STAGE_LABELS[filters.stage].toLowerCase()} `;

  const update = <K extends keyof QueueFilters>(key: K, value: QueueFilters[K]) => onFiltersChange({ ...filters, [key]: value });
  const clearFilters = (keepStage: boolean) => {
    onFiltersChange({ ...DEFAULT_QUEUE_FILTERS, stage: keepStage ? filters.stage : DEFAULT_QUEUE_FILTERS.stage, useRange: filters.useRange });
    onSearchChange('');
  };

  const actions = (row: AdminKycRow) => {
    if (row.stage !== 'ready') {
      return (
        <button type="button" onClick={() => onReview(row.id)} className={OUTLINE_SMALL}>
          {row.stage === 'incomplete' ? 'Review' : 'View'}
        </button>
      );
    }
    const flagged = row.risk.tone === 'red';
    const clean = row.checks_passed === row.checks_total && row.risks.every((risk) => risk.key === 'sla_breached');
    return (
      <>
        <button type="button" onClick={() => onReview(row.id)} className={OUTLINE_SMALL}>
          Review
        </button>
        {flagged && row.can_reject ? (
          <button
            type="button"
            onClick={() => onAction('reject', row)}
            className="h-[28px] rounded-[7px] border border-[#f0c9c9] bg-white px-[10px] text-[10px] font-semibold text-[#b84545] hover:bg-[#fdeded]"
          >
            Reject
          </button>
        ) : clean && row.can_approve ? (
          <button
            type="button"
            onClick={() => onAction('approve', row)}
            className="h-[28px] rounded-[7px] bg-[#167d35] px-[10px] text-[10px] font-semibold text-white hover:bg-[#0d5e27]"
          >
            Approve
          </button>
        ) : null}
      </>
    );
  };

  return (
    <Card className="w-full overflow-hidden">
      <div className="flex flex-col gap-[4px] px-[16px] pb-[4px] pt-[16px]">
        <p className="text-[14px] font-semibold text-[#17211b]">Verification queue</p>
        <p className="text-[11px] text-[#7c857f]">Oldest submissions first. Check the documents, guarantors and payout account before approving.</p>
      </div>

      <CardTabs tabs={stageTabs(overview)} value={filters.stage} onChange={(stage) => update('stage', stage)} />

      <div className="flex flex-wrap items-center gap-[10px] border-b border-[#e2e8e3] px-[16px] py-[12px]">
        <SearchField value={search} onChange={onSearchChange} placeholder="Search runner name, phone, email or ID number…" />
        <FilterDropdown label="Document" value={filters.documentType} options={documentOptions(overview?.document_types)} onChange={(v) => update('documentType', v)} />
        <FilterDropdown label="Checks" value={filters.risk} options={RISK_OPTIONS} onChange={(v) => update('risk', v as QueueFilters['risk'])} align="right" />
        <DateRangeToggle
          label="Submitted"
          on={filters.useRange}
          rangeLabel={formatDateRange(range.start, range.end)}
          onToggle={() => update('useRange', !filters.useRange)}
        />
        {hasAnyFilter ? (
          <button type="button" onClick={() => clearFilters(true)} className="text-[10px] font-semibold text-[#167d35] hover:underline">
            Clear filters
          </button>
        ) : null}
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[1180px]">
          <div className={`${GRID_COLUMNS} ${TABLE_HEADER}`}>
            <span>Runner</span>
            <span>Document</span>
            <span>Checks</span>
            <span>Vehicle / area</span>
            <span>Submitted</span>
            <span>Risk</span>
            <span>Progress</span>
            <span>Status</span>
            <span className="text-right">Actions</span>
          </div>

          {listQuery.isLoading
            ? Array.from({ length: 6 }, (_, i) => (
                <div key={i} className={`${GRID_COLUMNS} h-[62px] border-b border-[#e2e8e3]`}>
                  <div className="flex items-center gap-[9px]">
                    <Skeleton className="size-[30px] rounded-full" />
                    <Skeleton className="h-[10px] w-[90px]" />
                  </div>
                  {Array.from({ length: 7 }, (_, j) => (
                    <Skeleton key={j} className="h-[10px] w-[60px]" />
                  ))}
                  <Skeleton className="ml-auto h-[26px] w-[110px]" />
                </div>
              ))
            : null}

          {listQuery.isError ? (
            <p className="px-[16px] py-[28px] text-center text-[12px] text-[#b84545]">{getApiErrorMessage(listQuery.error, 'Could not load verifications.')}</p>
          ) : null}

          {listQuery.isSuccess && rows.length === 0 ? (
            <div className="px-[16px] py-[36px] text-center">
              <p className="text-[12px] font-semibold text-[#17211b]">{hasAnyFilter ? 'No submissions match these filters' : `No ${stageNoun}submissions`}</p>
              {hasAnyFilter || filters.stage !== DEFAULT_QUEUE_FILTERS.stage ? (
                <button type="button" onClick={() => clearFilters(false)} className="mt-1 text-[11px] font-semibold text-[#167d35] hover:underline">
                  Back to ready for review
                </button>
              ) : null}
            </div>
          ) : null}

          {rows.map((row) => {
            const name = row.runner?.name ?? 'Unknown runner';
            const status = statusChip(row);
            return (
              <div
                key={row.id}
                className={`${GRID_COLUMNS} h-[62px] border-b border-[#e2e8e3] transition-colors hover:bg-[#fafcfa] ${listQuery.isPlaceholderData ? 'opacity-60' : ''}`}
              >
                <button type="button" onClick={() => onReview(row.id)} className="flex min-w-0 items-center gap-[9px] text-left">
                  <PersonAvatar name={name} url={row.selfie_url} tone={userTone('runner')} size={30} />
                  <span className="min-w-0">
                    <span className="block truncate text-[11px] font-semibold text-[#17211b] hover:text-[#167d35]">{name}</span>
                    <span className="block truncate text-[9px] text-[#7c857f]">{row.runner?.phone ?? row.runner?.email ?? '—'}</span>
                  </span>
                </button>
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-medium text-[#17211b]" title={row.document.label ?? undefined}>
                    {row.document.label ?? 'No ID yet'}
                  </p>
                  <p className="truncate font-mono text-[9px] text-[#7c857f]">{row.document.number_masked ?? '—'}</p>
                </div>
                <ChecksCell row={row} />
                <div className="min-w-0">
                  <p className="truncate text-[11px] text-[#17211b]">{row.vehicle.type ?? '—'}</p>
                  <p className="truncate text-[9px] text-[#7c857f]">{row.area ?? 'No service area'}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-medium text-[#17211b]">{row.submitted_at ? watShortDate(row.submitted_at) : '—'}</p>
                  <p className="text-[9px] text-[#7c857f]">{row.submitted_at ? watTime(row.submitted_at) : ''}</p>
                </div>
                <div className="min-w-0" title={row.risks.map((risk) => risk.label).join(' · ') || undefined}>
                  <Chip tone={RISK_TONES[row.risk.tone]} label={riskChipLabel(row)} />
                </div>
                <ProgressCell row={row} />
                <div>
                  <Chip tone={status.tone} label={status.label} dot />
                </div>
                <div className="flex items-center justify-end gap-[6px]">{actions(row)}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 px-[16px] py-[12px]">
        <p className="text-[10px] text-[#7c857f]">
          Showing {formatCount(rows.length)} of {formatCount(total)} {stageNoun}submission{total === 1 ? '' : 's'}
          {listQuery.dataUpdatedAt ? ` · Updated ${relativeAgo(new Date(listQuery.dataUpdatedAt).toISOString())}` : ''}
        </p>
        <Pager page={page} lastPage={lastPage} onChange={setPage} />
      </div>
    </Card>
  );
}
