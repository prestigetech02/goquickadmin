import type { AdminAuditLogSummary } from '@/types/api';
import { formatCount, personInitials } from '../format';
import { Card, CardTitle, Skeleton } from '../overview/primitives';
import { areaLabel, areaTone } from './auditPresentation';

function dayLabel(date: string, short = false): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString('en-GB', short ? { day: 'numeric' } : { weekday: 'short', day: 'numeric', month: 'short' });
}

export function AuditActivityCard({
  summary,
  loading,
  activeAdminId,
  activeArea,
  onPickAdmin,
  onPickArea,
}: {
  summary: AdminAuditLogSummary | undefined;
  loading: boolean;
  activeAdminId: number | null;
  activeArea: string;
  onPickAdmin: (id: number) => void;
  onPickArea: (key: string) => void;
}) {
  const series = summary?.series ?? [];
  const peak = Math.max(1, ...series.map((d) => d.total));
  const total14 = series.reduce((sum, d) => sum + d.total, 0);
  const failed14 = series.reduce((sum, d) => sum + d.failed, 0);
  const topAdminMax = Math.max(1, ...(summary?.top_admins ?? []).map((a) => a.count));
  const topAreaMax = Math.max(1, ...(summary?.top_areas ?? []).map((a) => a.count));

  return (
    <div className="grid w-full grid-cols-1 gap-[12px] xl:grid-cols-3">
      <Card className="flex min-w-0 flex-col gap-[14px] p-[16px] xl:col-span-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <CardTitle title="Admin activity" subtitle="Changes made through the admin panel each day, last 14 days (Lagos time)" />
          <div className="flex items-center gap-[14px] text-[10px] text-[#45514a]">
            <span className="flex items-center gap-[5px]">
              <span className="size-[8px] rounded-[2px] bg-[#167d35]" /> Succeeded
            </span>
            <span className="flex items-center gap-[5px]">
              <span className="size-[8px] rounded-[2px] bg-[#e39b9b]" /> Failed
            </span>
          </div>
        </div>

        {loading && !summary ? (
          <Skeleton className="h-[150px] w-full" />
        ) : (
          <div className="flex h-[150px] items-end gap-[6px]">
            {series.map((day) => {
              const ok = day.total - day.failed;
              return (
                <div key={day.date} className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-[6px]">
                  <div
                    className="relative flex w-full max-w-[34px] flex-col justify-end overflow-hidden rounded-[5px] bg-[#f3f6f4]"
                    style={{ height: '100%' }}
                    title={`${dayLabel(day.date)}: ${day.total} actions${day.failed ? `, ${day.failed} failed` : ''}`}
                  >
                    <div className="w-full bg-[#e39b9b]" style={{ height: `${(day.failed / peak) * 100}%` }} />
                    <div className="w-full bg-[#167d35] transition-opacity group-hover:opacity-80" style={{ height: `${(ok / peak) * 100}%` }} />
                  </div>
                  <span className="text-[9px] text-[#7c857f]">{dayLabel(day.date, true)}</span>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex flex-wrap gap-x-[22px] gap-y-[6px] border-t border-[#e2e8e3] pt-[12px] text-[11px] text-[#45514a]">
          <span>
            <span className="font-semibold text-[#17211b]">{formatCount(total14)}</span> actions in 14 days
          </span>
          <span>
            <span className="font-semibold text-[#17211b]">{formatCount(Math.round(total14 / Math.max(1, series.length)))}</span> a day on average
          </span>
          <span>
            <span className={`font-semibold ${failed14 ? 'text-[#b84545]' : 'text-[#17211b]'}`}>{formatCount(failed14)}</span> failed or rejected
          </span>
        </div>
      </Card>

      <Card className="flex min-w-0 flex-col gap-[16px] p-[16px]">
        <div className="flex flex-col gap-[10px]">
          <CardTitle title="Most active admins" subtitle="Changes in the last 7 days. Click to filter." />
          {loading && !summary
            ? Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-[26px] w-full" />)
            : null}
          {summary && summary.top_admins.length === 0 ? <p className="text-[11px] text-[#7c857f]">No admin changes this week.</p> : null}
          {summary?.top_admins.map((admin) => (
            <button
              key={admin.id}
              type="button"
              onClick={() => onPickAdmin(admin.id)}
              className={`flex items-center gap-[9px] rounded-[8px] px-[6px] py-[4px] text-left hover:bg-[#f6f9f7] ${
                activeAdminId === admin.id ? 'bg-[#eaf6ed]' : ''
              }`}
            >
              <span className="flex size-[24px] flex-shrink-0 items-center justify-center rounded-full bg-[#e8f1fb] text-[9px] font-bold text-[#2563a8]">
                {personInitials(admin.name)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate text-[11px] font-semibold text-[#17211b]">{admin.name}</span>
                  <span className="text-[10px] font-semibold text-[#45514a]">{formatCount(admin.count)}</span>
                </span>
                <span className="mt-[4px] block h-[4px] overflow-hidden rounded-full bg-[#eef2ef]">
                  <span className="block h-full rounded-full bg-[#2563a8]" style={{ width: `${(admin.count / topAdminMax) * 100}%` }} />
                </span>
              </span>
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-[8px] border-t border-[#e2e8e3] pt-[14px]">
          <p className="text-[12px] font-semibold text-[#17211b]">Busiest areas</p>
          <div className="flex flex-wrap gap-[6px]">
            {summary?.top_areas.map((area) => {
              const tone = areaTone(area.key);
              const active = activeArea === area.key;
              return (
                <button
                  key={area.key}
                  type="button"
                  onClick={() => onPickArea(area.key)}
                  className={`flex items-center gap-[6px] rounded-full border px-[9px] py-[4px] text-[10px] font-semibold ${
                    active ? 'border-[#167d35]' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: tone.bg, color: tone.color, opacity: 0.6 + 0.4 * (area.count / topAreaMax) }}
                >
                  {areaLabel(area.key)}
                  <span className="rounded-full bg-white/70 px-[5px] text-[9px]">{formatCount(area.count)}</span>
                </button>
              );
            })}
            {summary && summary.top_areas.length === 0 ? <p className="text-[11px] text-[#7c857f]">Nothing yet.</p> : null}
          </div>
        </div>
      </Card>
    </div>
  );
}
