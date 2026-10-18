import type { ReactNode } from 'react';

// En-tête commun des rayons de la Bibliothèque, un rayon par page depuis
// D-324 §4 : surtitre, titre de page, phrase d'usage.
export function EnTeteRayon({
  surtitre,
  titre,
  children,
}: {
  surtitre: string;
  titre: string;
  children: ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[.06em] text-solar-ink">{surtitre}</p>
      <h2 className="font-display text-3xl font-bold tracking-[-0.02em] text-foreground">{titre}</h2>
      <p className="mt-1 max-w-2xl text-base text-muted-foreground">{children}</p>
    </div>
  );
}
