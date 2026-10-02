import { useState } from 'react';
import type { AdminRevenueOverview } from '@/types/api';
import gridLine from '@/assets/admin2/grid-line.png';
import { axisWidthFor, niceCeiling, smoothPath, useElementWidth } from '../chart';
import { formatNaira, formatCount, formatDateRange, formatSignedPct, parseDate } from '../format';
import { Card, CardTitle, Skeleton } from '../overview/primitives';
import { signedNaira } from './presentation';

const CHART_HEIGHT = 214;
const MIN_AXIS_WIDTH = 46;
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

export function RevenueTrendCard({ overview }: { overview?: AdminRevenueOverview }) {
  const [chartRef, width] = useElementWidth<HTMLDivElement>();
  const [hovered, setHovered] = useState<number | null>(null);

  const series = overview?.series.points ?? [];
  const weekly = overview?.series.bucket === 'week';
  const gtvMax = niceCeiling(Math.max(0, ...series.map((p) => p.gtv)));
  const netMax = Math.max(0, ...series.map((p) => p.net));
  const netMin = Math.min(0, ...series.map((p) => p.net));
  const netSpan = netMax - netMin;

  const axisWidth = axisWidthFor(formatNaira(gtvMax), MIN_AXIS_WIDTH);
  const plotWidth = Math.max(0, width - axisWidth - RIGHT_INSET);
  const columnWidth = series.length > 0 ? plotWidth / series.length : 0;
  const barWidth = Math.max(3, Math.min(22, columnWidth * 0.62));
  const plotHeight = BASELINE_Y - PLOT_TOP;
  const xFor = (index: number) => axisWidth + columnWidth * index + columnWidth / 2;

  const netPoints = series.map((point, index) => ({
    x: xFor(index),
    y: netSpan > 0 ? BASELINE_Y - ((point.net - netMin) / netSpan) * (plotHeight - 12) : BASELINE_Y,
  }));

  const peakIndex = series.reduce((best, point, index) => (best < 0 || point.net > series[best].net ? index : best), -1);
  const peak = peakIndex >= 0 && series[peakIndex].net > 0 ? series[peakIndex] : undefined;
  const activeIndex = hovered ?? (peak ? peakIndex : null);
  const active = activeIndex != null ? series[activeIndex] : undefined;
  const labelEvery = Math.max(1, Math.ceil(series.length / MAX_LABELS));

  const totals = overview?.totals;
  const range = overview?.range;
  const average = series.length > 0 && totals ? totals.net / series.length : null;
  const netChange = overview?.changes.net ?? null;
  const previousLabel = range ? formatDateRange(range.previous_start_date, range.previous_end_date) : '';

  return (
    <Card className="flex min-w-0 flex-1 flex-col gap-[14px] p-[18px]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <CardTitle
          title="Revenue trend"
          subtitle={`Gross transaction value and net company revenue · ${weekly ? 'weekly' : 'daily'}`}
        />
        <div className="flex flex-shrink-0 flex-wrap items-center gap-[8px]">
          <span className="flex items-center gap-[6px] rounded-full bg-[#eef5fb] px-[9px] py-[4px] text-[10px] font-semibold text-[#2c73b9]">
            <span className="size-[7px] rounded-full bg-[#9cc9a8]" />
            GTV {totals ? formatNaira(totals.gtv) : ''}
          </span>
          <span className="flex items-center gap-[6px] rounded-full bg-[#eaf6ed] px-[9px] py-[4px] text-[10px] font-semibold text-[#0d5e27]">
            <span className="h-[2px] w-[10px] rounded-[2px] bg-[#3478b7]" />
            Net revenue {totals ? signedNaira(totals.net) : ''}
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
                  {formatNaira((gtvMax * step) / GRID_STEPS)}
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
            const height = point.gtv > 0 ? Math.max(3, (point.gtv / gtvMax) * plotHeight) : 0;
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
                  className={`absolute rounded-t-[4px] transition-colors ${highlighted ? 'bg-[#167d35]' : 'bg-[#cfe8d6]'}`}
                  style={{ left: (columnWidth - barWidth) / 2, width: barWidth, height, top: BASELINE_Y - height }}
                />
                {showLabel ? (
                  <span
                    className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] text-[#7c857f]"
                    style={{ top: BASELINE_Y + 8 }}
                  >
                    {shortDay(point.start)}
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

        {overview && width > 0 && netPoints.length > 1 && netSpan > 0 ? (
          <svg className="pointer-events-none absolute inset-0" width={width} height={CHART_HEIGHT} aria-hidden="true">
            <path d={smoothPath(netPoints)} fill="none" stroke="#3478b7" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            {activeIndex != null && netPoints[activeIndex] ? (
              <circle cx={netPoints[activeIndex].x} cy={netPoints[activeIndex].y} r={3.5} fill="#fff" stroke="#3478b7" strokeWidth={2} />
            ) : null}
          </svg>
        ) : null}

        {overview && active && activeIndex != null && width > 0 ? (
          <div
            className="pointer-events-none absolute flex flex-col gap-[2px] whitespace-nowrap rounded-[6px] bg-[#1e2b23] px-[8px] py-[6px]"
            style={{
              left: Math.min(Math.max(axisWidth, xFor(activeIndex) - 60), Math.max(axisWidth, width - 150)),
              top: Math.max(0, BASELINE_Y - (active.gtv / gtvMax) * plotHeight - 58),
            }}
          >
            <p className="text-[10px] font-bold leading-normal text-white">
              {formatNaira(active.gtv)} <span className="font-normal text-[#c8d3cc]">GTV</span>
            </p>
            <p className="text-[9px] leading-normal text-[#9cc6ea]">{signedNaira(active.net)} net revenue</p>
            <p className="text-[8px] leading-normal text-[#c8d3cc]">
              {bucketLabel(active, weekly)} · {formatCount(active.count)} transactions
            </p>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-[18px] gap-y-1 text-[11px]">
        {overview ? (
          <>
            <p className="text-[#45514a]">
              Average {weekly ? 'weekly' : 'daily'} net revenue{' '}
              <span className="font-semibold text-[#17211b]">{average != null ? signedNaira(average) : '—'}</span>
            </p>
            <p className="text-[#45514a]">
              {peak ? (
                <>
                  Peak {weekly ? 'week' : 'day'}: {bucketLabel(peak, weekly)} ·{' '}
                  <span className="font-semibold text-[#17211b]">{formatNaira(peak.net)}</span>
                </>
              ) : (
                'No revenue recognised yet'
              )}
            </p>
            {netChange != null ? (
              <p className={netChange < 0 ? 'text-[#b84545]' : 'text-[#167d35]'} title={`Previous period ${previousLabel}`}>
                <span className="font-semibold">{formatSignedPct(netChange)}</span> vs previous period
              </p>
            ) : (
              <p className="text-[#7c857f]">No net revenue in the previous period</p>
            )}
          </>
        ) : (
          <Skeleton className="h-[14px] w-[320px]" />
        )}
      </div>
    </Card>
  );
}
