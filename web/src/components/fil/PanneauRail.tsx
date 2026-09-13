import { ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';

/**
 * COQUE COMMUNE DES PANNEAUX DE L'ACCUEIL — et surtout : ce qu'un panneau
 * coûte à l'écran quand il n'a rien à dire.
 *
 * POURQUOI. Six panneaux de ~150 px empilés dans un rail de 300 px, dont le
 * cas courant est vide, poussaient le travail sous la ligne de flottaison :
 * l'inbox des questionnaires demandait deux défilements pour être lue
 * (constat propriétaire 2026-09-13). Or un panneau vide n'a besoin que d'une
 * ligne — son titre et l'état qu'il constate.
 *
 * RIEN N'EST CACHÉ, et c'est la nuance qui fait tenir la décision du
 * 2026-07-23 (« l'accueil est une liste courte ») sans rien perdre : le
 * panneau replié GARDE SA LIGNE VISIBLE — titre plus état — et son texte
 * complet reste à un clic, dans le `<details>`. Un onglet, lui, aurait fait
 * disparaître quatre signaux sur cinq.
 *
 * CE QUI NE SE REPLIE JAMAIS : l'indisponibilité. Une lecture qui échoue
 * n'est pas un panneau vide — la replier ferait conclure « il n'y a rien »
 * là où la vérité est « on ne sait pas ». Chaque appelant garde donc
 * `vide = chargé ET disponible ET sans ligne`.
 */
export function PanneauRail({
  testId,
  ariaLabel,
  titre,
  complement,
  vide,
  resumeVide,
  children,
}: {
  testId: string;
  ariaLabel?: string;
  titre: ReactNode;
  /** Badge ou mention affichée à droite du titre — panneau déplié seulement. */
  complement?: ReactNode;
  /** Le panneau est chargé, disponible, et n'a aucune ligne à montrer. */
  vide: boolean;
  /** L'état constaté, en trois mots, lisible sans déplier. */
  resumeVide: string;
  children: ReactNode;
}) {
  if (vide) {
    return (
      <section
        data-testid={testId}
        aria-label={ariaLabel}
        className="rounded-lg border border-border bg-surface px-4 py-3 shadow-card"
      >
        <details className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring">
            <h3 className="font-display text-sm font-semibold text-foreground">{titre}</h3>
            <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
              {resumeVide}
              <ChevronDown
                aria-hidden="true"
                size={14}
                strokeWidth={2}
                className="transition-transform group-open:rotate-180"
              />
            </span>
          </summary>
          <div className="mt-2 border-t border-border pt-2">{children}</div>
        </details>
      </section>
    );
  }

  return (
    <section
      data-testid={testId}
      aria-label={ariaLabel}
      className="rounded-lg border border-border bg-surface p-5 shadow-card"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-display text-lg font-semibold text-foreground">{titre}</h3>
        {complement}
      </div>
      {children}
    </section>
  );
}
