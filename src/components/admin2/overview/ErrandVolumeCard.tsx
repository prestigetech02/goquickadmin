import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ellipsis } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { canAccessPage, getPagePath } from '@/lib/adminNavigation';
import type { DashboardOverview } from '@/types/api';
import gridLine from '@/assets/admin2/grid-line.png';
import { formatCompactNaira, formatCount, formatSignedPct, parseDate } from '../format';
import { Card, CardTitle, Skeleton } from './primitives';

const CHART_HEIGHT = 190;
const BARS_INSET = { top: 10, right: 18, left: 20 };
const BAR_GAP = 18;
const BASELINE_Y = 171;
const GRID_STEP = 45;
const MAX_BAR_HEIGHT = 130;
const LINE_TOP = 22;
const LINE_BOTTOM = BASELINE_Y;

function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    setWidth(element.clientWidth);
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return [ref, width] as const;
}

/** Monotone cubic (Fritsch–Carlson): smooth, but never overshoots the data, so ₦0 days stay on the baseline. */
function smoothPath(points: Array<{ x: number; y: number }>): string {
  const n = points.length;
  if (n === 0) return '';
  if (n < 3) return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  const slopes = points.slice(0, -1).map((p, i) => (points[i + 1].y - p.y) / (points[i + 1].x - p.x));
  const tangents = points.map((_, i) => {
    if (i === 0) return slopes[0];
    if (i === n - 1) return slopes[n - 2];
    return slopes[i - 1] * slopes[i] <= 0 ? 0 : (slopes[i - 1] + slopes[i]) / 2;
  });
  for (let i = 0; i < n - 1; i += 1) {
    if (slopes[i] === 0) {
      tangents[i] = 0;
      tangents[i + 1] = 0;
      continue;
    }
    const a = tangents[i] / slopes[i];
    const b = tangents[i + 1] / slopes[i];
    const h = Math.hypot(a, b);
    if (h > 3) {
      tangents[i] = (3 / h) * a * slopes[i];
      tangents[i + 1] = (3 / h) * b * slopes[i];
    }
  }

  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < n - 1; i += 1) {
    const p1 = points[i];
    const p2 = points[i + 1];
    const dx = (p2.x - p1.x) / 3;
    d += ` C ${p1.x + dx} ${p1.y + tangents[i] * dx}, ${p2.x - dx} ${p2.y - tangents[i + 1] * dx}, ${p2.x} ${p2.y}`;
  }
  return d;
}

function plural(count: number, noun: string): string {
  return `${formatCount(count)} ${noun}${count === 1 ? '' : 's'}`;
}

function weekLabel(start: string, end: string): string {
  const s = parseDate(start);
  const e = parseDate(end);
  const long = (d: Date) => d.toLocaleDateString('en-GB', { month: 'long' });
  if (s.getMonth() === e.getMonth()) return `${s.getDate()}–${e.getDate()} ${long(e)}`;
  const short = (d: Date) => d.toLocaleDateString('en-GB', { month: 'short' });
  return `${s.getDate()} ${short(s)} – ${e.getDate()} ${short(e)}`;
}

export function ErrandVolumeCard({ data }: { data?: DashboardOverview }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [chartRef, width] = useElementWidth<HTMLDivElement>();
  const [hovered, setHovered] = useState<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onDocClick(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [menuOpen]);

  const volume = data?.volume;
  const series = volume?.series ?? [];
  const maxErrands = Math.max(1, ...series.map((d) => d.errands));
  const maxGmv = Math.max(0, ...series.map((d) => d.gmv));

  const innerWidth = Math.max(0, width - BARS_INSET.left - BARS_INSET.right);
  const columnWidth = series.length > 0 ? (innerWidth - BAR_GAP * (series.length - 1)) / series.length : 0;
  const points = series.map((day, index) => ({
    x: BARS_INSET.left + index * (columnWidth + BAR_GAP) + columnWidth / 2,
    y: maxGmv > 0 ? LINE_BOTTOM - (day.gmv / maxGmv) * (LINE_BOTTOM - LINE_TOP) : LINE_BOTTOM,
  }));

  const peakIndex = series.reduce((best, day, index) => (day.gmv > (series[best]?.gmv ?? -1) ? index : best), 0);
  const activeIndex = hovered ?? (maxGmv > 0 ? peakIndex : null);
  const activePoint = activeIndex != null ? points[activeIndex] : undefined;
  const activeDay = activeIndex != null ? series[activeIndex] : undefined;

  const menuLinks = [
    { label: 'Open analytics', page: 'analytics' as const },
    { label: 'Open company revenue', page: 'company-revenue' as const },
  ].filter((link) => canAccessPage(user, link.page));

  return (
    <Card className="flex min-w-0 flex-1 flex-col gap-[14px] p-[18px] xl:h-[326px]">
      <div className="flex items-start justify-between gap-3">
        <CardTitle
          title="Errand volume & revenue"
          subtitle={volume ? `Daily activity · ${weekLabel(volume.start_date, volume.end_date)}` : 'Daily activity'}
        />
        <div className="flex flex-shrink-0 items-center gap-[14px]">
          <span className="hidden items-center gap-[6px] text-[10px] text-[#45514a] sm:flex">
            <span className="size-[8px] rounded-full bg-[#cfe9d5]" />
            Errands
          </span>
          <span className="hidden items-center gap-[6px] text-[10px] text-[#45514a] sm:flex">
            <span className="size-[8px] rounded-full bg-[#167d35]" />
            Completed
          </span>
          <span className="hidden items-center gap-[6px] text-[10px] text-[#45514a] sm:flex">
            <span className="h-[2px] w-[12px] rounded-[2px] bg-[#3973a8]" />
            Revenue
          </span>
          {menuLinks.length > 0 ? (
            <div ref={menuRef} className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((value) => !value)}
                aria-label="Chart options"
                aria-expanded={menuOpen}
                className="flex size-[28px] items-center justify-center rounded-[6px] bg-[#f8faf8] text-[#45514a] hover:bg-[#eef1ee]"
              >
                <Ellipsis className="size-[15px]" strokeWidth={1.8} />
              </button>
              {menuOpen ? (
                <div className="absolute right-0 top-full z-20 mt-1 w-[180px] overflow-hidden rounded-[10px] border border-[#e2e8e3] bg-white py-1 shadow-[0px_8px_24px_0px_rgba(16,33,23,0.12)]">
                  {menuLinks.map((link) => (
                    <button
                      key={link.page}
                      type="button"
                      onClick={() => navigate(getPagePath(link.page))}
                      className="w-full px-3 py-2 text-left text-[12px] text-[#17211b] hover:bg-[#f8faf8]"
                    >
                      {link.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <div ref={chartRef} className="relative w-full flex-shrink-0" style={{ height: CHART_HEIGHT }} onMouseLeave={() => setHovered(null)}>
        {[0, 1, 2].map((step) => (
          <img
            key={step}
            src={gridLine}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute left-0 right-0 h-px w-full select-none"
            style={{ top: BASELINE_Y - GRID_STEP * (step + 1) }}
          />
        ))}
        <span className="pointer-events-none absolute left-0 right-0 h-px bg-[#d4ddd6]" style={{ top: BASELINE_Y }} />

        {volume ? (
          <div
            className="absolute bottom-0 flex items-end"
            style={{ top: BARS_INSET.top, left: BARS_INSET.left, right: BARS_INSET.right, gap: BAR_GAP }}
          >
            {series.map((day, index) => {
              const height = day.errands > 0 ? Math.max(6, (day.errands / maxErrands) * MAX_BAR_HEIGHT) : 2;
              const completed = Math.min(day.completed ?? 0, day.errands);
              const completedHeight = day.errands > 0 ? (completed / day.errands) * height : 0;
              const date = parseDate(day.date);
              const isHovered = hovered === index;
              return (
                <div
                  key={day.date}
                  className="flex h-full min-w-0 flex-1 cursor-default flex-col items-center justify-end gap-[7px]"
                  onMouseEnter={() => setHovered(index)}
                >
                  <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-end">
                    <div
                      className={`flex w-[26px] max-w-full flex-col justify-end overflow-hidden rounded-b-[1px] rounded-t-[5px] transition-colors ${
                        isHovered ? 'bg-[#cfe9d5]' : 'bg-[#eaf6ed]'
                      }`}
                      style={{ height }}
                    >
                      {completedHeight > 0 ? (
                        <div
                          className={`w-full rounded-t-[5px] transition-colors ${isHovered ? 'bg-[#0d5e27]' : 'bg-[#167d35]'}`}
                          style={{ height: completedHeight }}
                        />
                      ) : null}
                    </div>
                  </div>
                  <p className="text-[10px] leading-[12px] text-[#7c857f]">
                    {date.toLocaleDateString('en-GB', { weekday: 'short' })}
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="absolute inset-x-[20px] bottom-[19px] flex items-end justify-between">
            {[48, 68, 57, 92, 78, 108, 86].map((height, i) => (
              <span key={i} className="block w-[26px] animate-pulse rounded-t-[5px] bg-[#eef1ee]" style={{ height }} />
            ))}
          </div>
        )}

        {volume && width > 0 && points.length > 1 ? (
          <svg className="pointer-events-none absolute inset-0" width={width} height={CHART_HEIGHT} aria-hidden="true">
            <path d={smoothPath(points)} fill="none" stroke="#3973A8" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            {activePoint ? <circle cx={activePoint.x} cy={activePoint.y} r={3.5} fill="#fff" stroke="#3973A8" strokeWidth={2} /> : null}
          </svg>
        ) : null}

        {activePoint && activeDay ? (
          <div
            className="pointer-events-none absolute flex flex-col gap-[2px] whitespace-nowrap rounded-[6px] bg-[#1e2b23] px-[7px] py-[5px]"
            style={{
              left: Math.min(Math.max(0, activePoint.x - 24), Math.max(0, width - 96)),
              top: Math.max(0, activePoint.y - 42),
            }}
          >
            <p className="text-[10px] font-bold leading-normal text-white">
              {formatCompactNaira(activeDay.gmv)} <span className="font-normal text-[#c8d3cc]">revenue</span>
            </p>
            <p className="text-[8px] leading-normal text-[#c8d3cc]">
              {parseDate(activeDay.date).toLocaleDateString('en-GB', { weekday: 'long' })} · {plural(activeDay.errands, 'errand')} ·{' '}
              {formatCount(Math.min(activeDay.completed ?? 0, activeDay.errands))} completed
            </p>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-x-[18px] gap-y-1 text-[11px]">
        {volume ? (
          <>
            <p className="text-[#45514a]">
              <span className="font-semibold text-[#17211b]">{plural(volume.errands, 'errand')}</span> this week
            </p>
            <span className="h-[12px] w-px bg-[#d4ddd6]" />
            <p className="text-[#45514a]">
              <span className="font-semibold text-[#17211b]">{formatCompactNaira(volume.gmv)} GMV</span> processed
            </p>
            <span className="h-[12px] w-px bg-[#d4ddd6]" />
            {volume.errands_change_pct != null ? (
              <p className={volume.errands_change_pct < 0 ? 'text-[#b84545]' : 'text-[#167d35]'}>
                <span className="font-semibold">{formatSignedPct(volume.errands_change_pct)}</span> week over week
              </p>
            ) : (
              <p className="text-[#7c857f]">No errands the previous week</p>
            )}
          </>
        ) : (
          <Skeleton className="h-[14px] w-[260px]" />
        )}
      </div>
    </Card>
  );
}
