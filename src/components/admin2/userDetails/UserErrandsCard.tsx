import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { fetchAdminUserErrands } from '@/api/adminUsersApi';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import { getAdmin2ErrandHref } from '@/lib/adminNavigation';
import { queryKeys } from '@/lib/queryKeys';
import { formatCount, formatNaira } from '../format';
import { Card, Skeleton } from '../overview/primitives';
import { categoryLabel } from '../errand/errandPresentation';
import { Chip, SectionHeader, SectionLink } from '../errand/parts';
import { errandRowStatus, whenLabel } from './presentation';

const COLUMNS = 'grid grid-cols-[78px_minmax(0,1fr)_72px_96px_86px] items-center gap-[10px] px-[12px]';
const COMPACT = 5;
const EXPANDED = 15;

export function UserErrandsCard({
  userId,
  isRunner,
  total,
  title,
  subtitle,
  footer,
}: {
  userId: number;
  isRunner: boolean;
  total: number;
  title: string;
  subtitle: string;
  footer: string;
}) {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState(false);
  const perPage = expanded ? EXPANDED : COMPACT;
  const noun = isRunner ? 'jobs' : 'errands';

  const errandsQuery = useQuery({
    queryKey: [...queryKeys.users.errands(userId, page), perPage],
    queryFn: () => fetchAdminUserErrands(userId, { page, per_page: perPage }),
    placeholderData: keepPreviousData,
  });
  const data = errandsQuery.data;
  const rows = data?.data ?? [];

  return (
    <Card className="flex w-full flex-col overflow-hidden">
      <div className="p-[16px]">
        <SectionHeader
          title={title}
          subtitle={subtitle}
          action={total > COMPACT ? (
            <SectionLink
              onClick={() => {
                setExpanded((value) => !value);
                setPage(1);
              }}
            >
              {expanded ? 'Show fewer' : `View all ${formatCount(total)} ${noun}`}
            </SectionLink>
          ) : null}
        />
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-[520px]">
          <div className={`${COLUMNS} h-[38px] border-b border-[#e2e8e3] bg-[#f8faf8] text-[9px] font-semibold uppercase tracking-[0.27px] text-[#7c857f]`}>
            <span>Errand</span>
            <span>{isRunner ? 'Service / requester' : 'Service / runner'}</span>
            <span>{isRunner ? 'Earning' : 'Amount'}</span>
            <span>Status</span>
            <span>Time</span>
          </div>
          {errandsQuery.isLoading ? (
            <div className="space-y-2 p-[12px]">
              {Array.from({ length: 3 }, (_, i) => (
                <Skeleton key={i} className="h-[30px] w-full" />
              ))}
            </div>
          ) : null}
          {errandsQuery.isError && !data ? (
            <p className="px-[12px] py-[14px] text-[11px] text-[#b84545]">{getApiErrorMessage(errandsQuery.error, 'Could not load errands.')}</p>
          ) : null}
          {data && rows.length === 0 ? (
            <p className="px-[12px] py-[18px] text-center text-[11px] text-[#7c857f]">No errands yet.</p>
          ) : null}
          {rows.map((row) => {
            const status = errandRowStatus(row);
            return (
              <button
                key={row.id}
                type="button"
                onClick={() => navigate(getAdmin2ErrandHref(row.id))}
                className={`${COLUMNS} w-full border-b border-[#e2e8e3] py-[11px] text-left transition-colors hover:bg-[#fbfcfb]`}
              >
                <span className="truncate text-[10px] font-semibold text-[#45514a]">{row.code}</span>
                <span className="flex min-w-0 flex-col gap-[2px]">
                  <span className="truncate text-[10px] font-semibold text-[#17211b]">{row.title?.trim() || categoryLabel(row.category)}</span>
                  <span className="truncate text-[9px] text-[#7c857f]">{row.counterpart ?? (isRunner ? 'Unknown requester' : 'No runner yet')}</span>
                </span>
                <span
                  className="truncate text-[10px] font-semibold text-[#45514a]"
                  title={row.amount_estimated ? 'Estimated: job amount minus the standard commission' : undefined}
                >
                  {row.amount != null ? formatNaira(row.amount) : '—'}
                  {row.amount_estimated && row.amount != null ? <span className="font-normal text-[#7c857f]"> est.</span> : null}
                </span>
                <span>
                  <Chip tone={status.tone} label={status.label} />
                </span>
                <span className="truncate text-[10px] text-[#7c857f]">{whenLabel(row.created_at)}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 px-[12px] py-[11px] text-[10px]">
        <p className="text-[#7c857f]">{footer}</p>
        {data && data.last_page > 1 ? (
          <div className="flex items-center gap-[6px] font-semibold text-[#167d35]">
            <button
              type="button"
              aria-label="Previous page"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="disabled:text-[#c4cbc6]"
            >
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
      </div>
    </Card>
  );
}
