import type { ReactNode } from 'react';
import { Mail, Phone } from 'lucide-react';
import type { AdminUserProfile, UserAccountStatus, UserKycStatus } from '@/types/api';
import { Card } from '../overview/primitives';
import { Chip, PersonAvatar, SectionHeader, SectionLink } from '../errand/parts';
import { watDate } from '../errand/errandPresentation';
import { KYC_LABELS, KYC_TONES, ROLE_LABELS, STATUS_LABELS, STATUS_TONES, lastActiveLabel } from '../users/userPresentation';
import { GREEN, preferredContact, signInMethod } from './presentation';

function Detail({ label, value, sub }: { label: string; value: string; sub?: string | null }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
      <p className="text-[10px] text-[#7c857f]">{label}</p>
      <p className="truncate text-[12px] font-semibold text-[#17211b]">{value}</p>
      {sub ? <p className="truncate text-[10px] leading-[1.4] text-[#45514a]">{sub}</p> : null}
    </div>
  );
}

function Shortcut({ href, label, children }: { href: string | null; label: string; children: ReactNode }) {
  const className =
    'flex size-[34px] items-center justify-center rounded-[8px] border border-[#e2e8e3] bg-[#f8faf8] text-[#45514a] transition-colors';
  if (!href) {
    return (
      <span className={`${className} opacity-40`} title={`No ${label.toLowerCase()} on file`}>
        {children}
      </span>
    );
  }
  return (
    <a href={href} className={`${className} hover:border-[#167d35] hover:text-[#167d35]`} title={label} aria-label={label}>
      {children}
    </a>
  );
}

export function IdentityCard({ profile, onEdit }: { profile: AdminUserProfile; onEdit?: () => void }) {
  const { user, preferences } = profile;
  const status = user.account_status as UserAccountStatus;
  const kyc = user.kyc_status as UserKycStatus;
  const location = [user.city, user.state].filter(Boolean).join(', ');
  const idLine = [
    `${ROLE_LABELS[user.role] ?? 'User'} ID ${user.code}`,
    user.created_at ? `Joined ${watDate(user.created_at)}` : null,
    `Last active ${lastActiveLabel(user.last_active_at).toLowerCase()}`,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Card className="flex w-full flex-col gap-[16px] p-[18px]">
      <SectionHeader
        title="Identity & contact"
        subtitle="Core account information and communication preferences"
        action={onEdit ? <SectionLink onClick={onEdit}>Edit profile</SectionLink> : null}
      />
      <div className="flex items-center gap-[14px]">
        <PersonAvatar name={user.name} url={user.avatar_url} tone={GREEN} size={64} />
        <div className="flex min-w-0 flex-1 flex-col gap-[5px]">
          <div className="flex min-w-0 flex-wrap items-center gap-[8px]">
            <p className="truncate text-[16px] font-bold text-[#17211b]">{user.name}</p>
            <Chip tone={STATUS_TONES[status] ?? STATUS_TONES.inactive} label={STATUS_LABELS[status] ?? status} dot />
            <Chip tone={KYC_TONES[kyc] ?? KYC_TONES.unverified} label={KYC_LABELS[kyc] ?? kyc} />
          </div>
          <p className="truncate text-[11px] text-[#45514a]">{[user.email, user.phone].filter(Boolean).join(' · ') || 'No contact details'}</p>
          <p className="truncate text-[10px] text-[#7c857f]">{idLine}</p>
        </div>
        <div className="flex flex-shrink-0 gap-[8px]">
          <Shortcut href={user.email ? `mailto:${user.email}` : null} label="Email">
            <Mail className="size-[15px]" strokeWidth={1.8} />
          </Shortcut>
          <Shortcut href={user.phone ? `tel:${user.phone}` : null} label="Phone">
            <Phone className="size-[15px]" strokeWidth={1.8} />
          </Shortcut>
        </div>
      </div>
      <div className="h-px w-full bg-[#e2e8e3]" />
      <div className="flex flex-col gap-[14px] sm:flex-row sm:gap-[18px]">
        <Detail label="Primary location" value={location || 'Not set'} sub={user.address} />
        <Detail
          label="Preferred contact"
          value={preferredContact(profile)}
          sub={`Email updates ${preferences.email_enabled ? 'enabled' : 'turned off'}`}
        />
        <Detail
          label="Sign-in method"
          value={signInMethod(user.auth_provider)}
          sub={user.referred_by ? `Referred by ${user.referred_by.name}` : user.referral_code ? `Referral code ${user.referral_code}` : null}
        />
      </div>
    </Card>
  );
}
