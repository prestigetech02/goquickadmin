import { Eye, EllipsisVertical, KeyRound, LogOut, Mail, UserMinus } from 'lucide-react';
import type { AdminAccessFilter, AdminAccountItem, AdminAccountsSummary } from '@/api/adminAdminsApi';
import { formatCount, personInitials, relativeAgo } from '../format';
import { Chip } from '../errand/parts';
import { watDate } from '../errand/errandPresentation';
import { Card, Skeleton } from '../overview/primitives';
import { Pager } from '../shared/Pager';
import { CardTabs, SearchField, TABLE_HEADER } from '../shared/TableControls';
import { ActionMenu, type ActionMenuItem } from '../users/ActionMenu';
import { ACCESS_TABS, MODULE_TONES, adminName, deviceIcon, presenceOf, roleLabel, roleTone } from './adminPresentation';

const GRID_COLUMNS =
  'grid grid-cols-[minmax(200px,1.6fr)_112px_minmax(130px,0.9fr)_minmax(170px,1.3fr)_84px_minmax(110px,0.8fr)_92px_24px] items-center gap-x-[12px] px-[16px]';

export type AdminRowAction = 'view' | 'resend' | 'revoke' | 'remove';

export function AdminDirectoryCard({
  admins,
  summary,
  loading,
  error,
  dimmed,
  access,
  onAccessChange,
  search,
  onSearchChange,
  page,
  lastPage,
  total,
  onPageChange,
  currentAdminId,
  onAction,
}: {
  admins: AdminAccountItem[];
  summary: AdminAccountsSummary | undefined;
  loading: boolean;
  error: string | null;
  dimmed: boolean;
  access: AdminAccessFilter | 'all';
  onAccessChange: (value: AdminAccessFilter | 'all') => void;
  search: string;
  onSearchChange: (value: string) => void;
  page: number;
  lastPage: number;
  total: number;
  onPageChange: (page: number) => void;
  currentAdminId: number | undefined;
  onAction: (action: AdminRowAction, admin: AdminAccountItem) => void;
}) {
  const rowMenu = (admin: AdminAccountItem): ActionMenuItem[] => {
    const self = admin.id === currentAdminId;
    const items: ActionMenuItem[] = [
      { label: 'View details', icon: Eye, onSelect: () => onAction('view', admin) },
      { label: 'Resend sign-in details', icon: Mail, onSelect: () => onAction('resend', admin) },
    ];
    if (!self && (admin.active_sessions ?? 0) > 0) {
      items.push({ label: 'Sign out everywhere', icon: LogOut, onSelect: () => onAction('revoke', admin) });
    }
    if (!self && !admin.is_super_admin) {
      items.push({ label: 'Remove admin access', icon: UserMinus, danger: true, onSelect: () => onAction('remove', admin) });
    }
    return items;
  };

  return (
    <Card className="w-full overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-[16px] pb-[4px] pt-[16px]">
        <div className="flex min-w-0 flex-col gap-[4px]">
          <p className="text-[14px] font-semibold text-[#17211b]">Admin directory</p>
          <p className="text-[11px] text-[#7c857f]">Who has access, what they can reach, and when they were last active</p>
        </div>
      </div>

      <CardTabs
        tabs={ACCESS_TABS.map((tab) => ({ value: tab.value, label: tab.label, count: summary?.[tab.summaryKey] ?? null }))}
        value={access}
        onChange={onAccessChange}
      />

      <div className="flex flex-wrap items-center gap-[10px] border-b border-[#e2e8e3] px-[16px] py-[12px]">
        <SearchField value={search} onChange={onSearchChange} placeholder="Search by name or email…" />
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[1040px]">
          <div className={`${GRID_COLUMNS} ${TABLE_HEADER}`}>
            <span>Admin</span>
            <span>Role</span>
            <span>Modules</span>
            <span>Last sign-in</span>
            <span>Sessions</span>
            <span>Activity · 30d</span>
            <span>Joined</span>
            <span />
          </div>

          {loading
            ? Array.from({ length: 5 }, (_, i) => (
                <div key={i} className={`${GRID_COLUMNS} h-[64px] border-b border-[#e2e8e3]`}>
                  <div className="flex items-center gap-[10px]">
                    <Skeleton className="size-[34px] rounded-full" />
                    <Skeleton className="h-[10px] w-[110px]" />
                  </div>
                  {Array.from({ length: 6 }, (_, j) => (
                    <Skeleton key={j} className="h-[10px] w-[60px]" />
                  ))}
                  <span />
                </div>
              ))
            : null}

          {error ? <p className="px-[16px] py-[28px] text-center text-[12px] text-[#b84545]">{error}</p> : null}

          {!loading && !error && admins.length === 0 ? (
            <p className="px-[16px] py-[36px] text-center text-[12px] font-semibold text-[#17211b]">No admins match these filters</p>
          ) : null}

          {admins.map((admin) => {
            const name = adminName(admin);
            const tone = roleTone(admin);
            const presence = presenceOf(admin);
            const login = admin.last_login;
            const DeviceIcon = deviceIcon(login?.device_type);
            const self = admin.id === currentAdminId;
            return (
              <div
                key={admin.id}
                role="button"
                tabIndex={0}
                onClick={() => onAction('view', admin)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onAction('view', admin);
                }}
                className={`${GRID_COLUMNS} h-[64px] cursor-pointer border-b border-[#e2e8e3] transition-colors hover:bg-[#fafcfa] ${dimmed ? 'opacity-60' : ''}`}
              >
                <div className="flex min-w-0 items-center gap-[10px]">
                  <span className="relative flex-shrink-0">
                    <span
                      className="flex size-[34px] items-center justify-center rounded-full text-[11px] font-bold"
                      style={{ backgroundColor: tone.bg, color: tone.color }}
                    >
                      {personInitials(name)}
                    </span>
                    <span
                      className="absolute -bottom-px -right-px size-[10px] rounded-full border-2 border-white"
                      style={{ backgroundColor: presence.color }}
                      title={`${presence.label} · ${presence.detail}`}
                    />
                  </span>
                  <div className="min-w-0">
                    <p className="flex items-center gap-[6px] truncate text-[12px] font-semibold text-[#17211b]">
                      <span className="truncate">{name}</span>
                      {self ? <span className="flex-shrink-0 rounded-full bg-[#f1f4f2] px-[6px] py-[1px] text-[9px] font-semibold text-[#45514a]">You</span> : null}
                    </p>
                    <p className="truncate text-[10px] text-[#7c857f]">{admin.email ?? '—'}</p>
                  </div>
                </div>
                <div className="flex flex-col items-start gap-[4px]">
                  <Chip tone={tone} label={roleLabel(admin)} />
                  {admin.must_change_password ? (
                    <span className="flex items-center gap-[3px] text-[9px] font-semibold text-[#b06d12]">
                      <KeyRound className="size-[10px]" /> Setup pending
                    </span>
                  ) : null}
                </div>
                <div className="flex min-w-0 flex-wrap gap-[4px]">
                  {admin.is_super_admin ? (
                    <span className="text-[10px] font-medium text-[#45514a]">All modules</span>
                  ) : admin.admin_modules.length ? (
                    admin.admin_modules.map((m) => (
                      <Chip key={m} tone={MODULE_TONES[m] ?? { bg: '#f1f4f2', color: '#45514a' }} label={m === 'finance' ? 'Finance' : 'Operations'} />
                    ))
                  ) : (
                    <span className="text-[10px] text-[#b84545]">No modules</span>
                  )}
                </div>
                <div className="min-w-0">
                  {login?.at ? (
                    <>
                      <p className="flex items-center gap-[5px] truncate text-[11px] font-medium text-[#17211b]">
                        <DeviceIcon className="size-[12px] flex-shrink-0 text-[#7c857f]" strokeWidth={1.8} />
                        <span className="truncate">{relativeAgo(login.at)}</span>
                      </p>
                      <p className="truncate text-[10px] text-[#7c857f]" title={login.ip_address ?? undefined}>
                        {[login.device, login.location].filter(Boolean).join(' · ') || login.ip_address || 'Unknown device'}
                      </p>
                    </>
                  ) : (
                    <p className="text-[10px] text-[#7c857f]">{admin.must_change_password ? 'Never signed in' : 'No sign-ins recorded'}</p>
                  )}
                </div>
                <div className="flex items-center gap-[6px]" title={presence.detail}>
                  <span className="size-[7px] rounded-full" style={{ backgroundColor: presence.color }} />
                  <span className="text-[11px] font-semibold text-[#17211b]">{admin.active_sessions ?? 0}</span>
                  <span className="text-[10px] text-[#7c857f]">live</span>
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-[#17211b]">{formatCount(admin.actions_30d ?? 0)} actions</p>
                  <p className="truncate text-[10px] text-[#7c857f]">
                    {admin.last_action_at ? `Last ${relativeAgo(admin.last_action_at)}` : 'No changes yet'}
                  </p>
                </div>
                <p className="text-[10px] text-[#45514a]">{watDate(admin.created_at)}</p>
                <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} role="presentation">
                  <ActionMenu
                    items={rowMenu(admin)}
                    ariaLabel={`Actions for ${name}`}
                    className="flex size-[22px] items-center justify-center rounded text-[#7c857f] hover:bg-[#eef2ef] hover:text-[#17211b]"
                  >
                    <EllipsisVertical className="size-[16px]" />
                  </ActionMenu>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 px-[16px] py-[12px]">
        <p className="text-[10px] text-[#7c857f]">
          Showing {formatCount(admins.length)} of {formatCount(total)} admins
        </p>
        <Pager page={page} lastPage={lastPage} onChange={onPageChange} />
      </div>
    </Card>
  );
}
