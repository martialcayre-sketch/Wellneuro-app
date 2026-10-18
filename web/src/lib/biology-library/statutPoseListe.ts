// Les statuts que le praticien pose près d'une valeur biologique ([[D-322]]
// §1, F58) — liste FERMÉE, recopiée du CHECK de la migration
// `statuts_poses_resultats_biologiques_v1`. Module PUR : l'écran en lit les
// libellés, la route la garde ; aucun import ici.
//
// Chaque statut dit ce que le praticien FAIT de la valeur, jamais ce que vaut
// la valeur. Les libellés sont affichés tels quels (§1). Un statut neuf exige
// une décision et une migration : l'ajouter ici seul ferait refuser par la
// base un geste que l'écran propose.

export const STATUTS_POSES = [
  'aucune_action_retenue',
  'a_suivre',
  'contexte_a_preciser',
  'donnee_a_verifier',
  'avis_medical_a_envisager',
  'relie_au_protocole',
] as const;
export type StatutPose = (typeof STATUTS_POSES)[number];

export const LIBELLES_STATUT_POSE: Record<StatutPose, string> = {
  aucune_action_retenue: 'aucune action retenue',
  a_suivre: 'à suivre',
  contexte_a_preciser: 'contexte à préciser',
  donnee_a_verifier: 'donnée à vérifier',
  avis_medical_a_envisager: 'avis médical à envisager',
  relie_au_protocole: 'relié au protocole',
};

/** Rien par défaut, rien de calculé ([[D-322]] §2). */
export const LIBELLE_SANS_STATUT_POSE = 'sans statut posé';

export function estStatutPose(valeur: unknown): valeur is StatutPose {
  return typeof valeur === 'string' && (STATUTS_POSES as readonly string[]).includes(valeur);
}
