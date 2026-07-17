import { describe, expect, it } from 'vitest';
import { FRICTIONS, LONGUEUR_MAX_MOT_LIBRE } from './frictionRegistry';
import {
  buildSilenceUtileMessage,
  createTrialTrace,
  declarePatientPause,
  frictionLabel,
} from './trace';
import type { TraceIssue } from './types';

const base = {
  traceId: 'trace-1',
  episodeId: 'ep-1',
  localDate: '2026-07-21',
  occasionPresentee: true,
  faisable: true,
};

describe('createTrialTrace — les quatre issues (amendement terrain n° 1)', () => {
  it.each<TraceIssue>(['fait', 'adapte', 'partiel_empeche', 'oublie_non_note'])(
    'accepte l’issue « %s » comme donnée, pas comme échec',
    issue => {
      const trace = createTrialTrace({
        ...base,
        issue,
        frictionCode: issue === 'partiel_empeche' ? 'F1' : undefined,
      });
      expect(trace.issue).toBe(issue);
      expect(trace.frictionsVersion).toBe('frictions-v1');
    }
  );

  it('refuse une issue hors des quatre valeurs', () => {
    expect(() =>
      createTrialTrace({ ...base, issue: 'echec' as TraceIssue })
    ).toThrow(/Issue de trace inconnue/);
  });

  it('exige une friction fermée pour « en partie / empêché·e »', () => {
    expect(() => createTrialTrace({ ...base, issue: 'partiel_empeche' })).toThrow(
      /friction/
    );
    const trace = createTrialTrace({ ...base, issue: 'partiel_empeche', frictionCode: 'F3' });
    expect(trace.frictionCode).toBe('F3');
  });

  it('refuse une friction hors registre v1', () => {
    expect(() =>
      createTrialTrace({ ...base, issue: 'partiel_empeche', frictionCode: 'F9' })
    ).toThrow(/registre v1/);
  });

  it('le mot libre est optionnel et court — jamais requis, borné', () => {
    const sans = createTrialTrace({ ...base, issue: 'adapte' });
    expect(sans.motLibre).toBeUndefined();
    const avec = createTrialTrace({ ...base, issue: 'adapte', motLibre: 'remplacé par des noix' });
    expect(avec.motLibre).toBe('remplacé par des noix');
    expect(() =>
      createTrialTrace({ ...base, issue: 'adapte', motLibre: 'a'.repeat(LONGUEUR_MAX_MOT_LIBRE + 1) })
    ).toThrow(/court/);
  });

  it('sans occasion présentée, la faisabilité est sans objet', () => {
    const trace = createTrialTrace({
      ...base,
      occasionPresentee: false,
      faisable: true,
      issue: 'oublie_non_note',
    });
    expect(trace.faisable).toBeNull();
  });
});

describe('registre de frictions v1 (JA-00 A2)', () => {
  it('porte les huit catégories fermées en français patient', () => {
    expect(Object.keys(FRICTIONS)).toEqual(['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8']);
    expect(frictionLabel('F1')).toBe('Pas le temps, journée trop chargée');
    expect(frictionLabel('F8')).toBe('Autre');
  });

  it('refuse un code hors registre', () => {
    expect(() => frictionLabel('F0')).toThrow(/registre v1/);
  });
});

describe('pause déclarée par le patient (amendement terrain n° 2)', () => {
  it('« je n’ai pas pu cette semaine » est un événement volontaire, motif optionnel fermé', () => {
    const sansMotif = declarePatientPause({
      eventId: 'pause-1',
      episodeId: 'ep-1',
      semaineDu: '2026-07-20',
    });
    expect(sansMotif.motifCode).toBeUndefined();
    const avecMotif = declarePatientPause({
      eventId: 'pause-2',
      episodeId: 'ep-1',
      semaineDu: '2026-07-20',
      motifCode: 'F7',
    });
    expect(avecMotif.motifCode).toBe('F7');
    expect(() =>
      declarePatientPause({
        eventId: 'pause-3',
        episodeId: 'ep-1',
        semaineDu: '2026-07-20',
        motifCode: 'X1',
      })
    ).toThrow(/registre v1/);
  });
});

describe('silence utile (droit au silence, JA-0T 5/5)', () => {
  it('l’instrument sait dire qu’on en sait assez', () => {
    expect(buildSilenceUtileMessage()).toBe('Rien à noter aujourd’hui, nous en savons assez.');
  });
});
