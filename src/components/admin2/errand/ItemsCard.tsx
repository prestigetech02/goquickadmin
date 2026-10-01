import type { AdminErrandView } from '@/types/api';
import { formatNaira } from '../format';
import { Card } from '../overview/primitives';
import { SectionHeader } from './parts';

export function ItemsCard({ view }: { view: AdminErrandView }) {
  const { items, errand } = view;
  const list = items.list;
  const instructions = items.instructions ?? errand.description;

  if (list.length === 0) {
    return (
      <Card className="flex w-full flex-col gap-[12px] p-[18px]">
        <SectionHeader title="Task details" subtitle="What the requester asked for" />
        <p className="whitespace-pre-line text-[11px] leading-[1.5] text-[#45514a]">
          {instructions?.trim() || 'No description or instructions were provided.'}
        </p>
        {items.spending_limit != null ? (
          <p className="text-[10px] text-[#7c857f]">Spending limit: {formatNaira(items.spending_limit)}</p>
        ) : null}
      </Card>
    );
  }

  return (
    <Card className="flex w-full flex-col overflow-hidden">
      <div className="p-[16px]">
        <SectionHeader title="Item details" subtitle={`${list.length} item${list.length === 1 ? '' : 's'} on the requester's list`} />
      </div>
      <div className="flex h-[38px] items-center gap-[10px] border-b border-[#e2e8e3] bg-[#f8faf8] px-[12px] text-[9px] font-semibold uppercase tracking-[0.27px] text-[#7c857f]">
        <p className="w-[22px]">#</p>
        <p className="flex-1">Item</p>
      </div>
      {list.map((item, index) => (
        <div key={`${item.name}-${index}`} className="flex items-center gap-[10px] border-b border-[#e2e8e3] px-[12px] py-[11px]">
          <p className="w-[22px] text-[10px] font-semibold text-[#7c857f]">{index + 1}</p>
          <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
            <p className="text-[11px] font-semibold text-[#17211b]">{item.name}</p>
            {item.detail ? <p className="text-[10px] text-[#7c857f]">{item.detail}</p> : null}
          </div>
        </div>
      ))}
      <div className="flex flex-col gap-[4px] bg-[#f8faf8] px-[12px] py-[11px] text-[10px] text-[#45514a] sm:flex-row sm:items-center sm:justify-between">
        <p className="min-w-0 flex-1">{instructions?.trim() ? `Instructions: ${instructions.trim()}` : 'No extra instructions'}</p>
        {items.spending_limit != null ? (
          <p className="flex-shrink-0 text-[11px] font-bold text-[#17211b]">Spending limit {formatNaira(items.spending_limit)}</p>
        ) : null}
      </div>
    </Card>
  );
}
