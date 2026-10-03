import { Link } from 'react-router-dom';
import { ShieldAlert, ShieldCheck } from 'lucide-react';
import { getPagePath } from '@/lib/adminNavigation';
import type { SystemHealthSecurity } from '@/types/api';
import { formatCount } from '../format';
import { Card, CardTitle, Skeleton } from '../overview/primitives';

function Stat({ label, value, warn = false }: { label: string; value: number; warn?: boolean }) {
  return (
    <div className="rounded-[10px] border border-[#e2e8e3] px-[12px] py-[10px]">
      <p className="text-[10px] text-[#7c857f]">{label}</p>
      <p className={`mt-[2px] text-[18px] font-bold tracking-[-0.3px] ${warn && value > 0 ? 'text-[#b84545]' : 'text-[#17211b]'}`}>{formatCount(value)}</p>
    </div>
  );
}

export function HealthSecurityCard({ security, loading }: { security: SystemHealthSecurity | undefined; loading: boolean }) {
  return (
    <Card className="flex min-w-0 flex-col gap-[14px] p-[16px]">
      <div className="flex items-start justify-between gap-3">
        <CardTitle title="Admin security" subtitle="Sign-in failures and super admin approvals" />
        <Link to={getPagePath('admin2-audit')} className="flex-shrink-0 text-[11px] font-semibold text-[#167d35] hover:underline">
          Audit log
        </Link>
      </div>

      {!security ? (
        loading ? (
          <Skeleton className="h-[160px] w-full" />
        ) : (
          <p className="text-[11px] text-[#7c857f]">Security details are not available from this server yet.</p>
        )
      ) : (
        <>
          <div
            className={`flex gap-[10px] rounded-[10px] border p-[12px] ${
              security.approval_enabled ? 'border-[#ddd3f3] bg-[#f6f2fd]' : 'border-[#f3e1c2] bg-[#fffaf1]'
            }`}
          >
            {security.approval_enabled ? (
              <ShieldCheck className="mt-px size-[16px] flex-shrink-0 text-[#6b46c1]" />
            ) : (
              <ShieldAlert className="mt-px size-[16px] flex-shrink-0 text-[#b06d12]" />
            )}
            <div className="min-w-0">
              <p className="text-[12px] font-semibold text-[#17211b]">
                Second-level approval is {security.approval_enabled ? 'on' : 'off'}
              </p>
              <p className="mt-[2px] text-[11px] leading-[1.5] text-[#45514a]">
                {security.approval_enabled
                  ? `Staff admins need a super admin's password for ${security.critical_actions} protected actions${
                      security.all_deletes_protected ? ' and every delete' : ''
                    }. Each approval works once and expires after ${security.approval_ttl_minutes} minutes.`
                  : 'Staff admins can run protected actions without a super admin. Set ADMIN_APPROVAL_ENABLED=true on the server to turn it back on.'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-[8px]">
            <Stat label="Approvals granted · 7d" value={security.approvals_granted_7d} />
            <Stat label="Approvals denied · 7d" value={security.approvals_denied_7d} warn />
            <Stat label="Failed sign-ins · 24h" value={security.failed_sign_ins_24h} warn />
            <Stat label="Blocked sign-ins · 24h" value={security.blocked_sign_ins_24h} warn />
          </div>

          <p className="text-[10px] text-[#7c857f]">
            {formatCount(security.super_admins)} super admin{security.super_admins === 1 ? '' : 's'} can approve protected actions.
            {security.super_admins < 2 ? ' Consider adding a second one so approvals never get stuck.' : ''}
          </p>
        </>
      )}
    </Card>
  );
}
