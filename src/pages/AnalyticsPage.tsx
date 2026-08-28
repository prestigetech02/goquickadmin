import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, CreditCard, Package, RefreshCw, Users, Wallet } from 'lucide-react';
import { fetchDashboardPerformance, fetchDashboardStats } from '@/api/adminDashboardApi';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { AreaChart } from '@/components/ui/AreaChart';
import { BarChart } from '@/components/ui/BarChart';
import { LineChart } from '@/components/ui/LineChart';
import { DonutChart } from '@/components/ui/DonutChart';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import { queryKeys } from '@/lib/queryKeys';
import { formatCurrency, formatNumber, titleCase } from '@/lib/utils';
import type { PerformancePeriod, PerformanceTab } from '@/types/api';

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
  { value: 'custom', label: 'Custom range' },
  { value: 'all_time', label: 'All time' },
];

function formatChartLabel(date: string): string {
  const d = new Date(`${date}T00:00:00`);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString('en-NG', { month: 'short', day: 'numeric' });
}

function formatLongDate(date: string): string {
  const d = new Date(`${date}T00:00:00`);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString('en-NG', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
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

function chartForTab(tab: PerformanceTab, data: Array<{ label: string; value: number }>) {
  if (tab === 'revenue') {
    return <LineChart data={data} height={280} color="#10b981" />;
  }
  if (tab === 'runner_activity') {
    return <BarChart data={data} height={280} color="#f59e0b" />;
  }
  return (
    <AreaChart
      data={data}
      height={280}
      color={tab === 'user_growth' ? '#0f766e' : '#1a7a0a'}
      gradientId={`analytics-${tab}`}
    />
  );
}

export function AnalyticsPage() {
  const [performanceTab, setPerformanceTab] = useState<PerformanceTab>('revenue');
  const [performancePeriod, setPerformancePeriod] = useState<PerformancePeriod>('this_week');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const statsQuery = useQuery({
    queryKey: queryKeys.dashboard.stats,
    queryFn: fetchDashboardStats,
  });

  const performanceParams = useMemo(() => {
    const params: {
      tab: PerformanceTab;
      period: PerformancePeriod;
      start_date?: string;
      end_date?: string;
    } = {
      tab: performanceTab,
      period: performancePeriod,
    };

    if (performancePeriod === 'custom') {
      if (customStartDate) params.start_date = customStartDate;
      if (customEndDate) params.end_date = customEndDate;
    }

    return params;
  }, [performanceTab, performancePeriod, customStartDate, customEndDate]);

  const performanceQuery = useQuery({
    queryKey: queryKeys.dashboard.performance(performanceParams),
    queryFn: () => fetchDashboardPerformance(performanceParams),
    enabled:
      performancePeriod !== 'custom' || (Boolean(customStartDate) && Boolean(customEndDate)),
  });

  const stats = statsQuery.data;
  const performance = performanceQuery.data;
  const chartPoints = performance ? seriesToChartPoints(performance.series) : [];
  const hasPerformanceData = Boolean(performance && performance.series.some((point) => point.value > 0));

  const errandStatusData = stats
    ? [
        { label: 'Completed', value: stats.errands.completed, color: '#10b981' },
        { label: 'In progress', value: stats.errands.in_progress, color: '#1a7a0a' },
        { label: 'Accepted', value: stats.errands.accepted, color: '#3b82f6' },
        { label: 'Pending', value: stats.errands.pending, color: '#f59e0b' },
        { label: 'Cancelled', value: stats.errands.cancelled, color: '#ef4444' },
      ].filter((slice) => slice.value > 0)
    : [];

  const completionRate = stats?.errands.total
    ? Math.round((stats.errands.completed / stats.errands.total) * 100)
    : 0;
  const avgErrandValue = stats?.errands.total ? stats.metrics.total_revenue / stats.errands.total : 0;
  const revenuePerUser = stats?.users.total ? stats.metrics.total_revenue / stats.users.total : 0;
  const errandsPerRunner = stats?.metrics.active_runners
    ? stats.errands.total / stats.metrics.active_runners
    : 0;
  const recentSeries = performance ? [...performance.series].slice(-8).reverse() : [];

  const isLoading = statsQuery.isPending && !stats;
  const statsError = statsQuery.isError
    ? getApiErrorMessage(statsQuery.error, 'Failed to load analytics stats.')
    : null;

  async function refreshAll() {
    await Promise.all([statsQuery.refetch(), performanceQuery.refetch()]);
  }

  const refreshing = statsQuery.isFetching || performanceQuery.isFetching;

  return (
    <div>
      <PageHeader
        title="Analytics"
        subtitle="Platform trends, growth signals, and live operational performance"
        action={
          <button
            type="button"
            onClick={() => void refreshAll()}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-ink-200 text-sm font-semibold text-ink-700 hover:bg-ink-50 disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        }
      />

      {isLoading ? (
        <Card className="p-8 text-center">
          <p className="text-ink-400 text-sm">Loading analytics…</p>
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
              label="Total Users"
              value={formatNumber(stats.users.total)}
              icon={<Users className="w-5 h-5" />}
              accent="brand"
            />
            <StatCard
              label="Total Errands"
              value={formatNumber(stats.errands.total)}
              icon={<Package className="w-5 h-5" />}
              accent="success"
            />
            <StatCard
              label="Total Revenue"
              value={formatCurrency(stats.metrics.total_revenue)}
              icon={<CreditCard className="w-5 h-5" />}
              accent="warning"
            />
            <StatCard
              label="Wallet Balance"
              value={formatCurrency(stats.finance.wallet_balance_total)}
              icon={<Wallet className="w-5 h-5" />}
              accent="error"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            <Card className="lg:col-span-2">
              <CardHeader
                title="Performance trends"
                subtitle={
                  performance
                    ? `${titleCase(performanceTab)} · ${performance.start_date} to ${performance.end_date}`
                    : 'Explore revenue, errands, runner activity, and user growth'
                }
              />
              <CardBody className="space-y-4">
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col xl:flex-row xl:items-center gap-3">
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
                      className="xl:ml-auto rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-700 bg-white"
                    >
                      {PERIOD_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {performancePeriod === 'custom' ? (
                    <div className="flex flex-col sm:flex-row gap-3">
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-700 bg-white"
                      />
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-700 bg-white"
                      />
                    </div>
                  ) : null}
                </div>

                {performanceQuery.isPending ? (
                  <p className="text-ink-400 text-sm py-8 text-center">Loading trend data…</p>
                ) : performanceQuery.isError ? (
                  <p className="text-error-600 text-sm py-8 text-center">
                    {getApiErrorMessage(performanceQuery.error, 'Failed to load performance data.')}
                  </p>
                ) : !hasPerformanceData ? (
                  <p className="text-ink-400 text-sm py-8 text-center">No analytics data for this selection.</p>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="rounded-xl bg-ink-50 p-4">
                        <p className="text-xs text-ink-500 mb-1">Total</p>
                        <p className="text-2xl font-bold text-ink-900">
                          {formatSummaryValue(performanceTab, performance!.summary.total)}
                        </p>
                      </div>
                      <div className="rounded-xl bg-ink-50 p-4">
                        <p className="text-xs text-ink-500 mb-1">Average</p>
                        <p className="text-2xl font-bold text-ink-900">
                          {formatSummaryValue(performanceTab, performance!.summary.average)}
                        </p>
                      </div>
                      <div className="rounded-xl bg-ink-50 p-4">
                        <p className="text-xs text-ink-500 mb-1">Peak</p>
                        <p className="text-2xl font-bold text-ink-900">
                          {formatSummaryValue(performanceTab, performance!.summary.max)}
                        </p>
                      </div>
                    </div>

                    {chartForTab(performanceTab, chartPoints)}
                  </>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Errand status mix" subtitle="Real-time distribution from dashboard stats" />
              <CardBody className="pt-2">
                {errandStatusData.length > 0 ? (
                  <DonutChart data={errandStatusData} size={220} />
                ) : (
                  <p className="text-sm text-ink-400 py-8 text-center">No errand status data yet.</p>
                )}
              </CardBody>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            <Card className="lg:col-span-2">
              <CardHeader title="Recent daily breakdown" subtitle="Most recent data points for the selected trend" />
              <CardBody>
                {recentSeries.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-ink-100">
                          <th className="text-left py-3 text-xs font-semibold uppercase tracking-wide text-ink-400">Date</th>
                          <th className="text-right py-3 text-xs font-semibold uppercase tracking-wide text-ink-400">Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentSeries.map((point) => (
                          <tr key={point.date} className="border-b border-ink-50">
                            <td className="py-3 text-sm text-ink-700">{formatLongDate(point.date)}</td>
                            <td className="py-3 text-sm text-ink-900 text-right font-semibold">
                              {formatSummaryValue(performanceTab, point.value)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-ink-400 py-8 text-center">No recent series data available.</p>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Key metrics" subtitle="Derived from live dashboard aggregates" />
              <CardBody>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
                  <MetricTile label="Completion rate" value={`${completionRate}%`} tone="brand" />
                  <MetricTile label="Average errand value" value={formatCurrency(avgErrandValue)} tone="warning" />
                  <MetricTile label="Revenue per user" value={formatCurrency(revenuePerUser)} tone="success" />
                  <MetricTile label="Errands per active runner" value={formatNumber(Math.round(errandsPerRunner))} tone="error" />
                  <MetricTile label="Pending KYC reviews" value={formatNumber(stats.operations.pending_runner_verifications)} tone="brand" />
                  <MetricTile label="Active runners" value={formatNumber(stats.metrics.active_runners)} tone="success" />
                </div>
              </CardBody>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}

function MetricTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'brand' | 'success' | 'warning' | 'error';
}) {
  const toneMap = {
    brand: 'bg-brand-50 text-brand-700',
    success: 'bg-success-50 text-success-700',
    warning: 'bg-warning-50 text-warning-700',
    error: 'bg-error-50 text-error-700',
  };

  return (
    <div className={`rounded-xl p-4 ${toneMap[tone]}`}>
      <p className="text-xs mb-1 opacity-80">{label}</p>
      <p className="text-2xl font-bold text-ink-900">{value}</p>
    </div>
  );
}
