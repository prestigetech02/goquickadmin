import { Bell, LifeBuoy, MapPinned, Scale, ShieldCheck, WalletCards, type LucideIcon } from 'lucide-react';
import type { InboxCategory } from '@/api/adminInAppNotificationsApi';
import type { AppNotification } from '@/types/inAppNotification';
import { isSameWatDay, titleCase, watDate } from '../errand/errandPresentation';
import type { Tone } from '../errand/errandPresentation';
import { formatNaira } from '../format';

export type InboxStatus = 'all' | 'unread' | 'read';

export type CategoryMeta = { label: string; hint: string; icon: LucideIcon; tone: Tone };

export const INBOX_CATEGORIES: Array<{ key: InboxCategory } & CategoryMeta> = [
  { key: 'support', label: 'Support', hint: 'New tickets, replies and WhatsApp escalations', icon: LifeBuoy, tone: { bg: '#e8f1fb', color: '#2563a8' } },
  { key: 'withdrawals', label: 'Withdrawals', hint: 'Runner payout requests waiting for review', icon: WalletCards, tone: { bg: '#eaf6ed', color: '#167d35' } },
  { key: 'verifications', label: 'Verifications', hint: 'Runner documents submitted for KYC', icon: ShieldCheck, tone: { bg: '#f1ecfb', color: '#6b46c1' } },
  { key: 'disputes', label: 'Disputes', hint: 'Disputes opened on errands', icon: Scale, tone: { bg: '#fdeded', color: '#b84545' } },
  { key: 'zones', label: 'Zone coverage', hint: 'Errands posted where no runner is assigned', icon: MapPinned, tone: { bg: '#fff5e5', color: '#b06d12' } },
  { key: 'other', label: 'Announcements', hint: 'Broadcasts and everything else', icon: Bell, tone: { bg: '#f1f4f2', color: '#45514a' } },
];

export function categoryMeta(category: InboxCategory): CategoryMeta {
  return INBOX_CATEGORIES.find((c) => c.key === category) ?? INBOX_CATEGORIES[INBOX_CATEGORIES.length - 1];
}

/** Mirrors the backend's type patterns so a row can be labelled without another request. */
export function categoryOf(type: string): InboxCategory {
  if (type.startsWith('support_')) return 'support';
  if (type.includes('withdrawal') || type.includes('payout')) return 'withdrawals';
  if (type.includes('verification')) return 'verifications';
  if (type.includes('dispute')) return 'disputes';
  if (type.includes('zone')) return 'zones';
  return 'other';
}

export function notificationTitle(n: AppNotification): string {
  return n.title || titleCase(n.type.replace(/_/g, ' ')) || 'Notification';
}

export function dayLabel(iso: string): string {
  if (isSameWatDay(iso)) return 'Today';
  if (isSameWatDay(iso, new Date(Date.now() - 86_400_000))) return 'Yesterday';
  return watDate(iso);
}

/** Groups an already newest-first list into consecutive day buckets. */
export function groupByDay(items: AppNotification[]): Array<{ label: string; items: AppNotification[] }> {
  const groups: Array<{ label: string; items: AppNotification[] }> = [];
  for (const item of items) {
    const label = dayLabel(item.created_at);
    const last = groups[groups.length - 1];
    if (last?.label === label) last.items.push(item);
    else groups.push({ label, items: [item] });
  }
  return groups;
}

const DETAIL_LABELS: Record<string, string> = {
  ticket_id: 'Ticket',
  errand_id: 'Errand',
  withdrawal_id: 'Withdrawal',
  verification_id: 'Verification',
  dispute_id: 'Dispute',
  zone_id: 'Service zone',
  runner_id: 'Runner',
  user_id: 'User',
  amount: 'Amount',
  whatsapp_number: 'WhatsApp number',
  current_flow: 'Booking step',
  source: 'Source',
  message: 'Customer message',
};

const HIDDEN_KEYS = new Set(['campaign_id', 'deep_link', 'route', 'click_action', 'image', 'icon']);

export function detailRows(n: AppNotification): Array<{ label: string; value: string; long: boolean }> {
  if (!n.data) return [];
  return Object.entries(n.data)
    .filter(([key, value]) => value !== null && value !== '' && !HIDDEN_KEYS.has(key))
    .map(([key, value]) => {
      let text = String(value);
      if (key.endsWith('_id')) text = `#${text}`;
      else if (key === 'amount' && Number.isFinite(Number(value))) text = formatNaira(Number(value));
      else if (key === 'current_flow' || key === 'source') text = titleCase(text.replace(/_/g, ' '));
      return { label: DETAIL_LABELS[key] ?? titleCase(key.replace(/_/g, ' ')), value: text, long: text.length > 40 };
    });
}
