import { useState } from 'react';
import type { AdminAnalyticsOverview } from '@/types/api';
import gridLine from '@/assets/admin2/grid-line.png';
import { niceCeiling, smoothPath, useElementWidth } from '../chart';
import { formatCount, formatDateRange, formatPct, formatSignedPct, parseDate } from '../format';
import { Card, CardTitle, Skeleton } from '../overview/primitives';

const CHART_HEIGHT = 214;
const AXIS_WIDTH = 34;
const RIGHT_INSET = 6;
const BASELINE_Y = 190;
const PLOT_TOP = 14;
const GRID_STEPS = 4;
const MAX_LABELS = 8;

function shortDay(iso: string): string {
  return parseDate(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function bucketLabel(point: { start: string; end: string }, weekly: boolean): string {
  if (!weekly || point.start === point.end) {
    return parseDate(point.start).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  }
  return formatDateRange(point.start, point.end);
}

export function MarketplaceActivityCard({ overview, compare }: { overview?: AdminAnalyticsOverview; compare: boolean }) {
  const [chartRef, width] = useElementWidth<HTMLDivElement>();
  const [hovered, setHovered] = useState<number | null>(null);

  const series = overview?.activity.points ?? [];
  const weekly = overview?.activity.bucket === 'week';
  const yMax = niceCeiling(Math.max(0, ...series.map((p) => Math.max(p.requested, compare ? p.previous_requested : 0))));

  const plotWidth = Math.max(0, width - AXIS_WIDTH - RIGHT_INSET);
  const columnWidth = series.length > 0 ? plotWidth / series.length : 0;
  const barWidth = Math.max(2, Math.min(10, (columnWidth * 0.7) / 2));
  const plotHeight = BASELINE_Y - PLOT_TOP;
  const xFor = (index: number) => AXIS_WIDTH + columnWidth * index + columnWidth / 2;
  const yFor = (value: number) => BASELINE_Y - (yMax > 0 ? (value / yMax) * plotHeight : 0);

  // Running completion rate across the period, drawn on its own 0–100% scale.
  let runningRequested = 0;
  let runningCompleted = 0;
  const ratePoints = series.map((point, index) => {
    runningRequested += point.requested;
    runningCompleted += point.completed;
    const rate = runningRequested > 0 ? runningCompleted / runningRequested : 0;
    return { x: xFor(index), y: BASELINE_Y - rate * (plotHeight - 8) };
  });
  const previousPoints = series.map((point, index) => ({ x: xFor(index), y: yFor(point.previous_requested) }));

  const peakIndex = series.reduce((best, point, index) => (best < 0 || point.requested > series[best].requested ? index : best), -1);
  const peak = peakIndex >= 0 && series[peakIndex].requested > 0 ? series[peakIndex] : undefined;
  const activeIndex = hovered ?? (peak ? peakIndex : null);
  const active = activeIndex != null ? series[activeIndex] : undefined;
  const labelEvery = Math.max(1, Math.ceil(series.length / MAX_LABELS));

  const kpis = overview?.kpis;

  return (
    <Card className="flex min-w-0 flex-1 flex-col gap-[14px] p-[18px]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <CardTitle title="Marketplace activity" subtitle={`Requested and completed errands · ${weekly ? 'weekly' : 'daily'}`} />
        <div className="flex flex-shrink-0 flex-wrap items-center gap-[8px]">
          <span className="flex items-center gap-[6px] rounded-full bg-[#eef5fb] px-[9px] py-[4px] text-[10px] font-semibold text-[#2c73b9]">
            <span className="size-[7px] rounded-full bg-[#cfe8d6]" />
            Requested {kpis ? formatCount(kpis.requested.value) : ''}
          </span>
          <span className="flex items-center gap-[6px] rounded-full bg-[#eaf6ed] px-[9px] py-[4px] text-[10px] font-semibold text-[#0d5e27]">
            <span className="size-[7px] rounded-full bg-[#167d35]" />
            Completed {kpis ? formatCount(kpis.completed.value) : ''}
          </span>
          {compare ? (
            <span className="flex items-center gap-[6px] rounded-full bg-[#f1f4f2] px-[9px] py-[4px] text-[10px] font-semibold text-[#45514a]">
              <span className="h-0 w-[10px] border-t-2 border-dashed border-[#7c857f]" />
              Previous period
            </span>
          ) : null}
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
            const requestedHeight = point.requested > 0 ? Math.max(3, BASELINE_Y - yFor(point.requested)) : 0;
            const completedHeight = point.completed > 0 ? Math.max(3, BASELINE_Y - yFor(point.completed)) : 0;
            const highlighted = index === activeIndex;
            const x = xFor(index);
            const showLabel =
              index % labelEvery === 0 || (index === series.length - 1 && index % labelEvery >= Math.ceil(labelEvery / 2));
            const left = (columnWidth - barWidth * 2 - 2) / 2;
            return (
              <div
                key={point.start}
                className="absolute top-0 cursor-default"
                style={{ left: x - columnWidth / 2, width: columnWidth, height: CHART_HEIGHT }}
                onMouseEnter={() => setHovered(index)}
              >
                <span
                  className={`absolute rounded-t-[3px] ${highlighted ? 'bg-[#9cc9a8]' : 'bg-[#cfe8d6]'}`}
                  style={{ left, width: barWidth, height: requestedHeight, top: BASELINE_Y - requestedHeight }}
                />
                <span
                  className={`absolute rounded-t-[3px] ${highlighted ? 'bg-[#0d5e27]' : 'bg-[#4f9d63]'}`}
                  style={{ left: left + barWidth + 2, width: barWidth, height: completedHeight, top: BASELINE_Y - completedHeight }}
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
            {[48, 68, 57, 92, 78, 108, 86, 120, 74, 96, 64, 130].map((height, i) => (
              <span key={i} className="block w-[14px] animate-pulse rounded-t-[4px] bg-[#eef1ee]" style={{ height }} />
            ))}
          </div>
        ) : null}

        {overview && width > 0 && series.length > 1 ? (
          <svg className="pointer-events-none absolute inset-0" width={width} height={CHART_HEIGHT} aria-hidden="true">
            {compare ? (
              <path d={smoothPath(previousPoints)} fill="none" stroke="#7c857f" strokeWidth={1.5} strokeDasharray="4 4" strokeLinecap="round" />
            ) : null}
            <path d={smoothPath(ratePoints)} fill="none" stroke="#3478b7" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : null}

        {overview && active && activeIndex != null && width > 0 ? (
          <div
            className="pointer-events-none absolute flex flex-col gap-[2px] whitespace-nowrap rounded-[6px] bg-[#1e2b23] px-[8px] py-[6px]"
            style={{
              left: Math.min(Math.max(AXIS_WIDTH, xFor(activeIndex) - 60), Math.max(AXIS_WIDTH, width - 160)),
              top: Math.max(0, yFor(active.requested) - 64),
            }}
          >
            <p className="text-[10px] font-bold leading-normal text-white">
              {formatCount(active.requested)} <span className="font-normal text-[#c8d3cc]">requested</span> · {formatCount(active.completed)}{' '}
              <span className="font-normal text-[#c8d3cc]">completed</span>
            </p>
            {compare ? <p className="text-[9px] leading-normal text-[#c8d3cc]">{formatCount(active.previous_requested)} requested previous period</p> : null}
            <p className="text-[8px] leading-normal text-[#c8d3cc]">{bucketLabel(active, weekly)}</p>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-[18px] gap-y-1 text-[11px]">
        {kpis ? (
          <>
            {kpis.requested.change_pct != null ? (
              <p className={kpis.requested.change_pct < 0 ? 'text-[#b84545]' : 'text-[#167d35]'}>
                <span className="font-semibold">{formatSignedPct(kpis.requested.change_pct)}</span> errands vs previous period
              </p>
            ) : (
              <p className="text-[#7c857f]">No errands in the previous period</p>
            )}
            <p className="text-[#45514a]">
              {peak ? (
                <>
                  Peak {weekly ? 'week' : 'day'}: {bucketLabel(peak, weekly)} · <span className="font-semibold text-[#17211b]">{formatCount(peak.requested)}</span>
                </>
              ) : (
                'No errands requested yet'
              )}
            </p>
            <p className="flex items-center gap-[6px] text-[#45514a]">
              <span className="h-[2px] w-[10px] rounded-[2px] bg-[#3478b7]" />
              <span className="font-semibold text-[#17211b]">{formatPct(kpis.completed.completion_rate_pct)}</span> completion
            </p>
          </>
        ) : (
          <Skeleton className="h-[14px] w-[320px]" />
        )}
      </div>
    </Card>
  );
}
