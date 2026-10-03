import { Link } from 'react-router-dom';
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { canAccessPage, getPagePath } from '@/lib/adminNavigation';
import type { AdminUser } from '@/types';
import type { SystemHealthAlert, SystemHealthIssue } from '@/types/api';
import { Chip } from '../errand/parts';
import { Card, CardTitle, Skeleton } from '../overview/primitives';
import { alertTarget, issueTime, statusTone } from './healthPresentation';

function SeverityIcon({ severity }: { severity: string }) {
  const tone = statusTone(severity);
  const Icon = severity === 'error' ? AlertCircle : severity === 'warning' ? AlertTriangle : Info;
  return (
    <span className="flex size-[28px] flex-shrink-0 items-center justify-center rounded-[8px]" style={{ backgroundColor: tone.bg }}>
      <Icon className="size-[14px]" strokeWidth={1.9} color={tone.color} />
    </span>
  );
}

function AllClear({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-[8px] rounded-[10px] bg-[#f3faf5] px-[12px] py-[11px] text-[11px] font-medium text-[#0d5e27]">
      <CheckCircle2 className="size-[14px]" /> {text}
    </div>
  );
}

export function HealthAlertsCard({
  alerts,
  issues,
  loading,
  user,
}: {
  alerts: SystemHealthAlert[] | undefined;
  issues: SystemHealthIssue[] | undefined;
  loading: boolean;
  user: AdminUser | null;
}) {
  return (
    <div className="grid w-full grid-cols-1 gap-[12px] xl:grid-cols-2">
      <Card className="flex min-w-0 flex-col gap-[12px] p-[16px]">
        <CardTitle title="Operational alerts" subtitle="Backlogs and setup gaps that need an admin" />
        {loading && !alerts ? <Skeleton className="h-[120px] w-full" /> : null}
        {alerts && alerts.length === 0 ? <AllClear text="No operational backlog right now." /> : null}
        {alerts?.map((alert) => {
          const target = alertTarget(alert.title);
          return (
            <div key={`${alert.area}-${alert.title}`} className="flex items-start gap-[10px] rounded-[10px] border border-[#e2e8e3] p-[12px]">
              <SeverityIcon severity={alert.severity} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-[6px]">
                  <p className="text-[12px] font-semibold text-[#17211b]">{alert.title}</p>
                  <Chip tone={{ bg: '#f1f4f2', color: '#45514a' }} label={alert.area} />
                </div>
                <p className="mt-[3px] text-[11px] leading-[1.5] text-[#45514a]">{alert.message}</p>
              </div>
              {target && canAccessPage(user, target.page) ? (
                <Link to={getPagePath(target.page)} className="flex-shrink-0 self-center text-[11px] font-semibold text-[#167d35] hover:underline">
                  {target.label}
                </Link>
              ) : alert.count != null ? (
                <span className="flex-shrink-0 self-center text-[16px] font-bold text-[#17211b]">{alert.count}</span>
              ) : null}
            </div>
          );
        })}
      </Card>

      <Card className="flex min-w-0 flex-col gap-[12px] p-[16px]">
        <CardTitle title="Recent application errors" subtitle="Summarised from the latest server log entries, not raw logs" />
        {loading && !issues ? <Skeleton className="h-[120px] w-full" /> : null}
        {issues && issues.length === 0 ? <AllClear text="No errors in the recent application log." /> : null}
        {issues && issues.length > 0 ? (
          <ol className="relative flex flex-col gap-[14px] border-l border-[#e2e8e3] pl-[16px]">
            {issues.map((issue) => {
              const tone = statusTone(issue.severity);
              return (
                <li key={issue.id} className="relative">
                  <span
                    className="absolute -left-[21px] top-[4px] size-[9px] rounded-full border-2 border-white"
                    style={{ backgroundColor: tone.color }}
                  />
                  <div className="flex flex-wrap items-center gap-[6px]">
                    <p className="text-[12px] font-semibold text-[#17211b]">{issue.title}</p>
                    <Chip tone={tone} label={issue.area} />
                    <span className="text-[10px] text-[#7c857f]">{issueTime(issue.occurred_at)}</span>
                  </div>
                  <p className="mt-[3px] text-[11px] leading-[1.5] text-[#45514a]">{issue.message}</p>
                </li>
              );
            })}
          </ol>
        ) : null}
      </Card>
    </div>
  );
}
