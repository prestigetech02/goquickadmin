import { CircleAlert, CircleCheck, CircleDashed, CircleX } from 'lucide-react';
import type { AdminUserProfile } from '@/types/api';
import { Card } from '../overview/primitives';
import { watDate } from '../errand/errandPresentation';
import { Chip, SectionHeader } from '../errand/parts';
import { AMBER, GRAY, GREEN, HEALTH_LEVELS, RED } from './presentation';

type CheckState = 'pass' | 'pending' | 'fail' | 'neutral';

const CHECK_ICONS = {
  pass: { Icon: CircleCheck, color: '#167d35' },
  pending: { Icon: CircleAlert, color: '#b06d12' },
  fail: { Icon: CircleX, color: '#b84545' },
  neutral: { Icon: CircleDashed, color: '#a3aba6' },
} as const;

function Check({ state, label }: { state: CheckState; label: string }) {
  const { Icon, color } = CHECK_ICONS[state];
  return (
    <div className="flex items-center gap-[8px]">
      <Icon className="size-[14px] flex-shrink-0" strokeWidth={1.8} color={color} />
      <p className="min-w-0 flex-1 truncate text-[10px] text-[#45514a]">{label}</p>
    </div>
  );
}

function identityCheck(identity: string): { state: CheckState; label: string } {
  switch (identity) {
    case 'approved':
      return { state: 'pass', label: 'Identity matched' };
    case 'pending':
      return { state: 'pending', label: 'Identity check pending' };
    case 'rejected':
      return { state: 'fail', label: 'Identity check rejected' };
    case 'not_submitted':
      return { state: 'fail', label: 'No identity documents' };
    default:
      return { state: 'neutral', label: 'Identity check not required' };
  }
}

function accessState(user: AdminUserProfile['user']) {
  if (user.deleted_at) return { sub: `Deleted ${watDate(user.deleted_at)}`, label: 'Deleted', tone: GRAY };
  if (user.is_suspended) return { sub: user.suspended_at ? `Suspended ${watDate(user.suspended_at)}` : 'Suspended by an admin', label: 'Suspended', tone: RED };
  if (user.deactivated_at) return { sub: `Deactivated ${watDate(user.deactivated_at)}`, label: 'Deactivated', tone: AMBER };
  return { sub: 'No sign-in restrictions', label: 'Active', tone: GREEN };
}

export function VerificationCard({ profile }: { profile: AdminUserProfile }) {
  const { verification, health, preferences, user } = profile;
  const level = HEALTH_LEVELS[health.level];
  const identity = identityCheck(verification.identity);
  const access = accessState(user);
  const pushOn = preferences.push_enabled && preferences.has_push_device;

  return (
    <Card className="flex w-full flex-col gap-[14px] p-[18px]">
      <SectionHeader title="Verification & account" subtitle="Identity and access health" />
      <div className="flex items-start gap-[10px]">
        <div
          className="flex size-[84px] flex-shrink-0 flex-col items-center justify-center rounded-full"
          style={{ backgroundColor: level.tone.bg, color: level.tone.color }}
          title={health.factors.length ? health.factors.join(' · ') : 'No risk signals'}
        >
          <p className="text-[22px] font-bold leading-none">{health.score}</p>
          <p className="mt-[3px] text-[9px]">{level.label}</p>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-[8px]">
          <Check state={verification.email_verified ? 'pass' : user.email ? 'fail' : 'neutral'} label={verification.email_verified ? 'Email verified' : user.email ? 'Email not verified' : 'No email on file'} />
          <Check state={verification.phone_verified ? 'pass' : user.phone ? 'fail' : 'neutral'} label={verification.phone_verified ? 'Phone verified' : user.phone ? 'Phone not verified' : 'No phone on file'} />
          <Check state={identity.state} label={identity.label} />
          <Check
            state={verification.payment_method ? 'pass' : 'neutral'}
            label={verification.payment_method ? `Saved card · ${verification.payment_method.label}` : 'No saved card'}
          />
        </div>
      </div>
      <div className="h-px w-full bg-[#e2e8e3]" />
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-[2px]">
          <p className="text-[11px] font-semibold text-[#17211b]">Push notifications</p>
          <p className="truncate text-[9px] text-[#7c857f]">
            {preferences.has_push_device ? (preferences.push_enabled ? 'Device registered' : 'Turned off by the user') : 'No device registered'}
          </p>
        </div>
        <Chip tone={pushOn ? GREEN : GRAY} label={pushOn ? 'On' : 'Off'} dot />
      </div>
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-[2px]">
          <p className="text-[11px] font-semibold text-[#17211b]">Account access</p>
          <p className="truncate text-[9px] text-[#7c857f]">{access.sub}</p>
        </div>
        <Chip tone={access.tone} label={access.label} dot />
      </div>
    </Card>
  );
}
