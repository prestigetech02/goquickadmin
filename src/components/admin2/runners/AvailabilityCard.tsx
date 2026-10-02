import { useState } from 'react';
import type { AdminRunnerBoardOverview } from '@/types/api';
import gridLine from '@/assets/admin2/grid-line.png';
import { niceCeiling, useElementWidth } from '../chart';
import { formatCount, formatDateRange, formatPct, parseDate } from '../format';
import { Card, CardTitle, Skeleton } from '../overview/primitives';

const CHART_HEIGHT = 214;
const AXIS_WIDTH = 30;
const RIGHT_INSET = 4;
const BASELINE_Y = 190;
const PLOT_TOP = 14;
const GRID_STEPS = 4;
const MAX_LABELS = 6;

function shortDay(iso: string): string {
  return parseDate(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function bucketLabel(point: { start: string; end: string }, weekly: boolean): string {
  if (!weekly || point.start === point.end) {
    return parseDate(point.start).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  }
  return formatDateRange(point.start, point.end);
}

export function AvailabilityCard({ overview }: { overview?: AdminRunnerBoardOverview }) {
  const [chartRef, width] = useElementWidth<HTMLDivElement>();
  const [hovered, setHovered] = useState<number | null>(null);

  const series = overview?.activity.points ?? [];
  const weekly = overview?.activity.bucket === 'week';
  const yMax = niceCeiling(Math.max(0, ...series.map((p) => Math.max(p.active_runners, p.completed))));
  const plotWidth = Math.max(0, width - AXIS_WIDTH - RIGHT_INSET);
  const columnWidth = series.length > 0 ? plotWidth / series.length : 0;
  const barWidth = Math.max(3, Math.min(18, (columnWidth * 0.74) / 2));
  const plotHeight = BASELINE_Y - PLOT_TOP;
  const xFor = (index: number) => AXIS_WIDTH + columnWidth * index + columnWidth / 2;
  const heightFor = (value: number) => (value > 0 && yMax > 0 ? Math.max(3, (value / yMax) * plotHeight) : 0);

  const activeIndex = hovered ?? (series.length ? series.length - 1 : null);
  const active = activeIndex != null ? series[activeIndex] : undefined;
  const labelEvery = Math.max(1, Math.ceil(series.length / MAX_LABELS));
  const k = overview?.kpis;

  return (
    <Card className="flex min-w-0 flex-1 flex-col gap-[14px] p-[18px]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <CardTitle
          title="Availability & performance"
          subtitle={
            overview
              ? `Active runners and completed errands · ${formatDateRange(overview.range.start_date, overview.range.end_date)}`
              : 'Active runners and completed errands'
          }
        />
        <div className="flex flex-shrink-0 items-center gap-[8px]">
          <span className="flex items-center gap-[6px] rounded-full bg-[#eaf6ed] px-[9px] py-[4px] text-[10px] font-semibold text-[#0d5e27]">
            <span className="size-[7px] rounded-full bg-[#167d35]" />
            Active runners
          </span>
          <span className="flex items-center gap-[6px] rounded-full bg-[#eef5fb] px-[9px] py-[4px] text-[10px] font-semibold text-[#2c73b9]">
            <span className="size-[7px] rounded-full bg-[#2c73b9]" />
            Completed
          </span>
        </div>
      </div>

      <div ref={chartRef} className="relative w-full flex-shrink-0" style={{ height: CHART_HEIGHT }} onMouseLeave={() => setHovered(null)}>
        {Array.from({ length: GRID_STEPS }, (_, i) => {
          const step = i + 1;
          const top = BASELINE_Y - (plotHeight * step) / GRID_STEPS;
          return (
            <div key={step}>
              <img
                src={gridLine}
                alt=""
                aria-hidden="true"
                className="pointer-events-none absolute h-px select-none"
                style={{ top, left: AXIS_WIDTH, right: 0, width: `calc(100% - ${AXIS_WIDTH}px)` }}
              />
              {overview ? (
                <span className="pointer-events-none absolute left-0 -translate-y-1/2 text-[9px] text-[#7c857f]" style={{ top }}>
                  {formatCount(Math.round((yMax * step) / GRID_STEPS))}
                </span>
              ) : null}
            </div>
          );
        })}
        <span className="pointer-events-none absolute right-0 h-px bg-[#d4ddd6]" style={{ top: BASELINE_Y, left: AXIS_WIDTH }} />

        {overview && width > 0 ? (
          series.map((point, index) => {
            const runnersHeight = heightFor(point.active_runners);
            const completedHeight = heightFor(point.completed);
            const highlighted = index === activeIndex;
            const showLabel = index % labelEvery === 0 || index === series.length - 1;
            const left = (columnWidth - barWidth * 2 - 3) / 2;
            return (
              <div
                key={point.start}
                className="absolute top-0 cursor-default"
                style={{ left: xFor(index) - columnWidth / 2, width: columnWidth, height: CHART_HEIGHT }}
                onMouseEnter={() => setHovered(index)}
              >
                <span
                  className={`absolute rounded-t-[3px] ${highlighted ? 'bg-[#167d35]' : 'bg-[#cfe8d6]'}`}
                  style={{ left, width: barWidth, height: runnersHeight, top: BASELINE_Y - runnersHeight }}
                />
                <span
                  className={`absolute rounded-t-[3px] ${highlighted ? 'bg-[#2c73b9]' : 'bg-[#d6e5f4]'}`}
                  style={{ left: left + barWidth + 3, width: barWidth, height: completedHeight, top: BASELINE_Y - completedHeight }}
                />
                {showLabel ? (
                  <span className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] text-[#7c857f]" style={{ top: BASELINE_Y + 8 }}>
                    {shortDay(point.start)}
                  </span>
                ) : null}
              </div>
            );
          })
        ) : !overview ? (
          <div className="absolute bottom-[24px] flex items-end justify-between" style={{ left: AXIS_WIDTH, right: RIGHT_INSET }}>
            {[70, 96, 82, 110, 64, 120, 92, 130, 100, 140, 116, 150].map((height, i) => (
              <span key={i} className="block w-[14px] animate-pulse rounded-t-[4px] bg-[#eef1ee]" style={{ height }} />
            ))}
          </div>
        ) : null}

        {overview && active && activeIndex != null && width > 0 && (active.active_runners > 0 || active.completed > 0) ? (
          <div
            className="pointer-events-none absolute flex flex-col gap-[2px] whitespace-nowrap rounded-[6px] bg-[#1e2b23] px-[8px] py-[6px]"
            style={{
              left: Math.min(Math.max(AXIS_WIDTH, xFor(activeIndex) - 70), Math.max(AXIS_WIDTH, width - 170)),
              top: Math.max(0, BASELINE_Y - Math.max(heightFor(active.active_runners), heightFor(active.completed)) - 52),
            }}
          >
            <p className="text-[10px] font-bold leading-normal text-white">
              {formatCount(active.active_runners)} <span className="font-normal text-[#c8d3cc]">active</span> · {formatCount(active.completed)}{' '}
              <span className="font-normal text-[#c8d3cc]">completed</span>
            </p>
            <p className="text-[8px] leading-normal text-[#c8d3cc]">{bucketLabel(active, weekly)}</p>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-[18px] gap-y-1 text-[11px]">
        {k && overview ? (
          <>
            <p className="text-[#45514a]">
              <span className="font-semibold text-[#17211b]">{formatCount(k.online.value)}</span> online ·{' '}
              <span className="font-semibold text-[#17211b]">{formatCount(k.online.available)}</span> available ·{' '}
              <span className="font-semibold text-[#17211b]">{formatCount(k.online.on_errand)}</span> on errand
            </p>
            <p className={overview.activity.on_time_pct == null ? 'text-[#7c857f]' : 'font-semibold text-[#167d35]'}>
              {overview.activity.on_time_pct == null ? 'No timed completions yet' : `${formatPct(overview.activity.on_time_pct)} on-time in this period`}
            </p>
          </>
        ) : (
          <Skeleton className="h-[14px] w-[280px]" />
        )}
      </div>
    </Card>
  );
}
