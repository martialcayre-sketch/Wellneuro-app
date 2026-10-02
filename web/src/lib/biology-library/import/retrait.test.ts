import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma, journal } = vi.hoisted(() => {
  const journal: string[] = [];
  const trace = (nom: string, valeur: unknown) => vi.fn(async () => {
    journal.push(nom);
    return valeur;
  });
  const prisma = {
    $executeRaw: trace('verrou', 1),
    $transaction: vi.fn(),
    compteRenduBiologique: { findFirst: vi.fn(), delete: trace('compteRendu.delete', {}) },
    importBiologique: { count: vi.fn(), deleteMany: trace('imports.deleteMany', { count: 1 }) },
    ligneBiologiqueCandidate: { count: vi.fn(), deleteMany: trace('lignes.deleteMany', { count: 2 }) },
  };
  return { prisma, journal };
});
vi.mock('@/lib/prisma', () => ({ prisma }));

import { retirerCompteRendu } from './retrait';

const PARAMS = { idPatient: 'pat_sophie', idCompteRendu: 'cr_1', maintenant: new Date('2026-10-02T10:00:00.000Z') };

beforeEach(() => {
  journal.length = 0;
  prisma.$transaction.mockImplementation(async (cb: (tx: typeof prisma) => unknown) => cb(prisma));
  prisma.compteRenduBiologique.findFirst.mockResolvedValue({ id: 'cr_1' });
  prisma.ligneBiologiqueCandidate.count.mockResolvedValue(0);
  prisma.importBiologique.count.mockResolvedValue(0);
});

afterEach(() => vi.clearAllMocks());

describe('retirerCompteRendu — retrait d’un dépôt erroné', () => {
  it('supprime sous verrou les lignes, puis les imports, puis le document', async () => {
    expect(await retirerCompteRendu(PARAMS)).toEqual({ ok: true });
    expect(journal).toEqual(['verrou', 'lignes.deleteMany', 'imports.deleteMany', 'compteRendu.delete']);
    // Les lignes visées ne sont jamais des lignes validées.
    expect(prisma.ligneBiologiqueCandidate.deleteMany).toHaveBeenCalledWith({
      where: { idPatient: 'pat_sophie', statut: { not: 'validee' }, import: { idCompteRendu: 'cr_1' } },
    });
  });

  it('est refusé dès qu’une ligne est validée — la provenance d’un résultat ne s’efface pas', async () => {
    prisma.ligneBiologiqueCandidate.count.mockResolvedValueOnce(1);
    expect(await retirerCompteRendu(PARAMS)).toEqual({ ok: false, reason: 'ligne_validee' });
    expect(journal).toEqual(['verrou']);
  });

  it('est refusé pendant une extraction en cours', async () => {
    prisma.importBiologique.count.mockResolvedValueOnce(1);
    expect(await retirerCompteRendu(PARAMS)).toEqual({ ok: false, reason: 'extraction_en_cours' });
    expect(journal).toEqual(['verrou']);
  });

  it('un compte rendu d’un autre dossier est introuvable', async () => {
    prisma.compteRenduBiologique.findFirst.mockResolvedValueOnce(null);
    expect(await retirerCompteRendu(PARAMS)).toEqual({ ok: false, reason: 'compte_rendu_introuvable' });
    expect(journal).toEqual(['verrou']);
  });
});
