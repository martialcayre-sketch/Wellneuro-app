import { Badge, type BadgeVariant } from './Badge';

export function ScoreThreshold({
  value,
  max = 100,
  zoneLabel,
  variant = 'neutral',
}: {
  value: number;
  max?: number;
  zoneLabel: string;
  variant?: BadgeVariant;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="flex flex-col gap-1.5">
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{value}/{max}</span>
        <Badge variant={variant}>{zoneLabel}</Badge>
      </div>
    </div>
  );
}
