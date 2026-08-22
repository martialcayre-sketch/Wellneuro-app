// Échelles nommées des instruments du cabinet — module SANS import Prisma :
// il est partagé entre le serveur (import d'instruments, resolver) et le
// panneau client de la Bibliothèque (éditeur de questionnaire), qui ne peut
// pas embarquer `@/lib/instruments` (dépendance Prisma côté serveur).

export type OptionCabinet = { v: number; l: string };

export const ECHELLES_NOMMEES: Record<
  'frequence_0_4' | 'intensite_0_3' | 'oui_non',
  { libelle: string; options: OptionCabinet[] }
> = {
  frequence_0_4: {
    libelle: 'Fréquence (0–4)',
    options: [
      { v: 0, l: 'Jamais' },
      { v: 1, l: 'Rarement' },
      { v: 2, l: 'Parfois' },
      { v: 3, l: 'Souvent' },
      { v: 4, l: 'Très souvent' },
    ],
  },
  intensite_0_3: {
    libelle: 'Intensité (0–3)',
    options: [
      { v: 0, l: 'Pas du tout' },
      { v: 1, l: 'Un peu' },
      { v: 2, l: 'Beaucoup' },
      { v: 3, l: 'Extrêmement' },
    ],
  },
  oui_non: {
    libelle: 'Oui / Non',
    options: [
      { v: 0, l: 'Non' },
      { v: 1, l: 'Oui' },
    ],
  },
};

export type EchelleNommee = keyof typeof ECHELLES_NOMMEES;

export function estEchelleNommee(valeur: unknown): valeur is EchelleNommee {
  return typeof valeur === 'string' && valeur in ECHELLES_NOMMEES;
}

/**
 * Famille « sans interprétation » (`D-088`) — un instrument de PILOTAGE, servi
 * par le moteur `sum_no_interpretation` (`@/lib/questions`, inchangé) qui rend
 * le total et `interpretation: null`.
 *
 * Le littéral et sa garde vivent ICI, et non dans `@/lib/instruments` : la
 * Bibliothèque est un panneau client, et `@/lib/instruments` embarque Prisma
 * (voir l'en-tête de ce module). `@/lib/instruments` les réexporte pour les
 * appelants serveur — un seul littéral, deux portes.
 */
export const TYPE_SCORING_SANS_INTERPRETATION = 'sum_no_interpretation';

/**
 * GARDE ANTI-BANDE-PAR-DÉFAUT (`D-088`) — vrai quand la famille de scoring
 * interdit TOUTE bande, y compris la bande d'attente
 * « Grille à définir — relecture requise ».
 *
 * Sur un instrument qui, par construction, ne classe pas, un libellé d'attente
 * coloré `warning` est un verdict de fait — et aucune source ne l'a écrit
 * (`DC-19`, `DC-20`).
 *
 * DEUX SITES ACTIFS, UN DÉFENSIF — dit tel quel pour qu'on ne lise pas ici une
 * couverture qui n'existe pas :
 *
 *  - ACTIF — `validerInstrumentCabinet` : refuse toute bande sur cette
 *    famille, y compris la bande d'attente « Grille à définir », d'où qu'elle
 *    vienne. C'est la garde qui tient réellement.
 *  - ACTIF — l'amorce de l'éditeur (`BibliothequePanel`) : l'éditeur refuse
 *    cette famille au lieu de lui poser sa bande d'attente par défaut.
 *  - DÉFENSIF — `scoringParDefaut(definition, typeDemande)` : le paramètre
 *    existe et la garde y est câblée, mais AUCUN appelant ne le passe
 *    aujourd'hui. Les trois appels d'`instruments/import/route.ts` sont sans
 *    second argument, et n'ont lieu que lorsque `scoring` est absent — cas où
 *    aucune famille n'est déclarable. Le chemin est donc inatteignable en
 *    l'état : il est gardé pour le jour où un appelant déclarera la famille
 *    sans grille, pas parce qu'il couvre quoi que ce soit maintenant. Ce que
 *    couvre CE cas aujourd'hui, c'est le refus dédié de l'import (message
 *    « Saisie chiffrée sans grille déclarée »).
 */
export function interditTouteBande(scoring: { type?: unknown } | null | undefined): boolean {
  return scoring?.type === TYPE_SCORING_SANS_INTERPRETATION;
}
