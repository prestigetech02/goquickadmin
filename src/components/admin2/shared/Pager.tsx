import { ChevronLeft, ChevronRight } from 'lucide-react';

function pageList(current: number, last: number): Array<number | 'gap'> {
  if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1);
  const pages = new Set([1, last, current - 1, current, current + 1].filter((p) => p >= 1 && p <= last));
  const sorted = [...pages].sort((a, b) => a - b);
  const out: Array<number | 'gap'> = [];
  sorted.forEach((page, index) => {
    if (index > 0 && page - sorted[index - 1] > 1) out.push('gap');
    out.push(page);
  });
  return out;
}

const ARROW = 'flex size-[28px] items-center justify-center rounded-[6px] border border-[#d4ddd6] bg-white text-[#45514a] disabled:opacity-40';

export function Pager({ page, lastPage, onChange }: { page: number; lastPage: number; onChange: (page: number) => void }) {
  if (lastPage <= 1) return null;
  return (
    <nav className="flex items-center gap-[6px]" aria-label="Pagination">
      <button type="button" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Previous page" className={ARROW}>
        <ChevronLeft className="size-[14px]" />
      </button>
      {pageList(page, lastPage).map((item, index) =>
        item === 'gap' ? (
          <span key={`gap-${index}`} className="px-[2px] text-[10px] text-[#7c857f]">
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            onClick={() => onChange(item)}
            aria-current={item === page ? 'page' : undefined}
            className={`flex h-[28px] min-w-[28px] items-center justify-center rounded-[6px] px-[6px] text-[10px] ${
              item === page ? 'bg-[#167d35] font-bold text-white' : 'border border-[#d4ddd6] bg-white font-medium text-[#45514a] hover:bg-[#f8faf8]'
            }`}
          >
            {item}
          </button>
        ),
      )}
      <button type="button" disabled={page >= lastPage} onClick={() => onChange(page + 1)} aria-label="Next page" className={ARROW}>
        <ChevronRight className="size-[14px]" />
      </button>
    </nav>
  );
}