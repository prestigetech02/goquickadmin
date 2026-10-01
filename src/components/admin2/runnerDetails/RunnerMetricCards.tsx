import { Banknote, Clock3, PackageCheck, Star } from 'lucide-react';
import type { AdminRunnerProfile } from '@/types/api';
import { formatCompactNaira, formatCount, formatNaira, formatSignedPct } from '../format';
import { durationLabel } from '../errand/errandPresentation';
import { MetricCard } from '../userDetails/UserMetricCards';

function monthName(offset: number): string {
  const date = new Date();
  date.setDate(1);
  date.setMonth(date.getMonth() + offset);
  return date.toLocaleDateString('en-GB', { month: 'long', timeZone: 'Africa/Lagos' });
}

export function RunnerMetricCards({ profile }: { profile: AdminRunnerProfile }) {
  const { metrics, ratings } = profile;
  const completion = metrics.completion_pct != null ? ` · ${Number(metrics.completion_pct.toFixed(1))}% completion` : '';
  const previousMonth = monthName(-1);
  const earningsSub = metrics.earnings_change_pct != null
    ? `${formatSignedPct(metrics.earnings_change_pct)} vs same point in ${previousMonth}`
    : metrics.previous_month_earnings > 0
      ? `${formatNaira(metrics.previous_month_earnings)} by this point in ${previousMonth}`
      : `No ${previousMonth} earnings to compare`;

  return (
    <div className="grid w-full grid-cols-2 gap-[12px] xl:grid-cols-4">
      <MetricCard
        label="Completed errands"
        value={formatCount(metrics.errands_completed)}
        sub={`${formatCount(metrics.errands_total)} total${completion}`}
        icon={PackageCheck}
        iconBg="#eaf6ed"
        iconColor="#167d35"
      />
      <MetricCard
        label="Average rating"
        value={ratings.average != null ? ratings.average.toFixed(2) : '—'}
        sub={ratings.count > 0
          ? `${formatCount(ratings.count)} ${ratings.count === 1 ? 'rating' : 'ratings'}${ratings.top_percent != null ? ` · Top ${ratings.top_percent}%` : ''}`
          : 'No ratings yet'}
        icon={Star}
        iconBg="#fff5e5"
        iconColor="#b06d12"
      />
      <MetricCard
        label={`${monthName(0)} earnings`}
        value={formatCompactNaira(metrics.month_earnings)}
        sub={earningsSub}
        icon={Banknote}
        iconBg="#eef5fb"
        iconColor="#2c73b9"
      />
      <MetricCard
        label="Median completion time"
        value={metrics.median_completion_min != null ? durationLabel(metrics.median_completion_min) : '—'}
        sub={metrics.completion_sample > 0
          ? `Accept to done · last ${metrics.completion_sample} ${metrics.completion_sample === 1 ? 'errand' : 'errands'}`
          : 'No completed errands yet'}
        icon={Clock3}
        iconBg="#f3f0fa"
        iconColor="#735ca8"
      />
    </div>
  );
}
