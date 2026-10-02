import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { canAccessPage, getPagePath } from '@/lib/adminNavigation';
import type { DashboardOverview, OverviewLiveBucket } from '@/types/api';
import { formatCount, formatPct } from '../format';
import { Card, CardTitle, Dot, Skeleton } from './primitives';

const BUCKETS: Array<{ key: OverviewLiveBucket; label: string; color: string }> = [
  { key: 'in_progress', label: 'In progress', color: '#167D35' },
  { key: 'matched', label: 'Matched', color: '#3973A8' },
  { key: 'awaiting_runner', label: 'Awaiting runner', color: '#B06D12' },
  { key: 'pending_confirmation', label: 'Pending confirmation', color: '#735CA8' },
];

const SIZE = 126;
const OUTER_RADIUS = 58;
const THICKNESS = 16.24;
const RADIUS = OUTER_RADIUS - THICKNESS / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function StatusDonut({ live }: { live: DashboardOverview['live'] }) {
  let offset = 0;
  return (
    <div className="relative flex-shrink-0" style={{ width: SIZE, height: SIZE }}>
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="-rotate-90" aria-hidden="true">
        <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke="#F8FAF8" strokeWidth={THICKNESS} />
        {live.total > 0
          ? BUCKETS.map((bucket) => {
              const value = live.buckets[bucket.key] ?? 0;
              if (value <= 0) return null;
              const length = (value / live.total) * CIRCUMFERENCE;
              const circle = (
                <circle
                  key={bucket.key}
                  cx={SIZE / 2}
                  cy={SIZE / 2}
                  r={RADIUS}
                  fill="none"
                  stroke={bucket.color}
                  strokeWidth={THICKNESS}
                  strokeDasharray={`${length} ${CIRCUMFERENCE - length}`}
                  strokeDashoffset={-offset}
                />
              );
              offset += length;
              return circle;
            })
          : null}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="max-w-[66px] truncate text-[22px] font-bold leading-normal text-[#17211b]">{formatCount(live.total)}</p>
        <p className="text-[10px] leading-normal text-[#7c857f]">active</p>
      </div>
    </div>
  );
}

export function LiveStatusCard({ data }: { data?: DashboardOverview }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const live = data?.live;

  return (
    <Card className="flex w-full flex-shrink-0 flex-col gap-[14px] p-[18px] xl:h-[326px] xl:w-[358px]">
      <div className="flex items-start justify-between gap-3">
        <CardTitle
          title="Live errand status"
          subtitle={live ? `${formatCount(live.total)} errand${live.total === 1 ? '' : 's'} currently active` : 'Loading…'}
        />
        <span className="flex flex-shrink-0 items-center gap-[5px] rounded-full bg-[#eaf6ed] px-[7px] py-[4px]">
          <span className="relative flex size-[6px]">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#167d35] opacity-60" />
            <span className="relative inline-flex size-[6px] rounded-full bg-[#167d35]" />
          </span>
          <span className="text-[10px] font-semibold leading-none text-[#167d35]">Live</span>
        </span>
      </div>

      <div className="flex flex-1 items-center gap-[18px]">
        {live ? <StatusDonut live={live} /> : <Skeleton className="size-[126px] !rounded-full" />}
        <div className="flex min-w-0 flex-1 flex-col gap-[10px]">
          {BUCKETS.map((bucket) => {
            const value = live?.buckets[bucket.key] ?? 0;
            const pct = live && live.total > 0 ? Math.round((value / live.total) * 100) : 0;
            return (
              <div key={bucket.key} className="flex items-center gap-[7px] text-[11px]">
                <Dot color={bucket.color} size={7} />
                <p className="min-w-0 flex-1 truncate text-[#45514a]">{bucket.label}</p>
                <p className="font-semibold text-[#17211b]">{live ? formatCount(value) : '—'}</p>
                <p className="w-[28px] text-right text-[10px] text-[#7c857f]">{live ? `${pct}%` : ''}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-[#e2e8e3] pt-[13px] text-[11px]">
        <p className="text-[#45514a]">
          Cancellation rate{' '}
          <span className="font-semibold text-[#17211b]">{live ? formatPct(live.cancellation_rate_pct) : '—'}</span>
        </p>
        {canAccessPage(user, 'admin2-errands') ? (
          <button
            type="button"
            onClick={() => navigate(`${getPagePath('admin2-errands')}?tab=live`)}
            className="font-semibold text-[#167d35] hover:underline"
          >
            View errands →
          </button>
        ) : null}
      </div>
    </Card>
  );
}
