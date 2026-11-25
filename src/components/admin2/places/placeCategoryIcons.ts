import {
  Building2,
  Fuel,
  Hotel,
  Landmark,
  Pill,
  ShoppingBag,
  ShoppingCart,
  Store,
  Utensils,
  Wine,
  type LucideIcon,
} from 'lucide-react';

export const PLACE_CATEGORY_ICONS: Record<string, { icon: LucideIcon; label: string }> = {
  'shopping-cart': { icon: ShoppingCart, label: 'Shopping cart' },
  'shopping-bag': { icon: ShoppingBag, label: 'Shopping bag' },
  store: { icon: Store, label: 'Store' },
  pill: { icon: Pill, label: 'Pharmacy' },
  landmark: { icon: Landmark, label: 'Bank' },
  'building-2': { icon: Building2, label: 'Building' },
  fuel: { icon: Fuel, label: 'Fuel' },
  hotel: { icon: Hotel, label: 'Hotel' },
  utensils: { icon: Utensils, label: 'Food' },
  wine: { icon: Wine, label: 'Lounge' },
};

export const PLACE_CATEGORY_ICON_KEYS = Object.keys(PLACE_CATEGORY_ICONS);

export function placeCategoryIcon(key: string | null | undefined): LucideIcon {
  return (key && PLACE_CATEGORY_ICONS[key]?.icon) || Store;
}
