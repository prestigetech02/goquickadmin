import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Copy, Gift } from 'lucide-react';
import { getAdmin2RunnerHref, getAdmin2UserHref } from '@/lib/adminNavigation';
import type { UserReferralSummary } from '@/types/api';
import { formatCount, formatNaira, personInitials } from '../format';
import { Card } from '../overview/primitives';
import { Chip, SectionHeader } from '../errand/parts';
import { watShortDate } from '../errand/errandPresentation';

const EARNED = { bg: '#eaf6ed', color: '#0d5e27' };
const PENDING = { bg: '#fff5e5', color: '#b06d12' };

function Stat({ value, label, sub }: { value: string; label: string; sub: string }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-[2px] rounded-[8px] bg-[#f8faf8] p-[10px]">
      <p className="truncate text-[16px] font-bold text-[#17211b]">{value}</p>
      <p className="text-[9px] font-medium text-[#45514a]">{label}</p>
      <p className="truncate text-[9px] text-[#7c857f]" title={sub}>
        {sub}
      </p>
    </div>
  );
}

function profileHref(id: number, role: string): string {
  return role === 'runner' ? getAdmin2RunnerHref(id) : getAdmin2UserHref(id);
}

export function ReferralsCard({ referrals }: { referrals: UserReferralSummary }) {
  const [copied, setCopied] = useState(false);
  const { code, referred_by: referrer, recent } = referrals;

  const copy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Card className="flex w-full flex-col gap-[13px] p-[18px]">
      <SectionHeader title="Referrals" subtitle="Their code, who signed up with it and what it has earned them" />

      <div className="flex items-center gap-[10px] rounded-[10px] border border-dashed border-[#b9dfc3] bg-[#f3faf5] px-[12px] py-[10px]">
        <span className="flex size-[32px] flex-shrink-0 items-center justify-center rounded-[8px] bg-white">
          <Gift className="size-[16px] text-[#167d35]" strokeWidth={1.8} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[9px] font-medium uppercase tracking-[0.3px] text-[#7c857f]">Referral code</p>
          {code ? (
            <p className="truncate font-mono text-[16px] font-bold tracking-[1px] text-[#0d5e27]">{code}</p>
          ) : (
            <p className="text-[11px] text-[#45514a]">Not created yet. It's generated when they first open their profile in the app.</p>
          )}
        </div>
        {code ? (
          <button
            type="button"
            onClick={() => void copy()}
            className="flex h-[30px] flex-shrink-0 items-center gap-[5px] rounded-[7px] border border-[#d4ddd6] bg-white px-[10px] text-[10px] font-semibold text-[#17211b] hover:bg-[#f8faf8]"
          >
            {copied ? <Check className="size-[12px] text-[#167d35]" strokeWidth={2.2} /> : <Copy className="size-[12px]" strokeWidth={1.8} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        ) : null}
      </div>

      <div className="flex gap-[8px]">
        <Stat
          value={formatCount(referrals.used_count)}
          label="Used their code"
          sub={`${formatCount(referrals.used_by.requesters)} requesters · ${formatCount(referrals.used_by.runners)} runners`}
        />
        <Stat
          value={formatNaira(referrals.earned_total)}
          label="Earned from referrals"
          sub={
            referrals.bonus_count > 0
              ? `${formatNaira(referrals.bonus_total)} from ${formatCount(referrals.bonus_count)} bonus${referrals.bonus_count === 1 ? '' : 'es'}`
              : 'No referral bonuses yet'
          }
        />
        <Stat
          value={`${formatCount(referrals.qualified_count)}`}
          label="Rewarded signups"
          sub={referrals.pending_count > 0 ? `${formatCount(referrals.pending_count)} still pending` : 'None pending'}
        />
      </div>

      {referrals.welcome_total > 0 || referrer ? (
        <p className="text-[10px] leading-[1.45] text-[#45514a]">
          {referrer ? (
            <>
              Signed up with{' '}
              <Link to={profileHref(referrer.id, referrer.role)} className="font-semibold text-[#167d35] hover:underline">
                {referrer.name}
              </Link>
              's code{referrer.code ? ` (${referrer.code})` : ''}.{' '}
            </>
          ) : null}
          {referrals.welcome_total > 0 ? `Earnings include their own ${formatNaira(referrals.welcome_total)} sign-up reward.` : null}
        </p>
      ) : null}

      <div className="flex flex-col gap-[6px]">
        <p className="text-[9px] font-semibold uppercase tracking-[0.27px] text-[#7c857f]">Recent signups with their code</p>
        {recent.length === 0 ? (
          <p className="text-[10px] text-[#7c857f]">Nobody has used this code yet.</p>
        ) : (
          recent.map((person) => {
            const earned = person.reward_status === 'earned';
            return (
              <div key={person.id} className="flex items-center gap-[9px]">
                <span className="flex size-[26px] flex-shrink-0 items-center justify-center rounded-full bg-[#eef3ef] text-[9px] font-bold text-[#45514a]">
                  {personInitials(person.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <Link
                    to={profileHref(person.id, person.role)}
                    className="block truncate text-[11px] font-semibold text-[#17211b] hover:text-[#167d35] hover:underline"
                  >
                    {person.name}
                  </Link>
                  <p className="truncate text-[9px] text-[#7c857f]">
                    {person.role === 'runner' ? 'Runner' : 'Requester'}
                    {person.joined_at ? ` · joined ${watShortDate(person.joined_at)}` : ''}
                  </p>
                </div>
                <span title={person.reward_note ?? undefined}>
                  <Chip
                    tone={earned ? EARNED : PENDING}
                    label={earned ? (person.reward_amount != null ? `+${formatNaira(person.reward_amount)}` : 'Rewarded') : 'Pending'}
                  />
                </span>
              </div>
            );
          })
        )}
        {referrals.used_count > recent.length ? (
          <p className="text-[9px] text-[#7c857f]">
            +{formatCount(referrals.used_count - recent.length)} more signups
            {referrals.last_earned_at ? ` · last referral credit ${watShortDate(referrals.last_earned_at)}` : ''}
          </p>
        ) : referrals.last_earned_at ? (
          <p className="text-[9px] text-[#7c857f]">Last referral credit {watShortDate(referrals.last_earned_at)}</p>
        ) : null}
      </div>
    </Card>
  );
}
