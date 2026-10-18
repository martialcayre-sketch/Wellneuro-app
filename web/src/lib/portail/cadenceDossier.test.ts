import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma } = vi.hoisted(() => ({
  prisma: {
    ratificationObjectif: { count: vi.fn() },
    amendementObjectif: { count: vi.fn() },
    demandeCorrectionObjectif: { count: vi.fn() },
    reponseJalonObjectif: { count: vi.fn() },
  },
}));
vi.mock('@/lib/prisma', () => ({ prisma }));

import { cadenceDossierAtteinte } from './cadenceDossier';

describe('cadence du dossier à deux voix (D-327)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.ratificationObjectif.count.mockResolvedValue(0);
    prisma.amendementObjectif.count.mockResolvedValue(0);
    prisma.demandeCorrectionObjectif.count.mockResolvedValue(0);
    prisma.reponseJalonObjectif.count.mockResolvedValue(0);
  });

  it('additionne les quatre tables du dossier, sur l’heure écoulée', async () => {
    prisma.ratificationObjectif.count.mockResolvedValue(8);
    prisma.amendementObjectif.count.mockResolvedValue(5);
    prisma.demandeCorrectionObjectif.count.mockResolvedValue(4);
    prisma.reponseJalonObjectif.count.mockResolvedValue(2);
    expect(await cadenceDossierAtteinte('PAT_TEST')).toBe(false);
    prisma.reponseJalonObjectif.count.mockResolvedValue(3);
    expect(await cadenceDossierAtteinte('PAT_TEST')).toBe(true);
    const where = prisma.demandeCorrectionObjectif.count.mock.calls[0][0].where;
    expect(where.idPatient).toBe('PAT_TEST');
    expect(Date.now() - where.creeLe.gte.getTime()).toBeGreaterThanOrEqual(3_600_000 - 1000);
  });
});
