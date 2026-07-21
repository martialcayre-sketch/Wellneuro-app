import type { DecisionCard } from './types';

// Gardes de lecture sur la DecisionCard. Module volontairement SANS import de
// valeur : il est consommé par des composants clients, et le reste du moteur
// clinique tire `node:crypto` via `canonical.ts` (cf. l'en-tête de
// `ProtocolMiniBuilder`, et la fuite corrigée en C5 LOT-06 sur le barrel
// `food-observation`). Ne pas l'ajouter à `index.ts` pour la même raison.

// Seuls champs lus par la garde. Une `DecisionCard` complète satisfait ce type ;
// l'exprimer ainsi évite d'avoir à fabriquer une carte entière pour la tester.
export type DecisionBloquanteLisible = Pick<DecisionCard, 'abstention' | 'safetyFindingIds'>;

/**
 * Vrai quand la décision est bloquée et qu'aucun protocole ne peut donc être
 * proposé. Deux causes, non exclusives :
 *
 * - l'abstention clinique n'est pas levée — `'required'` évidemment, mais aussi
 *   `'not_evaluated'` : une abstention non évaluée n'est pas une abstention
 *   écartée, et seul `'not_required'` autorise à avancer ;
 * - au moins un finding de sécurité est présent.
 *
 * Règle inchangée depuis C1 LOT-03 : extraite de `ProtocolMiniBuilder` pour que
 * le panneau détaillé et le signal permanent de la fiche patient ne puissent
 * pas diverger. Toute modification relève de la logique clinique.
 */
export function isDecisionBloquee(decisionCard: DecisionBloquanteLisible | null | undefined): boolean {
  if (!decisionCard) return false;
  return decisionCard.abstention.status !== 'not_required' || decisionCard.safetyFindingIds.length > 0;
}
