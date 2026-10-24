import { BESOIN_SOURCES } from '@/lib/equilibre/constants';
import { IDS_ASSIGNABLES } from '@/lib/bibliotheque';
import { estSelectionLibre } from '@/lib/clinical-engine/prioriteLibre';
import type { DecisionCard } from '@/lib/clinical-engine/types';

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
 * l'autre. Filtrés par `IDS_ASSIGNABLES` — LE prédicat de la file d'envoi
 * destinataire (`idsAssignablesPour`), pas un prédicat voisin : proposer un
 * instrument que la route refuserait d'assigner serait un bouton cassé.
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
      if (!IDS_ASSIGNABLES.has(source.idQuestionnaire)) continue;
      cibles.push(source.idQuestionnaire);
    }
  }
  return cibles;
}

// Identité STABLE pour « aucun besoin » : l'écran passe ces tableaux dans le
// tableau de dépendances d'un effet, et un `?? []` recréerait un tableau neuf à
// chaque rendu — l'effet tirerait en boucle.
const BESOINS_VIDES: number[] = [];

/**
 * Ce que la re-passation ciblée lit d'une carte de décision — et elle seule.
 *
 * `needIds` : les besoins qui FONDENT la priorité visée — le candidat
 * sélectionné par le praticien, à défaut le candidat proposé par la carte
 * (`proposedMainPriorityId`, nul tant que la table des priorités n'est pas
 * signée). `besoinsVises` : les besoins que le praticien a cochés sur une
 * priorité qu'il a posée ([[D-338]] §3) — un canal distinct, qu'aucune règle ne
 * déduit.
 *
 * UNE SEULE DÉRIVATION, DEUX LECTEURS (t41) : l'écran l'applique à la carte
 * qu'il affiche, la route cockpit à la carte de l'ancre quand le jalon dû n'a
 * pas de carte à lui. Deux copies finiraient par viser deux priorités.
 *
 * Les tableaux rendus sont CEUX DE LA CARTE (ou le vide partagé), jamais des
 * copies : l'écran les passe dans un tableau de dépendances, et une copie par
 * rendu y relancerait l'effet à chaque rendu.
 */
export function besoinsDeRepassation(
  decisionCard: Pick<DecisionCard, 'priorityCandidates' | 'proposedMainPriorityId' | 'selectedMainPriority'> | null,
): { needIds: number[]; besoinsVises: number[] } {
  if (!decisionCard) return { needIds: BESOINS_VIDES, besoinsVises: BESOINS_VIDES };
  const selection = decisionCard.selectedMainPriority;
  const idCandidatVise = selection?.candidateId ?? decisionCard.proposedMainPriorityId;
  const candidatVise = idCandidatVise
    ? decisionCard.priorityCandidates.find(candidat => candidat.candidateId === idCandidatVise) ?? null
    : null;
  return {
    needIds: candidatVise?.provenance.needIds ?? BESOINS_VIDES,
    besoinsVises: estSelectionLibre(selection) ? selection.libre.besoinsVises ?? BESOINS_VIDES : BESOINS_VIDES,
  };
}
