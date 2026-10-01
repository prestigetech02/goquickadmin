import { Link } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import { getAdmin2RunnerHref, getAdmin2UserHref } from '@/lib/adminNavigation';
import type { AdminErrandView } from '@/types/api';
import { formatCount, formatNaira } from '../format';
import { Card } from '../overview/primitives';
import { Chip, PersonAvatar, SectionHeader } from './parts';

const GREEN_TONE = { bg: '#eaf6ed', color: '#0d5e27' };
const BLUE_TONE = { bg: '#eef5fb', color: '#2c73b9' };

function PersonCard({
  name,
  avatarUrl,
  tone,
  role,
  contact,
  meta,
  profileHref,
}: {
  name: string;
  avatarUrl: string | null;
  tone: { bg: string; color: string };
  role: string;
  contact: string;
  meta: string;
  profileHref: string;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-[10px] rounded-[8px] bg-[#f8faf8] p-[12px]">
      <div className="flex items-center gap-[10px]">
        <PersonAvatar name={name} url={avatarUrl} tone={tone} />
        <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
          <div className="flex min-w-0 items-center gap-[7px]">
            <p className="truncate text-[12px] text-[#17211b]">{name}</p>
            <Chip tone={tone} label={role} />
          </div>
          <p className="truncate text-[10px] text-[#7c857f]">{contact || 'No contact details'}</p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 text-[10px]">
        <p className="truncate text-[#7c857f]">{meta}</p>
        <Link to={profileHref} className="flex-shrink-0 font-semibold text-[#167d35] hover:underline">
          View profile
        </Link>
      </div>
    </div>
  );
}

export function ParticipantsCard({ view, onAssignRunner }: { view: AdminErrandView; onAssignRunner?: () => void }) {
  const { requester, runner } = view;

  return (
    <Card className="flex w-full flex-col gap-[14px] p-[18px]">
      <SectionHeader title="Requester & assigned runner" subtitle="Identity and contact shortcuts" />
      <div className="flex w-full flex-col gap-[18px] md:flex-row">
        {requester ? (
          <PersonCard
            name={requester.name}
            avatarUrl={requester.avatar_url}
            tone={GREEN_TONE}
            role="Requester"
            contact={[requester.phone, requester.email].filter(Boolean).join(' · ')}
            meta={`${formatCount(requester.errands_count)} errand${requester.errands_count === 1 ? '' : 's'} · ${formatNaira(requester.lifetime_spend)} lifetime`}
            profileHref={getAdmin2UserHref(requester.id)}
          />
        ) : (
          <div className="flex flex-1 items-center rounded-[8px] bg-[#f8faf8] p-[12px] text-[11px] text-[#7c857f]">Requester account not found.</div>
        )}
        {runner ? (
          <PersonCard
            name={runner.name}
            avatarUrl={runner.avatar_url}
            tone={BLUE_TONE}
            role="Runner"
            contact={[runner.phone, runner.vehicle].filter(Boolean).join(' · ')}
            meta={`${runner.rating != null ? `${runner.rating.toFixed(2)} rating` : 'No ratings yet'} · ${formatCount(runner.completed_jobs)} completed`}
            profileHref={getAdmin2RunnerHref(runner.id)}
          />
        ) : (
          <div className="flex flex-1 flex-col items-start justify-center gap-[8px] rounded-[8px] border border-dashed border-[#d4ddd6] p-[12px]">
            <p className="text-[12px] text-[#17211b]">No runner assigned yet</p>
            <p className="text-[10px] text-[#7c857f]">The errand is waiting for a runner to accept.</p>
            {onAssignRunner ? (
              <button
                type="button"
                onClick={onAssignRunner}
                className="flex items-center gap-[6px] text-[11px] font-semibold text-[#167d35] hover:underline"
              >
                <UserPlus className="size-[13px]" /> Assign a runner
              </button>
            ) : null}
          </div>
        )}
      </div>
    </Card>
  );
}
