import type { UserAccountStatus, UserKycStatus } from '@/types/api';
import {
  GRAY,
  KYC_LABELS,
  KYC_TONES,
  ROLE_LABELS,
  ROLE_TONES,
  STATUS_LABELS,
  STATUS_TONES,
  type Tone,
} from './userPresentation';

function Pill({ tone, label, dot = false }: { tone: Tone; label: string; dot?: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-[5px] whitespace-nowrap rounded-full px-[8px] py-[4px] text-[10px] font-semibold leading-none"
      style={{ backgroundColor: tone.bg, color: tone.color }}
    >
      {dot ? <span className="size-[5px] rounded-full" style={{ backgroundColor: tone.color }} /> : null}
      {label}
    </span>
  );
}

export function RoleBadge({ role }: { role: string }) {
  return <Pill tone={ROLE_TONES[role] ?? GRAY} label={ROLE_LABELS[role] ?? role} />;
}

export function StatusBadge({ status }: { status: UserAccountStatus }) {
  return <Pill tone={STATUS_TONES[status]} label={STATUS_LABELS[status]} dot />;
}

export function KycBadge({ status }: { status: UserKycStatus }) {
  return <Pill tone={KYC_TONES[status]} label={KYC_LABELS[status]} />;
}
