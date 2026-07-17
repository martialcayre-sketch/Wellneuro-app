import { describe, expect, it } from 'vitest';
import { advanceActionCareer, createActionCareer, isCareerClosed } from './actionCareer';

function careerProposee() {
  return createActionCareer({
    careerId: 'car-1',
    actionId: 'action-1',
    patientId: 'patient-jennifer-martin',
    proposedAt: '2026-07-20T09:00:00.000Z',
  });
}

describe('carrière d’action (A7-14)', () => {
  it('naît proposée, avec un historique initial', () => {
    const career = careerProposee();
    expect(career.stage).toBe('proposee');
    expect(career.historique).toEqual([{ stage: 'proposee', at: '2026-07-20T09:00:00.000Z' }]);
  });

  it('suit le cycle complet proposée → essayée → adaptée → stabilisée → intégrée', () => {
    let career = careerProposee();
    career = advanceActionCareer(career, 'essayee', '2026-07-22T09:00:00.000Z');
    career = advanceActionCareer(career, 'adaptee', '2026-07-29T09:00:00.000Z');
    career = advanceActionCareer(career, 'stabilisee', '2026-08-12T09:00:00.000Z');
    career = advanceActionCareer(career, 'integree', '2026-09-01T09:00:00.000Z');
    expect(career.stage).toBe('integree');
    expect(career.historique.map(step => step.stage)).toEqual([
      'proposee',
      'essayee',
      'adaptee',
      'stabilisee',
      'integree',
    ]);
    expect(isCareerClosed(career)).toBe(true);
  });

  it('l’abandon est informatif — accessible à chaque étape, et clôt la carrière', () => {
    const abandonTot = advanceActionCareer(careerProposee(), 'abandonnee_informative', '2026-07-21T09:00:00.000Z');
    expect(abandonTot.stage).toBe('abandonnee_informative');
    expect(isCareerClosed(abandonTot)).toBe(true);
    expect(() =>
      advanceActionCareer(abandonTot, 'essayee', '2026-07-22T09:00:00.000Z')
    ).toThrow(/interdite/);
  });

  it('une action stabilisée peut redevenir adaptée (nouveau tour)', () => {
    let career = careerProposee();
    career = advanceActionCareer(career, 'essayee', '2026-07-22T09:00:00.000Z');
    career = advanceActionCareer(career, 'stabilisee', '2026-08-12T09:00:00.000Z');
    career = advanceActionCareer(career, 'adaptee', '2026-08-20T09:00:00.000Z');
    expect(career.stage).toBe('adaptee');
  });

  it('interdit les sauts incohérents et les retours en arrière du temps', () => {
    const career = careerProposee();
    expect(() => advanceActionCareer(career, 'integree', '2026-07-22T09:00:00.000Z')).toThrow(
      /interdite/
    );
    const essayee = advanceActionCareer(career, 'essayee', '2026-07-22T09:00:00.000Z');
    expect(() =>
      advanceActionCareer(essayee, 'adaptee', '2026-07-01T09:00:00.000Z')
    ).toThrow(/chronologique/);
  });
});
