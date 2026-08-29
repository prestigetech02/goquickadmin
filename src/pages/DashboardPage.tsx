import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  AlertTriangle,
  Bike,
  CheckCircle2,
  Clock,
  CreditCard,
  Package,
  RefreshCw,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import { fetchAdminErrands } from '@/api/adminErrandsApi';
import { fetchDashboardPerformance, fetchDashboardStats } from '@/api/adminDashboardApi';
import { fetchAdminRunners } from '@/api/adminRunnersApi';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import { queryKeys } from '@/lib/queryKeys';
import {
  formatBudgetRange,
  formatCurrency,
  formatErrandCode,
  formatNumber,
  titleCase,
} from '@/lib/utils';
import type { PerformancePeriod, PerformanceTab } from '@/types/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { AreaChart } from '@/components/ui/AreaChart';
import { DonutChart } from '@/components/ui/DonutChart';
import { BarChart } from '@/components/ui/BarChart';
import { PersonAvatar } from '@/components/ui/PersonAvatar';
import { useAdminOpsRealtimeStatus } from '@/context/AdminOpsRealtimeContext';

const PERFORMANCE_TABS: { key: PerformanceTab; label: string }[] = [
  { key: 'revenue', label: 'Revenue' },
  { key: 'errand_volume', label: 'Errand volume' },
  { key: 'runner_activity', label: 'Runner activity' },
  { key: 'user_growth', label: 'User growth' },
];

const PERIOD_OPTIONS: { value: PerformancePeriod; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'this_week', label: 'This week' },
  { value: 'this_month', label: 'This month' },
  { value: 'last_3_months', label: 'Last 3 months' },
  { value: 'all_time', label: 'All time' },
];

function formatChartLabel(date: string): string {
  const d = new Date(`${date}T00:00:00`);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString('en-NG', { month: 'short', day: 'numeric' });
}

function seriesToChartPoints(series: Array<{ date: string; value: number }>) {
  return series.map((point) => ({
    label: formatChartLabel(point.date),
    value: point.value,
  }));
}

function formatSummaryValue(tab: PerformanceTab, value: number): string {
  if (tab === 'revenue') return formatCurrency(value);
  return formatNumber(Math.round(value));
}

export function DashboardPage() {
  const { live } = useAdminOpsRealtimeStatus();
  const [performanceTab, setPerformanceTab] = useState<PerformanceTab>('revenue');
  const [performancePeriod, setPerformancePeriod] = useState<PerformancePeriod>('this_week');

  const statsQuery = useQuery({
    queryKey: queryKeys.dashboard.stats,
    queryFn: fetchDashboardStats,
  });

  const performanceParams = useMemo(
    () => ({ tab: performanceTab, period: performancePeriod }),
    [performanceTab, performancePeriod],
  );

  const performanceQuery = useQuery({
    queryKey: queryKeys.dashboard.performance(performanceParams),
    queryFn: () => fetchDashboardPerformance(performanceParams),
  });

  const recentErrandsQuery = useQuery({
    queryKey: queryKeys.errands.list({ per_page: 6, page: 1 }),
    queryFn: () => fetchAdminErrands({ per_page: 6, page: 1 }),
  });

  const topRunnersQuery = useQuery({
    queryKey: queryKeys.runners.list({ per_page: 5, page: 1 }),
    queryFn: () => fetchAdminRunners({ per_page: 5, page: 1 }),
  });

  const stats = statsQuery.data;
  const performance = performanceQuery.data;
  const recentErrands = recentErrandsQuery.data?.data ?? [];
  const topRunners = topRunnersQuery.data?.data ?? [];

  const errandStatusData = stats
    ? [
        { label: 'Completed', value: stats.errands.completed, color: '#10b981' },
        { label: 'In progress', value: stats.errands.in_progress, color: '#1a7a0a' },
        { label: 'Accepted', value: stats.errands.accepted, color: '#3b82f6' },
        { label: 'Pending', value: stats.errands.pending, color: '#f59e0b' },
        { label: 'Cancelled', value: stats.errands.cancelled, color: '#ef4444' },
      ].filter((slice) => slice.value > 0)
    : [];

  const chartPoints = performance ? seriesToChartPoints(performance.series) : [];

  const avgErrandValue =
    stats && stats.errands.total > 0 ? stats.metrics.total_revenue / stats.errands.total : 0;

  const isLoading = statsQuery.isPending && !stats;
  const statsError = statsQuery.isError
    ? getApiErrorMessage(statsQuery.error, 'Failed to load dashboard stats.')
    : null;

  async function refreshAll() {
    await Promise.all([
      statsQuery.refetch(),
      performanceQuery.refetch(),
      recentErrandsQuery.refetch(),
      topRunnersQuery.refetch(),
    ]);
  }

  const refreshing =
    statsQuery.isFetching ||
    performanceQuery.isFetching ||
    recentErrandsQuery.isFetching ||
    topRunnersQuery.isFetching;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Live overview from your GoQuick platform"
        action={
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                live
                  ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                  : 'bg-ink-50 text-ink-500 ring-1 ring-ink-200'
              }`}
              title={live ? 'Listening for live errand status updates' : 'Realtime disconnected'}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${live ? 'bg-emerald-500 animate-pulse' : 'bg-ink-400'}`}
              />
              {live ? 'Live' : 'Offline'}
            </span>
            <button
              type="button"
              onClick={() => void refreshAll()}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-ink-200 text-sm font-semibold text-ink-700 hover:bg-ink-50 disabled:opacity-60"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        }
      />

      {isLoading ? (
        <Card className="p-8 text-center">
          <p className="text-ink-400 text-sm">Loading dashboard…</p>
        </Card>
      ) : null}

      {statsError ? (
        <Card className="p-5 mb-6 border-error-200 bg-error-50">
          <div className="flex items-start gap-3 text-error-700">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p className="text-sm">{statsError}</p>
          </div>
        </Card>
      ) : null}

      {stats ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard
              label="Total Errands"
              value={formatNumber(stats.errands.total)}
              icon={<Package className="w-5 h-5" />}
              accent="brand"
            />
            <StatCard
              label="Active Runners"
              value={formatNumber(stats.metrics.active_runners)}
              icon={<Bike className="w-5 h-5" />}
              accent="success"
            />
            <StatCard
              label="Total Revenue"
              value={formatCurrency(stats.metrics.total_revenue)}
              icon={<CreditCard className="w-5 h-5" />}
              accent="warning"
            />
            <StatCard
              label="Open Disputes"
              value={formatNumber(stats.operations.open_disputes)}
              icon={<AlertTriangle className="w-5 h-5" />}
              accent="error"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            <Card className="lg:col-span-2">
              <CardHeader
                title="Platform performance"
                subtitle={
                  performance
                    ? `${titleCase(performanceTab.replace(/_/g, ' '))} · ${performance.start_date} to ${performance.end_date}`
                    : 'Trend over the selected period'
                }
              />
              <CardBody className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex flex-wrap gap-2">
                    {PERFORMANCE_TABS.map((tab) => (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setPerformanceTab(tab.key)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                          performanceTab === tab.key
                            ? 'bg-brand-600 text-white'
                            : 'bg-ink-100 text-ink-600 hover:bg-ink-200'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                  <select
                    value={performancePeriod}
                    onChange={(e) => setPerformancePeriod(e.target.value as PerformancePeriod)}
                    className="sm:ml-auto rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-700 bg-white"
                    aria-label="Performance period"
                  >
                    {PERIOD_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {performanceQuery.isPending ? (
                  <p className="text-ink-400 text-sm py-8 text-center">Loading chart…</p>
                ) : performanceQuery.isError ? (
                  <p className="text-error-600 text-sm py-8 text-center">
                    {getApiErrorMessage(performanceQuery.error, 'Failed to load performance data.')}
                  </p>
                ) : chartPoints.length === 0 ? (
                  <p className="text-ink-400 text-sm py-8 text-center">No data for this period.</p>
                ) : (
                  <>
                    {performance ? (
                      <div className="flex flex-wrap gap-4 text-sm text-ink-600">
                        <span>
                          <strong className="text-ink-900">Total:</strong>{' '}
                          {formatSummaryValue(performanceTab, performance.summary.total)}
                        </span>
                        <span>
                          <strong className="text-ink-900">Average:</strong>{' '}
                          {formatSummaryValue(performanceTab, performance.summary.average)}
                        </span>
                        <span>
                          <strong className="text-ink-900">Peak:</strong>{' '}
                          {formatSummaryValue(performanceTab, performance.summary.max)}
                        </span>
                      </div>
                    ) : null}
                    <AreaChart
                      data={chartPoints}
                      height={240}
                      gradientId="dashboard-performance-grad"
                      color={performanceTab === 'revenue' ? '#d97706' : '#1a7a0a'}
                    />
                  </>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Errand status" subtitle="Distribution by status" />
              <CardBody className="pt-3 pb-4">
                {errandStatusData.length === 0 ? (
                  <p className="text-ink-400 text-sm text-center py-8">No errands yet</p>
                ) : (
                  <DonutChart data={errandStatusData} size={150} />
                )}
              </CardBody>
            </Card>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <Card className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-success-50 text-success-600 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-ink-500">Completed today</p>
                <p className="text-xl font-bold text-ink-900">
                  {formatNumber(stats.metrics.completed_errands_today)}
                </p>
              </div>
            </Card>
            <Card className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-warning-50 text-warning-600 flex items-center justify-center">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-ink-500">Pending errands</p>
                <p className="text-xl font-bold text-ink-900">
                  {formatNumber(stats.metrics.pending_errands)}
                </p>
              </div>
            </Card>
            <Card className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-ink-500">Today&apos;s revenue</p>
                <p className="text-xl font-bold text-ink-900">
                  {formatCurrency(stats.metrics.today_revenue)}
                </p>
              </div>
            </Card>
          </div>

          {performanceTab === 'errand_volume' && chartPoints.length > 0 ? (
            <Card className="mb-6">
              <CardHeader title="Errand volume" subtitle="Daily count for selected period" />
              <CardBody>
                <BarChart data={chartPoints} height={220} color="#1a7a0a" />
              </CardBody>
            </Card>
          ) : null}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            <Card>
              <CardHeader title="Recent errands" subtitle="Latest delivery requests" />
              <CardBody className="space-y-3">
                {recentErrandsQuery.isPending ? (
                  <p className="text-ink-400 text-sm">Loading…</p>
                ) : recentErrands.length === 0 ? (
                  <p className="text-ink-400 text-sm">No errands yet</p>
                ) : (
                  recentErrands.map((errand) => (
                    <div
                      key={errand.id}
                      className="flex items-center justify-between py-2 border-b border-ink-100 last:border-0"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-ink-900">
                          {formatErrandCode(errand.id)}
                        </p>
                        <p className="text-xs text-ink-400 truncate">
                          {errand.title || errand.pickup_address || 'Untitled errand'}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-sm font-semibold text-ink-700">
                          {formatBudgetRange(errand.budget_min, errand.budget_max)}
                        </span>
                        <Badge status={errand.status} />
                      </div>
                    </div>
                  ))
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Recent runners" subtitle="Latest runner accounts" />
              <CardBody className="space-y-3">
                {topRunnersQuery.isPending ? (
                  <p className="text-ink-400 text-sm">Loading…</p>
                ) : topRunners.length === 0 ? (
                  <p className="text-ink-400 text-sm">No runners yet</p>
                ) : (
                  topRunners.map((runner, i) => (
                    <div
                      key={runner.id}
                      className="flex items-center gap-3 py-2 border-b border-ink-100 last:border-0"
                    >
                      <span className="w-6 h-6 rounded-full bg-ink-100 text-ink-600 text-xs font-bold flex items-center justify-center">
                        {i + 1}
                      </span>
                      <PersonAvatar name={runner.runner_name} src={runner.avatar_url} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-ink-900 truncate">
                          {runner.runner_name}
                        </p>
                        <p className="text-xs text-ink-400 capitalize">
                          {runner.verification} · {runner.rating}★
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-ink-700">
                          {formatCurrency(runner.total_earnings)}
                        </p>
                        <p className="text-xs text-ink-400">earnings</p>
                      </div>
                    </div>
                  ))
                )}
              </CardBody>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader title="Operations queue" subtitle="Items needing admin attention" />
              <CardBody className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-ink-100">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-warning-50 text-warning-600 flex items-center justify-center">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-ink-900">Pending KYC reviews</p>
                      <p className="text-xs text-ink-400">Runner verification queue</p>
                    </div>
                  </div>
                  <span className="text-lg font-bold text-ink-900">
                    {formatNumber(stats.operations.pending_runner_verifications)}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-ink-100">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-error-50 text-error-600 flex items-center justify-center">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-ink-900">Open disputes</p>
                      <p className="text-xs text-ink-400">Awaiting resolution</p>
                    </div>
                  </div>
                  <span className="text-lg font-bold text-ink-900">
                    {formatNumber(stats.operations.open_disputes)}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center">
                      <Wallet className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-ink-900">Pending withdrawals</p>
                      <p className="text-xs text-ink-400">Finance review queue</p>
                    </div>
                  </div>
                  <span className="text-lg font-bold text-ink-900">
                    {formatNumber(stats.operations.pending_withdrawals)}
                  </span>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Platform snapshot" subtitle="Users and wallet totals" />
              <CardBody className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-ink-100">
                  <p className="text-sm text-ink-600">Total users</p>
                  <span className="text-sm font-semibold text-ink-900">
                    {formatNumber(stats.users.total)}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-ink-100">
                  <p className="text-sm text-ink-600">Buyers · Runners · Admins</p>
                  <span className="text-sm font-semibold text-ink-900">
                    {formatNumber(stats.users.buyers)} · {formatNumber(stats.users.runners)} ·{' '}
                    {formatNumber(stats.users.admins)}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-ink-100">
                  <p className="text-sm text-ink-600">Ongoing errands</p>
                  <span className="text-sm font-semibold text-ink-900">
                    {formatNumber(stats.metrics.ongoing_errands)}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-ink-100">
                  <p className="text-sm text-ink-600">Cancelled errands</p>
                  <span className="text-sm font-semibold text-ink-900">
                    {formatNumber(stats.metrics.cancelled_errands)}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <p className="text-sm text-ink-600">Total wallet balance</p>
                  <span className="text-sm font-semibold text-ink-900">
                    {formatCurrency(stats.finance.wallet_balance_total)}
                  </span>
                </div>
                <p className="text-xs text-ink-400 pt-1">
                  Avg. revenue per errand (all time): {formatCurrency(avgErrandValue)}
                </p>
              </CardBody>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}
