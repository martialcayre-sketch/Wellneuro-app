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
 * Famille « sans interprétation » (`D-087`) — un instrument de PILOTAGE, servi
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
 * GARDE ANTI-BANDE-PAR-DÉFAUT (`D-087`) — vrai quand la famille de scoring
 * interdit TOUTE bande, y compris la bande d'attente
 * « Grille à définir — relecture requise ».
 *
 * Trois sites posent cette bande quand la grille manque : `scoringParDefaut`
 * (import sans grille), l'amorce de l'éditeur (`BibliothequePanel`) et
 * l'avertissement d'import. Aucun ne doit la poser ici : sur un instrument
 * qui, par construction, ne classe pas, un libellé d'attente coloré `warning`
 * est un verdict de fait — et aucune source ne l'a écrit (`DC-19`, `DC-20`).
 */
export function interditTouteBande(scoring: { type?: unknown } | null | undefined): boolean {
  return scoring?.type === TYPE_SCORING_SANS_INTERPRETATION;
}
