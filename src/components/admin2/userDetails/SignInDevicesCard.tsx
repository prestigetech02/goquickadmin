import { useState } from 'react';
import { AppWindow, HelpCircle, Monitor, Smartphone, Tablet } from 'lucide-react';
import type { AdminUserLogin, LoginDeviceType } from '@/types/api';
import { Card } from '../overview/primitives';
import { Chip, SectionHeader } from '../errand/parts';
import { GREEN, whenLabel } from './presentation';

const VISIBLE = 4;

const ICONS: Record<LoginDeviceType, typeof Monitor> = {
  app: AppWindow,
  desktop: Monitor,
  mobile: Smartphone,
  tablet: Tablet,
  other: HelpCircle,
};

function spreadLabel(logins: AdminUserLogin[]): string | null {
  const ips = new Set(logins.map((l) => l.ip_address).filter(Boolean));
  const countries = new Set(logins.map((l) => l.country_code).filter(Boolean));
  if (ips.size === 0) return null;
  const parts = [`${ips.size} ${ips.size === 1 ? 'IP address' : 'IP addresses'}`];
  if (countries.size > 0) parts.push(`${countries.size} ${countries.size === 1 ? 'country' : 'countries'}`);
  return `${parts.join(' · ')} across the last ${logins.length} sign-ins`;
}

export function SignInDevicesCard({ logins }: { logins: AdminUserLogin[] }) {
  const [showAll, setShowAll] = useState(false);
  const latest = logins[0];
  const visible = showAll ? logins : logins.slice(0, VISIBLE);
  const spread = spreadLabel(logins);

  return (
    <Card className="flex w-full flex-col gap-[13px] p-[18px]">
      <SectionHeader
        title="Sign-ins & devices"
        subtitle={
          latest
            ? `Last sign-in ${whenLabel(latest.created_at).toLowerCase()}${latest.location ? ` from ${latest.location}` : ''}`
            : 'No sign-ins recorded yet'
        }
      />
      {visible.map((login) => {
        const Icon = ICONS[login.device_type ?? 'other'] ?? HelpCircle;
        const where = [login.ip_address, login.location].filter(Boolean).join(' · ');
        return (
          <div key={login.id} className="flex items-center gap-[10px]" title={login.user_agent ?? undefined}>
            <span className="flex size-[32px] flex-shrink-0 items-center justify-center rounded-[8px] bg-[#f8faf8]">
              <Icon className="size-[14px] text-[#45514a]" strokeWidth={1.8} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
              <span className="truncate text-[10px] font-semibold text-[#17211b]">{login.device ?? login.client}</span>
              <span className="truncate font-mono text-[9px] text-[#7c857f]">{where || 'IP not recorded'}</span>
            </span>
            <span className="flex flex-shrink-0 flex-col items-end gap-[3px]">
              {login.active ? <Chip tone={GREEN} label="Signed in" /> : null}
              <span className="text-[9px] text-[#7c857f]">{whenLabel(login.created_at)}</span>
            </span>
          </div>
        );
      })}
      {logins.length > VISIBLE ? (
        <button type="button" onClick={() => setShowAll((v) => !v)} className="self-start text-[10px] font-semibold text-[#167d35] hover:underline">
          {showAll ? 'Show fewer' : `Show all ${logins.length} sign-ins`}
        </button>
      ) : null}
      {spread ? <p className="text-[10px] leading-[1.45] text-[#7c857f]">{spread}</p> : null}
    </Card>
  );
}
