import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchAdminUserWallet } from '@/api/adminWalletApi';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import { queryKeys } from '@/lib/queryKeys';
import type { AdminUserProfile, WalletTransactionListItem } from '@/types/api';
import { formatNaira } from '../format';
import { Card, Skeleton } from '../overview/primitives';
import { SectionHeader } from '../errand/parts';
import { walletMethod, whenLabel } from './presentation';

const COLUMNS = 'grid grid-cols-[minmax(0,1fr)_104px_82px_98px] items-center gap-[10px] px-[12px]';

function activityLabel(tx: WalletTransactionListItem): string {
  const base = tx.description?.trim() || walletMethod(tx.category);
  return tx.errand?.title ? `${base} · ${tx.errand.title}` : base;
}

function amountColor(tx: WalletTransactionListItem): string {
  if (tx.status === 'failed' || tx.status === 'reversed') return '#7c857f';
  return tx.type === 'credit' ? '#167d35' : '#17211b';
}

export function WalletActivityCard({ profile, ledgerHref }: { profile: AdminUserProfile; ledgerHref: string | null }) {
  const userId = profile.user.id;
  const walletQuery = useQuery({
    queryKey: queryKeys.users.recentWallet(userId),
    queryFn: () => fetchAdminUserWallet(userId, { per_page: 5 }),
  });
  const rows = walletQuery.data?.transactions.data ?? [];
  const pending = profile.metrics.pending_withdrawals;
  const subtitle = [
    profile.metrics.wallet_balance != null ? `Balance ${formatNaira(profile.metrics.wallet_balance)}` : null,
    pending.count > 0 ? `${pending.count} pending ${pending.count === 1 ? 'withdrawal' : 'withdrawals'}` : 'No pending withdrawals',
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Card className="flex w-full flex-col overflow-hidden">
      <div className="p-[16px]">
        <SectionHeader
          title="Payments & wallet activity"
          subtitle={subtitle}
          action={ledgerHref ? (
            <Link to={ledgerHref} className="flex-shrink-0 whitespace-nowrap text-[11px] font-semibold text-[#167d35] hover:underline">
              Open transactions
            </Link>
          ) : null}
        />
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-[480px]">
          <div className={`${COLUMNS} h-[38px] border-b border-[#e2e8e3] bg-[#f8faf8] text-[9px] font-semibold uppercase tracking-[0.27px] text-[#7c857f]`}>
            <span>Activity</span>
            <span>Method</span>
            <span>Amount</span>
            <span>Time</span>
          </div>
          {walletQuery.isLoading ? (
            <div className="space-y-2 p-[12px]">
              <Skeleton className="h-[24px] w-full" />
              <Skeleton className="h-[24px] w-full" />
            </div>
          ) : null}
          {walletQuery.isError ? (
            <p className="px-[12px] py-[14px] text-[11px] text-[#b84545]">{getApiErrorMessage(walletQuery.error, 'Could not load wallet activity.')}</p>
          ) : null}
          {walletQuery.isSuccess && rows.length === 0 ? (
            <p className="px-[12px] py-[18px] text-center text-[11px] text-[#7c857f]">No wallet activity yet.</p>
          ) : null}
          {rows.map((tx) => (
            <div key={tx.id} className={`${COLUMNS} border-b border-[#e2e8e3] py-[12px] text-[10px] last:border-b-0`}>
              <span className="truncate font-semibold text-[#45514a]" title={activityLabel(tx)}>
                {activityLabel(tx)}
              </span>
              <span className="truncate text-[#7c857f]">{walletMethod(tx.category)}</span>
              <span className="truncate" style={{ color: amountColor(tx) }}>
                {tx.type === 'credit' ? '+' : '−'}
                {formatNaira(tx.amount)}
                {tx.status !== 'completed' ? <span className="ml-1 text-[9px] text-[#7c857f]">({tx.status})</span> : null}
              </span>
              <span className="truncate text-[#7c857f]">{whenLabel(tx.created_at)}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
