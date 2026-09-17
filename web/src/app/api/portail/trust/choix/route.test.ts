import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma, tx, authentifierPatientPortail, getDocumentCourant, traceFormulationActive } = vi.hoisted(() => ({
  prisma: { $transaction: vi.fn() },
  tx: {
    $queryRaw: vi.fn(),
    trustChoiceEvent: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
  authentifierPatientPortail: vi.fn(),
  getDocumentCourant: vi.fn(),
  traceFormulationActive: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/trust/portailAuth', () => ({ authentifierPatientPortail }));
vi.mock('@/lib/trust/contenus/registre', () => ({ getDocumentCourant }));
vi.mock('@/lib/trust/finalitesChoix', () => ({
  FORMULATION_CHOIX_VERSION: 'formulation-vtest',
  traceFormulationActive,
}));

import { POST } from './route';

function request(body: unknown): Request {
  return new Request('http://localhost/api/portail/trust/choix', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  prisma.$transaction.mockImplementation(async (op: (transaction: typeof tx) => Promise<unknown>) => op(tx));
  tx.$queryRaw.mockResolvedValue([{ id: 1 }]);
  tx.trustChoiceEvent.findFirst.mockResolvedValue(null);
  tx.trustChoiceEvent.create.mockResolvedValue({});
  authentifierPatientPortail.mockResolvedValue({ patient: { idPatient: 'PAT_1' } });
  getDocumentCourant.mockReturnValue({ version: 'donnees_confidentialite@v9' });
  traceFormulationActive.mockReturnValue(false);
});

describe('POST /api/portail/trust/choix', () => {
  it('verrouille le patient dans la transaction avant lecture et écriture du choix', async () => {
    const response = await POST(request({ finalite: 'partage_medecin_traitant', statut: 'accorde' }));
    expect(response.status).toBe(200);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
    expect(tx.trustChoiceEvent.findFirst).toHaveBeenCalledTimes(1);
    expect(tx.trustChoiceEvent.create).toHaveBeenCalledTimes(1);
    expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(tx.trustChoiceEvent.findFirst.mock.invocationCallOrder[0]);
    expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(tx.trustChoiceEvent.create.mock.invocationCallOrder[0]);
  });
});
