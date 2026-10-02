import { TrendingUp } from 'lucide-react';
import type { AdminAnalyticsOverview } from '@/types/api';
import { categoryLabel } from '../errand/errandPresentation';
import { formatCount, formatPct, formatSignedPct } from '../format';
import { Card, CardTitle, Skeleton } from '../overview/primitives';
import { CATEGORY_COLORS } from './presentation';

const MAX_ROWS = 6;

export function CategoryMixCard({ overview, onSelect }: { overview?: AdminAnalyticsOverview; onSelect: (category: string) => void }) {
  const mix = overview?.categories;
  const rows = (mix?.rows ?? []).slice(0, MAX_ROWS);
  const maxShare = Math.max(0, ...rows.map((r) => r.share_pct));

  return (
    <Card className="flex w-full flex-col gap-[14px] p-[18px] xl:w-[44%] xl:flex-shrink-0">
      <CardTitle title="Category mix" subtitle="Completed errands by service category" />
      <div className="flex flex-col gap-[12px]">
        {!mix ? Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-[26px] w-full" />) : null}
        {mix && rows.length === 0 ? <p className="py-[24px] text-center text-[11px] text-[#7c857f]">No completed errands in this period.</p> : null}
        {rows.map((row, index) => (
          <button
            key={row.key}
            type="button"
            onClick={() => onSelect(row.key)}
            className="flex flex-col gap-[6px] text-left hover:opacity-80"
            title="Show in category performance detail"
          >
            <div className="flex w-full items-center justify-between gap-2 text-[11px]">
              <span className="truncate text-[#17211b]">{categoryLabel(row.key)}</span>
              <span className="flex-shrink-0 font-semibold text-[#17211b]">
                {formatCount(row.completed)} <span className="font-normal text-[#7c857f]">· {formatPct(row.share_pct)}</span>
              </span>
            </div>
            <span className="h-[5px] w-full overflow-hidden rounded-full bg-[#eef1ee]">
              <span
                className="block h-full rounded-full"
                style={{
                  width: `${maxShare > 0 ? Math.max(2, (row.share_pct / maxShare) * 100) : 0}%`,
                  backgroundColor: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
                }}
              />
            </span>
          </button>
        ))}
      </div>
      {mix?.top_growth?.growth_pct != null ? (
        <div className="mt-auto flex items-center gap-[8px] rounded-[8px] bg-[#f3faf5] px-[12px] py-[9px] text-[10px] text-[#0d5e27]">
          <TrendingUp className="size-[14px] flex-shrink-0" strokeWidth={1.8} />
          <span>
            {categoryLabel(mix.top_growth.key)} completions grew {formatSignedPct(mix.top_growth.growth_pct)} against the previous period, the fastest of any category.
          </span>
        </div>
      ) : null}
    </Card>
  );
}
