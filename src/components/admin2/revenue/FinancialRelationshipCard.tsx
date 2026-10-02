import { ArrowDownRight, ArrowUpRight, BadgeCheck } from 'lucide-react';
import type { AdminRevenueOverview } from '@/types/api';
import { formatNaira, formatPct } from '../format';
import { Card, CardTitle, Skeleton } from '../overview/primitives';
import { signedNaira } from './presentation';

type Tile = { label: string; value: string; note: string; negative?: boolean; title?: string };

export function FinancialRelationshipCard({ overview }: { overview?: AdminRevenueOverview }) {
  const totals = overview?.totals;
  const tiles: Tile[] = totals
    ? [
        { label: 'Gross transaction value', value: formatNaira(totals.gtv), note: 'All successful requester charges' },
        {
          label: 'Refunds & reversals',
          value: signedNaira(-totals.refunds),
          note: overview.rates.refund_share_pct != null ? `${formatPct(overview.rates.refund_share_pct, 2)} of gross value` : 'Returned to requesters',
          negative: true,
        },
        { label: 'Runner service earnings', value: formatNaira(totals.runner_earnings), note: 'Before company commission' },
        {
          label: 'Runner payouts released',
          value: formatNaira(totals.payouts),
          note: `${formatNaira(overview.pending_settlement.amount)} pending settlement`,
          title: `${overview.pending_settlement.count} escrow payments still held across all dates`,
        },
        { label: 'Gross company earnings', value: formatNaira(totals.gross), note: 'Commission + platform fees' },
        {
          label: 'Net company revenue',
          value: signedNaira(totals.net),
          note: overview.rates.net_take_pct != null ? `${formatPct(overview.rates.net_take_pct)} of GTV` : 'After costs and incentives',
        },
      ]
    : [];

  return (
    <Card className="flex w-full flex-col gap-[14px] p-[18px]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <CardTitle title="Financial relationship" subtitle="How marketplace value moves from requester payments to runners and GoQuick." />
        {overview ? (
          <span
            className="flex flex-shrink-0 items-center gap-[5px] rounded-full bg-[#eaf6ed] px-[9px] py-[4px] text-[10px] font-semibold text-[#0d5e27]"
            title="Figures are read directly from escrow releases, refunds and wallet ledger entries"
          >
            <BadgeCheck className="size-[12px]" strokeWidth={2} />
            Ledger-backed
          </span>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-[10px] sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        {totals
          ? tiles.map((tile) => {
              const Arrow = tile.negative ? ArrowDownRight : ArrowUpRight;
              return (
                <div key={tile.label} className="flex min-w-0 flex-col gap-[6px] rounded-[10px] border border-[#e2e8e3] p-[12px]" title={tile.title}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-[10px] font-medium text-[#45514a]">{tile.label}</p>
                    <Arrow className={`size-[13px] flex-shrink-0 ${tile.negative ? 'text-[#b84545]' : 'text-[#167d35]'}`} strokeWidth={2} />
                  </div>
                  <p className={`truncate text-[19px] font-bold tracking-[-0.3px] ${tile.negative ? 'text-[#b84545]' : 'text-[#17211b]'}`}>
                    {tile.value}
                  </p>
                  <p className="truncate text-[10px] text-[#7c857f]">{tile.note}</p>
                </div>
              );
            })
          : Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-[84px] w-full rounded-[10px]" />)}
      </div>
    </Card>
  );
}
