import { useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { FileText, MessageSquare, Paperclip, Star } from 'lucide-react';
import { fetchAdminDisputeCase } from '@/api/adminDisputesApi';
import { addAdminErrandNote, fetchAdminErrandView } from '@/api/adminErrandsApi';
import { Drawer } from '@/components/ui/Drawer';
import { useAuth } from '@/context/AuthContext';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import { canAccessPage, getAdmin2ErrandHref, getAdmin2RunnerHref, getAdmin2UserHref } from '@/lib/adminNavigation';
import { queryKeys } from '@/lib/queryKeys';
import type { AdminDisputeCase, AdminDisputeRow, AdminErrandView, DisputeChatMessage, DisputeParty } from '@/types/api';
import { formatCount, formatNaira, relativeAgo } from '../format';
import { categoryLabel, splitAddress, statusLabel, watDate, watTime } from '../errand/errandPresentation';
import { Chip, PersonAvatar } from '../errand/parts';
import { Skeleton } from '../overview/primitives';
import { userTone } from '../transactions/presentation';
import { FLAG_TONES, OUTCOME_META, PAYMENT_META, ROLE_LABELS, TONES, TYPE_META, ageLine, statusChip } from './presentation';

const TIMELINE_COLORS: Record<string, string> = { system: '#9aa39d', payment: '#735ca8', issue: '#b84545', admin: '#2c73b9' };
const TIMELINE_PREVIEW = 8;

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

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-[#e2e8e3] py-[8px] text-[12px] last:border-b-0">
      <span className="flex-shrink-0 text-[#7c857f]">{label}</span>
      <span className="min-w-0 break-words text-right font-semibold text-[#17211b]">{value}</span>
    </div>
  );
}

function Panel({ children }: { children: ReactNode }) {
  return <div className="rounded-[10px] border border-[#e2e8e3] px-[12px] py-[2px]">{children}</div>;
}

function stamp(iso: string | null | undefined): string {
  return iso ? `${watDate(iso)}, ${watTime(iso)}` : '—';
}

function Steps({ steps }: { steps: Array<{ key: string; title: string; at: string | null; detail?: string | null; color: string }> }) {
  return (
    <ol className="flex flex-col">
      {steps.map((step, index) => (
        <li key={step.key} className="relative flex gap-[10px] pb-[12px] last:pb-0">
          {index < steps.length - 1 ? <span className="absolute left-[4px] top-[12px] h-[calc(100%-8px)] w-px bg-[#e2e8e3]" /> : null}
          <span className="mt-[4px] size-[9px] flex-shrink-0 rounded-full" style={{ backgroundColor: step.color }} />
          <div className="min-w-0">
            <p className="text-[12px] font-semibold text-[#17211b]">{step.title}</p>
            <p className="break-words text-[10px] text-[#7c857f]">{[step.at ? stamp(step.at) : null, step.detail].filter(Boolean).join(' · ')}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function PartyCard({ party, label, canOpen }: { party: DisputeParty | null; label: string; canOpen: boolean }) {
  if (!party) {
    return (
      <div className="rounded-[10px] border border-dashed border-[#d4ddd6] px-[12px] py-[14px] text-[11px] text-[#7c857f]">
        No {label.toLowerCase()} on this errand.
      </div>
    );
  }
  const isRunner = party.role === 'runner';
  const href = canOpen ? (isRunner ? getAdmin2RunnerHref(party.id) : getAdmin2UserHref(party.id)) : null;
  const repeat = party.disputes_recent >= 3;
  const stats = [
    { label: 'Disputes', value: formatCount(party.disputes_total), hint: 'All disputes on errands they were part of' },
    { label: 'Last 90 days', value: formatCount(party.disputes_recent), hint: 'Disputes in the last 90 days', warn: repeat },
    { label: 'Filed by them', value: formatCount(party.disputes_filed), hint: 'Disputes they opened themselves' },
    isRunner
      ? { label: 'Jobs done', value: formatCount(party.completed_jobs ?? 0), hint: 'Completed errands as a runner' }
      : { label: 'Errands', value: formatCount(party.errands_count ?? 0), hint: 'Errands they have requested' },
  ];

  return (
    <div className={`flex flex-col gap-[10px] rounded-[10px] border px-[12px] py-[11px] ${party.filed_this ? 'border-[#cfe3d4] bg-[#fbfdfb]' : 'border-[#e2e8e3]'}`}>
      <div className="flex items-start gap-[10px]">
        <PersonAvatar name={party.name} url={party.avatar_url} tone={userTone(isRunner ? 'runner' : 'buyer')} size={36} />
        <div className="min-w-0 flex-1">
          <p className="text-[9px] font-semibold uppercase tracking-[0.27px] text-[#7c857f]">{label}</p>
          {href ? (
            <Link to={href} className="block truncate text-[13px] font-semibold text-[#17211b] hover:text-[#167d35] hover:underline">
              {party.name}
            </Link>
          ) : (
            <p className="truncate text-[13px] font-semibold text-[#17211b]">{party.name}</p>
          )}
          <p className="truncate text-[10px] text-[#7c857f]">{[party.phone, party.email].filter(Boolean).join(' · ') || '—'}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-[5px]">
        {party.filed_this ? <Chip tone={TONES.green} label="Filed this dispute" /> : null}
        {repeat ? <Chip tone={TONES.red} label="Repeat disputes" /> : null}
        {party.is_suspended ? <Chip tone={TONES.red} label="Suspended" /> : null}
        {isRunner && party.rating != null ? (
          <span className="inline-flex items-center gap-[3px] rounded-full bg-[#fff5e5] px-[8px] py-[4px] text-[10px] font-semibold leading-none text-[#b06d12]">
            <Star className="size-[10px] fill-current" strokeWidth={0} />
            {party.rating.toFixed(1)}
          </span>
        ) : null}
        {party.joined_at ? <Chip tone={TONES.gray} label={`Joined ${watDate(party.joined_at)}`} /> : null}
      </div>
      <div className="grid grid-cols-4 gap-[6px]">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-[7px] bg-[#f8faf8] px-[7px] py-[6px]" title={stat.hint}>
            <p className={`text-[13px] font-bold leading-none ${stat.warn ? 'text-[#b84545]' : 'text-[#17211b]'}`}>{stat.value}</p>
            <p className="mt-[4px] truncate text-[9px] text-[#7c857f]">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChatAttachment({ message }: { message: DisputeChatMessage }) {
  if (!message.attachment_url) return null;
  if (message.attachment_type?.startsWith('image')) {
    return (
      <a href={message.attachment_url} target="_blank" rel="noreferrer" className="mt-[5px] block">
        <img src={message.attachment_url} alt={message.attachment_name ?? 'Attachment'} loading="lazy" className="max-h-[140px] rounded-[8px] object-cover" />
      </a>
    );
  }
  return (
    <a
      href={message.attachment_url}
      target="_blank"
      rel="noreferrer"
      className="mt-[5px] inline-flex items-center gap-[5px] text-[10px] font-semibold text-[#167d35] hover:underline"
    >
      <Paperclip className="size-[11px]" strokeWidth={2} />
      {message.attachment_name ?? 'Attachment'}
    </a>
  );
}

function Conversation({ chat, filedAt }: { chat: AdminDisputeCase['chat']; filedAt: string | null }) {
  if (chat.messages.length === 0) {
    return (
      <p className="flex items-center gap-[8px] rounded-[8px] bg-[#f8faf8] px-[10px] py-[9px] text-[11px] text-[#7c857f]">
        <MessageSquare className="size-[13px]" strokeWidth={1.8} />
        The requester and runner didn't message each other on this errand.
      </p>
    );
  }
  const firstAfter = chat.messages.findIndex((message) => message.after_filing);
  return (
    <div className="flex max-h-[420px] flex-col gap-[8px] overflow-y-auto rounded-[10px] border border-[#e2e8e3] bg-[#fbfcfb] p-[10px]">
      {chat.total > chat.messages.length ? (
        <p className="text-center text-[10px] text-[#7c857f]">
          Showing the last {formatCount(chat.messages.length)} of {formatCount(chat.total)} messages
        </p>
      ) : null}
      {chat.messages.map((message, index) => {
        const runner = message.role === 'runner';
        const other = message.role === 'other';
        return (
          <div key={message.id} className="flex flex-col gap-[8px]">
            {index === firstAfter ? (
              <div className="flex items-center gap-[8px] py-[2px]">
                <span className="h-px flex-1 bg-[#f0c9c9]" />
                <span className="text-[9px] font-semibold uppercase tracking-[0.27px] text-[#b84545]">
                  Dispute filed{filedAt ? ` · ${stamp(filedAt)}` : ''}
                </span>
                <span className="h-px flex-1 bg-[#f0c9c9]" />
              </div>
            ) : null}
            <div className={`flex ${other ? 'justify-center' : runner ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] rounded-[10px] px-[10px] py-[7px] ${
                  other ? 'bg-[#f1f4f2]' : runner ? 'rounded-br-[3px] bg-[#eef5fb]' : 'rounded-bl-[3px] bg-[#eaf6ed]'
                }`}
              >
                <p className="text-[9px] font-semibold" style={{ color: other ? '#45514a' : runner ? '#2c73b9' : '#0d5e27' }}>
                  {message.sender_name} · {ROLE_LABELS[message.role]}
                </p>
                {message.body ? <p className="whitespace-pre-wrap break-words text-[12px] text-[#17211b]">{message.body}</p> : null}
                <ChatAttachment message={message} />
                <p className="mt-[3px] text-right text-[9px] text-[#7c857f]">{message.at ? stamp(message.at) : ''}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Evidence({ view }: { view: AdminErrandView }) {
  const photos = view.proof?.photos ?? [];
  const attachments = view.attachments.filter((file) => file.url);
  if (!view.proof && attachments.length === 0) {
    return <p className="text-[11px] text-[#7c857f]">No proof of delivery or attachments were uploaded for this errand.</p>;
  }
  return (
    <div className="flex flex-col gap-[8px]">
      {view.proof ? (
        <div className="rounded-[10px] border border-[#e2e8e3] px-[12px] py-[9px]">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[12px] font-semibold text-[#17211b]">Proof of delivery</p>
            {view.proof.status ? <Chip tone={view.proof.status === 'approved' ? TONES.green : view.proof.status === 'rejected' ? TONES.red : TONES.amber} label={statusLabel(view.proof.status)} /> : null}
          </div>
          <p className="text-[10px] text-[#7c857f]">{view.proof.submitted_at ? `Submitted ${stamp(view.proof.submitted_at)}` : 'Not submitted'}</p>
          {view.proof.notes ? <p className="mt-[5px] text-[11px] text-[#45514a]">“{view.proof.notes}”</p> : null}
          {view.proof.rejection_reason ? <p className="mt-[5px] text-[11px] text-[#b84545]">Rejected: {view.proof.rejection_reason}</p> : null}
          {photos.length > 0 ? (
            <div className="mt-[8px] grid grid-cols-3 gap-[6px] sm:grid-cols-4">
              {photos.map((url) => (
                <a key={url} href={url} target="_blank" rel="noreferrer" className="overflow-hidden rounded-[8px] border border-[#e2e8e3] hover:border-[#167d35]">
                  <img src={url} alt="Proof" loading="lazy" className="h-[78px] w-full bg-[#f1f4f2] object-cover" />
                </a>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
      {attachments.length > 0 ? (
        <div className="flex flex-wrap gap-[6px]">
          {attachments.map((file) => (
            <a
              key={file.id}
              href={file.url ?? undefined}
              target="_blank"
              rel="noreferrer"
              className="inline-flex max-w-full items-center gap-[6px] rounded-[8px] border border-[#e2e8e3] bg-white px-[9px] py-[6px] text-[11px] font-medium text-[#17211b] hover:border-[#167d35]"
            >
              <FileText className="size-[12px] flex-shrink-0 text-[#7c857f]" strokeWidth={1.8} />
              <span className="truncate">{file.name ?? 'Attachment'}</span>
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Notes({ view }: { view: AdminErrandView }) {
  const queryClient = useQueryClient();
  const [body, setBody] = useState('');
  const mutation = useMutation({
    mutationFn: () => addAdminErrandNote(view.errand.id, body.trim()),
    onSuccess: () => {
      setBody('');
      void queryClient.invalidateQueries({ queryKey: queryKeys.errands.view(view.errand.id) });
    },
  });
  return (
    <div className="flex flex-col gap-[8px]">
      {view.notes.length === 0 ? <p className="text-[11px] text-[#7c857f]">No internal notes yet. Notes are only visible to admins.</p> : null}
      {view.notes.map((note) => (
        <div key={note.id} className="rounded-[8px] bg-[#fffaf1] px-[10px] py-[8px]">
          <p className="whitespace-pre-wrap break-words text-[12px] text-[#17211b]">{note.body}</p>
          <p className="mt-[3px] text-[9px] text-[#7c857f]">
            {note.admin_name} · {relativeAgo(note.at)}
          </p>
        </div>
      ))}
      <form
        className="flex flex-col gap-[6px]"
        onSubmit={(event) => {
          event.preventDefault();
          if (body.trim() && !mutation.isPending) mutation.mutate();
        }}
      >
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          maxLength={2000}
          placeholder="Add a note for other admins: calls made, what each party said…"
          className="min-h-[64px] w-full resize-y rounded-[8px] border border-[#d4ddd6] bg-white px-[11px] py-[8px] text-[12px] text-[#17211b] outline-none placeholder:text-[#7c857f] focus:border-[#167d35]"
        />
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] text-[#b84545]">{mutation.isError ? getApiErrorMessage(mutation.error, 'Could not save the note.') : ''}</span>
          <button
            type="submit"
            disabled={!body.trim() || mutation.isPending}
            className="h-[30px] rounded-[7px] border border-[#d4ddd6] bg-white px-[12px] text-[11px] font-semibold text-[#17211b] hover:bg-[#f8faf8] disabled:opacity-50"
          >
            {mutation.isPending ? 'Saving…' : 'Add note'}
          </button>
        </div>
      </form>
    </div>
  );
}

function MoneyPanel({ row, view }: { row: AdminDisputeRow; view?: AdminErrandView }) {
  const payment = PAYMENT_META[row.amount.payment];
  const pricing = view?.pricing;
  return (
    <>
      <Panel>
        <Row label="Requester paid" value={row.amount.at_stake != null ? formatNaira(row.amount.at_stake) : '—'} />
        {pricing?.job_amount != null ? <Row label="Errand amount" value={formatNaira(pricing.job_amount)} /> : null}
        {pricing && pricing.service_fee > 0 ? <Row label="Service fee" value={formatNaira(pricing.service_fee)} /> : null}
        {pricing && pricing.coupon_discount > 0 ? (
          <Row label={`Coupon${pricing.coupon_code ? ` (${pricing.coupon_code})` : ''}`} value={`−${formatNaira(pricing.coupon_discount)}`} />
        ) : null}
        <Row label="Escrow" value={<Chip tone={payment.tone} label={row.amount.held > 0 ? `${formatNaira(row.amount.held)} ${payment.label.toLowerCase()}` : payment.label} />} />
        {pricing?.held_at ? <Row label="Secured" value={stamp(pricing.held_at)} /> : null}
        {pricing?.released_at ? <Row label="Released" value={stamp(pricing.released_at)} /> : null}
        {pricing?.refunded_at ? <Row label="Refunded" value={stamp(pricing.refunded_at)} /> : null}
      </Panel>
      {row.is_active ? (
        <p className="text-[10px] text-[#7c857f]">
          {row.amount.held > 0
            ? `Refunding returns ${formatNaira(row.amount.held)} to ${row.requester?.name ?? 'the requester'}. Paying the runner releases it to ${row.runner?.name ?? 'the runner'}.`
            : 'No money is held, so a decision can only close the dispute. Any goodwill credit has to be given from the user’s wallet.'}
        </p>
      ) : null}
    </>
  );
}

export function DisputeCaseDrawer({
  id,
  busy,
  onClose,
  onOpenCase,
  onTake,
  onRelease,
  onDecide,
}: {
  id: number;
  busy: boolean;
  onClose: () => void;
  onOpenCase: (id: number) => void;
  onTake: (row: AdminDisputeRow) => void;
  onRelease: (row: AdminDisputeRow) => void;
  onDecide: (row: AdminDisputeRow) => void;
}) {
  const { user: admin } = useAuth();
  const canOpenUsers = canAccessPage(admin, 'admin2-users');
  const canOpenRunners = canAccessPage(admin, 'admin2-runner');
  const canOpenErrands = canAccessPage(admin, 'admin2-errands');
  const [showFullTimeline, setShowFullTimeline] = useState(false);

  const caseQuery = useQuery({ queryKey: queryKeys.disputes.case(id), queryFn: () => fetchAdminDisputeCase(id) });
  const detail = caseQuery.data;
  const row = detail?.dispute;
  const errandId = row?.errand?.id ?? null;
  const viewQuery = useQuery({
    queryKey: queryKeys.errands.view(errandId ?? 0),
    queryFn: () => fetchAdminErrandView(errandId as number),
    enabled: errandId != null,
  });
  const view = viewQuery.data;

  const status = row ? statusChip(row) : null;
  const age = row ? ageLine(row) : null;
  const errandHref = row?.errand && canOpenErrands ? getAdmin2ErrandHref(row.errand.id) : null;
  const timeline = view?.timeline ?? [];
  const visibleTimeline = showFullTimeline ? timeline : timeline.slice(0, TIMELINE_PREVIEW);

  const footer = row ? (
    <div className="flex flex-wrap items-center justify-between gap-2">
      {errandHref ? (
        <Link to={errandHref} className="text-[12px] font-semibold text-[#167d35] hover:underline">
          Open errand {row.errand?.code} →
        </Link>
      ) : (
        <span />
      )}
      {row.is_active ? (
        <div className="flex gap-2">
          {row.is_mine ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => onRelease(row)}
              className="h-[36px] rounded-[8px] border border-[#d4ddd6] bg-white px-[14px] text-[12px] font-semibold text-[#45514a] hover:bg-[#f8faf8] disabled:opacity-60"
            >
              Hand back
            </button>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => onTake(row)}
              className="h-[36px] rounded-[8px] border border-[#d4ddd6] bg-white px-[14px] text-[12px] font-semibold text-[#17211b] hover:bg-[#f8faf8] disabled:opacity-60"
            >
              {row.assignee ? `Take over from ${row.assignee.name.split(' ')[0]}` : 'Take this case'}
            </button>
          )}
          <button
            type="button"
            onClick={() => onDecide(row)}
            className="h-[36px] rounded-[8px] bg-[#167d35] px-[14px] text-[12px] font-semibold text-white hover:bg-[#0d5e27]"
          >
            Record decision
          </button>
        </div>
      ) : null}
    </div>
  ) : undefined;

  return (
    <Drawer
      open
      onClose={onClose}
      title={row ? row.code : 'Dispute'}
      subtitle={row ? `${TYPE_META[row.type].label} dispute${row.errand ? ` · ${row.errand.code}` : ''}` : 'Dispute case'}
      width="xl"
      footer={footer}
    >
      {caseQuery.isLoading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-[110px] w-full" />
          <Skeleton className="h-[140px] w-full" />
          <Skeleton className="h-[200px] w-full" />
        </div>
      ) : null}
      {caseQuery.isError ? (
        <p className="rounded-[8px] bg-[#fdeded] px-3 py-2 text-[12px] font-medium text-[#b84545]">
          {getApiErrorMessage(caseQuery.error, 'Could not load this dispute.')}
        </p>
      ) : null}

      {detail && row && status && age ? (
        <div className="flex flex-col gap-[18px]">
          <div className="flex flex-col gap-[10px] rounded-[10px] bg-[#f8faf8] p-[14px]">
            <div className="flex flex-wrap items-center gap-[6px]">
              <Chip tone={status.tone} label={status.label} dot />
              {row.flags.map((flag) => (
                <Chip key={flag.key} tone={FLAG_TONES[flag.tone]} label={flag.label} />
              ))}
            </div>
            <blockquote className="border-l-[3px] border-[#b84545] pl-[10px] text-[14px] font-medium leading-[1.45] text-[#17211b]">
              {row.reason?.trim() || 'No reason was given.'}
            </blockquote>
            <p className="text-[11px] text-[#7c857f]">
              Filed by <span className="font-semibold text-[#17211b]">{row.raised_by?.name ?? 'someone'}</span>
              {row.raised_by ? ` (${ROLE_LABELS[row.raised_by.role].toLowerCase()})` : ''}
              {row.against ? (
                <>
                  {' '}
                  against <span className="font-semibold text-[#17211b]">{row.against.name}</span> ({ROLE_LABELS[row.against.role].toLowerCase()})
                </>
              ) : null}
              {row.created_at ? ` · ${stamp(row.created_at)}` : ''}
            </p>
            <div className="grid grid-cols-3 gap-[8px]">
              {[
                { label: 'At stake', value: row.amount.held > 0 ? formatNaira(row.amount.held) : row.amount.at_stake != null ? formatNaira(row.amount.at_stake) : '—', sub: PAYMENT_META[row.amount.payment].label },
                { label: 'Owner', value: row.assignee ? (row.is_mine ? 'You' : row.assignee.name) : 'Unassigned', sub: row.assigned_at ? `since ${relativeAgo(row.assigned_at)}` : 'Nobody has taken it yet' },
                { label: row.is_active ? 'Age' : 'Decided', value: age.label, sub: age.sub },
              ].map((item) => (
                <div key={item.label} className="min-w-0 rounded-[8px] bg-white px-[10px] py-[8px]">
                  <p className="text-[9px] text-[#7c857f]">{item.label}</p>
                  <p className="truncate text-[12px] font-semibold text-[#17211b]">{item.value}</p>
                  <p className="truncate text-[9px] text-[#7c857f]">{item.sub || '\u00a0'}</p>
                </div>
              ))}
            </div>
          </div>

          {!row.is_active ? (
            <Section title="Decision">
              <div className="rounded-[10px] border border-[#e2e8e3] px-[12px] py-[10px]">
                <div className="flex flex-wrap items-center gap-[6px]">
                  {row.outcome ? <Chip tone={OUTCOME_META[row.outcome].tone} label={OUTCOME_META[row.outcome].label} /> : null}
                  {row.settled_amount ? <span className="text-[12px] font-semibold text-[#17211b]">{formatNaira(row.settled_amount)}</span> : null}
                </div>
                <p className="mt-[6px] whitespace-pre-wrap text-[12px] text-[#17211b]">{row.resolution ?? 'No resolution note was recorded.'}</p>
                <p className="mt-[5px] text-[10px] text-[#7c857f]">
                  {[row.resolved_by ? `by ${row.resolved_by.name}` : null, row.resolved_at ? stamp(row.resolved_at) : null].filter(Boolean).join(' · ')}
                </p>
              </div>
            </Section>
          ) : null}

          <Section title="Money">
            <MoneyPanel row={row} view={view} />
          </Section>

          <Section title="Parties">
            <div className="grid gap-[8px] sm:grid-cols-2">
              <PartyCard party={detail.parties.requester} label="Requester" canOpen={canOpenUsers} />
              <PartyCard party={detail.parties.runner} label="Runner" canOpen={canOpenRunners} />
            </div>
          </Section>

          <Section title="Errand">
            {viewQuery.isLoading ? (
              <Skeleton className="h-[120px] w-full" />
            ) : view ? (
              <Panel>
                <Row label="Errand" value={[view.errand.code, view.errand.title?.trim()].filter(Boolean).join(' · ')} />
                <Row label="Category" value={categoryLabel(view.errand.category)} />
                <Row label="Status" value={statusLabel(view.errand.status)} />
                <Row label="Pickup" value={view.route.pickup.address ? splitAddress(view.route.pickup.address).title : '—'} />
                {view.route.dropoff.address ? <Row label="Drop-off" value={splitAddress(view.route.dropoff.address).title} /> : null}
                {view.items.list.length > 0 ? (
                  <Row
                    label="Items"
                    value={view.items.list
                      .slice(0, 5)
                      .map((item) => item.name)
                      .join(', ')
                      .concat(view.items.list.length > 5 ? ` +${view.items.list.length - 5} more` : '')}
                  />
                ) : null}
                {view.items.instructions ? <Row label="Instructions" value={<span className="font-normal">{view.items.instructions}</span>} /> : null}
                <Row label="Created" value={stamp(view.errand.created_at)} />
              </Panel>
            ) : row.errand ? (
              <p className="text-[11px] text-[#7c857f]">Couldn't load the errand details.</p>
            ) : (
              <p className="text-[11px] text-[#7c857f]">The errand for this dispute no longer exists.</p>
            )}
          </Section>

          {view ? (
            <Section title="Evidence">
              <Evidence view={view} />
            </Section>
          ) : null}

          <Section title={`Conversation · ${formatCount(detail.chat.total)} messages`}>
            <Conversation chat={detail.chat} filedAt={row.created_at} />
          </Section>

          {detail.related.length > 0 ? (
            <Section title="Other disputes involving these people">
              <div className="flex flex-col">
                {detail.related.map((item) => {
                  const chip = statusChip({ status: item.status, assignee: null });
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onOpenCase(item.id)}
                      className="flex items-center gap-[10px] border-b border-[#e2e8e3] py-[8px] text-left last:border-b-0 hover:bg-[#fafcfa]"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12px] font-semibold text-[#17211b]">
                          {item.code}
                          <span className="font-normal text-[#45514a]"> · {item.reason?.trim() || 'No reason given'}</span>
                        </p>
                        <p className="truncate text-[10px] text-[#7c857f]">
                          {[
                            item.errand?.code,
                            item.shared === 'both' ? 'Same requester and runner' : item.shared === 'runner' ? 'Same runner' : 'Same requester',
                            item.created_at ? watDate(item.created_at) : null,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                      </div>
                      {item.outcome ? <Chip tone={OUTCOME_META[item.outcome].tone} label={OUTCOME_META[item.outcome].label} /> : <Chip tone={chip.tone} label={chip.label} />}
                    </button>
                  );
                })}
              </div>
            </Section>
          ) : null}

          {view ? (
            <Section title="Internal notes">
              <Notes view={view} />
            </Section>
          ) : null}

          <Section title="Case history">
            <Steps
              steps={detail.history.map((event) => ({
                key: event.key,
                title: event.title,
                at: event.at,
                detail: event.detail,
                color: event.kind === 'issue' ? '#b84545' : '#2c73b9',
              }))}
            />
          </Section>

          {timeline.length > 0 ? (
            <Section
              title="Errand timeline"
              action={
                timeline.length > TIMELINE_PREVIEW ? (
                  <button type="button" onClick={() => setShowFullTimeline((v) => !v)} className="text-[10px] font-semibold text-[#167d35] hover:underline">
                    {showFullTimeline ? 'Show less' : `Show all ${timeline.length}`}
                  </button>
                ) : null
              }
            >
              <Steps
                steps={visibleTimeline.map((event) => ({
                  key: event.key,
                  title: event.title,
                  at: event.at,
                  detail: event.detail,
                  color: TIMELINE_COLORS[event.kind] ?? '#9aa39d',
                }))}
              />
            </Section>
          ) : null}
        </div>
      ) : null}
    </Drawer>
  );
}
