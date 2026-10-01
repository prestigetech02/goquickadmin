import { useEffect, useState, type ComponentType } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock3, House, Package, ShoppingBag, type LucideProps } from 'lucide-react';
import { getAdmin2ErrandHref } from '@/lib/adminNavigation';
import type { AdminRunnerProfile } from '@/types/api';
import { formatNaira } from '../format';
import { Card } from '../overview/primitives';
import {
  categoryLabel,
  durationLabel,
  minutesUntil,
  splitAddress,
  stageLabel,
  statusTone,
  watTime,
} from '../errand/errandPresentation';
import { Chip, SectionHeader, SectionLink } from '../errand/parts';
import { distanceLabel } from './presentation';

const HEADING_TO_PICKUP = ['pending', 'searching', 'accepted', 'on_my_way'];

function categoryIcon(category: string | null): ComponentType<LucideProps> {
  if (category === 'shopping') return ShoppingBag;
  if (category === 'queue') return Clock3;
  if (category === 'domestic') return House;
  return Package;
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
      <p className="text-[10px] text-[#7c857f]">{label}</p>
      <p className="truncate text-[12px] font-semibold text-[#17211b]">{value}</p>
    </div>
  );
}

function useMinuteClock(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}

export function ActiveErrandCard({
  profile,
  onAssign,
  canAssign,
}: {
  profile: AdminRunnerProfile;
  onAssign: () => void;
  canAssign: boolean;
}) {
  const navigate = useNavigate();
  const now = useMinuteClock();
  const errand = profile.active_errand;

  if (!errand) {
    return (
      <Card className="flex w-full flex-col gap-[14px] p-[18px]">
        <SectionHeader title="Active errand" subtitle="Live assignment and SLA health" />
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[8px] border border-dashed border-[#d4ddd6] bg-[#fbfcfb] p-[14px]">
          <p className="text-[11px] text-[#45514a]">
            No errand in progress. {profile.runner.name} is {profile.runner.is_online ? 'online and available' : 'offline'}.
          </p>
          {canAssign ? <SectionLink onClick={onAssign}>Assign an errand</SectionLink> : null}
        </div>
      </Card>
    );
  }

  const Icon = categoryIcon(errand.category);
  const remaining = minutesUntil(errand.sla.due_at, now);
  const slaColor = remaining == null ? '#7c857f' : remaining < 0 ? '#b84545' : remaining <= 30 ? '#b06d12' : '#167d35';
  const slaValue = remaining == null ? '—' : remaining < 0 ? `${durationLabel(remaining)} late` : durationLabel(remaining);
  const tracking = {
    healthy: { text: 'Tracking normally', color: '#167d35' },
    stale: { text: 'Location is stale', color: '#b06d12' },
    none: { text: 'No live location', color: '#7c857f' },
  }[errand.tracking];

  const toPickup = HEADING_TO_PICKUP.includes(errand.status);
  const targetDistance = toPickup ? errand.to_pickup_m ?? errand.to_dropoff_m : errand.to_dropoff_m ?? errand.to_pickup_m;
  const targetLabel = toPickup && errand.to_pickup_m != null ? 'pickup' : 'drop-off';
  const location = targetDistance != null ? `${distanceLabel(targetDistance)} from ${targetLabel}` : 'No live location';
  const acceptedFor = errand.accepted_at ? Math.max(0, -1 * (minutesUntil(errand.accepted_at, now) ?? 0)) : null;
  const route = [splitAddress(errand.pickup_address).title, splitAddress(errand.dropoff_address).title]
    .filter((part) => part !== 'No address provided')
    .join(' → ');

  return (
    <Card className="flex w-full flex-col gap-[14px] p-[18px]">
      <SectionHeader
        title="Active errand"
        subtitle="Live assignment and SLA health"
        action={<SectionLink onClick={() => navigate(getAdmin2ErrandHref(errand.id))}>Open {errand.code}</SectionLink>}
      />
      <div className="flex flex-wrap items-center gap-[14px] rounded-[8px] border border-[#e2e8e3] bg-[#f3faf5] p-[14px] sm:flex-nowrap">
        <span className="flex size-[42px] flex-shrink-0 items-center justify-center rounded-[8px] bg-[#eaf6ed]">
          <Icon className="size-[19px]" strokeWidth={1.8} color="#167d35" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-[4px]">
          <div className="flex flex-wrap items-center gap-[8px]">
            <p className="text-[12px] font-bold text-[#17211b]">{errand.code}</p>
            <Chip tone={statusTone(errand.status)} label={stageLabel(errand.status, errand.category)} dot />
          </div>
          <p className="truncate text-[11px] font-semibold text-[#45514a]">
            {errand.title?.trim() || categoryLabel(errand.category)}
            {errand.requester ? ` · ${errand.requester.name}` : ''}
          </p>
          <p className="truncate text-[10px] text-[#7c857f]">
            {route || 'No route details'}
            {errand.distance_km != null ? ` · ${errand.distance_km} km` : ''}
          </p>
        </div>
        <div className="flex w-[110px] flex-shrink-0 flex-col gap-[4px]">
          <p className="text-[9px] uppercase text-[#7c857f]">{errand.sla.basis === 'deadline' ? 'Deadline' : 'SLA remaining'}</p>
          <p className="text-[18px] font-bold" style={{ color: slaColor }}>
            {slaValue}
          </p>
          <p className="text-[9px]" style={{ color: tracking.color }}>
            {tracking.text}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-[18px]">
        <Detail
          label="Accepted"
          value={errand.accepted_at ? `${watTime(errand.accepted_at)} · ${durationLabel(acceptedFor ?? 0)} ago` : 'Not yet accepted'}
        />
        <Detail label="Current location" value={location} />
        <Detail
          label="Runner earning"
          value={errand.earning != null ? `${formatNaira(errand.earning)}${errand.earning_estimated ? ' est.' : ''}` : '—'}
        />
      </div>
    </Card>
  );
}
