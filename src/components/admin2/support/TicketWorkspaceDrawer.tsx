import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ImagePlus, Lock, MessageSquareText, Paperclip, RotateCcw, Sparkles, X } from 'lucide-react';
import {
  assignAdminSupportTicket,
  fetchAdminSupportAgents,
  fetchAdminSupportWorkspace,
  replyToAdminSupportTicket,
  updateAdminSupportTicket,
  type SupportReplyInput,
  type SupportTicketUpdate,
} from '@/api/adminSupportDeskApi';
import { Drawer } from '@/components/ui/Drawer';
import { useAuth } from '@/context/AuthContext';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import { canAccessPage, getAdmin2ErrandHref, getAdmin2RunnerHref, getAdmin2UserHref } from '@/lib/adminNavigation';
import { queryKeys } from '@/lib/queryKeys';
import type { AdminSupportWorkspace, SupportDeskMessage, SupportTicketPriority } from '@/types/api';
import { formatCount, relativeAgo } from '../format';
import { statusLabel, watDate, watTime } from '../errand/errandPresentation';
import { Chip, PersonAvatar } from '../errand/parts';
import { Skeleton } from '../overview/primitives';
import { userTone } from '../transactions/presentation';
import { ActionMenu } from '../users/ActionMenu';
import {
  CANNED_REPLIES,
  CATEGORY_KEYS,
  FLAG_TONES,
  PRIORITY_META,
  PRIORITY_ORDER,
  ROLE_LABELS,
  TONES,
  WAIT_COLORS,
  categoryMeta,
  fillCanned,
  statusChip,
  waitLine,
} from './presentation';

const HISTORY_COLORS = { blue: '#2c73b9', purple: '#735ca8', green: '#167d35', amber: '#b06d12', gray: '#9aa39d' };
const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;

const SELECT_CLASS =
  'h-[30px] w-full min-w-0 rounded-[7px] border border-[#d4ddd6] bg-white px-[8px] text-[11px] font-semibold text-[#17211b] outline-none focus:border-[#167d35] disabled:opacity-60';

function stamp(iso: string | null | undefined): string {
  return iso ? `${watDate(iso)}, ${watTime(iso)}` : '—';
}

function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-[8px]">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[9px] font-semibold uppercase tracking-[0.27px] text-[#7c857f]">{title}</p>
        {action}
      </div>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-[4px]">
      <span className="text-[9px] text-[#7c857f]">{label}</span>
      {children}
    </label>
  );
}

function MessageBubble({ message }: { message: SupportDeskMessage }) {
  const customer = message.from === 'customer';
  const note = message.is_internal;
  const author = message.author?.name ?? (customer ? 'Customer' : 'Support');
  const bubble = note
    ? 'rounded-br-[3px] border border-dashed border-[#efd3a5] bg-[#fffaf1]'
    : customer
      ? 'rounded-bl-[3px] border border-[#e2e8e3] bg-white'
      : 'rounded-br-[3px] bg-[#eaf6ed]';
  const nameColor = note ? '#b06d12' : customer ? '#17211b' : '#0d5e27';

  return (
    <div className={`flex items-end gap-[8px] ${customer ? 'justify-start' : 'justify-end'}`}>
      {customer ? <PersonAvatar name={author} url={message.author?.avatar_url} tone={TONES.green} size={24} /> : null}
      <div className={`max-w-[80%] rounded-[10px] px-[10px] py-[7px] ${bubble}`}>
        <p className="flex items-center gap-[4px] text-[9px] font-semibold" style={{ color: nameColor }}>
          {note ? <Lock className="size-[9px]" strokeWidth={2.2} /> : null}
          {note ? `Internal note · ${author}` : customer ? author : `${author} · Support`}
        </p>
        {message.body ? <p className="whitespace-pre-wrap break-words text-[12px] leading-[1.45] text-[#17211b]">{message.body}</p> : null}
        {message.attachment_url ? (
          <a href={message.attachment_url} target="_blank" rel="noreferrer" className="mt-[5px] block">
            <img src={message.attachment_url} alt="Attachment" loading="lazy" className="max-h-[160px] rounded-[8px] border border-[#e2e8e3] object-cover" />
          </a>
        ) : null}
        <p className="mt-[3px] text-right text-[9px] text-[#7c857f]">{stamp(message.created_at)}</p>
      </div>
    </div>
  );
}

function Thread({ messages }: { messages: SupportDeskMessage[] }) {
  const endRef = useRef<HTMLDivElement>(null);
  const last = messages[messages.length - 1]?.id;
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'nearest' });
  }, [last]);

  if (messages.length === 0) {
    return (
      <p className="flex items-center gap-[8px] rounded-[8px] bg-[#f8faf8] px-[10px] py-[9px] text-[11px] text-[#7c857f]">
        <MessageSquareText className="size-[13px]" strokeWidth={1.8} />
        No messages on this ticket yet.
      </p>
    );
  }
  return (
    <div className="flex max-h-[460px] flex-col gap-[10px] overflow-y-auto rounded-[10px] border border-[#e2e8e3] bg-[#fbfcfb] p-[12px]">
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
      <div ref={endRef} />
    </div>
  );
}

function RequesterPanel({
  workspace,
  canOpenProfile,
  onOpenTicket,
}: {
  workspace: AdminSupportWorkspace;
  canOpenProfile: boolean;
  onOpenTicket: (id: number) => void;
}) {
  const person = workspace.ticket.requester;
  const context = workspace.requester;
  if (!person || !context) {
    return <div className="rounded-[10px] border border-dashed border-[#d4ddd6] px-[12px] py-[14px] text-[11px] text-[#7c857f]">The account that opened this ticket no longer exists.</div>;
  }
  const isRunner = person.role === 'runner';
  const href = canOpenProfile ? (isRunner ? getAdmin2RunnerHref(person.id) : getAdmin2UserHref(person.id)) : null;
  const repeat = context.tickets_recent >= 3;
  const stats = [
    { label: 'Tickets', value: formatCount(context.tickets_total), hint: 'All support tickets they have opened' },
    { label: 'Still open', value: formatCount(context.tickets_open), hint: 'Their tickets that are not resolved yet' },
    { label: 'Last 30 days', value: formatCount(context.tickets_recent), hint: 'Tickets opened in the last 30 days', warn: repeat },
    { label: 'Errands', value: formatCount(context.errands_count), hint: isRunner ? 'Errands they have run' : 'Errands they have requested' },
  ];

  return (
    <div className="flex flex-col gap-[10px] rounded-[10px] border border-[#e2e8e3] px-[12px] py-[11px]">
      <div className="flex items-start gap-[10px]">
        <PersonAvatar name={person.name} url={person.avatar_url} tone={userTone(isRunner ? 'runner' : 'buyer')} size={36} />
        <div className="min-w-0 flex-1">
          <p className="text-[9px] font-semibold uppercase tracking-[0.27px] text-[#7c857f]">{ROLE_LABELS[person.role]}</p>
          {href ? (
            <Link to={href} className="block truncate text-[13px] font-semibold text-[#17211b] hover:text-[#167d35] hover:underline">
              {person.name}
            </Link>
          ) : (
            <p className="truncate text-[13px] font-semibold text-[#17211b]">{person.name}</p>
          )}
          <p className="truncate text-[10px] text-[#7c857f]">{[person.phone, person.email].filter(Boolean).join(' · ') || '—'}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-[5px]">
        {repeat ? <Chip tone={TONES.amber} label="Frequent contact" /> : null}
        {context.is_suspended ? <Chip tone={TONES.red} label="Suspended" /> : null}
        {context.joined_at ? <Chip tone={TONES.gray} label={`Joined ${watDate(context.joined_at)}`} /> : null}
      </div>
      <div className="grid grid-cols-4 gap-[6px]">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-[7px] bg-[#f8faf8] px-[7px] py-[6px]" title={stat.hint}>
            <p className={`text-[13px] font-bold leading-none ${stat.warn ? 'text-[#b06d12]' : 'text-[#17211b]'}`}>{stat.value}</p>
            <p className="mt-[4px] truncate text-[9px] text-[#7c857f]">{stat.label}</p>
          </div>
        ))}
      </div>
      {context.recent_tickets.length > 0 ? (
        <div className="flex flex-col border-t border-[#e2e8e3] pt-[6px]">
          <p className="pb-[2px] text-[9px] font-semibold uppercase tracking-[0.27px] text-[#7c857f]">Their other tickets</p>
          {context.recent_tickets.map((item) => {
            const chip = statusChip(item.status);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onOpenTicket(item.id)}
                className="flex items-center gap-[10px] border-b border-[#eef1ee] py-[7px] text-left last:border-b-0 hover:bg-[#fafcfa]"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-semibold text-[#17211b]">
                    {item.code}
                    <span className="font-normal text-[#45514a]"> · {item.subject}</span>
                  </p>
                  <p className="truncate text-[9px] text-[#7c857f]">
                    {[categoryMeta(item.category).label, item.created_at ? watDate(item.created_at) : null].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <Chip tone={chip.tone} label={chip.label} />
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function Composer({
  workspace,
  pending,
  error,
  onSend,
  onReopen,
}: {
  workspace: AdminSupportWorkspace;
  pending: boolean;
  error: string | null;
  onSend: (input: SupportReplyInput, reset: () => void) => void;
  onReopen: () => void;
}) {
  const ticket = workspace.ticket;
  const locked = !ticket.is_active;
  const [mode, setMode] = useState<'reply' | 'note'>(locked ? 'note' : 'reply');
  const [body, setBody] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const internal = mode === 'note' || locked;
  const canSend = body.trim().length > 0 && !pending;

  const reset = () => {
    setBody('');
    setFile(null);
    setFileError(null);
    if (fileRef.current) fileRef.current.value = '';
  };
  const send = (then: 'awaiting_user' | 'resolved') => {
    if (!canSend) return;
    onSend({ message: body.trim(), internal, then, attachment: file }, reset);
  };

  return (
    <div className="flex flex-col gap-[8px]">
      <div className="flex items-center justify-between gap-2">
        <div className="flex rounded-[8px] bg-[#f1f4f2] p-[3px]">
          {(
            [
              { value: 'reply', label: 'Reply to customer' },
              { value: 'note', label: 'Internal note' },
            ] as const
          ).map((option) => {
            const active = (option.value === 'note') === internal;
            const disabled = option.value === 'reply' && locked;
            return (
              <button
                key={option.value}
                type="button"
                disabled={disabled}
                onClick={() => setMode(option.value)}
                title={disabled ? 'Reopen the ticket to reply to the customer' : undefined}
                className={`h-[26px] rounded-[6px] px-[10px] text-[11px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                  active ? (option.value === 'note' ? 'bg-[#fffaf1] text-[#b06d12] shadow-sm' : 'bg-white text-[#17211b] shadow-sm') : 'text-[#7c857f] hover:text-[#17211b]'
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
        {!internal ? (
          <ActionMenu
            ariaLabel="Insert a saved reply"
            align="right"
            className="flex h-[28px] items-center gap-[5px] rounded-[7px] border border-[#d4ddd6] bg-white px-[9px] text-[10px] font-semibold text-[#45514a] hover:bg-[#f8faf8]"
            items={CANNED_REPLIES.map((reply) => ({
              label: reply.label,
              onSelect: () => setBody((current) => (current.trim() ? `${current.trimEnd()}\n\n` : '') + fillCanned(reply.body, ticket.requester?.name)),
            }))}
          >
            <Sparkles className="size-[12px]" strokeWidth={1.9} />
            Saved replies
          </ActionMenu>
        ) : null}
      </div>

      {locked ? (
        <div className="flex items-center justify-between gap-2 rounded-[8px] bg-[#f1f4f2] px-[10px] py-[7px] text-[10px] text-[#45514a]">
          <span>This ticket is {ticket.status === 'closed' ? 'closed' : 'resolved'}. You can still leave internal notes, or reopen it to reply.</span>
          <button type="button" onClick={onReopen} disabled={pending} className="flex flex-shrink-0 items-center gap-[4px] font-semibold text-[#167d35] hover:underline disabled:opacity-60">
            <RotateCcw className="size-[11px]" strokeWidth={2} />
            Reopen
          </button>
        </div>
      ) : null}

      <textarea
        value={body}
        onChange={(event) => setBody(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
            event.preventDefault();
            send('awaiting_user');
          }
        }}
        maxLength={5000}
        rows={3}
        placeholder={
          internal
            ? 'Add a note for the team. The customer never sees internal notes.'
            : `Write to ${ticket.requester?.name.split(' ')[0] ?? 'the customer'}…`
        }
        className={`min-h-[78px] w-full resize-y rounded-[8px] border px-[11px] py-[8px] text-[12px] text-[#17211b] outline-none placeholder:text-[#7c857f] ${
          internal ? 'border-[#efd3a5] bg-[#fffdf8] focus:border-[#b06d12]' : 'border-[#d4ddd6] bg-white focus:border-[#167d35]'
        }`}
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-[8px]">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              const next = event.target.files?.[0] ?? null;
              if (next && next.size > MAX_ATTACHMENT_BYTES) {
                setFileError('Images must be 5 MB or smaller.');
                setFile(null);
                event.target.value = '';
                return;
              }
              setFileError(null);
              setFile(next);
            }}
          />
          {file ? (
            <span className="flex min-w-0 items-center gap-[5px] rounded-full bg-[#f1f4f2] py-[3px] pl-[8px] pr-[4px] text-[10px] text-[#17211b]">
              <Paperclip className="size-[11px] flex-shrink-0 text-[#7c857f]" strokeWidth={2} />
              <span className="max-w-[160px] truncate">{file.name}</span>
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  if (fileRef.current) fileRef.current.value = '';
                }}
                className="rounded-full p-[2px] text-[#7c857f] hover:bg-white hover:text-[#17211b]"
                aria-label="Remove attachment"
              >
                <X className="size-[10px]" strokeWidth={2.2} />
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex h-[28px] items-center gap-[5px] rounded-[7px] px-[6px] text-[10px] font-semibold text-[#45514a] hover:bg-[#f1f4f2]"
            >
              <ImagePlus className="size-[13px]" strokeWidth={1.8} />
              Attach image
            </button>
          )}
          <span className="truncate text-[10px] text-[#b84545]">{fileError ?? error ?? ''}</span>
        </div>
        <div className="flex items-center gap-[6px]">
          {internal ? (
            <button
              type="button"
              onClick={() => send('awaiting_user')}
              disabled={!canSend}
              className="h-[34px] rounded-[8px] bg-[#b06d12] px-[14px] text-[12px] font-semibold text-white hover:bg-[#8f580e] disabled:opacity-50"
            >
              {pending ? 'Saving…' : 'Add note'}
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => send('resolved')}
                disabled={!canSend}
                title="Send the reply and mark the ticket resolved"
                className="h-[34px] rounded-[8px] border border-[#d4ddd6] bg-white px-[12px] text-[12px] font-semibold text-[#17211b] hover:bg-[#f8faf8] disabled:opacity-50"
              >
                Send & resolve
              </button>
              <button
                type="button"
                onClick={() => send('awaiting_user')}
                disabled={!canSend}
                title="Send the reply and wait for the customer (Ctrl+Enter)"
                className="h-[34px] rounded-[8px] bg-[#167d35] px-[14px] text-[12px] font-semibold text-white hover:bg-[#0d5e27] disabled:opacity-50"
              >
                {pending ? 'Sending…' : 'Send reply'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function TicketWorkspaceDrawer({
  id,
  onClose,
  onOpenTicket,
  onNotice,
}: {
  id: number;
  onClose: () => void;
  onOpenTicket: (id: number) => void;
  onNotice: (text: string) => void;
}) {
  const queryClient = useQueryClient();
  const { user: admin } = useAuth();
  const canOpenProfile = canAccessPage(admin, 'admin2-users');
  const canOpenErrands = canAccessPage(admin, 'admin2-errands');

  const workspaceQuery = useQuery({
    queryKey: queryKeys.tickets.workspace(id),
    queryFn: () => fetchAdminSupportWorkspace(id),
    refetchInterval: 20_000,
  });
  const agentsQuery = useQuery({ queryKey: queryKeys.tickets.agents, queryFn: fetchAdminSupportAgents, staleTime: 60_000 });
  const workspace = workspaceQuery.data;
  const ticket = workspace?.ticket;

  const settle = (next: AdminSupportWorkspace, message: string) => {
    queryClient.setQueryData(queryKeys.tickets.workspace(id), next);
    void queryClient.invalidateQueries({ queryKey: queryKeys.tickets.all, predicate: (query) => query.queryKey[1] !== 'workspace' });
    void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.badges });
    if (message) onNotice(message);
  };

  const loaded = workspaceQuery.isSuccess;
  useEffect(() => {
    if (loaded) {
      void queryClient.invalidateQueries({ queryKey: queryKeys.tickets.all, predicate: (query) => query.queryKey[1] === 'desk' });
    }
  }, [loaded, queryClient]);

  const reply = useMutation({
    mutationFn: ({ input }: { input: SupportReplyInput; reset: () => void }) => replyToAdminSupportTicket(id, input),
    onSuccess: (result, { reset }) => {
      reset();
      settle(result.workspace, result.message);
    },
  });
  const update = useMutation({
    mutationFn: (input: SupportTicketUpdate) => updateAdminSupportTicket(id, input),
    onSuccess: (result) => settle(result.workspace, result.message),
  });
  const assign = useMutation({
    mutationFn: (assigneeId: number | null | undefined) => assignAdminSupportTicket(id, assigneeId),
    onSuccess: (result) => {
      settle(result.workspace, result.message);
      void queryClient.invalidateQueries({ queryKey: queryKeys.tickets.agents });
    },
  });
  const busy = reply.isPending || update.isPending || assign.isPending;
  const actionError = update.isError
    ? getApiErrorMessage(update.error, 'Could not update the ticket.')
    : assign.isError
      ? getApiErrorMessage(assign.error, 'Could not change the owner.')
      : null;

  const status = ticket ? statusChip(ticket.status) : null;
  const wait = ticket ? waitLine(ticket) : null;
  const agents = agentsQuery.data ?? [];
  const errandHref = ticket?.errand && canOpenErrands ? getAdmin2ErrandHref(ticket.errand.id) : null;
  const notes = workspace?.messages.filter((message) => message.is_internal).length ?? 0;

  const footer =
    workspace && ticket ? (
      <Composer
        key={`${ticket.id}-${ticket.is_active ? 'open' : 'locked'}`}
        workspace={workspace}
        pending={reply.isPending}
        error={reply.isError ? getApiErrorMessage(reply.error, 'Could not send the message.') : null}
        onSend={(input, reset) => reply.mutate({ input, reset })}
        onReopen={() => update.mutate({ status: 'open' })}
      />
    ) : undefined;

  return (
    <Drawer
      open
      onClose={onClose}
      title={ticket ? ticket.code : 'Support ticket'}
      subtitle={ticket ? `${categoryMeta(ticket.category).label} ticket${ticket.requester ? ` from ${ticket.requester.name}` : ''}` : 'Loading ticket'}
      width="2xl"
      footer={footer}
    >
      {workspaceQuery.isLoading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-[130px] w-full" />
          <Skeleton className="h-[240px] w-full" />
          <Skeleton className="h-[140px] w-full" />
        </div>
      ) : null}
      {workspaceQuery.isError ? (
        <p className="rounded-[8px] bg-[#fdeded] px-3 py-2 text-[12px] font-medium text-[#b84545]">
          {getApiErrorMessage(workspaceQuery.error, 'Could not load this ticket.')}
        </p>
      ) : null}

      {workspace && ticket && status && wait ? (
        <div className="flex flex-col gap-[18px]">
          <div className="flex flex-col gap-[10px] rounded-[10px] bg-[#f8faf8] p-[14px]">
            <div className="flex flex-wrap items-center gap-[6px]">
              <Chip tone={status.tone} label={status.label} dot />
              <Chip tone={(PRIORITY_META[ticket.priority] ?? PRIORITY_META.normal).tone} label={`${(PRIORITY_META[ticket.priority] ?? PRIORITY_META.normal).label} priority`} />
              {ticket.flags.map((flag) => (
                <Chip key={flag.key} tone={FLAG_TONES[flag.tone]} label={flag.label} />
              ))}
            </div>
            <p className="text-[15px] font-semibold leading-[1.4] text-[#17211b]">{ticket.subject}</p>
            <p className="text-[11px] text-[#7c857f]">
              Opened {stamp(ticket.created_at)}
              {ticket.errand ? (
                <>
                  {' · about '}
                  {errandHref ? (
                    <Link to={errandHref} className="font-semibold text-[#167d35] hover:underline">
                      {ticket.errand.code}
                    </Link>
                  ) : (
                    <span className="font-semibold text-[#17211b]">{ticket.errand.code}</span>
                  )}
                  {ticket.errand.title ? ` (${ticket.errand.title}, ${statusLabel(ticket.errand.status).toLowerCase()})` : ''}
                </>
              ) : null}
            </p>

            <div className="grid grid-cols-3 gap-[8px]">
              {[
                {
                  label: ticket.is_active ? 'Waiting' : 'Outcome',
                  value: wait.label,
                  sub: wait.sub,
                  color: WAIT_COLORS[wait.tone],
                },
                {
                  label: 'First reply',
                  value: ticket.first_response_at ? relativeAgo(ticket.first_response_at) : 'Not yet',
                  sub: `Target ${ticket.target_hours}h for ${(PRIORITY_META[ticket.priority] ?? PRIORITY_META.normal).label.toLowerCase()}`,
                  color: ticket.first_response_at ? '#17211b' : '#b06d12',
                },
                {
                  label: 'Conversation',
                  value: `${formatCount(ticket.messages_count)} message${ticket.messages_count === 1 ? '' : 's'}`,
                  sub: notes > 0 ? `${formatCount(notes)} internal note${notes === 1 ? '' : 's'}` : 'No internal notes',
                  color: '#17211b',
                },
              ].map((item) => (
                <div key={item.label} className="min-w-0 rounded-[8px] bg-white px-[10px] py-[8px]">
                  <p className="text-[9px] text-[#7c857f]">{item.label}</p>
                  <p className="truncate text-[12px] font-semibold" style={{ color: item.color }}>
                    {item.value}
                  </p>
                  <p className="truncate text-[9px] text-[#7c857f]">{item.sub || '\u00a0'}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-[8px] sm:grid-cols-3">
              <Field label="Owner">
                <select
                  className={SELECT_CLASS}
                  value={ticket.assignee ? String(ticket.assignee.id) : ''}
                  disabled={busy}
                  onChange={(event) => assign.mutate(event.target.value ? Number(event.target.value) : null)}
                >
                  <option value="">Unassigned</option>
                  {ticket.assignee && !agents.some((agent) => agent.id === ticket.assignee?.id) ? (
                    <option value={ticket.assignee.id}>{ticket.assignee.name}</option>
                  ) : null}
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.is_me ? `You (${agent.name})` : agent.name} · {formatCount(agent.open)} open
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Priority">
                <select
                  className={SELECT_CLASS}
                  value={ticket.priority}
                  disabled={busy}
                  onChange={(event) => update.mutate({ priority: event.target.value as SupportTicketPriority })}
                >
                  {PRIORITY_ORDER.map((key) => (
                    <option key={key} value={key}>
                      {PRIORITY_META[key].label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Topic">
                <select className={SELECT_CLASS} value={ticket.category} disabled={busy} onChange={(event) => update.mutate({ category: event.target.value })}>
                  {CATEGORY_KEYS.map((key) => (
                    <option key={key} value={key}>
                      {categoryMeta(key).label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="flex flex-wrap items-center gap-[6px]">
              {!ticket.is_mine ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => assign.mutate(undefined)}
                  className="h-[30px] rounded-[7px] border border-[#167d35] bg-[#167d35] px-[11px] text-[11px] font-semibold text-white hover:bg-[#0d5e27] disabled:opacity-60"
                >
                  {ticket.assignee ? `Take over from ${ticket.assignee.name.split(' ')[0]}` : 'Take this ticket'}
                </button>
              ) : null}
              {ticket.is_active ? (
                <>
                  {ticket.status === 'open' ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => update.mutate({ status: 'awaiting_user' })}
                      title="Use when you replied outside the desk, e.g. by phone"
                      className="h-[30px] rounded-[7px] border border-[#d4ddd6] bg-white px-[11px] text-[11px] font-semibold text-[#17211b] hover:bg-[#eef3ef] disabled:opacity-60"
                    >
                      Mark waiting on customer
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => update.mutate({ status: 'open' })}
                      className="h-[30px] rounded-[7px] border border-[#d4ddd6] bg-white px-[11px] text-[11px] font-semibold text-[#17211b] hover:bg-[#eef3ef] disabled:opacity-60"
                    >
                      Move back to needs reply
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => update.mutate({ status: 'resolved' })}
                    className="h-[30px] rounded-[7px] border border-[#cfe5d5] bg-[#eaf6ed] px-[11px] text-[11px] font-semibold text-[#0d5e27] hover:brightness-95 disabled:opacity-60"
                  >
                    Mark resolved
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => update.mutate({ status: 'closed' })}
                    title="Close without notifying the customer, e.g. spam or duplicates"
                    className="h-[30px] rounded-[7px] px-[8px] text-[11px] font-semibold text-[#7c857f] hover:bg-[#eef3ef] hover:text-[#17211b] disabled:opacity-60"
                  >
                    Close
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => update.mutate({ status: 'open' })}
                  className="flex h-[30px] items-center gap-[5px] rounded-[7px] border border-[#d4ddd6] bg-white px-[11px] text-[11px] font-semibold text-[#17211b] hover:bg-[#eef3ef] disabled:opacity-60"
                >
                  <RotateCcw className="size-[12px]" strokeWidth={2} />
                  Reopen ticket
                </button>
              )}
              {ticket.assignee && ticket.is_active ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => assign.mutate(null)}
                  className="h-[30px] rounded-[7px] px-[8px] text-[11px] font-semibold text-[#7c857f] hover:bg-[#eef3ef] hover:text-[#17211b] disabled:opacity-60"
                >
                  Hand back
                </button>
              ) : null}
            </div>
            {actionError ? <p className="text-[10px] font-medium text-[#b84545]">{actionError}</p> : null}
          </div>

          <Section title={`Conversation · ${formatCount(workspace.messages.length)} entries`}>
            <Thread messages={workspace.messages} />
          </Section>

          <Section title="Who's asking">
            <RequesterPanel workspace={workspace} canOpenProfile={canOpenProfile} onOpenTicket={onOpenTicket} />
          </Section>

          <Section title="Ticket history">
            <ol className="flex flex-col">
              {workspace.history.map((event, index) => (
                <li key={event.key} className="relative flex gap-[10px] pb-[12px] last:pb-0">
                  {index < workspace.history.length - 1 ? <span className="absolute left-[4px] top-[12px] h-[calc(100%-8px)] w-px bg-[#e2e8e3]" /> : null}
                  <span className="mt-[4px] size-[9px] flex-shrink-0 rounded-full" style={{ backgroundColor: HISTORY_COLORS[event.tone] }} />
                  <div className="min-w-0">
                    <p className="text-[12px] font-semibold text-[#17211b]">{event.label}</p>
                    <p className="text-[10px] text-[#7c857f]">{stamp(event.at)}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Section>
        </div>
      ) : null}
    </Drawer>
  );
}
