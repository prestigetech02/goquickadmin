import { Fragment } from 'react';
import { Navigation } from 'lucide-react';
import type { AdminErrandView } from '@/types/api';
import { Card } from '../overview/primitives';
import { categoryLabel, durationLabel, mapHref, minutesUntil, splitAddress, watTime } from './errandPresentation';
import { SectionHeader, SectionLink } from './parts';

type Stop = { marker: string; tone: { bg: string; color: string }; label: string; address: string | null; note: string | null };

function trackingPill(view: AdminErrandView): { text: string; bg: string; color: string } {
  const { errand, runner } = view;
  if (!errand.is_active) return { text: 'Errand is no longer in progress', bg: '#f1f4f2', color: '#45514a' };
  if (!runner) return { text: 'Tracking starts once a runner is assigned', bg: '#f1f4f2', color: '#45514a' };
  if (runner.tracking === 'healthy') return { text: 'Live tracking is healthy', bg: '#eaf6ed', color: '#0d5e27' };
  if (runner.tracking === 'stale') {
    return { text: `GPS stale · last ping ${watTime(runner.location?.updated_at)}`, bg: '#fff5e5', color: '#b06d12' };
  }
  return { text: 'Runner is not sharing location', bg: '#fdeded', color: '#b84545' };
}

export function RouteServiceCard({ view, now }: { view: AdminErrandView; now: number }) {
  const { route, sla, errand, items, requester } = view;
  const stops: Stop[] = [];
  if (route.pickup.address) {
    stops.push({
      marker: 'A',
      tone: { bg: '#eaf6ed', color: '#167d35' },
      label: errand.category === 'queue' || errand.category === 'domestic' ? 'LOCATION' : 'PICKUP',
      address: route.pickup.address,
      note: null,
    });
  }
  if (route.dropoff.address) {
    stops.push({
      marker: stops.length ? 'B' : 'A',
      tone: { bg: '#eef5fb', color: '#2c73b9' },
      label: sla.due_at && errand.is_active ? `DELIVERY · ETA ${watTime(sla.due_at)}` : 'DELIVERY',
      address: route.dropoff.address,
      note: requester ? `Deliver to ${requester.name}${requester.phone ? ` · ${requester.phone}` : ''}` : null,
    });
  }

  const remaining = errand.is_active ? minutesUntil(sla.due_at, now) : null;
  const pill = trackingPill(view);
  const serviceLine = [
    errand.type === 'scheduled' ? `Scheduled ${watTime(errand.scheduled_at)}` : 'Instant',
    items.list.length ? `${items.list.length} item${items.list.length === 1 ? '' : 's'}` : null,
    items.expected_wait_minutes ? `~${items.expected_wait_minutes} min wait` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Card className="flex w-full flex-col gap-[16px] p-[18px]">
      <SectionHeader
        title="Route & service"
        subtitle="Live operational context for this errand"
        action={<SectionLink href={mapHref(view)}>Open live map ↗</SectionLink>}
      />
      <div className="flex w-full flex-col gap-[18px] md:flex-row md:items-start">
        <div className="flex min-w-0 flex-1 flex-col">
          {stops.length === 0 ? <p className="text-[11px] text-[#7c857f]">No route details were provided.</p> : null}
          {stops.map((stop, index) => {
            const address = splitAddress(stop.address);
            return (
              <Fragment key={stop.marker}>
                {index > 0 ? (
                  <div className="flex h-[34px] pl-[13px]">
                    <div className="h-full w-[2px] bg-[#d4ddd6]" />
                  </div>
                ) : null}
                <div className="flex w-full gap-[12px]">
                  <span
                    className="flex size-[28px] flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                    style={{ backgroundColor: stop.tone.bg, color: stop.tone.color }}
                  >
                    {stop.marker}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
                    <p className="text-[10px] text-[#7c857f]">{stop.label}</p>
                    <p className="text-[13px] text-[#17211b]">{address.title}</p>
                    {address.rest ? <p className="text-[11px] text-[#45514a]">{address.rest}</p> : null}
                    {stop.note ? <p className="text-[10px] text-[#7c857f]">{stop.note}</p> : null}
                  </div>
                </div>
              </Fragment>
            );
          })}
        </div>
        <div className="flex w-full flex-col gap-[12px] rounded-[8px] bg-[#f8faf8] p-[14px] md:w-[246px] md:flex-shrink-0">
          <div className="flex flex-col gap-[3px]">
            <p className="text-[10px] text-[#7c857f]">Service</p>
            <p className="text-[12px] font-semibold text-[#17211b]">{categoryLabel(errand.category)}</p>
            <p className="text-[10px] leading-[1.4] text-[#45514a]">{serviceLine}</p>
          </div>
          <div className="h-px w-full bg-[#e2e8e3]" />
          <div className="flex gap-[12px]">
            <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
              <p className="text-[10px] text-[#7c857f]">Distance</p>
              <p className="text-[12px] font-semibold text-[#17211b]">{route.distance_km != null ? `${route.distance_km} km` : '—'}</p>
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
              <p className="text-[10px] text-[#7c857f]">{remaining != null ? 'SLA remaining' : 'Est. duration'}</p>
              <p className={`text-[12px] font-semibold ${remaining != null && remaining < 0 ? 'text-[#b84545]' : 'text-[#17211b]'}`}>
                {remaining != null
                  ? remaining < 0
                    ? `${durationLabel(remaining)} over`
                    : durationLabel(remaining)
                  : route.duration_min != null
                    ? durationLabel(route.duration_min)
                    : '—'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-[7px] rounded-[6px] px-[10px] py-[8px]" style={{ backgroundColor: pill.bg }}>
            <Navigation className="size-[14px] flex-shrink-0" strokeWidth={1.8} color={pill.color} />
            <p className="text-[10px] font-semibold" style={{ color: pill.color }}>
              {pill.text}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
