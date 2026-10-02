import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Check, Lock, Search, X } from 'lucide-react';
import { fetchCampaignEstimate, fetchNotificationCampaign, saveNotificationCampaign } from '@/api/adminNotificationCenterApi';
import { fetchAdminUsers } from '@/api/adminUsersApi';
import { Drawer } from '@/components/ui/Drawer';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import { queryKeys } from '@/lib/queryKeys';
import type {
  CampaignAudience,
  CampaignCategory,
  CampaignChannel,
  CampaignInput,
  NotificationAudienceSummary,
  NotificationHistoryRow,
} from '@/types/api';
import { formatCount, partyName } from '../format';
import { Skeleton } from '../overview/primitives';
import { useDebounced } from '../shared/useDebounced';
import { AUDIENCE_HINTS, AUDIENCE_LABELS, CATEGORY_LABELS, CHANNEL_LABELS } from './presentation';

const TITLE_MAX = 200;
const MESSAGE_MAX = 1000;
const CUSTOM_MAX = 500;
const OPTIONAL_CHANNELS: CampaignChannel[] = ['push', 'email', 'whatsapp'];

const LABEL = 'text-[11px] font-semibold text-[#17211b]';
const INPUT =
  'w-full rounded-[8px] border border-[#d4ddd6] bg-white px-[11px] text-[12px] text-[#17211b] outline-none placeholder:text-[#7c857f] focus:border-[#167d35]';

type CustomUser = { id: number; name: string; role: string | null };

type FormState = {
  title: string;
  message: string;
  category: CampaignCategory;
  audience: CampaignAudience;
  users: CustomUser[];
  channels: CampaignChannel[];
  timing: 'now' | 'later';
  scheduledAt: string;
};

export type ComposeRequest = { id: number | null; audience?: CampaignAudience };

function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function blankForm(audience: CampaignAudience = 'all'): FormState {
  return { title: '', message: '', category: 'announcement', audience, users: [], channels: ['in_app', 'push'], timing: 'now', scheduledAt: '' };
}

export function ComposeCampaignDrawer({
  request,
  segments,
  onClose,
  onSaved,
}: {
  request: ComposeRequest | null;
  segments?: NotificationAudienceSummary;
  onClose: () => void;
  onSaved: (row: NotificationHistoryRow, action: CampaignInput['action']) => void;
}) {
  const editingId = request?.id ?? null;
  const detailQuery = useQuery({
    queryKey: queryKeys.notifications.campaign(editingId ?? 0),
    queryFn: () => fetchNotificationCampaign(editingId as number),
    enabled: editingId != null,
  });

  const detail = detailQuery.data;
  const initial: FormState | null =
    editingId == null
      ? blankForm(request?.audience)
      : detail
        ? {
            title: detail.title,
            message: detail.message,
            category: detail.category,
            audience: detail.audience.key === 'triggered' ? 'all' : detail.audience.key,
            users: detail.custom_users,
            channels: detail.channels,
            timing: detail.status === 'scheduled' ? 'later' : 'now',
            scheduledAt: toLocalInput(detail.scheduled_at),
          }
        : null;

  return (
    <Drawer
      open={request != null}
      onClose={onClose}
      title={editingId != null ? 'Edit campaign' : 'Compose notification'}
      subtitle="Every message lands in the in-app inbox; add push, email or WhatsApp to reach people outside the app."
      width="2xl"
    >
      {editingId != null && detailQuery.isError ? (
        <p className="text-[12px] text-[#b84545]">{getApiErrorMessage(detailQuery.error, 'Could not load this campaign.')}</p>
      ) : initial ? (
        <ComposeForm
          key={editingId ?? `new-${request?.audience ?? 'all'}`}
          initial={initial}
          editingId={editingId}
          segments={segments}
          onCancel={onClose}
          onSaved={onSaved}
        />
      ) : (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-[38px] w-full" />
          <Skeleton className="h-[120px] w-full" />
          <Skeleton className="h-[60px] w-full" />
        </div>
      )}
    </Drawer>
  );
}

function ComposeForm({
  initial,
  editingId,
  segments,
  onCancel,
  onSaved,
}: {
  initial: FormState;
  editingId: number | null;
  segments?: NotificationAudienceSummary;
  onCancel: () => void;
  onSaved: (row: NotificationHistoryRow, action: CampaignInput['action']) => void;
}) {
  const [form, setForm] = useState<FormState>(initial);
  const [userSearch, setUserSearch] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const debouncedSearch = useDebounced(userSearch.trim(), 300);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setConfirming(false);
    setLocalError(null);
  };

  const userIds = form.users.map((user) => user.id);
  const estimateParams = { audience: form.audience, category: form.category, ...(form.audience === 'custom' ? { user_ids: userIds } : {}) };
  const estimateQuery = useQuery({
    queryKey: queryKeys.notifications.estimate(estimateParams),
    queryFn: () => fetchCampaignEstimate(estimateParams),
    enabled: form.audience !== 'custom' || userIds.length > 0,
    staleTime: 30_000,
  });
  const estimate = form.audience === 'custom' && userIds.length === 0 ? null : estimateQuery.data;

  const usersQuery = useQuery({
    queryKey: queryKeys.users.list({ search: debouncedSearch, per_page: 10, page: 1, picker: 'notifications' }),
    queryFn: () => fetchAdminUsers({ search: debouncedSearch || undefined, per_page: 10, page: 1 }),
    enabled: form.audience === 'custom' && debouncedSearch.length > 0,
  });
  const candidates = (usersQuery.data?.data ?? []).filter((user) => (user.role === 'buyer' || user.role === 'runner') && !userIds.includes(user.id));

  const saveMutation = useMutation({
    mutationFn: (input: CampaignInput) => saveNotificationCampaign(input, editingId ?? undefined),
    onSuccess: (row, input) => onSaved(row, input.action),
  });

  const submit = (action: CampaignInput['action']) => {
    if (!form.title.trim() || !form.message.trim()) return setLocalError('Add a title and a message first.');
    if (form.audience === 'custom' && userIds.length === 0) return setLocalError('Pick at least one person to message.');
    let scheduledAt: string | undefined;
    if (action === 'schedule') {
      const when = form.scheduledAt ? new Date(form.scheduledAt) : null;
      if (!when || Number.isNaN(when.getTime())) return setLocalError('Choose when this should go out.');
      if (when.getTime() <= Date.now() + 60_000) return setLocalError('Schedule at least a minute from now.');
      scheduledAt = when.toISOString();
    }
    if (action === 'send' && !confirming) return setConfirming(true);

    saveMutation.mutate({
      title: form.title.trim(),
      message: form.message.trim(),
      category: form.category,
      audience: form.audience,
      channels: form.channels,
      action,
      ...(form.audience === 'custom' ? { user_ids: userIds } : {}),
      ...(scheduledAt ? { scheduled_at: scheduledAt } : {}),
    });
  };

  const toggleChannel = (channel: CampaignChannel) =>
    update('channels', form.channels.includes(channel) ? form.channels.filter((c) => c !== channel) : [...form.channels, channel]);

  const recipients = estimate?.recipients ?? 0;
  const error = localError ?? (saveMutation.isError ? getApiErrorMessage(saveMutation.error, 'Could not save this campaign.') : null);
  const primaryAction: CampaignInput['action'] = form.timing === 'later' ? 'schedule' : 'send';
  const audienceCount = (key: CampaignAudience) => (key === 'custom' ? null : segments?.segments[key]);

  return (
    <div className="flex flex-col gap-[18px] font-inter">
      <label className="flex flex-col gap-[6px]">
        <span className="flex items-center justify-between">
          <span className={LABEL}>Title</span>
          <span className="text-[10px] text-[#7c857f]">
            {form.title.length}/{TITLE_MAX}
          </span>
        </span>
        <input
          value={form.title}
          maxLength={TITLE_MAX}
          onChange={(event) => update('title', event.target.value)}
          placeholder="e.g. Weekend surge: more runners available"
          className={`${INPUT} h-[38px]`}
        />
      </label>

      <label className="flex flex-col gap-[6px]">
        <span className="flex items-center justify-between">
          <span className={LABEL}>Message</span>
          <span className="text-[10px] text-[#7c857f]">
            {form.message.length}/{MESSAGE_MAX}
          </span>
        </span>
        <textarea
          value={form.message}
          maxLength={MESSAGE_MAX}
          rows={4}
          onChange={(event) => update('message', event.target.value)}
          placeholder="Keep it short and actionable. Push notifications show roughly the first 100 characters."
          className={`${INPUT} resize-y py-[9px]`}
        />
      </label>

      <div className="flex flex-col gap-[6px]">
        <span className={LABEL}>Category</span>
        <div className="flex flex-wrap gap-[6px]">
          {(Object.keys(CATEGORY_LABELS) as CampaignCategory[]).map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => update('category', category)}
              className={`h-[32px] rounded-[8px] border px-[12px] text-[11px] font-semibold ${
                form.category === category ? 'border-[#167d35] bg-[#eaf6ed] text-[#0d5e27]' : 'border-[#d4ddd6] bg-white text-[#45514a] hover:bg-[#f8faf8]'
              }`}
            >
              {CATEGORY_LABELS[category]}
            </button>
          ))}
        </div>
        {form.category === 'promotion' ? (
          <p className="text-[10px] text-[#7c857f]">People who switched off promotional notifications are skipped.</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-[6px]">
        <span className={LABEL}>Audience</span>
        <div className="grid grid-cols-1 gap-[6px] sm:grid-cols-2">
          {(Object.keys(AUDIENCE_LABELS) as CampaignAudience[]).map((audience) => {
            const count = audienceCount(audience);
            const selected = form.audience === audience;
            return (
              <button
                key={audience}
                type="button"
                onClick={() => update('audience', audience)}
                title={AUDIENCE_HINTS[audience]}
                className={`flex items-center justify-between gap-2 rounded-[8px] border px-[11px] py-[8px] text-left ${
                  selected ? 'border-[#167d35] bg-[#f3faf5]' : 'border-[#e2e8e3] bg-white hover:bg-[#f8faf8]'
                }`}
              >
                <span className="min-w-0">
                  <span className={`block truncate text-[11px] font-semibold ${selected ? 'text-[#0d5e27]' : 'text-[#17211b]'}`}>{AUDIENCE_LABELS[audience]}</span>
                  {AUDIENCE_HINTS[audience] ? <span className="block truncate text-[9px] text-[#7c857f]">{AUDIENCE_HINTS[audience]}</span> : null}
                </span>
                <span className="flex-shrink-0 text-[10px] font-semibold text-[#45514a]">
                  {count != null ? formatCount(count) : audience === 'custom' && form.users.length > 0 ? formatCount(form.users.length) : ''}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {form.audience === 'custom' ? (
        <div className="flex flex-col gap-[8px] rounded-[10px] border border-[#e2e8e3] bg-[#fbfcfb] p-[12px]">
          <label className="flex h-[36px] items-center gap-[8px] rounded-[8px] border border-[#d4ddd6] bg-white px-[11px] focus-within:border-[#167d35]">
            <Search className="size-[14px] text-[#7c857f]" strokeWidth={1.8} />
            <input
              value={userSearch}
              onChange={(event) => setUserSearch(event.target.value)}
              placeholder="Search requesters or runners by name, email or phone…"
              className="h-full min-w-0 flex-1 bg-transparent text-[11px] outline-none placeholder:text-[#7c857f]"
            />
          </label>
          {debouncedSearch ? (
            <div className="flex max-h-[180px] flex-col overflow-y-auto">
              {usersQuery.isLoading ? <Skeleton className="h-[30px] w-full" /> : null}
              {usersQuery.isSuccess && candidates.length === 0 ? <p className="py-[6px] text-[11px] text-[#7c857f]">No matching requesters or runners.</p> : null}
              {candidates.map((user) => {
                const name = partyName(user) ?? user.name ?? `User #${user.id}`;
                return (
                  <button
                    key={user.id}
                    type="button"
                    disabled={form.users.length >= CUSTOM_MAX}
                    onClick={() => update('users', [...form.users, { id: user.id, name, role: user.role }])}
                    className="flex items-center justify-between gap-2 rounded-[7px] px-[8px] py-[6px] text-left hover:bg-white disabled:opacity-50"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[11px] font-semibold text-[#17211b]">{name}</span>
                      <span className="block truncate text-[9px] text-[#7c857f]">
                        {user.role === 'runner' ? 'Runner' : 'Requester'} · {user.email ?? user.phone ?? '—'}
                      </span>
                    </span>
                    <span className="text-[10px] font-semibold text-[#167d35]">Add</span>
                  </button>
                );
              })}
            </div>
          ) : null}
          {form.users.length > 0 ? (
            <div className="flex flex-wrap gap-[6px]">
              {form.users.map((user) => (
                <span key={user.id} className="flex items-center gap-[5px] rounded-full bg-[#eaf6ed] py-[4px] pl-[9px] pr-[5px] text-[10px] font-semibold text-[#0d5e27]">
                  {user.name}
                  <button
                    type="button"
                    aria-label={`Remove ${user.name}`}
                    onClick={() => update('users', form.users.filter((u) => u.id !== user.id))}
                    className="rounded-full p-[1px] hover:bg-[#d3ecd9]"
                  >
                    <X className="size-[11px]" />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-[10px] text-[#7c857f]">Up to {CUSTOM_MAX} people. Admin and suspended accounts are never messaged.</p>
          )}
        </div>
      ) : null}

      <div className="flex flex-col gap-[6px]">
        <span className={LABEL}>Channels</span>
        <div className="grid grid-cols-2 gap-[6px] sm:grid-cols-4">
          <div className="flex items-center justify-between gap-2 rounded-[8px] border border-[#167d35] bg-[#f3faf5] px-[11px] py-[8px]">
            <span>
              <span className="block text-[11px] font-semibold text-[#0d5e27]">{CHANNEL_LABELS.in_app}</span>
              <span className="block text-[9px] text-[#7c857f]">{estimate ? formatCount(estimate.reachable.in_app) : '—'} inboxes</span>
            </span>
            <Lock className="size-[12px] text-[#167d35]" />
          </div>
          {OPTIONAL_CHANNELS.map((channel) => {
            const on = form.channels.includes(channel);
            return (
              <button
                key={channel}
                type="button"
                role="checkbox"
                aria-checked={on}
                onClick={() => toggleChannel(channel)}
                className={`flex items-center justify-between gap-2 rounded-[8px] border px-[11px] py-[8px] text-left ${
                  on ? 'border-[#167d35] bg-[#f3faf5]' : 'border-[#e2e8e3] bg-white hover:bg-[#f8faf8]'
                }`}
              >
                <span>
                  <span className={`block text-[11px] font-semibold ${on ? 'text-[#0d5e27]' : 'text-[#17211b]'}`}>{CHANNEL_LABELS[channel]}</span>
                  <span className="block text-[9px] text-[#7c857f]">{estimate ? `${formatCount(estimate.reachable[channel])} reachable` : '—'}</span>
                </span>
                <span
                  className={`flex size-[16px] items-center justify-center rounded-[4px] border ${on ? 'border-[#167d35] bg-[#167d35] text-white' : 'border-[#c9d2cc]'}`}
                >
                  {on ? <Check className="size-[11px]" strokeWidth={3} /> : null}
                </span>
              </button>
            );
          })}
        </div>
        {form.channels.includes('whatsapp') ? (
          <p className="text-[10px] text-[#7c857f]">WhatsApp goes to verified phone numbers; Meta may reject it for people who haven't chatted with GoQuick in the last 24 hours.</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-[6px]">
        <span className={LABEL}>Timing</span>
        <div className="flex flex-wrap items-center gap-[6px]">
          {(['now', 'later'] as const).map((timing) => (
            <button
              key={timing}
              type="button"
              onClick={() => update('timing', timing)}
              className={`h-[32px] rounded-[8px] border px-[12px] text-[11px] font-semibold ${
                form.timing === timing ? 'border-[#167d35] bg-[#eaf6ed] text-[#0d5e27]' : 'border-[#d4ddd6] bg-white text-[#45514a] hover:bg-[#f8faf8]'
              }`}
            >
              {timing === 'now' ? 'Send now' : 'Schedule for later'}
            </button>
          ))}
          {form.timing === 'later' ? (
            <input
              type="datetime-local"
              value={form.scheduledAt}
              min={toLocalInput(new Date().toISOString())}
              onChange={(event) => update('scheduledAt', event.target.value)}
              className={`${INPUT} h-[32px] w-auto`}
            />
          ) : null}
        </div>
      </div>

      <div className="rounded-[10px] bg-[#f8faf8] p-[12px]">
        {estimate ? (
          <>
            <p className="text-[12px] font-semibold text-[#17211b]">
              {formatCount(recipients)} {recipients === 1 ? 'person' : 'people'} will receive this
            </p>
            <p className="mt-[3px] text-[10px] text-[#7c857f]">
              {form.channels
                .filter((channel) => channel !== 'in_app')
                .map((channel) => `${formatCount(estimate.reachable[channel])} by ${CHANNEL_LABELS[channel].toLowerCase()}`)
                .join(' · ') || 'In-app inbox only'}
              {estimate.opted_out > 0 ? ` · ${formatCount(estimate.opted_out)} opted out and skipped` : ''}
            </p>
          </>
        ) : form.audience === 'custom' && userIds.length === 0 ? (
          <p className="text-[11px] text-[#7c857f]">Add people above to see who will receive this.</p>
        ) : estimateQuery.isError ? (
          <p className="text-[11px] text-[#b84545]">{getApiErrorMessage(estimateQuery.error, 'Could not estimate the audience.')}</p>
        ) : (
          <Skeleton className="h-[30px] w-[240px]" />
        )}
      </div>

      {error ? <p className="rounded-[8px] bg-[#fdeded] px-3 py-2 text-[11px] font-medium text-[#b84545]">{error}</p> : null}

      <div className="flex flex-wrap items-center justify-end gap-[8px] border-t border-[#e2e8e3] pt-[14px]">
        <button type="button" onClick={onCancel} className="h-[36px] rounded-[8px] px-[12px] text-[11px] font-semibold text-[#45514a] hover:bg-[#f8faf8]">
          Cancel
        </button>
        <button
          type="button"
          disabled={saveMutation.isPending}
          onClick={() => submit('draft')}
          className="h-[36px] rounded-[8px] border border-[#d4ddd6] bg-white px-[14px] text-[11px] font-semibold text-[#17211b] hover:bg-[#f8faf8] disabled:opacity-60"
        >
          Save draft
        </button>
        <button
          type="button"
          disabled={saveMutation.isPending || (primaryAction === 'send' && estimate != null && recipients === 0)}
          onClick={() => submit(primaryAction)}
          className={`h-[36px] rounded-[8px] px-[14px] text-[11px] font-semibold text-white disabled:opacity-60 ${
            confirming ? 'bg-[#b06d12] hover:bg-[#8f5810]' : 'bg-[#167d35] hover:bg-[#0d5e27]'
          }`}
        >
          {saveMutation.isPending
            ? 'Saving…'
            : primaryAction === 'schedule'
              ? 'Schedule'
              : confirming
                ? `Confirm: send to ${formatCount(recipients)} now`
                : 'Send now'}
        </button>
      </div>
    </div>
  );
}
