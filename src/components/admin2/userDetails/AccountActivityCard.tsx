import { BadgeCheck, LogIn, Smartphone, UserPlus, UserX } from 'lucide-react';
import type { AdminUserProfile } from '@/types/api';
import { Card } from '../overview/primitives';
import { SectionHeader, SectionLink } from '../errand/parts';
import { whenLabel } from './presentation';

const ICONS = {
  session: Smartphone,
  login: LogIn,
  verified: BadgeCheck,
  suspended: UserX,
  created: UserPlus,
} as const;

function timeLabel(kind: string, iso: string): string {
  if (kind === 'session' && Date.now() - new Date(iso).getTime() < 2 * 60_000) return 'Now';
  return whenLabel(iso);
}

export function AccountActivityCard({ profile, onSignOut }: { profile: AdminUserProfile; onSignOut?: () => void }) {
  const { activity, sessions } = profile;

  return (
    <Card className="flex w-full flex-col gap-[13px] p-[18px]">
      <SectionHeader
        title="Account activity"
        subtitle={sessions.length ? `${sessions.length} signed-in ${sessions.length === 1 ? 'session' : 'sessions'}` : 'Not signed in on any device'}
        action={onSignOut ? (
          <SectionLink onClick={onSignOut} disabled={sessions.length === 0}>
            Sign out everywhere
          </SectionLink>
        ) : null}
      />
      {activity.length === 0 ? <p className="text-[10px] text-[#7c857f]">No account activity recorded.</p> : null}
      {activity.map((event, index) => {
        const Icon = ICONS[event.kind] ?? LogIn;
        return (
          <div key={`${event.kind}-${event.at}-${index}`} className="flex items-center gap-[10px]">
            <span className="flex size-[32px] flex-shrink-0 items-center justify-center rounded-[8px] bg-[#f8faf8]">
              <Icon className="size-[14px] text-[#45514a]" strokeWidth={1.8} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
              <span className="truncate text-[10px] font-semibold text-[#17211b]">{event.title}</span>
              {event.detail ? <span className="truncate text-[9px] text-[#7c857f]">{event.detail}</span> : null}
            </span>
            <span className="flex-shrink-0 text-[9px] text-[#7c857f]">{timeLabel(event.kind, event.at)}</span>
          </div>
        );
      })}
    </Card>
  );
}
