import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma, logger } = vi.hoisted(() => ({
  prisma: {
    journalAccesDossier: { create: vi.fn(), deleteMany: vi.fn() },
  },
  logger: { error: vi.fn() },
}));

vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/observability/logger', () => ({ logger }));

import { RETENTION_JOURNAL_ACCES_MS, journaliserAccesDossier } from './journalAcces';

const ACCES = {
  idPatient: 'PAT_TEST',
  praticienEmail: 'praticien@wellneuro.fr',
  route: '/api/praticien/reperes',
  methode: 'GET',
};

describe('journaliserAccesDossier', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.journalAccesDossier.create.mockResolvedValue({ id: 'ja_1' });
    prisma.journalAccesDossier.deleteMany.mockResolvedValue({ count: 0 });
  });

  it('écrit exactement les quatre champs du gabarit — jamais d’IP, d’UA ni de payload', async () => {
    await journaliserAccesDossier(ACCES);
    expect(prisma.journalAccesDossier.create).toHaveBeenCalledTimes(1);
    // Égalité stricte : toute colonne ajoutée (IP, user-agent, URL réelle…)
    // ferait échouer ce test — c'est lui qui verrouille le périmètre GD-1.
    expect(prisma.journalAccesDossier.create).toHaveBeenCalledWith({
      data: {
        idPatient: 'PAT_TEST',
        praticienEmail: 'praticien@wellneuro.fr',
        route: '/api/praticien/reperes',
        methode: 'GET',
      },
    });
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('purge les lignes antérieures au seuil de 12 mois à chaque écriture', async () => {
    await journaliserAccesDossier(ACCES);
    expect(prisma.journalAccesDossier.deleteMany).toHaveBeenCalledTimes(1);
    const seuil = prisma.journalAccesDossier.deleteMany.mock.calls[0][0].where.creeLe.lt as Date;
    const ecart = Date.now() - seuil.getTime();
    expect(Math.abs(ecart - RETENTION_JOURNAL_ACCES_MS)).toBeLessThan(5000);
    // L'intégrité d'audit tient à cet ordre : la trace du jour est écrite
    // AVANT la tentative de purge (invariant relevé en revue adversariale G5).
    const ordreCreate = prisma.journalAccesDossier.create.mock.invocationCallOrder[0];
    const ordrePurge = prisma.journalAccesDossier.deleteMany.mock.invocationCallOrder[0];
    expect(ordreCreate).toBeLessThan(ordrePurge);
  });

  it('un échec d’écriture ne lève pas, mais se journalise sous le code dédié', async () => {
    prisma.journalAccesDossier.create.mockRejectedValue(new Error('base indisponible'));
    await expect(journaliserAccesDossier(ACCES)).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'PRATICIEN.ACCES_DOSSIER.TRACE_ECHEC' }),
    );
  });

  // Fail-open, mais pas muet : un `.catch(() => undefined)` local sur la
  // purge laisserait ce test rouge — c'est l'assertion `logger.error` qui
  // condamne cette variante (falsification consignée sur le patron G5).
  it('un échec de purge ne lève pas, la trace du jour reste écrite, l’échec est journalisé', async () => {
    prisma.journalAccesDossier.deleteMany.mockRejectedValue(new Error('base indisponible'));
    await expect(journaliserAccesDossier(ACCES)).resolves.toBeUndefined();
    expect(prisma.journalAccesDossier.create).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'PRATICIEN.ACCES_DOSSIER.TRACE_ECHEC' }),
    );
  });
});
