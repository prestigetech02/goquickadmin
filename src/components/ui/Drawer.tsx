import { type ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';

const widthMap = {
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
} as const;

export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = 'xl',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: keyof typeof widthMap;
}) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-ink-950/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative h-full w-full ${widthMap[width]} bg-white shadow-2xl flex flex-col animate-slide-in-right`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 p-5 border-b border-ink-100">
          <div>
            <h2 className="text-lg font-bold text-ink-900">{title}</h2>
            {subtitle ? <p className="mt-1 text-sm text-ink-500">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-ink-400 hover:bg-ink-50 hover:text-ink-600 transition-colors flex-shrink-0"
            aria-label="Close drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 scrollbar-thin">{children}</div>

        {footer ? (
          <div className="border-t border-ink-100 p-5 bg-white">{footer}</div>
        ) : null}
      </aside>
    </div>
  );
}
