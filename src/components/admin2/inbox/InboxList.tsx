import type { AppNotification } from '@/types/inAppNotification';
import { relativeAgo } from '../format';
import { watTime } from '../errand/errandPresentation';
import { Skeleton } from '../overview/primitives';
import { categoryMeta, categoryOf, groupByDay, notificationTitle } from './inboxPresentation';

export function InboxList({
  items,
  loading,
  selectedId,
  onSelect,
  emptyText,
  dimmed,
}: {
  items: AppNotification[];
  loading: boolean;
  selectedId: number | null;
  onSelect: (notification: AppNotification) => void;
  emptyText: string;
  dimmed: boolean;
}) {
  if (loading) {
    return (
      <div className="divide-y divide-[#e2e8e3]">
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="flex gap-[12px] px-[16px] py-[14px]">
            <Skeleton className="size-[34px] rounded-[10px]" />
            <div className="flex flex-1 flex-col gap-[7px]">
              <Skeleton className="h-[10px] w-[45%]" />
              <Skeleton className="h-[9px] w-[85%]" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-[6px] px-[16px] py-[56px] text-center">
        <p className="text-[13px] font-semibold text-[#17211b]">{emptyText}</p>
        <p className="text-[11px] text-[#7c857f]">New alerts appear here as soon as they're sent.</p>
      </div>
    );
  }

  return (
    <div className={dimmed ? 'opacity-60' : ''}>
      {groupByDay(items).map((group) => (
        <section key={group.label}>
          <p className="sticky top-0 z-[1] border-b border-[#e2e8e3] bg-[#f8faf8] px-[16px] py-[6px] text-[9px] font-semibold uppercase tracking-[0.6px] text-[#7c857f]">
            {group.label}
          </p>
          {group.items.map((n) => {
            const meta = categoryMeta(categoryOf(n.type));
            const Icon = meta.icon;
            const active = n.id === selectedId;
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => onSelect(n)}
                aria-current={active ? 'true' : undefined}
                className={`relative flex w-full gap-[12px] border-b border-[#e2e8e3] px-[16px] py-[13px] text-left transition-colors ${
                  active ? 'bg-[#f3faf5]' : n.is_read ? 'bg-white hover:bg-[#fafcfa]' : 'bg-[#fbfdfb] hover:bg-[#f6faf7]'
                }`}
              >
                {active ? <span className="absolute inset-y-0 left-0 w-[3px] bg-[#167d35]" /> : null}
                <span className="flex size-[34px] flex-shrink-0 items-center justify-center rounded-[10px]" style={{ backgroundColor: meta.tone.bg }}>
                  <Icon className="size-[16px]" strokeWidth={1.8} color={meta.tone.color} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-[8px]">
                    <span className={`min-w-0 flex-1 truncate text-[12px] ${n.is_read ? 'font-medium text-[#45514a]' : 'font-semibold text-[#17211b]'}`}>
                      {notificationTitle(n)}
                    </span>
                    <span className="flex-shrink-0 text-[10px] text-[#7c857f]" title={relativeAgo(n.created_at)}>
                      {watTime(n.created_at)}
                    </span>
                  </span>
                  <span className={`mt-[3px] line-clamp-2 text-[11px] leading-[1.45] ${n.is_read ? 'text-[#7c857f]' : 'text-[#45514a]'}`}>{n.message}</span>
                  <span className="mt-[6px] flex items-center gap-[6px]">
                    <span className="rounded-full px-[7px] py-[2px] text-[9px] font-semibold" style={{ backgroundColor: meta.tone.bg, color: meta.tone.color }}>
                      {meta.label}
                    </span>
                    {!n.is_read ? <span className="text-[9px] font-semibold text-[#167d35]">New</span> : null}
                  </span>
                </span>
                {!n.is_read ? <span className="mt-[5px] size-[8px] flex-shrink-0 rounded-full bg-[#167d35]" aria-label="Unread" /> : null}
              </button>
            );
          })}
        </section>
      ))}
    </div>
  );
}
