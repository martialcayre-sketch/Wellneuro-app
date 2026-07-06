import { calculateScore } from '../questions';
import {
  BESOINS,
  BESOINS_FONDATIONS_CRITIQUES,
  BESOIN_SOURCES,
  PLAFOND_FONDATION_CRITIQUE,
  POIDS_STRATE,
  SEUIL_EFFONDREMENT,
  VERSION_SCORE_EQUILIBRE,
} from './constants';
import type {
  CouverturesParBesoin,
  FondationCritiqueDeclenchee,
  ReponsesParQuestionnaire,
  ResultatEquilibre,
  ResultatStrate,
  SourceQuestionnaire,
  StrateCode,
} from './types';

export function clamp01(valeur: number): number {
  return Math.min(1, Math.max(0, valeur));
}

// resultat = retour hétérogène de calculateScore (30 formats de scoring
// différents dans questions.ts) — on ne lit que .total ou .subScores[].total,
// communs à tous les formats utilisés par BESOIN_SOURCES.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extraireValeurBrute(resultat: any, sousScore?: string): number | null {
  if (!resultat || resultat.error) return null;
  if (sousScore) {
    const sub = Array.isArray(resultat.subScores)
      ? resultat.subScores.find((s: { id: string }) => s.id === sousScore)
      : null;
    return sub && typeof sub.total === 'number' ? sub.total : null;
  }
  return typeof resultat.total === 'number' ? resultat.total : null;
}

/**
 * Couverture (0-1, plus haut = mieux) d'une source unique (un questionnaire,
 * ou un sous-score précis) — brique réutilisée par calculerCouvertureBesoin
 * et par les objets cliniques dérivés d'une source hors périmètre des 12
 * besoins (ex. stabilité métabolique, cf. objetsCliniques.ts). Retourne null
 * si la source n'a pas de réponse disponible, jamais 0 par défaut.
 */
export function calculerCouvertureSource(
  source: SourceQuestionnaire,
  reponses: ReponsesParQuestionnaire
): number | null {
  const answers = reponses[source.idQuestionnaire];
  if (!answers) return null;
  const resultat = calculateScore(source.idQuestionnaire, answers);
  const valeurBrute = extraireValeurBrute(resultat, source.sousScore);
  if (valeurBrute === null) return null;
  const ratio = valeurBrute / source.max;
  return clamp01(source.inverser ? 1 - ratio : ratio);
}

/**
 * Couverture (0-1, plus haut = mieux) d'un besoin à partir des réponses aux
 * questionnaires existants. Retourne null si aucune des sources mappées n'a
 * de réponse disponible (besoin non évaluable), jamais 0 par défaut.
 */
export function calculerCouvertureBesoin(
  besoinId: number,
  reponses: ReponsesParQuestionnaire
): number | null {
  const sources = BESOIN_SOURCES[besoinId] ?? [];
  const couvertures = sources
    .map(source => calculerCouvertureSource(source, reponses))
    .filter((c): c is number => c !== null);

  if (couvertures.length === 0) return null;
  return couvertures.reduce((somme, c) => somme + c, 0) / couvertures.length;
}

export function calculerCouverturesTousLesBesoins(
  reponses: ReponsesParQuestionnaire
): CouverturesParBesoin {
  const resultat: CouverturesParBesoin = {};
  for (const besoin of BESOINS) {
    resultat[besoin.id] = calculerCouvertureBesoin(besoin.id, reponses);
  }
  return resultat;
}

/**
 * Agrège des couvertures par besoin (0-1 ou null) en couvertures par strate.
 * Fonction pure — ne dépend d'aucun questionnaire réel, testable avec des
 * couvertures synthétiques.
 */
export function agregerBesoinsEnStrates(
  couverturesParBesoin: CouverturesParBesoin
): ResultatStrate[] {
  const strates: StrateCode[] = ['CORPS', 'ANCRAGE', 'ESPRIT'];

  return strates.map(strate => {
    const besoinsStrate = BESOINS.filter(b => b.strate === strate);
    const resultatsBesoins = besoinsStrate.map(b => ({
      besoin: b.id,
      couverture: couverturesParBesoin[b.id] ?? null,
    }));
    const disponibles = resultatsBesoins.filter(
      (r): r is { besoin: number; couverture: number } => r.couverture !== null
    );
    const couvertureStrate =
      disponibles.length > 0
        ? disponibles.reduce((s, r) => s + r.couverture, 0) / disponibles.length
        : null;

    return { strate, couverture: couvertureStrate, besoins: resultatsBesoins };
  });
}

/**
 * Agrège des couvertures par besoin en résultat "Mon équilibre" complet :
 * strates pondérées (60/20/20, renormalisées si une strate est
 * indisponible) puis plafonnement anti-moyenne par fondations critiques.
 * Fonction pure — c'est le mécanisme le plus sensible du blueprint, à tester
 * indépendamment de tout questionnaire réel (cf. score.check.ts).
 */
export function agregerEquilibre(couverturesParBesoin: CouverturesParBesoin): ResultatEquilibre {
  const strates = agregerBesoinsEnStrates(couverturesParBesoin);
  const stratesDisponibles = strates.filter(
    (s): s is { strate: StrateCode; couverture: number; besoins: ResultatStrate['besoins'] } =>
      s.couverture !== null
  );
  const poidsTotalDisponible = stratesDisponibles.reduce(
    (s, r) => s + POIDS_STRATE[r.strate],
    0
  );

  const scoreGlobalAvantPlafond =
    poidsTotalDisponible > 0
      ? Math.round(
          (stratesDisponibles.reduce((s, r) => s + r.couverture * POIDS_STRATE[r.strate], 0) /
            poidsTotalDisponible) *
            100
        )
      : null;

  const fondationsCritiquesDeclenchees: FondationCritiqueDeclenchee[] = BESOINS_FONDATIONS_CRITIQUES.map(
    (besoinId): FondationCritiqueDeclenchee | null => {
      const couverture = couverturesParBesoin[besoinId] ?? null;
      return couverture !== null && couverture < SEUIL_EFFONDREMENT ? { besoin: besoinId, couverture } : null;
    }
  ).filter((f): f is FondationCritiqueDeclenchee => f !== null);

  const plafondApplique =
    fondationsCritiquesDeclenchees.length > 0 &&
    scoreGlobalAvantPlafond !== null &&
    scoreGlobalAvantPlafond > PLAFOND_FONDATION_CRITIQUE;

  const scoreGlobal =
    scoreGlobalAvantPlafond === null
      ? null
      : plafondApplique
        ? PLAFOND_FONDATION_CRITIQUE
        : scoreGlobalAvantPlafond;

  return {
    scoreGlobal,
    scoreGlobalAvantPlafond,
    plafondApplique,
    fondationsCritiquesDeclenchees,
    strates,
    versionScore: VERSION_SCORE_EQUILIBRE,
  };
}

/** Point d'entrée pratique : réponses aux questionnaires → résultat complet. */
export function calculerEquilibre(reponses: ReponsesParQuestionnaire): ResultatEquilibre {
  return agregerEquilibre(calculerCouverturesTousLesBesoins(reponses));
}
