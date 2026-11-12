import { claimsAdmissiblesAuCorpus, couplesNonAdmissibles, type CoupleClaim } from './admissibiliteClaims';
import { ORIENTATION_RULES_V1, type OrientationRule } from './orientationRulesV1';

// LES RÈGLES D'ORIENTATION APPLICABLES, LUES AU SERVICE ([[D-495]], critère
// de [[D-472]] §2, module partagé de [[D-491]]).
//
// UNE SEULE LECTURE, DEUX CONSOMMATEURS. Le panneau d'orientation
// (`orientationService`) et le constat de convergence (`contradictionsService`,
// DC-29) lisent la même table ; une règle que le panneau dit « non appliquée »
// ne doit ni proposer d'exploration ni compter dans une convergence, au cockpit
// comme dans la synthèse ([[D-495]] §1 et §2). Recopier le filtre chez chacun
// les ferait diverger.
//
// LE VERROU DE SIGNATURE N'EST PAS ICI. `orientationActive()` juge l'empreinte
// de la table ENTIÈRE avant toute lecture ; retirer ensuite des règles de la
// liste passée au moteur ne touche pas cette empreinte (même raisonnement que
// les règles d'arrêt, [[D-491]]).

export type RegleOrientationNonAppliquee = {
  regleId: string;
  /** Les couples cités par la règle qui ne sont pas admissibles au corpus. */
  claims: CoupleClaim[];
};

export type OrientationAdmissible = {
  /** La table, privée de ses règles non applicables — dans son ordre. */
  regles: OrientationRule[];
  /** Vide, jamais absent. */
  nonAppliquees: RegleOrientationNonAppliquee[];
};

/**
 * Les règles d'orientation à passer aux moteurs, et celles qui ne sont pas
 * appliquées, ou `null` quand le corpus est illisible.
 *
 * Seules les règles que les moteurs évalueraient (`publiee`, au moins un claim)
 * sont jugées ; les autres traversent inchangées, puisqu'aucun moteur ne les
 * lit. `null` ne se replie jamais sur la table entière : ne pas pouvoir
 * vérifier ses sources n'autorise aucune règle ([[D-495]] §3).
 */
export async function reglesOrientationAdmissibles(): Promise<OrientationAdmissible | null> {
  const evaluables = ORIENTATION_RULES_V1.filter(
    regle => regle.statut === 'publiee' && regle.justificationClaims.length > 0,
  );
  if (evaluables.length === 0) return { regles: [...ORIENTATION_RULES_V1], nonAppliquees: [] };
  const admissibles = await claimsAdmissiblesAuCorpus(
    evaluables.flatMap(regle => regle.justificationClaims),
    'orientationAdmissible',
  );
  if (admissibles === null) return null;
  const nonAppliquees: RegleOrientationNonAppliquee[] = [];
  for (const regle of evaluables) {
    const manquants = couplesNonAdmissibles(regle.justificationClaims, admissibles);
    if (manquants.length > 0) nonAppliquees.push({ regleId: regle.id, claims: manquants });
  }
  const ecartees = new Set(nonAppliquees.map(regle => regle.regleId));
  return { regles: ORIENTATION_RULES_V1.filter(regle => !ecartees.has(regle.id)), nonAppliquees };
}
