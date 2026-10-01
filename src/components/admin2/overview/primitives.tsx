import type { HTMLAttributes, ReactNode } from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { formatSignedPct } from '../format';

export function Card({ className = '', children, ...rest }: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return (
    <div
      {...rest}
      className={`rounded-[12px] border border-[#e2e8e3] bg-white shadow-[0px_4px_18px_0px_rgba(16,33,23,0.04)] ${className}`}
    >
      {children}
    </div>
  );
}

export function CardTitle({ title, subtitle }: { title: string; subtitle?: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-[4px]">
      <p className="truncate text-[14px] font-semibold text-[#17211b]">{title}</p>
      {subtitle ? <p className="truncate text-[11px] text-[#7c857f]">{subtitle}</p> : null}
    </div>
  );
}

export function DeltaPill({ value }: { value: number | null }) {
  if (value == null) return null;
  const down = value < 0;
  const Icon = down ? TrendingDown : TrendingUp;
  return (
    <span
      className={`inline-flex flex-shrink-0 items-center gap-[3px] rounded-full px-[6px] py-[3px] text-[10px] font-bold leading-none ${
        down ? 'bg-[#fff0f0] text-[#b84545]' : 'bg-[#eaf6ed] text-[#167d35]'
      }`}
    >
      <Icon className="size-[11px]" strokeWidth={2} />
      {formatSignedPct(value)}
    </span>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <span className={`block animate-pulse rounded-[6px] bg-[#eef1ee] ${className}`} />;
}

export function Dot({ color, size = 6 }: { color: string; size?: number }) {
  return <span className="flex-shrink-0 rounded-full" style={{ backgroundColor: color, width: size, height: size }} />;
}
