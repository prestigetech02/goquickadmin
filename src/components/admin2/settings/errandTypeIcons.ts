import { Clock, FileText, Gift, House, Package, Pill, Puzzle, Route, ShoppingCart, Truck, Utensils, Wrench, type LucideIcon } from 'lucide-react';

/** Mirrors the icon keys the requester app can draw (ErrandTypeCatalog::ICONS). */
export const ERRAND_TYPE_ICONS: Record<string, { icon: LucideIcon; label: string }> = {
  'shopping-cart': { icon: ShoppingCart, label: 'Shopping cart' },
  route: { icon: Route, label: 'Route' },
  clock: { icon: Clock, label: 'Clock' },
  'puzzle-piece': { icon: Puzzle, label: 'Puzzle piece' },
  truck: { icon: Truck, label: 'Truck' },
  home: { icon: House, label: 'Home' },
  package: { icon: Package, label: 'Package' },
  pill: { icon: Pill, label: 'Pill' },
  utensils: { icon: Utensils, label: 'Food' },
  document: { icon: FileText, label: 'Document' },
  gift: { icon: Gift, label: 'Gift' },
  wrench: { icon: Wrench, label: 'Tools' },
};

export function errandTypeIcon(key: string | null): LucideIcon {
  return (key && ERRAND_TYPE_ICONS[key]?.icon) || Puzzle;
}

export const DROPOFF_LABELS: Record<'required' | 'optional' | 'none', string> = {
  required: 'Pickup and drop-off',
  optional: 'Drop-off optional',
  none: 'One location, no drop-off',
};
