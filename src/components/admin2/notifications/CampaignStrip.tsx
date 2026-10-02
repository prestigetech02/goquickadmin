import { CalendarClock, Ellipsis, Megaphone, Send } from 'lucide-react';
import type { AdminNotificationsOverview, NotificationHistoryRow } from '@/types/api';
import { formatCount } from '../format';
import { Chip } from '../errand/parts';
import { Card, CardTitle, Skeleton } from '../overview/primitives';
import { ActionMenu } from '../users/ActionMenu';
import { audienceDetail, channelLine, statusChip, whenLabel } from './presentation';
import { rowActions, type RowHandlers } from './rowActions';

function cardChip(row: NotificationHistoryRow) {
  const chip = statusChip(row);
  if (row.status === 'scheduled') return { ...chip, label: row.overdue ? `Overdue · ${whenLabel(row.scheduled_at)}` : whenLabel(row.scheduled_at) };
  if (row.status === 'sent') return { ...chip, label: `Sent · ${whenLabel(row.sent_at)}` };
  return chip;
}

export function CampaignStrip({
  overview,
  handlers,
  busy,
  onViewScheduled,
  onCompose,
}: {
  overview?: AdminNotificationsOverview;
  handlers: RowHandlers;
  busy: boolean;
  onViewScheduled: () => void;
  onCompose: () => void;
}) {
  const campaigns = overview?.campaigns;
  const scheduled = overview?.tab_counts.scheduled ?? 0;

  return (
    <Card className="flex w-full flex-col gap-[14px] p-[18px]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <CardTitle title="Recent & scheduled campaigns" subtitle="Upcoming sends first, then drafts and the latest broadcasts" />
        <button
          type="button"
          onClick={onViewScheduled}
          className="flex h-[34px] items-center gap-[7px] rounded-[8px] border border-[#d4ddd6] bg-white px-[12px] text-[11px] font-semibold text-[#17211b] hover:bg-[#f8faf8]"
        >
          <CalendarClock className="size-[14px]" strokeWidth={1.8} />
          View scheduled
          {scheduled > 0 ? (
            <span className="rounded-full bg-[#eef5fb] px-[6px] py-[2px] text-[9px] font-semibold text-[#2c73b9]">{formatCount(scheduled)}</span>
          ) : null}
        </button>
      </div>

      {!campaigns ? (
        <div className="grid grid-cols-1 gap-[12px] sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-[96px] w-full" />
          ))}
        </div>
      ) : campaigns.length === 0 ? (
        <div className="flex flex-col items-center gap-[6px] rounded-[10px] bg-[#f8faf8] p-[20px] text-center">
          <Megaphone className="size-[20px] text-[#167d35]" strokeWidth={1.8} />
          <p className="text-[12px] font-semibold text-[#17211b]">No campaigns yet</p>
          <button type="button" onClick={onCompose} className="text-[11px] font-semibold text-[#167d35] hover:underline">
            Compose the first one
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-[12px] sm:grid-cols-2 xl:grid-cols-4">
          {campaigns.map((row) => {
            const chip = cardChip(row);
            return (
              <div
                key={row.key}
                role="button"
                tabIndex={0}
                onClick={() => handlers.open(row)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') handlers.open(row);
                }}
                className="flex min-w-0 cursor-pointer flex-col gap-[8px] rounded-[10px] border border-[#e2e8e3] bg-[#fbfcfb] p-[12px] text-left transition-colors hover:bg-[#f3f7f4]"
              >
                <div className="flex items-center justify-between gap-2">
                  <Chip tone={chip.tone} label={chip.label} dot />
                  <ActionMenu
                    items={rowActions(row, handlers, busy)}
                    ariaLabel={`Actions for ${row.title}`}
                    className="flex size-[22px] items-center justify-center rounded text-[#7c857f] hover:bg-[#eef2ef] hover:text-[#17211b]"
                  >
                    <Ellipsis className="size-[16px]" />
                  </ActionMenu>
                </div>
                <p className="truncate text-[12px] font-semibold text-[#17211b]" title={row.title}>
                  {row.title}
                </p>
                <p className="truncate text-[10px] text-[#7c857f]">
                  {row.audience.label} · {audienceDetail(row)}
                  {row.audience.estimated ? '' : ' recipients'}
                </p>
                <p className="flex items-center gap-[6px] text-[10px] text-[#45514a]">
                  <Send className="size-[12px] flex-shrink-0 text-[#7c857f]" strokeWidth={1.8} />
                  <span className="truncate">{channelLine(row.channels)}</span>
                </p>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
