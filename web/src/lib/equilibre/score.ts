import { calculateScore } from '../questions';
import { IDS_SUSPENDUS } from '../questionnaires-catalog';
import { BESOINS, BESOIN_SOURCES, VERSION_SCORE_EQUILIBRE } from './constants';
import type {
  CouverturesParBesoin,
  ReponsesParQuestionnaire,
  ResultatEquilibre,
  ResultatStrate,
  SourceQuestionnaire,
  StrateCode,
} from './types';
import type { MotifNonMesure } from '../praticien/motifNonMesure';

/**
 * Ce qu'une source rend : sa couverture, ou l'étage qui l'a écartée (r3_08,
 * Q4). Les deux sortent du MÊME chemin — `calculerCouvertureSource` n'en est
 * que la projection —, pour qu'un motif ne puisse pas diverger de la valeur.
 */
export type EvaluationSource = { couverture: number } | { motif: MotifNonMesure };

type LectureBrute = { valeur: number } | { motif: MotifNonMesure };

export function clamp01(valeur: number): number {
  return Math.min(1, Math.max(0, valeur));
}

/**
 * Un sous-score porte-t-il sur tous les items de son axe ? `missing` d'abord
 * (`had`), puis `repondus` contre `items` (`subscore`, où `items` exclut les
 * questions conditionnelles non posées ; `scoresBesoins`, où `items` est le
 * nombre d'items déclarés — aucun n'y est conditionnel aujourd'hui). Sans compte
 * lisible : non, jamais présumé complet ([[D-329]] §1).
 */
function sousScoreComplet(sub: Record<string, unknown>): boolean {
  if (typeof sub.missing === 'number') return sub.missing === 0;
  if (typeof sub.items === 'number' && typeof sub.repondus === 'number') {
    return sub.items > 0 && sub.repondus === sub.items;
  }
  return false;
}

// resultat = retour hétérogène de calculateScore (30 formats de scoring
// différents dans questions.ts) — on ne lit que .total ou .subScores[].total,
// communs à tous les formats utilisés par BESOIN_SOURCES.
function extraireValeurBrute(
  resultat: Record<string, unknown>,
  sousScore?: string,
  sansSousScore?: string,
): LectureBrute {
  if (!resultat || resultat.error) return { motif: 'calcul_en_erreur' };
  // MESURE DÉRIVÉE — le total de l'instrument moins le total d'un sous-score
  // servi ([[D-516]] §2.1 : l'enquête alimentaire sans les items du rythme, qui
  // restent au besoin 3). Les deux lectures passent par les chemins ci-dessous,
  // avec LEURS gardes : le total refuse un recueil partiel (`missing`), le
  // sous-score refuse un axe incomplet ou ambigu. L'une ou l'autre refusée, la
  // mesure dérivée l'est : jamais une différence calculée sur une moitié de
  // recueil (`null`, pas 0, `DC-24`). Aucune autre arithmétique : la mesure est
  // la somme des points des items qui ne sont pas ceux du rythme.
  if (sansSousScore) {
    const total = extraireValeurBrute(resultat);
    if ('motif' in total) return total;
    const ecarte = extraireValeurBrute(resultat, sansSousScore);
    if ('motif' in ecarte) return ecarte;
    return { valeur: total.valeur - ecarte.valeur };
  }
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
    // Recueil INCOMPLET de l'instrument entier, quand le moteur le refuse
    // lui-même (`scored: false` ET des items manquants) : le sous-score servi
    // tombe avec le total ([[D-517]], D-403 §6 — l'enquête SiiN incomplète ne
    // nourrit plus le besoin 3). Le motif est celui du total, et non
    // « sous-score absent », qui se lirait comme un défaut du résultat. Bornée
    // au moteur `seuils_points`, le seul que vise D-517 : un autre moteur qui
    // rendrait `scored: false` avec des manquants garde sa lecture de
    // sous-score (revue PR-Agent de #2096).
    if (resultat.type === 'seuils_points' && resultat.scored === false
      && typeof resultat.missing === 'number' && resultat.missing > 0) {
      return { motif: 'recueil_incomplet' };
    }
    const porteurs = [resultat.subScores, resultat.scoresBesoins];
    const candidats: Record<string, unknown>[] = [];
    for (const porteur of porteurs) {
      if (!Array.isArray(porteur)) continue;
      const sub = porteur.find((s: { id: string }) => s.id === sousScore);
      if (sub && typeof sub.total === 'number') candidats.push(sub);
    }
    if (candidats.length !== 1) return { motif: 'sous_score_absent_ou_double' };
    // GARDE — un sous-score PARTIEL ne couvre rien ([[D-329]] §1).
    //
    // Même défaut que celui que la garde du total ferme plus bas, un étage plus
    // fin. Les moteurs `subscore` et `had` rendent le total d'un axe dès qu'UN
    // de ses items est répondu (frontière « au moins un item », posée le
    // 2026-07-29 pour la fiche patient), et `BESOIN_SOURCES` le divise par le
    // `max` de l'axe COMPLET. Mesuré à l'audit de D-312 (section 10) : une
    // réponse sur dix d'un axe du DNST rendait 0,9 de couverture, une sur cinq
    // du bloc activité de `Q_MOD_01` effondrait le besoin 5 et plafonnait le
    // total à 50. Seul le porteur du besoin 3 (`scoresBesoins`) exigeait déjà
    // tous ses items.
    //
    // La complétude se lit sur les comptes que les quatre porteurs publient :
    // `missing` par axe (`had`), `repondus` et `items` (`subscore`,
    // `scoresBesoins`). Un sous-score sans compte lisible n'est pas une mesure :
    // la couverture ne se rend que si l'on sait qu'elle porte sur l'axe entier.
    // La fiche patient garde sa frontière ; seul « Mon équilibre » durcit la
    // sienne, parce qu'ici le total EST la lecture, sans compte à côté.
    return sousScoreComplet(candidats[0])
      ? { valeur: candidats[0].total as number }
      : { motif: 'recueil_incomplet' };
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
  // tirerait la moyenne directe du total sur une mesure qui n'existe pas (avant
  // v18/v19, il aurait aussi déclenché le plafonnement, retiré par [[D-547]]).
  //
  // PORTÉE — la branche à sous-score n'est délibérément PAS concernée. Le
  // `missing` de la racine décrit l'instrument ENTIER : l'appliquer à un
  // sous-score rendrait le besoin 3 non mesuré parce qu'un item quelconque des
  // 57 de l'enquête alimentaire est vide, alors que les quatre items qui le
  // fondent sont complets. La complétude d'un sous-score se juge donc au grain
  // de l'axe, dans la branche du haut (`sousScoreComplet`, [[D-329]] §1) — et
  // non plus seulement chez `scoresBesoins`, le seul porteur qui l'exigeait
  // jusque-là. Seule exception, en tête de cette branche : un moteur qui
  // REFUSE lui-même le recueil incomplet (`scored: false`, [[D-517]]).
  if (typeof resultat.missing === 'number' && resultat.missing > 0) return { motif: 'recueil_incomplet' };
  return typeof resultat.total === 'number' ? { valeur: resultat.total } : { motif: 'calcul_en_erreur' };
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
  const evaluation = evaluerCouvertureSource(source, reponses);
  return 'couverture' in evaluation ? evaluation.couverture : null;
}

/**
 * La couverture d'une source, ou l'étage qui rend « non mesuré » (r3_08) —
 * chaque `null` de `calculerCouvertureSource` y porte son motif. Aucune valeur
 * n'est calculée autrement qu'avant : seul le pourquoi du `null` est nommé.
 */
export function evaluerCouvertureSource(
  source: SourceQuestionnaire,
  reponses: ReponsesParQuestionnaire
): EvaluationSource {
  // Fail-closed : une source suspendue ne doit plus nourrir Mon Équilibre,
  // même si des passations historiques existent encore en base.
  if (IDS_SUSPENDUS.has(source.idQuestionnaire)) return { motif: 'source_suspendue' };
  // `max` nul ou absent : une division par 0 rend `Infinity`, que `clamp01`
  // ramènerait à 1 — le pire rendu possible pour une absence de mesure. Ce cas
  // existe depuis que `BESOIN_SOURCES` porte un `max` DÉRIVÉ : la forme qui ne
  // déclare pas le sous-score en rend 0. Refuser avant de diviser.
  if (!(source.max > 0)) return { motif: 'forme_sans_sous_score' };
  // Borne basse ([[D-438]] §1, [[D-474]]) : une étendue nulle ou négative
  // diviserait par 0 ; même refus que pour `max`, avant toute division.
  const min = source.min ?? 0;
  if (!(source.max > min)) return { motif: 'forme_sans_sous_score' };
  const answers = reponses[source.idQuestionnaire];
  if (!answers) return { motif: 'aucune_passation' };
  const resultat = calculateScore(source.idQuestionnaire, answers);
  const lecture = extraireValeurBrute(resultat, source.sousScore, source.sansSousScore);
  if ('motif' in lecture) return lecture;
  const ratio = (lecture.valeur - min) / (source.max - min);
  return { couverture: clamp01(source.inverser ? 1 - ratio : ratio) };
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
 *
 * ── LES STRATES NE PORTENT PLUS LE TOTAL ───────────────────────────────────
 * Depuis v18/v19 ([[D-547]], [[D-548]]), le total n'est plus pondéré par strate :
 * il est la moyenne directe des besoins mesurés (`agregerEquilibre`). Les strates
 * restent des REGROUPEMENTS pour la lecture (le radar, [[D-550]]) ; leur
 * couverture est la moyenne simple de leurs besoins mesurés, rien de plus.
 *
 * L'ÉGALITÉ ENTRE BESOINS est une CONVENTION DE MODÈLE déclarée ([[D-547]] §2,
 * `DC-21` : un poids égal entre axes est déjà une décision de modèle) : aucune
 * règle du cabinet, aucune source ne fonde une hiérarchie entre les douze
 * besoins. [[D-106]] décision 4 la motivait par le plafonnement, qui disparaît ;
 * ce motif est amendé.
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
 * Agrège des couvertures par besoin en résultat « Mon équilibre » : le total est
 * la MOYENNE DIRECTE, à parts égales, des couvertures des besoins MESURÉS
 * ([[D-547]], [[D-548]] §2.1). Un besoin non mesuré n'entre pas, et n'est jamais
 * un zéro (`DC-24`) ; aucun minimum de besoins mesurés ([[D-548]] §2.8, M3 A) —
 * le compte (« n besoins mesurés sur 12 », `compterBesoinsMesures`) dit sur quoi
 * le total est établi. Plus de pondération entre strates, plus de plafonnement.
 * Fonction pure, testable avec des couvertures synthétiques.
 */
export function agregerEquilibre(couverturesParBesoin: CouverturesParBesoin): ResultatEquilibre {
  const strates = agregerBesoinsEnStrates(couverturesParBesoin);
  const mesurees = BESOINS
    .map(besoin => couverturesParBesoin[besoin.id] ?? null)
    .filter((couverture): couverture is number => couverture !== null);

  const scoreGlobal =
    mesurees.length > 0
      ? Math.round((mesurees.reduce((somme, couverture) => somme + couverture, 0) / mesurees.length) * 100)
      : null;

  return { scoreGlobal, strates, versionScore: VERSION_SCORE_EQUILIBRE };
}

/**
 * Nombre de besoins qui ont réellement nourri le total ([[D-329]] §3) : ceux dont
 * la couverture n'est pas `null`. Lu dans les strates du résultat, donc dans ce
 * que `agregerEquilibre` a effectivement moyenné, jamais recalculé à côté.
 */
export function compterBesoinsMesures(resultat: ResultatEquilibre): number {
  return resultat.strates.flatMap(s => s.besoins).filter(b => b.couverture !== null).length;
}

/** Point d'entrée pratique : réponses aux questionnaires → résultat complet. */
export function calculerEquilibre(reponses: ReponsesParQuestionnaire): ResultatEquilibre {
  return agregerEquilibre(calculerCouverturesTousLesBesoins(reponses));
}
