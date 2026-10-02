import type { ComponentType } from 'react';
import { ArrowUpRight, BadgeCheck, MessageSquareWarning, WalletCards, type LucideProps } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useAdminNavigate } from '@/context/AdminNavigationContext';
import { canAccessPage, type PageKey } from '@/lib/adminNavigation';
import type { DashboardOverview, OverviewQueueItem } from '@/types/api';
import { formatNaira, formatCount, shortAge } from '../format';
import { Card, Dot, Skeleton } from './primitives';

type QueueCardProps = {
  page: PageKey;
  icon: ComponentType<LucideProps>;
  accent: string;
  accentBg: string;
  title: string;
  subtitle?: string;
  count?: number;
  items?: Array<{ id: number; title: string; subtitle: string; waitingSince: string | null }>;
  actionLabel: string;
  emptyText: string;
};

function QueueCard({ page, icon: Icon, accent, accentBg, title, subtitle, count, items, actionLabel, emptyText }: QueueCardProps) {
  const navigate = useAdminNavigate();

  return (
    <Card className="flex min-w-0 flex-col gap-[12px] p-[15px] md:h-[252px]">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-[4px]">
          <div className="flex items-center gap-[7px]">
            <span className="flex size-[26px] flex-shrink-0 items-center justify-center rounded-[6px]" style={{ backgroundColor: accentBg }}>
              <Icon className="size-[14px]" strokeWidth={1.8} color={accent} />
            </span>
            <p className="truncate text-[12px] font-semibold text-[#17211b]">{title}</p>
          </div>
          {subtitle != null ? (
            <p className="truncate text-[10px] text-[#7c857f]">{subtitle}</p>
          ) : (
            <Skeleton className="h-[12px] w-[110px]" />
          )}
        </div>
        <p className="text-[22px] font-bold leading-none" style={{ color: accent }}>
          {count != null ? formatCount(count) : '—'}
        </p>
      </div>

      <div className="flex flex-1 flex-col gap-[7px]">
        {items == null ? (
          <>
            <Skeleton className="h-[44px] w-full" />
            <Skeleton className="h-[44px] w-full" />
          </>
        ) : items.length === 0 ? (
          <div className="flex flex-1 items-center justify-center rounded-[8px] bg-[#f8faf8] p-[9px] text-center text-[11px] text-[#7c857f]">
            {emptyText}
          </div>
        ) : (
          items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => navigate(page, { openId: item.id })}
              className="flex w-full items-center gap-[8px] rounded-[8px] bg-[#f8faf8] p-[9px] text-left transition-colors hover:bg-[#eef3ef]"
            >
              <Dot color={accent} />
              <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
                <span className="truncate text-[11px] font-semibold text-[#17211b]">{item.title}</span>
                <span className="truncate text-[10px] text-[#7c857f]">{item.subtitle}</span>
              </span>
              <span className="flex-shrink-0 text-[10px] font-medium" style={{ color: accent }}>
                {shortAge(item.waitingSince)}
              </span>
            </button>
          ))
        )}
      </div>

      <button
        type="button"
        onClick={() => navigate(page)}
        className="flex items-center gap-[4px] self-start text-[11px] font-semibold text-[#167d35] hover:underline"
      >
        {actionLabel}
        <ArrowUpRight className="size-[13px]" strokeWidth={1.8} />
      </button>
    </Card>
  );
}

function toItems(items: OverviewQueueItem[] | undefined, subtitle: (item: OverviewQueueItem) => string) {
  return items?.map((item) => ({
    id: item.id,
    title: item.title,
    subtitle: subtitle(item),
    waitingSince: item.waiting_since,
  }));
}

export function QueueCards({ data }: { data?: DashboardOverview }) {
  const { user } = useAuth();
  const queues = data?.queues;

  return (
    <div className="grid w-full grid-cols-1 gap-[12px] md:grid-cols-3">
      {canAccessPage(user, 'admin2-verifications') ? (
        <QueueCard
          page="admin2-verifications"
          icon={BadgeCheck}
          accent="#b06d12"
          accentBg="#fff5e5"
          title="Runner KYC backlog"
          subtitle={
            queues
              ? queues.kyc.over_24h > 0
                ? `${formatCount(queues.kyc.over_24h)} waiting over 24 hours`
                : 'None waiting over 24 hours'
              : undefined
          }
          count={queues?.kyc.count}
          items={toItems(queues?.kyc.items, (item) => item.subtitle ?? 'Documents review')}
          actionLabel="Review KYC"
          emptyText="No verifications waiting"
        />
      ) : null}
      {canAccessPage(user, 'admin2-disputes') ? (
        <QueueCard
          page="admin2-disputes"
          icon={MessageSquareWarning}
          accent="#b84545"
          accentBg="#fff0f0"
          title="Open disputes"
          subtitle={queues ? `${formatNaira(queues.disputes.held_in_escrow)} held in escrow` : undefined}
          count={queues?.disputes.count}
          items={toItems(queues?.disputes.items, (item) => item.subtitle ?? 'Dispute')}
          actionLabel="Resolve disputes"
          emptyText="No open disputes"
        />
      ) : null}
      {canAccessPage(user, 'admin2-withdrawals') ? (
        <QueueCard
          page="admin2-withdrawals"
          icon={WalletCards}
          accent="#3973a8"
          accentBg="#eef5fb"
          title="Pending withdrawals"
          subtitle={queues ? `${formatNaira(queues.withdrawals.amount)} awaiting approval` : undefined}
          count={queues?.withdrawals.count}
          items={toItems(queues?.withdrawals.items, (item) =>
            [formatNaira(item.amount ?? 0), item.bank_name].filter(Boolean).join(' · '),
          )}
          actionLabel="Approve payouts"
          emptyText="No payouts awaiting approval"
        />
      ) : null}
    </div>
  );
}
