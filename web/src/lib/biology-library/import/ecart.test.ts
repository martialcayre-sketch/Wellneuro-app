import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma, journal } = vi.hoisted(() => {
  const journal: string[] = [];
  const trace = (nom: string, valeur: unknown) => vi.fn(async () => {
    journal.push(nom);
    return valeur;
  });
  const prisma = {
    $queryRaw: trace('dossier', [{}]),
    $executeRaw: trace('verrou', 1),
    $transaction: vi.fn(),
    compteRenduBiologique: { findFirst: vi.fn(), updateMany: trace('compteRendu.updateMany', { count: 1 }) },
    importBiologique: {
      count: vi.fn(),
      updateMany: trace('imports.closPerimes', { count: 0 }),
      findMany: vi.fn(),
      deleteMany: trace('imports.effaces', { count: 1 }),
    },
    ligneBiologiqueCandidate: { count: vi.fn(), deleteMany: trace('lignes.effacees', { count: 2 }) },
    travailExtractionBiologique: { count: vi.fn(), deleteMany: trace('travaux.effaces', { count: 0 }) },
  };
  return { prisma, journal };
});
vi.mock('@/lib/prisma', () => ({ prisma }));

import { ecarterCompteRendu, estMotifEcartDocument } from './ecart';

const PARAMS = {
  idPatient: 'pat_jennifer',
  idCompteRendu: 'cr_1',
  motif: 'illisible' as const,
  ecartePar: 'praticien@wellneuro.fr',
  maintenant: new Date('2026-10-07T10:00:00.000Z'),
};

beforeEach(() => {
  journal.length = 0;
  prisma.$transaction.mockImplementation(async (cb: (tx: typeof prisma) => unknown) => cb(prisma));
  prisma.compteRenduBiologique.findFirst.mockResolvedValue({ origine: 'patient', purgeLe: null });
  prisma.ligneBiologiqueCandidate.count.mockResolvedValue(0);
  prisma.importBiologique.count.mockResolvedValue(0);
  prisma.importBiologique.findMany.mockResolvedValue([{ id: 'imp_1' }]);
  prisma.travailExtractionBiologique.count.mockResolvedValue(0);
});

afterEach(() => vi.clearAllMocks());

describe('ecarterCompteRendu — « Écarter ce document » (D-269 §3)', () => {
  it('sous verrou, purge le contenu avec le motif `ecarte`, l’auteur et le motif fermé — la base date l’écart', async () => {
    expect(await ecarterCompteRendu(PARAMS)).toEqual({ ok: true });
    // Puis ses lignes et ses extractions partent avec lui (D-283 §2, F44, cas 3).
    expect(journal).toEqual([
      'dossier', 'verrou', 'imports.closPerimes', 'compteRendu.updateMany', 'lignes.effacees', 'travaux.effaces', 'imports.effaces',
    ]);
    expect(prisma.ligneBiologiqueCandidate.deleteMany).toHaveBeenCalledWith({
      where: { statut: { not: 'validee' }, import: { idCompteRendu: 'cr_1' } },
    });
    expect(prisma.compteRenduBiologique.updateMany).toHaveBeenCalledWith({
      where: { id: 'cr_1', idPatient: 'pat_jennifer', contenu: { not: null } },
      data: { contenu: null, motifPurge: 'ecarte', ecartePar: 'praticien@wellneuro.fr', motifEcart: 'illisible' },
    });
    // Égalité EXACTE : aucune date posée par l'application, la base pose
    // `ecarte_le` et `purge_le`.
  });

  it('un dépôt du praticien ne s’écarte pas — il se retire', async () => {
    prisma.compteRenduBiologique.findFirst.mockResolvedValueOnce({ origine: 'praticien', purgeLe: null });
    expect(await ecarterCompteRendu(PARAMS)).toEqual({ ok: false, reason: 'origine_praticien' });
    expect(journal).toEqual(['dossier', 'verrou']);
  });

  it('un document déjà effacé ne s’écarte pas', async () => {
    prisma.compteRenduBiologique.findFirst.mockResolvedValueOnce({ origine: 'patient', purgeLe: new Date() });
    expect(await ecarterCompteRendu(PARAMS)).toEqual({ ok: false, reason: 'deja_efface' });
    expect(journal).toEqual(['dossier', 'verrou']);
  });

  it('refusé dès qu’une ligne est validée — la provenance d’un résultat ne s’efface pas', async () => {
    prisma.ligneBiologiqueCandidate.count.mockResolvedValueOnce(1);
    expect(await ecarterCompteRendu(PARAMS)).toEqual({ ok: false, reason: 'ligne_validee' });
    expect(journal).toEqual(['dossier', 'verrou']);
  });

  it('refusé pendant une extraction fraîche ; une extraction périmée est close avant l’écart', async () => {
    prisma.importBiologique.count.mockResolvedValueOnce(1);
    expect(await ecarterCompteRendu(PARAMS)).toEqual({ ok: false, reason: 'extraction_en_cours' });
    expect(journal).toEqual(['dossier', 'verrou']);
    vi.clearAllMocks();
    journal.length = 0;
    prisma.$transaction.mockImplementation(async (cb: (tx: typeof prisma) => unknown) => cb(prisma));
    prisma.compteRenduBiologique.findFirst.mockResolvedValue({ origine: 'patient', purgeLe: null });
    prisma.ligneBiologiqueCandidate.count.mockResolvedValue(0);
    prisma.importBiologique.count.mockResolvedValue(0);
    prisma.importBiologique.findMany.mockResolvedValue([]);
    prisma.travailExtractionBiologique.count.mockResolvedValue(0);
    await ecarterCompteRendu(PARAMS);
    expect(prisma.importBiologique.updateMany).toHaveBeenCalledWith({
      where: { idCompteRendu: 'cr_1', idPatient: 'pat_jennifer', statut: 'en_cours', lanceLe: { lt: new Date('2026-10-07T09:55:00.000Z') } },
      data: { statut: 'echec', motifEchec: 'delai_depasse' },
    });
  });

  it('refusé tant qu’un travail de la file attend ou lit ce document — rien ne s’efface sous lui (F44)', async () => {
    prisma.travailExtractionBiologique.count.mockResolvedValueOnce(1);
    expect(await ecarterCompteRendu(PARAMS)).toEqual({ ok: false, reason: 'extraction_en_cours' });
    expect(prisma.travailExtractionBiologique.count).toHaveBeenCalledWith({
      where: { idCompteRendu: 'cr_1', idPatient: 'pat_jennifer', statut: { in: ['en_attente', 'en_cours'] } },
    });
    expect(journal).toEqual(['dossier', 'verrou']);
  });

  it('un document purgé entre-temps n’efface rien de plus', async () => {
    prisma.compteRenduBiologique.updateMany.mockResolvedValueOnce({ count: 0 });
    expect(await ecarterCompteRendu(PARAMS)).toEqual({ ok: false, reason: 'deja_efface' });
    expect(prisma.ligneBiologiqueCandidate.deleteMany).not.toHaveBeenCalled();
  });

  it('un compte rendu d’un autre dossier est introuvable', async () => {
    prisma.compteRenduBiologique.findFirst.mockResolvedValueOnce(null);
    expect(await ecarterCompteRendu(PARAMS)).toEqual({ ok: false, reason: 'compte_rendu_introuvable' });
    expect(prisma.compteRenduBiologique.findFirst.mock.calls[0][0].where).toEqual({ id: 'cr_1', idPatient: 'pat_jennifer' });
  });

  it('le motif est une liste fermée', () => {
    expect(estMotifEcartDocument('illisible')).toBe(true);
    expect(estMotifEcartDocument('document_non_conforme')).toBe(true);
    for (const v of ['autre', '', null, 3, 'Illisible']) expect(estMotifEcartDocument(v)).toBe(false);
  });
});
