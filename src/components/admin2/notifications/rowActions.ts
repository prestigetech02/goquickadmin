import { CalendarX2, Copy, Eye, PencilLine, Send, Trash2 } from 'lucide-react';
import type { NotificationHistoryRow } from '@/types/api';
import type { ActionMenuItem } from '../users/ActionMenu';

export type RowHandlers = {
  open: (row: NotificationHistoryRow) => void;
  edit: (row: NotificationHistoryRow) => void;
  act: (row: NotificationHistoryRow, action: 'send' | 'cancel' | 'duplicate' | 'delete') => void;
};

export function rowActions(row: NotificationHistoryRow, handlers: RowHandlers, busy: boolean): ActionMenuItem[] {
  const items: ActionMenuItem[] = [{ label: 'View details', icon: Eye, onSelect: () => handlers.open(row) }];
  if (row.kind !== 'campaign') return items;

  if (row.can_edit) items.push({ label: 'Edit', icon: PencilLine, onSelect: () => handlers.edit(row) });
  if (row.can_send) items.push({ label: 'Send now', icon: Send, disabled: busy, onSelect: () => handlers.act(row, 'send') });
  if (row.can_cancel) items.push({ label: 'Cancel schedule', icon: CalendarX2, disabled: busy, onSelect: () => handlers.act(row, 'cancel') });
  items.push({ label: 'Duplicate', icon: Copy, disabled: busy, onSelect: () => handlers.act(row, 'duplicate') });
  if (row.can_delete) items.push({ label: 'Delete draft', icon: Trash2, danger: true, disabled: busy, onSelect: () => handlers.act(row, 'delete') });
  return items;
}
