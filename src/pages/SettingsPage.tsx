import { useMemo, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, CheckCircle2, RefreshCw, Shield, UserCog, XCircle } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { useAuth } from '@/context/AuthContext';
import { fetchAdminSettings } from '@/api/adminSettingsApi';
import { queryKeys } from '@/lib/queryKeys';
import { adminDisplayName, adminRoleLabel } from '@/lib/utils';
import { getApiErrorMessage } from '@/lib/adminAuthApi';

export function SettingsPage() {
  const { user } = useAuth();
  const fullName = adminDisplayName(user);
  const roleLabel = adminRoleLabel(user);

  const settingsQuery = useQuery({
    queryKey: queryKeys.settings.all,
    queryFn: fetchAdminSettings,
  });

  const serviceSummary = useMemo(() => {
    const services = Object.entries(settingsQuery.data?.services ?? {});
    const configured = services.filter(([, service]) => service.configured);
    const missing = services.filter(([, service]) => !service.configured);
    return { services, configured, missing };
  }, [settingsQuery.data]);

  const permissionSummary = user?.permissions?.is_super_admin
    ? 'Super admin'
    : [
        user?.permissions?.can_manage_operations ? 'Operations' : null,
        user?.permissions?.can_manage_finance ? 'Finance' : null,
      ]
        .filter(Boolean)
        .join(', ') || 'Standard admin';

  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Profile, environment, and service configuration overview"
        action={
          <button
            type="button"
            onClick={() => settingsQuery.refetch()}
            disabled={settingsQuery.isFetching}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-ink-200 bg-white text-sm font-medium text-ink-700 hover:bg-ink-50 disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${settingsQuery.isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 mb-4">
        <SummaryCard
          label="Environment"
          value={settingsQuery.data?.general.environment?.toUpperCase() ?? '—'}
          icon={<Shield className="w-5 h-5" />}
          tone={
            settingsQuery.data?.general.environment === 'production'
              ? 'warning'
              : settingsQuery.data?.general.environment === 'local'
                ? 'success'
                : 'brand'
          }
        />
        <SummaryCard
          label="Services configured"
          value={String(serviceSummary.configured.length)}
          icon={<CheckCircle2 className="w-5 h-5" />}
          tone="success"
        />
        <SummaryCard
          label="Services missing"
          value={String(serviceSummary.missing.length)}
          icon={<XCircle className="w-5 h-5" />}
          tone={serviceSummary.missing.length > 0 ? 'warning' : 'brand'}
        />
        <SummaryCard
          label="Access level"
          value={roleLabel}
          icon={<UserCog className="w-5 h-5" />}
          tone="brand"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader title="Your profile" subtitle="From the current Laravel admin session" />
          <CardBody className="space-y-4">
            <div className="rounded-2xl bg-ink-50 p-4">
              <p className="text-lg font-bold text-ink-900">{fullName}</p>
              <p className="mt-1 text-sm text-ink-500">{user?.email || 'No email address'}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Full name" value={fullName} />
              <Field label="Email" value={user?.email || '—'} mono />
              <Field label="Phone" value={user?.phone || '—'} />
              <Field label="Role" value={roleLabel} />
            </div>
            <SectionLabel>Permissions</SectionLabel>
            <div className="flex flex-wrap gap-2">
              <PermissionChip active={Boolean(user?.permissions?.is_super_admin)} label="Super admin" />
              <PermissionChip active={Boolean(user?.permissions?.can_manage_operations)} label="Operations" />
              <PermissionChip active={Boolean(user?.permissions?.can_manage_finance)} label="Finance" />
            </div>
            <Field label="Access summary" value={permissionSummary} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Application" subtitle="Read-only environment and deployment values" />
          <CardBody>
            {settingsQuery.isLoading ? (
              <div className="flex items-center gap-3 text-sm text-ink-500 py-6">
                <span className="w-5 h-5 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
                Loading settings from Laravel…
              </div>
            ) : null}

            {settingsQuery.isError ? (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-error-50 text-error-700 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Failed to load settings</p>
                  <p className="mt-1 text-error-600">
                    {getApiErrorMessage(settingsQuery.error, 'Check that the API is running and you are signed in.')}
                  </p>
                  <button
                    type="button"
                    onClick={() => settingsQuery.refetch()}
                    className="mt-3 text-sm font-semibold underline"
                  >
                    Try again
                  </button>
                </div>
              </div>
            ) : null}

            {settingsQuery.data ? (
              <dl className="space-y-3">
                <Row label="App name" value={settingsQuery.data.general.app_name} />
                <Row
                  label="Environment"
                  value={
                    <span className="inline-flex px-2 py-0.5 rounded-lg bg-ink-100 text-ink-700 text-xs font-semibold uppercase tracking-wide">
                      {settingsQuery.data.general.environment}
                    </span>
                  }
                />
                <Row label="Debug" value={settingsQuery.data.general.debug ? 'On' : 'Off'} />
                <Row label="Timezone" value={settingsQuery.data.general.timezone || '—'} />
                <Row label="App URL" value={settingsQuery.data.general.app_url || '—'} mono />
                <Row label="Frontend URL" value={settingsQuery.data.general.frontend_url || '—'} mono />
              </dl>
            ) : null}
          </CardBody>
        </Card>

        {settingsQuery.data ? (
          <Card className="lg:col-span-2">
            <CardHeader
              title="Services"
              subtitle={`${serviceSummary.configured.length} configured · ${serviceSummary.missing.length} missing`}
            />
            <CardBody>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <ServiceGroup
                  title="Configured"
                  emptyLabel="No configured services reported."
                  tone="success"
                  items={serviceSummary.configured}
                />
                <ServiceGroup
                  title="Needs attention"
                  emptyLabel="No missing services reported."
                  tone="warning"
                  items={serviceSummary.missing}
                />
              </div>
            </CardBody>
          </Card>
        ) : null}
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  tone: 'brand' | 'success' | 'warning';
}) {
  const tones = {
    brand: 'bg-brand-50 text-brand-700',
    success: 'bg-success-50 text-success-700',
    warning: 'bg-warning-50 text-warning-700',
  } as const;

  return (
    <Card>
      <CardBody className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-ink-500">{label}</p>
          <p className="mt-1 text-lg font-bold text-ink-900">{value}</p>
        </div>
        <div className={`rounded-xl p-3 ${tones[tone]}`}>{icon}</div>
      </CardBody>
    </Card>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="text-sm font-medium text-ink-700">{children}</p>;
}

function PermissionChip({ label, active }: { label: string; active: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
        active ? 'bg-brand-100 text-brand-800' : 'bg-ink-100 text-ink-500'
      }`}
    >
      {label}
    </span>
  );
}

function ServiceGroup({
  title,
  items,
  emptyLabel,
  tone,
}: {
  title: string;
  items: Array<[string, { configured: boolean; label: string }]>;
  emptyLabel: string;
  tone: 'success' | 'warning';
}) {
  const toneClasses =
    tone === 'success'
      ? 'border-success-100 bg-success-50/40'
      : 'border-warning-100 bg-warning-50/40';

  return (
    <div className={`rounded-2xl border p-4 ${toneClasses}`}>
      <p className="text-sm font-semibold text-ink-900">{title}</p>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-ink-500">{emptyLabel}</p>
      ) : (
        <div className="mt-3 space-y-3">
          {items.map(([key, service]) => (
            <div key={key} className="rounded-xl border border-white/70 bg-white/80 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-ink-900">{service.label || key}</p>
                  <p className="text-xs font-mono text-ink-400">{key}</p>
                </div>
                <span
                  className={`rounded-lg px-2 py-1 text-xs font-semibold ${
                    service.configured ? 'bg-success-100 text-success-700' : 'bg-warning-100 text-warning-700'
                  }`}
                >
                  {service.configured ? 'Configured' : 'Missing'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <label className="block text-sm font-medium text-ink-700 mb-1.5">{label}</label>
      <input
        type="text"
        value={value}
        disabled
        className={`w-full px-4 py-2.5 rounded-xl border border-ink-200 bg-ink-50 text-ink-500 ${
          mono ? 'font-mono text-sm' : ''
        }`}
      />
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-ink-100 last:border-0">
      <dt className="text-sm text-ink-500">{label}</dt>
      <dd className={`text-sm text-ink-900 text-right ${mono ? 'font-mono break-all' : ''}`}>{value}</dd>
    </div>
  );
}
