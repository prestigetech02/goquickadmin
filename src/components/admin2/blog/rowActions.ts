import { Archive, ArchiveRestore, CalendarClock, Copy, ExternalLink, FileClock, FilePen, PencilLine, Send, Trash2 } from 'lucide-react';
import type { BlogBoardRow } from '@/types/api';
import type { ActionMenuItem } from '../users/ActionMenu';

export type QuickAction = 'publish' | 'review' | 'draft' | 'archive' | 'restore' | 'duplicate';

export type RowHandlers = {
  edit: (row: BlogBoardRow) => void;
  act: (row: BlogBoardRow, action: QuickAction) => void;
  schedule: (row: BlogBoardRow) => void;
  remove: (row: BlogBoardRow) => void;
};

export function rowActions(row: BlogBoardRow, handlers: RowHandlers, busy: boolean, liveUrl: string): ActionMenuItem[] {
  const items: ActionMenuItem[] = [{ label: 'Edit post', icon: PencilLine, onSelect: () => handlers.edit(row) }];
  const { status } = row;

  if (status === 'published') {
    items.push({ label: 'View on site', icon: ExternalLink, onSelect: () => window.open(liveUrl, '_blank', 'noopener,noreferrer') });
  }
  if (status !== 'published' && status !== 'archived') {
    items.push({ label: 'Publish now', icon: Send, disabled: busy, onSelect: () => handlers.act(row, 'publish') });
    items.push({ label: status === 'scheduled' ? 'Reschedule…' : 'Schedule…', icon: CalendarClock, disabled: busy, onSelect: () => handlers.schedule(row) });
  }
  if (status === 'draft') {
    items.push({ label: 'Send for review', icon: FileClock, disabled: busy, onSelect: () => handlers.act(row, 'review') });
  }
  if (status === 'review' || status === 'scheduled' || status === 'published') {
    items.push({
      label: status === 'published' ? 'Unpublish to draft' : 'Move to draft',
      icon: FilePen,
      disabled: busy,
      onSelect: () => handlers.act(row, 'draft'),
    });
  }
  items.push({ label: 'Duplicate', icon: Copy, disabled: busy, onSelect: () => handlers.act(row, 'duplicate') });
  items.push(
    status === 'archived'
      ? { label: 'Restore to drafts', icon: ArchiveRestore, disabled: busy, onSelect: () => handlers.act(row, 'restore') }
      : { label: 'Archive', icon: Archive, disabled: busy, onSelect: () => handlers.act(row, 'archive') },
  );
  items.push({ label: 'Delete', icon: Trash2, danger: true, disabled: busy, onSelect: () => handlers.remove(row) });
  return items;
}
