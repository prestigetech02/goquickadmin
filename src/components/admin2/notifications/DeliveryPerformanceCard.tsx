import { useState } from 'react';
import type { AdminNotificationsOverview } from '@/types/api';
import gridLine from '@/assets/admin2/grid-line.png';
import { axisWidthFor, niceCeiling, smoothPath, useElementWidth } from '../chart';
import { formatCount, formatDateRange, formatMinutes, formatPct, parseDate } from '../format';
import { Card, CardTitle, Skeleton } from '../overview/primitives';

const CHART_HEIGHT = 200;
const MIN_AXIS_WIDTH = 40;
const RIGHT_INSET = 6;
const BASELINE_Y = 176;
const PLOT_TOP = 12;
const GRID_STEPS = 4;
const MAX_LABELS = 6;

function axisDay(iso: string): string {
  return parseDate(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function DeliveryPerformanceCard({ overview }: { overview?: AdminNotificationsOverview }) {
  const [chartRef, width] = useElementWidth<HTMLDivElement>();
  const [hovered, setHovered] = useState<number | null>(null);

  const series = overview?.series.points ?? [];
  const weekly = overview?.series.bucket === 'week';
  const max = niceCeiling(Math.max(0, ...series.map((p) => p.delivered)));
  const axisWidth = axisWidthFor(formatCount(max), MIN_AXIS_WIDTH);
  const plotWidth = Math.max(0, width - axisWidth - RIGHT_INSET);
  const columnWidth = series.length > 0 ? plotWidth / series.length : 0;
  const barWidth = Math.max(3, Math.min(22, columnWidth * 0.6));
  const plotHeight = BASELINE_Y - PLOT_TOP;
  const xFor = (index: number) => axisWidth + columnWidth * index + columnWidth / 2;
  const yFor = (value: number) => BASELINE_Y - (value / max) * plotHeight;
  const readPoints = series.map((point, index) => ({ x: xFor(index), y: yFor(point.read) }));

  const lastActive = series.reduce((found, point, index) => (point.sent > 0 ? index : found), -1);
  const activeIndex = hovered ?? (lastActive >= 0 ? lastActive : null);
  const active = activeIndex != null ? series[activeIndex] : undefined;
  const labelEvery = Math.max(1, Math.ceil(series.length / MAX_LABELS));
  const kpis = overview?.kpis;
  const performance = overview?.performance;

  return (
    <Card className="flex min-w-0 flex-1 flex-col gap-[12px] p-[18px] xl:h-[316px]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <CardTitle
          title="Delivery performance"
          subtitle={
            overview
              ? `${weekly ? 'Weekly' : 'Daily'} delivered and read · ${formatDateRange(overview.range.start_date, overview.range.end_date)}`
              : 'Delivered and read'
          }
        />
        <div className="flex flex-shrink-0 items-center gap-[8px]">
          <span className="flex items-center gap-[6px] rounded-full bg-[#eaf6ed] px-[9px] py-[4px] text-[10px] font-semibold text-[#0d5e27]">
            <span className="size-[7px] rounded-full bg-[#167d35]" />
            Delivered {kpis ? formatPct(kpis.delivered.rate) : ''}
          </span>
          <span className="flex items-center gap-[6px] rounded-full bg-[#eef5fb] px-[9px] py-[4px] text-[10px] font-semibold text-[#2c73b9]">
            <span className="h-[2px] w-[10px] rounded-[2px] bg-[#3478b7]" />
            Read {kpis ? formatPct(kpis.read.rate) : ''}
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
                  {formatCount(Math.round((max * step) / GRID_STEPS))}
                </span>
              ) : null}
            </div>
          );
        })}
        <span className="pointer-events-none absolute right-0 h-px bg-[#d4ddd6]" style={{ top: BASELINE_Y, left: axisWidth }} />

        {overview && width > 0 ? (
          series.map((point, index) => {
            const height = point.delivered > 0 ? Math.max(3, (point.delivered / max) * plotHeight) : 0;
            const highlighted = index === activeIndex;
            const showLabel = index % labelEvery === 0 || index === series.length - 1;
            return (
              <div
                key={point.start}
                className="absolute top-0 cursor-default"
                style={{ left: xFor(index) - columnWidth / 2, width: columnWidth, height: CHART_HEIGHT }}
                onMouseEnter={() => setHovered(index)}
              >
                <span
                  className={`absolute rounded-t-[4px] transition-colors ${highlighted ? 'bg-[#167d35]' : 'bg-[#ddefe2]'}`}
                  style={{ left: (columnWidth - barWidth) / 2, width: barWidth, height, top: BASELINE_Y - height }}
                />
                {showLabel ? (
                  <span className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] text-[#7c857f]" style={{ top: BASELINE_Y + 8 }}>
                    {axisDay(point.start)}
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

        {overview && width > 0 && readPoints.length > 1 ? (
          <svg className="pointer-events-none absolute inset-0" width={width} height={CHART_HEIGHT} aria-hidden="true">
            <path d={smoothPath(readPoints)} fill="none" stroke="#3478b7" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            {activeIndex != null && readPoints[activeIndex] ? (
              <circle cx={readPoints[activeIndex].x} cy={readPoints[activeIndex].y} r={3.5} fill="#fff" stroke="#3478b7" strokeWidth={2} />
            ) : null}
          </svg>
        ) : null}

        {overview && active && activeIndex != null && width > 0 ? (
          <div
            className="pointer-events-none absolute flex flex-col gap-[2px] whitespace-nowrap rounded-[6px] bg-[#1e2b23] px-[8px] py-[6px]"
            style={{
              left: Math.min(Math.max(axisWidth, xFor(activeIndex) - 60), Math.max(axisWidth, width - 150)),
              top: Math.max(0, yFor(active.delivered) - 58),
            }}
          >
            <p className="text-[10px] font-bold leading-normal text-white">
              {formatCount(active.delivered)} <span className="font-normal text-[#c8d3cc]">delivered of {formatCount(active.sent)}</span>
            </p>
            <p className="text-[9px] leading-normal text-[#9cc6ea]">{formatCount(active.read)} read</p>
            <p className="text-[8px] leading-normal text-[#c8d3cc]">
              {active.start === active.end ? axisDay(active.start) : formatDateRange(active.start, active.end)}
            </p>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-[18px] gap-y-1 text-[11px]">
        {kpis && performance ? (
          <>
            <p className="text-[#45514a]">
              <span className="font-semibold text-[#17211b]">{formatCount(kpis.delivered.count)}</span> deliveries
            </p>
            <p className="text-[#45514a]">
              Median time to read <span className="font-semibold text-[#17211b]">{formatMinutes(performance.median_read_minutes)}</span>
            </p>
            {performance.delivery_rate_change_pts != null ? (
              <p className={performance.delivery_rate_change_pts < 0 ? 'text-[#b84545]' : 'text-[#167d35]'}>
                <span className="font-semibold">
                  {performance.delivery_rate_change_pts > 0 ? '+' : ''}
                  {Number(performance.delivery_rate_change_pts.toFixed(1))} pts
                </span>{' '}
                delivery rate
              </p>
            ) : (
              <p className="text-[#7c857f]">No previous period to compare</p>
            )}
          </>
        ) : (
          <Skeleton className="h-[14px] w-[260px]" />
        )}
      </div>
    </Card>
  );
}
