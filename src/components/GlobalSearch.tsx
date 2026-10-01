import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { fetchAdminGlobalSearch } from '@/api/adminSearchApi';
import { useAuth } from '@/context/AuthContext';
import { useAdminNavigate } from '@/context/AdminNavigationContext';
import { canAccessPage } from '@/lib/adminAccess';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import { queryKeys } from '@/lib/queryKeys';
import {
  parseSearchResultUrl,
  SEARCH_GROUP_LABELS,
  searchGroupPage,
  type SearchResultGroupKey,
} from '@/lib/searchNavigation';
import type { GlobalSearchData, GlobalSearchResultItem } from '@/types/api';

const MIN_SEARCH_LENGTH = 2;
const SEARCH_DEBOUNCE_MS = 300;

const SEARCH_GROUPS: SearchResultGroupKey[] = ['users', 'runners', 'errands', 'disputes', 'withdrawals'];

const IS_MAC = typeof navigator !== 'undefined' && /mac|iphone|ipad/i.test(navigator.platform || navigator.userAgent);

export function GlobalSearch({ variant = 'default' }: { variant?: 'default' | 'admin2' }) {
  const { user } = useAuth();
  const navigate = useAdminNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isAdmin2 = variant === 'admin2';
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (debouncedQuery.length >= MIN_SEARCH_LENGTH) {
      setOpen(true);
    }
  }, [debouncedQuery]);

  const searchEnabled = debouncedQuery.length >= MIN_SEARCH_LENGTH;

  const searchQuery = useQuery({
    queryKey: queryKeys.search.global(debouncedQuery),
    queryFn: () => fetchAdminGlobalSearch(debouncedQuery),
    enabled: searchEnabled,
    staleTime: 30_000,
  });

  const visibleGroups = SEARCH_GROUPS.filter((key) => canAccessPage(user, searchGroupPage(key)));

  const filteredData = searchQuery.data
    ? visibleGroups.reduce((acc, key) => {
        acc[key] = searchQuery.data![key];
        return acc;
      }, {} as GlobalSearchData)
    : null;

  const hasResults =
    filteredData != null &&
    visibleGroups.some((key) => (filteredData[key]?.length ?? 0) > 0);

  const handleResultClick = useCallback(
    (item: GlobalSearchResultItem, groupKey: SearchResultGroupKey) => {
      const target = parseSearchResultUrl(item.url);
      if (!target || !canAccessPage(user, target.page)) return;

      const openId =
        target.openId ?? (groupKey === 'withdrawals' ? item.id : undefined);

      navigate(target.page, openId != null ? { openId } : undefined);
      setOpen(false);
      setQuery('');
    },
    [navigate, user],
  );

  useEffect(() => {
    if (!open) return;

    function onDocClick(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!isAdmin2) return;

    function onShortcut(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    }

    document.addEventListener('keydown', onShortcut);
    return () => document.removeEventListener('keydown', onShortcut);
  }, [isAdmin2]);

  const handleEnter = () => {
    if (!hasResults || !filteredData) return;

    for (const key of visibleGroups) {
      const first = filteredData[key]?.[0];
      if (first) {
        handleResultClick(first, key);
        return;
      }
    }
  };

  return (
    <div ref={containerRef} className={isAdmin2 ? 'relative w-full max-w-[386px]' : 'relative hidden md:block ml-2'}>
      <div className="relative">
        <Search
          className={
            isAdmin2
              ? 'absolute left-[12px] top-1/2 -translate-y-1/2 w-[17px] h-[17px] text-[#7c857f]'
              : 'absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400'
          }
          strokeWidth={isAdmin2 ? 1.8 : 2}
        />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (searchEnabled) setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleEnter();
            }
          }}
          placeholder={isAdmin2 ? 'Search users, runners, errands or transactions…' : 'Search errands, runners, users...'}
          aria-label="Global search"
          aria-expanded={open && searchEnabled}
          aria-haspopup="listbox"
          className={
            isAdmin2
              ? 'w-full h-[40px] pl-[38px] pr-[64px] text-[12px] text-[#17211b] placeholder:text-[#7c857f] rounded-[8px] border border-[#e2e8e3] bg-[#f8faf8] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#167d35]/30 focus:border-[#167d35] transition-all [&::-webkit-search-cancel-button]:hidden'
              : 'w-64 pl-9 pr-4 py-2 text-sm rounded-xl border border-ink-200 bg-ink-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all'
          }
        />
        {isAdmin2 ? (
          <kbd className="pointer-events-none absolute right-[10px] top-1/2 -translate-y-1/2 rounded-[6px] border border-[#e2e8e3] bg-white px-[6px] py-[3px] font-inter text-[10px] font-medium leading-none text-[#7c857f]">
            {IS_MAC ? '⌘ K' : 'Ctrl K'}
          </kbd>
        ) : null}
      </div>

      {open && searchEnabled ? (
        <div
          role="listbox"
          aria-label="Search results"
          className="absolute left-0 top-full mt-2 w-[min(24rem,calc(100vw-2rem))] rounded-2xl border border-ink-100 bg-white shadow-xl z-50 overflow-hidden animate-scale-in"
        >
          {searchQuery.isLoading ? (
            <p className="px-4 py-6 text-sm text-ink-400 text-center">Searching…</p>
          ) : searchQuery.isError ? (
            <p className="px-4 py-6 text-sm text-error-600 text-center">
              {getApiErrorMessage(searchQuery.error, 'Search failed.')}
            </p>
          ) : !hasResults ? (
            <p className="px-4 py-6 text-sm text-ink-400 text-center">No results found.</p>
          ) : (
            <div className="max-h-96 overflow-y-auto scrollbar-thin py-2">
              {visibleGroups.map((key) => {
                const items = filteredData?.[key] ?? [];
                if (items.length === 0) return null;

                return (
                  <div key={key} className="px-2 py-1">
                    <p className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-400">
                      {SEARCH_GROUP_LABELS[key]}
                    </p>
                    <ul>
                      {items.map((item) => (
                        <li key={`${key}-${item.id}`}>
                          <button
                            type="button"
                            role="option"
                            onClick={() => handleResultClick(item, key)}
                            className="w-full text-left px-3 py-2.5 rounded-xl text-sm text-ink-800 hover:bg-brand-50 hover:text-brand-800 transition-colors"
                          >
                            {item.label}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
