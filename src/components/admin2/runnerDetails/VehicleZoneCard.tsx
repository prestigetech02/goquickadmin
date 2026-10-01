import { MapPin, MapPinOff } from 'lucide-react';
import type { AdminRunnerProfile } from '@/types/api';
import { relativeAgo } from '../format';
import { Card } from '../overview/primitives';
import { titleCase } from '../errand/errandPresentation';
import { Chip, SectionHeader, SectionLink } from '../errand/parts';
import { AMBER, GRAY } from '../userDetails/presentation';
import { BLUE, serviceLabel, vehicleIcon, vehicleLabel } from './presentation';

const NEEDS_PLATE = ['motorcycle', 'car', 'scooter'];

function Detail({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
      <p className="text-[10px] text-[#7c857f]">{label}</p>
      <p className="truncate text-[12px] font-semibold text-[#17211b]">{value}</p>
      <p className="text-[10px] leading-[1.4] text-[#45514a]">{sub}</p>
    </div>
  );
}

function zoneHealth(profile: AdminRunnerProfile): { text: string; tone: 'green' | 'amber' | 'gray'; aside: string | null } {
  const { zone, runner } = profile;
  const ping = runner.last_location_at ? relativeAgo(runner.last_location_at) : null;
  if (!runner.last_location_at) return { text: 'No location shared yet', tone: 'gray', aside: null };
  if (zone.inside === true) return { text: `Inside ${zone.assigned?.name} service zone`, tone: 'green', aside: ping };
  if (zone.inside === false) {
    return { text: `Outside ${zone.assigned?.name} · now in ${zone.current?.name ?? 'an unmapped area'}`, tone: 'amber', aside: ping };
  }
  if (zone.assigned && !zone.assigned.has_boundary) {
    return { text: `${zone.assigned.name} has no mapped boundary${zone.current ? ` · now in ${zone.current.name}` : ''}`, tone: 'gray', aside: ping };
  }
  return { text: zone.current ? `Currently in ${zone.current.name}` : 'Outside all mapped zones', tone: 'gray', aside: ping };
}

const HEALTH_STYLES = {
  green: 'bg-[#eaf6ed] text-[#0d5e27]',
  amber: 'bg-[#fff5e5] text-[#b06d12]',
  gray: 'bg-[#f1f4f2] text-[#45514a]',
};

export function VehicleZoneCard({ profile, onEdit }: { profile: AdminRunnerProfile; onEdit?: () => void }) {
  const { vehicle, zone, services } = profile;
  const Icon = vehicleIcon(vehicle.type);
  const fleet = vehicle.fleet;
  const title = fleet ? [fleet.brand, fleet.model].filter(Boolean).join(' ') || fleet.name || 'Fleet vehicle' : vehicleLabel(vehicle.type);
  const plate = fleet?.registration_number ?? vehicle.plate_number;
  const missingPlate = !fleet && vehicle.type != null && NEEDS_PLATE.includes(vehicle.type) && !vehicle.plate_number;
  const chip = missingPlate
    ? { label: 'No plate', tone: AMBER }
    : fleet
      ? { label: fleet.status ? `Fleet · ${titleCase(fleet.status)}` : 'Fleet', tone: BLUE }
      : { label: 'Own vehicle', tone: GRAY };
  const completedTotal = services.reduce((sum, s) => sum + s.count, 0);
  const health = zoneHealth(profile);
  const HealthIcon = health.tone === 'gray' ? MapPinOff : MapPin;

  return (
    <Card className="flex w-full flex-col gap-[13px] p-[18px]">
      <SectionHeader
        title="Vehicle & service zone"
        subtitle="Current dispatch configuration"
        action={onEdit ? <SectionLink onClick={onEdit}>Edit assignment</SectionLink> : null}
      />
      <div className="flex items-center gap-[10px]">
        <span className="flex size-[42px] flex-shrink-0 items-center justify-center rounded-[8px] bg-[#eef5fb]">
          <Icon className="size-[19px]" strokeWidth={1.8} color="#2c73b9" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
          <p className="truncate text-[11px] text-[#17211b]">{title}</p>
          <p className="truncate text-[10px] text-[#7c857f]">
            {[fleet ? vehicleLabel(vehicle.type) : null, plate ?? (vehicle.type && NEEDS_PLATE.includes(vehicle.type) ? null : 'No plate needed')]
              .filter(Boolean)
              .join(' · ') || 'No plate on file'}
          </p>
        </div>
        <Chip tone={chip.tone} label={chip.label} />
      </div>
      <div className="h-px w-full bg-[#e2e8e3]" />
      <div className="flex gap-[14px]">
        <Detail
          label="Primary zone"
          value={zone.assigned?.name ?? zone.area ?? 'Not set'}
          sub={zone.assigned
            ? zone.assigned.active ? 'Active service zone' : 'Zone is inactive'
            : zone.area ? 'Not matched to a service zone' : "Runner hasn't chosen an area"}
        />
        <Detail
          label="Services"
          value={services.length ? services.map((s) => serviceLabel(s.category)).join(' · ') : 'None yet'}
          sub={completedTotal > 0 ? `From ${completedTotal} completed ${completedTotal === 1 ? 'errand' : 'errands'}` : 'No completed errands'}
        />
      </div>
      <div className={`flex items-center gap-[8px] rounded-[6px] p-[10px] ${HEALTH_STYLES[health.tone]}`}>
        <HealthIcon className="size-[14px] flex-shrink-0" strokeWidth={1.8} />
        <p className="min-w-0 flex-1 truncate text-[10px] font-semibold">{health.text}</p>
        {health.aside ? <p className="flex-shrink-0 text-[9px]">{health.aside}</p> : null}
      </div>
    </Card>
  );
}
