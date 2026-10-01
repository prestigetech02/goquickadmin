import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ComponentType, type ReactNode } from 'react';
import type { LucideProps } from 'lucide-react';

export type ActionMenuItem = {
  label: string;
  icon?: ComponentType<LucideProps>;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
};

const MENU_WIDTH = 200;
const ITEM_HEIGHT = 34;

/** Fixed-position menu so it is never clipped by scrolling table containers. */
export function ActionMenu({
  items,
  children,
  className,
  ariaLabel,
  align = 'right',
}: {
  items: ActionMenuItem[];
  children: ReactNode;
  className: string;
  ariaLabel?: string;
  align?: 'left' | 'right';
}) {
  const [open, setOpen] = useState(false);
  const [style, setStyle] = useState<CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const height = items.length * ITEM_HEIGHT + 10;
    const next: CSSProperties = { position: 'fixed', width: MENU_WIDTH, zIndex: 60 };
    if (rect.bottom + height + 8 > window.innerHeight && rect.top > height) {
      next.bottom = window.innerHeight - rect.top + 4;
    } else {
      next.top = rect.bottom + 4;
    }
    if (align === 'right') next.left = Math.max(8, rect.right - MENU_WIDTH);
    else next.left = Math.min(rect.left, window.innerWidth - MENU_WIDTH - 8);
    setStyle(next);
  }, [open, align, items.length]);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const onPointer = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!menuRef.current?.contains(target) && !triggerRef.current?.contains(target)) close();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((v) => !v);
        }}
        className={className}
      >
        {children}
      </button>
      {open ? (
        <div
          ref={menuRef}
          role="menu"
          style={style}
          onClick={(event) => event.stopPropagation()}
          className="rounded-[10px] border border-[#e2e8e3] bg-white p-1 font-inter shadow-[0px_12px_32px_rgba(16,33,23,0.14)]"
        >
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={() => {
                  setOpen(false);
                  item.onSelect();
                }}
                className={`flex h-[32px] w-full items-center gap-2 rounded-[7px] px-[10px] text-left text-[11px] font-medium disabled:cursor-not-allowed disabled:opacity-50 ${
                  item.danger ? 'text-[#b84545] hover:bg-[#fdeded]' : 'text-[#45514a] hover:bg-[#f8faf8]'
                }`}
              >
                {Icon ? <Icon className="size-[14px]" strokeWidth={1.8} /> : null}
                {item.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </>
  );
}
