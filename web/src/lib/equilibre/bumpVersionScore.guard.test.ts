import { describe, expect, it } from 'vitest';

import * as constantes from './constants';
import { BESOIN_SOURCES, VERSION_SCORE_EQUILIBRE } from './constants';
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

// ─────────────────────────────────────────────────────────────────────────────
// REPRIS PAR J3-12f, VAGUE 1 — [[D-547]] §4.4, [[D-548]] : v18/v19.
//
// LE PLAFONNEMENT A DISPARU. Le seuil d'effondrement, le plafond du total, la
// liste des cinq fondations critiques et les parts 60/20/20 ne sont plus des
// constantes du dépôt, et le total est la MOYENNE DIRECTE, à parts égales, des
// besoins mesurés. Le banc garde donc que RIEN ne plafonne dans la version neuve.
// Le registre des versions anciennes ci-dessous est une ARCHIVE, conservée sans
// être rejouée (la formule qui les produisait n'est plus dans le code) : aucun
// test n'en garde les valeurs — un test qui compare cette archive à un littéral
// identique ne pourrait jamais rougir — et sa seule garde est la relecture du
// diff. Le banc n'en tient que ce que le code vivant permet de vérifier : la
// version courante n'y figure pas, et les constantes du plafonnement ne sont plus
// exportées.
//
// Les entrées par version restent le patron : changer une sortie, un mapping ou
// une valeur sans nouvelle étiquette rougit le banc.

/**
 * Les deux valeurs de plafonnement des VERSIONS ANTÉRIEURES, par étiquette.
 *
 * Archive, non rejouée : v14 à v17 portaient ces valeurs ([[D-106]], validées
 * « telles quelles » le 2026-08-24). v18/v19 n'en portent AUCUNE : le plafond est
 * retiré ([[D-547]]). Les résultats stockés sous ces étiquettes gardent leurs
 * champs de plafond et ne sont jamais réécrits.
 */
const VALEURS_PAR_VERSION_ANCIENNE: Record<string, { seuil: number; plafond: number }> = {
  v14: { seuil: 0.34, plafond: 50 },
  v15: { seuil: 0.34, plafond: 50 },
  // [[D-474]] applique [[D-438]] : le mapping change, pas le plafonnement.
  v16: { seuil: 0.34, plafond: 50 },
  v17: { seuil: 0.34, plafond: 50 },
};

describe('plafonnement — retiré en v18/v19, gardé tel quel dans les versions anciennes', () => {
  it('les constantes du plafonnement ne sont plus exportées', () => {
    const noms = Object.keys(constantes);
    for (const retiree of ['POIDS_STRATE', 'BESOINS_FONDATIONS_CRITIQUES', 'SEUIL_EFFONDREMENT', 'PLAFOND_FONDATION_CRITIQUE']) {
      expect(noms).not.toContain(retiree);
    }
  });

  it('la version courante n’est PAS une version plafonnée', () => {
    expect(Object.keys(VALEURS_PAR_VERSION_ANCIENNE)).not.toContain(VERSION_SCORE_EQUILIBRE);
  });

  it('les deux positions du drapeau avancent ensemble : v16 → v18, v17 → v19', () => {
    expect(['v18', 'v19']).toContain(VERSION_SCORE_EQUILIBRE);
  });

  it('une fondation effondrée ne plafonne plus : la moyenne directe, et aucun champ de plafond', () => {
    // Le besoin 1 à 0,2 sur un score par ailleurs haut : plafonné à 50 jusqu'en
    // v17, c'est la moyenne directe (84) depuis v18.
    const resultat = agregerEquilibre({ 1: 0.2, 2: 0.9, 3: 0.9, 4: 0.9, 5: 0.9, 6: 0.9, 7: 0.9, 8: 0.9, 9: 0.9, 10: 0.9, 11: 0.9, 12: 0.9 });
    expect(resultat.scoreGlobal).toBe(84);
    expect(resultat).not.toHaveProperty('plafondApplique');
    expect(resultat).not.toHaveProperty('fondationsCritiquesDeclenchees');
    expect(resultat).not.toHaveProperty('scoreGlobalAvantPlafond');
  });
});

/**
 * Sept scénarios de couverture, choisis pour toucher chacun un mécanisme
 * DISTINCT — un scénario de plus qui n'éclairerait rien de neuf ne garderait
 * rien de neuf.
 *
 * Les couvertures sont fournies DIRECTEMENT à `agregerEquilibre` : ce sont des
 * entrées de fixture, aucune ne provient d'un dossier. C'est aussi ce qui rend
 * les sorties ci-dessous indépendantes du drapeau alimentaire — voir la note du
 * registre.
 */
const SCENARIOS: Record<string, Record<number, number | null>> = {
  // Tous les besoins mesurés : la moyenne directe, nue.
  pleine: { 1: 0.8, 2: 0.7, 3: 0.6, 4: 0.9, 5: 0.5, 6: 0.4, 7: 0.8, 8: 0.6, 9: 0.7, 10: 0.5, 11: 0.9, 12: 0.3 },
  // Un seul besoin effondré sur un score par ailleurs haut : NE PLAFONNE PLUS
  // ([[D-547]]). Rendait 50 jusqu'en v17.
  fondationEffondree: { 1: 0.2, 2: 0.9, 3: 0.9, 4: 0.9, 5: 0.9, 6: 0.9, 7: 0.9, 8: 0.9, 9: 0.9, 10: 0.9, 11: 0.9, 12: 0.9 },
  // Tous bas : la moyenne directe, sans plafond à appliquer ni à éviter.
  toutBas: { 1: 0.1, 2: 0.2, 3: 0.2, 4: 0.2, 5: 0.2, 6: 0.2, 7: 0.2, 8: 0.2, 9: 0.2, 10: 0.2, 11: 0.2, 12: 0.2 },
  // Une strate entièrement non mesurée : les besoins non mesurés SORTENT de la
  // moyenne (neuf besoins, pas douze), sans renormalisation de strate.
  strateAbsente: { 1: 0.8, 2: 0.7, 3: 0.6, 4: 0.9, 5: 0.5, 6: 0.4, 7: 0.8, 8: 0.6, 9: 0.7, 10: null, 11: null, 12: null },
  // Rien de mesuré : `null`, JAMAIS `0` (`DC-24`).
  rienDeMesure: { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null, 7: null, 8: null, 9: null, 10: null, 11: null, 12: null },
  // SUR LA FRONTIÈRE D'ARRONDI. Six besoins à 0,625 (valeur exacte en binaire) :
  // le total tombe exactement sur 62,5, que `Math.round` rend 63 et `Math.floor`
  // 62 — la règle d'arrondi est une valeur gardée, comme les autres.
  frontiereArrondi: { 1: 0.625, 2: 0.625, 3: 0.625, 4: 0.625, 5: 0.625, 6: 0.625, 7: null, 8: null, 9: null, 10: null, 11: null, 12: null },
  // AUCUN MINIMUM de besoins mesurés ([[D-548]] §2.8, M3 A) : un seul besoin
  // mesuré suffit à produire un total — le compte dit sur quoi il est établi.
  unSeulBesoin: { 1: null, 2: null, 3: null, 4: 0.9, 5: null, 6: null, 7: null, 8: null, 9: null, 10: null, 11: null, 12: null },
};

type SortieDeReference = { global: number | null };

/**
 * Les sorties de référence, par étiquette de version courante.
 *
 * LES DEUX VERSIONS PORTENT LES MÊMES SORTIES, et ce n'est pas une recopie :
 * `agregerEquilibre` reçoit des couvertures DÉJÀ CALCULÉES, donc ne dépend pas
 * de la forme servie de `Q_ALI_01`. Ce que le drapeau change, c'est le MAPPING
 * qui produit ces couvertures — et c'est le registre suivant qui le garde.
 *
 * Valeurs vérifiées à la main avant d'être inscrites : `pleine` = 7,7 / 12 =
 * 64,17 → 64 ; `fondationEffondree` = (0,2 + 11 × 0,9) / 12 = 84,17 → 84 ;
 * `toutBas` = (0,1 + 11 × 0,2) / 12 = 19,17 → 19 ; `strateAbsente` = 6,0 / 9 =
 * 66,67 → 67 ; `frontiereArrondi` = 62,5 → 63 ; `unSeulBesoin` = 90. Les
 * entrées des versions plafonnées (v14 à v17) ne sont plus rejouables : la
 * formule qui les produisait est retirée.
 */
const SORTIES_PAR_VERSION: Record<string, Record<string, SortieDeReference>> = {
  v18: {
    pleine: { global: 64 },
    fondationEffondree: { global: 84 },
    toutBas: { global: 19 },
    strateAbsente: { global: 67 },
    rienDeMesure: { global: null },
    frontiereArrondi: { global: 63 },
    unSeulBesoin: { global: 90 },
  },
  v19: {
    pleine: { global: 64 },
    fondationEffondree: { global: 84 },
    toutBas: { global: 19 },
    strateAbsente: { global: 67 },
    rienDeMesure: { global: null },
    frontiereArrondi: { global: 63 },
    unSeulBesoin: { global: 90 },
  },
};

function sortieObservee(couvertures: Record<number, number | null>): SortieDeReference {
  return { global: agregerEquilibre(couvertures).scoreGlobal };
}

describe('formule — une sortie ne change pas sans bump de version', () => {
  it('la version courante est couverte par le registre des sorties', () => {
    expect(Object.keys(SORTIES_PAR_VERSION)).toContain(VERSION_SCORE_EQUILIBRE);
  });

  it('les sept scénarios sont tous inscrits pour la version courante', () => {
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
    expect(Object.keys(SORTIES_PAR_VERSION)).toEqual(expect.arrayContaining(['v18', 'v19']));
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
        // La borne basse ([[D-474]]) n'apparaît que déclarée (`min..max`) : les
        // empreintes v14/v15, écrites avant elle, restent lisibles telles quelles.
        .map(s => [s.idQuestionnaire, s.sousScore ?? (s.sansSousScore ? `sans:${s.sansSousScore}` : '-'), s.min === undefined ? s.max : `${s.min}..${s.max}`, s.inverser ? 'inv' : 'dir', s.groupe ?? '-', s.poids ?? 1].join('|'))
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
  // v16/v17 ([[D-438]] appliquée par [[D-474]]) : v14/v15 plus DEUX sources au
  // repos du besoin 5, et rien d'autre — l'Epworth (0-24) et la fatigue
  // générale du MFI-20 (4-20), poids 1 chacune.
  v16:
    '1:Q_ALI_01|-|42|dir|-|1 2:- 3:Q_ALI_01|RYTHME_CHRONO|0|dir|-|1 '
    + '4:Q_GAS_01|-|93|inv|-|1,Q_INF_01|-|96|inv|-|1 '
    + '5:Q_MOD_01|ACTIVITE_PHYSIQUE|20|dir|mouvement|1,Q_SOM_01|-|21|inv|repos|2,Q_SOM_09|-|100|dir|repos|1,'
    + 'Q_SOM_02|-|24|inv|repos|1,Q_SOM_07|GEN|4..20|inv|repos|1 '
    + '6:- 7:- 8:Q_NEU_11|D|21|inv|-|1 '
    + '9:Q_STR_01|-|42|inv|-|1,Q_STR_02|-|50|inv|-|1,Q_STR_03|-|55|inv|-|1 '
    + '10:Q_INF_03|DA|40|inv|-|1,Q_INF_03|NA|40|inv|-|1,Q_INF_03|SE|40|inv|-|1 '
    + '11:- 12:Q_INF_03|ME|40|inv|-|1',
  v17:
    '1:Q_ALI_01|-|90|dir|-|1 2:- 3:Q_ALI_01|RYTHME_CHRONO|7|dir|-|1 '
    + '4:Q_GAS_01|-|93|inv|-|1,Q_INF_01|-|96|inv|-|1 '
    + '5:Q_MOD_01|ACTIVITE_PHYSIQUE|20|dir|mouvement|1,Q_SOM_01|-|21|inv|repos|2,Q_SOM_09|-|100|dir|repos|1,'
    + 'Q_SOM_02|-|24|inv|repos|1,Q_SOM_07|GEN|4..20|inv|repos|1 '
    + '6:- 7:- 8:Q_NEU_11|D|21|inv|-|1 '
    + '9:Q_STR_01|-|42|inv|-|1,Q_STR_02|-|50|inv|-|1,Q_STR_03|-|55|inv|-|1 '
    + '10:Q_INF_03|DA|40|inv|-|1,Q_INF_03|NA|40|inv|-|1,Q_INF_03|SE|40|inv|-|1 '
    + '11:- 12:Q_INF_03|ME|40|inv|-|1',
  // v18/v19 ([[D-548]], vague 1 de J3-12f) : v16/v17 moins les deux sources du
  // besoin 9 qui sortent (SIIN stress, Cungi), la PSS-10 avec sa borne basse, et
  // le besoin 1 sur la MESURE DÉRIVÉE (le total moins le sous-score du rythme).
  // Sous la forme courte, le `max` du besoin 1 vaut 0 : aucune source ([[D-516]]
  // §6.2) ; sous la forme complète, 90 − 7 = 83.
  v18:
    '1:Q_ALI_01|sans:RYTHME_CHRONO|0|dir|-|1 2:- 3:Q_ALI_01|RYTHME_CHRONO|0|dir|-|1 '
    + '4:Q_GAS_01|-|93|inv|-|1,Q_INF_01|-|96|inv|-|1 '
    + '5:Q_MOD_01|ACTIVITE_PHYSIQUE|20|dir|mouvement|1,Q_SOM_01|-|21|inv|repos|2,Q_SOM_09|-|100|dir|repos|1,'
    + 'Q_SOM_02|-|24|inv|repos|1,Q_SOM_07|GEN|4..20|inv|repos|1 '
    + '6:- 7:- 8:Q_NEU_11|D|21|inv|-|1 '
    + '9:Q_STR_02|-|10..50|inv|-|1 '
    + '10:Q_INF_03|DA|40|inv|-|1,Q_INF_03|NA|40|inv|-|1,Q_INF_03|SE|40|inv|-|1 '
    + '11:- 12:Q_INF_03|ME|40|inv|-|1',
  v19:
    '1:Q_ALI_01|sans:RYTHME_CHRONO|83|dir|-|1 2:- 3:Q_ALI_01|RYTHME_CHRONO|7|dir|-|1 '
    + '4:Q_GAS_01|-|93|inv|-|1,Q_INF_01|-|96|inv|-|1 '
    + '5:Q_MOD_01|ACTIVITE_PHYSIQUE|20|dir|mouvement|1,Q_SOM_01|-|21|inv|repos|2,Q_SOM_09|-|100|dir|repos|1,'
    + 'Q_SOM_02|-|24|inv|repos|1,Q_SOM_07|GEN|4..20|inv|repos|1 '
    + '6:- 7:- 8:Q_NEU_11|D|21|inv|-|1 '
    + '9:Q_STR_02|-|10..50|inv|-|1 '
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
    expect(MAPPING_PAR_VERSION.v16).not.toBe(MAPPING_PAR_VERSION.v17);
    expect(MAPPING_PAR_VERSION.v18).not.toBe(MAPPING_PAR_VERSION.v19);
  });

  it('les deux positions du drapeau restent couvertes', () => {
    expect(Object.keys(MAPPING_PAR_VERSION)).toEqual(expect.arrayContaining(['v18', 'v19']));
  });
});
