import { useState } from 'react';
import type { AdminDisputesOverview } from '@/types/api';
import gridLine from '@/assets/admin2/grid-line.png';
import { niceCeiling, useElementWidth } from '../chart';
import { formatCount, formatDateRange, formatPct, formatSignedPct, parseDate } from '../format';
import { Card, CardTitle, Skeleton } from '../overview/primitives';

const CHART_HEIGHT = 214;
const AXIS_WIDTH = 34;
const RIGHT_INSET = 6;
const BASELINE_Y = 190;
const PLOT_TOP = 14;
const GRID_STEPS = 4;
const MAX_LABELS = 8;

function shortDay(iso: string, withMonth: boolean): string {
  const date = parseDate(iso);
  return withMonth ? date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : String(date.getDate());
}

function bucketLabel(point: { start: string; end: string }, weekly: boolean): string {
  if (!weekly || point.start === point.end) {
    return parseDate(point.start).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  }
  return formatDateRange(point.start, point.end);
}

export function DisputeTrendCard({ overview }: { overview?: AdminDisputesOverview }) {
  const [chartRef, width] = useElementWidth<HTMLDivElement>();
  const [hovered, setHovered] = useState<number | null>(null);

  const series = overview?.series.points ?? [];
  const weekly = overview?.series.bucket === 'week';
  const countMax = niceCeiling(Math.max(0, ...series.map((p) => Math.max(p.opened, p.decided))));

  const plotWidth = Math.max(0, width - AXIS_WIDTH - RIGHT_INSET);
  const columnWidth = series.length > 0 ? plotWidth / series.length : 0;
  const barWidth = Math.max(2, Math.min(10, columnWidth * 0.32));
  const plotHeight = BASELINE_Y - PLOT_TOP;
  const xFor = (index: number) => AXIS_WIDTH + columnWidth * index + columnWidth / 2;
  const heightFor = (value: number) => (value > 0 ? Math.max(3, (value / countMax) * plotHeight) : 0);

  const lastActive = series.reduce((found, point, index) => (point.opened > 0 || point.decided > 0 ? index : found), -1);
  const activeIndex = hovered ?? (lastActive >= 0 ? lastActive : null);
  const active = activeIndex != null ? series[activeIndex] : undefined;
  const labelEvery = Math.max(1, Math.ceil(series.length / MAX_LABELS));

  const kpis = overview?.kpis;
  const range = overview?.range;
  const backlogChange = kpis ? kpis.opened.count - kpis.resolved.count : 0;

  return (
    <Card className="flex min-w-0 flex-1 flex-col gap-[14px] p-[18px]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <CardTitle
          title="Disputes over time"
          subtitle={range ? `${weekly ? 'Weekly' : 'Daily'} disputes filed and decided · ${formatDateRange(range.start_date, range.end_date)}` : 'Disputes filed and decided'}
        />
        <div className="flex flex-shrink-0 flex-wrap items-center gap-[8px]">
          <span className="flex items-center gap-[6px] rounded-full bg-[#fdf3f3] px-[9px] py-[4px] text-[10px] font-semibold text-[#b84545]">
            <span className="size-[7px] rounded-full bg-[#e7a3a3]" />
            Filed
          </span>
          <span className="flex items-center gap-[6px] rounded-full bg-[#eaf6ed] px-[9px] py-[4px] text-[10px] font-semibold text-[#0d5e27]">
            <span className="size-[7px] rounded-full bg-[#167d35]" />
            Decided
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
                  {formatCount(Math.round((countMax * step) / GRID_STEPS))}
                </span>
              ) : null}
            </div>
          );
        })}
        <span className="pointer-events-none absolute right-0 h-px bg-[#d4ddd6]" style={{ top: BASELINE_Y, left: AXIS_WIDTH }} />
        {overview ? (
          <span className="pointer-events-none absolute left-0 -translate-y-1/2 text-[9px] text-[#7c857f]" style={{ top: BASELINE_Y }}>
            0
          </span>
        ) : null}

        {overview && width > 0 ? (
          series.map((point, index) => {
            const highlighted = index === activeIndex;
            const x = xFor(index);
            const openedHeight = heightFor(point.opened);
            const decidedHeight = heightFor(point.decided);
            const showLabel =
              index % labelEvery === 0 || (index === series.length - 1 && index % labelEvery >= Math.ceil(labelEvery / 2));
            return (
              <div
                key={point.start}
                className="absolute top-0 cursor-default"
                style={{ left: x - columnWidth / 2, width: columnWidth, height: CHART_HEIGHT }}
                onMouseEnter={() => setHovered(index)}
              >
                <span
                  className={`absolute rounded-t-[3px] transition-colors ${highlighted ? 'bg-[#d77d7d]' : 'bg-[#efc0c0]'}`}
                  style={{ left: columnWidth / 2 - barWidth - 1, width: barWidth, height: openedHeight, top: BASELINE_Y - openedHeight }}
                />
                <span
                  className={`absolute rounded-t-[3px] transition-colors ${highlighted ? 'bg-[#0d5e27]' : 'bg-[#167d35]'}`}
                  style={{ left: columnWidth / 2 + 1, width: barWidth, height: decidedHeight, top: BASELINE_Y - decidedHeight }}
                />
                {showLabel ? (
                  <span
                    className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] text-[#7c857f]"
                    style={{ top: BASELINE_Y + 8 }}
                  >
                    {shortDay(point.start, weekly || index === 0)}
                  </span>
                ) : null}
              </div>
            );
          })
        ) : !overview ? (
          <div className="absolute bottom-[24px] flex items-end justify-between" style={{ left: AXIS_WIDTH, right: RIGHT_INSET }}>
            {[48, 68, 57, 92, 78, 108, 86, 120, 74, 96, 64, 130].map((height, i) => (
              <span key={i} className="block w-[14px] animate-pulse rounded-t-[4px] bg-[#eef1ee]" style={{ height }} />
            ))}
          </div>
        ) : null}

        {overview && lastActive < 0 ? (
          <p className="pointer-events-none absolute inset-x-0 top-[80px] text-center text-[11px] text-[#7c857f]">
            No disputes were filed or decided in this period.
          </p>
        ) : null}

        {overview && active && activeIndex != null && width > 0 && lastActive >= 0 ? (
          <div
            className="pointer-events-none absolute flex flex-col gap-[2px] whitespace-nowrap rounded-[6px] bg-[#1e2b23] px-[8px] py-[6px]"
            style={{
              left: Math.min(Math.max(AXIS_WIDTH, xFor(activeIndex) - 60), Math.max(AXIS_WIDTH, width - 160)),
              top: Math.max(0, BASELINE_Y - heightFor(Math.max(active.opened, active.decided)) - 56),
            }}
          >
            <p className="text-[10px] font-bold leading-normal text-white">
              {formatCount(active.opened)} <span className="font-normal text-[#c8d3cc]">filed</span> · {formatCount(active.decided)}{' '}
              <span className="font-normal text-[#c8d3cc]">decided</span>
            </p>
            <p className="text-[8px] leading-normal text-[#c8d3cc]">{bucketLabel(active, weekly)}</p>
          </div>
        ) : null}
      </div>

      <div className="mt-auto flex flex-wrap items-center gap-x-[18px] gap-y-1 text-[11px]">
        {kpis ? (
          <>
            <p className="text-[#45514a]">
              <span className="font-semibold text-[#17211b]">{formatCount(kpis.opened.count)}</span> filed
              {kpis.opened.rate_pct != null ? <span className="text-[#7c857f]"> ({formatPct(kpis.opened.rate_pct)} of errands)</span> : null}
            </p>
            <span className="h-[12px] w-px bg-[#d4ddd6]" />
            <p className="text-[#45514a]">
              <span className="font-semibold text-[#17211b]">{formatCount(kpis.resolved.count)}</span> decided
            </p>
            <span className="h-[12px] w-px bg-[#d4ddd6]" />
            <p className={backlogChange > 0 ? 'text-[#b84545]' : 'text-[#167d35]'}>
              {backlogChange > 0
                ? `Backlog grew by ${formatCount(backlogChange)}`
                : backlogChange < 0
                  ? `Backlog shrank by ${formatCount(-backlogChange)}`
                  : 'Backlog held steady'}
            </p>
            {kpis.opened.change_pct != null ? (
              <>
                <span className="h-[12px] w-px bg-[#d4ddd6]" />
                <p className={kpis.opened.change_pct > 0 ? 'text-[#b84545]' : 'text-[#167d35]'}>
                  <span className="font-semibold">{formatSignedPct(kpis.opened.change_pct)}</span> filings vs previous period
                </p>
              </>
            ) : null}
          </>
        ) : (
          <Skeleton className="h-[14px] w-[260px]" />
        )}
      </div>
    </Card>
  );
}
