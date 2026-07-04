'use client';

import { Line, LineChart, ResponsiveContainer } from 'recharts';

export type ScoreSparklinePoint = { value: number };

export function ScoreSparkline({ data }: { data: ScoreSparklinePoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={40}>
      <LineChart data={data}>
        <Line type="monotone" dataKey="value" stroke="var(--color-accent)" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
