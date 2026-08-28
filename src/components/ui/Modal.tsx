import { type ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';

export function Modal({
  open,
  onClose,
  title,
  children,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
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

  const sizeMap: Record<string, string> = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-ink-950/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div
        className={`relative bg-white rounded-2xl shadow-xl w-full ${sizeMap[size]} max-h-[90vh] flex flex-col animate-scale-in`}
      >
        <div className="flex items-center justify-between p-5 border-b border-ink-100">
          <h2 className="text-lg font-bold text-ink-900">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-ink-400 hover:bg-ink-50 hover:text-ink-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 overflow-y-auto scrollbar-thin flex-1">{children}</div>
      </div>
    </div>
  );
}
