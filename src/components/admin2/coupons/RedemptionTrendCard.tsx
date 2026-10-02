import { useState } from 'react';
import type { CouponOverview } from '@/types/api';
import gridLine from '@/assets/admin2/grid-line.png';
import { axisWidthFor, niceCeiling, useElementWidth } from '../chart';
import { formatCount, formatDateRange, formatNaira, parseDate } from '../format';
import { Card, CardTitle, Skeleton } from '../overview/primitives';

const CHART_HEIGHT = 200;
const MIN_AXIS_WIDTH = 40;
const RIGHT_INSET = 6;
const BASELINE_Y = 176;
const PLOT_TOP = 12;
const GRID_STEPS = 4;
const MAX_LABELS = 6;

type Metric = 'redemptions' | 'discount';

const METRICS: Record<Metric, { label: string; color: string; soft: string }> = {
  redemptions: { label: 'Redemptions', color: '#167d35', soft: '#ddefe2' },
  discount: { label: 'Discount', color: '#d9822b', soft: '#f8e4cc' },
};

function axisDay(iso: string): string {
  return parseDate(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function compactNaira(value: number): string {
  if (value >= 1_000_000) return `₦${Number((value / 1_000_000).toFixed(1))}m`;
  if (value >= 1_000) return `₦${Number((value / 1_000).toFixed(1))}k`;
  return formatNaira(value);
}

export function RedemptionTrendCard({ overview }: { overview?: CouponOverview }) {
  const [chartRef, width] = useElementWidth<HTMLDivElement>();
  const [hovered, setHovered] = useState<number | null>(null);
  const [metric, setMetric] = useState<Metric>('redemptions');
  const style = METRICS[metric];

  const series = overview?.series.points ?? [];
  const weekly = overview?.series.bucket === 'week';
  const valueOf = (point: (typeof series)[number]) => point[metric];
  const max = niceCeiling(Math.max(0, ...series.map(valueOf)));
  const axisLabel = metric === 'discount' ? compactNaira : formatCount;
  const axisWidth = axisWidthFor(axisLabel(max), MIN_AXIS_WIDTH);
  const plotWidth = Math.max(0, width - axisWidth - RIGHT_INSET);
  const columnWidth = series.length > 0 ? plotWidth / series.length : 0;
  const barWidth = Math.max(3, Math.min(22, columnWidth * 0.56));
  const plotHeight = BASELINE_Y - PLOT_TOP;
  const xFor = (index: number) => axisWidth + columnWidth * index + columnWidth / 2;
  const heightFor = (value: number) => (value > 0 ? Math.max(3, (value / max) * plotHeight) : 0);

  const lastActive = series.reduce((found, point, index) => (point.redemptions > 0 ? index : found), -1);
  const activeIndex = hovered ?? (lastActive >= 0 ? lastActive : null);
  const active = activeIndex != null ? series[activeIndex] : undefined;
  const labelEvery = Math.max(1, Math.ceil(series.length / MAX_LABELS));
  const kpis = overview?.kpis;

  return (
    <Card className="flex min-w-0 flex-1 flex-col gap-[12px] p-[18px] xl:h-[316px]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <CardTitle
          title="Redemption trend"
          subtitle={
            overview
              ? `${weekly ? 'Weekly' : 'Daily'} coupons redeemed on paid errands · ${formatDateRange(overview.range.start_date, overview.range.end_date)}`
              : 'Coupons redeemed on paid errands'
          }
        />
        <div className="flex flex-shrink-0 items-center gap-[4px] rounded-[8px] bg-[#f8faf8] p-[3px]" role="tablist" aria-label="Chart metric">
          {(Object.keys(METRICS) as Metric[]).map((key) => {
            const selected = key === metric;
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setMetric(key)}
                className={`flex items-center gap-[6px] rounded-[6px] px-[9px] py-[4px] text-[10px] font-semibold transition-colors ${
                  selected ? 'bg-white text-[#17211b] shadow-[0_1px_3px_rgba(16,33,23,0.08)]' : 'text-[#7c857f] hover:text-[#17211b]'
                }`}
              >
                <span className="size-[7px] rounded-full" style={{ backgroundColor: METRICS[key].color }} />
                {METRICS[key].label}
              </button>
            );
          })}
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
                  {axisLabel(Math.round((max * step) / GRID_STEPS))}
                </span>
              ) : null}
            </div>
          );
        })}
        <span className="pointer-events-none absolute right-0 h-px bg-[#d4ddd6]" style={{ top: BASELINE_Y, left: axisWidth }} />

        {overview && width > 0 ? (
          series.map((point, index) => {
            const height = heightFor(valueOf(point));
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
                  className="absolute rounded-t-[4px] transition-colors"
                  style={{
                    left: (columnWidth - barWidth) / 2,
                    width: barWidth,
                    height,
                    top: BASELINE_Y - height,
                    backgroundColor: highlighted ? style.color : style.soft,
                  }}
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

        {overview && lastActive < 0 ? (
          <p className="pointer-events-none absolute inset-x-0 top-[70px] text-center text-[11px] text-[#7c857f]" style={{ paddingLeft: axisWidth }}>
            No coupons were redeemed in this period
          </p>
        ) : null}

        {overview && active && activeIndex != null && width > 0 && lastActive >= 0 ? (
          <div
            className="pointer-events-none absolute flex flex-col gap-[2px] whitespace-nowrap rounded-[6px] bg-[#1e2b23] px-[8px] py-[6px]"
            style={{
              left: Math.min(Math.max(axisWidth, xFor(activeIndex) - 60), Math.max(axisWidth, width - 150)),
              top: Math.max(0, BASELINE_Y - heightFor(valueOf(active)) - 58),
            }}
          >
            <p className="text-[10px] font-bold leading-normal text-white">
              {formatCount(active.redemptions)} <span className="font-normal text-[#c8d3cc]">redemption{active.redemptions === 1 ? '' : 's'}</span>
            </p>
            <p className="text-[9px] leading-normal text-[#f5c992]">{formatNaira(active.discount)} discount funded</p>
            <p className="text-[8px] leading-normal text-[#c8d3cc]">
              {active.start === active.end ? axisDay(active.start) : formatDateRange(active.start, active.end)}
            </p>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-[18px] gap-y-1 text-[11px]">
        {kpis ? (
          <>
            <p className="text-[#45514a]">
              <span className="font-semibold text-[#17211b]">{formatCount(kpis.redemptions.count)}</span> redeemed ·{' '}
              <span className="font-semibold text-[#17211b]">{formatNaira(kpis.discount.amount)}</span> discount funded
            </p>
            <p className="text-[#7c857f]">
              {kpis.redemptions.previous_count > 0
                ? `${formatCount(kpis.redemptions.previous_count)} in the previous period`
                : 'Nothing redeemed in the previous period'}
            </p>
          </>
        ) : (
          <Skeleton className="h-[14px] w-[260px]" />
        )}
      </div>
    </Card>
  );
}
