import { useNavigate } from 'react-router-dom';
import { ShieldCheck, ShieldX } from 'lucide-react';
import type { AdminUserProfile } from '@/types/api';
import { Card } from '../overview/primitives';
import { Chip, SectionHeader, SectionLink } from '../errand/parts';
import { RED, whenLabel } from './presentation';

export function AdminActionsCard({
  actions,
  auditLogHref,
}: {
  actions: AdminUserProfile['admin_actions'];
  auditLogHref: string | null;
}) {
  const navigate = useNavigate();

  return (
    <Card className="flex w-full flex-col gap-[13px] p-[18px]">
      <SectionHeader
        title="Admin actions"
        subtitle="Changes staff made to this account"
        action={auditLogHref ? <SectionLink onClick={() => navigate(auditLogHref)}>Full audit log</SectionLink> : null}
      />
      {actions.length === 0 ? <p className="text-[10px] text-[#7c857f]">No admin actions recorded.</p> : null}
      {actions.map((action) => {
        const Icon = action.succeeded ? ShieldCheck : ShieldX;
        return (
          <div key={action.id} className="flex items-center gap-[10px]">
            <span className="flex size-[32px] flex-shrink-0 items-center justify-center rounded-[8px] bg-[#f8faf8]">
              <Icon className="size-[14px] text-[#45514a]" strokeWidth={1.8} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
              <span className="truncate text-[10px] font-semibold text-[#17211b]">{action.label}</span>
              <span className="truncate text-[9px] text-[#7c857f]">by {action.admin_name ?? 'Unknown admin'}</span>
            </span>
            <span className="flex flex-shrink-0 flex-col items-end gap-[3px]">
              {!action.succeeded ? <Chip tone={RED} label="Failed" /> : null}
              <span className="text-[9px] text-[#7c857f]">{whenLabel(action.created_at)}</span>
            </span>
          </div>
        );
      })}
    </Card>
  );
}
