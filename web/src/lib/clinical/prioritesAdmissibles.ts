import { claimsAdmissiblesAuCorpus } from '@/lib/clinical/admissibiliteClaims';
import { PRIORITY_RULES_V1, tablePrioritesSignee } from '@/lib/clinical/priorityRulesV1';

// LES COUPLES ADMISSIBLES DE LA TABLE DES PRIORITÉS, LUS UNE FOIS PAR
// CONSTRUCTION DE LA CHAÎNE C1 ([[D-495]], critère de [[D-472]] §2).
//
// La chaîne C1 est pure et rejouable : elle ne lit pas le corpus. Chacun de ses
// quatre appelants (cockpit, rejeu du cockpit, vérificateur, rejeu du portail)
// lit ici l'ensemble et le lui passe — patron des couvertures d'adressage
// ([[D-257]]) : une lecture faite d'un côté seulement ferait 409 sur une carte
// honnête, ou interromprait le protocole du patient à tort.
//
// `null` : corpus illisible. La chaîne ne produit alors aucun candidat, et le
// dit ([[D-495]] §3).

export type AdmissibilitePriorites = ReadonlySet<string> | null;

/**
 * Les clés admissibles des couples cités par les règles évaluables de la table
 * des priorités, ou `null` si le corpus est illisible.
 *
 * Table non signée, ou sans règle évaluable : ensemble vide, sans lecture — la
 * chaîne ne produit de toute façon aucun candidat.
 */
export async function lireAdmissibilitePriorites(): Promise<AdmissibilitePriorites> {
  if (!tablePrioritesSignee()) return new Set();
  const evaluables = PRIORITY_RULES_V1.filter(
    regle => regle.statut === 'publiee' && regle.justificationClaims.length > 0,
  );
  if (evaluables.length === 0) return new Set();
  return claimsAdmissiblesAuCorpus(
    evaluables.flatMap(regle => regle.justificationClaims),
    'chaineC1/priorites',
  );
}
