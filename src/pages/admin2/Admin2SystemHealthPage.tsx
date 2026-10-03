import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, Database, Globe, Layers, RefreshCw, ShieldAlert, Zap } from 'lucide-react';
import { fetchAdminSystemHealth } from '@/api/adminSystemHealthApi';
import { Chip } from '@/components/admin2/errand/parts';
import { formatCount, relativeAgo } from '@/components/admin2/format';
import { HealthAlertsCard } from '@/components/admin2/health/HealthAlertsCard';
import { HealthComponentsCard } from '@/components/admin2/health/HealthComponentsCard';
import { HealthSecurityCard } from '@/components/admin2/health/HealthSecurityCard';
import { OVERALL, isProblem, statusLabel, statusTone } from '@/components/admin2/health/healthPresentation';
import { Card, CardTitle, Skeleton } from '@/components/admin2/overview/primitives';
import { MetricCard, MetricGrid } from '@/components/admin2/shared/MetricCard';
import { OUTLINE_BUTTON, PageHeader } from '@/components/admin2/shared/PageHeader';
import { useAuth } from '@/context/AuthContext';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import { queryKeys } from '@/lib/queryKeys';
import type { SystemHealthComponent, SystemHealthData } from '@/types/api';

function latencyValue(component: SystemHealthComponent | undefined): string | undefined {
  if (!component) return undefined;
  if (component.latency_ms != null) return `${component.latency_ms} ms`;
  return statusLabel(component.status);
}

function StatusBanner({ health }: { health: SystemHealthData }) {
  const overall = OVERALL[health.status] ?? OVERALL.degraded;
  const Icon = health.status === 'healthy' ? CheckCircle2 : health.status === 'degraded' ? AlertTriangle : ShieldAlert;
  const problems = health.components.filter(isProblem).length;
  const down = health.components.filter((c) => c.status === 'down').length;

  return (
    <div
      className="flex flex-wrap items-center gap-[16px] rounded-[12px] border px-[18px] py-[16px]"
      style={{ borderColor: overall.border, backgroundColor: overall.surface }}
    >
      <span className="flex size-[44px] flex-shrink-0 items-center justify-center rounded-[12px]" style={{ backgroundColor: overall.tone.bg }}>
        <Icon className="size-[22px]" strokeWidth={1.8} color={overall.tone.color} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[16px] font-bold text-[#17211b]">{overall.title}</p>
        <p className="mt-[2px] text-[12px] text-[#45514a]">{health.summary}</p>
      </div>
      <div className="flex flex-wrap items-center gap-[6px]">
        <Chip tone={{ bg: '#eaf6ed', color: '#167d35' }} label={`${health.components.length - problems} healthy`} dot />
        {problems - down > 0 ? <Chip tone={{ bg: '#fff5e5', color: '#b06d12' }} label={`${problems - down} need attention`} dot /> : null}
        {down > 0 ? <Chip tone={{ bg: '#fdeded', color: '#b84545' }} label={`${down} down`} dot /> : null}
      </div>
    </div>
  );
}

function ApiCard({ health }: { health: SystemHealthData | undefined }) {
  const rows: Array<[string, string, boolean?]> = health
    ? [
        ['Application', health.api.app_name],
        ['Environment', health.api.environment],
        ['Base URL', health.api.app_url, true],
        ['Laravel', health.api.laravel_version],
        ['PHP', health.api.php_version],
        ['Debug mode', health.api.debug ? 'On' : 'Off'],
      ]
    : [];
  const debugInProd = health?.api.debug && health.api.environment === 'production';

  return (
    <Card className="flex min-w-0 flex-col gap-[14px] p-[16px]">
      <CardTitle title="API & endpoints" subtitle="What this server is running and exposing" />
      {!health ? (
        <Skeleton className="h-[200px] w-full" />
      ) : (
        <>
          <dl className="divide-y divide-[#eef2ef] rounded-[10px] border border-[#e2e8e3]">
            {rows.map(([label, value, mono]) => (
              <div key={label} className="flex items-center justify-between gap-4 px-[12px] py-[8px]">
                <dt className="text-[11px] text-[#7c857f]">{label}</dt>
                <dd
                  className={`truncate text-right text-[11px] font-medium ${
                    label === 'Debug mode' && debugInProd ? 'text-[#b84545]' : 'text-[#17211b]'
                  } ${mono ? 'font-mono text-[10px]' : 'capitalize'}`}
                >
                  {value}
                </dd>
              </div>
            ))}
          </dl>
          <div className="flex flex-col gap-[8px]">
            {health.endpoints.map((endpoint) => {
              const tone = statusTone(endpoint.status);
              return (
                <div key={endpoint.path + endpoint.label} className="flex items-start gap-[10px]">
                  <Globe className="mt-[2px] size-[13px] flex-shrink-0 text-[#7c857f]" strokeWidth={1.8} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-semibold text-[#17211b]">{endpoint.label}</p>
                    <p className="truncate font-mono text-[10px] text-[#7c857f]">{endpoint.path}</p>
                  </div>
                  <span className="size-[7px] flex-shrink-0 self-center rounded-full" style={{ backgroundColor: tone.color }} title={endpoint.message} />
                </div>
              );
            })}
          </div>
        </>
      )}
    </Card>
  );
}

export function Admin2SystemHealthPage() {
  const { user } = useAuth();
  const healthQuery = useQuery({
    queryKey: queryKeys.systemHealth.all,
    queryFn: fetchAdminSystemHealth,
    refetchInterval: 60_000,
  });

  const health = healthQuery.data;
  const byKey = (key: string) => health?.components.find((c) => c.key === key);
  const queue = byKey('queue');
  const attention = health ? health.operational_alerts.length + health.recent_issues.length : undefined;

  return (
    <div className="flex w-full flex-col gap-[20px]">
      <PageHeader
        eyebrow="Platform · Live"
        title="System Health"
        subtitle="Infrastructure checks, integrations, admin security and anything on the platform that needs attention."
        actions={
          <>
            {health ? <span className="text-[11px] text-[#7c857f]">Checked {relativeAgo(health.checked_at)}</span> : null}
            <button type="button" onClick={() => void healthQuery.refetch()} disabled={healthQuery.isFetching} className={OUTLINE_BUTTON}>
              <RefreshCw className={`size-[15px] ${healthQuery.isFetching ? 'animate-spin' : ''}`} strokeWidth={1.8} />
              {healthQuery.isFetching ? 'Checking…' : 'Run checks'}
            </button>
          </>
        }
      />

      {healthQuery.isError ? (
        <p className="rounded-[8px] bg-[#fdeded] px-3 py-2 text-[11px] font-medium text-[#b84545]">
          {getApiErrorMessage(healthQuery.error, 'Could not load system health.')}
        </p>
      ) : null}

      {health ? <StatusBanner health={health} /> : healthQuery.isLoading ? <Skeleton className="h-[78px] w-full rounded-[12px]" /> : null}

      <MetricGrid columns={4}>
        <MetricCard
          label="Database"
          icon={Database}
          iconColor="#2563a8"
          iconBg="#e8f1fb"
          value={latencyValue(byKey('database'))}
          pill={byKey('database') ? { label: statusLabel(byKey('database')!.status), tone: byKey('database')!.status === 'healthy' ? 'green' : 'red' } : null}
          context="Round trip for a test query"
        />
        <MetricCard
          label="Cache"
          icon={Zap}
          iconColor="#6b46c1"
          iconBg="#f1ecfb"
          value={latencyValue(byKey('cache'))}
          pill={byKey('cache') ? { label: statusLabel(byKey('cache')!.status), tone: byKey('cache')!.status === 'healthy' ? 'green' : 'amber' } : null}
          context="Write, read and delete probe"
        />
        <MetricCard
          label="Failed jobs · 24h"
          icon={Layers}
          iconColor="#b06d12"
          iconBg="#fff5e5"
          value={queue ? formatCount(queue.failed_24h ?? 0) : health ? '—' : undefined}
          pill={queue && (queue.failed_24h ?? 0) > 0 ? { label: 'Check queue', tone: 'red' } : null}
          context={queue?.pending != null ? `${formatCount(queue.pending)} waiting to run` : 'Emails, pushes and other background work'}
        />
        <MetricCard
          label="Needs attention"
          icon={AlertTriangle}
          iconColor="#b84545"
          iconBg="#fdeded"
          value={attention != null ? formatCount(attention) : undefined}
          context={health ? `${health.operational_alerts.length} alerts · ${health.recent_issues.length} recent errors` : undefined}
        />
      </MetricGrid>

      <div className="grid w-full grid-cols-1 gap-[12px] xl:grid-cols-3">
        <div className="xl:col-span-2">
          <HealthComponentsCard components={health?.components} loading={healthQuery.isLoading} />
        </div>
        <div className="flex flex-col gap-[12px]">
          <HealthSecurityCard security={health?.security} loading={healthQuery.isLoading} />
          <ApiCard health={health} />
        </div>
      </div>

      <HealthAlertsCard alerts={health?.operational_alerts} issues={health?.recent_issues} loading={healthQuery.isLoading} user={user} />
    </div>
  );
}
