import { type ReactNode } from 'react';
import { Card } from './Card';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';

export function StatCard({
  label,
  value,
  subValue,
  icon,
  trend,
  trendUp,
  accent = 'brand',
}: {
  label: string;
  value: string;
  subValue?: string;
  icon: ReactNode;
  trend?: string;
  trendUp?: boolean;
  accent?: 'brand' | 'success' | 'warning' | 'error';
}) {
  const accentMap: Record<string, string> = {
    brand: 'bg-brand-50 text-brand-600',
    success: 'bg-success-50 text-success-600',
    warning: 'bg-warning-50 text-warning-600',
    error: 'bg-error-50 text-error-600',
  };

  return (
    <Card className="p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-ink-500">{label}</p>
          <p className="text-2xl font-bold text-ink-900 mt-1">{value}</p>
          {subValue ? <p className="text-sm text-ink-500 mt-0.5">{subValue}</p> : null}
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              {trendUp ? (
                <ArrowUpRight className="w-4 h-4 text-success-600" />
              ) : (
                <ArrowDownRight className="w-4 h-4 text-error-600" />
              )}
              <span
                className={`text-xs font-semibold ${trendUp ? 'text-success-600' : 'text-error-600'}`}
              >
                {trend}
              </span>
              <span className="text-xs text-ink-400">vs last month</span>
            </div>
          )}
        </div>
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${accentMap[accent]}`}>
          {icon}
        </div>
      </div>
    </Card>
  );
}
