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
    const result = calculerNiveauPreuveBesoin(5, { Q_SOM_01: { P1: '1' } });
    expect(result).toBe('A');
  });

  it('besoin 5 avec sources A+B répondues doit retomber au plus faible (B)', () => {
    const result = calculerNiveauPreuveBesoin(5, { Q_SOM_01: { P1: '1' }, Q_MOD_01: { ACT1: '1' } });
    expect(result).toBe('B');
  });

  it('listerSourcesPreuveBesoin ne renvoie que les sources effectivement répondues', () => {
    const sources = listerSourcesPreuveBesoin(5, { Q_SOM_01: { P1: '1' } });
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
  const PSQI = { Q_SOM_01: { P1: '1' } };

  it('un agenda sous son seuil de nuits ne dégrade plus le niveau de preuve', () => {
    // Vaut 'B' avant ce correctif : l'agenda (grade B) comptait sans mesure et
    // tirait le besoin vers le bas, sous la règle du plus faible.
    expect(calculerNiveauPreuveBesoin(5, { ...PSQI, ...AGENDA_INSUFFISANT })).toBe('A');
  });

  it('un agenda EXPLOITABLE dégrade toujours — anti-sur-filtrage', () => {
    // Sans ce contrôle, un prédicat qui écarterait TOUT agenda passerait le test
    // ci-dessus au vert en supprimant la source au lieu de la qualifier.
    const agendaComplet = { Q_SOM_09: reponsesAgendaComplet() };
    expect(calculerCouvertureSource(BESOIN_SOURCES[5][2], agendaComplet)).not.toBeNull();
    expect(calculerNiveauPreuveBesoin(5, { ...PSQI, ...agendaComplet })).toBe('B');
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

  it('« répondu mais vide » compte toujours — ce lot ne traite pas ce cas', () => {
    // `{}` est truthy et score `total: 0` : couverture 0, pas null. Avant comme
    // après. À ne pas présenter comme corrigé.
    expect(calculerNiveauPreuveBesoin(5, { Q_SOM_01: {} })).toBe('A');
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
      { Q_GAS_01: { G1: '1' } },
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
