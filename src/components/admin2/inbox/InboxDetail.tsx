import { ArrowUpRight, MailOpen, Trash2 } from 'lucide-react';
import type { NotificationTarget } from '@/lib/notificationTarget';
import type { AppNotification } from '@/types/inAppNotification';
import { relativeAgo } from '../format';
import { watDate, watTime } from '../errand/errandPresentation';
import { categoryMeta, categoryOf, detailRows, notificationTitle } from './inboxPresentation';

export function InboxEmptyDetail() {
  return (
    <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-[10px] px-[24px] text-center">
      <span className="flex size-[46px] items-center justify-center rounded-full bg-[#f3faf5]">
        <MailOpen className="size-[20px]" strokeWidth={1.7} color="#167D35" />
      </span>
      <p className="text-[13px] font-semibold text-[#17211b]">Select a notification</p>
      <p className="max-w-[240px] text-[11px] leading-[1.5] text-[#7c857f]">
        Opening a notification marks it read and shows where to act on it.
      </p>
    </div>
  );
}

export function InboxDetail({
  notification,
  target,
  onOpenTarget,
  onDelete,
  deleting,
}: {
  notification: AppNotification;
  target: NotificationTarget | null;
  onOpenTarget: (href: string) => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  const meta = categoryMeta(categoryOf(notification.type));
  const Icon = meta.icon;
  const rows = detailRows(notification);

  return (
    <div className="flex flex-col gap-[16px] p-[18px] font-inter">
      <div className="flex items-start gap-[12px]">
        <span className="flex size-[42px] flex-shrink-0 items-center justify-center rounded-[12px]" style={{ backgroundColor: meta.tone.bg }}>
          <Icon className="size-[19px]" strokeWidth={1.8} color={meta.tone.color} />
        </span>
        <div className="min-w-0 flex-1">
          <span className="rounded-full px-[7px] py-[2px] text-[9px] font-semibold" style={{ backgroundColor: meta.tone.bg, color: meta.tone.color }}>
            {meta.label}
          </span>
          <h2 className="mt-[6px] text-[16px] font-bold leading-snug tracking-[-0.2px] text-[#17211b]">{notificationTitle(notification)}</h2>
          <p className="mt-[3px] text-[11px] text-[#7c857f]">
            {watDate(notification.created_at)} at {watTime(notification.created_at)} · {relativeAgo(notification.created_at)}
          </p>
        </div>
      </div>

      <p className="whitespace-pre-wrap rounded-[10px] border border-[#e2e8e3] bg-[#f8faf8] px-[14px] py-[12px] text-[12px] leading-[1.6] text-[#17211b]">
        {notification.message || 'No message body.'}
      </p>

      {rows.length > 0 ? (
        <div className="flex flex-col gap-[8px]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.6px] text-[#7c857f]">Details</p>
          <dl className="grid grid-cols-2 gap-[8px]">
            {rows.map((row) => (
              <div key={row.label} className={`min-w-0 rounded-[8px] border border-[#e2e8e3] px-[10px] py-[8px] ${row.long ? 'col-span-2' : ''}`}>
                <dt className="text-[9px] font-medium uppercase tracking-[0.3px] text-[#7c857f]">{row.label}</dt>
                <dd className={`mt-[2px] text-[11px] font-semibold text-[#17211b] ${row.long ? 'whitespace-pre-wrap break-words' : 'truncate'}`} title={row.value}>
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-[8px] border-t border-[#e2e8e3] pt-[14px]">
        {target ? (
          <button
            type="button"
            onClick={() => onOpenTarget(target.href)}
            className="flex h-[36px] items-center gap-[6px] rounded-[8px] bg-[#167d35] px-[13px] text-[12px] font-semibold text-white hover:bg-[#0d5e27]"
          >
            {target.label}
            <ArrowUpRight className="size-[14px]" strokeWidth={2} />
          </button>
        ) : (
          <p className="text-[11px] text-[#7c857f]">Nothing to act on. This one is for your information.</p>
        )}
        <button
          type="button"
          onClick={onDelete}
          disabled={deleting}
          className="ml-auto flex h-[36px] items-center gap-[6px] rounded-[8px] border border-[#f1d4d4] bg-white px-[12px] text-[12px] font-semibold text-[#b84545] hover:bg-[#fff6f6] disabled:opacity-60"
        >
          <Trash2 className="size-[14px]" strokeWidth={1.8} />
          {deleting ? 'Deleting…' : 'Delete'}
        </button>
      </div>
    </div>
  );
}
