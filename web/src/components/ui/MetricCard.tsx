import Link from 'next/link';

const CARD_BASE =
  'bg-surface text-surface-foreground rounded-xl border border-border p-5 flex flex-col gap-1 shadow-card';

// Carte métrique du cabinet. Avec `href`, elle devient un point d'accès actif
// (rendu comme lien, état survol/focus, libellé « Voir → ») vers la page
// concernée ; sans `href`, elle reste la carte statique historique.
export function MetricCard({
  label,
  value,
  sub,
  href,
}: {
  label: string;
  value: string | number;
  sub?: string;
  href?: string;
}) {
  const contenu = (
    <>
      <span className="text-xs text-muted-foreground uppercase tracking-wide">{label}</span>
      <span className="text-3xl font-bold text-primary">{value}</span>
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
      {href && (
        <span className="mt-1 text-xs font-medium text-primary group-hover:underline">Voir →</span>
      )}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={`${CARD_BASE} group transition hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring`}
      >
        {contenu}
      </Link>
    );
  }

  return <div className={CARD_BASE}>{contenu}</div>;
}

export function MetricCardSkeleton() {
  return (
    <div className="bg-surface rounded-xl border border-border p-5 animate-pulse h-24 shadow-card" />
  );
}
