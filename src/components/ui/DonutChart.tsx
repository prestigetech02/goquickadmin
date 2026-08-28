import { useState } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

type Slice = { label: string; value: number; color: string };

const tooltipStyle = {
  borderRadius: 12,
  border: '1px solid #eceef2',
  boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)',
  fontSize: 13,
};

export function DonutChart({
  data,
  size = 160,
}: {
  data: Slice[];
  size?: number;
  thickness?: number;
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const active = activeIndex != null ? data[activeIndex] : null;
  const baseOuter = size / 2 - 10;
  const baseInner = baseOuter * 0.62;
  const chartHeight = size;

  return (
    <div className="flex flex-col items-center gap-2 w-full">
      <div className="relative w-full" style={{ height: chartHeight }}>
        <ResponsiveContainer>
          <PieChart margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius={baseInner}
              outerRadius={(point: Slice) =>
                active?.label === point.label ? baseOuter + 5 : baseOuter
              }
              paddingAngle={2}
              stroke="#fff"
              strokeWidth={2}
              cornerRadius={4}
              onMouseEnter={(_, index) => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`slice-${index}`}
                  fill={entry.color}
                  opacity={activeIndex === null || activeIndex === index ? 1 : 0.35}
                  style={{ cursor: 'pointer', outline: 'none' }}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value, name) => {
                const n = Number(value ?? 0);
                const pct = total ? Math.round((n / total) * 100) : 0;
                return [`${n.toLocaleString()} (${pct}%)`, String(name ?? '')];
              }}
            />
          </PieChart>
        </ResponsiveContainer>

        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none leading-tight">
          {active ? (
            <>
              <span
                className="text-[10px] font-semibold uppercase tracking-wide"
                style={{ color: active.color }}
              >
                {active.label}
              </span>
              <span className="text-xl font-bold text-ink-900">
                {total ? Math.round((active.value / total) * 100) : 0}%
              </span>
              <span className="text-[11px] text-ink-400">
                {active.value} of {total}
              </span>
            </>
          ) : (
            <>
              <span className="text-xl font-bold text-ink-900">{total}</span>
              <span className="text-[11px] text-ink-400">Total</span>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col items-stretch gap-0.5 w-full max-w-[220px]">
        {data.map((seg, i) => {
          const pct = total ? Math.round((seg.value / total) * 100) : 0;
          const isActive = activeIndex === i;
          return (
            <button
              key={seg.label}
              type="button"
              onMouseEnter={() => setActiveIndex(i)}
              onMouseLeave={() => setActiveIndex(null)}
              className={`flex items-center gap-2 px-2 py-1 rounded-lg text-left transition-all ${
                isActive ? 'bg-ink-50 ring-1 ring-ink-100' : 'hover:bg-ink-50'
              }`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: seg.color }}
              />
              <span className="text-[13px] text-ink-700 font-medium flex-1 truncate">{seg.label}</span>
              <span className="text-[13px] text-ink-400 tabular-nums">{pct}%</span>
              <span className="text-[11px] text-ink-300 tabular-nums">({seg.value})</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
