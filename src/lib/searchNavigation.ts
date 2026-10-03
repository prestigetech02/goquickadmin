import {
  getAdmin2ErrandHref,
  getAdmin2RunnerHref,
  getAdmin2UserHref,
  getPageFromPathname,
  getPageHref,
  type PageKey,
} from '@/lib/adminNavigation';
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

const ADMIN2_GROUP_PAGES: Record<SearchResultGroupKey, PageKey> = {
  users: 'admin2-user',
  runners: 'admin2-runner',
  errands: 'admin2-errand',
  disputes: 'admin2-disputes',
  withdrawals: 'admin2-withdrawals',
};

export function admin2SearchGroupPage(key: SearchResultGroupKey): PageKey {
  return ADMIN2_GROUP_PAGES[key];
}

/** Admin2 destination for a search hit; the API's `url` field points at the classic pages. */
export function admin2SearchResultHref(key: SearchResultGroupKey, id: number): string {
  switch (key) {
    case 'users':
      return getAdmin2UserHref(id);
    case 'runners':
      return getAdmin2RunnerHref(id);
    case 'errands':
      return getAdmin2ErrandHref(id);
    default:
      return getPageHref(ADMIN2_GROUP_PAGES[key], { openId: id });
  }
}
