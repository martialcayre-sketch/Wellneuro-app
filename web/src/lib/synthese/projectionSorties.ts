// LES LISTES DE CHAMPS AUTORISÉS PAR SORTIE — [[D-513]] §5 et §7 (arbitrage
// `20261113-1119-b`).
//
// Chaque sortie de la synthèse est construite par SA liste explicite : aucun
// JSON complet transmis, aucune fusion préalable des vigilances. Un champ
// ajouté au schéma n'entre dans aucune sortie sans être nommé ici — c'est ce
// qui tient les deux champs biologiques (`CHAMPS_BIOLOGIE_SYNTHESE`) au seul
// cockpit praticien. `projectionSorties.test.ts` vérifie qu'aucune liste ne
// les nomme.
//
// Le téléchargement au portail n'a pas de liste propre : il sert le document
// au médecin FIGÉ à l'impression, composé par la liste du document au médecin.

/** Document au médecin : aperçu, impression, et donc téléchargement au portail. */
export const CHAMPS_DOCUMENT_MEDECIN = [
  'resume_praticien',
  'axes_prioritaires',
  'points_de_vigilance',
  'questions_entretien',
  'narratif_patient',
] as const;

/** Export du dossier, versions complète et « Pour une IA externe ». */
export const CHAMPS_EXPORT_DOSSIER = [
  'resume_praticien',
  'axes_prioritaires',
  'points_de_vigilance',
  'questions_entretien',
  'narratif_patient',
  'limites',
] as const;

/** Appel de priorité de l'objectif ([[D-167]] §3). */
export const CHAMPS_APPEL_PRIORITE = ['resume_praticien', 'narratif_patient'] as const;

/**
 * Le JSON réduit aux seuls champs nommés. Les valeurs sont reprises telles
 * quelles (aucune normalisation) ; un champ absent reste absent.
 */
export function projeterSynthese<C extends string>(
  syntheseJson: unknown,
  champs: readonly C[],
): Partial<Record<C, unknown>> {
  if (syntheseJson === null || typeof syntheseJson !== 'object' || Array.isArray(syntheseJson)) return {};
  const source = syntheseJson as Record<string, unknown>;
  const projete: Partial<Record<C, unknown>> = {};
  for (const champ of champs) {
    if (Object.prototype.hasOwnProperty.call(source, champ)) projete[champ] = source[champ];
  }
  return projete;
}
