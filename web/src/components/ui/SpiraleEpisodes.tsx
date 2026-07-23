'use client';

import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import type { TrajectoireCycle, TrajectoireRepere } from '@/lib/protocol/trajectoire';

// Spirale d'épisodes (maquette « WellNeuro 5.0 — La Spirale », écran
// Fiche-trajectoire) — la Spirale DATA-DRIVEN, par opposition à l'emblème fixe
// `SpiraleTrajectoire`. Un arc concentrique = un repère confirmé (jalon de
// mesure T0/J21/J42/J90), jamais une valeur : la Spirale reste un index
// temporel, pas un graphe (A6). Elle ne s'invente pas : zéro repère → rien.
//
// En mode interactif, chaque arc est un vrai bouton (clavier compris) qui
// pilote la MÊME sélection de repère que les boutons texte de l'index — la
// géométrie n'est jamais porteuse seule d'une information (A5-R1) : les
// boutons texte restent la surface de référence, la Spirale les double.
// En mode non interactif (miniature de liste), elle est purement décorative
// (aria-hidden), le texte voisin porte l'information.

const LABEL_JALON: Record<TrajectoireRepere['milestone'], string> = {
  T0: 'T0',
  J21: 'J21',
  J42: 'J42',
  J90: 'J90',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// Fraction décorative de l'arc « aujourd'hui » (comme l'emblème et la
// maquette) : elle signale « épisode en cours », elle ne mesure rien.
const FRACTION_ARC_PRESENT = 2 / 3;

export function SpiraleEpisodes({
  reperes,
  cycles,
  taille = 196,
  interactive = false,
  indexActif = null,
  onSelectionRepere,
  className = '',
}: {
  reperes: TrajectoireRepere[];
  cycles: TrajectoireCycle[];
  taille?: number;
  /** Arcs cliquables et focusables ; sinon la Spirale est décorative. */
  interactive?: boolean;
  /** Index (dans `reperes`) du repère sélectionné, null au présent. */
  indexActif?: number | null;
  /** Reçoit l'index cliqué, ou null pour « revenir au présent ». */
  onSelectionRepere?: (index: number | null) => void;
  className?: string;
}) {
  // Zéro repère confirmé → aucune Spirale : l'index ne s'invente pas.
  if (reperes.length === 0) return null;

  // Numéro d'épisode par cycle — `cycles` est chronologique par construction
  // (construireTrajectoire trie les épisodes) ; le dernier est l'épisode en
  // cours.
  const numeroParCycle = new Map<string, number>(cycles.map((cycle, i) => [cycle.cycleId, i + 1]));
  const cycleCourantId = cycles.length > 0 ? cycles[cycles.length - 1].cycleId : null;

  // Anneaux : un par repère (du plus ancien au centre vers l'extérieur), plus
  // l'arc « aujourd'hui » à l'extérieur quand un épisode existe.
  const arcPresent = cycles.length > 0;
  const totalAnneaux = reperes.length + (arcPresent ? 1 : 0);
  const espacement = totalAnneaux === 1 ? 32 : 32 / (totalAnneaux - 1);
  const rayonPour = (position: number): number =>
    totalAnneaux === 1 ? 32 : 16 + position * espacement;
  const epaisseur = totalAnneaux <= 4 ? 7 : totalAnneaux <= 6 ? 5 : 3.5;
  // Cible de clic : un anneau transparent dont la bande PAVE tout
  // l'espacement radial — les bandes voisines se touchent sans se
  // chevaucher, il n'existe aucun interstice mort : un clic entre deux
  // anneaux sélectionne le plus proche, et le centre de la Spirale
  // appartient à l'anneau intérieur quand la bande l'atteint (c'est aussi le
  // point que vise un clic automatisé au centre de l'élément). Le trait
  // visible seul (fill="none" → pointer-events sur le trait) faisait des
  // cibles de ~5-10 px — attrapé en vrai navigateur par l'E2E peuplée.
  const epaisseurCible = Math.max(epaisseur, espacement);

  // Fin de l'arc « aujourd'hui » : départ en haut (-90°) + fraction du tour.
  const rayonPresent = rayonPour(totalAnneaux - 1);
  const anglePresent = (-90 + FRACTION_ARC_PRESENT * 360) * (Math.PI / 180);
  const pointPresent = {
    x: 60 + rayonPresent * Math.cos(anglePresent),
    y: 60 + rayonPresent * Math.sin(anglePresent),
  };

  const surClavier = (event: ReactKeyboardEvent<SVGCircleElement>, index: number | null) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    onSelectionRepere?.(index);
  };

  const libelleRepere = (repere: TrajectoireRepere): string => {
    const numero = repere.cycleId === null ? null : (numeroParCycle.get(repere.cycleId) ?? null);
    const base = `Jalon ${LABEL_JALON[repere.milestone]} du ${formatDate(repere.date)}`;
    return numero === null ? `${base} — antérieur au premier épisode` : `${base} — épisode ${numero}`;
  };

  return (
    <svg
      aria-hidden={interactive ? undefined : true}
      role={interactive ? 'group' : undefined}
      aria-label={
        interactive
          ? `Spirale de trajectoire : ${reperes.length} repère${reperes.length > 1 ? 's' : ''} confirmé${reperes.length > 1 ? 's' : ''} — un arc par jalon, cliquer un arc relit la fiche à cette date`
          : undefined
      }
      width={taille}
      height={taille}
      viewBox="0 0 120 120"
      fill="none"
      className={className}
    >
      {reperes.map((repere, position) => {
        const estCycleCourant = repere.cycleId !== null && repere.cycleId === cycleCourantId;
        const couleur =
          repere.cycleId === null
            ? 'var(--viz-corps)'
            : estCycleCourant
              ? 'var(--viz-ancrage)'
              : 'var(--viz-corps)';
        const actif = interactive && indexActif === position;
        // Relief dans l'épisode (maquette) : les arcs anciens plus discrets ;
        // un repère non rattaché reste volontairement pâle.
        const opacite = actif ? 1 : repere.cycleId === null ? 0.25 : 0.45 + (0.4 * position) / Math.max(1, reperes.length - 1);
        return (
          <g key={`${repere.milestone}-${repere.date}-${position}`}>
            <circle
              cx="60"
              cy="60"
              r={rayonPour(position)}
              stroke={couleur}
              strokeOpacity={opacite}
              strokeWidth={actif ? epaisseur + 1.5 : epaisseur}
            />
            {interactive && (
              <circle
                cx="60"
                cy="60"
                r={rayonPour(position)}
                stroke="transparent"
                strokeWidth={epaisseurCible}
                role="button"
                tabIndex={0}
                aria-pressed={actif}
                aria-label={libelleRepere(repere)}
                onClick={() => onSelectionRepere?.(position)}
                onKeyDown={(event: ReactKeyboardEvent<SVGCircleElement>) => surClavier(event, position)}
                className="cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              />
            )}
          </g>
        );
      })}

      {arcPresent && (
        <>
          {/* Arc « aujourd'hui » : épisode en cours, fraction décorative. En
              mode interactif il ramène au présent (désélection) — même geste
              que « Retour au présent ». */}
          <circle
            cx="60"
            cy="60"
            r={rayonPresent}
            stroke="var(--viz-ancrage)"
            strokeWidth={interactive && indexActif === null ? epaisseur + 1.5 : epaisseur}
            strokeLinecap="round"
            strokeDasharray={`${FRACTION_ARC_PRESENT * 2 * Math.PI * rayonPresent} ${2 * Math.PI * rayonPresent}`}
            transform="rotate(-90 60 60)"
          />
          {/* Point solaire « vous êtes ici » — décoratif ET transparent aux
              clics : peint après l'arc, il l'interceptait (A5-R1 : le solaire
              n'est jamais porteur seul — le texte voisin le porte). */}
          <circle
            cx={pointPresent.x}
            cy={pointPresent.y}
            r={epaisseur + 2}
            fill="var(--viz-esprit)"
            opacity="0.25"
            pointerEvents="none"
          />
          <circle
            cx={pointPresent.x}
            cy={pointPresent.y}
            r={epaisseur - 1.5}
            fill="var(--viz-esprit)"
            stroke="var(--surface)"
            strokeWidth="2"
            pointerEvents="none"
          />
          {/* Cible de clic de l'anneau « aujourd'hui » : cercle complet
              transparent — tout l'anneau extérieur ramène au présent. */}
          {interactive && (
            <circle
              cx="60"
              cy="60"
              r={rayonPresent}
              stroke="transparent"
              strokeWidth={epaisseurCible}
              role="button"
              tabIndex={0}
              aria-pressed={indexActif === null}
              aria-label="Aujourd’hui — revenir au présent"
              onClick={() => onSelectionRepere?.(null)}
              onKeyDown={(event: ReactKeyboardEvent<SVGCircleElement>) => surClavier(event, null)}
              className="cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            />
          )}
        </>
      )}
    </svg>
  );
}
