import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { fetchAdminRunnerPayouts } from '@/api/adminRunnersApi';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import { queryKeys } from '@/lib/queryKeys';
import type { AdminRunnerProfile } from '@/types/api';
import { formatCount, formatNaira } from '../format';
import { Card, Skeleton } from '../overview/primitives';
import { titleCase, watShortDate } from '../errand/errandPresentation';
import { Chip, SectionHeader, SectionLink } from '../errand/parts';
import { GRAY } from '../userDetails/presentation';
import { PAYOUT_STATES, periodLabel } from './presentation';

const COLUMNS = 'grid grid-cols-[84px_110px_minmax(0,1fr)_86px_80px_62px] items-center gap-[10px] px-[12px]';
const COMPACT = 4;
const EXPANDED = 12;

export function PayoutHistoryCard({ profile }: { profile: AdminRunnerProfile }) {
  const runnerId = profile.runner.id;
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState(false);
  const perPage = expanded ? EXPANDED : COMPACT;
  const account = profile.payout_account;

  const payoutsQuery = useQuery({
    queryKey: [...queryKeys.runners.payouts(runnerId, page), perPage],
    queryFn: () => fetchAdminRunnerPayouts(runnerId, { page, per_page: perPage }),
    placeholderData: keepPreviousData,
  });
  const data = payoutsQuery.data;
  const rows = data?.data ?? [];

  return (
    <Card className="flex w-full flex-col overflow-hidden">
      <div className="p-[16px]">
        <SectionHeader
          title="Payout history"
          subtitle={account
            ? `Withdrawals to ${account.bank_name ?? 'bank'} •• ${account.account_last4}`
            : 'No payout account on file'}
          action={data && data.total > COMPACT ? (
            <SectionLink
              onClick={() => {
                setExpanded((value) => !value);
                setPage(1);
              }}
            >
              {expanded ? 'Show fewer' : `View all ${formatCount(data.total)} payouts`}
            </SectionLink>
          ) : null}
        />
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-[560px]">
          <div className={`${COLUMNS} h-[38px] border-b border-[#e2e8e3] bg-[#f8faf8] text-[9px] font-semibold uppercase tracking-[0.27px] text-[#7c857f]`}>
            <span>Payout</span>
            <span>Period</span>
            <span>Work</span>
            <span>Amount</span>
            <span>Status</span>
            <span>Paid</span>
          </div>
          {payoutsQuery.isLoading ? (
            <div className="space-y-2 p-[12px]">
              {Array.from({ length: 3 }, (_, i) => (
                <Skeleton key={i} className="h-[24px] w-full" />
              ))}
            </div>
          ) : null}
          {payoutsQuery.isError && !data ? (
            <p className="px-[12px] py-[14px] text-[11px] text-[#b84545]">{getApiErrorMessage(payoutsQuery.error, 'Could not load payouts.')}</p>
          ) : null}
          {data && rows.length === 0 ? (
            <p className="px-[12px] py-[18px] text-center text-[11px] text-[#7c857f]">No withdrawals yet.</p>
          ) : null}
          {rows.map((row) => {
            const state = PAYOUT_STATES[row.status] ?? { label: titleCase(row.status), tone: GRAY };
            return (
              <div key={row.id} className={`${COLUMNS} border-b border-[#e2e8e3] py-[12px] last:border-b-0`}>
                <span className="truncate text-[10px] font-semibold text-[#45514a]" title={row.reference ?? undefined}>
                  {row.code}
                </span>
                <span className="truncate text-[10px] text-[#45514a]">{periodLabel(row.period_start, row.created_at)}</span>
                <span className="truncate text-[10px] text-[#7c857f]">
                  {row.errands_count} {row.errands_count === 1 ? 'errand' : 'errands'}
                </span>
                <span
                  className="truncate text-[10px] font-semibold text-[#45514a]"
                  title={row.fee > 0 ? `${formatNaira(row.fee)} withdrawal fee` : undefined}
                >
                  {formatNaira(row.amount)}
                </span>
                <span>
                  <Chip tone={state.tone} label={state.label} />
                </span>
                <span className="truncate text-[10px] text-[#7c857f]">
                  {row.status === 'paid' ? watShortDate(row.processed_at ?? row.created_at ?? '') : '—'}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      {data && data.last_page > 1 ? (
        <div className="flex items-center justify-end gap-[6px] border-t border-[#e2e8e3] px-[12px] py-[11px] text-[10px] font-semibold text-[#167d35]">
          <button type="button" aria-label="Previous page" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="disabled:text-[#c4cbc6]">
            <ChevronLeft className="size-[13px]" />
          </button>
          <span>
            {data.current_page} of {data.last_page}
          </span>
          <button
            type="button"
            aria-label="Next page"
            disabled={page >= data.last_page}
            onClick={() => setPage((p) => p + 1)}
            className="disabled:text-[#c4cbc6]"
          >
            <ChevronRight className="size-[13px]" />
          </button>
        </div>
      ) : null}
    </Card>
  );
}
