import type { PricingRuleItem } from '@/types/api';
import { formatNaira } from '../format';

export const SAMPLE_TRIP = { km: 5, minutes: 15 };

export const RULE_DEFAULTS = { base_fare: 500, per_km: 200, per_minute: 20, minimum_fare: 500 };

type Rates = Pick<PricingRuleItem, 'base_fare' | 'per_km' | 'per_minute' | 'surge_multiplier'>;

/** Mirrors PricingV1Service: the suggested price before errand-detail add-ons, shown as a ±10% range. */
export function estimateFare(rates: Rates, km: number, minutes: number, minimumFare = RULE_DEFAULTS.minimum_fare) {
  const raw = (rates.base_fare + km * rates.per_km + minutes * rates.per_minute) * (rates.surge_multiplier || 1);
  const base = Math.max(raw, minimumFare);
  return { base, min: base * 0.9, max: base * 1.1 };
}

export function fareRange(rates: Rates, km = SAMPLE_TRIP.km, minutes = SAMPLE_TRIP.minutes, minimumFare?: number): string {
  const { min, max } = estimateFare(rates, km, minutes, minimumFare);
  return `${formatNaira(min)}–${formatNaira(max)}`;
}

const clean = (value: string | null | undefined) => (value ?? '').trim().toLowerCase();

export function scopeKey(rule: Pick<PricingRuleItem, 'zone' | 'errand_type' | 'city'>): string {
  return [clean(rule.zone), clean(rule.errand_type), clean(rule.city)].join('|');
}

/** Active rules with the same scope as a newer active rule never apply. */
export function shadowedRuleIds(rules: PricingRuleItem[]): Set<number> {
  const newest = new Map<string, number>();
  for (const rule of rules) {
    if (!rule.is_active) continue;
    const key = scopeKey(rule);
    newest.set(key, Math.max(newest.get(key) ?? 0, rule.id));
  }
  return new Set(rules.filter((r) => r.is_active && newest.get(scopeKey(r)) !== r.id).map((r) => r.id));
}

export function isDefaultScope(rule: Pick<PricingRuleItem, 'zone' | 'errand_type' | 'city'>): boolean {
  return scopeKey(rule) === '||';
}
