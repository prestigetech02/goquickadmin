import {
  Area,
  AreaChart as RechartsAreaChart,
  CartesianGrid,
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

export function AreaChart({
  data,
  height = 200,
  color = '#1a7a0a',
  gradientId = 'area-gradient',
}: {
  data: Point[];
  height?: number;
  color?: string;
  gradientId?: string;
}) {
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <RechartsAreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.28} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
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
            cursor={{ stroke: color, strokeWidth: 1, strokeDasharray: '4 4' }}
            contentStyle={tooltipStyle}
            labelStyle={{ color: '#111827', fontWeight: 600, marginBottom: 4 }}
            formatter={(value) => [Number(value ?? 0).toLocaleString(), 'Value']}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2.5}
            fill={`url(#${gradientId})`}
            activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff', fill: color }}
            dot={{ r: 3, strokeWidth: 2, stroke: color, fill: '#fff' }}
          />
        </RechartsAreaChart>
      </ResponsiveContainer>
    </div>
  );
}
