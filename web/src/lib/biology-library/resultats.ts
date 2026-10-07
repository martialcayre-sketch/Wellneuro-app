// Validation PURE de la saisie d'un résultat biologique (étage 2, CB-09,
// [[D-122]] §2). La route fait les lectures (analyte au catalogue, dossier) ;
// ce module juge la forme — testable sans base.
//
// CE QUE LA V1 ACCEPTE : une mesure QUANTITATIVE (la colonne `valeur` est un
// `numeric` — un résultat qualitatif n'a pas de colonne, il attendra sa
// propre décision plutôt qu'un champ libre). AUCUNE borne de valeur : un
// seuil serait inventé (DC-19/DC-20) — c'est l'interprétation, hors
// périmètre, qui borne, jamais la saisie.
//
// LA DATE DE PRÉLÈVEMENT PORTE L'HEURE. L'unicité en base est
// (patient, analyte, horodatage) : deux prélèvements du même analyte le même
// jour — cortisol salivaire matin/soir, glycémies du jour — ne coexistent que
// distingués par l'heure (frontière tracée à la PR #838). La borne « date non
// future » vit ICI, côté code (`now()` est interdit en CHECK), avec la
// tolérance de 24 h posée pour les fuseaux — technique, pas clinique.
//
// LA VALEUR EST UNE CHAÎNE DÉCIMALE (LOT-10) : elle arrive en texte, ressort
// en forme canonique, et la route la remet à `Prisma.Decimal` — jamais de
// `number` entre la saisie et la colonne.

import { depasseCapacite, lireDecimalSaisi } from './valeurDecimale';

/** Tolérance sur « non futur » : fuseaux et horloges décalées, pas un délai clinique. */
export const TOLERANCE_FUTUR_MS = 24 * 60 * 60 * 1000;

export type RefusSaisieResultat =
  /** `valeur` absente, ou pas une CHAÎNE décimale (un `number` est refusé : il a perdu l'exactitude). */
  | 'valeur_invalide'
  /** `valeur` au-delà de la capacité de la colonne : 35 chiffres entiers, 30 décimales (borne technique). */
  | 'valeur_hors_capacite'
  /** `preleveLe` absent ou illisible comme date ISO 8601. */
  | 'date_invalide'
  /** `preleveLe` au-delà de maintenant + 24 h : un prélèvement n'anticipe pas. */
  | 'date_future';

export type VerdictSaisieResultat =
  | { ok: true; /** Forme canonique (`valeurDecimale.ts`), jamais un `number`. */ valeur: string; preleveLe: Date }
  | { ok: false; raison: RefusSaisieResultat };

export type VerdictDatePrelevement =
  | { ok: true; preleveLe: Date }
  | { ok: false; raison: 'date_invalide' | 'date_future' };

/**
 * La date de prélèvement SEULE. La saisie groupée d'un bilan (LOT-01) porte
 * une date COMMUNE à toutes ses lignes : elle se juge une fois, et son refus
 * est celui du bilan entier, pas d'une ligne.
 */
export function validerDatePrelevement(preleveLeBrut: unknown, maintenant: Date): VerdictDatePrelevement {
  if (typeof preleveLeBrut !== 'string' || preleveLeBrut.trim() === '') {
    return { ok: false, raison: 'date_invalide' };
  }
  const preleveLe = new Date(preleveLeBrut);
  if (Number.isNaN(preleveLe.getTime())) {
    return { ok: false, raison: 'date_invalide' };
  }
  if (preleveLe.getTime() > maintenant.getTime() + TOLERANCE_FUTUR_MS) {
    return { ok: false, raison: 'date_future' };
  }
  return { ok: true, preleveLe };
}

export function validerSaisieResultat(
  entree: { valeur: unknown; preleveLe: unknown },
  maintenant: Date,
): VerdictSaisieResultat {
  const valeur = lireDecimalSaisi(entree.valeur);
  if (valeur === null) {
    return { ok: false, raison: 'valeur_invalide' };
  }
  if (depasseCapacite(valeur)) {
    return { ok: false, raison: 'valeur_hors_capacite' };
  }

  const date = validerDatePrelevement(entree.preleveLe, maintenant);
  if (!date.ok) return date;

  return { ok: true, valeur, preleveLe: date.preleveLe };
}
