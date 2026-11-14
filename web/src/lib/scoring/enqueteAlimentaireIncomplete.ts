// Enquête alimentaire SiiN incomplète : score non calculé ([[D-517]]).
//
// Module PUR, sans dépendance : la fiche patient (`'use client'`) et l'export
// l'importent, le moteur (`questions.ts`) aussi. Le texte est celui que le
// responsable a validé mot pour mot le 2026-11-13 (question `20261113-2121-a`) :
// toute retouche lui revient.

/** Texte servi par le moteur (`raisonNonScore`), la fiche, l'export et la synthèse. */
export const TEXTE_ENQUETE_ALIMENTAIRE_INCOMPLETE = 'Enquête alimentaire incomplète : score non calculé.';

/**
 * Le texte à dire à la place du score, ou `null`.
 *
 * Lit le résultat ENREGISTRÉ (`scoresJson`) : seule une passation scorée après
 * [[D-517]] porte `scored: false` avec des items manquants. Le moteur
 * `seuils_points` ne sert que l'enquête SiiN à 57 items ; le type est relu pour
 * qu'un autre moteur à `scored: false` (agenda du sommeil, apports pondérés)
 * ne reçoive jamais ce texte.
 */
export function texteScoreNonCalcule(scores: Record<string, unknown> | null | undefined): string | null {
  if (!scores || scores.type !== 'seuils_points' || scores.scored !== false) return null;
  return typeof scores.missing === 'number' && scores.missing > 0 ? TEXTE_ENQUETE_ALIMENTAIRE_INCOMPLETE : null;
}
