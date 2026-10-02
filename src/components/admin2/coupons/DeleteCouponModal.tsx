import { Modal } from '@/components/ui/Modal';
import type { AdminCoupon } from '@/types/api';
import { formatCount } from '../format';
import { CodeBadge } from './CouponsTableCard';

const SECONDARY =
  'h-[36px] rounded-[8px] border border-[#d4ddd6] bg-white px-[14px] text-[11px] font-semibold text-[#17211b] hover:bg-[#f8faf8] disabled:opacity-60';
const PRIMARY = 'h-[36px] rounded-[8px] bg-[#167d35] px-[14px] text-[11px] font-semibold text-white hover:bg-[#0d5e27] disabled:opacity-60';
const DANGER = 'h-[36px] rounded-[8px] bg-[#b84545] px-[14px] text-[11px] font-semibold text-white hover:bg-[#9a3434] disabled:opacity-60';

export function DeleteCouponModal({
  coupon,
  busy,
  onClose,
  onConfirm,
  onPause,
}: {
  coupon: AdminCoupon | null;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onPause: () => void;
}) {
  const used = coupon ? coupon.usage.used : 0;

  return (
    <Modal open={coupon != null} onClose={() => (busy ? undefined : onClose())} title={used > 0 ? 'This coupon has history' : 'Delete coupon?'} size="sm">
      {coupon ? (
        <div className="flex flex-col gap-[14px] font-inter">
          <div className="flex items-center gap-[8px]">
            <CodeBadge code={coupon.code} />
            <span className="truncate text-[12px] font-semibold text-[#17211b]">{coupon.name}</span>
          </div>
          {used > 0 ? (
            <p className="text-[12px] leading-relaxed text-[#45514a]">
              It has been applied to {formatCount(used)} errand{used === 1 ? '' : 's'}, so it can&apos;t be deleted without breaking those payment records.
              {coupon.is_active ? ' Pause it to stop new requesters from using it.' : ' It is already paused, so nobody can apply it.'}
            </p>
          ) : (
            <p className="text-[12px] leading-relaxed text-[#45514a]">
              Nobody has used this code yet. Deleting it removes it for good, and requesters who try it will be told it doesn&apos;t exist.
            </p>
          )}
          <div className="flex justify-end gap-[8px]">
            <button type="button" onClick={onClose} disabled={busy} className={SECONDARY}>
              {used > 0 ? 'Close' : 'Keep it'}
            </button>
            {used > 0 ? (
              coupon.is_active ? (
                <button type="button" onClick={onPause} disabled={busy} className={PRIMARY}>
                  {busy ? 'Pausing…' : 'Pause coupon'}
                </button>
              ) : null
            ) : (
              <button type="button" onClick={onConfirm} disabled={busy} className={DANGER}>
                {busy ? 'Deleting…' : 'Delete coupon'}
              </button>
            )}
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
