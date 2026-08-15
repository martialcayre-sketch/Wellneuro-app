import type { ModeleDocument } from './types';

// Catalogue des modèles documentaires C3 (un modèle = une intention, sans contenu).
// Reflète la vue de composition « deux colonnes » actée au cadrage : chaque type de
// bloc source (gauche) se décline en un énoncé destinataire (droite), rendu en LOT-03.

/**
 * Document de suivi 21 jours — l'assemblage canonique de la vue deux colonnes :
 *   donnée déclarée → « ce que vous avez décrit »
 *   score calculé   → « ce que cela suggère »
 *   décision validée→ « votre priorité actuelle »
 *   action 21 jours → « ce que vous allez essayer »
 * + narratif de synthèse et note du praticien.
 */
export const MODELE_SUIVI_21J: ModeleDocument = {
  id: 'suivi_21j',
  titre: 'Document de suivi 21 jours',
  intention: 'Restituer au destinataire le parcours 21 jours à partir des blocs validés.',
  typesBlocs: [
    'narratif',
    'donnee_declaree',
    'score_calcule',
    'decision_validee',
    'action_21j',
    'vigilance',
    'note_praticien',
  ],
};

/**
 * Courrier médecin — proposition d'explorations biologiques (LOT-06, D-059 §6).
 * Non prescriptif par construction : le rendu destinataire `medecin` passe par
 * `assertRenduMedecinNonPrescriptif` (chokepoint `rendu.ts`), et la décision
 * de demander les explorations appartient au médecin.
 */
export const MODELE_COURRIER_BIOLOGIE: ModeleDocument = {
  id: 'courrier_biologie',
  titre: 'Courrier médecin — explorations biologiques',
  intention:
    'Transmettre au médecin, pour son appréciation, la proposition d’explorations biologiques dérivée de la table d’indications signée.',
  typesBlocs: ['narratif'],
};

/** Registre des modèles disponibles, indexés par id. */
export const MODELES_DOCUMENTS: Readonly<Record<string, ModeleDocument>> = {
  [MODELE_SUIVI_21J.id]: MODELE_SUIVI_21J,
  [MODELE_COURRIER_BIOLOGIE.id]: MODELE_COURRIER_BIOLOGIE,
};

/** Résout un modèle par id, ou `null` s'il n'existe pas. */
export function modeleParId(id: string): ModeleDocument | null {
  return MODELES_DOCUMENTS[id] ?? null;
}
