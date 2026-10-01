import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addAdminUserNote } from '@/api/adminUsersApi';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import { getPageHref } from '@/lib/adminNavigation';
import { queryKeys } from '@/lib/queryKeys';
import type { AdminUserProfile } from '@/types/api';
import { formatCount } from '../format';
import { Card } from '../overview/primitives';
import { SectionHeader, SectionLink } from '../errand/parts';
import { titleCase, watShortDate } from '../errand/errandPresentation';
import { HEALTH_LEVELS } from './presentation';

const VISIBLE_NOTES = 2;

function Indicator({ value, label, bg, color }: { value: string; label: string; bg: string; color?: string }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-[3px] rounded-[8px] p-[10px]" style={{ backgroundColor: bg, color }}>
      <p className="text-[16px] font-bold" style={{ color: color ?? '#17211b' }}>
        {value}
      </p>
      <p className="text-[9px]" style={{ color: color ?? '#7c857f' }}>
        {label}
      </p>
    </div>
  );
}

export function SupportRiskCard({ profile, canOpenTickets }: { profile: AdminUserProfile; canOpenTickets: boolean }) {
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [body, setBody] = useState('');
  const { health, support, notes, user } = profile;
  const level = HEALTH_LEVELS[health.level];

  const mutation = useMutation({
    mutationFn: () => addAdminUserNote(user.id, body.trim()),
    onSuccess: ({ notes: next }) => {
      queryClient.setQueryData<AdminUserProfile>(queryKeys.users.profile(user.id), (current) =>
        current ? { ...current, notes: next } : current,
      );
      setBody('');
      setAdding(false);
    },
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (body.trim().length >= 2) mutation.mutate();
  };

  const visibleNotes = showAll ? notes : notes.slice(0, VISIBLE_NOTES);
  const ticket = support.last_ticket;

  return (
    <Card className="flex w-full flex-col gap-[13px] p-[18px]">
      <SectionHeader
        title="Support & risk notes"
        subtitle="Customer care and trust signals"
        action={!adding ? <SectionLink onClick={() => setAdding(true)}>Add note</SectionLink> : null}
      />
      <div className="flex gap-[8px]">
        <Indicator value={level.risk} label="Risk level" bg={level.tone.bg} color={level.tone.color} />
        <Indicator value={formatCount(support.tickets_total)} label={support.tickets_open ? `Tickets · ${support.tickets_open} open` : 'Tickets'} bg="#f8faf8" />
        <Indicator value={formatCount(support.disputes_total)} label={support.disputes_open ? `Disputes · ${support.disputes_open} open` : 'Disputes'} bg="#f8faf8" />
      </div>
      {health.factors.length > 0 ? (
        <p className="text-[10px] leading-[1.45] text-[#7c857f]">Score reduced by: {health.factors.join(' · ')}</p>
      ) : null}

      {adding ? (
        <form onSubmit={submit} className="flex flex-col gap-[8px]">
          <textarea
            autoFocus
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={1000}
            placeholder="Add context for other admins…"
            className="min-h-[80px] w-full resize-y rounded-[8px] border border-[#d4ddd6] bg-white px-[11px] py-[9px] text-[11px] text-[#17211b] outline-none placeholder:text-[#7c857f] focus:border-[#167d35]"
          />
          {mutation.isError ? (
            <p className="text-[10px] font-medium text-[#b84545]">{getApiErrorMessage(mutation.error, 'Could not save note.')}</p>
          ) : null}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setAdding(false);
                setBody('');
                mutation.reset();
              }}
              className="h-[32px] rounded-[8px] border border-[#d4ddd6] bg-white px-[12px] text-[11px] font-semibold text-[#45514a]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending || body.trim().length < 2}
              className="h-[32px] rounded-[8px] bg-[#167d35] px-[12px] text-[11px] font-semibold text-white disabled:opacity-60"
            >
              {mutation.isPending ? 'Saving…' : 'Save note'}
            </button>
          </div>
        </form>
      ) : null}

      {visibleNotes.map((note) => (
        <div key={note.id} className="flex flex-col gap-[5px] rounded-[8px] bg-[#fff5e5] p-[12px]">
          <p className="whitespace-pre-line text-[10px] leading-[1.45] text-[#45514a]">{note.body}</p>
          <p className="text-[9px] text-[#7c857f]">
            {note.admin_name} · {watShortDate(note.at)}
          </p>
        </div>
      ))}
      {notes.length === 0 && !adding ? <p className="text-[10px] text-[#7c857f]">No notes yet. Notes are visible to admins only.</p> : null}
      {notes.length > VISIBLE_NOTES ? (
        <button type="button" onClick={() => setShowAll((v) => !v)} className="self-start text-[10px] font-semibold text-[#167d35] hover:underline">
          {showAll ? 'Show fewer notes' : `Show all ${notes.length} notes`}
        </button>
      ) : null}

      <div className="flex items-center justify-between gap-3 text-[10px]">
        <p className="text-[#7c857f]">Last ticket</p>
        {ticket ? (
          canOpenTickets ? (
            <Link to={getPageHref('tickets', { openId: ticket.id })} className="truncate font-semibold text-[#167d35] hover:underline">
              {ticket.code} · {titleCase(ticket.status.replace(/_/g, ' '))}
            </Link>
          ) : (
            <p className="truncate font-semibold text-[#45514a]">
              {ticket.code} · {titleCase(ticket.status.replace(/_/g, ' '))}
            </p>
          )
        ) : (
          <p className="text-[#45514a]">None</p>
        )}
      </div>
    </Card>
  );
}
