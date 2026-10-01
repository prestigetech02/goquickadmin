import type { AdminErrandTimelineEvent, AdminErrandView } from '@/types/api';
import { Card } from '../overview/primitives';
import { isSameWatDay, watShortDate, watTime } from './errandPresentation';
import { SectionHeader, SectionLink } from './parts';

const KIND_COLORS: Record<AdminErrandTimelineEvent['kind'], string> = {
  system: '#167d35',
  payment: '#2c73b9',
  issue: '#b84545',
  admin: '#735ca8',
};

function csvCell(value: string | null): string {
  const text = value ?? '';
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function exportLog(view: AdminErrandView) {
  const rows = [['Time (WAT)', 'Event', 'Detail', 'Type']];
  view.timeline.forEach((event) => {
    rows.push([`${watShortDate(event.at)} ${watTime(event.at)}`, event.title, event.detail ?? '', event.kind]);
  });
  const csv = rows.map((row) => row.map(csvCell).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `${view.errand.code}-activity.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function TimelineCard({ view }: { view: AdminErrandView }) {
  const events = view.timeline;

  return (
    <Card className="flex w-full flex-col gap-[15px] p-[18px]">
      <SectionHeader
        title="Timeline & activity"
        subtitle="All times in WAT · Automated and manual events"
        action={
          <SectionLink onClick={() => exportLog(view)} disabled={events.length === 0}>
            Export log
          </SectionLink>
        }
      />
      {events.length === 0 ? <p className="text-[11px] text-[#7c857f]">No activity recorded yet.</p> : null}
      <ol className="flex w-full flex-col">
        {events.map((event, index) => {
          const latest = index === 0;
          const last = index === events.length - 1;
          return (
            <li key={event.key} className="flex w-full gap-[12px]">
              <div className="w-[42px] flex-shrink-0">
                <p className="text-[10px] font-semibold text-[#7c857f]">{watTime(event.at)}</p>
                {!isSameWatDay(event.at) ? <p className="text-[9px] text-[#a3aba5]">{watShortDate(event.at)}</p> : null}
              </div>
              <div className="flex w-[12px] flex-shrink-0 flex-col items-center">
                <span
                  className="size-[9px] flex-shrink-0 rounded-full border-2"
                  style={
                    latest
                      ? { backgroundColor: KIND_COLORS[event.kind], borderColor: KIND_COLORS[event.kind] }
                      : { backgroundColor: '#fff', borderColor: event.kind === 'system' ? '#d4ddd6' : KIND_COLORS[event.kind] }
                  }
                />
                {!last ? <span className="w-px flex-1 bg-[#e2e8e3]" /> : null}
              </div>
              <div className={`flex min-w-0 flex-1 flex-col gap-[2px] ${last ? '' : 'pb-[18px]'}`}>
                <p className="text-[11px] font-semibold text-[#17211b]">{event.title}</p>
                {event.detail ? <p className="text-[10px] text-[#7c857f]">{event.detail}</p> : null}
              </div>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
