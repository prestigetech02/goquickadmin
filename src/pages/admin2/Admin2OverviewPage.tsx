import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { AlertCircle, Plus, RefreshCw } from 'lucide-react';
import { fetchDashboardOverview } from '@/api/adminDashboardApi';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useAdmin2DateRange } from '@/context/Admin2DateRangeContext';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import { canAccessPage, getPagePath } from '@/lib/adminNavigation';
import { queryKeys } from '@/lib/queryKeys';
import { adminDisplayName } from '@/lib/utils';
import { KpiCards } from '@/components/admin2/overview/KpiCards';
import { ErrandVolumeCard } from '@/components/admin2/overview/ErrandVolumeCard';
import { LiveStatusCard } from '@/components/admin2/overview/LiveStatusCard';
import { QueueCards } from '@/components/admin2/overview/QueueCards';
import { RecentErrandsCard } from '@/components/admin2/overview/RecentErrandsCard';
import { TopRunnersCard } from '@/components/admin2/overview/TopRunnersCard';

function greeting(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function Admin2OverviewPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { range } = useAdmin2DateRange();
  const firstName = user?.first_name?.trim() || adminDisplayName(user).split(' ')[0];

  const params = { start_date: range.start, end_date: range.end };
  const overviewQuery = useQuery({
    queryKey: queryKeys.dashboard.overview(params),
    queryFn: () => fetchDashboardOverview(params),
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  });
  const data = overviewQuery.data;

  return (
    <div className="flex w-full flex-col gap-[20px]">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-[6px]">
          <h1 className="text-[25px] font-bold leading-normal tracking-[-0.5px] text-[#17211b]">
            {greeting(new Date().getHours())}, {firstName}
          </h1>
          <p className="text-[13px] text-[#6b6f66]">Here’s what needs your attention across GoQuick today.</p>
        </div>
        {canAccessPage(user, 'admin2-notifications') ? (
          <button
            type="button"
            onClick={() => navigate(`${getPagePath('admin2-notifications')}?compose=1`)}
            className="flex flex-shrink-0 items-center gap-[8px] rounded-[8px] bg-[#167d35] px-[14px] py-[10px] text-[12px] font-semibold text-white transition-colors hover:bg-[#126a2c]"
          >
            <Plus className="size-[15px]" strokeWidth={2} />
            Send notification
          </button>
        ) : null}
      </div>

      {overviewQuery.isError ? (
        <div className="flex items-center justify-between gap-3 rounded-[12px] border border-[#f1d4d4] bg-[#fff0f0] px-[16px] py-[12px] text-[12px] text-[#b84545]">
          <span className="flex items-center gap-2">
            <AlertCircle className="size-4" />
            {getApiErrorMessage(overviewQuery.error, 'Could not load the overview.')}
          </span>
          <button
            type="button"
            onClick={() => void overviewQuery.refetch()}
            className="flex items-center gap-1 font-semibold hover:underline"
          >
            <RefreshCw className="size-3.5" />
            Retry
          </button>
        </div>
      ) : null}

      <div className={`flex flex-col gap-[20px] transition-opacity ${overviewQuery.isPlaceholderData ? 'opacity-70' : ''}`}>
        <KpiCards data={data} />

        <div className="flex w-full flex-col gap-[12px] xl:flex-row xl:items-start">
          <ErrandVolumeCard data={data} />
          <LiveStatusCard data={data} />
        </div>

        <QueueCards data={data} />

        <div className="flex w-full flex-col gap-[12px] xl:flex-row xl:items-stretch">
          {canAccessPage(user, 'admin2-errands') ? <RecentErrandsCard /> : null}
          <TopRunnersCard data={data} />
        </div>
      </div>
    </div>
  );
}
