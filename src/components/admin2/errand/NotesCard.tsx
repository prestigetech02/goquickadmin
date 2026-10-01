import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addAdminErrandNote } from '@/api/adminErrandsApi';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import { queryKeys } from '@/lib/queryKeys';
import type { AdminErrandView } from '@/types/api';
import { Card } from '../overview/primitives';
import { isSameWatDay, watShortDate, watTime } from './errandPresentation';
import { SectionHeader, SectionLink } from './parts';

export function NotesCard({ view }: { view: AdminErrandView }) {
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [body, setBody] = useState('');
  const errandId = view.errand.id;

  const mutation = useMutation({
    mutationFn: () => addAdminErrandNote(errandId, body.trim()),
    onSuccess: ({ notes }) => {
      queryClient.setQueryData<AdminErrandView>(queryKeys.errands.view(errandId), (current) =>
        current ? { ...current, notes } : current,
      );
      setBody('');
      setAdding(false);
    },
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (body.trim().length < 2) return;
    mutation.mutate();
  };

  return (
    <Card className="flex w-full flex-col gap-[12px] p-[18px]">
      <SectionHeader
        title="Notes"
        subtitle="Visible to GoQuick operations only"
        action={!adding ? <SectionLink onClick={() => setAdding(true)}>Add note</SectionLink> : null}
      />
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
      {view.notes.length === 0 && !adding ? <p className="text-[11px] text-[#7c857f]">No notes yet.</p> : null}
      {view.notes.map((note) => (
        <div key={note.id} className="flex flex-col gap-[5px] rounded-[8px] bg-[#fff5e5] p-[12px]">
          <p className="whitespace-pre-line text-[11px] leading-[1.45] text-[#45514a]">{note.body}</p>
          <p className="text-[9px] text-[#7c857f]">
            {note.admin_name} · {isSameWatDay(note.at) ? watTime(note.at) : `${watShortDate(note.at)}, ${watTime(note.at)}`}
          </p>
        </div>
      ))}
    </Card>
  );
}
