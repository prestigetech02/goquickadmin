import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, CircleCheck, Link2Off } from 'lucide-react';
import { fetchBlogCalendar, fetchBlogLinkIssues } from '@/api/adminBlogApi';
import { Modal } from '@/components/ui/Modal';
import { getApiErrorMessage } from '@/lib/adminAuthApi';
import { getAdmin2BlogPostHref } from '@/lib/adminNavigation';
import { queryKeys } from '@/lib/queryKeys';
import type { BlogBoardRow, BlogCalendar } from '@/types/api';
import { watTime } from '../errand/errandPresentation';
import { Chip } from '../errand/parts';
import { formatCount } from '../format';
import { Skeleton } from '../overview/primitives';
import { defaultScheduleInput, statusChip, toLocalInput } from './presentation';

const SECONDARY =
  'h-[36px] rounded-[8px] border border-[#d4ddd6] bg-white px-[14px] text-[11px] font-semibold text-[#17211b] hover:bg-[#f8faf8] disabled:opacity-60';
const PRIMARY = 'h-[36px] rounded-[8px] bg-[#167d35] px-[14px] text-[11px] font-semibold text-white hover:bg-[#0d5e27] disabled:opacity-60';
const DANGER = 'h-[36px] rounded-[8px] bg-[#b84545] px-[14px] text-[11px] font-semibold text-white hover:bg-[#9a3434] disabled:opacity-60';

export function ScheduleModal({
  row,
  busy,
  onClose,
  onConfirm,
}: {
  row: Pick<BlogBoardRow, 'title' | 'status' | 'published_at'> | null;
  busy: boolean;
  onClose: () => void;
  onConfirm: (publishedAtIso: string) => void;
}) {
  return (
    <Modal open={row != null} onClose={() => (busy ? undefined : onClose())} title={row?.status === 'scheduled' ? 'Reschedule post' : 'Schedule post'} size="sm">
      {row ? <ScheduleForm key={row.title} row={row} busy={busy} onClose={onClose} onConfirm={onConfirm} /> : null}
    </Modal>
  );
}

function ScheduleForm({
  row,
  busy,
  onClose,
  onConfirm,
}: {
  row: Pick<BlogBoardRow, 'title' | 'status' | 'published_at'>;
  busy: boolean;
  onClose: () => void;
  onConfirm: (publishedAtIso: string) => void;
}) {
  const [value, setValue] = useState(() =>
    row.status === 'scheduled' && row.published_at ? toLocalInput(new Date(row.published_at)) : defaultScheduleInput(),
  );
  const at = value ? new Date(value) : null;
  const inPast = at != null && at.getTime() <= Date.now();

  return (
    <div className="flex flex-col gap-[14px] font-inter">
      <p className="text-[12px] leading-relaxed text-[#45514a]">
        &ldquo;{row.title}&rdquo; goes live on the public blog at the time you pick. It stays hidden from readers until then.
      </p>
      <label className="flex flex-col gap-[6px]">
        <span className="text-[11px] font-semibold text-[#17211b]">Publish date and time</span>
        <input
          type="datetime-local"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="h-[38px] rounded-[8px] border border-[#d4ddd6] px-[10px] text-[12px] text-[#17211b] outline-none focus:border-[#167d35]"
        />
        {inPast ? <span className="text-[10px] text-[#b84545]">Pick a time in the future.</span> : null}
      </label>
      <div className="flex justify-end gap-[8px]">
        <button type="button" onClick={onClose} disabled={busy} className={SECONDARY}>
          Cancel
        </button>
        <button type="button" disabled={busy || !at || inPast} onClick={() => at && onConfirm(at.toISOString())} className={PRIMARY}>
          {busy ? 'Scheduling…' : 'Schedule post'}
        </button>
      </div>
    </div>
  );
}

export function DeletePostModal({
  row,
  busy,
  onClose,
  onConfirm,
}: {
  row: Pick<BlogBoardRow, 'title' | 'status'> | null;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal open={row != null} onClose={() => (busy ? undefined : onClose())} title="Delete post?" size="sm">
      {row ? (
        <div className="flex flex-col gap-[14px] font-inter">
          <p className="text-[12px] leading-relaxed text-[#45514a]">
            &ldquo;{row.title}&rdquo; and its reading stats will be permanently removed
            {row.status === 'published' ? ', and readers following old links will see a not-found page' : ''}. To keep it out of sight but recoverable,
            archive it instead.
          </p>
          <div className="flex justify-end gap-[8px]">
            <button type="button" onClick={onClose} disabled={busy} className={SECONDARY}>
              Keep it
            </button>
            <button type="button" onClick={onConfirm} disabled={busy} className={DANGER}>
              {busy ? 'Deleting…' : 'Delete post'}
            </button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}

export function BrokenLinksModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const query = useQuery({ queryKey: queryKeys.blog.linkIssues, queryFn: fetchBlogLinkIssues, enabled: open });
  const issues = query.data?.issues ?? [];

  return (
    <Modal open={open} onClose={onClose} title="Broken links" size="lg">
      <div className="flex flex-col gap-[12px] font-inter">
        <p className="text-[12px] leading-relaxed text-[#45514a]">
          Links inside live and scheduled posts that lead nowhere, point at a local address, or open a blog post readers can&apos;t see.
        </p>

        {query.isLoading ? (
          <div className="flex flex-col gap-[8px]">
            <Skeleton className="h-[64px] w-full" />
            <Skeleton className="h-[64px] w-full" />
          </div>
        ) : null}
        {query.isError ? <p className="text-[12px] text-[#b84545]">{getApiErrorMessage(query.error, 'Could not check links.')}</p> : null}
        {query.isSuccess && issues.length === 0 ? (
          <p className="flex items-center gap-[8px] rounded-[9px] bg-[#f3faf5] px-[12px] py-[10px] text-[12px] font-medium text-[#0d5e27]">
            <CircleCheck className="size-[15px]" /> Every link in your live and scheduled posts checks out.
          </p>
        ) : null}

        {issues.map((issue) => {
          const chip = statusChip(issue.status);
          return (
            <div key={issue.post_id} className="flex flex-col gap-[8px] rounded-[10px] border border-[#e2e8e3] p-[12px]">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-[8px]">
                  <p className="truncate text-[12px] font-semibold text-[#17211b]">{issue.title}</p>
                  <Chip tone={chip.tone} label={chip.label} dot />
                </div>
                <Link to={getAdmin2BlogPostHref(issue.post_id)} onClick={onClose} className="flex-shrink-0 text-[11px] font-semibold text-[#167d35] hover:underline">
                  Fix in editor
                </Link>
              </div>
              {issue.links.map((link, index) => (
                <div key={`${link.href}-${index}`} className="flex items-start gap-[8px] rounded-[8px] bg-[#fdf6f6] px-[10px] py-[8px]">
                  <Link2Off className="mt-[1px] size-[13px] flex-shrink-0 text-[#b84545]" strokeWidth={1.8} />
                  <div className="flex min-w-0 flex-col gap-[2px]">
                    <p className="truncate text-[11px] text-[#17211b]">
                      &ldquo;{link.text || 'Untitled link'}&rdquo; <span className="font-mono text-[10px] text-[#7c857f]">{link.href || '(empty)'}</span>
                    </p>
                    <p className="text-[10px] font-medium text-[#b84545]">{link.reason}</p>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </Modal>
  );
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MAX_PER_DAY = 3;

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function shiftMonth(month: string, delta: number): string {
  const [year, m] = month.split('-').map(Number);
  return monthKey(new Date(year, m - 1 + delta, 1));
}

function watDayKey(iso: string): string {
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' });
}

function calendarCells(month: string): Array<{ key: string; day: number; inMonth: boolean }> {
  const [year, m] = month.split('-').map(Number);
  const first = new Date(year, m - 1, 1);
  const lead = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, m, 0).getDate();
  const count = Math.ceil((lead + daysInMonth) / 7) * 7;
  return Array.from({ length: count }, (_, i) => {
    const date = new Date(year, m - 1, 1 - lead + i);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return { key, day: date.getDate(), inMonth: date.getMonth() === m - 1 };
  });
}

export function EditorialCalendarModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [month, setMonth] = useState(() => monthKey(new Date()));
  const query = useQuery({ queryKey: queryKeys.blog.calendar(month), queryFn: () => fetchBlogCalendar(month), enabled: open });
  const byDay = new Map<string, BlogCalendar['entries']>();
  for (const entry of query.data?.entries ?? []) {
    const key = watDayKey(entry.at);
    byDay.set(key, [...(byDay.get(key) ?? []), entry]);
  }
  const todayKey = watDayKey(new Date().toISOString());
  const [year, m] = month.split('-').map(Number);
  const title = new Date(year, m - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  const unscheduled = query.data?.unscheduled;
  const scheduledCount = query.data?.entries.filter((entry) => entry.status === 'scheduled').length ?? 0;
  const publishedCount = query.data?.entries.filter((entry) => entry.status === 'published').length ?? 0;

  return (
    <Modal open={open} onClose={onClose} title="Editorial calendar" size="xl">
      <div className="flex flex-col gap-[12px] font-inter">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-[6px]">
            <button
              type="button"
              onClick={() => setMonth(shiftMonth(month, -1))}
              aria-label="Previous month"
              className="flex size-[30px] items-center justify-center rounded-[7px] border border-[#d4ddd6] text-[#45514a] hover:bg-[#f8faf8]"
            >
              <ChevronLeft className="size-[15px]" />
            </button>
            <p className="min-w-[130px] text-center text-[13px] font-semibold text-[#17211b]">{title}</p>
            <button
              type="button"
              onClick={() => setMonth(shiftMonth(month, 1))}
              aria-label="Next month"
              className="flex size-[30px] items-center justify-center rounded-[7px] border border-[#d4ddd6] text-[#45514a] hover:bg-[#f8faf8]"
            >
              <ChevronRight className="size-[15px]" />
            </button>
            {month !== monthKey(new Date()) ? (
              <button type="button" onClick={() => setMonth(monthKey(new Date()))} className="ml-[4px] text-[11px] font-semibold text-[#167d35] hover:underline">
                Today
              </button>
            ) : null}
          </div>
          <p className="text-[11px] text-[#7c857f]">
            {query.data ? `${formatCount(publishedCount)} published · ${formatCount(scheduledCount)} scheduled` : '\u00a0'}
          </p>
        </div>

        {query.isError ? <p className="text-[12px] text-[#b84545]">{getApiErrorMessage(query.error, 'Could not load the calendar.')}</p> : null}

        <div className="overflow-x-auto">
          <div className="grid min-w-[720px] grid-cols-7 overflow-hidden rounded-[10px] border border-[#e2e8e3]">
            {WEEKDAYS.map((day) => (
              <div key={day} className="border-b border-[#e2e8e3] bg-[#f8faf8] px-[8px] py-[6px] text-[9px] font-semibold uppercase tracking-[0.27px] text-[#7c857f]">
                {day}
              </div>
            ))}
            {calendarCells(month).map((cell, index) => {
              const entries = byDay.get(cell.key) ?? [];
              return (
                <div
                  key={cell.key}
                  className={`flex min-h-[92px] flex-col gap-[4px] border-[#e2e8e3] p-[6px] ${index % 7 !== 6 ? 'border-r' : ''} border-b ${
                    cell.inMonth ? 'bg-white' : 'bg-[#fafbfa]'
                  }`}
                >
                  <span
                    className={`self-start rounded-full px-[5px] text-[10px] font-semibold ${
                      cell.key === todayKey ? 'bg-[#167d35] text-white' : cell.inMonth ? 'text-[#17211b]' : 'text-[#b4bcb6]'
                    }`}
                  >
                    {cell.day}
                  </span>
                  {query.isLoading && cell.inMonth && index % 5 === 2 ? <Skeleton className="h-[18px] w-full" /> : null}
                  {entries.slice(0, MAX_PER_DAY).map((entry) => {
                    const tone = statusChip(entry.status).tone;
                    return (
                      <Link
                        key={entry.id}
                        to={getAdmin2BlogPostHref(entry.id)}
                        onClick={onClose}
                        title={`${entry.title} · ${watTime(entry.at)}${entry.author ? ` · ${entry.author}` : ''}`}
                        className="truncate rounded-[5px] px-[5px] py-[3px] text-[9px] font-semibold hover:brightness-95"
                        style={{ backgroundColor: tone.bg, color: tone.color }}
                      >
                        {watTime(entry.at)} {entry.title}
                      </Link>
                    );
                  })}
                  {entries.length > MAX_PER_DAY ? <span className="text-[9px] text-[#7c857f]">+{entries.length - MAX_PER_DAY} more</span> : null}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 text-[10px] text-[#7c857f]">
          <div className="flex items-center gap-[12px]">
            {(['published', 'scheduled'] as const).map((status) => {
              const chip = statusChip(status);
              return (
                <span key={status} className="flex items-center gap-[5px]">
                  <span className="size-[8px] rounded-[2px]" style={{ backgroundColor: chip.tone.color }} />
                  {chip.label}
                </span>
              );
            })}
          </div>
          {unscheduled && unscheduled.drafts + unscheduled.review > 0 ? (
            <p>
              Not on the calendar yet: {formatCount(unscheduled.drafts)} draft{unscheduled.drafts === 1 ? '' : 's'} and {formatCount(unscheduled.review)} in
              review
            </p>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}
