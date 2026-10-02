import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchNotificationCampaign, fetchNotificationGroup } from '@/api/adminNotificationCenterApi';
import { Drawer } from '@/components/ui/Drawer';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import { queryKeys } from '@/lib/queryKeys';
import type { NotificationBreakdown, NotificationDelivery, NotificationHistoryRow, NotificationRecipient } from '@/types/api';
import { formatCount, formatPct, parseDate } from '../format';
import { Chip, PersonAvatar } from '../errand/parts';
import { Skeleton } from '../overview/primitives';
import { userTone } from '../transactions/presentation';
import { CATEGORY_LABELS, PUSH_STATUS_LABELS, audienceDetail, channelLine, statusChip, whenLabel, type DetailTarget } from './presentation';
import type { RowHandlers } from './rowActions';

const READ_TONE = { bg: '#f3f0fa', color: '#735ca8' };
const UNREAD_TONE = { bg: '#f1f4f2', color: '#7c857f' };

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-[10px] border border-[#e2e8e3] p-[12px]">
      <p className="text-[10px] text-[#7c857f]">{label}</p>
      <p className="mt-[4px] text-[18px] font-bold leading-none text-[#17211b]">{value}</p>
      {hint ? <p className="mt-[5px] truncate text-[9px] text-[#7c857f]">{hint}</p> : null}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-[8px]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.3px] text-[#7c857f]">{title}</p>
      {children}
    </section>
  );
}

function DeliveryStats({ delivery }: { delivery: NotificationDelivery | null }) {
  if (!delivery) return null;
  return (
    <div className="grid grid-cols-2 gap-[8px] sm:grid-cols-4">
      <Stat label="Sent" value={formatCount(delivery.total)} />
      <Stat label="Delivered" value={formatPct(delivery.rate)} hint={`${formatCount(delivery.delivered)} of ${formatCount(delivery.total)}`} />
      <Stat label="Read" value={formatPct(delivery.read_rate)} hint={`${formatCount(delivery.read)} opened`} />
      <Stat label="Failed" value={formatCount(delivery.failed)} hint="Push rejected" />
    </div>
  );
}

function BreakdownList({ breakdown }: { breakdown: NotificationBreakdown }) {
  const items: Array<[string, number | undefined]> = [
    ['In-app inbox', breakdown.in_app],
    ['Push delivered', breakdown.push_sent],
    ['Push failed', breakdown.push_failed],
    ['No device registered', breakdown.no_device],
    ['Push switched off', breakdown.push_disabled],
    ['Email sent', breakdown.email_sent],
    ['WhatsApp sent', breakdown.whatsapp_sent],
    ['Opted out (skipped)', breakdown.opted_out],
    ['Before delivery tracking', breakdown.untracked],
  ];
  return (
    <div className="divide-y divide-[#eef1ee] rounded-[10px] border border-[#e2e8e3]">
      {items
        .filter(([, value]) => value != null && value > 0)
        .map(([label, value]) => (
          <div key={label} className="flex items-center justify-between px-[12px] py-[8px] text-[11px]">
            <span className="text-[#45514a]">{label}</span>
            <span className="font-semibold text-[#17211b]">{formatCount(value ?? 0)}</span>
          </div>
        ))}
    </div>
  );
}

function RecipientList({ recipients, total }: { recipients: NotificationRecipient[]; total: number }) {
  if (recipients.length === 0) return <p className="text-[11px] text-[#7c857f]">No recipients yet.</p>;
  return (
    <div className="flex flex-col">
      {recipients.map((recipient) => {
        const name = recipient.user?.name ?? 'Deleted user';
        const push = recipient.push_status ? PUSH_STATUS_LABELS[recipient.push_status] : undefined;
        return (
          <div key={recipient.id} className="flex items-center gap-[10px] border-b border-[#eef1ee] py-[8px] last:border-0">
            <PersonAvatar name={name} tone={userTone(recipient.user?.role)} size={28} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-semibold text-[#17211b]">{name}</p>
              <p className="truncate text-[9px] text-[#7c857f]">
                {recipient.user?.role === 'runner' ? 'Runner' : 'Requester'} · {whenLabel(recipient.created_at)}
              </p>
            </div>
            {push ? <Chip tone={push.tone} label={push.label} /> : null}
            <Chip tone={recipient.read_at ? READ_TONE : UNREAD_TONE} label={recipient.read_at ? 'Read' : 'Unread'} />
          </div>
        );
      })}
      {total > recipients.length ? (
        <p className="pt-[8px] text-[10px] text-[#7c857f]">
          Showing the latest {formatCount(recipients.length)} of {formatCount(total)}.
        </p>
      ) : null}
    </div>
  );
}

export function NotificationDetailDrawer({
  target,
  onClose,
  handlers,
  busy,
}: {
  target: DetailTarget | null;
  onClose: () => void;
  handlers: RowHandlers;
  busy: boolean;
}) {
  const campaignId = target?.kind === 'campaign' ? target.id : null;
  const group = target?.kind === 'group' ? target : null;

  const campaignQuery = useQuery({
    queryKey: queryKeys.notifications.campaign(campaignId ?? 0),
    queryFn: () => fetchNotificationCampaign(campaignId as number),
    enabled: campaignId != null,
    refetchInterval: (query) => (query.state.data?.status === 'sending' ? 4_000 : false),
  });
  const groupQuery = useQuery({
    queryKey: queryKeys.notifications.group(group?.type ?? '', group?.date ?? ''),
    queryFn: () => fetchNotificationGroup(group?.type ?? '', group?.date ?? ''),
    enabled: group != null,
  });

  const campaign = campaignId != null ? campaignQuery.data : undefined;
  const groupDetail = group ? groupQuery.data : undefined;
  const activeQuery = campaignId != null ? campaignQuery : groupQuery;

  const title = campaign?.title ?? groupDetail?.label ?? 'Notification';
  const subtitle = campaign
    ? `${CATEGORY_LABELS[campaign.category]} · ${campaign.author.name}`
    : groupDetail
      ? `${groupDetail.kind === 'broadcast' ? 'Admin broadcast' : 'Automated'} · ${parseDate(groupDetail.date).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })}`
      : undefined;

  const footer = campaign ? <CampaignFooter row={campaign} handlers={handlers} busy={busy} /> : undefined;

  return (
    <Drawer open={target != null} onClose={onClose} title={title} subtitle={subtitle} width="2xl" footer={footer}>
      {activeQuery.isError ? (
        <p className="text-[12px] text-[#b84545]">{getApiErrorMessage(activeQuery.error, 'Could not load these details.')}</p>
      ) : campaign ? (
        <div className="flex flex-col gap-[18px] font-inter">
          <div className="flex flex-wrap items-center gap-[6px]">
            <Chip {...statusChip(campaign)} dot />
            <span className="text-[11px] text-[#45514a]">
              {campaign.status === 'scheduled'
                ? `Goes out ${whenLabel(campaign.scheduled_at)}`
                : campaign.sent_at
                  ? `Sent ${whenLabel(campaign.sent_at)}${campaign.sender ? ` by ${campaign.sender.name}` : ''}`
                  : `Last edited ${whenLabel(campaign.at)}`}
            </span>
          </div>
          {campaign.overdue ? (
            <p className="rounded-[8px] bg-[#fff5e5] px-3 py-2 text-[11px] text-[#b06d12]">
              This was due {whenLabel(campaign.scheduled_at)} but hasn't gone out. Check that the server cron runs <code>php artisan schedule:run</code>{' '}
              every minute, or send it now.
            </p>
          ) : null}
          {campaign.last_error ? (
            <p className="rounded-[8px] bg-[#fdeded] px-3 py-2 text-[11px] text-[#b84545]">Last error: {campaign.last_error}</p>
          ) : null}

          <Section title="Message">
            <div className="rounded-[10px] bg-[#f8faf8] p-[12px]">
              <p className="text-[12px] font-semibold text-[#17211b]">{campaign.title}</p>
              <p className="mt-[4px] whitespace-pre-line text-[11px] leading-relaxed text-[#45514a]">{campaign.message}</p>
            </div>
            <p className="text-[10px] text-[#7c857f]">
              {campaign.audience.label} · {audienceDetail(campaign)} · {channelLine(campaign.channels)}
            </p>
            {campaign.custom_users.length > 0 ? (
              <div className="flex flex-wrap gap-[6px]">
                {campaign.custom_users.map((user) => (
                  <span key={user.id} className="rounded-full bg-[#eaf6ed] px-[9px] py-[4px] text-[10px] font-semibold text-[#0d5e27]">
                    {user.name}
                  </span>
                ))}
              </div>
            ) : null}
          </Section>

          {campaign.delivery ? (
            <Section title="Delivery">
              <DeliveryStats delivery={campaign.delivery} />
              <BreakdownList breakdown={campaign.breakdown} />
            </Section>
          ) : campaign.estimate ? (
            <Section title="Expected reach">
              <div className="grid grid-cols-2 gap-[8px] sm:grid-cols-4">
                <Stat label="Recipients" value={formatCount(campaign.estimate.recipients)} hint={`${formatCount(campaign.estimate.opted_out)} opted out`} />
                <Stat label="Push" value={formatCount(campaign.estimate.reachable.push)} hint="Have a device" />
                <Stat label="Email" value={formatCount(campaign.estimate.reachable.email)} hint="Email on file" />
                <Stat label="WhatsApp" value={formatCount(campaign.estimate.reachable.whatsapp)} hint="Verified phone" />
              </div>
            </Section>
          ) : null}

          {campaign.recipients.length > 0 || campaign.delivery ? (
            <Section title="Recipients">
              <RecipientList recipients={campaign.recipients} total={campaign.delivery?.total ?? campaign.recipients.length} />
            </Section>
          ) : null}
        </div>
      ) : groupDetail ? (
        <div className="flex flex-col gap-[18px] font-inter">
          <Section title="Delivery">
            <DeliveryStats delivery={groupDetail.delivery} />
            <p className="text-[10px] text-[#7c857f]">
              {formatCount(groupDetail.people)} {groupDetail.people === 1 ? 'person' : 'people'} received this type of notification that day.
            </p>
            <BreakdownList breakdown={groupDetail.breakdown} />
          </Section>
          {groupDetail.titles.length > 0 ? (
            <Section title="Messages sent">
              <div className="divide-y divide-[#eef1ee] rounded-[10px] border border-[#e2e8e3]">
                {groupDetail.titles.map((item) => (
                  <div key={item.title} className="flex items-center justify-between gap-3 px-[12px] py-[8px] text-[11px]">
                    <span className="min-w-0 truncate text-[#17211b]">{item.title}</span>
                    <span className="flex-shrink-0 font-semibold text-[#45514a]">{formatCount(item.count)}</span>
                  </div>
                ))}
              </div>
            </Section>
          ) : null}
          <Section title="Recipients">
            <RecipientList recipients={groupDetail.recipients} total={groupDetail.delivery.total} />
          </Section>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-[60px] w-full" />
          <Skeleton className="h-[90px] w-full" />
          <Skeleton className="h-[160px] w-full" />
        </div>
      )}
    </Drawer>
  );
}

function CampaignFooter({ row, handlers, busy }: { row: NotificationHistoryRow; handlers: RowHandlers; busy: boolean }) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-[8px] font-inter">
      {row.can_delete ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => handlers.act(row, 'delete')}
          className="mr-auto h-[36px] rounded-[8px] px-[12px] text-[11px] font-semibold text-[#b84545] hover:bg-[#fdeded] disabled:opacity-60"
        >
          Delete draft
        </button>
      ) : null}
      <button
        type="button"
        disabled={busy}
        onClick={() => handlers.act(row, 'duplicate')}
        className="h-[36px] rounded-[8px] border border-[#d4ddd6] bg-white px-[14px] text-[11px] font-semibold text-[#17211b] hover:bg-[#f8faf8] disabled:opacity-60"
      >
        Duplicate
      </button>
      {row.can_cancel ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => handlers.act(row, 'cancel')}
          className="h-[36px] rounded-[8px] border border-[#d4ddd6] bg-white px-[14px] text-[11px] font-semibold text-[#17211b] hover:bg-[#f8faf8] disabled:opacity-60"
        >
          Cancel schedule
        </button>
      ) : null}
      {row.can_edit ? (
        <button
          type="button"
          onClick={() => handlers.edit(row)}
          className="h-[36px] rounded-[8px] border border-[#d4ddd6] bg-white px-[14px] text-[11px] font-semibold text-[#17211b] hover:bg-[#f8faf8]"
        >
          Edit
        </button>
      ) : null}
      {row.can_send ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => handlers.act(row, 'send')}
          className="h-[36px] rounded-[8px] bg-[#167d35] px-[14px] text-[11px] font-semibold text-white hover:bg-[#0d5e27] disabled:opacity-60"
        >
          Send now
        </button>
      ) : null}
    </div>
  );
}
