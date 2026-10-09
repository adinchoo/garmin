import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export type TrendChartProps = {
  data: { date: string; steps: number; sleep: number; readiness: number }[];
};

export default function TrendChart({ data }: TrendChartProps) {
  return (
    <div className="chart-panel">
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="readinessFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="5%" stopColor="#7cc8ff" stopOpacity={0.7} />
              <stop offset="95%" stopColor="#7cc8ff" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
          <XAxis dataKey="date" stroke="#94a3b8" />
          <YAxis stroke="#94a3b8" domain={[0, 100]} />
          <Tooltip
            contentStyle={{
              background: '#0b1727',
              border: '1px solid rgba(148,163,184,0.2)',
              borderRadius: 12,
            }}
          />
          <Area type="monotone" dataKey="readiness" stroke="#7cc8ff" fill="url(#readinessFill)" strokeWidth={3} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
