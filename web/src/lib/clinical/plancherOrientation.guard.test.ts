// Banc du PLANCHER AGI PAR L'ORIENTATION — 2026-08-05.
//
// CE QU'IL TIENT. `D-021` a posé le plancher garanti : sur un recueil partiel
// d'un instrument à sévérité croissante, la bande déjà acquise est servie à
// part (`bandePlancher`, `garanti: true`), pendant qu'`interpretation` reste
// `null`. Sa réserve disait « le vrai positif est raconté, pas agi ». Ce lot le
// fait agir, et ce banc dit à quelle condition exactement.
//
// LA RÉFÉRENCE À SUIVRE EST `D-024`, pas `D-021`. Le registre est append-only :
// la réserve de `D-021` se lit encore mot pour mot (« R-GAS-01 n'est PAS
// rallumée »), et un relecteur qui s'arrête là conclut l'inverse de ce que fait
// ce banc. C'est `D-024` qui la lève.
//
// LE PRÉDICAT, qui est tout le lot. Un plancher `P` garantit une zone `Z` si et
// seulement si TOUTES les bandes que le score final peut encore atteindre sont
// dans `Z` :
//
//     garantie(Z, P) ⟺ ∀ r ∈ ranges, r.min ≥ P.min ⇒ r ∈ Z
//
// C'est la formulation exacte de « au moins aussi sévère ». Elle interdit
// d'elle-même le cas redouté — une zone visant `['warning']` seul quand
// `danger` est au-dessus échoue l'inclusion — sans qu'aucune règle « ne pas
// viser vers le bas » soit écrite nulle part.
//
// CHAQUE GARDE EST DÉFINIE PAR L'ÉTAT QU'ELLE VISITE, leçon du lot précédent :
// une garde qui ne visite jamais l'état où le défaut existe est verte pour une
// mauvaise raison. Un plancher pris sur une passation SATURÉE atterrit sur la
// bande de tête, où la fermeture est un SINGLETON et l'inclusion trivialement
// vraie pour toute règle nommant cette couleur. Les cas ci-dessous visent donc
// des planchers INTERMÉDIAIRES, avec de la marge au-dessus.
//
// CONTRE-ÉPREUVES PAR MUTATION — exécutées le 2026-08-05, puis annulées :
//  · M1 — remplacer la fermeture par `zone.couleurs.includes(plancher.color)`
//    dans `zoneGarantieParLePlancher` : le cas « `['warning']` seule » rougit
//    (la règle s'allume alors qu'elle ne doit pas).
//  · M2 — forcer `couleursPossibles = [plancher.color]` dans `bandePlancher`
//    (`questions.ts`), c'est-à-dire oublier les bandes au-dessus : le même cas
//    rougit, l'inclusion devenant vraie de tout singleton.
//  · M3 — retirer la garde de fermeture INCOMPLÈTE dans `bandePlancher`
//    (revenir à un `filter` sur les chaînes au lieu d'un refus de servir la
//    liste) : le cas 8, et lui seul, rougit — la fermeture amputée en
//    `['warning']` allume alors une règle qui vise `['warning']`.
// Les trois mutations font rougir ce banc par deux chemins différents — le
// consommateur (M1) et le producteur (M2, M3). Si l'une d'elles cessait de le
// faire, ce banc ne prouverait plus la fermeture.
import { describe, expect, it } from 'vitest';
import { QUESTIONNAIRE_CATALOGUE, calculateScore, computeScoreFromDef } from '@/lib/questions';
import { evaluerOrientation, type ReponseOrientation } from './orientationEngine';
import { ORIENTATION_RULES_V1, type OrientationRule, type OrientationZone } from './orientationRulesV1';

const CLAIM = { claimId: 'WN-CL-0001-001', versionClaim: 'v1' };

/**
 * Règle `zone` minimale sur un instrument, pour éprouver un prédicat et rien
 * d'autre. `sousScore` est optionnel et porte le SECOND chemin de plancher —
 * celui des axes, servi par `extraireCible` un étage plus bas que le global.
 */
function regleZone(
  idQuestionnaire: string,
  zone: OrientationZone,
  id = 'R-TEST-PLANCHER',
  sousScore?: string,
): OrientationRule {
  return {
    id,
    statut: 'publiee',
    declencheurs: [{ type: 'zone', idQuestionnaire, ...(sousScore ? { sousScore } : {}), zone }],
    suggestions: [{ questionnaireId: 'Q_GAS_03', priorite: 1, objectif: 'Cible de test.' }],
    justificationClaims: [CLAIM],
    niveau: 'socle',
  };
}

function reponse(idQuestionnaire: string, reponses: Record<string, number>): ReponseOrientation {
  return {
    idQuestionnaire,
    dateReponse: '2026-08-05T10:00:00.000Z',
    scores: calculateScore(idQuestionnaire, reponses) as Record<string, unknown>,
  };
}

function orienter(reponses: ReponseOrientation[], regles: OrientationRule[]) {
  return evaluerOrientation({ reponses, idsQuestionnairesAssignes: [], regles });
}

/** Les 31 items du TFD, lus du catalogue et jamais réécrits ici. */
function itemsTfd(): string[] {
  const def = (QUESTIONNAIRE_CATALOGUE as any).Q_GAS_01;
  return def.scoring.subScores.flatMap((s: any) => s.items);
}

/**
 * Huit réponses à la pire valeur, réparties sur les cinq axes : total 24, soit
 * la bande B du TFD — ni la plus basse (A, 0-23) ni la plus haute (C, 50-93).
 *
 * La répartition n'est pas un confort : `totalGlobalDepuisSousScores` rend
 * `null` dès qu'un axe est ENTIÈREMENT vide, et un plancher se lit sur un
 * nombre.
 */
const TFD_PARTIEL_EN_B: Record<string, number> = {
  C1_1: 3, C1_2: 3, C1_3: 3, C1_4: 3,
  C2_1: 3, C3_1: 3, C4_1: 3, C5_1: 3,
};

/** Cinq réponses à 1, une par axe : total 5, bande A — la plus basse. */
const TFD_PARTIEL_EN_A: Record<string, number> = { C1_1: 1, C2_1: 1, C3_1: 1, C4_1: 1, C5_1: 1 };

describe('le plancher allume l\'orientation — et seulement quand la zone le contient', () => {
  it('1. plancher INTERMÉDIAIRE, avec marge au-dessus : la règle s\'allume, en « au moins »', () => {
    // L'état que ce lot existe pour servir. Bande B acquise, C encore
    // atteignable : la fermeture est `{warning, danger}`, et la zone la couvre.
    const scores: any = calculateScore('Q_GAS_01', TFD_PARTIEL_EN_B);
    expect(scores.total).toBe(24);
    expect(scores.interpretation).toBeNull();
    expect(scores.bandePlancher.color).toBe('warning');
    // La marge, assérée et non supposée : sans elle, l'inclusion serait un
    // singleton comparé à lui-même et ce cas ne prouverait rien.
    expect(scores.bandePlancher.couleursPossibles).toEqual(['warning', 'danger']);

    const recos = orienter(
      [reponse('Q_GAS_01', TFD_PARTIEL_EN_B)],
      [regleZone('Q_GAS_01', { type: 'couleur', couleurs: ['warning', 'danger', 'dark'] })],
    );
    expect(recos).toHaveLength(1);
    // La chaîne EXACTE, épinglée : c'est elle que le praticien lit
    // (`OrientationPanel` rend `motif.conditions.join(' ; ')`). Elle dit les
    // deux choses qu'un plancher est — un minimum garanti, et un minimum tiré
    // d'une passation à trous, avec l'ampleur du trou.
    expect(recos[0].motifs[0].conditions[0]).toBe(
      'Q_GAS_01 : au moins zone warning (« B — Troubles fonctionnels modérés à importants ») — recueil partiel, 23 items sans réponse sur 31',
    );
  });

  it('1 bis. CONTRE-ÉPREUVE DE FERMETURE — la même mesure, une zone qui s\'arrête à `warning` : éteint', () => {
    // LE SEUL CAS QUI PROUVE LE PRÉDICAT. Sans lui, une implémentation naïve
    // `zone.couleurs.includes(plancher.color)` serait verte partout ailleurs.
    // Le score final peut encore monter en `danger`, donc SORTIR de la zone :
    // rien n'est garanti, et la règle doit rester éteinte.
    const recos = orienter(
      [reponse('Q_GAS_01', TFD_PARTIEL_EN_B)],
      [regleZone('Q_GAS_01', { type: 'couleur', couleurs: ['warning'] })],
    );
    expect(recos).toEqual([]);
  });

  it('2. plancher à la bande la PLUS BASSE : aucun champ servi, donc aucun allumage', () => {
    // « Au moins la bande la plus basse » est une information vide — `D-014` le
    // protège et ce lot ne le change pas. Le champ est ABSENT, pas `null`.
    const scores: any = calculateScore('Q_GAS_01', TFD_PARTIEL_EN_A);
    expect(scores.total).toBe(5);
    expect(scores.bandePlancher ?? null).toBeNull();

    const recos = orienter(
      [reponse('Q_GAS_01', TFD_PARTIEL_EN_A)],
      // Zone volontairement LARGE : si un plancher sortait ici, elle le verrait.
      [regleZone('Q_GAS_01', { type: 'couleur', couleurs: ['info', 'warning', 'danger', 'dark'] })],
    );
    expect(recos).toEqual([]);
  });

  it('3. passation COMPLÈTE : chemin ordinaire, et le code neuf n\'intervient pas', () => {
    // L'état où rien ne doit changer. La mesure existe, donc aucun plancher
    // n'est servi et le motif est celui de la bande — sans « au moins », qui
    // affaiblirait un verdict complet.
    const complet = Object.fromEntries(itemsTfd().map(id => [id, 3]));
    const scores: any = calculateScore('Q_GAS_01', complet);
    expect(scores.missing).toBe(0);
    expect(scores.interpretation.color).toBe('danger');
    expect(scores.bandePlancher ?? null).toBeNull();

    const recos = orienter(
      [reponse('Q_GAS_01', complet)],
      [regleZone('Q_GAS_01', { type: 'couleur', couleurs: ['warning', 'danger', 'dark'] })],
    );
    expect(recos).toHaveLength(1);
    const condition = recos[0].motifs[0].conditions[0];
    expect(condition).toContain('zone danger');
    expect(condition).not.toContain('au moins');
    // Ni « au moins » ni mention de recueil : sur une mesure complète, les deux
    // affaibliraient un verdict qui n'a rien d'incertain.
    expect(condition).not.toContain('recueil partiel');
  });

  it('4. `Q_ALI_01` partiel — non éligible : aucun plancher, et `R2-ALI-01` reste éteinte', () => {
    // L'éligibilité est une DÉCLARATION de l'instrument — grille INVERSÉE dans
    // les deux formes de `Q_ALI_01`, où un plancher de score serait un plafond de
    // sévérité. C'est la garde principale, en amont de tout ce que ce lot ajoute.
    //
    // CE QUE CE CAS VISITE DÉPEND DU DRAPEAU `WN_ALI_01_SIIN57`, et il faut le
    // dire plutôt que de décrire l'état de production comme s'il était celui du
    // CI. Une rédaction antérieure annonçait « moteur `seuils_points` » : c'est
    // l'état PRODUCTION, pas celui que le CI parcourt.
    //   · drapeau ÉTEINT (l'état du CI) — `Q_ALI_01` est la forme courte, moteur
    //     `sum`, 14 items : la passation partielle ci-dessous rend `total: 0` et
    //     `missing: 10`. L'extinction vient de l'INÉLIGIBILITÉ (grille
    //     décroissante, aucun plancher servi) doublée du retrait de bande que
    //     `sum` opère déjà sur recueil partiel.
    //   · drapeau ALLUMÉ (l'état de production) — c'est l'Enquête SIIN 57,
    //     moteur `seuils_points`, `missing: 38`, et ce moteur sert son
    //     `interpretation` SANS condition de complétude. L'extinction vient
    //     alors de `recueilIncomplet` dans `extraireCible`, qui annule la mesure
    //     avant toute lecture de bande — et l'inéligibilité tient toujours.
    // Les assertions ci-dessous sont vraies dans les deux états, et chacune est
    // gardée par un mécanisme différent selon l'état : c'est voulu, et c'est
    // pourquoi ce cas ne fixe pas le drapeau.
    const def: any = (QUESTIONNAIRE_CATALOGUE as any).Q_ALI_01;
    expect(def.scoring.severiteCroissante).not.toBe(true);

    const questions = (def.sections || []).flatMap((s: any) => s.questions || []);
    const partiel: Record<string, number> = {};
    for (const q of questions.slice(0, Math.max(1, Math.floor(questions.length / 3)))) {
      const valeurs = (q.options || []).map((o: any) => Number(o.v)).filter(Number.isFinite);
      if (valeurs.length) partiel[q.id] = Math.min(...valeurs);
    }
    const scores: any = calculateScore('Q_ALI_01', partiel);
    expect(scores.missing).toBeGreaterThan(0);
    expect(scores.bandePlancher ?? null).toBeNull();
    for (const s of scores.subScores || []) expect(s.bandePlancher ?? null).toBeNull();

    // La VRAIE règle publiée, pas une imitation : c'est elle qu'un plancher mal
    // gardé ferait mordre sur un recueil partiel.
    const r2Ali01 = ORIENTATION_RULES_V1.find(r => r.id === 'R2-ALI-01');
    expect(r2Ali01, 'R2-ALI-01 a disparu de la table : ce cas ne garde plus rien').toBeDefined();
    expect(orienter([reponse('Q_ALI_01', partiel)], [r2Ali01!])).toEqual([]);
  });

  it('5. `Q_MOD_01` — deux verrous indépendants, et aucun ne dépend de l\'autre', () => {
    // L'instrument à échelle INVERSÉE dont sept déclencheurs comparent en `<=`.
    // Trois items, un par axe, chacun à sa MEILLEURE option : les totaux servis
    // (4, 4, 8) sont les zones les plus dégradées de la grille.
    const meilleuresReponses = { SOMMEIL_Q001: 4, RYTHME_BIOLOGIQUE_Q001: 4, ADAPTATION_STRESS_Q001: 8 };
    const scores: any = calculateScore('Q_MOD_01', meilleuresReponses);

    // VERROU 1 — la mesure est refusée : `valeur` reste `null`, donc aucune
    // comparaison ne peut s'allumer. Le déclencheur ci-dessous mord sur
    // n'importe quel nombre : s'il sortait une valeur, il s'allumerait.
    const comparaisonTresLarge: OrientationRule = {
      id: 'R-TEST-MOD',
      statut: 'publiee',
      declencheurs: [{ type: 'comparaison', idQuestionnaire: 'Q_MOD_01', sousScore: 'SOMMEIL', operateur: '<=', valeur: 100000 }],
      suggestions: [{ questionnaireId: 'Q_SOM_01', priorite: 1, objectif: 'Cible de test.' }],
      justificationClaims: [CLAIM],
      niveau: 'socle',
    };
    expect(orienter([reponse('Q_MOD_01', meilleuresReponses)], [comparaisonTresLarge])).toEqual([]);

    // VERROU 2 — l'instrument n'est PAS éligible, donc ne porte JAMAIS de
    // plancher : même si un chemin de comparaison venait un jour à en lire un,
    // il n'y en aurait pas. Les deux verrous sont assérés séparément parce que
    // chacun doit tenir seul.
    expect((QUESTIONNAIRE_CATALOGUE as any).Q_MOD_01.scoring.severiteCroissante).not.toBe(true);
    expect(scores.bandePlancher ?? null).toBeNull();
    for (const s of scores.subScores || []) expect(s.bandePlancher ?? null).toBeNull();
  });

  // ── Le second chemin : le plancher d'un AXE ───────────────────────────────
  //
  // `extraireCible` lit un plancher DEUX FOIS — sur le score global et sur
  // l'axe visé par `sousScore`. Le second chemin est vivant (`tfd` sert un
  // plancher par axe) et aucun cas ci-dessus ne le visitait : `regleZone` ne
  // posait jamais de `sousScore`. Code neuf, atteignable, couverture nulle —
  // relevé en revue adversariale le 2026-08-05.

  it('5 bis. plancher d\'AXE : la règle s\'allume sur le sous-score, en « au moins »', () => {
    // `C1` : quatre items à 3 font 12, soit sa bande B (8-13), et sa fermeture
    // vaut `{warning, danger}` — la bande C de l'axe reste atteignable.
    const scores: any = calculateScore('Q_GAS_01', TFD_PARTIEL_EN_B);
    const c1 = scores.subScores.find((s: any) => s.id === 'C1');
    expect(c1.total).toBe(12);
    expect(c1.interpretation).toBeNull();
    expect(c1.bandePlancher.couleursPossibles).toEqual(['warning', 'danger']);

    const recos = orienter(
      [reponse('Q_GAS_01', TFD_PARTIEL_EN_B)],
      [regleZone('Q_GAS_01', { type: 'couleur', couleurs: ['warning', 'danger', 'dark'] }, 'R-TEST-AXE', 'C1')],
    );
    expect(recos).toHaveLength(1);
    // Le préfixe nomme l'axe : sans lui, le praticien lirait un verdict
    // d'instrument là où il n'y a qu'un verdict de sous-score. Et le compte
    // d'items manquants est celui de L'AXE (4 sur 8), pas celui de
    // l'instrument (23 sur 31) — deux comptes voisins, et servir le mauvais
    // dirait au praticien que l'axe est bien plus troué qu'il ne l'est.
    expect(recos[0].motifs[0].conditions[0]).toBe(
      'Q_GAS_01 (C1) : au moins zone warning (« B — Troubles fonctionnels modérés à importants ») — recueil partiel, 4 items sans réponse sur 8',
    );
  });

  it('5 ter. plancher d\'AXE, zone qui s\'arrête à `warning` : éteint', () => {
    // La fermeture s'applique au grain de l'axe exactement comme au grain de
    // l'instrument. Sans ce cas, le second chemin serait couvert par un seul
    // allumage — c'est-à-dire par rien.
    const recos = orienter(
      [reponse('Q_GAS_01', TFD_PARTIEL_EN_B)],
      [regleZone('Q_GAS_01', { type: 'couleur', couleurs: ['warning'] }, 'R-TEST-AXE-ETROITE', 'C1')],
    );
    expect(recos).toEqual([]);
  });

  it('5 quater. plancher d\'AXE, zone `plage` : éteint', () => {
    // Le cas 6 ne couvre que le niveau global. La plage contient pourtant le
    // total de l'axe (12) : un plancher borne par le bas, une plage exige aussi
    // une borne haute que les items sans réponse peuvent franchir.
    const recos = orienter(
      [reponse('Q_GAS_01', TFD_PARTIEL_EN_B)],
      [regleZone('Q_GAS_01', { type: 'plage', min: 8, max: 13 }, 'R-TEST-AXE-PLAGE', 'C1')],
    );
    expect(recos).toEqual([]);
  });

  it('6. zone `plage` sur un instrument PORTEUR d\'un plancher : éteint', () => {
    // Un plancher borne par le BAS. Une plage exige aussi une borne HAUTE, que
    // les items sans réponse peuvent franchir — ils ne peuvent qu'ajouter. La
    // plage ci-dessous contient pourtant le total partiel (24) : c'est
    // exactement le piège, et il doit rester fermé.
    const recos = orienter(
      [reponse('Q_GAS_01', TFD_PARTIEL_EN_B)],
      [regleZone('Q_GAS_01', { type: 'plage', min: 24, max: 49 })],
    );
    expect(recos).toEqual([]);
  });

  // ── La fermeture incomplète ───────────────────────────────────────────────
  //
  // L'ÉTAT QUE RIEN NE VISITE AUJOURD'HUI, et c'est précisément pour ça qu'il
  // est ici. Aucune grille éligible du catalogue ne porte de bande sans
  // `color` : le défaut est LATENT, et un banc qui ne balaie que le catalogue
  // resterait vert en le laissant passer. La grille est donc synthétique, et
  // scorée par `computeScoreFromDef` — le point d'entrée que le dépôt expose
  // déjà pour les définitions hors catalogue, sans qu'aucun catalogue soit
  // muté.
  //
  // Le défaut visé : amputer la fermeture des bandes sans couleur rend
  // l'inclusion PLUS FACILE, pas plus dure. C'est l'inverse d'un fail-closed.

  /** Grille à trois bandes dont la plus sévère n'a pas de couleur. */
  function instrumentSynthetique(troisiemeBande: Record<string, unknown>) {
    return {
      id: 'Q_TEST_FERMETURE',
      sections: [{
        questions: [
          { id: 'T1', options: [{ v: 0 }, { v: 10 }] },
          { id: 'T2', options: [{ v: 0 }, { v: 10 }] },
        ],
      }],
      scoring: {
        type: 'sum',
        maxTotal: 20,
        severiteCroissante: true,
        interpretation: [
          { min: 0, max: 9, label: 'A', color: 'success' },
          { min: 10, max: 19, label: 'B', color: 'warning' },
          troisiemeBande,
        ],
      },
    };
  }

  function reponseSynthetique(def: any): ReponseOrientation {
    return {
      idQuestionnaire: def.id,
      dateReponse: '2026-08-05T10:00:00.000Z',
      // Un item sur deux : total 10, bande B — ni la plus basse, ni la dernière.
      scores: computeScoreFromDef(def, { T1: 10 }) as Record<string, unknown>,
    };
  }

  it('8. une bande atteignable SANS couleur retire la fermeture entière, et éteint la règle', () => {
    const def = instrumentSynthetique({ min: 20, max: 30, label: 'C' });
    const scores: any = computeScoreFromDef(def, { T1: 10 });
    expect(scores.total).toBe(10);
    expect(scores.missing).toBe(1);
    expect(scores.bandePlancher.label).toBe('B');

    // La fermeture des COULEURS n'est pas servie du tout — et surtout pas
    // amputée en `['warning']`, qui aurait fait passer une garde pour un
    // passe-droit.
    expect(scores.bandePlancher).not.toHaveProperty('couleursPossibles');
    // Les deux listes sont jugées INDÉPENDAMMENT : les libellés sont complets,
    // donc servis.
    expect(scores.bandePlancher.labelsPossibles).toEqual(['B', 'C']);

    // Le prédicat n'a plus rien à inclure : la règle reste éteinte, alors qu'une
    // fermeture amputée l'aurait allumée.
    expect(orienter(
      [reponseSynthetique(def)],
      [regleZone(def.id, { type: 'couleur', couleurs: ['warning', 'danger', 'dark'] })],
    )).toEqual([]);

    // Et la voie des libellés, elle, reste ouverte — sans quoi le correctif
    // fermerait plus que le trou qu'il vise. C'est aussi le seul endroit du banc
    // où la branche `interpretation` du chemin plancher produit une chaîne :
    // elle porte la même mention de recueil partiel que la branche `couleur`,
    // une asymétrie servant au praticien un motif plus ou moins complet selon la
    // forme de la zone.
    const parLesLibelles = orienter(
      [reponseSynthetique(def)],
      [regleZone(def.id, { type: 'interpretation', labels: ['B', 'C'] }, 'R-TEST-LABELS')],
    );
    expect(parLesLibelles).toHaveLength(1);
    expect(parLesLibelles[0].motifs[0].conditions[0]).toBe(
      'Q_TEST_FERMETURE : au moins interprétation « B » — recueil partiel, 1 item sans réponse sur 2',
    );

    // CONTRE-ÉPREUVE SYMÉTRIQUE DE 1 BIS, sur la branche `interpretation` — et
    // c'est le SEUL endroit du dépôt où elle existe. Relevé en seconde passe
    // adversariale : les deux seules zones `interpretation` posées sur un
    // plancher visaient exactement la fermeture, si bien que le prédicat naïf
    // (« le label du plancher est dans la liste ») laissait la suite entièrement
    // verte. Une garde qui ne visite jamais l'état où le défaut existe est verte
    // pour une mauvaise raison — c'est la classe d'erreur du lot précédent.
    //
    // Ici la fermeture vaut `['B','C']` et la zone ne nomme que `B` : le score
    // final peut encore atteindre `C`, donc SORTIR de la zone. Rien n'est
    // garanti, rien ne s'allume.
    expect(orienter(
      [reponseSynthetique(def)],
      [regleZone(def.id, { type: 'interpretation', labels: ['B'] }, 'R-TEST-LABELS-ETROITE')],
    )).toEqual([]);
  });

  it('8 ter. LE SYMÉTRIQUE — une bande atteignable SANS libellé retire la seule fermeture des LIBELLÉS', () => {
    // Le cas 8 ne visite qu'un sens du trou (couleur absente, libellés intacts).
    // Sans celui-ci, la simplification la plus naturelle du correctif — faire
    // tomber les deux listes ENSEMBLE — resterait verte, et le producteur
    // fermerait deux fois plus que le trou ne l'exige.
    const def = instrumentSynthetique({ min: 20, max: 30, color: 'danger' });
    const scores: any = computeScoreFromDef(def, { T1: 10 });
    expect(scores.bandePlancher.label).toBe('B');
    expect(scores.bandePlancher.couleursPossibles).toEqual(['warning', 'danger']);
    expect(scores.bandePlancher).not.toHaveProperty('labelsPossibles');

    // La voie des couleurs reste ouverte…
    expect(orienter(
      [reponseSynthetique(def)],
      [regleZone(def.id, { type: 'couleur', couleurs: ['warning', 'danger', 'dark'] })],
    )).toHaveLength(1);
    // …et celle des libellés est fermée, sur la zone même qui aurait dû
    // l'allumer si la fermeture avait été amputée en `['B']`.
    expect(orienter(
      [reponseSynthetique(def)],
      [regleZone(def.id, { type: 'interpretation', labels: ['B', 'C'] }, 'R-TEST-LABELS')],
    )).toEqual([]);
  });

  it('8 bis. CONTRE-ÉPREUVE — la MÊME grille, sa troisième bande colorée : la règle s\'allume', () => {
    // Sans ce cas, l'extinction ci-dessus pourrait venir de n'importe quoi
    // (l'instrument synthétique, `computeScoreFromDef`, la forme des options) et
    // non de la couleur manquante. Une seule chose change entre les deux.
    const def = instrumentSynthetique({ min: 20, max: 30, label: 'C', color: 'danger' });
    const scores: any = computeScoreFromDef(def, { T1: 10 });
    expect(scores.bandePlancher.couleursPossibles).toEqual(['warning', 'danger']);

    expect(orienter(
      [reponseSynthetique(def)],
      [regleZone(def.id, { type: 'couleur', couleurs: ['warning', 'danger', 'dark'] })],
    )).toHaveLength(1);
  });

  it('9. LE CAS OÙ L\'ANCIEN CODE ÉTAIT FAUX — une bande atteignable par le REPLI DE PLAFOND', () => {
    // LE SEUL CHEMIN PAR LEQUEL UNE BANDE SANS `min` EST RÉELLEMENT ATTEIGNABLE,
    // et il n'a rien d'hypothétique : `interpretRanges` (`questions.ts`) rend la
    // bande au `max` le plus haut quand le score DÉPASSE toute la grille — le
    // repli de plafond, exercé aujourd'hui par `Q_MOD_01/ADAPTATION_STRESS`. Une
    // bande définie par son seul `max` est donc décrochable, alors qu'aucune
    // comparaison sur `min` ne peut la voir.
    //
    // C'est ici que la rédaction d'origine était FAUSSE, et pas seulement
    // fragile : elle filtrait sur `typeof min === 'number'`, la bande `C`
    // disparaissait de la fermeture, `couleursPossibles` valait `['warning']` —
    // et une règle visant `['warning']` s'allumait pour une passation dont la
    // bande finale est `danger`, hors zone. Le correctif refuse toute fermeture
    // sur une grille qu'il ne sait pas ordonner.
    const def = {
      id: 'Q_TEST_PLAFOND',
      sections: [{
        questions: [
          { id: 'T1', options: [{ v: 0 }, { v: 10 }] },
          { id: 'T2', options: [{ v: 0 }, { v: 10 }] },
          { id: 'T3', options: [{ v: 0 }, { v: 10 }] },
        ],
      }],
      scoring: {
        type: 'sum',
        maxTotal: 30,
        severiteCroissante: true,
        interpretation: [
          { min: 0, max: 9, label: 'A', color: 'success' },
          { min: 10, max: 19, label: 'B', color: 'warning' },
          // Ni `min`, ni plage couvrant 30 : seul le repli de plafond y mène.
          { max: 25, label: 'C', color: 'danger' },
        ],
      },
    };

    // LE FAIT PORTEUR, asséré et non raconté : la passation COMPLÈTE atterrit
    // bien en `danger`. Sans lui, la thèse « la règle se serait allumée pour un
    // score final hors zone » ne reposerait sur rien.
    const complet: any = computeScoreFromDef(def, { T1: 10, T2: 10, T3: 10 });
    expect(complet.total).toBe(30);
    expect(complet.interpretation.color).toBe('danger');

    const partiel: any = computeScoreFromDef(def, { T1: 10 });
    expect(partiel.total).toBe(10);
    expect(partiel.bandePlancher.label).toBe('B');
    // Aucune des deux fermetures n'est servie : la grille n'est pas ordonnable,
    // donc rien n'est garanti — ni par les couleurs, ni par les libellés.
    expect(partiel.bandePlancher).not.toHaveProperty('couleursPossibles');
    expect(partiel.bandePlancher).not.toHaveProperty('labelsPossibles');

    const reponsePartielle: ReponseOrientation = {
      idQuestionnaire: def.id,
      dateReponse: '2026-08-05T10:00:00.000Z',
      scores: partiel as Record<string, unknown>,
    };
    // La règle que l'ancien code allumait à tort.
    expect(orienter(
      [reponsePartielle],
      [regleZone(def.id, { type: 'couleur', couleurs: ['warning'] })],
    )).toEqual([]);
    // Et même une zone LARGE reste éteinte : ce n'est pas la zone qui est trop
    // étroite, c'est la grille qui ne se laisse pas ordonner.
    expect(orienter(
      [reponsePartielle],
      [regleZone(def.id, { type: 'couleur', couleurs: ['info', 'warning', 'danger', 'dark'] })],
    )).toEqual([]);
  });
});

describe('les deux bords de `recueilIncomplet` — un recueil COMPLET n\'ouvre aucun chemin de plancher', () => {
  // Le refactor en `comptesDuRecueil` est exact aujourd'hui ; rien ne le tiendra
  // demain. Ces deux bords sont ceux où un `>` mal placé, ou un `manquants`
  // rendu au lieu d'un `total`, changerait un recueil complet en recueil
  // partiel — et ouvrirait le chemin du plancher là où la mesure doit primer.
  function scoresAvec(comptes: Record<string, number>) {
    return {
      total: 30,
      interpretation: { label: 'Niveau élevé de stress et désadaptation', color: 'danger' },
      // Un plancher DÉLIBÉRÉMENT posé à côté, avec une fermeture qui allumerait
      // la règle si le chemin s'ouvrait : c'est ce qui rend ces deux cas
      // falsifiables plutôt que décoratifs.
      bandePlancher: { label: 'B', color: 'warning', garanti: true, couleursPossibles: ['warning'] },
      ...comptes,
    };
  }

  for (const [nom, comptes] of [
    ['aucun item et aucune réponse (`repondus: 0, items: 0`)', { repondus: 0, items: 0 }],
    ['un compte NÉGATIF de manquants (`missing: -1`)', { missing: -1 }],
  ] as const) {
    it(`${nom} : la MESURE est lue, jamais le plancher`, () => {
      const recos = orienter(
        [{ idQuestionnaire: 'Q_STR_02', dateReponse: '2026-08-05T10:00:00.000Z', scores: scoresAvec(comptes) }],
        [regleZone('Q_STR_02', { type: 'couleur', couleurs: ['warning', 'danger', 'dark'] })],
      );
      expect(recos).toHaveLength(1);
      const condition = recos[0].motifs[0].conditions[0];
      // Le motif est celui de la MESURE — ni « au moins », ni recueil partiel.
      expect(condition).toBe('Q_STR_02 : zone danger (« Niveau élevé de stress et désadaptation »)');
    });
  }
});

// ── La conduite, à la porte de l'ORIENTATION ────────────────────────────────
//
// `conduite.guard.test.ts` visite un recueil partiel, mais n'a jamais regardé la
// sortie d'orientation. Or c'est un canal de plus vers le praticien, et il rend
// des chaînes libres.

/** Tous les textes de conduite à tenir déclarés par le catalogue, à quelque profondeur que ce soit. */
function conduitesDuCatalogue(): string[] {
  const trouvees = new Set<string>();
  const parcourir = (valeur: unknown) => {
    if (Array.isArray(valeur)) { valeur.forEach(parcourir); return; }
    if (!valeur || typeof valeur !== 'object') return;
    for (const [cle, sousValeur] of Object.entries(valeur as Record<string, unknown>)) {
      if (cle === 'protocol' && typeof sousValeur === 'string' && sousValeur.trim()) trouvees.add(sousValeur);
      else parcourir(sousValeur);
    }
  };
  parcourir(QUESTIONNAIRE_CATALOGUE);
  return [...trouvees];
}

function questionsDe(def: any): any[] {
  return (def.sections || []).flatMap((s: any) => s.questions || []);
}

function valeurs(q: any): number[] {
  const v = (q.options || []).map((o: any) => Number(o.v)).filter(Number.isFinite);
  if (v.length) return v;
  if (q.type === 'number') return [q.min ?? 0, q.max ?? 0];
  return [];
}

function horsBareme(def: any, q: any): boolean {
  const exemptable = def.scoring.type === 'psqi' || def.scoring.type === 'tfd';
  return exemptable && (q.meta?.horsBareme === true || q.horsBareme === true);
}

function grilleDe(def: any): any[] | null {
  const sc = def.scoring;
  const g = sc.interpretation || sc.globalInterpretation;
  if (Array.isArray(g) && g.length) return [...g].sort((a: any, b: any) => a.min - b.min);
  if (sc.type === 'psqi') {
    // Copie de `BANDES_PSQI`, que le moteur n'exporte pas — même copie, et pour
    // la même raison, que dans `plancherGaranti.guard.test.ts`. Seule la CIBLE
    // vient d'ici ; tout ce qui est asséré est relu du moteur.
    return [
      { min: 0, max: 4, label: 'Pas de trouble du sommeil' },
      { min: 5, max: 10, label: 'Troubles du sommeil légers' },
      { min: 11, max: 16, label: 'Troubles du sommeil modérés' },
      { min: 17, max: 21, label: 'Troubles du sommeil sévères' },
    ];
  }
  return null;
}

/**
 * Passation complète atterrissant sur une bande INTERMÉDIAIRE.
 *
 * REPRISE DE `plancherGaranti.guard.test.ts`, à l'identique et volontairement —
 * un fichier de test n'exporte rien sans que ses propres cas se rejouent chez
 * l'importateur. Ce qu'elle évite est écrit là-bas : partir d'une passation
 * SATURÉE fait atterrir tous les éligibles sur la bande de tête, où la
 * fermeture est un singleton et où le prédicat de ce lot ne peut pas échouer.
 */
function versBandeIntermediaire(def: any): Record<string, number> | null {
  const grille = grilleDe(def);
  if (!grille || grille.length < 3) return null;
  const cible = grille[Math.floor(grille.length / 2)].min;

  const base: Record<string, number> = {};
  for (const q of questionsDe(def)) base[q.id] = Math.min(...(valeurs(q).length ? valeurs(q) : [0]));

  for (const q of questionsDe(def).filter((x: any) => !horsBareme(def, x))) {
    const total = (calculateScore(def.id, base) as any).total;
    if (typeof total === 'number' && total >= cible) break;
    const v = valeurs(q);
    if (v.length) base[q.id] = Math.max(...v);
  }
  return base;
}

/**
 * Éligibles que la propriété n'éprouve PAS, et pourquoi — RE-DÉCLARÉS ici
 * plutôt qu'hérités en silence de l'autre banc. Une couverture bornée qu'on
 * hérite sans la relire cesse d'être une décision.
 *
 * DEUX PORTES DE SORTIE, ET NON UNE SEULE. Une première rédaction ne déclarait
 * que la première : l'assertion de couverture ne regardait que
 * `versBandeIntermediaire(def) === null`, si bien que `Q_STR_08` sortait par la
 * SECONDE sans que rien ne le dise — et sortait du même coup du banc n°7. Rien
 * n'aurait rougi le jour où un autre instrument l'y rejoint. C'est exactement
 * l'angle mort que cette liste prétend fermer. Relevé en revue adversariale.
 *
 *  · `sansBandeIntermediaire` — grille de moins de trois bandes : il n'existe
 *    pas de bande « du milieu » qui ne soit ni la plus basse ni la plus haute.
 *    Un seul plancher y est possible, sa fermeture est un singleton, et
 *    l'inclusion y est vraie de toute zone nommant cette couleur : ces
 *    instruments ne peuvent rien réfuter.
 *  · `sansPlancherProduit` — la bande intermédiaire est atteinte, mais aucun
 *    des trois tirages de `partielAvecPlancher` ne produit de plancher sur cet
 *    instrument. C'est une limite de la CONSTRUCTION du sous-ensemble, pas une
 *    propriété de l'instrument : elle se lève en trouvant un meilleur tirage,
 *    et doit donc rester visible plutôt que silencieuse.
 */
const ECARTES: Record<'sansBandeIntermediaire' | 'sansPlancherProduit', string[]> = {
  sansBandeIntermediaire: ['Q_SOM_06', 'Q_FIB_01', 'Q_NEU_04', 'Q_GEO_02', 'Q_TAB_05'],
  sansPlancherProduit: ['Q_STR_08'],
};

function eligibles(): any[] {
  return (Object.values(QUESTIONNAIRE_CATALOGUE as any) as any[])
    .filter((def: any) => def?.scoring?.severiteCroissante === true);
}

/**
 * Sous-ensemble de `complet` qui produit RÉELLEMENT un plancher, ou `null`.
 *
 * Trois tirages essayés dans l'ordre, et le premier qui rend un plancher gagne.
 * Retirer trop peu ne change pas la bande ; retirer trop la fait tomber à la
 * plus basse, où il n'y a plus de plancher — ou annule le total sur les moteurs
 * à sous-scores. C'est la même difficulté que l'autre banc résout par ses cinq
 * tirages, réduite ici à ce dont ces cas ont besoin.
 */
function partielAvecPlancher(def: any, complet: Record<string, number>): Record<string, number> | null {
  const retirables = questionsDe(def).filter((q: any) => !horsBareme(def, q)).map((q: any) => q.id);
  if (retirables.length < 2) return null;
  const tirages = [
    retirables.slice(-1),
    retirables.slice(0, 1),
    retirables.slice(-Math.max(1, Math.floor(retirables.length / 3))),
  ];
  for (const aRetirer of tirages) {
    if (aRetirer.length >= retirables.length) continue;
    const partiel = { ...complet };
    for (const id of aRetirer) delete partiel[id];
    const r: any = calculateScore(def.id, partiel);
    if (r?.bandePlancher) return partiel;
  }
  return null;
}

describe('7. aucune conduite ne sort par la porte de l\'orientation', () => {
  it('sur la VRAIE table publiée, aucun motif ne porte de conduite, et tout motif de plancher dit « au moins »', () => {
    const conduites = conduitesDuCatalogue();
    // Anti-vacuité : si le catalogue ne déclarait plus aucune conduite, ce
    // contrôle serait vert sans rien contrôler.
    expect(conduites.length, 'aucune conduite au catalogue : ce contrôle ne contrôle rien').toBeGreaterThan(4);

    let instrumentsVisites = 0;
    let conditionsVues = 0;
    for (const def of eligibles()) {
      const complet = versBandeIntermediaire(def);
      if (!complet) continue;
      const partiel = partielAvecPlancher(def, complet);
      if (!partiel) continue;
      instrumentsVisites++;

      // La table PUBLIÉE, telle qu'elle part en production — et non une règle de
      // test : c'est elle qui décide ce que le praticien lit.
      const recos = evaluerOrientation({
        reponses: [reponse(def.id, partiel)],
        idsQuestionnairesAssignes: [],
        regles: ORIENTATION_RULES_V1,
      });
      for (const reco of recos) {
        for (const motif of reco.motifs) {
          for (const condition of motif.conditions) {
            conditionsVues++;
            for (const conduite of conduites) {
              expect(
                condition.includes(conduite),
                `${def.id} — une conduite à tenir du catalogue est sortie dans un motif d'orientation : « ${condition} »`,
              ).toBe(false);
            }
            // Aucune mesure n'existe sur ces passations partielles, et aucun
            // drapeau d'anamnèse n'est fourni : toute condition rendue ici vient
            // donc d'un plancher, et doit dire les DEUX choses qu'un plancher
            // est — un minimum garanti, et un minimum tiré d'un recueil
            // incomplet. Les deux assertions sont séparées pour que le message
            // d'échec nomme celle qui manque ; c'est la garde qui rougit quand
            // une SEULE des deux branches du chemin plancher oublie la mention.
            expect(
              condition,
              `${def.id} — un motif sort sans « au moins » alors qu'aucune mesure n'est disponible`,
            ).toContain('au moins');
            expect(
              condition,
              `${def.id} — un motif de plancher ne dit pas que le recueil est partiel : « ${condition} ». Le libellé de bande peut être rassurant (« Adaptation satisfaisante mais inconstante » sur Q_STR_02) à côté d'une proposition qui ne l'est pas.`,
            ).toContain('recueil partiel');
          }
        }
      }
    }
    expect(instrumentsVisites, 'aucun instrument éligible n\'a produit de plancher : le contrôle est vide').toBeGreaterThan(5);
    // Le lot ne serait pas fermé si la table publiée ne voyait AUCUN plancher.
    expect(conditionsVues, 'aucune règle publiée ne s\'allume sur un plancher : D-024 ne ferme plus la réserve de D-021').toBeGreaterThan(0);
  });

  it('LES DEUX BRANCHES du chemin plancher disent « au moins » ET le recueil partiel', () => {
    // La table publiée n'allume aujourd'hui que des zones `couleur` sur un
    // plancher : la seule règle `interpretation` vise `Q_ALI_01`, qui n'est pas
    // éligible. Le contrôle ci-dessus ne visite donc QU'UNE des deux branches,
    // et une mention retirée de l'autre passerait. Ce balayage-ci construit les
    // deux formes de zone à partir de la FERMETURE de chaque plancher réel —
    // donc toujours incluante, donc toujours allumée — et exige la même phrase
    // des deux.
    let couleurVues = 0;
    let interpretationVues = 0;
    for (const def of eligibles()) {
      const complet = versBandeIntermediaire(def);
      if (!complet) continue;
      const partiel = partielAvecPlancher(def, complet);
      if (!partiel) continue;
      const plancher: any = (calculateScore(def.id, partiel) as any).bandePlancher;
      if (!plancher) continue;

      const formes: Array<[string, OrientationZone]> = [];
      if (Array.isArray(plancher.couleursPossibles)) {
        formes.push(['couleur', { type: 'couleur', couleurs: plancher.couleursPossibles }]);
      }
      if (Array.isArray(plancher.labelsPossibles)) {
        formes.push(['interpretation', { type: 'interpretation', labels: plancher.labelsPossibles }]);
      }

      for (const [forme, zone] of formes) {
        const recos = orienter([reponse(def.id, partiel)], [regleZone(def.id, zone, `R-TEST-${forme}`)]);
        expect(recos, `${def.id} — la zone dérivée de sa propre fermeture (${forme}) devrait s'allumer`).toHaveLength(1);
        const condition = recos[0].motifs[0].conditions[0];
        expect(condition, `${def.id} / ${forme} — motif sans « au moins »`).toContain('au moins');
        expect(condition, `${def.id} / ${forme} — motif sans mention de recueil partiel`).toContain('recueil partiel');
        if (forme === 'couleur') couleurVues++; else interpretationVues++;
      }
    }
    // Anti-vacuité PAR BRANCHE : un compte global laisserait une branche à zéro.
    expect(couleurVues, 'branche `couleur` jamais visitée').toBeGreaterThan(5);
    expect(interpretationVues, 'branche `interpretation` jamais visitée').toBeGreaterThan(5);
  });
});

describe('LA PROPRIÉTÉ — ce qui s\'allume sur un plancher s\'allume sur le complet', () => {
  // Énoncé : pour tout instrument éligible et tout sous-ensemble de réponses
  // dont la bande est INTERMÉDIAIRE, si une règle `zone` s'allume sur le
  // plancher du sous-ensemble, elle s'allume aussi sur la passation complète.
  //
  // C'est la contrepartie du prédicat : un plancher ne peut RIEN allumer que la
  // mesure complète n'allumerait. L'inverse est faux et c'est normal — la
  // mesure complète en allume davantage.
  const ZONES: OrientationZone[] = [
    { type: 'couleur', couleurs: ['info', 'warning', 'danger', 'dark'] },
    { type: 'couleur', couleurs: ['warning', 'danger', 'dark'] },
    { type: 'couleur', couleurs: ['danger', 'dark'] },
    { type: 'couleur', couleurs: ['warning'] },
    { type: 'couleur', couleurs: ['danger'] },
  ];

  it('aucun plancher n\'allume une règle que la passation complète laisserait éteinte', () => {
    const violations: string[] = [];
    let allumagesSurPlancher = 0;
    const instrumentsAllumes = new Set<string>();

    for (const def of eligibles()) {
      const complet = versBandeIntermediaire(def);
      if (!complet) continue;
      const partiel = partielAvecPlancher(def, complet);
      if (!partiel) continue;

      for (const [i, zone] of ZONES.entries()) {
        const regles = [regleZone(def.id, zone, `R-TEST-Z${i}`)];
        const surPlancher = orienter([reponse(def.id, partiel)], regles).length > 0;
        const surComplet = orienter([reponse(def.id, complet)], regles).length > 0;
        if (surPlancher) {
          allumagesSurPlancher++;
          instrumentsAllumes.add(def.id);
        }
        if (surPlancher && !surComplet) {
          violations.push(`${def.id} — zone ${JSON.stringify(zone)} s'allume sur le plancher et pas sur le complet`);
        }
      }
    }

    expect(violations, violations.join(' | ')).toEqual([]);
    // Anti-vacuité : sans allumage, l'implication est vraie à vide.
    expect(allumagesSurPlancher).toBeGreaterThan(5);
    expect(
      instrumentsAllumes.size,
      'trop peu d\'instruments distincts allument une règle sur leur plancher : la propriété porte sur presque rien',
    ).toBeGreaterThanOrEqual(3);
  });

  it('la couverture de la propriété est DÉCLARÉE par CHACUNE de ses deux portes', () => {
    // Anti-angle-mort. L'assertion porte sur les DEUX causes d'exclusion, chaque
    // instrument écarté étant nommé avec la sienne. Un instrument qui sortirait
    // par une porte non déclarée — ou qui changerait de porte — fait rougir ce
    // banc au lieu de disparaître du contrôle en silence.
    const sansBandeIntermediaire: string[] = [];
    const sansPlancherProduit: string[] = [];
    let eprouves = 0;
    for (const def of eligibles()) {
      const complet = versBandeIntermediaire(def);
      if (!complet) { sansBandeIntermediaire.push(def.id); continue; }
      if (!partielAvecPlancher(def, complet)) { sansPlancherProduit.push(def.id); continue; }
      eprouves++;
    }
    expect(
      { sansBandeIntermediaire: sansBandeIntermediaire.sort(), sansPlancherProduit: sansPlancherProduit.sort() },
      'la sortie des éligibles hors propriété a changé : mettre `ECARTES` à jour en connaissance de cause — et par la BONNE porte —, ou comprendre pourquoi un instrument en sort.',
    ).toEqual({
      sansBandeIntermediaire: [...ECARTES.sansBandeIntermediaire].sort(),
      sansPlancherProduit: [...ECARTES.sansPlancherProduit].sort(),
    });
    // Compte-témoin de ce que la propriété visite RÉELLEMENT — 17 instruments au
    // 2026-08-05, sur 23 éligibles. Un seuil, et non une égalité : il rougit si
    // la couverture s'effondre, pas au premier instrument ajouté au catalogue.
    expect(eprouves).toBeGreaterThanOrEqual(17);
  });
});
