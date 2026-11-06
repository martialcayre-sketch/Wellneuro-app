import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma } = vi.hoisted(() => ({
  prisma: {
    journalAccesDossier: { deleteMany: vi.fn() },
    portailConnexionGoogle: { deleteMany: vi.fn() },
    portailDemandeTentative: { deleteMany: vi.fn() },
  },
}));
vi.mock('@/lib/prisma', () => ({ prisma }));

import { purgerTracesEchues } from './purgeTraces';
import { RETENTION_JOURNAL_ACCES_MS } from '@/lib/praticien/journalAcces';
import { RETENTION_CONNEXIONS_GOOGLE_MS } from '@/lib/portail/googleIdentite';
import { RETENTION_TENTATIVES_MS } from '@/lib/portail/lienMagique';

const MAINTENANT = new Date('2026-11-06T12:15:00Z');
const avant = (ms: number) => new Date(MAINTENANT.getTime() - ms);

let espion: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  prisma.journalAccesDossier.deleteMany.mockResolvedValue({ count: 2 });
  prisma.portailConnexionGoogle.deleteMany.mockResolvedValue({ count: 1 });
  prisma.portailDemandeTentative.deleteMany.mockResolvedValue({ count: 5 });
  espion = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.clearAllMocks();
  espion.mockRestore();
});

describe('purgerTracesEchues — sans attendre une écriture (D-451, Q1)', () => {
  it('purge les trois tables au seuil de leur propre fenêtre, celui de leur purge à l’écriture', async () => {
    expect(await purgerTracesEchues(MAINTENANT)).toEqual({
      journalAcces: 2, connexionsGoogle: 1, tentativesLien: 5, echecs: 0,
    });
    expect(prisma.journalAccesDossier.deleteMany).toHaveBeenCalledWith({
      where: { creeLe: { lt: avant(RETENTION_JOURNAL_ACCES_MS) } },
    });
    expect(prisma.portailConnexionGoogle.deleteMany).toHaveBeenCalledWith({
      where: { creeLe: { lt: avant(RETENTION_CONNEXIONS_GOOGLE_MS) } },
    });
    expect(prisma.portailDemandeTentative.deleteMany).toHaveBeenCalledWith({
      where: { creeLe: { lt: avant(RETENTION_TENTATIVES_MS) } },
    });
  });

  it('les durées ne changent pas : 12 mois, 12 mois, 24 h', () => {
    expect(RETENTION_JOURNAL_ACCES_MS).toBe(365 * 24 * 60 * 60 * 1000);
    expect(RETENTION_CONNEXIONS_GOOGLE_MS).toBe(365 * 24 * 60 * 60 * 1000);
    expect(RETENTION_TENTATIVES_MS).toBe(24 * 60 * 60 * 1000);
  });

  it('une table en panne n’emporte qu’elle, et se journalise par sa classe, jamais par son message', async () => {
    prisma.portailConnexionGoogle.deleteMany.mockRejectedValueOnce(
      Object.assign(new Error('refus pat_sophie sophie.nicola@example.test'), { code: 'P1001' }),
    );
    expect(await purgerTracesEchues(MAINTENANT)).toEqual({
      journalAcces: 2, connexionsGoogle: 0, tentativesLien: 5, echecs: 1,
    });
    const ecrit = JSON.stringify(espion.mock.calls);
    expect(ecrit).toContain('P1001');
    expect(ecrit).toContain('connexionsGoogle');
    for (const interdit of ['pat_sophie', 'sophie.nicola', 'refus']) expect(ecrit).not.toContain(interdit);
  });
});
