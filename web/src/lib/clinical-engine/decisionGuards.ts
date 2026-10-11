import { isPrioriteLibreOuverte } from './prioriteLibre';
import type { DecisionCard } from './types';

// Gardes de lecture sur la DecisionCard. Module volontairement SANS import de
// valeur : il est consommé par des composants clients, et le reste du moteur
// clinique tire `node:crypto` via `canonical.ts` (cf. l'en-tête de
// `ProtocolMiniBuilder`, et la fuite corrigée en C5 LOT-06 sur le barrel
// `food-observation`). Ne pas l'ajouter à `index.ts` pour la même raison.
// Seule exception : `prioriteLibre.ts`, module pur qui n'importe que des types.

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

// Champs lus par la garde de sélection. Même intention que ci-dessus : une
// `DecisionCard` complète satisfait ce type, sans avoir à en fabriquer une.
export type SelectionPrioriteLisible = DecisionBloquanteLisible
  & Pick<DecisionCard, 'priorityCandidates' | 'selectedMainPriority'>;

/**
 * Le geste de sélection d'une priorité est-il DÛ, et surtout DISPONIBLE ?
 *
 * Aucune priorité déjà retenue, ET un geste offert : soit un candidat à
 * choisir (décision non bloquée, au moins un candidat classé), soit — depuis
 * [[D-279]] — une priorité à poser, ouverte tant qu'aucun constat de sécurité
 * n'est présent. Ces conditions ne sont pas du zèle — ce sont exactement
 * les cas où `SelectionPrioritePanel` se retire de l'écran. Un rail qui dirait « à traiter » sans elles enverrait le praticien
 * sur une phase où le geste n'est pas offert : le cul-de-sac de la phase
 * Actions, déplacé d'un cran plutôt que refermé.
 *
 * ÉCRITE ICI, ET PAS DEUX FOIS. Le panneau qui porte le geste et le statut de
 * phase qui y conduit doivent répondre à la même question ; deux copies
 * divergeraient le jour où l'une bouge — le défaut que `isDecisionBloquee`
 * avait déjà fermé au-dessus.
 */
export function isSelectionPrioriteDue(decisionCard: SelectionPrioriteLisible | null | undefined): boolean {
  if (!decisionCard) return false;
  if (decisionCard.selectedMainPriority !== null) return false;
  return isGesteCandidatDisponible(decisionCard) || isPrioriteLibreOuverte(decisionCard);
}

/**
 * Le choix d'un CANDIDAT du moteur est-il offert ? Décision non bloquée et au
 * moins un candidat classé — la règle inchangée depuis [[D-127]]. La priorité
 * posée par le praticien a sa propre ouverture (`isPrioriteLibreOuverte`,
 * [[D-279]]) : seul un constat de sécurité la ferme.
 */
export function isGesteCandidatDisponible(decisionCard: SelectionPrioriteLisible): boolean {
  return !isDecisionBloquee(decisionCard) && decisionCard.priorityCandidates.length > 0;
}
