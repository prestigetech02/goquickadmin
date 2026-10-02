import type { AdminRevenueOverview } from '@/types/api';
import { categoryLabel } from '../errand/errandPresentation';
import { formatNaira, formatPct } from '../format';
import { Card, CardTitle, Skeleton } from '../overview/primitives';
import { TABLE_HEADER } from '../shared/TableControls';
import { CATEGORY_COLORS, signedNaira } from './presentation';

const MAX_ROWS = 6;

export function CategoryContributionCard({
  overview,
  onSelect,
}: {
  overview?: AdminRevenueOverview;
  onSelect: (category: string) => void;
}) {
  const rows = (overview?.categories ?? []).slice(0, MAX_ROWS);
  const maxShare = Math.max(0, ...rows.map((row) => row.share_pct));

  return (
    <Card className="flex w-full flex-col gap-[14px] p-[18px] xl:w-[44%] xl:flex-shrink-0">
      <CardTitle title="Contribution by category" subtitle="Errand net revenue after coupon subsidies" />
      <div className="flex flex-col gap-[12px]">
        {!overview ? Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-[26px] w-full" />) : null}
        {overview && rows.length === 0 ? (
          <p className="py-[24px] text-center text-[11px] text-[#7c857f]">No errand revenue recognised in this period.</p>
        ) : null}
        {rows.map((row, index) => (
          <button
            key={row.key}
            type="button"
            onClick={() => onSelect(row.key)}
            className="flex flex-col gap-[6px] rounded-[6px] text-left hover:opacity-80"
            title={`${row.count} settled or refunded errands · show in transactions`}
          >
            <div className="flex w-full items-center justify-between gap-2 text-[11px]">
              <span className="truncate text-[#17211b]">{categoryLabel(row.key)}</span>
              <span className="flex-shrink-0 font-semibold text-[#17211b]">
                {signedNaira(row.revenue)} <span className="font-normal text-[#7c857f]">· {formatPct(row.share_pct)}</span>
              </span>
            </div>
            <span className="h-[5px] w-full overflow-hidden rounded-full bg-[#eef1ee]">
              <span
                className="block h-full rounded-full"
                style={{
                  width: `${maxShare > 0 ? Math.max(2, (Math.max(0, row.share_pct) / maxShare) * 100) : 0}%`,
                  backgroundColor: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
                }}
              />
            </span>
          </button>
        ))}
      </div>
    </Card>
  );
}

const ZONE_GRID = 'grid grid-cols-[minmax(120px,1.4fr)_minmax(80px,1fr)_60px_80px] items-center gap-x-[12px] px-[16px]';

export function ZoneContributionCard({ overview, onSelect }: { overview?: AdminRevenueOverview; onSelect: (zone: string) => void }) {
  const rows = (overview?.zones ?? []).slice(0, MAX_ROWS);

  return (
    <Card className="flex min-w-0 flex-1 flex-col overflow-hidden">
      <div className="px-[18px] pb-[12px] pt-[18px]">
        <CardTitle title="Contribution by service zone" subtitle="Errand net revenue and take rate by operating area" />
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-[420px]">
          <div className={`${ZONE_GRID} ${TABLE_HEADER}`}>
            <span>Service zone</span>
            <span className="text-right">Net revenue</span>
            <span className="text-right">Share</span>
            <span className="text-right">Net take rate</span>
          </div>
          {!overview
            ? Array.from({ length: 5 }, (_, i) => (
                <div key={i} className={`${ZONE_GRID} h-[46px] border-b border-[#e2e8e3]`}>
                  {Array.from({ length: 4 }, (_, j) => (
                    <Skeleton key={j} className="h-[10px] w-[60px]" />
                  ))}
                </div>
              ))
            : null}
          {overview && rows.length === 0 ? (
            <p className="px-[16px] py-[28px] text-center text-[11px] text-[#7c857f]">No zone revenue recognised in this period.</p>
          ) : null}
          {rows.map((row) => {
            const zone = row.zone;
            return (
              <div
                key={zone ?? 'unassigned'}
                role={zone ? 'button' : undefined}
                tabIndex={zone ? 0 : undefined}
                onClick={zone ? () => onSelect(zone) : undefined}
                onKeyDown={zone ? (event) => event.key === 'Enter' && onSelect(zone) : undefined}
                className={`${ZONE_GRID} h-[46px] border-b border-[#e2e8e3] last:border-b-0 ${zone ? 'cursor-pointer hover:bg-[#fafcfa]' : ''}`}
                title={`${row.count} errands · ${formatNaira(row.gtv)} gross value`}
              >
                <span className={`truncate text-[11px] font-semibold ${zone ? 'text-[#17211b]' : 'text-[#7c857f]'}`}>{zone ?? 'Unassigned'}</span>
                <span className="text-right text-[11px] text-[#17211b]">{signedNaira(row.revenue)}</span>
                <span className="text-right text-[11px] text-[#45514a]">{formatPct(row.share_pct)}</span>
                <span className={`text-right text-[11px] font-semibold ${row.take_rate_pct != null && row.take_rate_pct < 0 ? 'text-[#b84545]' : 'text-[#167d35]'}`}>
                  {formatPct(row.take_rate_pct)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
