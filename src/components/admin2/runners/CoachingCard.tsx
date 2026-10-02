import { ArrowUpRight, GraduationCap } from 'lucide-react';
import type { AdminRunnerBoardOverview } from '@/types/api';
import { formatCount } from '../format';
import { Card, CardTitle, Skeleton } from '../overview/primitives';
import { plural } from '../shared/helpers';

export function CoachingCard({ overview, onOpenQueue }: { overview?: AdminRunnerBoardOverview; onOpenQueue: () => void }) {
  const c = overview?.coaching;
  const rows = c
    ? [
        { label: `Below ${c.on_time.threshold}% on-time`, count: c.on_time.count, color: '#b84545' },
        { label: `Acceptance below ${c.acceptance.threshold}%`, count: c.acceptance.count, color: '#b06d12' },
        { label: `Rating below ${c.rating.threshold}`, count: c.rating.count, color: '#b06d12' },
      ]
    : [];

  return (
    <Card className="flex w-full min-w-0 flex-col gap-[14px] p-[18px] xl:w-[380px] xl:flex-shrink-0">
      <CardTitle title="Performance coaching" subtitle={c ? `Runners below operational thresholds · last ${c.window_days} days` : 'Runners below operational thresholds'} />

      <div className="flex flex-col gap-[10px]">
        {c
          ? rows.map((row) => (
              <div key={row.label} className="flex items-center justify-between gap-2 text-[11px]">
                <span className="text-[#45514a]">{row.label}</span>
                <span className="font-bold" style={{ color: row.count > 0 ? row.color : '#7c857f' }}>
                  {formatCount(row.count)}
                </span>
              </div>
            ))
          : Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-[14px] w-full" />)}
      </div>

      {c ? (
        <div className="flex items-center gap-[8px] rounded-[8px] bg-[#f3faf5] px-[10px] py-[8px]">
          <GraduationCap className="size-[15px] flex-shrink-0 text-[#167d35]" strokeWidth={1.8} />
          <p className="text-[10px] text-[#0d5e27]">
            {c.total > 0
              ? `${plural(c.total, 'active runner')} ${c.total === 1 ? 'needs' : 'need'} coaching on at least one threshold.`
              : 'Every active runner is meeting the on-time, acceptance and rating thresholds.'}
          </p>
        </div>
      ) : null}

      <button
        type="button"
        onClick={onOpenQueue}
        disabled={!c || c.total === 0}
        className="mt-auto flex h-[36px] w-fit items-center gap-[7px] rounded-[8px] border border-[#d4ddd6] bg-white px-[12px] text-[11px] font-semibold text-[#17211b] hover:bg-[#f8faf8] disabled:opacity-50"
      >
        <ArrowUpRight className="size-[14px]" strokeWidth={1.8} />
        Open coaching queue
      </button>
    </Card>
  );
}
