import { relativeAgo } from '../format';
import type { SettingsLastChange } from '@/types/api';

export type SettingsSectionId = 'pricing' | 'fare-rules' | 'referrals' | 'operations' | 'payouts' | 'categories' | 'zones' | 'security' | 'integrations';

export const FIELD =
  'h-[36px] w-full rounded-[8px] border border-[#d4ddd6] bg-white px-[11px] text-[12px] text-[#17211b] outline-none placeholder:text-[#7c857f] focus:border-[#167d35] disabled:bg-[#f6f8f6] disabled:text-[#7c857f]';

export function lastChangeText(change: SettingsLastChange | null | undefined): string {
  if (!change?.updated_at) return 'Using default values';
  return `Last changed ${relativeAgo(change.updated_at)}${change.updated_by ? ` by ${change.updated_by}` : ''}`;
}

export function latestChange(changes: Array<SettingsLastChange | null | undefined>): SettingsLastChange | null {
  return changes
    .filter((c): c is SettingsLastChange => Boolean(c?.updated_at))
    .sort((a, b) => Date.parse(b.updated_at as string) - Date.parse(a.updated_at as string))[0] ?? null;
}

export function sameValues<T extends object>(a: T, b: T): boolean {
  return (Object.keys(a) as Array<keyof T>).every((key) => a[key] === b[key]);
}
