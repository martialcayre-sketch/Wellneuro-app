import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ContradictionAffichee } from '../clinical/contradictionsService';

// Banc du chargeur des préconditions T0 — H98 ([[D-450]] §6) : à l'arrivée de
// la forme `CONVERGENCE`, un accord de sources ne doit pas devenir une
// « contradiction ouverte » du T0. Ce chargeur recopiait tous les constats
// reçus sans lire leur forme.

const { prismaMock, contradictionsMock } = vi.hoisted(() => ({
  prismaMock: {
    questionnaireReponse: { findMany: vi.fn() },
    consultation: { findFirst: vi.fn() },
    syntheseIA: { findFirst: vi.fn() },
    assignation: { findMany: vi.fn() },
    assessmentEpisode: { findFirst: vi.fn() },
  },
  contradictionsMock: vi.fn(),
}));

vi.mock('../prisma', () => ({ prisma: prismaMock }));
vi.mock('../clinical/contradictionsService', () => ({ contradictionsPourPatient: contradictionsMock }));

import { chargerEntreesPreconditionsT0 } from './preconditionsT0Prisma';

function affichee(surcharge: Partial<ContradictionAffichee>): ContradictionAffichee {
  return {
    id: 'C-STR',
    forme: 'DISCORDANCE',
    description: 'Les deux instruments ne concordent pas.',
    actionSuggeree: 'Clarifier en entretien.',
    hypotheses: [],
    limitations: [],
    passations: [{ idQuestionnaire: 'Q_STR_02', date: '2026-11-05', dateLisible: '05/11/2026' }],
    ecartJours: null,
    claims: [{ claimId: 'WN-CL-0001-001', versionClaim: 'v1.0' }],
    importance: 'useful_not_urgent',
    resolution: { statut: 'ouverte' },
    regleId: 'C-STR',
    ...surcharge,
  };
}

beforeEach(() => {
  prismaMock.questionnaireReponse.findMany.mockResolvedValue([]);
  prismaMock.consultation.findFirst.mockResolvedValue(null);
  prismaMock.syntheseIA.findFirst.mockResolvedValue(null);
  prismaMock.assignation.findMany.mockResolvedValue([]);
  prismaMock.assessmentEpisode.findFirst.mockResolvedValue(null);
});

describe('préconditions T0 — une convergence n’est pas une contradiction ouverte (H98)', () => {
  it('la discordance reste recopiée, la convergence est écartée', async () => {
    contradictionsMock.mockResolvedValue([
      affichee({}),
      affichee({ id: 'CONV-B5', regleId: 'CONV-B5', forme: 'CONVERGENCE', description: 'Sur le besoin 5…', graduation: 'SIGNAL' }),
    ]);
    const entrees = await chargerEntreesPreconditionsT0('patient-fixture');
    expect(entrees.contradictionsOuvertes).toEqual([
      { description: 'Les deux instruments ne concordent pas.', passations: ['Q_STR_02 — 05/11/2026'] },
    ]);
  });

  it('des convergences seules laissent la condition satisfaite', async () => {
    contradictionsMock.mockResolvedValue([
      affichee({ id: 'CONV-B1', regleId: 'CONV-B1', forme: 'CONVERGENCE', graduation: 'SIGNAL' }),
    ]);
    const entrees = await chargerEntreesPreconditionsT0('patient-fixture');
    expect(entrees.contradictionsOuvertes).toEqual([]);
  });
});
