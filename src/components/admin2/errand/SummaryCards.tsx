import type { AdminErrandView } from '@/types/api';
import { formatNaira } from '../format';
import { categoryLabel, durationLabel, minutesUntil, stageLabel, watTime } from './errandPresentation';

type Line = { text: string; color: string };

const MUTED = '#7c857f';
const GREEN = '#167d35';
const AMBER = '#b06d12';
const RED = '#b84545';

function SummaryItem({ label, value, line }: { label: string; value: string; line: Line }) {
  return (
    <div className="flex min-w-0 flex-col gap-[5px] rounded-[12px] border border-[#e2e8e3] bg-white p-[14px]">
      <p className="text-[10px] uppercase text-[#7c857f]">{label}</p>
      <p className="truncate text-[13px] font-bold text-[#17211b]">{value}</p>
      <p className="truncate text-[10px]" style={{ color: line.color }}>
        {line.text}
      </p>
    </div>
  );
}

function stageLine(view: AdminErrandView): Line {
  const { errand, runner } = view;
  if (errand.status === 'completed') return { text: `Completed ${watTime(errand.completed_at)}`, color: GREEN };
  if (!errand.is_active) return { text: `Updated ${watTime(errand.updated_at)}`, color: MUTED };
  if (!runner) return { text: 'Waiting for a runner to accept', color: AMBER };
  if (runner.tracking === 'healthy') return { text: `Tracking normally · ${watTime(runner.location?.updated_at)}`, color: GREEN };
  if (runner.tracking === 'stale') return { text: `Last GPS ping ${watTime(runner.location?.updated_at)}`, color: AMBER };
  return { text: 'No live location from runner', color: MUTED };
}

function slaSummary(view: AdminErrandView, now: number): { value: string; line: Line } {
  const { sla, errand } = view;
  if (!sla.due_at) {
    return { value: 'Not started', line: { text: 'Clock starts when a runner accepts', color: MUTED } };
  }
  if (errand.status === 'completed' && errand.completed_at) {
    const late = minutesUntil(sla.due_at, new Date(errand.completed_at).getTime()) ?? 0;
    return {
      value: `Due ${watTime(sla.due_at)}`,
      line: late >= 0
        ? { text: `Finished ${durationLabel(late)} early`, color: GREEN }
        : { text: `Finished ${durationLabel(late)} late`, color: RED },
    };
  }
  if (!errand.is_active) return { value: `Due ${watTime(sla.due_at)}`, line: { text: 'Errand closed', color: MUTED } };
  const remaining = minutesUntil(sla.due_at, now) ?? 0;
  if (remaining < 0) return { value: `Due ${watTime(sla.due_at)}`, line: { text: `Overdue by ${durationLabel(remaining)}`, color: RED } };
  return {
    value: `Due ${watTime(sla.due_at)}`,
    line: { text: `${durationLabel(remaining)} remaining`, color: remaining <= 30 ? AMBER : GREEN },
  };
}

function paymentLine(pricing: AdminErrandView['pricing']): Line {
  switch (pricing.status) {
    case 'held':
      return { text: 'Held in escrow', color: GREEN };
    case 'released':
      return { text: 'Released to runner', color: GREEN };
    case 'refunded':
      return { text: 'Refunded to requester', color: MUTED };
    case 'unpaid':
      return { text: 'Quoted · not yet paid', color: AMBER };
    default:
      return { text: pricing.status, color: MUTED };
  }
}

export function SummaryCards({ view, now }: { view: AdminErrandView; now: number }) {
  const { errand, pricing } = view;
  const sla = slaSummary(view, now);

  return (
    <div className="grid w-full grid-cols-2 gap-[12px] xl:grid-cols-4">
      <SummaryItem
        label="Errand ID"
        value={errand.code}
        line={{ text: `${errand.type === 'scheduled' ? 'Scheduled' : 'Instant'} · ${categoryLabel(errand.category)}`, color: MUTED }}
      />
      <SummaryItem label="Current stage" value={stageLabel(errand.status, errand.category)} line={stageLine(view)} />
      <SummaryItem label="SLA" value={sla.value} line={sla.line} />
      <SummaryItem
        label="Payment"
        value={pricing.total != null ? formatNaira(pricing.total) : '—'}
        line={paymentLine(pricing)}
      />
    </div>
  );
}
