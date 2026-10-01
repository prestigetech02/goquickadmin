import type { ComponentType } from 'react';
import { CircleCheck, CircleDashed, CircleX, Clock3, type LucideProps } from 'lucide-react';
import type { AdminRunnerProfile, RunnerCheckState } from '@/types/api';
import { relativeAgo } from '../format';
import { Card } from '../overview/primitives';
import { watShortDate } from '../errand/errandPresentation';
import { Chip, SectionHeader } from '../errand/parts';
import { CHECK_STATES } from './presentation';

const CHECK_ICONS: Record<RunnerCheckState, { icon: ComponentType<LucideProps>; color: string }> = {
  passed: { icon: CircleCheck, color: '#167d35' },
  review: { icon: Clock3, color: '#b06d12' },
  rejected: { icon: CircleX, color: '#b84545' },
  missing: { icon: CircleDashed, color: '#9aa39d' },
};

function defaultSub(state: RunnerCheckState, at: string | null): string {
  switch (state) {
    case 'passed':
      return at ? `Verified ${watShortDate(at)}` : 'Complete';
    case 'review':
      return at ? `Submitted ${watShortDate(at)} · awaiting review` : 'Awaiting review';
    case 'rejected':
      return 'Rejected — runner needs to resubmit';
    default:
      return 'Not submitted yet';
  }
}

export function AvailabilityCard({
  profile,
  onTakeOffline,
}: {
  profile: AdminRunnerProfile;
  onTakeOffline: () => void;
}) {
  const { runner } = profile;
  const blocked = runner.is_suspended || runner.deleted_at != null;
  const online = runner.is_online && !blocked;
  const statusLine = online
    ? `Online · last location ${relativeAgo(runner.last_location_at)}`
    : blocked
      ? 'Access paused — runner cannot go online'
      : `Offline · last seen ${relativeAgo(runner.last_seen_at ?? runner.last_location_at)}`;

  return (
    <Card className="flex w-full flex-col gap-[13px] p-[18px]">
      <SectionHeader title="Availability & onboarding" subtitle="Workforce status and compliance" />
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-[2px]">
          <p className="text-[11px] font-semibold text-[#17211b]">Available for errands</p>
          <p className={`truncate text-[9px] ${online ? 'text-[#167d35]' : 'text-[#7c857f]'}`}>{statusLine}</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={online}
          aria-label={online ? 'Set runner offline' : 'Runner is offline'}
          disabled={!online}
          title={online ? 'Set offline — the runner stops receiving errands' : 'Runners go online themselves from the app'}
          onClick={onTakeOffline}
          className={`relative h-[22px] w-[50px] flex-shrink-0 rounded-full transition-colors disabled:cursor-not-allowed ${
            online ? 'bg-[#8bd17c] hover:bg-[#7cc66c]' : 'bg-[#dfe5e0]'
          }`}
        >
          <span
            className={`absolute top-[2px] size-[18px] rounded-full bg-white shadow-[0_1px_3px_rgba(16,33,23,0.25)] transition-all ${
              online ? 'left-[30px]' : 'left-[2px]'
            }`}
          />
        </button>
      </div>
      <div className="h-px w-full bg-[#e2e8e3]" />
      {profile.onboarding.map((check) => {
        const { icon: Icon, color } = CHECK_ICONS[check.state];
        const state = CHECK_STATES[check.state];
        return (
          <div key={check.key} className="flex items-center gap-[9px]">
            <Icon className="size-[15px] flex-shrink-0" strokeWidth={1.8} color={color} />
            <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
              <p className="text-[10px] font-semibold text-[#17211b]">{check.label}</p>
              <p className="truncate text-[9px] text-[#7c857f]" title={check.detail ?? undefined}>
                {check.detail ?? defaultSub(check.state, check.at)}
              </p>
            </div>
            <Chip tone={state.tone} label={state.label} />
          </div>
        );
      })}
    </Card>
  );
}
