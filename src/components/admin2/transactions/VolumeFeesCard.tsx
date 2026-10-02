import { useState } from 'react';
import type { AdminTransactionsOverview } from '@/types/api';
import gridLine from '@/assets/admin2/grid-line.png';
import { axisWidthFor, niceCeiling, smoothPath, useElementWidth } from '../chart';
import { formatNaira, formatCount, formatDateRange, formatSignedPct, parseDate } from '../format';
import { Card, CardTitle, Skeleton } from '../overview/primitives';

const CHART_HEIGHT = 214;
const MIN_AXIS_WIDTH = 46;
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

export function VolumeFeesCard({ overview }: { overview?: AdminTransactionsOverview }) {
  const [chartRef, width] = useElementWidth<HTMLDivElement>();
  const [hovered, setHovered] = useState<number | null>(null);

  const series = overview?.series.points ?? [];
  const weekly = overview?.series.bucket === 'week';
  const volumeMax = niceCeiling(Math.max(0, ...series.map((p) => p.volume)));
  const feesMax = Math.max(0, ...series.map((p) => p.fees));

  const axisWidth = axisWidthFor(formatNaira(volumeMax), MIN_AXIS_WIDTH);
  const plotWidth = Math.max(0, width - axisWidth - RIGHT_INSET);
  const columnWidth = series.length > 0 ? plotWidth / series.length : 0;
  const barWidth = Math.max(3, Math.min(18, columnWidth * 0.62));
  const plotHeight = BASELINE_Y - PLOT_TOP;
  const xFor = (index: number) => axisWidth + columnWidth * index + columnWidth / 2;

  const feePoints = series.map((point, index) => ({
    x: xFor(index),
    y: feesMax > 0 ? BASELINE_Y - (point.fees / feesMax) * (plotHeight - 12) : BASELINE_Y,
  }));

  const lastActive = series.reduce((found, point, index) => (point.volume > 0 ? index : found), -1);
  const activeIndex = hovered ?? (lastActive >= 0 ? lastActive : null);
  const active = activeIndex != null ? series[activeIndex] : undefined;
  const labelEvery = Math.max(1, Math.ceil(series.length / MAX_LABELS));

  const kpis = overview?.kpis.volume;
  const range = overview?.range;

  return (
    <Card className="flex min-w-0 flex-1 flex-col gap-[14px] p-[18px] xl:h-[328px]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <CardTitle
          title="Transaction volume & platform revenue"
          subtitle={range ? `${weekly ? 'Weekly' : 'Daily'} processed value · ${formatDateRange(range.start_date, range.end_date)}` : 'Processed value'}
        />
        <div className="flex flex-shrink-0 items-center gap-[8px]">
          <span className="flex items-center gap-[6px] rounded-full bg-[#eaf6ed] px-[9px] py-[4px] text-[10px] font-semibold text-[#0d5e27]">
            <span className="size-[7px] rounded-full bg-[#167d35]" />
            Volume
          </span>
          <span className="flex items-center gap-[6px] rounded-full bg-[#eef5fb] px-[9px] py-[4px] text-[10px] font-semibold text-[#2c73b9]">
            <span className="h-[2px] w-[10px] rounded-[2px] bg-[#3478b7]" />
            Fees
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
                style={{ top, left: axisWidth, right: 0, width: `calc(100% - ${axisWidth}px)` }}
              />
              {overview ? (
                <span className="pointer-events-none absolute left-0 -translate-y-1/2 text-[9px] text-[#7c857f]" style={{ top }}>
                  {formatNaira((volumeMax * step) / GRID_STEPS)}
                </span>
              ) : null}
            </div>
          );
        })}
        <span className="pointer-events-none absolute right-0 h-px bg-[#d4ddd6]" style={{ top: BASELINE_Y, left: axisWidth }} />
        {overview ? (
          <span className="pointer-events-none absolute left-0 -translate-y-1/2 text-[9px] text-[#7c857f]" style={{ top: BASELINE_Y }}>
            ₦0
          </span>
        ) : null}

        {overview && width > 0 ? (
          series.map((point, index) => {
            const height = point.volume > 0 ? Math.max(3, (point.volume / volumeMax) * plotHeight) : 0;
            const highlighted = index === activeIndex;
            const x = xFor(index);
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
                  className={`absolute rounded-t-[4px] transition-colors ${highlighted ? 'bg-[#167d35]' : 'bg-[#ddefe2]'}`}
                  style={{ left: (columnWidth - barWidth) / 2, width: barWidth, height, top: BASELINE_Y - height }}
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
          <div className="absolute bottom-[24px] flex items-end justify-between" style={{ left: axisWidth, right: RIGHT_INSET }}>
            {[48, 68, 57, 92, 78, 108, 86, 120, 74, 96, 64, 130].map((height, i) => (
              <span key={i} className="block w-[14px] animate-pulse rounded-t-[4px] bg-[#eef1ee]" style={{ height }} />
            ))}
          </div>
        ) : null}

        {overview && width > 0 && feePoints.length > 1 && feesMax > 0 ? (
          <svg className="pointer-events-none absolute inset-0" width={width} height={CHART_HEIGHT} aria-hidden="true">
            <path d={smoothPath(feePoints)} fill="none" stroke="#3478b7" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            {activeIndex != null && feePoints[activeIndex] ? (
              <circle cx={feePoints[activeIndex].x} cy={feePoints[activeIndex].y} r={3.5} fill="#fff" stroke="#3478b7" strokeWidth={2} />
            ) : null}
          </svg>
        ) : null}

        {overview && active && activeIndex != null && width > 0 ? (
          <div
            className="pointer-events-none absolute flex flex-col gap-[2px] whitespace-nowrap rounded-[6px] bg-[#1e2b23] px-[8px] py-[6px]"
            style={{
              left: Math.min(Math.max(axisWidth, xFor(activeIndex) - 60), Math.max(axisWidth, width - 150)),
              top: Math.max(0, BASELINE_Y - (active.volume / volumeMax) * plotHeight - 58),
            }}
          >
            <p className="text-[10px] font-bold leading-normal text-white">
              {formatNaira(active.volume)} <span className="font-normal text-[#c8d3cc]">processed</span>
            </p>
            <p className="text-[9px] leading-normal text-[#9cc6ea]">{formatNaira(active.fees)} platform fees</p>
            <p className="text-[8px] leading-normal text-[#c8d3cc]">
              {bucketLabel(active, weekly)} · {formatCount(active.count)} entries
            </p>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-x-[18px] gap-y-1 text-[11px]">
        {kpis ? (
          <>
            <p className="text-[#45514a]">
              <span className="font-semibold text-[#17211b]">{formatNaira(kpis.amount)}</span> processed
            </p>
            <span className="h-[12px] w-px bg-[#d4ddd6]" />
            <p className="text-[#45514a]">
              <span className="font-semibold text-[#17211b]">{formatCount(kpis.count)}</span> transactions
            </p>
            <span className="h-[12px] w-px bg-[#d4ddd6]" />
            {kpis.change_pct != null ? (
              <p className={kpis.change_pct < 0 ? 'text-[#b84545]' : 'text-[#167d35]'}>
                <span className="font-semibold">{formatSignedPct(kpis.change_pct)}</span> vs previous period
              </p>
            ) : (
              <p className="text-[#7c857f]">No volume in the previous period</p>
            )}
          </>
        ) : (
          <Skeleton className="h-[14px] w-[260px]" />
        )}
      </div>
    </Card>
  );
}
