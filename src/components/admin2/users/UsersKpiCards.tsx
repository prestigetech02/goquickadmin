import type { ComponentType } from 'react';
import { UserCheck, UserPlus, Users, UserX, type LucideProps } from 'lucide-react';
import { useAdmin2DateRange } from '@/context/Admin2DateRangeContext';
import type { UsersSummary } from '@/types/api';
import { formatCount, formatPct, formatSignedPct } from '../format';
import { Card, Skeleton } from '../overview/primitives';

const PERIOD_NOUNS: Record<string, string> = {
  this_week: 'this week',
  this_month: 'this month',
  last_7: 'last 7 days',
  last_30: 'last 30 days',
  last_month: 'last month',
};

type Pill = { label: string; tone: 'green' | 'red' } | null;

function KpiCard({
  label,
  icon: Icon,
  iconColor,
  iconBg,
  value,
  pill,
  context,
}: {
  label: string;
  icon: ComponentType<LucideProps>;
  iconColor: string;
  iconBg: string;
  value?: number;
  pill?: Pill;
  context?: string;
}) {
  return (
    <Card className="flex h-[132px] min-w-0 flex-col gap-[10px] p-[16px]">
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 flex-1 truncate text-[11px] font-medium text-[#45514a]">{label}</p>
        <span className="flex size-[30px] flex-shrink-0 items-center justify-center rounded-[8px]" style={{ backgroundColor: iconBg }}>
          <Icon className="size-[15px]" strokeWidth={1.8} color={iconColor} />
        </span>
      </div>
      {value != null ? (
        <p className="truncate text-[27px] font-bold leading-normal tracking-[-0.54px] text-[#17211b]">{formatCount(value)}</p>
      ) : (
        <Skeleton className="h-[33px] w-[110px]" />
      )}
      <div className="flex min-w-0 items-center gap-[7px]">
        {pill ? (
          <span
            className={`flex-shrink-0 rounded-full px-[6px] py-[3px] text-[10px] font-bold leading-none ${
              pill.tone === 'red' ? 'bg-[#fdeded] text-[#b84545]' : 'bg-[#eaf6ed] text-[#167d35]'
            }`}
          >
            {pill.label}
          </span>
        ) : null}
        {context ? <p className="min-w-0 flex-1 truncate text-[10px] text-[#7c857f]">{context}</p> : null}
      </div>
    </Card>
  );
}

export function UsersKpiCards({ summary }: { summary?: UsersSummary }) {
  const { range } = useAdmin2DateRange();
  const kpis = summary?.kpis;
  const periodNoun = PERIOD_NOUNS[range.preset] ?? 'this period';

  return (
    <div className="grid w-full grid-cols-1 gap-[12px] sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        label="Total users"
        icon={Users}
        iconColor="#167D35"
        iconBg="#eaf6ed"
        value={kpis?.total.value}
        pill={kpis?.total.growth_pct != null ? { label: formatSignedPct(kpis.total.growth_pct), tone: 'green' } : null}
        context={kpis ? `${formatCount(kpis.total.requesters)} requesters · ${formatCount(kpis.total.runners)} runners` : undefined}
      />
      <KpiCard
        label="Active users"
        icon={UserCheck}
        iconColor="#3477B8"
        iconBg="#eef5fb"
        value={kpis?.active.value}
        pill={kpis?.active.share_pct != null ? { label: formatPct(kpis.active.share_pct), tone: 'green' } : null}
        context={kpis ? `Active in the last ${kpis.active.window_days} days` : undefined}
      />
      <KpiCard
        label="Suspended users"
        icon={UserX}
        iconColor="#B84545"
        iconBg="#fdeded"
        value={kpis?.suspended.value}
        pill={kpis?.suspended.change_pct != null ? { label: formatSignedPct(kpis.suspended.change_pct), tone: 'red' } : null}
        context={kpis ? `${formatCount(kpis.suspended.in_range)} suspended ${periodNoun}` : undefined}
      />
      <KpiCard
        label={`New ${periodNoun}`}
        icon={UserPlus}
        iconColor="#B06D12"
        iconBg="#fff5e5"
        value={kpis?.new.value}
        pill={
          kpis?.new.change_pct != null
            ? { label: formatSignedPct(kpis.new.change_pct), tone: kpis.new.change_pct < 0 ? 'red' : 'green' }
            : null
        }
        context={kpis ? `${formatCount(kpis.new.requesters)} requesters · ${formatCount(kpis.new.runners)} runners` : undefined}
      />
    </div>
  );
}
