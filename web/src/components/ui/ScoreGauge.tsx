'use client';

import { PolarAngleAxis, RadialBar, RadialBarChart } from 'recharts';

export function ScoreGauge({
  value,
  max = 100,
  label,
  zoneLabel,
  showValue = true,
}: {
  value: number;
  max?: number;
  label: string;
  zoneLabel?: string;
  /** À désactiver côté patient : A6-R1 proscrit un score chiffré affiché au patient. */
  showValue?: boolean;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const data = [{ name: label, pct }];

  return (
    <div className="flex flex-col items-center gap-1 bg-surface border border-border rounded-xl p-4">
      <RadialBarChart
        width={160}
        height={100}
        cx="50%"
        cy="100%"
        innerRadius="70%"
        outerRadius="100%"
        barSize={12}
        data={data}
        startAngle={180}
        endAngle={0}
      >
        <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
        <RadialBar
          dataKey="pct"
          cornerRadius={6}
          background={{ fill: 'var(--muted)' }}
          style={{ fill: 'var(--color-primary)' }}
        />
      </RadialBarChart>
      {showValue && <div className="-mt-10 text-2xl font-bold text-foreground">{value}</div>}
      <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
      {zoneLabel && <span className="text-xs text-muted-foreground">{zoneLabel}</span>}
    </div>
  );
}
