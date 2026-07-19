import { describe, expect, it } from 'vitest';
import {
  construireTrajectoire,
  rattacherReperesAuxCycles,
  resoudreComparaison,
  type TrajectoireCycle,
  type TrajectoireEpisode,
} from './trajectoire';

// Même fixture rawAnswers que depuisPrisma.test.ts : produit un scoreGlobal non-null.
const RAW = { P1: '2', P2: '2', P3: '1', P4: '1', P5: '1', P6: '1', P7: '1', P8: '1' };
const reponse = (iso: string) => ({
  idQuestionnaire: 'Q_SOM_06',
  dateReponse: new Date(iso),
  scoresJson: { rawAnswers: RAW },
});
const t0 = (id: string, iso: string): TrajectoireEpisode => ({ id, milestone: 'T0', confirmedAt: new Date(iso) });

describe('construireTrajectoire (C2B LOT-09)', () => {
  it('aucun épisode → aucun cycle, comparaison indisponible', () => {
    const tr = construireTrajectoire({ episodes: [], reponses: [], versionScore: 'v1' });
    expect(tr.cycles).toHaveLength(0);
    expect(tr.comparaison).toEqual({ disponible: false, raison: 'aucun_cycle' });
  });

  it('un cycle T0 mesuré → jalons datés + momentum, comparaison « un seul cycle »', () => {
    const tr = construireTrajectoire({
      episodes: [t0('ep_T0', '2026-01-01T00:00:00.000Z')],
      reponses: [reponse('2026-01-01T00:00:00.000Z')],
      versionScore: 'v1',
    });
    expect(tr.cycles).toHaveLength(1);
    const cycle = tr.cycles[0];
    // T0 mesuré (réponse ≤ T0) → valeur non-null.
    expect(cycle.jalons.find((j) => j.jalon === 'T0')?.mesure).toBe(true);
    expect(cycle.momentum).not.toBeNull();
    expect(cycle.versionScore).toBe('v1');
    expect(tr.comparaison).toEqual({ disponible: false, raison: 'un_seul_cycle' });
  });

  it('jalon sans couverture → « non mesuré », jamais un 0 (A8-2)', () => {
    // Réponse au 2026-02-01 : le jalon T0 (2026-01-01) n'a aucune couverture.
    const tr = construireTrajectoire({
      episodes: [t0('ep_T0', '2026-01-01T00:00:00.000Z')],
      reponses: [reponse('2026-02-01T00:00:00.000Z')],
      versionScore: 'v1',
    });
    const jalonT0 = tr.cycles[0].jalons.find((j) => j.jalon === 'T0');
    expect(jalonT0?.mesure).toBe(false);
    expect(jalonT0?.valeur).toBeNull();
  });

  it('deux cycles même version → comparaison disponible (A8-5-ii)', () => {
    const tr = construireTrajectoire({
      episodes: [t0('ep_a', '2026-01-01T00:00:00.000Z'), t0('ep_b', '2026-03-01T00:00:00.000Z')],
      reponses: [reponse('2026-01-01T00:00:00.000Z')],
      versionScore: 'v1',
    });
    expect(tr.cycles).toHaveLength(2);
    expect(tr.comparaison.disponible).toBe(true);
    expect(tr.comparaison.raison).toBe('comparable');
  });

  it('garde A8-3 : deux cycles de versionScore différents → « non comparable »', () => {
    const cycle = (id: string, versionScore: string): TrajectoireCycle => ({
      cycleId: id,
      dateT0: '2026-01-01T00:00:00.000Z',
      versionScore,
      jalons: [],
      momentum: null,
    });
    expect(resoudreComparaison([cycle('a', 'v1'), cycle('b', 'v2')])).toEqual({
      disponible: false,
      raison: 'versions_differentes',
    });
    expect(resoudreComparaison([cycle('a', 'v1'), cycle('b', 'v1')])).toEqual({
      disponible: true,
      raison: 'comparable',
    });
  });
});

describe('rattacherReperesAuxCycles (index navigable)', () => {
  const cycle = (id: string, dateT0: string): TrajectoireCycle => ({
    cycleId: id,
    dateT0,
    versionScore: 'v1',
    jalons: [],
    momentum: null,
  });

  it('rattache chaque repère au dernier T0 antérieur ou égal', () => {
    const reperes = rattacherReperesAuxCycles(
      [
        { milestone: 'T0', date: '2026-01-01T00:00:00.000Z' },
        { milestone: 'J21', date: '2026-01-22T00:00:00.000Z' },
        { milestone: 'T0', date: '2026-03-01T00:00:00.000Z' },
        { milestone: 'J21', date: '2026-03-22T00:00:00.000Z' },
      ],
      [cycle('ep_a', '2026-01-01T00:00:00.000Z'), cycle('ep_b', '2026-03-01T00:00:00.000Z')],
    );
    expect(reperes.map((r) => r.cycleId)).toEqual(['ep_a', 'ep_a', 'ep_b', 'ep_b']);
  });

  it('un repère antérieur à tout T0 reste non rattaché, jamais rangé dans le premier cycle', () => {
    const reperes = rattacherReperesAuxCycles(
      [{ milestone: 'J21', date: '2025-12-01T00:00:00.000Z' }],
      [cycle('ep_a', '2026-01-01T00:00:00.000Z')],
    );
    expect(reperes[0].cycleId).toBeNull();
  });

  it('ne rattache jamais un repère à un cycle postérieur', () => {
    const reperes = rattacherReperesAuxCycles(
      [{ milestone: 'J21', date: '2026-02-01T00:00:00.000Z' }],
      [cycle('ep_b', '2026-03-01T00:00:00.000Z'), cycle('ep_a', '2026-01-01T00:00:00.000Z')],
    );
    // Ordre d'entrée volontairement non chronologique : le rattachement ne doit
    // pas dépendre de l'ordre du tableau de cycles.
    expect(reperes[0].cycleId).toBe('ep_a');
  });

  it('date illisible → repère non rattaché plutôt qu’une affectation devinée', () => {
    const reperes = rattacherReperesAuxCycles(
      [{ milestone: 'T0', date: 'pas-une-date' }],
      [cycle('ep_a', '2026-01-01T00:00:00.000Z')],
    );
    expect(reperes[0].cycleId).toBeNull();
  });

  it('aucun cycle → aucun rattachement, mais les repères restent listés', () => {
    const reperes = rattacherReperesAuxCycles([{ milestone: 'T0', date: '2026-01-01T00:00:00.000Z' }], []);
    expect(reperes).toHaveLength(1);
    expect(reperes[0].cycleId).toBeNull();
  });
});
