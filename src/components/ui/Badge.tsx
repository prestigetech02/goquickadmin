import { statusColor, titleCase } from '@/lib/utils';

export function Badge({
  status,
  label,
}: {
  status: string;
  label?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${statusColor(status)}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
      {label || titleCase(status)}
    </span>
  );
}
