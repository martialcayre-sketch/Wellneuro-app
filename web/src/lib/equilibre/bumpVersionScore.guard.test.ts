import { describe, expect, it } from 'vitest';

import {
  BESOIN_SOURCES,
  PLAFOND_FONDATION_CRITIQUE,
  SEUIL_EFFONDREMENT,
  VERSION_SCORE_EQUILIBRE,
} from './constants';
import { agregerEquilibre } from './score';

// LOT-11 « Doctrine exécutable » — [[D-107]], dette nommée par [[D-106]].
//
// LA RÈGLE ÉTAIT ÉCRITE, RIEN NE L'OPPOSAIT. `constants.ts` exige désormais en
// toutes lettres qu'une modification de `SEUIL_EFFONDREMENT` ou de
// `PLAFOND_FONDATION_CRITIQUE` s'accompagne d'un bump de
// `VERSION_SCORE_EQUILIBRE` — et aucun contrôle ne le vérifiait. C'est le patron
// exact de la « décision due » que `DC-21` porte déjà : une règle écrite qu'un
// diff peut enfreindre sans que rien ne bronche.
//
// POURQUOI CETTE FORME, ET PAS UN SIMPLE `toBe`. Épingler les deux valeurs
// (`expect(SEUIL_EFFONDREMENT).toBe(0.34)`) ne garde PAS la règle : l'auteur qui
// change la valeur change l'assertion dans le même diff, et le banc redevient
// vert sans qu'aucun bump n'ait eu lieu. Ici, les valeurs sont épinglées PAR
// VERSION. Changer une valeur sans bump laisse l'entrée de la version COURANTE
// en désaccord avec le code — le banc rougit, et le seul moyen de le refermer
// honnêtement est d'ajouter une entrée pour une version NEUVE, donc de bumper.
//
// LA LIMITE, DITE : réécrire l'entrée d'une version DÉJÀ PUBLIÉE referme aussi
// le banc. C'est un geste qu'aucune bonne foi n'accomplit par distraction, et
// qu'une relecture voit — les entrées ci-dessous sont un registre, pas un cache.
//
// ─────────────────────────────────────────────────────────────────────────────
// ÉLARGI PAR LE LOT-12 — [[D-108]], contre-revue adverse Codex du 2026-08-24.
//
// LE TROU MESURÉ. Ce banc portait le nom du bump et ne gardait que DEUX
// constantes. La contre-revue a remplacé le multiplicateur `100` de
// `agregerEquilibre` par `99` — TOUTES les valeurs non nulles du score global
// changent — et le banc est resté vert, trois tests sur trois. Or `constants.ts`
// range explicitement parmi ce qui impose un bump la formule, les poids, le
// mapping et le regroupement des sources : la règle écrite était quatre fois
// plus large que le banc censé l'opposer.
//
// DEUX REGISTRES DE PLUS, sur le même patron « par version » :
//
//   · les SORTIES de `agregerEquilibre` sur six scénarios fixes — elles
//     couvrent la formule, les poids de strate, la renormalisation, le
//     plafonnement, la composition des fondations critiques et la règle
//     d'arrondi ;
//   · l'EMPREINTE DU MAPPING besoin → sources — elle couvre l'ajout, le retrait,
//     le `max`, le sens (`inverser`), le groupe et le poids d'une source, c'est
//     à-dire la classe de changement qui a commandé neuf des bumps historiques.
//
// POURQUOI DES SORTIES, ET PAS LES CONSTANTES DE LA FORMULE. Épingler
// `POIDS_STRATE` laisserait passer le `100 → 99` : la valeur épinglée n'aurait
// pas bougé. Une sortie ne se contourne qu'en changeant la sortie.

/**
 * Les deux valeurs de plafonnement, par étiquette de version de score.
 *
 * `v14` et `v15` coexistent parce que `VERSION_SCORE_EQUILIBRE` dépend de la
 * FORME SERVIE de `Q_ALI_01` (`maxTotal === 90` ⇒ `v15`, sinon `v14`) : les
 * deux positions du drapeau `WN_ALI_01_SIIN57` doivent donc être couvertes, sans
 * quoi le banc ne garderait que la position dans laquelle il tourne.
 *
 * Les deux portent les MÊMES valeurs, et c'est exact : elles n'ont jamais
 * changé. `D-106` les a **validées telles quelles** le 2026-08-24 — validation
 * sans modification, donc délibérément sans bump, puisque aucune valeur calculée
 * ne bouge et qu'un bump aurait cassé l'historique de tous les patients pour
 * n'enregistrer qu'une signature.
 */
const VALEURS_PAR_VERSION: Record<string, { seuil: number; plafond: number }> = {
  v14: { seuil: 0.34, plafond: 50 },
  v15: { seuil: 0.34, plafond: 50 },
};

describe('plafonnement — une valeur ne change pas sans bump de version', () => {
  // Anti-vacuité : une étiquette inconnue rendrait la comparaison `undefined`
  // contre `undefined` sur un `toEqual` mal écrit. Ici elle rougit d'abord.
  it('la version courante est couverte par le registre', () => {
    expect(Object.keys(VALEURS_PAR_VERSION)).toContain(VERSION_SCORE_EQUILIBRE);
  });

  it('les deux valeurs correspondent à celles de la version courante', () => {
    const attendu = VALEURS_PAR_VERSION[VERSION_SCORE_EQUILIBRE];
    expect({ seuil: SEUIL_EFFONDREMENT, plafond: PLAFOND_FONDATION_CRITIQUE }).toEqual(attendu);
  });

  // Le registre couvre les DEUX positions du drapeau, pas seulement celle qui
  // tourne : sans ce cas, supprimer l'entrée de la position inactive passerait
  // inaperçu jusqu'au jour où le drapeau bascule.
  it('les deux positions du drapeau restent couvertes', () => {
    expect(Object.keys(VALEURS_PAR_VERSION).sort()).toEqual(['v14', 'v15']);
  });
});

/**
 * Six scénarios de couverture, choisis pour toucher chacun un mécanisme
 * DISTINCT — un scénario de plus qui n'éclairerait rien de neuf ne garderait
 * rien de neuf.
 *
 * Les couvertures sont fournies DIRECTEMENT à `agregerEquilibre` : ce sont des
 * entrées de fixture, aucune ne provient d'un dossier. C'est aussi ce qui rend
 * les sorties ci-dessous indépendantes du drapeau alimentaire — voir la note du
 * registre.
 */
const SCENARIOS: Record<string, Record<number, number | null>> = {
  // Toutes strates mesurées, aucune fondation sous le seuil : la formule et les
  // poids 60/20/20, nus.
  pleine: { 1: 0.8, 2: 0.7, 3: 0.6, 4: 0.9, 5: 0.5, 6: 0.4, 7: 0.8, 8: 0.6, 9: 0.7, 10: 0.5, 11: 0.9, 12: 0.3 },
  // Une seule fondation effondrée sur un score par ailleurs haut : le
  // plafonnement anti-moyenne, seul énoncé de priorité entre besoins.
  fondationEffondree: { 1: 0.2, 2: 0.9, 3: 0.9, 4: 0.9, 5: 0.9, 6: 0.9, 7: 0.9, 8: 0.9, 9: 0.9, 10: 0.9, 11: 0.9, 12: 0.9 },
  // Les cinq fondations effondrées, mais le score est DÉJÀ sous le plafond :
  // `plafondApplique` doit rester faux. Un plafond qui s'appliquerait ici
  // REMONTERAIT le score — l'inverse de sa raison d'être.
  toutBasSansPlafond: { 1: 0.1, 2: 0.2, 3: 0.2, 4: 0.2, 5: 0.2, 6: 0.2, 7: 0.2, 8: 0.2, 9: 0.2, 10: 0.2, 11: 0.2, 12: 0.2 },
  // Strate ESPRIT entièrement non mesurée : la renormalisation des poids sur
  // les seules strates disponibles (0,53 / 0,8 et non 0,53 / 1,0).
  strateAbsente: { 1: 0.8, 2: 0.7, 3: 0.6, 4: 0.9, 5: 0.5, 6: 0.4, 7: 0.8, 8: 0.6, 9: 0.7, 10: null, 11: null, 12: null },
  // Rien de mesuré : `null`, JAMAIS `0` (`DC-24`).
  rienDeMesure: { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null, 7: null, 8: null, 9: null, 10: null, 11: null, 12: null },
  // SUR LA FRONTIÈRE D'ARRONDI, et il a fallu le mesurer pour le voir. Rejouée
  // contre les cinq scénarios ci-dessus, la mutation de la contre-revue
  // (`× 100` → `× 99`) n'en faisait rougir QU'UN : l'arrondi entier absorbe 1 %
  // sur les petites valeurs, et `Math.round` → `Math.floor` passait vert sur les
  // cinq. Ici CORPS seul est mesuré, à 0,645 — le total tombe exactement sur
  // 64,5, que `round` rend 65 et `floor` 64. La règle d'arrondi devient une
  // valeur gardée, comme les autres.
  frontiereArrondi: { 1: 0.645, 2: 0.645, 3: 0.645, 4: 0.645, 5: 0.645, 6: 0.645, 7: null, 8: null, 9: null, 10: null, 11: null, 12: null },
};

type SortieDeReference = {
  global: number | null;
  avantPlafond: number | null;
  plafondApplique: boolean;
  fondations: number[];
};

/**
 * Les sorties de référence, par étiquette de version.
 *
 * LES DEUX VERSIONS PORTENT LES MÊMES SORTIES, et ce n'est pas une recopie :
 * `agregerEquilibre` reçoit des couvertures DÉJÀ CALCULÉES, donc ne dépend pas
 * de la forme servie de `Q_ALI_01`. Ce que le drapeau change, c'est le MAPPING
 * qui produit ces couvertures — et c'est le registre suivant qui le garde, où
 * les deux versions diffèrent bel et bien.
 *
 * Valeurs vérifiées à la main avant d'être inscrites, et non recopiées d'une
 * exécution : `pleine` = (0,65×0,6 + 0,7×0,2 + 0,5667×0,2) × 100 = 64,33 → 64 ;
 * `strateAbsente` = 0,53 / 0,8 × 100 = 66,25 → 66 ; `fondationEffondree` = 83,
 * plafonné à 50. Épingler le résultat d'un `console.log` fige un comportement
 * sans jamais l'avoir jugé.
 */
const SORTIES_PAR_VERSION: Record<string, Record<string, SortieDeReference>> = {
  v14: {
    pleine: { global: 64, avantPlafond: 64, plafondApplique: false, fondations: [] },
    fondationEffondree: { global: 50, avantPlafond: 83, plafondApplique: true, fondations: [1] },
    toutBasSansPlafond: { global: 19, avantPlafond: 19, plafondApplique: false, fondations: [1, 2, 4, 5, 9] },
    strateAbsente: { global: 66, avantPlafond: 66, plafondApplique: false, fondations: [] },
    rienDeMesure: { global: null, avantPlafond: null, plafondApplique: false, fondations: [] },
    frontiereArrondi: { global: 65, avantPlafond: 65, plafondApplique: false, fondations: [] },
  },
  v15: {
    pleine: { global: 64, avantPlafond: 64, plafondApplique: false, fondations: [] },
    fondationEffondree: { global: 50, avantPlafond: 83, plafondApplique: true, fondations: [1] },
    toutBasSansPlafond: { global: 19, avantPlafond: 19, plafondApplique: false, fondations: [1, 2, 4, 5, 9] },
    strateAbsente: { global: 66, avantPlafond: 66, plafondApplique: false, fondations: [] },
    rienDeMesure: { global: null, avantPlafond: null, plafondApplique: false, fondations: [] },
    frontiereArrondi: { global: 65, avantPlafond: 65, plafondApplique: false, fondations: [] },
  },
};

function sortieObservee(couvertures: Record<number, number | null>): SortieDeReference {
  const resultat = agregerEquilibre(couvertures);
  return {
    global: resultat.scoreGlobal,
    avantPlafond: resultat.scoreGlobalAvantPlafond,
    plafondApplique: resultat.plafondApplique,
    fondations: resultat.fondationsCritiquesDeclenchees.map(f => f.besoin),
  };
}

describe('formule — une sortie ne change pas sans bump de version', () => {
  it('la version courante est couverte par le registre des sorties', () => {
    expect(Object.keys(SORTIES_PAR_VERSION)).toContain(VERSION_SCORE_EQUILIBRE);
  });

  it('les six scénarios sont tous inscrits pour la version courante', () => {
    // Anti-vacuité : un scénario retiré du registre cesserait d'être comparé
    // sans que rien ne rougisse — le `for` ci-dessous ne boucle que sur ce qui
    // est inscrit.
    expect(Object.keys(SORTIES_PAR_VERSION[VERSION_SCORE_EQUILIBRE]).sort()).toEqual(
      Object.keys(SCENARIOS).sort(),
    );
  });

  for (const nom of Object.keys(SCENARIOS)) {
    it(`« ${nom} » rend la sortie inscrite pour la version courante`, () => {
      expect(sortieObservee(SCENARIOS[nom])).toEqual(
        SORTIES_PAR_VERSION[VERSION_SCORE_EQUILIBRE][nom],
      );
    });
  }

  it('les deux positions du drapeau restent couvertes', () => {
    expect(Object.keys(SORTIES_PAR_VERSION).sort()).toEqual(['v14', 'v15']);
  });
});

/**
 * Empreinte du mapping besoin → sources, LISIBLE et non hachée.
 *
 * Un `sha` dirait « quelque chose a changé » sans dire quoi, et se referme en
 * recopiant la nouvelle empreinte — le geste même que le registre par version
 * existe pour rendre visible. Ici, le diff du banc NOMME la source ajoutée, le
 * `max` déplacé ou le groupe modifié.
 *
 * `-` désigne un besoin sans source : les besoins 2, 6, 7 et 11 sont NON
 * ÉVALUABLES, et leur vacuité est une décision (`constants.ts`), pas un oubli —
 * un branchement futur doit donc rougir ici.
 */
function empreinteDuMapping(): string {
  return Object.entries(BESOIN_SOURCES)
    .map(([besoin, sources]) => {
      const decrites = sources
        .map(s => [s.idQuestionnaire, s.sousScore ?? '-', s.max, s.inverser ? 'inv' : 'dir', s.groupe ?? '-', s.poids ?? 1].join('|'))
        .join(',');
      return `${besoin}:${decrites || '-'}`;
    })
    .join(' ');
}

const MAPPING_PAR_VERSION: Record<string, string> = {
  v14:
    '1:Q_ALI_01|-|42|dir|-|1 2:- 3:Q_ALI_01|RYTHME_CHRONO|0|dir|-|1 '
    + '4:Q_GAS_01|-|93|inv|-|1,Q_INF_01|-|96|inv|-|1 '
    + '5:Q_MOD_01|ACTIVITE_PHYSIQUE|20|dir|mouvement|1,Q_SOM_01|-|21|inv|repos|2,Q_SOM_09|-|100|dir|repos|1 '
    + '6:- 7:- 8:Q_NEU_11|D|21|inv|-|1 '
    + '9:Q_STR_01|-|42|inv|-|1,Q_STR_02|-|50|inv|-|1,Q_STR_03|-|55|inv|-|1 '
    + '10:Q_INF_03|DA|40|inv|-|1,Q_INF_03|NA|40|inv|-|1,Q_INF_03|SE|40|inv|-|1 '
    + '11:- 12:Q_INF_03|ME|40|inv|-|1',
  // v15 diffère en DEUX points, et seulement deux : le barème du besoin 1
  // (42 → 90) et le sous-score du besoin 3, que la forme courte ne déclare pas
  // (0 → 7). C'est exactement ce que les notes v5 → v6 et v6 → v7 de
  // `constants.ts` décrivent.
  v15:
    '1:Q_ALI_01|-|90|dir|-|1 2:- 3:Q_ALI_01|RYTHME_CHRONO|7|dir|-|1 '
    + '4:Q_GAS_01|-|93|inv|-|1,Q_INF_01|-|96|inv|-|1 '
    + '5:Q_MOD_01|ACTIVITE_PHYSIQUE|20|dir|mouvement|1,Q_SOM_01|-|21|inv|repos|2,Q_SOM_09|-|100|dir|repos|1 '
    + '6:- 7:- 8:Q_NEU_11|D|21|inv|-|1 '
    + '9:Q_STR_01|-|42|inv|-|1,Q_STR_02|-|50|inv|-|1,Q_STR_03|-|55|inv|-|1 '
    + '10:Q_INF_03|DA|40|inv|-|1,Q_INF_03|NA|40|inv|-|1,Q_INF_03|SE|40|inv|-|1 '
    + '11:- 12:Q_INF_03|ME|40|inv|-|1',
};

describe('mapping — une source ne change pas sans bump de version', () => {
  it('la version courante est couverte par le registre du mapping', () => {
    expect(Object.keys(MAPPING_PAR_VERSION)).toContain(VERSION_SCORE_EQUILIBRE);
  });

  it("l'empreinte correspond à celle de la version courante", () => {
    expect(empreinteDuMapping()).toBe(MAPPING_PAR_VERSION[VERSION_SCORE_EQUILIBRE]);
  });

  it('les deux empreintes diffèrent bien — le drapeau change le mapping', () => {
    // Sans ce cas, recopier v14 dans v15 rendrait le registre vert dans les deux
    // positions tout en cessant de décrire l'une des deux.
    expect(MAPPING_PAR_VERSION.v14).not.toBe(MAPPING_PAR_VERSION.v15);
  });

  it('les deux positions du drapeau restent couvertes', () => {
    expect(Object.keys(MAPPING_PAR_VERSION).sort()).toEqual(['v14', 'v15']);
  });
});
