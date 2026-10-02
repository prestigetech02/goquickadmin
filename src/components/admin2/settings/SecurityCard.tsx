import { useQuery } from '@tanstack/react-query';
import { UserPlus } from 'lucide-react';
import { fetchAdminAccounts, type AdminAccountItem } from '@/api/adminAdminsApi';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import { queryKeys } from '@/lib/queryKeys';
import { Chip, PersonAvatar } from '../errand/parts';
import { formatCount } from '../format';
import { Skeleton } from '../overview/primitives';
import { BLUE } from '../runnerDetails/presentation';
import { AMBER, GREEN, RED } from '../userDetails/presentation';
import { LoadError, SettingsCard } from './parts';

const PREVIEW = { page: 1, per_page: 6 };

const MODULE_NAMES: Record<string, string> = { operations: 'Operations', finance: 'Finance' };

function adminName(admin: AdminAccountItem): string {
  return [admin.first_name, admin.last_name].filter(Boolean).join(' ') || admin.name || admin.email || 'Admin';
}

function accessLabel(admin: AdminAccountItem): string {
  if (admin.is_super_admin) return 'Super admin · all modules';
  const modules = admin.admin_modules.map((m) => MODULE_NAMES[m] ?? m);
  return modules.length ? modules.join(' & ') : 'No modules';
}

export function SecurityCard({ onManage }: { onManage?: () => void }) {
  const query = useQuery({ queryKey: queryKeys.admins.list(PREVIEW), queryFn: () => fetchAdminAccounts(PREVIEW) });
  const admins = query.data?.admins;
  const total = query.data?.meta.total ?? 0;

  return (
    <SettingsCard
      id="security"
      title="Security & admin access"
      subtitle="Who can sign in to the admin and which modules they manage."
      action={
        onManage ? (
          <button
            type="button"
            onClick={onManage}
            className="flex h-[30px] items-center gap-[6px] rounded-[8px] border border-[#d4ddd6] bg-white px-[10px] text-[11px] font-semibold text-[#17211b] hover:bg-[#f8faf8]"
          >
            <UserPlus className="size-[13px]" strokeWidth={1.8} />
            Invite admin
          </button>
        ) : null
      }
    >
      <div className="grid grid-cols-2 gap-[10px]">
        <Tile label="Admin accounts" value={query.data ? formatCount(total) : null} />
        <Tile label="Access model" value="Module based" hint="Operations, Finance or both" />
      </div>
      {query.isError ? <LoadError text={getApiErrorMessage(query.error, 'Could not load admin accounts.')} /> : null}
      <ul className="flex flex-col divide-y divide-[#eef1ee]">
        {!admins && !query.isError
          ? Array.from({ length: 3 }, (_, i) => (
              <li key={i} className="py-[10px]">
                <Skeleton className="h-[30px] w-full" />
              </li>
            ))
          : null}
        {admins?.map((admin) => {
          const name = adminName(admin);
          return (
            <li key={admin.id} className="flex items-center gap-[10px] py-[10px]">
              <PersonAvatar name={name} tone={admin.is_super_admin ? GREEN : BLUE} size={30} />
              <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
                <span className="truncate text-[12px] font-semibold text-[#17211b]">{name}</span>
                <span className="truncate text-[10px] text-[#7c857f]">{accessLabel(admin)}</span>
              </div>
              {admin.is_suspended ? (
                <Chip tone={RED} label="Suspended" dot />
              ) : admin.must_change_password ? (
                <Chip tone={AMBER} label="Invite pending" dot />
              ) : (
                <Chip tone={GREEN} label="Active" dot />
              )}
            </li>
          );
        })}
      </ul>
      {admins && total > admins.length ? <p className="text-[10px] text-[#7c857f]">Showing {admins.length} of {formatCount(total)} admins.</p> : null}
    </SettingsCard>
  );
}

function Tile({ label, value, hint }: { label: string; value: string | null; hint?: string }) {
  return (
    <div className="flex flex-col gap-[4px] rounded-[10px] border border-[#eef1ee] bg-[#fbfcfb] px-[12px] py-[10px]">
      <span className="text-[10px] text-[#7c857f]">{label}</span>
      {value === null ? <Skeleton className="h-[16px] w-[40px]" /> : <span className="text-[13px] font-semibold text-[#17211b]">{value}</span>}
      {hint ? <span className="text-[10px] text-[#7c857f]">{hint}</span> : null}
    </div>
  );
}