import { useEffect } from 'react';
import { Check, X } from 'lucide-react';
import type { Notice } from './TableControls';

const AUTO_DISMISS_MS = 3200;

/** Compact corner toast for page actions (save, delete, reset). */
export function MinimalToast({
  notice,
  onDismiss,
  durationMs = AUTO_DISMISS_MS,
}: {
  notice: Notice | null;
  onDismiss: () => void;
  durationMs?: number;
}) {
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(onDismiss, durationMs);
    return () => window.clearTimeout(timer);
  }, [notice, onDismiss, durationMs]);

  if (!notice) return null;

  const ok = notice.tone === 'ok';

  return (
    <div
      className="pointer-events-none fixed bottom-[20px] right-[20px] z-[60] flex w-[min(320px,calc(100vw-40px))] justify-end"
      aria-live="polite"
    >
      <div
        className={`pointer-events-auto flex max-w-full items-center gap-[8px] rounded-[10px] border px-[12px] py-[10px] shadow-[0px_8px_24px_0px_rgba(16,33,23,0.14)] animate-scale-in ${
          ok ? 'border-[#cfe8d6] bg-white' : 'border-[#f0d0d0] bg-white'
        }`}
      >
        <span
          className={`flex size-[22px] flex-shrink-0 items-center justify-center rounded-full ${
            ok ? 'bg-[#eaf6ed] text-[#167d35]' : 'bg-[#fdeded] text-[#b84545]'
          }`}
        >
          {ok ? <Check className="size-[12px]" strokeWidth={2.4} /> : <X className="size-[12px]" strokeWidth={2.4} />}
        </span>
        <p className={`min-w-0 flex-1 text-[12px] font-medium leading-snug ${ok ? 'text-[#0d5e27]' : 'text-[#b84545]'}`}>
          {notice.text}
        </p>
        <button
          type="button"
          onClick={onDismiss}
          className="flex-shrink-0 rounded-[6px] p-1 text-[#7c857f] hover:bg-[#f1f5f2]"
          aria-label="Dismiss"
        >
          <X className="size-[13px]" />
        </button>
      </div>
    </div>
  );
}
