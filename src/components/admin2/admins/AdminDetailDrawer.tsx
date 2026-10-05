import { useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { CircleAlert, History, LogOut, Mail, ShieldCheck, UserMinus } from 'lucide-react';
import { fetchAdminAccount, updateAdminModules, type AdminAccountDetail, type AdminAccountItem } from '@/api/adminAdminsApi';
import { Drawer } from '@/components/ui/Drawer';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import { ADMIN_MODULE_OPTIONS, canAccessPage, getAdmin2RunnerHref, getAdmin2UserHref, getPagePath } from '@/lib/adminNavigation';
import { queryKeys } from '@/lib/queryKeys';
import { useAuth } from '@/context/AuthContext';
import type { AdminModule } from '@/types';
import { formatCount, personInitials, relativeAgo } from '../format';
import { Chip } from '../errand/parts';
import { watDate, watTime } from '../errand/errandPresentation';
import { Skeleton } from '../overview/primitives';
import type { AdminRowAction } from './AdminDirectoryCard';
import { adminName, deviceIcon, presenceOf, roleLabel, roleTone } from './adminPresentation';

function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-[8px]">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.6px] text-[#7c857f]">{title}</p>
        {action}
      </div>
      {children}
    </section>
  );
}

function Stat({ label, value, warn }: { label: string; value: string | undefined; warn?: boolean }) {
  return (
    <div className="min-w-0 rounded-[10px] border border-[#e2e8e3] bg-[#f8faf8] px-[11px] py-[9px]">
      <p className="truncate text-[9px] font-medium uppercase tracking-[0.3px] text-[#7c857f]">{label}</p>
      {value != null ? (
        <p className={`mt-[2px] text-[17px] font-bold tracking-[-0.3px] ${warn ? 'text-[#b84545]' : 'text-[#17211b]'}`}>{value}</p>
      ) : (
        <Skeleton className="mt-[6px] h-[14px] w-[40px]" />
      )}
    </div>
  );
}

function ModuleEditor({ admin }: { admin: AdminAccountItem }) {
  const queryClient = useQueryClient();
  const [modules, setModules] = useState<AdminModule[]>(admin.admin_modules);
  const [saved, setSaved] = useState(false);
  const dirty = modules.length !== admin.admin_modules.length || modules.some((m) => !admin.admin_modules.includes(m));

  const mutation = useMutation({
    mutationFn: () => updateAdminModules(admin.id, modules),
    onSuccess: () => {
      setSaved(true);
      void queryClient.invalidateQueries({ queryKey: queryKeys.admins.all });
    },
  });

  const toggle = (key: AdminModule) => {
    setSaved(false);
    setModules((current) => (current.includes(key) ? current.filter((m) => m !== key) : [...current, key]));
  };

  return (
    <div className="flex flex-col gap-[8px]">
      <div className="grid grid-cols-2 gap-[8px]">
        {ADMIN_MODULE_OPTIONS.map((option) => {
          const on = modules.includes(option.key);
          return (
            <button
              key={option.key}
              type="button"
              onClick={() => toggle(option.key)}
              aria-pressed={on}
              className={`flex flex-col items-start gap-[2px] rounded-[10px] border px-[12px] py-[10px] text-left transition-colors ${
                on ? 'border-[#167d35] bg-[#f3faf5]' : 'border-[#e2e8e3] bg-white hover:bg-[#f8faf8]'
              }`}
            >
              <span className={`text-[12px] font-semibold ${on ? 'text-[#0d5e27]' : 'text-[#17211b]'}`}>{option.label}</span>
              <span className="text-[10px] text-[#7c857f]">{option.description}</span>
            </button>
          );
        })}
      </div>
      {modules.length === 0 ? <p className="text-[10px] text-[#b84545]">Keep at least one module, or remove their admin access instead.</p> : null}
      {mutation.isError ? <p className="text-[10px] text-[#b84545]">{getApiErrorMessage(mutation.error, 'Could not update modules.')}</p> : null}
      {dirty || saved ? (
        <div className="flex items-center justify-end gap-[8px]">
          {saved && !dirty ? <span className="text-[10px] font-semibold text-[#167d35]">Access updated</span> : null}
          {dirty ? (
            <button
              type="button"
              onClick={() => mutation.mutate()}
              disabled={modules.length === 0 || mutation.isPending}
              className="h-[32px] rounded-[8px] bg-[#167d35] px-[12px] text-[11px] font-semibold text-white disabled:opacity-60"
            >
              {mutation.isPending ? 'Saving…' : 'Save access'}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function AdminDetailDrawer({
  adminId,
  initial,
  onClose,
  onAction,
  busy,
}: {
  adminId: number;
  initial: AdminAccountItem | undefined;
  onClose: () => void;
  onAction: (action: AdminRowAction, admin: AdminAccountItem) => void;
  busy: boolean;
}) {
  const detailQuery = useQuery({
    queryKey: queryKeys.admins.detail(adminId),
    queryFn: () => fetchAdminAccount(adminId),
  });
  const current = detailQuery.data?.admin ?? initial;

  if (!current) {
    return (
      <Drawer open onClose={onClose} title="Admin details" width="lg">
        {detailQuery.isError ? (
          <p className="rounded-[8px] bg-[#fdeded] px-3 py-2 font-inter text-[11px] font-medium text-[#b84545]">
            {getApiErrorMessage(detailQuery.error, 'Could not load this admin.')}
          </p>
        ) : (
          <div className="flex flex-col gap-[12px]">
            <Skeleton className="h-[54px] w-full rounded-[10px]" />
            <Skeleton className="h-[160px] w-full rounded-[10px]" />
          </div>
        )}
      </Drawer>
    );
  }

  return <AdminDetailBody current={current} detailQuery={detailQuery} onClose={onClose} onAction={onAction} busy={busy} />;
}

function AdminDetailBody({
  current,
  detailQuery,
  onClose,
  onAction,
  busy,
}: {
  current: AdminAccountItem;
  detailQuery: UseQueryResult<AdminAccountDetail>;
  onClose: () => void;
  onAction: (action: AdminRowAction, admin: AdminAccountItem) => void;
  busy: boolean;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const detail = detailQuery.data;
  const name = adminName(current);
  const tone = roleTone(current);
  const presence = presenceOf(current);
  const self = current.id === user?.id;
  const stats = detail?.stats;
  const maxArea = Math.max(1, ...(stats?.top_areas.map((a) => a.count) ?? [1]));
  const auditHref = canAccessPage(user, 'admin2-audit') ? `${getPagePath('admin2-audit')}?admin=${current.id}` : null;

  return (
    <Drawer
      open
      onClose={onClose}
      title={name}
      subtitle={`Admin #${current.id} · joined ${watDate(current.created_at)}`}
      width="lg"
      footer={
        <div className="flex flex-wrap items-center gap-[8px] font-inter">
          <button
            type="button"
            onClick={() => onAction('resend', current)}
            disabled={busy}
            className="flex h-[36px] items-center gap-[6px] rounded-[8px] border border-[#d4ddd6] bg-white px-[12px] text-[12px] font-semibold text-[#17211b] hover:bg-[#f8faf8] disabled:opacity-60"
          >
            <Mail className="size-[14px]" strokeWidth={1.8} /> Resend sign-in details
          </button>
          {!self && (current.active_sessions ?? 0) > 0 ? (
            <button
              type="button"
              onClick={() => onAction('revoke', current)}
              disabled={busy}
              className="flex h-[36px] items-center gap-[6px] rounded-[8px] border border-[#d4ddd6] bg-white px-[12px] text-[12px] font-semibold text-[#17211b] hover:bg-[#f8faf8] disabled:opacity-60"
            >
              <LogOut className="size-[14px]" strokeWidth={1.8} /> Sign out everywhere
            </button>
          ) : null}
          {!self && !current.is_super_admin ? (
            <button
              type="button"
              onClick={() => onAction('remove', current)}
              disabled={busy}
              className="ml-auto flex h-[36px] items-center gap-[6px] rounded-[8px] border border-[#f1d4d4] bg-white px-[12px] text-[12px] font-semibold text-[#b84545] hover:bg-[#fff6f6] disabled:opacity-60"
            >
              <UserMinus className="size-[14px]" strokeWidth={1.8} /> Remove access
            </button>
          ) : null}
        </div>
      }
    >
      <div className="flex flex-col gap-[20px] font-inter">
        <div className="flex items-center gap-[14px]">
          <span className="relative flex-shrink-0">
            <span className="flex size-[54px] items-center justify-center rounded-full text-[17px] font-bold" style={{ backgroundColor: tone.bg, color: tone.color }}>
              {personInitials(name)}
            </span>
            <span className="absolute bottom-0 right-0 size-[13px] rounded-full border-2 border-white" style={{ backgroundColor: presence.color }} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] text-[#45514a]">{current.email}</p>
            <div className="mt-[6px] flex flex-wrap items-center gap-[6px]">
              <Chip tone={tone} label={roleLabel(current)} />
              <Chip tone={{ bg: '#f1f4f2', color: presence.color === '#c9d2cc' ? '#7c857f' : presence.color }} label={presence.label} dot />
              {current.must_change_password ? <Chip tone={{ bg: '#fff5e5', color: '#b06d12' }} label="Setup pending" /> : null}
              {self ? <Chip tone={{ bg: '#f1f4f2', color: '#45514a' }} label="You" /> : null}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-[8px] sm:grid-cols-4">
          <Stat label="Actions · 30d" value={stats ? formatCount(stats.actions_30d) : undefined} />
          <Stat label="Active days" value={stats ? `${stats.active_days_30d}/30` : undefined} />
          <Stat label="Failed actions" value={stats ? formatCount(stats.failed_actions_30d) : undefined} warn={(stats?.failed_actions_30d ?? 0) > 0} />
          <Stat label="Failed sign-ins" value={stats ? formatCount(stats.failed_sign_ins_30d) : undefined} warn={(stats?.failed_sign_ins_30d ?? 0) >= 3} />
        </div>

        {detailQuery.isError ? (
          <p className="rounded-[8px] bg-[#fdeded] px-3 py-2 text-[11px] font-medium text-[#b84545]">
            {getApiErrorMessage(detailQuery.error, 'Could not load activity for this admin.')}
          </p>
        ) : null}

        <Section title="Module access">
          {current.is_super_admin ? (
            <p className="flex items-center gap-[8px] rounded-[10px] bg-[#f1ecfb] px-[12px] py-[10px] text-[11px] font-medium text-[#6b46c1]">
              <ShieldCheck className="size-[15px] flex-shrink-0" strokeWidth={1.8} />
              Super admins can reach every module, including admin management and the audit log.
            </p>
          ) : (
            <ModuleEditor key={current.id} admin={current} />
          )}
        </Section>

        {stats && stats.top_areas.length > 0 ? (
          <Section title="Where they work · 30 days">
            <div className="flex flex-col gap-[7px]">
              {stats.top_areas.map((area) => (
                <div key={area.resource} className="flex items-center gap-[10px]">
                  <span className="w-[120px] flex-shrink-0 truncate text-[11px] font-medium text-[#17211b]">{area.label}</span>
                  <span className="h-[8px] flex-1 overflow-hidden rounded-full bg-[#eef2ef]">
                    <span className="block h-full rounded-full bg-[#167d35]" style={{ width: `${(area.count / maxArea) * 100}%` }} />
                  </span>
                  <span className="w-[34px] flex-shrink-0 text-right text-[10px] font-semibold text-[#45514a]">{area.count}</span>
                </div>
              ))}
            </div>
          </Section>
        ) : null}

        <Section title="Sign-in history">
          {detail ? (
            detail.logins.length ? (
              <ul className="divide-y divide-[#e2e8e3] overflow-hidden rounded-[10px] border border-[#e2e8e3]">
                {detail.logins.map((login) => {
                  const Icon = deviceIcon(login.device_type);
                  return (
                    <li key={login.id} className="flex items-center gap-[10px] px-[12px] py-[9px]">
                      <span className="flex size-[30px] flex-shrink-0 items-center justify-center rounded-[8px] bg-[#f3f6f4]">
                        <Icon className="size-[15px] text-[#45514a]" strokeWidth={1.7} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[11px] font-semibold text-[#17211b]">{login.device ?? 'Unknown device'}</p>
                        <p className="truncate text-[10px] text-[#7c857f]">
                          {[login.location, login.ip_address].filter(Boolean).join(' · ') || 'Location unavailable'}
                        </p>
                      </div>
                      <div className="flex flex-shrink-0 flex-col items-end gap-[3px]">
                        {login.active ? <Chip tone={{ bg: '#eaf6ed', color: '#167d35' }} label="Signed in" dot /> : null}
                        <span className="text-[10px] text-[#7c857f]" title={login.created_at ? `${watDate(login.created_at)} ${watTime(login.created_at)}` : undefined}>
                          {relativeAgo(login.created_at)}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="rounded-[10px] border border-dashed border-[#d4ddd6] px-[12px] py-[14px] text-center text-[11px] text-[#7c857f]">
                No sign-ins recorded yet. History starts from when sign-in tracking was switched on.
              </p>
            )
          ) : (
            <Skeleton className="h-[120px] w-full rounded-[10px]" />
          )}
        </Section>

        <Section
          title="Recent changes"
          action={
            auditHref ? (
              <button type="button" onClick={() => navigate(auditHref)} className="flex items-center gap-[4px] text-[11px] font-semibold text-[#167d35] hover:underline">
                <History className="size-[12px]" /> Full audit log
              </button>
            ) : null
          }
        >
          {detail ? (
            detail.recent_actions.length ? (
              <ol className="relative flex flex-col gap-[12px] pl-[16px] before:absolute before:bottom-[6px] before:left-[4px] before:top-[6px] before:w-px before:bg-[#e2e8e3]">
                {detail.recent_actions.map((action) => {
                  const targetHref = action.target_user
                    ? action.target_user.role === 'runner'
                      ? getAdmin2RunnerHref(action.target_user.id)
                      : action.target_user.role === 'admin'
                        ? null
                        : getAdmin2UserHref(action.target_user.id)
                    : null;
                  return (
                    <li key={action.id} className="relative">
                      <span
                        className={`absolute -left-[16px] top-[4px] size-[9px] rounded-full border-2 border-white ${action.succeeded ? 'bg-[#167d35]' : 'bg-[#b84545]'}`}
                      />
                      <div className="flex items-start justify-between gap-[10px]">
                        <div className="min-w-0">
                          <p className="flex items-center gap-[6px] text-[11px] font-semibold text-[#17211b]">
                            {action.label}
                            {!action.succeeded ? (
                              <span className="flex items-center gap-[2px] text-[9px] font-semibold text-[#b84545]">
                                <CircleAlert className="size-[10px]" /> Failed
                              </span>
                            ) : null}
                          </p>
                          {action.target_user ? (
                            targetHref ? (
                              <button type="button" onClick={() => navigate(targetHref)} className="truncate text-[10px] text-[#167d35] hover:underline">
                                {action.target_user.name}
                              </button>
                            ) : (
                              <p className="truncate text-[10px] text-[#7c857f]">{action.target_user.name}</p>
                            )
                          ) : null}
                        </div>
                        <span className="flex-shrink-0 text-[10px] text-[#7c857f]">{relativeAgo(action.created_at)}</span>
                      </div>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p className="rounded-[10px] border border-dashed border-[#d4ddd6] px-[12px] py-[14px] text-center text-[11px] text-[#7c857f]">
                No changes made yet.
              </p>
            )
          ) : (
            <Skeleton className="h-[120px] w-full rounded-[10px]" />
          )}
        </Section>
      </div>
    </Drawer>
  );
}
