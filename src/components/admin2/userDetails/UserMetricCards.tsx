import type { ComponentType } from 'react';
import { CreditCard, PackageCheck, ShieldCheck, WalletCards, type LucideProps } from 'lucide-react';
import type { AdminUserProfile } from '@/types/api';
import { formatCount, formatNaira } from '../format';
import { Card } from '../overview/primitives';
import { HEALTH_LEVELS } from './presentation';

export function MetricCard({
  label,
  value,
  sub,
  icon: Icon,
  iconBg,
  iconColor,
}: {
  label: string;
  value: string;
  sub: string;
  icon: ComponentType<LucideProps>;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <Card className="flex min-w-0 flex-col gap-[9px] p-[16px] xl:h-[126px]">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-[11px] font-medium text-[#45514a]">{label}</p>
        <span className="flex size-[30px] flex-shrink-0 items-center justify-center rounded-[8px]" style={{ backgroundColor: iconBg }}>
          <Icon className="size-[15px]" strokeWidth={1.8} color={iconColor} />
        </span>
      </div>
      <p className="truncate text-[25px] font-bold tracking-[-0.5px] text-[#17211b]">{value}</p>
      <p className="truncate text-[10px] text-[#7c857f]">{sub}</p>
    </Card>
  );
}

export function UserMetricCards({ profile }: { profile: AdminUserProfile }) {
  const { metrics, health, support, user } = profile;
  const isRunner = user.role === 'runner';
  const completion = metrics.completion_pct != null ? ` · ${Math.round(metrics.completion_pct)}% completion` : '';
  const pending = metrics.pending_withdrawals;
  const level = HEALTH_LEVELS[health.level];
  const resolvedTickets = support.tickets_total - support.tickets_open;
  const supportLine = support.tickets_open > 0
    ? `${support.tickets_open} open ${support.tickets_open === 1 ? 'ticket' : 'tickets'}`
    : `${resolvedTickets} resolved ${resolvedTickets === 1 ? 'ticket' : 'tickets'}`;

  return (
    <div className="grid w-full grid-cols-2 gap-[12px] xl:grid-cols-4">
      <MetricCard
        label={isRunner ? 'Completed jobs' : 'Completed errands'}
        value={formatCount(metrics.errands_completed)}
        sub={`${formatCount(metrics.errands_total)} total${completion}`}
        icon={PackageCheck}
        iconBg="#eaf6ed"
        iconColor="#167d35"
      />
      <MetricCard
        label={isRunner ? 'Lifetime earnings' : 'Lifetime spend'}
        value={formatNaira(metrics.lifetime_value)}
        sub={metrics.average_order != null ? `${formatNaira(metrics.average_order)} average ${isRunner ? 'job' : 'order'}` : 'No completed errands yet'}
        icon={WalletCards}
        iconBg="#eef5fb"
        iconColor="#2c73b9"
      />
      <MetricCard
        label="Wallet balance"
        value={metrics.wallet_balance != null ? formatNaira(metrics.wallet_balance) : '—'}
        sub={pending.count > 0
          ? `${pending.count} pending ${pending.count === 1 ? 'withdrawal' : 'withdrawals'} · ${formatNaira(pending.amount)}`
          : 'No pending withdrawals'}
        icon={CreditCard}
        iconBg="#f3f0fa"
        iconColor="#735ca8"
      />
      <MetricCard
        label="Support health"
        value={`${health.score} / 100`}
        sub={`${level.risk} risk · ${supportLine}`}
        icon={ShieldCheck}
        iconBg="#fff5e5"
        iconColor="#b06d12"
      />
    </div>
  );
}
