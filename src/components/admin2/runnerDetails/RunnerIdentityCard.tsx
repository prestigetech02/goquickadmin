import type { AdminRunnerProfile } from '@/types/api';
import { Card } from '../overview/primitives';
import { watDate } from '../errand/errandPresentation';
import { PersonAvatar, SectionHeader, SectionLink } from '../errand/parts';
import { BLUE } from './presentation';

function Detail({ label, value, sub }: { label: string; value: string; sub?: string | null }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
      <p className="text-[10px] text-[#7c857f]">{label}</p>
      <p className="break-words text-[12px] font-semibold text-[#17211b]">{value}</p>
      {sub ? <p className="text-[10px] leading-[1.4] text-[#45514a]">{sub}</p> : null}
    </div>
  );
}

export function RunnerIdentityCard({ profile, onEdit }: { profile: AdminRunnerProfile; onEdit?: () => void }) {
  const { runner, emergency_contact: contact } = profile;
  const contactLine = contact ? [contact.name, contact.phone].filter(Boolean).join(' · ') : null;

  return (
    <Card className="flex w-full flex-col gap-[14px] p-[18px]">
      <SectionHeader
        title="Identity & contact"
        subtitle="Runner account and emergency details"
        action={onEdit ? <SectionLink onClick={onEdit}>Edit</SectionLink> : null}
      />
      <div className="flex items-center gap-[12px]">
        <PersonAvatar name={runner.name} url={runner.avatar_url} tone={BLUE} size={56} />
        <div className="flex min-w-0 flex-1 flex-col gap-[4px]">
          <p className="truncate text-[15px] font-bold text-[#17211b]">{runner.name}</p>
          {runner.phone ? (
            <a href={`tel:${runner.phone}`} className="truncate text-[10px] text-[#45514a] hover:underline">
              {runner.phone}
            </a>
          ) : (
            <p className="text-[10px] text-[#7c857f]">No phone number</p>
          )}
          {runner.email ? (
            <a href={`mailto:${runner.email}`} className="truncate text-[10px] text-[#7c857f] hover:underline">
              {runner.email}
            </a>
          ) : null}
        </div>
      </div>
      <div className="h-px w-full bg-[#e2e8e3]" />
      <div className="flex gap-[14px]">
        <Detail label="Runner ID" value={runner.code} />
        <Detail label="Joined" value={watDate(runner.created_at)} />
      </div>
      <Detail
        label="Emergency contact"
        value={contactLine || 'Not provided'}
        sub={contact?.address ?? (contact ? null : 'Collected during KYC as next of kin')}
      />
    </Card>
  );
}
