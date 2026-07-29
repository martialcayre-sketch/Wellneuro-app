import { describe, it, expect } from 'vitest';
import { calculerNiveauPreuveBesoin, listerSourcesPreuveBesoin } from './evidence';
import { calculerCouvertureBesoin, calculerCouvertureSource } from './score';
import { BESOIN_SOURCES, NIVEAU_PREUVE_PAR_SOURCE } from './constants';

/**
 * Agenda du sommeil clôturé : 21 nuits et ses agrégats. Au-dessus du seuil de
 * 5 nuits, le moteur agrège et rend un total — la source devient exploitable.
 */
function reponsesAgendaComplet(): Record<string, number> {
  return {
    AGD_NB_NUITS: 21, AGD_TIB_MOY: 480, AGD_TST_MOY: 450, AGD_EFF_MOY: 94,
    AGD_LAT_MED: 15, AGD_REV_MOY: 0.5, AGD_REG_ECT: 30, AGD_QUAL_MOY: 4,
  };
}

/**
 * Réponses aux identifiants RÉELS des instruments.
 *
 * Les fixtures de ce banc écrivaient `{ Q_SOM_01: { P1: '1' } }`,
 * `{ Q_MOD_01: { ACT1: '1' } }` et `{ Q_GAS_01: { G1: '1' } }` — trois clés qui
 * n'existent dans AUCUN de ces instruments. Le moteur n'en reconnaissait donc
 * rien, sortait 0 partout, et `calculerNiveauPreuveBesoin` rendait « preuve de
 * niveau A » sur une passation qui ne mesure rien. La garde de passation vide
 * (2026-07-29) le refuse : le banc mesure désormais ce qu'il annonce.
 */
// Les DIX-HUIT items du PSQI. Cette fixture n'en portait que huit, et omettait
// Q5a puis Q5b à Q5j — la composante « perturbations » en entier. Elle décrochait
// pourtant un grade A pour le besoin 5, sur un instrument dont une composante sur
// sept n'avait aucune réponse : la même classe de défaut que les trois
// identifiants inexistants du commentaire ci-dessus, un cran plus fin. Depuis le
// 2026-07-29, une composante sans aucun item vaut « non mesurée » et fait tomber
// le total du PSQI ; la fixture mesure donc enfin ce qu'elle annonce.
const PSQI_REPONDU = {
  Q1: 23, Q2: 15, Q3: 7, Q4: 7, Q5a: 0,
  Q5b: 0, Q5c: 0, Q5d: 0, Q5e: 0, Q5f: 0, Q5g: 0, Q5h: 0, Q5i: 0, Q5j: 0,
  Q6: 1, Q7: 0, Q8: 0, Q9: 1,
};
/** Le même PSQI privé de sa seule composante « perturbations du sommeil ». */
const PSQI_SANS_C5 = Object.fromEntries(
  Object.entries(PSQI_REPONDU).filter(([id]) => !/^Q5[b-j]$/.test(id)));
// La source `Q_MOD_01` du besoin 5 lit la sous-échelle ACTIVITE_PHYSIQUE, et non
// SOMMEIL : une fixture qui renseigne l'autre sous-échelle rendrait le même verdict
// aujourd'hui, mais par accident — et rougirait au premier lot qui fera passer un
// sous-score sans item répondu à `null`, pour une raison étrangère à ce qu'elle
// énonce. Relevé par la revue adversariale du 2026-07-29.
const MODE_VIE_REPONDU = {
  ACTIVITE_PHYSIQUE_Q001: 2, ACTIVITE_PHYSIQUE_Q002: 2, ACTIVITE_PHYSIQUE_Q003: 2,
  ACTIVITE_PHYSIQUE_Q004: 2, ACTIVITE_PHYSIQUE_Q005: 2,
};
const TFD_REPONDU = { C1_1: 1, C1_2: 1, C1_3: 0 };

describe('evidence — niveaux de preuve par besoin', () => {
  it('besoin sans réponse doit être NON_MESURE', () => {
    const result = calculerNiveauPreuveBesoin(5, {});
    expect(result).toBe('NON_MESURE');
  });

  it('besoin 3 (aucune source mappée) doit rester NON_MESURE même avec des réponses ailleurs', () => {
    const result = calculerNiveauPreuveBesoin(3, { Q_ALI_01: { MO1: '4' } });
    expect(result).toBe('NON_MESURE');
  });

  it('besoin 5 avec seule source Q_SOM_01 répondue doit être A', () => {
    const result = calculerNiveauPreuveBesoin(5, { Q_SOM_01: PSQI_REPONDU });
    expect(result).toBe('A');
  });

  it('un PSQI amputé d’une composante entière ne vaut plus preuve de niveau A', () => {
    // La contrepartie de la fixture ci-dessus. Neuf des dix-huit items — dont
    // aucun de la composante « perturbations » — rendaient un total sur 21 et un
    // grade A. Le total tombe désormais, et le besoin avec lui : mieux vaut
    // « non mesuré » qu'une preuve de premier rang bâtie sur les six septièmes
    // d'un instrument.
    expect(calculerNiveauPreuveBesoin(5, { Q_SOM_01: PSQI_SANS_C5 })).toBe('NON_MESURE');
    expect(listerSourcesPreuveBesoin(5, { Q_SOM_01: PSQI_SANS_C5 })).toHaveLength(0);
  });

  it('besoin 5 avec sources A+B répondues doit retomber au plus faible (B)', () => {
    const result = calculerNiveauPreuveBesoin(5, { Q_SOM_01: PSQI_REPONDU, Q_MOD_01: MODE_VIE_REPONDU });
    expect(result).toBe('B');
  });

  it('listerSourcesPreuveBesoin ne renvoie que les sources effectivement répondues', () => {
    const sources = listerSourcesPreuveBesoin(5, { Q_SOM_01: PSQI_REPONDU });
    expect(sources).toHaveLength(1);
    expect(sources[0]?.idQuestionnaire).toBe('Q_SOM_01');
    expect(sources[0]?.grade).toBe('A');
  });
});

// ── Répondu ne veut pas dire exploitable (2026-07-28) ───────────────────────
//
// Le prédicat était `Boolean(reponses[idQuestionnaire])` : il ignorait
// `sousScore` et ignorait l'échec de scoring. Un besoin pouvait donc afficher un
// grade de preuve alors que `score.ts` le tenait déjà pour NON COUVERT — un
// badge fabriqué, exposé au praticien par `api/praticien/besoins`.
describe('evidence — une source répondue mais non exploitable ne compte pas', () => {
  // L'agenda du sommeil est le seul moteur du catalogue à rendre `{scored:false}`
  // sans total : sous 5 nuits, il n'y a pas de mesure. C'est donc le cas vivant.
  const AGENDA_INSUFFISANT = { Q_SOM_09: { AGD_NB_NUITS: 3 } };
  const PSQI = { Q_SOM_01: PSQI_REPONDU };

  it('un agenda sous son seuil de nuits ne dégrade plus le niveau de preuve', () => {
    // Vaut 'B' avant ce correctif : l'agenda (grade B) comptait sans mesure et
    // tirait le besoin vers le bas, sous la règle du plus faible.
    expect(calculerNiveauPreuveBesoin(5, { ...PSQI, ...AGENDA_INSUFFISANT })).toBe('A');
  });

  it('un agenda EXPLOITABLE dégrade toujours — anti-sur-filtrage', () => {
    // Sans ce contrôle, un prédicat qui écarterait TOUT agenda passerait le test
    // ci-dessus au vert en supprimant la source au lieu de la qualifier.
    // Dégrade à 'D' depuis le 2026-07-27 : l'indice composite de l'agenda est une
    // construction WellNeuro non validée (auparavant classé 'B' à tort, au niveau
    // de son support). Le PSQI reste 'A' ; la règle du plus faible tire donc le
    // besoin à 'D' dès que l'agenda contribue.
    const agendaComplet = { Q_SOM_09: reponsesAgendaComplet() };
    const sourceAgenda = BESOIN_SOURCES[5].find(s => s.idQuestionnaire === 'Q_SOM_09')!;
    expect(calculerCouvertureSource(sourceAgenda, agendaComplet)).not.toBeNull();
    expect(calculerNiveauPreuveBesoin(5, { ...PSQI, ...agendaComplet })).toBe('D');
  });

  it('seule source non exploitable : NON_MESURE, et aucune source listée', () => {
    expect(listerSourcesPreuveBesoin(5, AGENDA_INSUFFISANT)).toEqual([]);
    expect(calculerNiveauPreuveBesoin(5, AGENDA_INSUFFISANT)).toBe('NON_MESURE');
  });

  it('un sous-score partiellement répondu reste compté', () => {
    // Le besoin 10 lit trois sous-scores de `Q_INF_03`. Le moteur `subscore` les
    // émet toujours : une passation incomplète ne doit PAS être rétrogradée en
    // silence par le nouveau prédicat.
    expect(calculerNiveauPreuveBesoin(10, { Q_INF_03: { D1: '4' } })).toBe('B');
  });

  it('« répondu mais vide » ne dépend plus du moteur — aucun ne compte', () => {
    // Ce test disait l'inverse jusqu'au 2026-07-29 : `psqi` scorait 0 sur `{}` et
    // la source comptait, tandis que les moteurs `sum` portaient déjà la garde
    // anti-zéro et rendaient `null`. La règle était donc « ça dépend du moteur »,
    // ce qui n'est pas une règle mais l'aveu d'un trou : dix-sept moteurs sur
    // dix-neuf fabriquaient une preuve à partir de rien.
    //
    // La garde est désormais posée avant la répartition par moteur. Un `{}` ne
    // mesure rien, quel que soit l'instrument.
    expect(calculerNiveauPreuveBesoin(5, { Q_SOM_01: {} })).toBe('NON_MESURE');
    expect(calculerNiveauPreuveBesoin(4, { Q_INF_01: {} })).toBe('NON_MESURE');

    // Et une passation dont AUCUNE clé n'appartient à l'instrument ne vaut pas
    // mieux qu'un `{}` : c'est le cas vivant en production, celui des passations
    // `AL*` relues sous la forme SIIN.
    expect(calculerNiveauPreuveBesoin(5, { Q_SOM_01: { CLE_INCONNUE: '3' } })).toBe('NON_MESURE');
  });

  it('BESOIN 1 : une passation `AL*` relue sous la forme SIIN cesse d’être une preuve', () => {
    // LE cas de la campagne, et le seul vivant en production : 8 passations
    // portent des clés `AL1`–`AL14`. Drapeau éteint, la forme courte les
    // reconnaît et le besoin 1 vaut 'B'. Drapeau allumé, la forme SIIN n'en
    // reconnaît aucune, le moteur rend `total: null` (garde anti-zéro de #430)
    // et le besoin devient NON_MESURE — au lieu d'afficher une preuve sur une
    // mesure que `score.ts` tenait déjà pour absente. Le besoin 1 est une
    // FONDATION CRITIQUE : c'est là que le badge fabriqué coûtait le plus.
    const passationCourte = { Q_ALI_01: { AL1: '1', AL2: '2', AL5: '3' } };
    const attendu = process.env.WN_ALI_01_SIIN57 === 'true' ? 'NON_MESURE' : 'B';
    expect(calculerNiveauPreuveBesoin(1, passationCourte)).toBe(attendu);
    // Et la cohérence avec le score, dans les deux positions.
    expect(calculerCouvertureBesoin(1, passationCourte) === null).toBe(attendu === 'NON_MESURE');
  });

  it('INVARIANT : NON_MESURE si et seulement si le besoin n’est pas couvert', () => {
    // C'est la propriété que le correctif rétablit entre les deux modules. Le
    // membre droit est l'agrégat PUBLIC de `score.ts` — surtout pas
    // `calculerCouvertureSource`, qui serait l'appel qu'on vient de tester.
    const jeux: Array<Record<string, Record<string, string | number>>> = [
      {},
      PSQI,
      AGENDA_INSUFFISANT,
      { ...PSQI, ...AGENDA_INSUFFISANT },
      { Q_SOM_09: reponsesAgendaComplet() },
      { Q_INF_03: { D1: '4' } },
      { Q_GAS_01: TFD_REPONDU },
      // Le cas de la campagne DOIT figurer dans la matrice : sans lui,
      // `test:siin57` passait à côté du seul dossier réellement concerné.
      { Q_ALI_01: { AL1: '1', AL2: '2' } },
      { Q_INF_01: {} },
      // Clés SIIN : sans elles, `test:siin57` passait à côté du besoin 3, seul
      // besoin dont la mesure dépend de la position du drapeau.
      { Q_ALI_01: { SIIN52: 1, SIIN53: 1, SIIN54: 12, SIIN55: 1 } },
      { Q_ALI_01: { SIIN54: 12 } },
      { Q_ALI_01: { SIIN01: 13, SIIN08: 6 } },
    ];
    for (const besoinId of Object.keys(BESOIN_SOURCES).map(Number)) {
      for (const reponses of jeux) {
        const nonMesure = calculerNiveauPreuveBesoin(besoinId, reponses) === 'NON_MESURE';
        const nonCouvert = calculerCouvertureBesoin(besoinId, reponses) === null;
        expect(
          nonMesure,
          `besoin ${besoinId} : preuve et couverture divergent sur ${JSON.stringify(reponses)}`,
        ).toBe(nonCouvert);
      }
    }
  });
});

// Invariant ajouté par la revue adversariale du 2026-07-27 : le retrait de
// Q_SOM_06 de NIVEAU_PREUVE_PAR_SOURCE se justifiait par « une clé orpheline
// affirmerait que le Pichot reste une source de Mon équilibre ». La propriété
// était revendiquée en commentaire sans que rien ne la garde — le garde du
// registre contrôle le registre, pas cette table.
describe('cohérence NIVEAU_PREUVE_PAR_SOURCE ↔ BESOIN_SOURCES', () => {
  const idsSources = new Set(
    Object.values(BESOIN_SOURCES).flat().map(source => source.idQuestionnaire)
  );

  it('aucune clé orpheline : tout niveau de preuve déclaré correspond à une source vivante', () => {
    const orphelines = Object.keys(NIVEAU_PREUVE_PAR_SOURCE).filter(id => !idsSources.has(id));
    expect(orphelines).toEqual([]);
  });

  it('aucune source muette : toute source de BESOIN_SOURCES déclare son niveau de preuve', () => {
    const sansNiveau = [...idsSources].filter(id => !(id in NIVEAU_PREUVE_PAR_SOURCE));
    expect(sansNiveau).toEqual([]);
  });
});
