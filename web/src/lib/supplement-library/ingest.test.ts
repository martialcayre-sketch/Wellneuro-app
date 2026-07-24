import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma, tx } = vi.hoisted(() => {
  const tx = {
    supplementProduct: {
      findUnique: vi.fn(),
      aggregate: vi.fn(),
      create: vi.fn(),
    },
    supplementProductVersionCourante: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  };
  return {
    tx,
    prisma: {
      $transaction: vi.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)),
    },
  };
});

vi.mock('@/lib/prisma', () => ({ prisma }));

import { ingestSupplementFiches, traduireErreurEcriture } from '@/lib/supplement-library/ingest';
import { parseSupplementIngestPayload } from '@/lib/supplement-library/validation';

function uneFiche(overrides: Record<string, unknown> = {}) {
  return parseSupplementIngestPayload({
    fiches: [
      {
        nomCommercial: 'Magnésium marin 300',
        marque: 'Laboratoire Fictif',
        sourceProvenance: 'complalim',
        sourceIdentifiant: 'complalim-12345',
        niveauCompletude: 'partielle',
        compositions: [{ ingredientId: 'ing_magnesium', doseParPortion: 300, unite: 'mg' }],
        ...overrides,
      },
    ],
  }).fiches[0];
}

const uniqueViolation = Object.assign(new Error('Unique constraint failed'), { code: 'P2002' });
const fkViolation = Object.assign(new Error('Foreign key constraint failed'), { code: 'P2003' });

describe('ingestion compléments — écriture en brouillons', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('crée une première version et pose le pointeur, en statut brouillon', async () => {
    tx.supplementProductVersionCourante.findUnique.mockResolvedValue(null);
    tx.supplementProduct.aggregate.mockResolvedValue({ _max: { versionFormulation: null } });
    tx.supplementProduct.create.mockResolvedValue({ id: 'prod_1', versionFormulation: 1 });
    tx.supplementProductVersionCourante.create.mockResolvedValue({});

    const bilan = await ingestSupplementFiches([uneFiche()]);

    expect(bilan.ok).toBe(true);
    expect(bilan.resume.creees).toBe(1);
    expect(bilan.resultats[0]).toMatchObject({ action: 'creee', productId: 'prod_1', versionFormulation: 1 });

    const data = tx.supplementProduct.create.mock.calls[0][0].data;
    expect(data.statutFiche).toBe('importee');
    // Jamais de champs de vérification écrits par la voie d'ingestion.
    expect(Object.keys(data)).not.toContain('verifiePar');
    expect(Object.keys(data)).not.toContain('verifieLe');
    expect(Object.keys(data)).not.toContain('dateDerniereVerification');
    expect(data.statutFiche).not.toBe('verifiee');

    expect(tx.supplementProductVersionCourante.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ productId: 'prod_1' }) }),
    );
    expect(tx.supplementProductVersionCourante.update).not.toHaveBeenCalled();
  });

  it('empreinte identique → no-op idempotent (aucune écriture)', async () => {
    const fiche = uneFiche();
    tx.supplementProductVersionCourante.findUnique.mockResolvedValue({ productId: 'prod_1' });
    tx.supplementProduct.findUnique.mockResolvedValue({
      id: 'prod_1',
      versionFormulation: 1,
      contenuSha256: fiche.contenuSha256,
    });

    const bilan = await ingestSupplementFiches([fiche]);

    expect(bilan.resume.inchangees).toBe(1);
    expect(bilan.resultats[0]).toMatchObject({ action: 'inchangee', productId: 'prod_1', versionFormulation: 1 });
    expect(tx.supplementProduct.create).not.toHaveBeenCalled();
    expect(tx.supplementProductVersionCourante.update).not.toHaveBeenCalled();
    expect(tx.supplementProductVersionCourante.create).not.toHaveBeenCalled();
  });

  it('empreinte différente → nouvelle version + pointeur déplacé dans la même transaction', async () => {
    tx.supplementProductVersionCourante.findUnique.mockResolvedValue({ productId: 'prod_1' });
    tx.supplementProduct.findUnique.mockResolvedValue({
      id: 'prod_1',
      versionFormulation: 1,
      contenuSha256: 'a'.repeat(64), // ancienne empreinte différente
    });
    tx.supplementProduct.aggregate.mockResolvedValue({ _max: { versionFormulation: 1 } });
    tx.supplementProduct.create.mockResolvedValue({ id: 'prod_2', versionFormulation: 2 });
    tx.supplementProductVersionCourante.update.mockResolvedValue({});

    const bilan = await ingestSupplementFiches([uneFiche()]);

    expect(bilan.resume.nouvellesVersions).toBe(1);
    expect(bilan.resultats[0]).toMatchObject({
      action: 'nouvelle_version',
      productId: 'prod_2',
      versionFormulation: 2,
      versionPrecedente: 1,
    });
    // Le pointeur pointe désormais sur la nouvelle version.
    expect(tx.supplementProductVersionCourante.update).toHaveBeenCalledWith({
      where: { sourceProvenance_sourceIdentifiant: { sourceProvenance: 'complalim', sourceIdentifiant: 'complalim-12345' } },
      data: { productId: 'prod_2' },
    });
    expect(tx.supplementProductVersionCourante.create).not.toHaveBeenCalled();
    // Insertion de la nouvelle version ET déplacement du pointeur dans un seul
    // appel $transaction (atomicité).
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.supplementProduct.create.mock.calls[0][0].data.versionFormulation).toBe(2);
  });

  it('traduit une violation d’unicité (P2002) en échec clair, sans faire échouer le lot', async () => {
    tx.supplementProductVersionCourante.findUnique.mockResolvedValue(null);
    tx.supplementProduct.aggregate.mockResolvedValue({ _max: { versionFormulation: null } });
    tx.supplementProduct.create.mockRejectedValue(uniqueViolation);

    const bilan = await ingestSupplementFiches([uneFiche()]);

    expect(bilan.ok).toBe(false);
    expect(bilan.resume.echecs).toBe(1);
    expect(bilan.resultats[0]).toMatchObject({ action: 'echec' });
    expect((bilan.resultats[0] as { erreur: string }).erreur).toMatch(/Conflit d'unicité/);
  });

  it('remonte une erreur inattendue (ni P2002 ni P2003)', async () => {
    tx.supplementProductVersionCourante.findUnique.mockRejectedValue(new Error('connexion perdue'));
    await expect(ingestSupplementFiches([uneFiche()])).rejects.toThrow(/connexion perdue/);
  });

  it('traduireErreurEcriture couvre P2002, P2003, et laisse passer le reste', () => {
    const cle = { sourceProvenance: 'complalim', sourceIdentifiant: 'complalim-1' };
    expect(traduireErreurEcriture(uniqueViolation, cle)).toMatch(/Conflit d'unicité/);
    expect(traduireErreurEcriture(fkViolation, cle)).toMatch(/introuvable/);
    expect(traduireErreurEcriture(new Error('autre'), cle)).toBeNull();
  });
});
