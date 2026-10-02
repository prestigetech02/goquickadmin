import { ClipboardCopy, CopyPlus, Eye, Pause, PencilLine, Play, Trash2 } from 'lucide-react';
import type { AdminCoupon } from '@/types/api';
import type { ActionMenuItem } from '../users/ActionMenu';

export type CouponHandlers = {
  open: (coupon: AdminCoupon) => void;
  edit: (coupon: AdminCoupon) => void;
  duplicate: (coupon: AdminCoupon) => void;
  copyCode: (coupon: AdminCoupon) => void;
  toggle: (coupon: AdminCoupon) => void;
  remove: (coupon: AdminCoupon) => void;
};

export function couponActions(coupon: AdminCoupon, handlers: CouponHandlers, busy: boolean): ActionMenuItem[] {
  return [
    { label: 'View details', icon: Eye, onSelect: () => handlers.open(coupon) },
    { label: 'Edit coupon', icon: PencilLine, onSelect: () => handlers.edit(coupon) },
    { label: 'Copy code', icon: ClipboardCopy, onSelect: () => handlers.copyCode(coupon) },
    { label: 'Duplicate', icon: CopyPlus, onSelect: () => handlers.duplicate(coupon) },
    coupon.is_active
      ? { label: 'Pause coupon', icon: Pause, disabled: busy, onSelect: () => handlers.toggle(coupon) }
      : { label: 'Resume coupon', icon: Play, disabled: busy, onSelect: () => handlers.toggle(coupon) },
    { label: 'Delete', icon: Trash2, danger: true, disabled: busy, onSelect: () => handlers.remove(coupon) },
  ];
}
