import { RefreshCw } from 'lucide-react';
import type { AdminTransactionsOverview } from '@/types/api';
import { formatCount, formatNaira, formatPct, relativeAgo } from '../format';
import { watShortDate, watTime, isSameWatDay } from '../errand/errandPresentation';
import { Card, CardTitle, Skeleton } from '../overview/primitives';
import { METHOD_COLORS } from './presentation';

function healthTone(rate: number | null): { color: string; label: string } {
  if (rate == null) return { color: '#a9b3ac', label: 'No traffic' };
  if (rate >= 95) return { color: '#167d35', label: 'Healthy' };
  if (rate >= 85) return { color: '#b06d12', label: 'Degraded' };
  return { color: '#b84545', label: 'Failing' };
}

function reconcileLabel(at: string): string {
  return isSameWatDay(at) ? watTime(at) : `${watShortDate(at)}, ${watTime(at)}`;
}

export function PaymentMixCard({ overview }: { overview?: AdminTransactionsOverview }) {
  const methods = overview?.methods ?? [];
  const successful = overview?.kpis.payments.amount ?? 0;
  const provider = overview?.provider;
  const health = healthTone(provider?.collections.success_rate ?? null);
  const last = provider?.last_reconcile ?? null;

  return (
    <Card className="flex w-full min-w-0 flex-col gap-[14px] p-[18px] xl:h-[328px] xl:w-[350px] xl:flex-shrink-0">
      <CardTitle title="Payment method mix" subtitle="Successful volume by rail" />

      {overview ? (
        <div className="flex flex-col gap-[8px]">
          <div className="flex h-[10px] w-full overflow-hidden rounded-full bg-[#eef1ee]">
            {methods.map((method) => (
              <span
                key={method.key}
                title={`${method.label} · ${formatPct(method.share_pct)}`}
                style={{ width: `${method.share_pct}%`, backgroundColor: METHOD_COLORS[method.key] }}
              />
            ))}
          </div>
          <p className="text-[11px] text-[#45514a]">
            <span className="font-semibold text-[#17211b]">{formatNaira(successful)}</span> successful volume
          </p>
        </div>
      ) : (
        <Skeleton className="h-[30px] w-full" />
      )}

      <div className="flex flex-col gap-[7px]">
        {overview && methods.length === 0 ? <p className="text-[11px] text-[#7c857f]">No successful payments in this period.</p> : null}
        {methods.map((method) => (
          <div key={method.key} className="flex items-center gap-[8px] text-[11px]">
            <span className="size-[8px] flex-shrink-0 rounded-full" style={{ backgroundColor: METHOD_COLORS[method.key] }} />
            <span className="min-w-0 flex-1 truncate text-[#45514a]">{method.label}</span>
            <span className="text-[10px] text-[#7c857f]">{formatNaira(method.amount)}</span>
            <span className="w-[42px] text-right font-semibold text-[#17211b]">{formatPct(method.share_pct)}</span>
          </div>
        ))}
      </div>

      <div className="mt-auto flex flex-col gap-[8px] border-t border-[#e2e8e3] pt-[12px]">
        <p className="text-[9px] font-semibold uppercase tracking-[0.27px] text-[#7c857f]">Provider health</p>
        {provider ? (
          <>
            <div className="flex items-center gap-[9px]">
              <span className="flex size-[26px] flex-shrink-0 items-center justify-center rounded-[7px] bg-[#eef5fb] text-[10px] font-bold text-[#2c73b9]">
                PS
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-[6px] text-[11px] font-semibold text-[#17211b]">
                  {provider.name}
                  <span className="flex items-center gap-[4px] text-[9px] font-semibold" style={{ color: health.color }}>
                    <span className="size-[6px] rounded-full" style={{ backgroundColor: health.color }} />
                    {health.label}
                  </span>
                </p>
                <p className="truncate text-[9px] text-[#7c857f]" title={`Last successful payment ${relativeAgo(provider.collections.last_success_at)}`}>
                  {formatPct(provider.collections.success_rate)} collections · {formatNaira(provider.collections.fees)} fees ·{' '}
                  {formatCount(provider.payouts.paid_count)} payouts paid
                  {provider.payouts.in_flight > 0 ? ` · ${formatCount(provider.payouts.in_flight)} in flight` : ''}
                </p>
              </div>
            </div>
            <p className="flex items-center gap-[6px] rounded-[8px] bg-[#f8faf8] px-[9px] py-[7px] text-[10px] text-[#45514a]">
              <RefreshCw className="size-[12px] flex-shrink-0 text-[#7c857f]" strokeWidth={1.8} />
              <span className="min-w-0 flex-1 truncate">
                {last ? `Last reconciled ${reconcileLabel(last.at)}` : 'Not reconciled yet'} ·{' '}
                {provider.open_checkouts.count > 0 ? (
                  <span className="font-semibold text-[#b06d12]">
                    {formatCount(provider.open_checkouts.count)} open checkout{provider.open_checkouts.count === 1 ? '' : 's'} (
                    {formatNaira(provider.open_checkouts.amount)})
                  </span>
                ) : (
                  <span className="font-semibold text-[#167d35]">no open checkouts</span>
                )}
              </span>
            </p>
          </>
        ) : (
          <Skeleton className="h-[60px] w-full" />
        )}
      </div>
    </Card>
  );
}
