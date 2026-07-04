export function MetricCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="bg-surface text-surface-foreground rounded-xl border border-border p-5 flex flex-col gap-1 shadow-sm">
      <span className="text-xs text-muted-foreground uppercase tracking-wide">{label}</span>
      <span className="text-3xl font-bold text-primary">{value}</span>
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
    </div>
  );
}

export function MetricCardSkeleton() {
  return (
    <div className="bg-surface rounded-xl border border-border p-5 animate-pulse h-24 shadow-sm" />
  );
}
