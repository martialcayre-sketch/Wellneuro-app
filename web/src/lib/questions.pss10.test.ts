import { describe, expect, it } from 'vitest';
import { QUESTIONNAIRE_CATALOGUE } from './questions';

// Épingle la définition SERVIE de Q_STR_02 (PSS-10) après la purge du code
// mort de questionnaires/stress.ts (arbitrage utilisateur du 2026-07-23) :
// la référence est l'inline /50 (items 1-5, source Drive certifiée). Si ce
// test casse, la définition servie aux patients a changé — c'est un
// changement clinique qui exige un arbitrage explicite et CHANGELOG.md.
describe('Q_STR_02 — PSS-10 servie (/50, items 1-5)', () => {
  const def = (QUESTIONNAIRE_CATALOGUE as Record<string, any>).Q_STR_02;

  it('existe et porte 10 questions en une section', () => {
    expect(def).toBeDefined();
    expect(def.sections).toHaveLength(1);
    expect(def.sections[0].questions).toHaveLength(10);
  });

  it('score /50, certifié, bandes 10-20 / 21-26 / 27-50', () => {
    expect(def.scoring.maxTotal).toBe(50);
    expect(def.scoring.certification.status).toBe('certifie');
    expect(def.scoring.interpretation.map((b: any) => [b.min, b.max])).toEqual([
      [10, 20],
      [21, 26],
      [27, 50],
    ]);
  });

  it('items directs cotés 1→5, items inversés (P4, P5, P7, P8) cotés 5→1', () => {
    const parId = new Map(def.sections[0].questions.map((q: any) => [q.id, q]));
    expect((parId.get('P1') as any).options.map((o: any) => o.v)).toEqual([1, 2, 3, 4, 5]);
    for (const id of ['P4', 'P5', 'P7', 'P8']) {
      expect((parId.get(id) as any).options.map((o: any) => o.v), id).toEqual([5, 4, 3, 2, 1]);
    }
  });
});
