import type { BlogOverview } from '@/types/api';
import { formatCount, formatPct } from '../format';
import { Card, CardTitle, Dot, Skeleton } from '../overview/primitives';
import { categoryColor } from './presentation';

const MAX_ROWS = 5;

function categoriesLabel(count: number, prefix = ''): string {
  return `${formatCount(count)} ${prefix}${count === 1 ? 'category' : 'categories'}`;
}

export function CategoryMixCard({ overview }: { overview?: BlogOverview }) {
  const categories = overview?.categories;
  const items = categories?.items ?? [];
  const shown = items.slice(0, MAX_ROWS);
  const rest = items.slice(MAX_ROWS);
  const restCount = rest.reduce((sum, item) => sum + item.count, 0);
  const restPct = rest.reduce((sum, item) => sum + item.pct, 0);

  return (
    <Card className="flex w-full flex-col gap-[14px] p-[18px] xl:h-[316px] xl:w-[360px] xl:flex-shrink-0">
      <CardTitle title="Category mix" subtitle="Published article distribution" />

      {categories ? (
        <>
          <div className="flex items-end justify-between gap-3">
            <div className="flex flex-col">
              <p className="text-[25px] font-bold leading-none tracking-[-0.5px] text-[#17211b]">{formatCount(categories.total)}</p>
              <p className="mt-[4px] text-[10px] text-[#7c857f]">published posts</p>
            </div>
            {items.length > 0 ? (
              <span className="rounded-full bg-[#eaf6ed] px-[8px] py-[3px] text-[10px] font-semibold text-[#167d35]">{categoriesLabel(items.length)}</span>
            ) : null}
          </div>

          {items.length > 0 ? (
            <div className="flex h-[8px] w-full overflow-hidden rounded-full bg-[#f1f4f2]">
              {items.map((item, index) => (
                <span key={item.name} style={{ width: `${item.pct}%`, backgroundColor: categoryColor(index) }} title={`${item.name} · ${formatPct(item.pct, 0)}`} />
              ))}
            </div>
          ) : null}

          <div className="flex min-h-0 flex-1 flex-col gap-[9px]">
            {shown.map((item, index) => (
              <div key={item.name} className="flex items-center justify-between gap-3 text-[11px]">
                <span className="flex min-w-0 items-center gap-[8px]">
                  <Dot color={categoryColor(index)} size={7} />
                  <span className="truncate text-[#17211b]">{item.name}</span>
                </span>
                <span className="flex-shrink-0 font-semibold text-[#17211b]">
                  {formatCount(item.count)} <span className="font-normal text-[#7c857f]">· {formatPct(item.pct, 0)}</span>
                </span>
              </div>
            ))}
            {rest.length > 0 ? (
              <div className="flex items-center justify-between gap-3 text-[11px]">
                <span className="flex min-w-0 items-center gap-[8px]">
                  <Dot color="#c9d2cc" size={7} />
                  <span className="truncate text-[#45514a]">{categoriesLabel(rest.length, 'other ')}</span>
                </span>
                <span className="flex-shrink-0 font-semibold text-[#17211b]">
                  {formatCount(restCount)} <span className="font-normal text-[#7c857f]">· {formatPct(restPct, 0)}</span>
                </span>
              </div>
            ) : null}
            {items.length === 0 ? <p className="text-[11px] text-[#7c857f]">Publish a post to see how your categories balance out.</p> : null}
          </div>

          {categories.top_engaged ? (
            <p className="text-[10px] leading-relaxed text-[#7c857f]">
              {categories.top_engaged.name} content has the highest average engaged read rate at{' '}
              <span className="font-semibold text-[#45514a]">{formatPct(categories.top_engaged.engaged_rate, 0)}</span>.
            </p>
          ) : null}
        </>
      ) : (
        <div className="flex flex-col gap-[10px]">
          <Skeleton className="h-[26px] w-[60px]" />
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-[12px] w-full" />
          ))}
        </div>
      )}
    </Card>
  );
}
