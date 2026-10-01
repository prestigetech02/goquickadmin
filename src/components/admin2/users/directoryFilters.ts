import type { ListQueryParams } from '@/types/api';
import { toDateString } from '../format';
import type { FilterOption } from './FilterDropdown';

export type RoleFilter = 'all' | 'buyer' | 'runner' | 'admin';
export type StatusFilter = 'all' | 'active' | 'inactive' | 'suspended';
export type KycFilter = 'all' | 'verified' | 'pending' | 'needs_review' | 'unverified';
export type JoinedFilter = 'any' | 'last_7' | 'last_30' | 'last_90' | 'this_year';

export type DirectoryFilters = {
  role: RoleFilter;
  status: StatusFilter;
  kyc: KycFilter;
  city: string;
  joined: JoinedFilter;
};

export const DEFAULT_FILTERS: DirectoryFilters = { role: 'all', status: 'all', kyc: 'all', city: 'all', joined: 'any' };

export const ROLE_OPTIONS: Array<{ value: RoleFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'buyer', label: 'Requester' },
  { value: 'runner', label: 'Runner' },
  { value: 'admin', label: 'Admin' },
];

export const STATUS_OPTIONS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'suspended', label: 'Suspended' },
];

export const KYC_OPTIONS: Array<{ value: KycFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'verified', label: 'Verified' },
  { value: 'pending', label: 'Pending' },
  { value: 'needs_review', label: 'Needs review' },
  { value: 'unverified', label: 'Unverified' },
];

export const JOINED_OPTIONS: Array<{ value: JoinedFilter; label: string }> = [
  { value: 'any', label: 'Any date' },
  { value: 'last_7', label: 'Last 7 days' },
  { value: 'last_30', label: 'Last 30 days' },
  { value: 'last_90', label: 'Last 90 days' },
  { value: 'this_year', label: 'This year' },
];

export function cityOptions(cities: string[] | undefined): FilterOption[] {
  return [{ value: 'all', label: 'All cities' }, ...(cities ?? []).map((city) => ({ value: city, label: city }))];
}

function joinedFrom(joined: JoinedFilter): string | undefined {
  const today = new Date();
  const daysBack = { last_7: 6, last_30: 29, last_90: 89 } as Partial<Record<JoinedFilter, number>>;
  if (joined === 'this_year') return `${today.getFullYear()}-01-01`;
  const back = daysBack[joined];
  if (back == null) return undefined;
  const from = new Date(today);
  from.setDate(today.getDate() - back);
  return toDateString(from);
}

export function filtersToParams(filters: DirectoryFilters, search: string): ListQueryParams {
  const params: ListQueryParams = {};
  if (search.trim()) params.search = search.trim();
  if (filters.role !== 'all') params.role = filters.role;
  if (filters.status !== 'all') params.status = filters.status;
  if (filters.kyc !== 'all') params.kyc = filters.kyc;
  if (filters.city !== 'all') params.city = filters.city;
  const from = joinedFrom(filters.joined);
  if (from) params.joined_from = from;
  return params;
}

const labelOf = <T extends string>(options: Array<{ value: T; label: string }>, value: T) =>
  options.find((option) => option.value === value)?.label ?? value;

export type FilterChip = { key: keyof DirectoryFilters; label: string };

export function activeChips(filters: DirectoryFilters): FilterChip[] {
  const chips: FilterChip[] = [];
  if (filters.role !== 'all') chips.push({ key: 'role', label: `Role: ${labelOf(ROLE_OPTIONS, filters.role)}` });
  if (filters.status !== 'all') chips.push({ key: 'status', label: `Status: ${labelOf(STATUS_OPTIONS, filters.status)}` });
  if (filters.kyc !== 'all') chips.push({ key: 'kyc', label: `KYC: ${labelOf(KYC_OPTIONS, filters.kyc)}` });
  if (filters.city !== 'all') chips.push({ key: 'city', label: `City: ${filters.city}` });
  if (filters.joined !== 'any') chips.push({ key: 'joined', label: `Joined: ${labelOf(JOINED_OPTIONS, filters.joined)}` });
  return chips;
}
