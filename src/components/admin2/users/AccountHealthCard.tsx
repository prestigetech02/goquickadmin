import type { ComponentType } from 'react';
import { BadgeCheck, ShieldAlert, ShieldCheck, UserMinus, type LucideProps } from 'lucide-react';
import type { UsersSummary } from '@/types/api';
import { formatCount } from '../format';
import { Card, Skeleton } from '../overview/primitives';

function HealthItem({
  icon: Icon,
  color,
  bg,
  label,
  subtitle,
  value,
}: {
  icon: ComponentType<LucideProps>;
  color: string;
  bg: string;
  label: string;
  subtitle: string;
  value?: string;
}) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-[10px]">
      <span className="flex size-[32px] flex-shrink-0 items-center justify-center rounded-[8px]" style={{ backgroundColor: bg }}>
        <Icon className="size-[16px]" strokeWidth={1.8} color={color} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[10px] text-[#7c857f]">{label}</p>
        <p className="truncate text-[10px] font-medium text-[#45514a]">{subtitle}</p>
      </div>
      {value != null ? (
        <p className="flex-shrink-0 text-[18px] font-bold text-[#17211b]">{value}</p>
      ) : (
        <Skeleton className="h-[22px] w-[36px]" />
      )}
    </div>
  );
}

export function AccountHealthCard({ summary }: { summary?: UsersSummary }) {
  const health = summary?.health;

  return (
    <Card className="flex w-full flex-col gap-[18px] p-[16px] lg:flex-row lg:items-center">
      <div className="flex items-center gap-[18px]">
        <div className="w-full lg:w-[190px]">
          <div className="flex items-center gap-[7px]">
            <ShieldCheck className="size-[17px] text-[#167d35]" strokeWidth={1.8} />
            <p className="text-[12px] font-bold text-[#17211b]">Account health</p>
          </div>
          <p className="mt-[4px] text-[10px] leading-[1.4] text-[#7c857f]">Operational signals that may need administrator attention.</p>
        </div>
        <span className="hidden h-[54px] w-px flex-shrink-0 bg-[#e2e8e3] lg:block" />
      </div>
      <div className="grid flex-1 grid-cols-1 gap-[14px] sm:grid-cols-3 sm:gap-[18px]">
        <HealthItem
          icon={BadgeCheck}
          color="#B06D12"
          bg="#fff5e5"
          label="Verification attention"
          subtitle={health ? `${formatCount(health.kyc_over_24h)} waiting over 24 hours` : 'Pending runner KYC'}
          value={health ? formatCount(health.kyc_pending) : undefined}
        />
        <HealthItem
          icon={ShieldAlert}
          color="#B84545"
          bg="#fdeded"
          label="Risk review"
          subtitle="Users in open disputes"
          value={health ? formatCount(health.users_in_disputes) : undefined}
        />
        <HealthItem
          icon={UserMinus}
          color="#3477B8"
          bg="#eef5fb"
          label="Dormant accounts"
          subtitle={`No activity in ${health?.dormant_window_days ?? 60} days`}
          value={health ? formatCount(health.dormant) : undefined}
        />
      </div>
    </Card>
  );
}
