// Tableau de compatibilité C4 — les quatre lignes actées : Qualité de
// formulation / Compatibilité protocole / Données manquantes / Dernière revue.
// Valeurs qualitatives nommées, jamais agrégées en un chiffre (décision figée
// de C4 : pas de score global). Les fiches produit arrivent au LOT-02a : tout
// ce qui dépend du produit rend « non évaluée » honnêtement en attendant.
import { isC4Enabled } from './featureFlag';
import {
  C4_TABLEAU_COMPATIBILITE_VERSION,
  type CandidatProtocolReviewFlag,
  type TableauCompatibilite,
  type ValeurCompatibiliteProtocole,
} from './types';

function decrireSignaux(nombre: number): string {
  return nombre > 1 ? `${nombre} signaux` : '1 signal';
}

function lireCompatibiliteProtocole(
  candidats: readonly CandidatProtocolReviewFlag[] | null,
): { valeur: ValeurCompatibiliteProtocole; justification: string } {
  if (candidats === null) {
    return {
      valeur: 'non_evaluee',
      justification:
        'La sentinelle n\'a pas été évaluée sur une sélection d\'intentions : aucune lecture de compatibilité disponible.',
    };
  }
  if (candidats.length === 0) {
    return {
      valeur: 'compatible',
      justification:
        'Aucun signal levé par la sentinelle sur la sélection étudiée (lecture au niveau ingrédient, sans fiche produit — le praticien reste seul décideur).',
    };
  }
  if (candidats.some(candidat => candidat.alerteSecurite !== null)) {
    return {
      valeur: 'vigilance_requise',
      justification:
        `${decrireSignaux(candidats.length)} de la sentinelle dont au moins une alerte de sécurité jointe — arbitrage praticien requis, aucune décision automatique.`,
    };
  }
  return {
    valeur: 'compatible_avec_vigilance',
    justification:
      `${decrireSignaux(candidats.length)} de la sentinelle à examiner — aucun n'emporte de décision automatique.`,
  };
}

export function construireTableauCompatibilite(
  input: { candidatsSentinelle?: readonly CandidatProtocolReviewFlag[] | null } = {},
): TableauCompatibilite {
  if (!isC4Enabled()) {
    throw new Error(
      'Rayon compléments désactivé : WN_C4_ENABLED doit valoir « true » (fail-closed).',
    );
  }
  return {
    contractVersion: C4_TABLEAU_COMPATIBILITE_VERSION,
    aucunScoreGlobal: true,
    qualiteFormulation: {
      valeur: 'non_evaluee',
      justification:
        'Les fiches produit (formes, excipients, additifs) arrivent au LOT-02a : la qualité de formulation n\'est pas encore évaluable.',
    },
    compatibiliteProtocole: lireCompatibiliteProtocole(input.candidatsSentinelle ?? null),
    donneesManquantes: {
      valeur: 'non_evaluee',
      elements: [],
      justification:
        'La complétude dépend de la fiche produit (LOT-02a) : abstention honnête en attendant.',
    },
    derniereRevue: {
      valeur: 'non_evaluee',
      date: null,
      justification:
        'Aucune fiche produit revue : la date de dernière revue n\'existe pas encore (LOT-02a).',
    },
  };
}
