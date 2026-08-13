// Noyau PUR de la sentinelle C4B : la part qui ne lit rien.
//
// Extrait de `sentinelle.ts` (qui importe Prisma) pour qu'un module de décision
// pur puisse consommer `sentinelleADeQuoiConclure` sans tirer le client base
// par transitivité (`D-056`). Aucun changement de comportement : `sentinelle.ts`
// réexporte ces deux fonctions, et ses appelants sont inchangés.
import type { DoseEnPresence, IngredientResolu, ResolutionIntentions } from './types';

export type OccurrencesIngredient = {
  ingredient: IngredientResolu;
  occurrences: DoseEnPresence[];
};

// Rassemble, dans l'ordre neutre de la résolution, chaque atteinte d'un
// ingrédient par une règle de la sélection. Aucune agrégation de doses.
// La sentinelle ne s'évalue que sur des règles validées : une résolution de
// prévisualisation (`inclureNonValidees`, réservée à l'atelier de règles) ne
// produit jamais de flag depuis une règle non validée (motif barrière D-003).
export function collecterOccurrences(resolution: ResolutionIntentions): Map<string, OccurrencesIngredient> {
  const parIngredient = new Map<string, OccurrencesIngredient>();
  for (const { intention, regles } of resolution.intentions) {
    for (const regle of regles) {
      if (!regle.regleValidee) continue;
      const entree = parIngredient.get(regle.ingredient.id)
        ?? { ingredient: regle.ingredient, occurrences: [] };
      entree.occurrences.push({
        intentionCode: intention.code,
        intentionLabelFr: intention.labelFr,
        regleId: regle.regleId,
        versionRegle: regle.versionRegle,
        doseCibleBasse: regle.doseCibleBasse,
        doseCibleHaute: regle.doseCibleHaute,
      });
      parIngredient.set(regle.ingredient.id, entree);
    }
  }
  return parIngredient;
}

/**
 * La sentinelle a-t-elle de quoi conclure quoi que ce soit sur cette
 * résolution ?
 *
 * FAUX quand aucune règle VALIDÉE n'atteint le moindre ingrédient — ce qui est
 * le cas de toute résolution tant que `clinical_rules` est vide.
 *
 * État relu en production le 2026-08-13 (`D-056`) : `clinical_rules` ET
 * `clinical_intent_tags` comptent zéro ligne, comme `supplement_source_references`,
 * `supplement_safety_alerts`, `ingredient_functional_thresholds` et
 * `functional_categories` — seule la couche matière est peuplée (3 444
 * ingrédients, 140 148 produits). Ce commentaire affirmait jusqu'ici que la
 * table des intentions était peuplée ; elle ne l'est pas. La distinction entre
 * les deux tables reste juste — une intention peut se résoudre sans qu'aucune
 * règle ne l'atteigne — mais aucune des deux n'est publiée aujourd'hui.
 *
 * Sans cette distinction, `evaluerSentinelle` rend `[]` — et `[]` se lit
 * « aucun conflit » là où il faut lire « rien n'a été examiné ». C'est le
 * troisième visage du même défaut : `[]` ≠ `null`, déjà corrigé sur la
 * composition vide (#482) puis sur la composition partiellement résolue (#489).
 * Ici la composition peut être INTÈGRE et le feu vert rester infondé, parce
 * qu'il ne dépend pas d'elle mais du référentiel clinique.
 */
export function sentinelleADeQuoiConclure(resolution: ResolutionIntentions): boolean {
  return collecterOccurrences(resolution).size > 0;
}

