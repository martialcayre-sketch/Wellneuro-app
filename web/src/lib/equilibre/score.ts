import { calculateScore } from '../questions';
import { IDS_SUSPENDUS } from '../questionnaires-catalog';
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
function extraireValeurBrute(resultat: Record<string, unknown>, sousScore?: string): number | null {
  if (!resultat || resultat.error) return null;
  if (sousScore) {
    // Deux porteurs possibles. `subScores` est la forme historique. Un moteur
    // qui déclare des `dimensions` ne PEUT PAS émettre de `subScores` — la
    // fiche patient y basculerait ses colonnes Score et Interprétation et
    // remplacerait le total par les sous-scores (garde de certification). Ces
    // moteurs exposent donc leurs sous-scores servis sous `scoresBesoins`.
    //
    // Aucun moteur n'émet les DEUX aujourd'hui (mesuré aux deux positions du
    // drapeau). La certification l'interdit désormais aux instruments qui
    // DÉCLARENT `sousScoresBesoins` — aujourd'hui le seul chemin d'émission de
    // `scoresBesoins` (`questions.ts`, branche `seuils_points`), mais rien ne
    // fige cette unicité : ce lecteur ne s'y fie donc pas.
    //
    // Un seul porteur doit répondre. Deux, c'est ambigu et non résoluble ici :
    // le contrat est `{id, total}`, il ne porte PAS le dénominateur. Deux
    // totaux égaux ne prouvent donc pas deux mesures égales — `total: 4` sur
    // /10 et sur /7 sont deux couvertures différentes, et le `max` de
    // `BESOIN_SOURCES` n'est calibré que sur l'un des deux. Rendre l'un ou
    // l'autre — que ce soit par l'ordre de la boucle ou parce que les totaux
    // coïncident — servirait une couverture FAUSSE. Une absence de mesure se
    // voit (`missing_data`) ; une valeur fausse, non.
    const porteurs = [resultat.subScores, resultat.scoresBesoins];
    const totaux: number[] = [];
    for (const porteur of porteurs) {
      if (!Array.isArray(porteur)) continue;
      const sub = porteur.find((s: { id: string }) => s.id === sousScore);
      if (sub && typeof sub.total === 'number') totaux.push(sub.total);
    }
    return totaux.length === 1 ? totaux[0] : null;
  }
  // GARDE — un recueil PARTIEL ne couvre rien, et surtout pas « bien ».
  //
  // Ici le total N'EST PAS servi à côté d'une bande : il EST la lecture.
  // `calculerCouvertureSource` le divise juste après par `source.max`, qui est
  // celui de la forme COMPLÈTE (`constants.ts`). Or un item non répondu n'est
  // pas compté 0 par les moteurs de somme : il est IGNORÉ. Le total sort donc
  // trop bas, et le ratio est faux.
  //
  // Sur une source `inverser: true`, l'erreur change de signe et devient
  // rassurante : `Q_STR_03` (besoin 9, `max: 55`) tronqué rend un total bas,
  // donc `1 - ratio` HAUT, c'est-à-dire « besoin bien couvert » sur un
  // instrument qu'on n'a presque pas administré. C'est l'inversion exacte que la
  // garde de recueil partiel de `sum`/`bms_average` ferme un étage plus haut —
  // sauf que là-haut le total restait vérifiable à côté de `missing`, et qu'ici
  // il ne l'est pas.
  //
  // `null`, jamais 0 : « non mesuré » est la doctrine du dépôt, et c'est déjà ce
  // que cette fonction rend pour une source absente ou suspendue. Un besoin dont
  // TOUTES les sources sont partielles ressort donc non mesuré, pas nul — un 0
  // le ferait passer sous le seuil d'effondrement et plafonnerait « Mon
  // équilibre » sur une mesure qui n'existe pas.
  //
  // PORTÉE — la branche à sous-score n'est délibérément PAS concernée. Le
  // `missing` de la racine décrit l'instrument ENTIER : l'appliquer à un
  // sous-score rendrait le besoin 3 non mesuré parce qu'un item quelconque des
  // 57 de l'enquête alimentaire est vide, alors que les quatre items qui le
  // fondent sont complets. Les porteurs de sous-scores tiennent déjà leur propre
  // complétude, au bon grain — `scoresBesoins` rend `null` dès qu'un de SES
  // items manque (`questions.ts`, branche `seuils_points`).
  if (typeof resultat.missing === 'number' && resultat.missing > 0) return null;
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
  // Fail-closed : une source suspendue ne doit plus nourrir Mon Équilibre,
  // même si des passations historiques existent encore en base.
  if (IDS_SUSPENDUS.has(source.idQuestionnaire)) return null;
  // `max` nul ou absent : une division par 0 rend `Infinity`, que `clamp01`
  // ramènerait à 1 — le pire rendu possible pour une absence de mesure. Ce cas
  // existe depuis que `BESOIN_SOURCES` porte un `max` DÉRIVÉ : la forme qui ne
  // déclare pas le sous-score en rend 0. Refuser avant de diviser.
  if (!(source.max > 0)) return null;
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

  // Deux étages. Dans un groupe : moyenne pondérée des sources disponibles.
  // Entre groupes : moyenne SIMPLE — chaque groupe pèse sa part quel que soit
  // le nombre de sources qui l'alimentent, ce qui est tout l'intérêt du
  // regroupement (cf. `SourceQuestionnaire.groupe`). Sans `groupe`, chaque
  // source est seule dans le sien et l'on retrouve la moyenne simple d'origine.
  const groupes = new Map<string, { poids: number; valeur: number }[]>();
  sources.forEach((source, index) => {
    const valeur = calculerCouvertureSource(source, reponses);
    if (valeur === null) return;
    const cle = source.groupe ?? `__source_${index}`;
    const lot = groupes.get(cle);
    const entree = { poids: source.poids ?? 1, valeur };
    if (lot) lot.push(entree);
    else groupes.set(cle, [entree]);
  });

  const valeursGroupes: number[] = [];
  for (const [, entrees] of groupes) {
    const sommePoids = entrees.reduce((s, e) => s + e.poids, 0);
    if (sommePoids <= 0) continue;
    valeursGroupes.push(entrees.reduce((s, e) => s + e.poids * e.valeur, 0) / sommePoids);
  }

  if (valeursGroupes.length === 0) return null;
  return valeursGroupes.reduce((s, v) => s + v, 0) / valeursGroupes.length;
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
