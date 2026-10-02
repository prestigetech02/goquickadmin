import type { ReactNode } from 'react';

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
  actionsBesideTitle = false,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  /** Keep the actions on the title row instead of letting a long subtitle push them below. */
  actionsBesideTitle?: boolean;
}) {
  if (actionsBesideTitle) {
    return (
      <div className="flex min-w-0 flex-col gap-[6px]">
        {eyebrow ? <Eyebrow text={eyebrow} /> : null}
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <h1 className="text-[25px] font-bold leading-normal tracking-[-0.5px] text-[#17211b]">{title}</h1>
          {actions ? <div className="flex flex-wrap items-center gap-[10px]">{actions}</div> : null}
        </div>
        {subtitle ? <p className="text-[13px] text-[#6b6f66]">{subtitle}</p> : null}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-[6px]">
        {eyebrow ? <Eyebrow text={eyebrow} /> : null}
        <h1 className="text-[25px] font-bold leading-normal tracking-[-0.5px] text-[#17211b]">{title}</h1>
        {subtitle ? <p className="text-[13px] text-[#6b6f66]">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-[10px]">{actions}</div> : null}
    </div>
  );
}

function Eyebrow({ text }: { text: string }) {
  return (
    <p className="flex items-center gap-[6px] text-[10px] font-semibold uppercase tracking-[0.8px] text-[#167d35]">
      <span className="relative flex size-[6px]">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#167d35] opacity-60" />
        <span className="relative inline-flex size-[6px] rounded-full bg-[#167d35]" />
      </span>
      {text}
    </p>
  );
}

export const OUTLINE_BUTTON =
  'flex h-[38px] items-center gap-[7px] rounded-[8px] border border-[#d4ddd6] bg-white px-[13px] text-[12px] font-semibold text-[#17211b] hover:bg-[#f8faf8] disabled:opacity-60';

export const PRIMARY_BUTTON =
  'flex h-[38px] items-center gap-[7px] rounded-[8px] bg-[#167d35] px-[13px] text-[12px] font-semibold text-white hover:bg-[#0d5e27] disabled:opacity-60';
