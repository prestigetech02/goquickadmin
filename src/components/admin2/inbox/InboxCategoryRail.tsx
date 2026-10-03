import { Inbox } from 'lucide-react';
import type { InboxCategory, InboxCategoryCounts } from '@/api/adminInAppNotificationsApi';
import { Card, Skeleton } from '../overview/primitives';
import { INBOX_CATEGORIES } from './inboxPresentation';

function RailButton({
  active,
  onClick,
  icon: Icon,
  iconBg,
  iconColor,
  label,
  hint,
  unread,
  total,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Inbox;
  iconBg: string;
  iconColor: string;
  label: string;
  hint: string;
  unread: number;
  total: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={hint}
      className={`flex w-full items-center gap-[10px] rounded-[10px] px-[10px] py-[9px] text-left transition-colors ${
        active ? 'bg-[#eaf6ed]' : 'hover:bg-[#f6f8f6]'
      }`}
    >
      <span className="flex size-[30px] flex-shrink-0 items-center justify-center rounded-[8px]" style={{ backgroundColor: iconBg }}>
        <Icon className="size-[15px]" strokeWidth={1.8} color={iconColor} />
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block truncate text-[12px] ${active ? 'font-semibold text-[#0d5e27]' : 'font-medium text-[#17211b]'}`}>{label}</span>
        <span className="block truncate text-[10px] text-[#7c857f]">{total.toLocaleString('en-NG')} total</span>
      </span>
      {unread > 0 ? (
        <span className="flex-shrink-0 rounded-full bg-[#b84545] px-[7px] py-[3px] text-[9px] font-bold leading-none text-white">
          {unread > 99 ? '99+' : unread}
        </span>
      ) : null}
    </button>
  );
}

export function InboxCategoryRail({
  counts,
  value,
  onChange,
}: {
  counts: InboxCategoryCounts | undefined;
  value: InboxCategory | null;
  onChange: (value: InboxCategory | null) => void;
}) {
  const allUnread = counts ? Object.values(counts).reduce((sum, c) => sum + c.unread, 0) : 0;
  const allTotal = counts ? Object.values(counts).reduce((sum, c) => sum + c.total, 0) : 0;

  return (
    <Card className="flex flex-col gap-[4px] p-[10px] lg:sticky lg:top-[96px]">
      <p className="px-[6px] pb-[4px] pt-[2px] text-[10px] font-semibold uppercase tracking-[0.8px] text-[#7c857f]">Folders</p>
      {counts ? (
        <>
          <RailButton
            active={value === null}
            onClick={() => onChange(null)}
            icon={Inbox}
            iconBg="#eaf6ed"
            iconColor="#167d35"
            label="All notifications"
            hint="Everything sent to you"
            unread={allUnread}
            total={allTotal}
          />
          <div className="my-[4px] h-px bg-[#e2e8e3]" />
          {INBOX_CATEGORIES.map((category) => (
            <RailButton
              key={category.key}
              active={value === category.key}
              onClick={() => onChange(category.key)}
              icon={category.icon}
              iconBg={category.tone.bg}
              iconColor={category.tone.color}
              label={category.label}
              hint={category.hint}
              unread={counts[category.key].unread}
              total={counts[category.key].total}
            />
          ))}
        </>
      ) : (
        Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="flex items-center gap-[10px] px-[10px] py-[9px]">
            <Skeleton className="size-[30px] rounded-[8px]" />
            <Skeleton className="h-[10px] w-[100px]" />
          </div>
        ))
      )}
    </Card>
  );
}
