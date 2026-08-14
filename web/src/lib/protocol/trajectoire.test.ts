import { describe, expect, it } from 'vitest';
import {
  construireTrajectoire,
  rattacherReperesAuxCycles,
  resoudreComparaison,
  type TrajectoireCycle,
  type TrajectoireEpisode,
} from './trajectoire';

// Même fixture rawAnswers que depuisPrisma.test.ts : PSS-10 complet, source
// vivante du besoin 9, donc scoreGlobal non-null (le Pichot ne l'est plus en v4).
const RAW = {
  P1: '2', P2: '2', P3: '3', P4: '3', P5: '3',
  P6: '2', P7: '3', P8: '3', P9: '2', P10: '3',
};
const reponse = (iso: string) => ({
  idQuestionnaire: 'Q_STR_02',
  dateReponse: new Date(iso),
  scoresJson: { rawAnswers: RAW },
});
// `cycleId` / `versionScore` sont stockés depuis le gate G2 : par défaut la
// fixture représente une ligne écrite APRÈS le gate (cycle = son propre id,
// version figée). Les cas hérités passent explicitement null.
const t0 = (
  id: string,
  iso: string,
  overrides: Partial<Pick<TrajectoireEpisode, 'cycleId' | 'versionScore'>> = {},
): TrajectoireEpisode => ({
  id,
  milestone: 'T0',
  confirmedAt: new Date(iso),
  cycleId: overrides.cycleId === undefined ? id : overrides.cycleId,
  versionScore: overrides.versionScore === undefined ? 'v1' : overrides.versionScore,
});

describe('construireTrajectoire (C2B LOT-09)', () => {
  it('aucun épisode → aucun cycle, comparaison indisponible', () => {
    const tr = construireTrajectoire({ episodes: [], reponses: [] });
    expect(tr.cycles).toHaveLength(0);
    expect(tr.comparaison).toEqual({ disponible: false, raison: 'aucun_cycle' });
  });

  // Ce cas asseyait le constat F1 au lieu de le prévenir : une réponse unique à
  // T0 produisait J21/J42/J90 « mesurés » à la valeur de T0 et un momentum
  // « stable (écart 0) ». Depuis le lot 1, un jalon sans réponse nouvelle est
  // non mesuré (A8-2) et le momentum reste null faute de seconde lecture.
  it('un cycle T0 sans réponse ultérieure → T0 seul mesuré, aucun momentum (F1)', () => {
    const tr = construireTrajectoire({
      episodes: [t0('ep_T0', '2026-01-01T00:00:00.000Z')],
      reponses: [reponse('2026-01-01T00:00:00.000Z')],
    });
    expect(tr.cycles).toHaveLength(1);
    const cycle = tr.cycles[0];
    // T0 mesuré (réponse ≤ T0) → valeur non-null.
    expect(cycle.jalons.find((j) => j.jalon === 'T0')?.mesure).toBe(true);
    for (const jalon of ['J21', 'J42', 'J90'] as const) {
      expect(cycle.jalons.find((j) => j.jalon === jalon)?.mesure).toBe(false);
      expect(cycle.jalons.find((j) => j.jalon === jalon)?.valeur).toBeNull();
    }
    expect(cycle.momentum).toBeNull();
    expect(cycle.versionScore).toBe('v1');
    expect(tr.comparaison).toEqual({ disponible: false, raison: 'un_seul_cycle' });
  });

  it('une réponse nouvelle à J21 → J21 mesuré et momentum calculé', () => {
    const tr = construireTrajectoire({
      episodes: [t0('ep_T0', '2026-01-01T00:00:00.000Z')],
      reponses: [reponse('2026-01-01T00:00:00.000Z'), reponse('2026-01-22T00:00:00.000Z')],
    });
    const cycle = tr.cycles[0];
    expect(cycle.jalons.find((j) => j.jalon === 'J21')?.mesure).toBe(true);
    expect(cycle.momentum).not.toBeNull();
    // Aucune réponse après J21 : les jalons suivants restent non mesurés.
    expect(cycle.jalons.find((j) => j.jalon === 'J42')?.mesure).toBe(false);
  });

  it('jalon sans couverture → « non mesuré », jamais un 0 (A8-2)', () => {
    // Réponse au 2026-02-01 : le jalon T0 (2026-01-01) n'a aucune couverture.
    const tr = construireTrajectoire({
      episodes: [t0('ep_T0', '2026-01-01T00:00:00.000Z')],
      reponses: [reponse('2026-02-01T00:00:00.000Z')],
    });
    const jalonT0 = tr.cycles[0].jalons.find((j) => j.jalon === 'T0');
    expect(jalonT0?.mesure).toBe(false);
    expect(jalonT0?.valeur).toBeNull();
  });

  it('deux cycles même version → comparaison disponible (A8-5-ii)', () => {
    const tr = construireTrajectoire({
      episodes: [t0('ep_a', '2026-01-01T00:00:00.000Z'), t0('ep_b', '2026-03-01T00:00:00.000Z')],
      reponses: [reponse('2026-01-01T00:00:00.000Z')],
    });
    expect(tr.cycles).toHaveLength(2);
    expect(tr.comparaison.disponible).toBe(true);
    expect(tr.comparaison.raison).toBe('comparable');
  });

  it('garde A8-3 : deux cycles de versionScore différents → « non comparable »', () => {
    const cycle = (id: string, versionScore: string | null): TrajectoireCycle => ({
      cycleId: id,
      dateT0: '2026-01-01T00:00:00.000Z',
      versionScore,
      jalons: [],
      momentum: null,
        momentumParBesoin: [],
    });
    expect(resoudreComparaison([cycle('a', 'v1'), cycle('b', 'v2')])).toEqual({
      disponible: false,
      raison: 'versions_differentes',
    });
    expect(resoudreComparaison([cycle('a', 'v1'), cycle('b', 'v1')])).toEqual({
      disponible: true,
      raison: 'comparable',
    });
    // Gate G2 : une version inconnue n'est JAMAIS assimilée à la version
    // courante — sinon la garde A8-3 redevient indéclenchable.
    expect(resoudreComparaison([cycle('a', 'v1'), cycle('b', null)])).toEqual({
      disponible: false,
      raison: 'version_inconnue',
    });
    expect(resoudreComparaison([cycle('a', null), cycle('b', null)])).toEqual({
      disponible: false,
      raison: 'version_inconnue',
    });
  });

  it('gate G2 : la version LUE sur l’épisode fait foi, pas la constante courante', () => {
    const tr = construireTrajectoire({
      episodes: [
        t0('ep_a', '2026-01-01T00:00:00.000Z', { versionScore: 'v1' }),
        t0('ep_b', '2026-03-01T00:00:00.000Z', { versionScore: 'v2' }),
      ],
      reponses: [reponse('2026-01-01T00:00:00.000Z')],
    });
    expect(tr.cycles.map((c) => c.versionScore)).toEqual(['v1', 'v2']);
    expect(tr.comparaison).toEqual({ disponible: false, raison: 'versions_differentes' });
  });

  it('gate G2 : ligne héritée sans version stockée → cycle « version inconnue »', () => {
    const tr = construireTrajectoire({
      episodes: [t0('ep_legacy', '2026-01-01T00:00:00.000Z', { cycleId: null, versionScore: null })],
      reponses: [reponse('2026-01-01T00:00:00.000Z')],
    });
    expect(tr.cycles[0].versionScore).toBeNull();
    // Sans cycleId stocké, le cycle d'un T0 reste identifié par son propre id.
    expect(tr.cycles[0].cycleId).toBe('ep_legacy');
    expect(tr.index[0].cycleId).toBeNull();
  });
});

describe('rattacherReperesAuxCycles (index navigable)', () => {
  const cycle = (id: string, dateT0: string): TrajectoireCycle => ({
    cycleId: id,
    dateT0,
    versionScore: 'v1',
    jalons: [],
    momentum: null,
        momentumParBesoin: [],
  });

  it('rattache chaque repère au dernier T0 antérieur ou égal', () => {
    const reperes = rattacherReperesAuxCycles(
      [
        { milestone: 'T0', date: '2026-01-01T00:00:00.000Z', cycleId: null },
        { milestone: 'J21', date: '2026-01-22T00:00:00.000Z', cycleId: null },
        { milestone: 'T0', date: '2026-03-01T00:00:00.000Z', cycleId: null },
        { milestone: 'J21', date: '2026-03-22T00:00:00.000Z', cycleId: null },
      ],
      [cycle('ep_a', '2026-01-01T00:00:00.000Z'), cycle('ep_b', '2026-03-01T00:00:00.000Z')],
    );
    expect(reperes.map((r) => r.cycleId)).toEqual(['ep_a', 'ep_a', 'ep_b', 'ep_b']);
  });

  it('un repère antérieur à tout T0 reste non rattaché, jamais rangé dans le premier cycle', () => {
    const reperes = rattacherReperesAuxCycles(
      [{ milestone: 'J21', date: '2025-12-01T00:00:00.000Z', cycleId: null }],
      [cycle('ep_a', '2026-01-01T00:00:00.000Z')],
    );
    expect(reperes[0].cycleId).toBeNull();
  });

  it('ne rattache jamais un repère à un cycle postérieur', () => {
    const reperes = rattacherReperesAuxCycles(
      [{ milestone: 'J21', date: '2026-02-01T00:00:00.000Z', cycleId: null }],
      [cycle('ep_b', '2026-03-01T00:00:00.000Z'), cycle('ep_a', '2026-01-01T00:00:00.000Z')],
    );
    // Ordre d'entrée volontairement non chronologique : le rattachement ne doit
    // pas dépendre de l'ordre du tableau de cycles.
    expect(reperes[0].cycleId).toBe('ep_a');
  });

  it('date illisible → repère non rattaché plutôt qu’une affectation devinée', () => {
    const reperes = rattacherReperesAuxCycles(
      [{ milestone: 'T0', date: 'pas-une-date', cycleId: null }],
      [cycle('ep_a', '2026-01-01T00:00:00.000Z')],
    );
    expect(reperes[0].cycleId).toBeNull();
  });

  it('gate G2 : le cycleId STOCKÉ prime sur le rattachement par date', () => {
    const reperes = rattacherReperesAuxCycles(
      // Repère postérieur au T0 de ep_b, mais rattaché en base à ep_a : la
      // donnée stockée fait foi, le repli par date ne la corrige pas.
      [{ milestone: 'J21', date: '2026-03-22T00:00:00.000Z', cycleId: 'ep_a' }],
      [cycle('ep_a', '2026-01-01T00:00:00.000Z'), cycle('ep_b', '2026-03-01T00:00:00.000Z')],
    );
    expect(reperes[0].cycleId).toBe('ep_a');
  });

  it('aucun cycle → aucun rattachement, mais les repères restent listés', () => {
    const reperes = rattacherReperesAuxCycles([{ milestone: 'T0', date: '2026-01-01T00:00:00.000Z', cycleId: null }], []);
    expect(reperes).toHaveLength(1);
    expect(reperes[0].cycleId).toBeNull();
  });
});
