import { useEffect, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Card } from '../overview/primitives';
import type { SettingsSectionId } from './presentation';

export type NavItem = { id: SettingsSectionId; label: string; icon: LucideIcon };

/** Sticky section menu; highlights the section nearest the top of the viewport. */
export function SectionNav({ items, status }: { items: NavItem[]; status: { title: string; text: string; healthy: boolean } | null }) {
  const [active, setActive] = useState<SettingsSectionId | null>(null);
  const current = active ?? items[0]?.id ?? null;

  useEffect(() => {
    const nodes = items
      .map((item) => document.getElementById(`settings-${item.id}`))
      .filter((node): node is HTMLElement => node !== null);
    if (nodes.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        const id = visible?.target.getAttribute('data-settings-section') as SettingsSectionId | null;
        if (id) setActive(id);
      },
      { rootMargin: '-90px 0px -60% 0px' },
    );
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [items]);

  const jump = (id: SettingsSectionId) => {
    setActive(id);
    document.getElementById(`settings-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <Card className="flex flex-col gap-[4px] p-[10px] lg:sticky lg:top-[88px]">
      <nav className="flex gap-[4px] overflow-x-auto lg:flex-col" aria-label="Settings sections">
        {items.map(({ id, label, icon: Icon }) => {
          const on = current === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => jump(id)}
              aria-current={on ? 'true' : undefined}
              className={`flex h-[36px] flex-shrink-0 items-center gap-[9px] whitespace-nowrap rounded-[8px] px-[10px] text-left text-[12px] ${
                on ? 'bg-[#eaf6ed] font-semibold text-[#0d5e27]' : 'text-[#45514a] hover:bg-[#f8faf8]'
              }`}
            >
              <Icon className="size-[15px] flex-shrink-0" strokeWidth={1.8} />
              {label}
            </button>
          );
        })}
      </nav>
      {status ? (
        <div className={`mt-[8px] hidden flex-col gap-[3px] rounded-[10px] px-[12px] py-[10px] lg:flex ${status.healthy ? 'bg-[#f3faf5]' : 'bg-[#fff8ec]'}`}>
          <span className="flex items-center gap-[6px] text-[11px] font-semibold text-[#17211b]">
            <span className={`size-[7px] rounded-full ${status.healthy ? 'bg-[#167d35]' : 'bg-[#b06d12]'}`} />
            {status.title}
          </span>
          <span className="text-[10px] leading-[1.45] text-[#7c857f]">{status.text}</span>
        </div>
      ) : null}
    </Card>
  );
}
