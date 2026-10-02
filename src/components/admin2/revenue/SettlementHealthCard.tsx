import { ArrowRight, Clock3 } from 'lucide-react';
import type { AdminRevenueOverview, RevenueStatus } from '@/types/api';
import { formatNaira, formatPct, relativeAgo } from '../format';
import { Card, CardTitle, Skeleton } from '../overview/primitives';
import { plural } from '../shared/helpers';

const TILES: Array<{ key: 'reconciled' | 'pending' | 'review'; label: string; filter: RevenueStatus | null; box: string; value: string }> = [
  { key: 'reconciled', label: 'Reconciled', filter: null, box: 'border-[#d4e9da] bg-[#f3faf5]', value: 'text-[#0d5e27]' },
  { key: 'pending', label: 'Pending settlement', filter: 'pending', box: 'border-[#f3e2c4] bg-[#fffaf1]', value: 'text-[#b06d12]' },
  { key: 'review', label: 'Needs reconciliation', filter: 'review', box: 'border-[#f2d4d4] bg-[#fdf5f5]', value: 'text-[#b84545]' },
];

export function SettlementHealthCard({
  overview,
  onFilter,
  onOpenReconciliation,
  canReconcile,
}: {
  overview?: AdminRevenueOverview;
  onFilter: (status: RevenueStatus) => void;
  onOpenReconciliation: () => void;
  canReconcile: boolean;
}) {
  const health = overview?.health;

  return (
    <Card className="flex w-full flex-col gap-[14px] p-[18px]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <CardTitle title="Settlement & reconciliation health" subtitle="Escrow settlement and ledger matching for payments in this period" />
        {health?.reconciled_pct != null ? (
          <span
            className={`flex-shrink-0 rounded-full px-[9px] py-[4px] text-[10px] font-semibold ${
              health.reconciled_pct >= 98 ? 'bg-[#eaf6ed] text-[#0d5e27]' : health.reconciled_pct >= 90 ? 'bg-[#fff5e5] text-[#b06d12]' : 'bg-[#fdeded] text-[#b84545]'
            }`}
            title="Share of finished escrow payments whose ledger entries match"
          >
            {formatPct(health.reconciled_pct)} reconciled
          </span>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-[10px] md:grid-cols-3">
        {health
          ? TILES.map((tile) => {
              const bucket = health[tile.key];
              const filter = tile.filter;
              const detail =
                tile.key === 'reconciled'
                  ? `${plural(health.reconciled.settled_count, 'settlement')} · ${plural(health.reconciled.refunded_count, 'refund')}`
                  : plural(bucket.count, 'transaction');
              const body = (
                <>
                  <p className="text-[10px] font-medium text-[#45514a]">{tile.label}</p>
                  <p className={`text-[22px] font-bold tracking-[-0.4px] ${tile.value}`}>{formatNaira(bucket.amount)}</p>
                  <p className="text-[10px] text-[#7c857f]">{detail}</p>
                </>
              );
              return filter && bucket.count > 0 ? (
                <button
                  key={tile.key}
                  type="button"
                  onClick={() => onFilter(filter)}
                  className={`flex flex-col gap-[4px] rounded-[10px] border p-[14px] text-left transition-shadow hover:shadow-sm ${tile.box}`}
                  title="Show these in recent revenue transactions"
                >
                  {body}
                </button>
              ) : (
                <div key={tile.key} className={`flex flex-col gap-[4px] rounded-[10px] border p-[14px] ${tile.box}`}>
                  {body}
                </div>
              );
            })
          : Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-[86px] w-full rounded-[10px]" />)}
      </div>

      {health ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-[#e2e8e3] bg-[#f8faf8] px-[14px] py-[10px]">
          <div className="flex min-w-0 items-center gap-[10px]">
            <span className="flex size-[30px] flex-shrink-0 items-center justify-center rounded-[8px] bg-[#eef5fb]">
              <Clock3 className="size-[15px] text-[#2c73b9]" strokeWidth={1.8} />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-[#17211b]">
                {health.pending.count > 0
                  ? `${plural(health.pending.count, 'escrow payment')} awaiting completion · ${formatNaira(health.pending.amount)}`
                  : 'No escrow payments awaiting settlement'}
              </p>
              <p className="text-[10px] text-[#7c857f]">
                {health.oldest_pending_at
                  ? `Oldest held ${relativeAgo(health.oldest_pending_at)}. Paystack checkouts are reconciled from Transactions.`
                  : 'Paystack checkouts are reconciled from Transactions.'}
              </p>
            </div>
          </div>
          {canReconcile ? (
            <button
              type="button"
              onClick={onOpenReconciliation}
              className="flex h-[32px] flex-shrink-0 items-center gap-[6px] rounded-[8px] border border-[#d4ddd6] bg-white px-[12px] text-[11px] font-semibold text-[#17211b] hover:bg-[#f3f6f4]"
            >
              Open reconciliation
              <ArrowRight className="size-[13px]" strokeWidth={1.8} />
            </button>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
