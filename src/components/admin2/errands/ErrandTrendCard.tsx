import { useState } from 'react';
import type { AdminErrandsOverview } from '@/types/api';
import gridLine from '@/assets/admin2/grid-line.png';
import { niceCeiling, smoothPath, useElementWidth } from '../chart';
import { formatNaira, formatCount, formatDateRange, formatSignedPct, parseDate } from '../format';
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

export function ErrandTrendCard({ overview }: { overview?: AdminErrandsOverview }) {
  const [chartRef, width] = useElementWidth<HTMLDivElement>();
  const [hovered, setHovered] = useState<number | null>(null);

  const series = overview?.series.points ?? [];
  const weekly = overview?.series.bucket === 'week';
  const countMax = niceCeiling(Math.max(0, ...series.map((p) => Math.max(p.created, p.completed))));
  const gmvMax = Math.max(0, ...series.map((p) => p.gmv));

  const plotWidth = Math.max(0, width - AXIS_WIDTH - RIGHT_INSET);
  const columnWidth = series.length > 0 ? plotWidth / series.length : 0;
  const barWidth = Math.max(2, Math.min(10, columnWidth * 0.32));
  const plotHeight = BASELINE_Y - PLOT_TOP;
  const xFor = (index: number) => AXIS_WIDTH + columnWidth * index + columnWidth / 2;
  const heightFor = (value: number) => (value > 0 ? Math.max(3, (value / countMax) * plotHeight) : 0);

  const gmvPoints = series.map((point, index) => ({
    x: xFor(index),
    y: gmvMax > 0 ? BASELINE_Y - (point.gmv / gmvMax) * (plotHeight - 12) : BASELINE_Y,
  }));

  const lastActive = series.reduce((found, point, index) => (point.created > 0 || point.completed > 0 ? index : found), -1);
  const activeIndex = hovered ?? (lastActive >= 0 ? lastActive : null);
  const active = activeIndex != null ? series[activeIndex] : undefined;
  const labelEvery = Math.max(1, Math.ceil(series.length / MAX_LABELS));

  const kpis = overview?.kpis;
  const range = overview?.range;

  return (
    <Card className="flex min-w-0 flex-1 flex-col gap-[14px] p-[18px] xl:h-[328px]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <CardTitle
          title="Errand volume"
          subtitle={range ? `${weekly ? 'Weekly' : 'Daily'} requests, completions and value · ${formatDateRange(range.start_date, range.end_date)}` : 'Requests and completions'}
        />
        <div className="flex flex-shrink-0 flex-wrap items-center gap-[8px]">
          <span className="flex items-center gap-[6px] rounded-full bg-[#f3faf5] px-[9px] py-[4px] text-[10px] font-semibold text-[#45514a]">
            <span className="size-[7px] rounded-full bg-[#b9dfc3]" />
            Created
          </span>
          <span className="flex items-center gap-[6px] rounded-full bg-[#eaf6ed] px-[9px] py-[4px] text-[10px] font-semibold text-[#0d5e27]">
            <span className="size-[7px] rounded-full bg-[#167d35]" />
            Completed
          </span>
          <span className="flex items-center gap-[6px] rounded-full bg-[#eef5fb] px-[9px] py-[4px] text-[10px] font-semibold text-[#2c73b9]">
            <span className="h-[2px] w-[10px] rounded-[2px] bg-[#3478b7]" />
            Value
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
            const createdHeight = heightFor(point.created);
            const completedHeight = heightFor(point.completed);
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
                  className={`absolute rounded-t-[3px] transition-colors ${highlighted ? 'bg-[#8fcc9f]' : 'bg-[#cfe9d5]'}`}
                  style={{ left: columnWidth / 2 - barWidth - 1, width: barWidth, height: createdHeight, top: BASELINE_Y - createdHeight }}
                />
                <span
                  className={`absolute rounded-t-[3px] transition-colors ${highlighted ? 'bg-[#0d5e27]' : 'bg-[#167d35]'}`}
                  style={{ left: columnWidth / 2 + 1, width: barWidth, height: completedHeight, top: BASELINE_Y - completedHeight }}
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

        {overview && width > 0 && gmvPoints.length > 1 && gmvMax > 0 ? (
          <svg className="pointer-events-none absolute inset-0" width={width} height={CHART_HEIGHT} aria-hidden="true">
            <path d={smoothPath(gmvPoints)} fill="none" stroke="#3478b7" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            {activeIndex != null && gmvPoints[activeIndex] ? (
              <circle cx={gmvPoints[activeIndex].x} cy={gmvPoints[activeIndex].y} r={3.5} fill="#fff" stroke="#3478b7" strokeWidth={2} />
            ) : null}
          </svg>
        ) : null}

        {overview && active && activeIndex != null && width > 0 ? (
          <div
            className="pointer-events-none absolute flex flex-col gap-[2px] whitespace-nowrap rounded-[6px] bg-[#1e2b23] px-[8px] py-[6px]"
            style={{
              left: Math.min(Math.max(AXIS_WIDTH, xFor(activeIndex) - 60), Math.max(AXIS_WIDTH, width - 160)),
              top: Math.max(0, BASELINE_Y - heightFor(Math.max(active.created, active.completed)) - 70),
            }}
          >
            <p className="text-[10px] font-bold leading-normal text-white">
              {formatCount(active.created)} <span className="font-normal text-[#c8d3cc]">created</span> · {formatCount(active.completed)}{' '}
              <span className="font-normal text-[#c8d3cc]">completed</span>
            </p>
            <p className="text-[9px] leading-normal text-[#9cc6ea]">{formatNaira(active.gmv)} secured in escrow</p>
            <p className="text-[8px] leading-normal text-[#c8d3cc]">
              {bucketLabel(active, weekly)}
              {active.cancelled > 0 ? ` · ${formatCount(active.cancelled)} cancelled` : ''}
            </p>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-x-[18px] gap-y-1 text-[11px]">
        {kpis ? (
          <>
            <p className="text-[#45514a]">
              <span className="font-semibold text-[#17211b]">{formatCount(kpis.created.count)}</span> created
            </p>
            <span className="h-[12px] w-px bg-[#d4ddd6]" />
            <p className="text-[#45514a]">
              <span className="font-semibold text-[#17211b]">{formatNaira(kpis.value.gmv)}</span> secured
            </p>
            <span className="h-[12px] w-px bg-[#d4ddd6]" />
            {kpis.created.change_pct != null ? (
              <p className={kpis.created.change_pct < 0 ? 'text-[#b84545]' : 'text-[#167d35]'}>
                <span className="font-semibold">{formatSignedPct(kpis.created.change_pct)}</span> requests vs previous period
              </p>
            ) : (
              <p className="text-[#7c857f]">No errands in the previous period</p>
            )}
          </>
        ) : (
          <Skeleton className="h-[14px] w-[260px]" />
        )}
      </div>
    </Card>
  );
}
