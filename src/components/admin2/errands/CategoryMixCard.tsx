import type { AdminErrandsOverview } from '@/types/api';
import { formatNaira, formatCount, formatPct } from '../format';
import { categoryLabel } from '../errand/errandPresentation';
import { Card, CardTitle, Skeleton } from '../overview/primitives';

const COLORS = ['#167d35', '#2c73b9', '#735ca8', '#b06d12', '#3aa3a0', '#9aa39d'];

export function CategoryMixCard({ overview, onCategory }: { overview?: AdminErrandsOverview; onCategory: (key: string) => void }) {
  const categories = overview?.categories ?? [];
  const areas = overview?.areas ?? [];
  const areaMax = Math.max(1, ...areas.map((area) => area.count));

  return (
    <Card className="flex w-full min-w-0 flex-col gap-[14px] p-[18px] xl:h-[328px] xl:w-[380px] xl:flex-shrink-0">
      <CardTitle title="Mix by category & area" subtitle="Errands created in this period" />

      {!overview ? (
        <Skeleton className="h-[180px] w-full" />
      ) : categories.length === 0 ? (
        <p className="flex flex-1 items-center justify-center rounded-[8px] bg-[#f8faf8] p-[18px] text-center text-[11px] text-[#7c857f]">
          No errands were created in this period.
        </p>
      ) : (
        <>
          <div className="flex h-[10px] w-full overflow-hidden rounded-full bg-[#eef1ee]">
            {categories.map((category, index) => (
              <span
                key={category.key}
                title={`${categoryLabel(category.key)}: ${formatPct(category.share_pct)}`}
                className="h-full"
                style={{ width: `${category.share_pct}%`, backgroundColor: COLORS[index % COLORS.length] }}
              />
            ))}
          </div>

          <div className="flex flex-col">
            {categories.slice(0, 4).map((category, index) => {
              const finished = category.completed + category.cancelled;
              return (
                <button
                  key={category.key}
                  type="button"
                  onClick={() => onCategory(category.key)}
                  title="Show these errands in the list below"
                  className="flex items-center gap-[8px] rounded-[6px] px-[4px] py-[5px] text-left text-[11px] hover:bg-[#f8faf8]"
                >
                  <span className="size-[8px] flex-shrink-0 rounded-[2px]" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="min-w-0 flex-1 truncate text-[#17211b]">{categoryLabel(category.key)}</span>
                  <span className="w-[54px] text-right text-[10px] text-[#7c857f]">
                    {finished > 0 ? `${formatPct((category.completed / finished) * 100, 0)} done` : '—'}
                  </span>
                  <span className="w-[72px] whitespace-nowrap text-right text-[10px] text-[#45514a]">{formatNaira(category.gmv)}</span>
                  <span className="w-[34px] text-right font-semibold text-[#17211b]">{formatCount(category.count)}</span>
                </button>
              );
            })}
          </div>

          {areas.length > 0 ? (
            <div className="mt-auto flex flex-col gap-[6px] border-t border-[#e2e8e3] pt-[10px]">
              <p className="text-[9px] font-semibold uppercase tracking-[0.27px] text-[#7c857f]">Busiest areas</p>
              <div className="flex flex-wrap gap-[6px]">
                {areas.map((area) => (
                  <span
                    key={area.name}
                    className="relative overflow-hidden rounded-full border border-[#e2e8e3] px-[9px] py-[3px] text-[10px] text-[#45514a]"
                    title={`${formatCount(area.count)} errands`}
                  >
                    <span className="absolute inset-y-0 left-0 bg-[#eaf6ed]" style={{ width: `${(area.count / areaMax) * 100}%` }} />
                    <span className="relative">
                      {area.name} <span className="font-semibold text-[#17211b]">{formatCount(area.count)}</span>
                    </span>
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </>
      )}
    </Card>
  );
}
