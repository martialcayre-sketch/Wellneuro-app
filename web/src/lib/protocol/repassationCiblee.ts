import { BESOIN_SOURCES } from '@/lib/equilibre/constants';
import { estAdministrableParLaRoute } from '@/lib/bibliotheque';

// Re-passation CIBLÉE au jalon (LOT-07, `D-058`).
//
// La fiche du lot demandait de dériver la cible des `mesures[]` du protocole —
// mais ce champ, tel que le LOT-05 l'a écrit, est du TEXTE LIBRE (« Agenda
// rempli au moins 14 jours sur 21 ») : rien de mécanique ne s'en déduit sans
// deviner. Le protocole porte pourtant sa cible ailleurs et en clair :
// `provenance.needIds` de la priorité sélectionnée — les besoins qui FONDENT la
// priorité. `BESOIN_SOURCES` fait le reste, et c'est une table signée : aucune
// correspondance nouvelle n'est inventée ici (`DC-19`, `DC-26`).
//
// Ce module PROPOSE, il n'envoie rien. La proposition rejoint la file d'envoi
// existante par le même geste praticien que la Bibliothèque et l'orientation —
// aucun envoi automatique, aucune assignation planifiée.

/**
 * Les questionnaires qui re-mesureraient ce que la priorité sélectionnée vise.
 *
 * Dédupliqués (deux besoins peuvent partager une source), dans l'ordre des
 * besoins puis des sources — déterministe, donc comparable d'un rendu à
 * l'autre. Filtrés par `estAdministrableParLaRoute` : proposer un instrument
 * que la route refuserait d'administrer serait un bouton cassé.
 *
 * `needIds` vide ⇒ liste vide : une priorité sans provenance de besoin ne
 * cible rien, et on ne propose pas « le pack entier » à sa place — c'est
 * précisément ce que la re-passation ciblée remplace.
 */
export function questionnairesCiblesPourPriorite(needIds: readonly number[]): string[] {
  const vus = new Set<string>();
  const cibles: string[] = [];
  for (const besoin of needIds) {
    for (const source of BESOIN_SOURCES[besoin] ?? []) {
      if (vus.has(source.idQuestionnaire)) continue;
      vus.add(source.idQuestionnaire);
      if (!estAdministrableParLaRoute(source.idQuestionnaire)) continue;
      cibles.push(source.idQuestionnaire);
    }
  }
  return cibles;
}
