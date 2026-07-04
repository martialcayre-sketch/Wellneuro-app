'use client';

import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from 'recharts';

export type ScoreRadarPoint = { axe: string; value: number };

export function ScoreRadar({ data, max = 100 }: { data: ScoreRadarPoint[]; max?: number }) {
  return (
    <div className="bg-surface border border-border rounded-xl p-4">
      <ResponsiveContainer width="100%" height={260}>
        <RadarChart data={data}>
          <PolarGrid stroke="var(--border)" />
          <PolarAngleAxis dataKey="axe" tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} />
          <PolarRadiusAxis angle={30} domain={[0, max]} tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} />
          <Radar
            dataKey="value"
            stroke="var(--color-primary)"
            fill="var(--color-primary)"
            fillOpacity={0.35}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
