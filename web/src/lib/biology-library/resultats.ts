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

/** Tolérance sur « non futur » : fuseaux et horloges décalées, pas un délai clinique. */
export const TOLERANCE_FUTUR_MS = 24 * 60 * 60 * 1000;

/**
 * Capacité de la colonne `DECIMAL(65,30)` : 35 chiffres avant la virgule.
 * Borne TECHNIQUE nommée comme telle (aucune sémantique clinique, comme la
 * tolérance « non futur ») : refuser ici en français vaut mieux qu'un 500
 * opaque quand Postgres refuse.
 */
export const CAPACITE_VALEUR_ABS = 1e35;

export type RefusSaisieResultat =
  /** `valeur` absente, non numérique, ou non finie (NaN, ±Infinity). */
  | 'valeur_invalide'
  /** `valeur` au-delà de la capacité de la colonne (borne technique). */
  | 'valeur_hors_capacite'
  /** `preleveLe` absent ou illisible comme date ISO 8601. */
  | 'date_invalide'
  /** `preleveLe` au-delà de maintenant + 24 h : un prélèvement n'anticipe pas. */
  | 'date_future';

export type VerdictSaisieResultat =
  | { ok: true; valeur: number; preleveLe: Date }
  | { ok: false; raison: RefusSaisieResultat };

export function validerSaisieResultat(
  entree: { valeur: unknown; preleveLe: unknown },
  maintenant: Date,
): VerdictSaisieResultat {
  const valeur = typeof entree.valeur === 'number' ? entree.valeur : Number.NaN;
  if (!Number.isFinite(valeur)) {
    return { ok: false, raison: 'valeur_invalide' };
  }
  if (Math.abs(valeur) >= CAPACITE_VALEUR_ABS) {
    return { ok: false, raison: 'valeur_hors_capacite' };
  }

  if (typeof entree.preleveLe !== 'string' || entree.preleveLe.trim() === '') {
    return { ok: false, raison: 'date_invalide' };
  }
  const preleveLe = new Date(entree.preleveLe);
  if (Number.isNaN(preleveLe.getTime())) {
    return { ok: false, raison: 'date_invalide' };
  }
  if (preleveLe.getTime() > maintenant.getTime() + TOLERANCE_FUTUR_MS) {
    return { ok: false, raison: 'date_future' };
  }

  return { ok: true, valeur, preleveLe };
}
