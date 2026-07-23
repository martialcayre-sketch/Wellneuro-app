'use client';

import { Badge } from '@/components/ui/Badge';

// « Estimé ↔ mesuré » (maquette 5.0, écran Fiche-trajectoire) — panneau en
// état « SECOND TEMPS » (A6-R2) : aucune donnée biologique n'est stockée par
// l'application (le stockage du mesuré exige un hébergement HDS — gate
// inchangé), et rien n'est fabriqué ici. Le panneau documente la place de
// l'instrument, il n'affiche ni axe chiffré ni donnée d'exemple.

export function EstimeMesurePanel() {
  return (
    <section aria-label="Estimé et mesuré" className="rounded-lg border border-border/60 p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h4 className="text-sm font-semibold text-foreground">Estimé ↔ mesuré</h4>
        <Badge variant="info">Second temps — HDS requis</Badge>
      </div>
      <p className="mt-2 text-base text-muted-foreground">
        Cet instrument confrontera le déclaratif des questionnaires (estimé) aux résultats de biologie fonctionnelle
        (mesuré) — jamais fusionnés en un chiffre unique. Le stockage du mesuré exige un hébergement de données de
        santé (HDS) : tant qu’il n’est pas en place, seul le déclaratif existe dans l’application et rien n’est
        affiché ici.
      </p>
    </section>
  );
}
