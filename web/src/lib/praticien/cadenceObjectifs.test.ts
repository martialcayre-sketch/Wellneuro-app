import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma } = vi.hoisted(() => ({
  prisma: {
    objectifNegocie: { count: vi.fn() },
    accordAtteste: { count: vi.fn() },
    finObjectif: { count: vi.fn() },
  },
}));
vi.mock('@/lib/prisma', () => ({ prisma }));

import { cadenceObjectifsAtteinte } from './cadenceObjectifs';

describe('cadence praticien des objectifs (D-326)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.objectifNegocie.count.mockResolvedValue(0);
    prisma.accordAtteste.count.mockResolvedValue(0);
    prisma.finObjectif.count.mockResolvedValue(0);
  });

  it('additionne les trois tables du dossier, sur l’heure écoulée', async () => {
    prisma.objectifNegocie.count.mockResolvedValue(10);
    prisma.accordAtteste.count.mockResolvedValue(10);
    prisma.finObjectif.count.mockResolvedValue(9);
    expect(await cadenceObjectifsAtteinte('PAT_TEST')).toBe(false);
    prisma.finObjectif.count.mockResolvedValue(10);
    expect(await cadenceObjectifsAtteinte('PAT_TEST')).toBe(true);
    const where = prisma.accordAtteste.count.mock.calls[0][0].where;
    expect(where.idPatient).toBe('PAT_TEST');
    expect(Date.now() - where.creeLe.gte.getTime()).toBeGreaterThanOrEqual(3_600_000 - 1000);
  });
});
