import { getPageFromPathname, type PageKey } from '@/lib/adminNavigation';
import type { GlobalSearchData } from '@/types/api';

export type SearchResultGroupKey = keyof GlobalSearchData;

export const SEARCH_GROUP_LABELS: Record<SearchResultGroupKey, string> = {
  users: 'Users',
  runners: 'Runners',
  errands: 'Errands',
  disputes: 'Disputes',
  withdrawals: 'Payments',
};

export function parseSearchResultUrl(url: string): { page: PageKey; openId?: number } | null {
  try {
    const parsed = new URL(url, 'http://admin.local');
    const page = getPageFromPathname(parsed.pathname);
    if (!page) return null;

    const openParam = parsed.searchParams.get('open');
    const openId = openParam ? Number(openParam) : undefined;

    return {
      page,
      openId: openId != null && Number.isFinite(openId) ? openId : undefined,
    };
  } catch {
    return null;
  }
}

export function searchGroupPage(key: SearchResultGroupKey): PageKey {
  return key === 'withdrawals' ? 'payments' : key;
}
