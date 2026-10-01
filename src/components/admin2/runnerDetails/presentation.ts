import type { ComponentType } from 'react';
import { Bike, Bus, Car, Footprints, type LucideProps } from 'lucide-react';
import type { AdminRunnerProfile, RunnerCheckState, RunnerVerificationState } from '@/types/api';
import { titleCase, watShortDate, type Tone } from '../errand/errandPresentation';
import { AMBER, GRAY, GREEN, RED } from '../userDetails/presentation';

export const BLUE: Tone = { bg: '#eef5fb', color: '#2c73b9' };

type Label = { label: string; tone: Tone };

export const VERIFICATION: Record<RunnerVerificationState, Label> = {
  approved: { label: 'Verified', tone: GREEN },
  pending: { label: 'KYC in review', tone: AMBER },
  rejected: { label: 'KYC rejected', tone: RED },
  not_submitted: { label: 'KYC not submitted', tone: GRAY },
};

export function presence(runner: AdminRunnerProfile['runner']): Label {
  if (runner.deleted_at) return { label: 'Closed', tone: GRAY };
  if (runner.is_suspended) return { label: 'Suspended', tone: RED };
  return runner.is_online ? { label: 'Online', tone: GREEN } : { label: 'Offline', tone: GRAY };
}

export const CHECK_STATES: Record<RunnerCheckState, Label> = {
  passed: { label: 'Passed', tone: GREEN },
  review: { label: 'In review', tone: AMBER },
  rejected: { label: 'Rejected', tone: RED },
  missing: { label: 'Missing', tone: GRAY },
};

export const DOCUMENT_STATES: Record<AdminRunnerProfile['documents'][number]['status'], Label> = {
  verified: { label: 'Verified', tone: GREEN },
  review: { label: 'In review', tone: AMBER },
  rejected: { label: 'Rejected', tone: RED },
};

export const PAYOUT_STATES: Record<string, Label> = {
  pending: { label: 'Requested', tone: AMBER },
  approved: { label: 'Approved', tone: BLUE },
  processing: { label: 'Processing', tone: BLUE },
  paid: { label: 'Paid', tone: GREEN },
  rejected: { label: 'Rejected', tone: RED },
};

export const VEHICLE_LABELS: Record<string, string> = {
  walking: 'Walking',
  bicycle: 'Bicycle',
  motorcycle: 'Motorcycle',
  car: 'Car',
  scooter: 'Scooter',
  public_transport: 'Public transport',
};

export function vehicleLabel(type: string | null): string {
  if (!type) return 'Not set';
  return VEHICLE_LABELS[type] ?? titleCase(type);
}

export function vehicleIcon(type: string | null): ComponentType<LucideProps> {
  if (type === 'car') return Car;
  if (type === 'walking') return Footprints;
  if (type === 'public_transport') return Bus;
  return Bike;
}

const SERVICE_LABELS: Record<string, string> = {
  shopping: 'Shopping',
  pickup_drop: 'Delivery',
  delivery: 'Delivery',
  queue: 'Queue',
  domestic: 'Domestic',
};

export function serviceLabel(category: string | null): string {
  if (!category) return 'Other';
  return SERVICE_LABELS[category] ?? titleCase(category);
}

export function distanceLabel(meters: number): string {
  return meters < 1000 ? `${meters} m` : `${(meters / 1000).toFixed(1)} km`;
}

/** "23–29 Sep", "28 Aug – 3 Sep", or "Up to 29 Sep" when there's no earlier payout. */
export function periodLabel(start: string | null, end: string | null): string {
  if (!end) return '—';
  const endLabel = watShortDate(end);
  if (!start) return `Up to ${endLabel}`;
  const startLabel = watShortDate(start);
  const [startDay, startMonth] = startLabel.split(' ');
  const [endDay, endMonth] = endLabel.split(' ');
  if (startLabel === endLabel) return endLabel;
  return startMonth === endMonth ? `${startDay}–${endDay} ${endMonth}` : `${startLabel} – ${endLabel}`;
}

export function starString(rating: number): string {
  const full = Math.round(rating);
  return '★'.repeat(full) + '☆'.repeat(Math.max(0, 5 - full));
}
