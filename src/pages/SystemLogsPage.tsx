import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Globe,
  RefreshCw,
  Server,
  ShieldAlert,
} from 'lucide-react';
import { fetchAdminSystemHealth } from '@/api/adminSystemHealthApi';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import { queryKeys } from '@/lib/queryKeys';
import { formatDateTime, titleCase } from '@/lib/utils';
import type {
  SystemHealthAlert,
  SystemHealthComponent,
  SystemHealthEndpoint,
  SystemHealthIssue,
  SystemHealthStatus,
} from '@/types/api';

function statusBadge(status: string) {
  const normalized = status.toLowerCase();
  if (['healthy', 'up', 'configured'].includes(normalized)) return 'completed';
  if (['degraded', 'warning', 'missing'].includes(normalized)) return 'pending';
  return 'error';
}

function overallTone(status: SystemHealthStatus) {
  switch (status) {
    case 'healthy':
      return {
        icon: <CheckCircle2 className="w-6 h-6 text-success-600" />,
        card: 'border-success-200 bg-success-50',
        title: 'All systems operational',
      };
    case 'degraded':
      return {
        icon: <AlertTriangle className="w-6 h-6 text-warning-600" />,
        card: 'border-warning-200 bg-warning-50',
        title: 'Needs attention',
      };
    default:
      return {
        icon: <ShieldAlert className="w-6 h-6 text-error-600" />,
        card: 'border-error-200 bg-error-50',
        title: 'Critical issue detected',
      };
  }
}

export function SystemLogsPage() {
  const healthQuery = useQuery({
    queryKey: queryKeys.systemHealth.all,
    queryFn: fetchAdminSystemHealth,
    refetchInterval: 60_000,
  });

  const health = healthQuery.data;
  const tone = health ? overallTone(health.status) : null;

  return (
    <div>
      <PageHeader
        title="System Health"
        subtitle="API uptime, integrations, and actionable platform alerts"
        action={
          <button
            type="button"
            onClick={() => healthQuery.refetch()}
            disabled={healthQuery.isFetching}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-ink-200 text-ink-700 text-sm font-medium hover:bg-ink-50 disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${healthQuery.isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        }
      />

      {healthQuery.isLoading ? (
        <Card className="p-8 text-center">
          <p className="text-sm text-ink-400">Checking platform health…</p>
        </Card>
      ) : null}

      {healthQuery.isError ? (
        <Card className="p-5 mb-6 border-error-200 bg-error-50">
          <div className="flex items-start gap-3 text-error-700">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p className="text-sm">{getApiErrorMessage(healthQuery.error, 'Failed to load system health.')}</p>
          </div>
        </Card>
      ) : null}

      {health && tone ? (
        <>
          <Card className={`mb-6 border ${tone.card}`}>
            <CardBody className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex items-start gap-3">
                {tone.icon}
                <div>
                  <p className="text-lg font-bold text-ink-900">{tone.title}</p>
                  <p className="text-sm text-ink-600 mt-1">{health.summary}</p>
                  <p className="text-xs text-ink-400 mt-2">
                    Last checked {formatDateTime(health.checked_at)}
                  </p>
                </div>
              </div>
              <div className="md:ml-auto">
                <Badge status={statusBadge(health.status)} label={titleCase(health.status)} />
              </div>
            </CardBody>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardHeader title="API" subtitle="Core application status" />
              <CardBody className="space-y-3 text-sm">
                <InfoRow label="Application" value={health.api.app_name} />
                <InfoRow label="Environment" value={titleCase(health.api.environment)} />
                <InfoRow label="Base URL" value={health.api.app_url} mono />
                <InfoRow label="Laravel" value={health.api.laravel_version} />
                <InfoRow label="PHP" value={health.api.php_version} />
                <InfoRow label="Debug mode" value={health.api.debug ? 'Enabled' : 'Disabled'} />
              </CardBody>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader title="Infrastructure" subtitle="Live dependency checks" />
              <CardBody>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {health.components.map((component) => (
                    <ComponentCard key={component.key} component={component} />
                  ))}
                </div>
              </CardBody>
            </Card>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-6">
            <Card>
              <CardHeader title="Key endpoints" subtitle="What this API exposes" />
              <CardBody className="space-y-3">
                {health.endpoints.map((endpoint) => (
                  <EndpointRow key={endpoint.path + endpoint.label} endpoint={endpoint} />
                ))}
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Operational alerts" subtitle="Items that may need admin action" />
              <CardBody className="space-y-3">
                {health.operational_alerts.length > 0 ? (
                  health.operational_alerts.map((alert) => (
                    <AlertRow key={`${alert.area}-${alert.title}`} alert={alert} />
                  ))
                ) : (
                  <div className="flex items-center gap-2 text-sm text-success-700 bg-success-50 rounded-xl px-4 py-3">
                    <CheckCircle2 className="w-4 h-4" />
                    No operational backlog alerts right now.
                  </div>
                )}
              </CardBody>
            </Card>
          </div>

          <Card>
            <CardHeader
              title="Recent issues"
              subtitle="Summarized from recent application errors — not raw server logs"
            />
            <CardBody className="space-y-3">
              {health.recent_issues.length > 0 ? (
                health.recent_issues.map((issue) => <IssueRow key={issue.id} issue={issue} />)
              ) : (
                <div className="flex items-center gap-2 text-sm text-ink-500 bg-ink-50 rounded-xl px-4 py-3">
                  <Activity className="w-4 h-4" />
                  No recent errors detected in the last application log window.
                </div>
              )}
            </CardBody>
          </Card>
        </>
      ) : null}
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-ink-500">{label}</span>
      <span className={`text-ink-900 text-right ${mono ? 'font-mono text-xs' : 'font-medium'}`}>{value}</span>
    </div>
  );
}

function ComponentCard({ component }: { component: SystemHealthComponent }) {
  return (
    <div className="rounded-xl border border-ink-100 bg-ink-50/60 p-4">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <Server className="w-4 h-4 text-ink-400" />
          <p className="font-semibold text-ink-900 text-sm">{component.label}</p>
        </div>
        <Badge status={statusBadge(component.status)} label={titleCase(component.status)} />
      </div>
      <p className="text-xs text-ink-500">{component.message}</p>
    </div>
  );
}

function EndpointRow({ endpoint }: { endpoint: SystemHealthEndpoint }) {
  return (
    <div className="rounded-xl border border-ink-100 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-brand-600" />
            <p className="font-semibold text-ink-900 text-sm">{endpoint.label}</p>
          </div>
          <p className="text-xs font-mono text-ink-500 mt-1">{endpoint.path}</p>
          <p className="text-xs text-ink-400 mt-1">{endpoint.audience}</p>
        </div>
        <Badge status={statusBadge(endpoint.status)} label={titleCase(endpoint.status)} />
      </div>
      <p className="text-xs text-ink-500 mt-3">{endpoint.message}</p>
    </div>
  );
}

function AlertRow({ alert }: { alert: SystemHealthAlert }) {
  const icon =
    alert.severity === 'warning' ? (
      <AlertTriangle className="w-4 h-4 text-warning-600" />
    ) : alert.severity === 'error' ? (
      <AlertCircle className="w-4 h-4 text-error-600" />
    ) : (
      <Activity className="w-4 h-4 text-brand-600" />
    );

  return (
    <div className="rounded-xl border border-ink-100 p-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5">{icon}</div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-ink-900 text-sm">{alert.title}</p>
            <span className="text-[11px] uppercase tracking-wide text-ink-400">{alert.area}</span>
          </div>
          <p className="text-sm text-ink-600 mt-1">{alert.message}</p>
        </div>
      </div>
    </div>
  );
}

function IssueRow({ issue }: { issue: SystemHealthIssue }) {
  return (
    <div className="rounded-xl border border-ink-100 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-ink-900 text-sm">{issue.title}</p>
            <span className="text-[11px] uppercase tracking-wide text-ink-400">{issue.area}</span>
          </div>
          <p className="text-sm text-ink-600 mt-1">{issue.message}</p>
          <p className="text-xs text-ink-400 mt-2">{formatDateTime(issue.occurred_at)}</p>
        </div>
        <Badge status={statusBadge(issue.severity)} label={titleCase(issue.severity)} />
      </div>
    </div>
  );
}
