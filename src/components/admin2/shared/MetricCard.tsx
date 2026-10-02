import type { ComponentType, ReactNode } from 'react';
import type { LucideProps } from 'lucide-react';
import { Card, Skeleton } from '../overview/primitives';
import type { MetricPill } from './helpers';

const PILL_CLASSES = {
  green: 'bg-[#eaf6ed] text-[#167d35]',
  red: 'bg-[#fdeded] text-[#b84545]',
  amber: 'bg-[#fff5e5] text-[#b06d12]',
  gray: 'bg-[#f1f4f2] text-[#45514a]',
};

export function MetricCard({
  label,
  icon: Icon,
  iconColor,
  iconBg,
  value,
  pill,
  context,
  title,
}: {
  label: string;
  icon: ComponentType<LucideProps>;
  iconColor: string;
  iconBg: string;
  value?: string;
  pill?: MetricPill;
  context?: string;
  title?: string;
}) {
  return (
    <Card className="flex h-[130px] min-w-0 flex-col justify-between p-[15px]" title={title}>
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 flex-1 truncate text-[11px] font-medium text-[#45514a]">{label}</p>
        <span className="flex size-[30px] flex-shrink-0 items-center justify-center rounded-[8px]" style={{ backgroundColor: iconBg }}>
          <Icon className="size-[15px]" strokeWidth={1.8} color={iconColor} />
        </span>
      </div>
      {value != null ? (
        <p className="truncate text-[25px] font-bold leading-normal tracking-[-0.5px] text-[#17211b]">{value}</p>
      ) : (
        <Skeleton className="h-[31px] w-[110px]" />
      )}
      <div className="flex min-w-0 items-center gap-[6px]">
        {pill ? (
          <span className={`flex-shrink-0 rounded-full px-[6px] py-[3px] text-[9px] font-bold leading-none ${PILL_CLASSES[pill.tone]}`}>
            {pill.label}
          </span>
        ) : null}
        {context ? (
          <p className="min-w-0 flex-1 truncate text-[10px] text-[#7c857f]">{context}</p>
        ) : value == null ? (
          <Skeleton className="h-[10px] w-[120px]" />
        ) : null}
      </div>
    </Card>
  );
}

const GRID_LAYOUTS = {
  4: 'sm:grid-cols-2 xl:grid-cols-4',
  5: 'sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5',
  6: 'sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6',
};

export function MetricGrid({ children, columns = 5 }: { children: ReactNode; columns?: 4 | 5 | 6 }) {
  const layout = GRID_LAYOUTS[columns];
  return <div className={`grid w-full grid-cols-1 gap-[12px] ${layout}`}>{children}</div>;
}
