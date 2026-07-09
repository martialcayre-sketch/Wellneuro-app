import { calculerCouvertureBesoin, calculerCouvertureSource, calculerEquilibre } from './score';
import type { ReponsesParQuestionnaire, ResultatEquilibre, SourceQuestionnaire } from './types';

// Formules des 5 objets cliniques du dashboard praticien R9, validées en
// conversation (2026-07-06/07) — cf. docs/claude/MON_EQUILIBRE_CONTEXTE.md §7
// et le journal de session pour le détail du raisonnement.
//
// - Indice global      → calculerEquilibre (inchangé, déjà existant).
// - Clarté             → couverture du besoin 10 telle quelle (vitalité,
//                         humeur, cognition — recoupe le candidat besoin 10
//                         déjà proposé côté Boussole alimentaire).
// - Réserve d'adaptation → couverture du besoin 9 telle quelle (stress).
// - Stabilité métabolique → nouvelle moyenne dédiée (hyperexcitabilité +
//                         magnésium), distincte du besoin 4 qui reste
//                         digestif/perception corporelle.
// - Momentum → delta de l'indice global entre deux jalons résolus (cf.
//   momentum.ts : resoudreLectureJalon + calculerDeltaMomentum). Ne se
//   calcule pas depuis une seule photo de réponses — nécessite l'historique
//   du patient, laissé à l'intégration API qui appellera calculerEquilibre à
//   chaque date résolue.

const SOURCES_STABILITE_METABOLIQUE: SourceQuestionnaire[] = [
  { idQuestionnaire: 'Q_INF_01', max: 96, inverser: true }, // hyperexcitabilité SIIN
  { idQuestionnaire: 'Q_INF_02', max: 52, inverser: true }, // magnésium/spasmophilie SIIN
];

export function calculerClarte(reponses: ReponsesParQuestionnaire): number | null {
  return calculerCouvertureBesoin(10, reponses);
}

export function calculerReserveAdaptation(reponses: ReponsesParQuestionnaire): number | null {
  return calculerCouvertureBesoin(9, reponses);
}

export function calculerStabiliteMetabolique(reponses: ReponsesParQuestionnaire): number | null {
  const couvertures = SOURCES_STABILITE_METABOLIQUE
    .map(source => calculerCouvertureSource(source, reponses))
    .filter((c): c is number => c !== null);

  if (couvertures.length === 0) return null;
  return couvertures.reduce((somme, c) => somme + c, 0) / couvertures.length;
}

export type ObjetsCliniques = {
  indiceGlobal: ResultatEquilibre;
  clarte: number | null;
  reserveAdaptation: number | null;
  stabiliteMetabolique: number | null;
};

/**
 * Les 4 objets cliniques calculables à partir d'une seule photo de réponses
 * (le 5e, momentum, nécessite l'historique du patient — cf. momentum.ts).
 */
export function calculerObjetsCliniques(reponses: ReponsesParQuestionnaire): ObjetsCliniques {
  return {
    indiceGlobal: calculerEquilibre(reponses),
    clarte: calculerClarte(reponses),
    reserveAdaptation: calculerReserveAdaptation(reponses),
    stabiliteMetabolique: calculerStabiliteMetabolique(reponses),
  };
}
