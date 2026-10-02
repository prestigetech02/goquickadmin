import { useState } from 'react';
import type { AdminAnalyticsOverview } from '@/types/api';
import gridLine from '@/assets/admin2/grid-line.png';
import { smoothPath, useElementWidth } from '../chart';
import { formatCount, formatSignedPct } from '../format';
import { Card, CardTitle, Skeleton } from '../overview/primitives';
import { monthLabel } from './presentation';

const CHART_HEIGHT = 190;
const AXIS_WIDTH = 34;
const RIGHT_INSET = 14;
const BASELINE_Y = 166;
const PLOT_TOP = 12;
const GRID_STEPS = 4;

const REQUESTER_COLOR = '#167d35';
const RUNNER_COLOR = '#3478b7';

export function GrowthCard({ overview }: { overview?: AdminAnalyticsOverview }) {
  const [chartRef, width] = useElementWidth<HTMLDivElement>();
  const [hovered, setHovered] = useState<number | null>(null);

  const growth = overview?.growth;
  const months = growth?.months ?? [];
  const indexed = months.filter((m) => m.requester_index != null && m.runner_index != null);
  const values = indexed.flatMap((m) => [m.requester_index ?? 0, m.runner_index ?? 0]);
  const yMin = values.length > 0 ? Math.max(0, Math.floor((Math.min(...values) - 10) / 20) * 20) : 0;
  const yMax = values.length > 0 ? Math.ceil((Math.max(...values) + 10) / 20) * 20 : 100;
  const span = Math.max(1, yMax - yMin);

  const plotWidth = Math.max(0, width - AXIS_WIDTH - RIGHT_INSET);
  const step = months.length > 1 ? plotWidth / (months.length - 1) : 0;
  const plotHeight = BASELINE_Y - PLOT_TOP;
  const xFor = (index: number) => AXIS_WIDTH + step * index;
  const yFor = (value: number) => BASELINE_Y - ((value - yMin) / span) * plotHeight;

  const line = (key: 'requester_index' | 'runner_index') =>
    months.flatMap((m, index) => (m[key] != null ? [{ x: xFor(index), y: yFor(m[key] as number) }] : []));
  const requesterPoints = line('requester_index');
  const runnerPoints = line('runner_index');
  const active = hovered != null ? months[hovered] : undefined;
  const gap = growth?.supply_gap_pts;

  return (
    <Card className="flex min-w-0 flex-1 flex-col gap-[14px] p-[18px]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <CardTitle
          title="Requester vs runner growth"
          subtitle={growth?.base_month ? `Monthly active profiles · indexed to ${monthLabel(growth.base_month)} = 100` : 'Monthly active profiles'}
        />
        {gap != null ? (
          <span
            className={`flex-shrink-0 rounded-full px-[9px] py-[4px] text-[10px] font-semibold ${
              gap > 10 ? 'bg-[#fff5e5] text-[#b06d12]' : 'bg-[#eaf6ed] text-[#0d5e27]'
            }`}
            title="Requester index minus runner index for the latest month"
          >
            Supply gap {gap > 0 ? '+' : ''}
            {Number(gap.toFixed(1))} pts
          </span>
        ) : null}
      </div>

      <div ref={chartRef} className="relative w-full flex-shrink-0" style={{ height: CHART_HEIGHT }} onMouseLeave={() => setHovered(null)}>
        {Array.from({ length: GRID_STEPS + 1 }, (_, i) => {
          const value = yMin + (span * i) / GRID_STEPS;
          const top = yFor(value);
          return (
            <div key={i}>
              <img
                src={gridLine}
                alt=""
                aria-hidden="true"
                className="pointer-events-none absolute h-px select-none"
                style={{ top, left: AXIS_WIDTH, right: 0, width: `calc(100% - ${AXIS_WIDTH}px)` }}
              />
              {overview && indexed.length > 0 ? (
                <span className="pointer-events-none absolute left-0 -translate-y-1/2 text-[9px] text-[#7c857f]" style={{ top }}>
                  {Math.round(value)}
                </span>
              ) : null}
            </div>
          );
        })}

        {!overview ? <Skeleton className="absolute inset-x-[34px] top-[40px] h-[100px]" /> : null}
        {overview && indexed.length === 0 ? (
          <p className="absolute inset-0 flex items-center justify-center text-[11px] text-[#7c857f]">Not enough activity to index growth yet.</p>
        ) : null}

        {overview && width > 0 && indexed.length > 0 ? (
          <>
            <svg className="pointer-events-none absolute inset-0" width={width} height={CHART_HEIGHT} aria-hidden="true">
              {requesterPoints.length > 1 ? (
                <path d={smoothPath(requesterPoints)} fill="none" stroke={REQUESTER_COLOR} strokeWidth={2} strokeLinecap="round" />
              ) : null}
              {runnerPoints.length > 1 ? (
                <path d={smoothPath(runnerPoints)} fill="none" stroke={RUNNER_COLOR} strokeWidth={2} strokeLinecap="round" />
              ) : null}
              {hovered != null && active?.requester_index != null && active.runner_index != null ? (
                <>
                  <line x1={xFor(hovered)} x2={xFor(hovered)} y1={PLOT_TOP} y2={BASELINE_Y} stroke="#d4ddd6" strokeDasharray="3 3" />
                  <circle cx={xFor(hovered)} cy={yFor(active.requester_index)} r={3.5} fill="#fff" stroke={REQUESTER_COLOR} strokeWidth={2} />
                  <circle cx={xFor(hovered)} cy={yFor(active.runner_index)} r={3.5} fill="#fff" stroke={RUNNER_COLOR} strokeWidth={2} />
                </>
              ) : null}
            </svg>
            {months.map((m, index) => (
              <div
                key={m.month}
                className="absolute top-0"
                style={{ left: xFor(index) - step / 2, width: Math.max(step, 24), height: CHART_HEIGHT }}
                onMouseEnter={() => setHovered(index)}
              >
                <span className="absolute left-1/2 -translate-x-1/2 text-[9px] text-[#7c857f]" style={{ top: BASELINE_Y + 8 }}>
                  {monthLabel(m.month)}
                </span>
              </div>
            ))}
            {active && hovered != null ? (
              <div
                className="pointer-events-none absolute flex flex-col gap-[2px] whitespace-nowrap rounded-[6px] bg-[#1e2b23] px-[8px] py-[6px]"
                style={{ left: Math.min(Math.max(AXIS_WIDTH, xFor(hovered) - 60), Math.max(AXIS_WIDTH, width - 150)), top: 0 }}
              >
                <p className="text-[10px] font-bold text-white">{monthLabel(active.month)}</p>
                <p className="text-[9px] text-[#a6dcb3]">{formatCount(active.requesters)} active requesters</p>
                <p className="text-[9px] text-[#9cc6ea]">{formatCount(active.runners)} active runners</p>
              </div>
            ) : null}
          </>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-[14px] gap-y-1 text-[11px]">
        {growth ? (
          <>
            <div className="flex flex-wrap items-center gap-[8px]">
              <span className="flex items-center gap-[6px] rounded-full bg-[#eaf6ed] px-[9px] py-[4px] text-[10px] font-semibold text-[#0d5e27]">
                <span className="size-[7px] rounded-full" style={{ backgroundColor: REQUESTER_COLOR }} />
                Requesters {growth.requester_growth_pct != null ? formatSignedPct(growth.requester_growth_pct) : ''}
              </span>
              <span className="flex items-center gap-[6px] rounded-full bg-[#eef5fb] px-[9px] py-[4px] text-[10px] font-semibold text-[#2c73b9]">
                <span className="size-[7px] rounded-full" style={{ backgroundColor: RUNNER_COLOR }} />
                Runners {growth.runner_growth_pct != null ? formatSignedPct(growth.runner_growth_pct) : ''}
              </span>
            </div>
            <p className="text-[#45514a]">
              {growth.requesters_per_runner != null ? (
                <>
                  <span className="font-semibold text-[#17211b]">{growth.requesters_per_runner}</span> requesters per active runner this month
                </>
              ) : (
                'No active runners this month'
              )}
            </p>
          </>
        ) : (
          <Skeleton className="h-[14px] w-[280px]" />
        )}
      </div>
    </Card>
  );
}
