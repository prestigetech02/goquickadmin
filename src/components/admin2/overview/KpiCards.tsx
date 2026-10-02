import type { ComponentType } from 'react';
import { BadgeDollarSign, CircleCheckBig, Landmark, UsersRound, type LucideProps } from 'lucide-react';
import type { DashboardOverview } from '@/types/api';
import { formatNaira, formatCount, formatPct } from '../format';
import { Card, DeltaPill, Skeleton } from './primitives';

type KpiCardProps = {
  label: string;
  icon: ComponentType<LucideProps>;
  iconColor: string;
  iconBg: string;
  value?: string;
  change?: number | null;
  context?: string;
};

function KpiCard({ label, icon: Icon, iconColor, iconBg, value, change = null, context }: KpiCardProps) {
  return (
    <Card className="flex h-[138px] min-w-0 flex-col gap-[11px] p-[16px]">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-[11px] font-medium text-[#45514a]">{label}</p>
        <span className="flex size-[30px] flex-shrink-0 items-center justify-center rounded-[8px]" style={{ backgroundColor: iconBg }}>
          <Icon className="size-[15px]" strokeWidth={1.8} color={iconColor} />
        </span>
      </div>
      {value != null ? (
        <p className="truncate text-[27px] font-bold leading-normal tracking-[-0.54px] text-[#17211b]">{value}</p>
      ) : (
        <Skeleton className="h-[33px] w-[120px]" />
      )}
      <div className="flex min-w-0 items-center gap-[7px]">
        <DeltaPill value={change} />
        {context ? <p className="min-w-0 flex-1 truncate text-[10px] text-[#7c857f]">{context}</p> : null}
      </div>
    </Card>
  );
}

export function KpiCards({ data }: { data?: DashboardOverview }) {
  const kpis = data?.kpis;

  return (
    <div className="grid w-full grid-cols-1 gap-[12px] sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        label="Gross merchandise value"
        icon={Landmark}
        iconColor="#167D35"
        iconBg="#eaf6ed"
        value={kpis ? formatNaira(kpis.gmv.value) : undefined}
        change={kpis?.gmv.change_pct}
        context={kpis ? `vs. ${formatNaira(kpis.gmv.previous)} last period` : undefined}
      />
      <KpiCard
        label="Commission revenue"
        icon={BadgeDollarSign}
        iconColor="#3973A8"
        iconBg="#eef5fb"
        value={kpis ? formatNaira(kpis.commission.value) : undefined}
        change={kpis?.commission.change_pct}
        context={
          kpis
            ? kpis.commission.take_rate_pct != null
              ? `${formatPct(kpis.commission.take_rate_pct)} effective take rate`
              : `vs. ${formatNaira(kpis.commission.previous)} last period`
            : undefined
        }
      />
      <KpiCard
        label="Completed errands"
        icon={CircleCheckBig}
        iconColor="#735CA8"
        iconBg="#f3f0fa"
        value={kpis ? formatCount(kpis.completed_errands.value) : undefined}
        change={kpis?.completed_errands.change_pct}
        context={
          kpis
            ? kpis.completed_errands.completion_rate_pct != null
              ? `${formatPct(kpis.completed_errands.completion_rate_pct)} completion rate`
              : 'No closed errands yet'
            : undefined
        }
      />
      <KpiCard
        label="Active users"
        icon={UsersRound}
        iconColor="#B06D12"
        iconBg="#fff5e5"
        value={kpis ? formatCount(kpis.active_users.value) : undefined}
        change={kpis?.active_users.change_pct}
        context={
          kpis
            ? `${formatCount(kpis.active_users.requesters)} requesters · ${formatCount(kpis.active_users.runners)} runners`
            : undefined
        }
      />
    </div>
  );
}
