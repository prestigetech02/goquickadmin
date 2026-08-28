import { useState } from 'react';
import {
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type Point = { label: string; value: number };

const tooltipStyle = {
  borderRadius: 12,
  border: '1px solid #eceef2',
  boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)',
  fontSize: 13,
};

export function BarChart({
  data,
  height = 200,
  color = '#1a7a0a',
}: {
  data: Point[];
  height?: number;
  color?: string;
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <RechartsBarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#eceef2" strokeDasharray="4 4" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: '#9aa3b2', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            dy={6}
          />
          <YAxis
            tick={{ fill: '#9aa3b2', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={40}
            tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))}
          />
          <Tooltip
            cursor={{ fill: 'rgba(26, 122, 10, 0.06)' }}
            contentStyle={tooltipStyle}
            labelStyle={{ color: '#111827', fontWeight: 600, marginBottom: 4 }}
            formatter={(value) => [Number(value ?? 0).toLocaleString(), 'Value']}
          />
          <Bar
            dataKey="value"
            radius={[8, 8, 4, 4]}
            maxBarSize={48}
            onMouseLeave={() => setActiveIndex(null)}
          >
            {data.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={color}
                opacity={activeIndex === null || activeIndex === index ? 0.95 : 0.35}
                onMouseEnter={() => setActiveIndex(index)}
              />
            ))}
          </Bar>
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}
