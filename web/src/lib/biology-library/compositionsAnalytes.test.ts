import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma, transactions } = vi.hoisted(() => {
  const transactions = { annulees: 0, isolations: [] as unknown[] };
  const prisma = {
    biologyAnalyte: { findUnique: vi.fn(), findMany: vi.fn(), count: vi.fn() },
    biologyAnalyteComposition: { create: vi.fn(), updateMany: vi.fn(), findUniqueOrThrow: vi.fn() },
    biologyAnalyteCompositionItem: { createMany: vi.fn() },
    $transaction: vi.fn(),
  };
  return { prisma, transactions };
});

vi.mock('@/lib/prisma', () => ({ prisma }));

import { COMPOSITIONS_PREPAREES } from './compositionsPreparees';
import { composantsRetenus, deciderComposition, lireCompositionAnalyte } from './compositionsAnalytes';

const PRATICIEN = 'praticien@wellneuro.fr';
/** La date que la base pose (trigger) : ni celle du serveur, ni celle du client. */
const DATE_BASE = new Date('2026-01-02T03:04:05.678Z');
const IONO = COMPOSITIONS_PREPAREES.BIO_IONOGRAMME;

function pose(codes: string[]) {
  return {
    type: 'groupe',
    verifiePar: PRATICIEN,
    verifieLe: DATE_BASE,
    retireePar: null,
    retireeLe: null,
    items: codes.map(code => ({ composant: { code, libelle: code, actif: true } })),
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  transactions.annulees = 0;
  transactions.isolations = [];
  prisma.$transaction.mockImplementation(async (corps: (tx: typeof prisma) => Promise<unknown>, options: unknown) => {
    transactions.isolations.push(options);
    try {
      return await corps(prisma);
    } catch (err) {
      transactions.annulees += 1;
      throw err;
    }
  });
});

describe('composantsRetenus — une partie non vide de la liste préparée, jamais au-delà', () => {
  it('garde l’ordre de la liste, quel que soit l’ordre reçu', () => {
    expect(composantsRetenus(IONO, ['BIO_CHLORE', 'BIO_SODIUM'])).toEqual(['BIO_SODIUM', 'BIO_CHLORE']);
  });
  it('refuse un analyte hors liste, un doublon, une liste vide', () => {
    expect(composantsRetenus(IONO, ['BIO_SODIUM', 'BIO_FERRITINE'])).toBeNull();
    expect(composantsRetenus(IONO, ['BIO_SODIUM', 'BIO_SODIUM'])).toBeNull();
    expect(composantsRetenus(IONO, [])).toBeNull();
  });
  it('contre-épreuve : la liste entière passe', () => {
    expect(composantsRetenus(IONO, [...IONO.composants])).toEqual([...IONO.composants]);
  });
});

describe('deciderComposition — signer', () => {
  it('écrit l’en-tête puis ses éléments dans UNE transaction READ COMMITTED, signataire de session, date relue', async () => {
    prisma.biologyAnalyte.findUnique.mockResolvedValue({ actif: true, compositions: [] });
    prisma.biologyAnalyte.count.mockResolvedValue(2);
    prisma.biologyAnalyteComposition.create.mockResolvedValue({ id: 'c1' });
    prisma.biologyAnalyteComposition.findUniqueOrThrow.mockResolvedValue(pose(['BIO_SODIUM', 'BIO_POTASSIUM']));

    const r = await deciderComposition({
      analyteCode: 'BIO_IONOGRAMME',
      decision: 'signer',
      composants: ['BIO_POTASSIUM', 'BIO_SODIUM'],
      praticien: PRATICIEN,
    });

    expect(r).toEqual({ ok: true, active: expect.objectContaining({ verifieLe: DATE_BASE.toISOString() }) });
    expect(transactions.isolations).toEqual([{ isolationLevel: 'ReadCommitted' }]);
    expect(prisma.biologyAnalyteComposition.create).toHaveBeenCalledWith({
      data: { analyteCode: 'BIO_IONOGRAMME', type: 'groupe', verifiePar: PRATICIEN },
      select: { id: true },
    });
    expect(prisma.biologyAnalyteCompositionItem.createMany).toHaveBeenCalledWith({
      data: [
        { compositionId: 'c1', composantCode: 'BIO_SODIUM', position: 0 },
        { compositionId: 'c1', composantCode: 'BIO_POTASSIUM', position: 1 },
      ],
    });
  });

  it('le type vient de la liste préparée, jamais du client', async () => {
    prisma.biologyAnalyte.findUnique.mockResolvedValue({ actif: true, compositions: [] });
    prisma.biologyAnalyte.count.mockResolvedValue(2);
    prisma.biologyAnalyteComposition.create.mockResolvedValue({ id: 'c2' });
    prisma.biologyAnalyteComposition.findUniqueOrThrow.mockResolvedValue({ ...pose([]), type: 'calcul' });
    await deciderComposition({
      analyteCode: 'BIO_RATIO_HOMA',
      decision: 'signer',
      composants: ['BIO_GLYCEMIE_JEUN', 'BIO_INSULINEMIE'],
      praticien: PRATICIEN,
    });
    expect(prisma.biologyAnalyteComposition.create.mock.calls[0][0].data.type).toBe('calcul');
  });

  it('refuse sans rien écrire : analyte sans liste, composant hors liste, composition déjà active', async () => {
    expect(
      await deciderComposition({ analyteCode: 'BIO_FERRITINE', decision: 'signer', composants: ['BIO_SODIUM'], praticien: PRATICIEN }),
    ).toEqual({ ok: false, raison: 'composition_non_preparee' });
    expect(
      await deciderComposition({ analyteCode: 'BIO_IONOGRAMME', decision: 'signer', composants: ['BIO_FERRITINE'], praticien: PRATICIEN }),
    ).toEqual({ ok: false, raison: 'composants_invalides' });

    prisma.biologyAnalyte.findUnique.mockResolvedValue({ actif: true, compositions: [{ id: 'deja' }] });
    expect(
      await deciderComposition({ analyteCode: 'BIO_IONOGRAMME', decision: 'signer', composants: ['BIO_SODIUM'], praticien: PRATICIEN }),
    ).toEqual({ ok: false, raison: 'etat_divergent' });
    expect(transactions.annulees).toBe(1);
    expect(prisma.biologyAnalyteComposition.create).not.toHaveBeenCalled();
  });

  it('un analyte inactif ou un composant absent du catalogue n’écrit rien', async () => {
    prisma.biologyAnalyte.findUnique.mockResolvedValueOnce({ actif: false, compositions: [] });
    expect(
      await deciderComposition({ analyteCode: 'BIO_IONOGRAMME', decision: 'signer', composants: ['BIO_SODIUM'], praticien: PRATICIEN }),
    ).toEqual({ ok: false, raison: 'analyte_inactif' });
    prisma.biologyAnalyte.findUnique.mockResolvedValueOnce({ actif: true, compositions: [] });
    prisma.biologyAnalyte.count.mockResolvedValueOnce(0);
    expect(
      await deciderComposition({ analyteCode: 'BIO_IONOGRAMME', decision: 'signer', composants: ['BIO_SODIUM'], praticien: PRATICIEN }),
    ).toEqual({ ok: false, raison: 'composants_invalides' });
    expect(prisma.biologyAnalyteComposition.create).not.toHaveBeenCalled();
  });

  it('une signature concurrente (unicité violée en base) devient etat_divergent, pas une erreur technique', async () => {
    prisma.biologyAnalyte.findUnique.mockResolvedValue({ actif: true, compositions: [] });
    prisma.biologyAnalyte.count.mockResolvedValue(1);
    prisma.biologyAnalyteComposition.create.mockRejectedValue(Object.assign(new Error('unique'), { code: 'P2002' }));
    expect(
      await deciderComposition({ analyteCode: 'BIO_IONOGRAMME', decision: 'signer', composants: ['BIO_SODIUM'], praticien: PRATICIEN }),
    ).toEqual({ ok: false, raison: 'etat_divergent' });
  });

  it.each([
    ['P2002 de Prisma', Object.assign(new Error('unique'), { code: 'P2002' })],
    ['23505 de Postgres en cause', Object.assign(new Error('enveloppe'), { cause: { code: '23505' } })],
    ['23505 deux niveaux plus bas', Object.assign(new Error('enveloppe'), { cause: { cause: { code: '23505' } } })],
    ['23505 dans le message', new Error('db error: 23505 duplicate key value')],
  ])('unicité violée (%s) : etat_divergent', async (_forme, erreur) => {
    prisma.biologyAnalyte.findUnique.mockResolvedValue({ actif: true, compositions: [] });
    prisma.biologyAnalyte.count.mockResolvedValue(1);
    prisma.biologyAnalyteComposition.create.mockRejectedValue(erreur);
    expect(
      await deciderComposition({ analyteCode: 'BIO_IONOGRAMME', decision: 'signer', composants: ['BIO_SODIUM'], praticien: PRATICIEN }),
    ).toEqual({ ok: false, raison: 'etat_divergent' });
  });

  it('les composants se comptent ACTIFS au catalogue : un composant inactif ne se signe pas', async () => {
    prisma.biologyAnalyte.findUnique.mockResolvedValue({ actif: true, compositions: [] });
    prisma.biologyAnalyte.count.mockResolvedValue(0);
    expect(
      await deciderComposition({ analyteCode: 'BIO_IONOGRAMME', decision: 'signer', composants: ['BIO_SODIUM'], praticien: PRATICIEN }),
    ).toEqual({ ok: false, raison: 'composants_invalides' });
    expect(prisma.biologyAnalyte.count).toHaveBeenCalledWith({ where: { code: { in: ['BIO_SODIUM'] }, actif: true } });
  });

  it('une autre erreur remonte (erreur technique, jamais un refus inventé)', async () => {
    prisma.biologyAnalyte.findUnique.mockRejectedValue(new Error('panne'));
    await expect(
      deciderComposition({ analyteCode: 'BIO_IONOGRAMME', decision: 'signer', composants: ['BIO_SODIUM'], praticien: PRATICIEN }),
    ).rejects.toThrow('panne');
  });
});

describe('deciderComposition — retirer', () => {
  it('retire la composition VUE par sa date, active seulement, signataire de session', async () => {
    prisma.biologyAnalyteComposition.updateMany.mockResolvedValue({ count: 1 });
    const r = await deciderComposition({
      analyteCode: 'BIO_NFS',
      decision: 'retirer',
      verifieLeVu: DATE_BASE,
      praticien: PRATICIEN,
    });
    expect(r).toEqual({ ok: true, active: null });
    expect(transactions.isolations).toEqual([{ isolationLevel: 'ReadCommitted' }]);
    expect(prisma.biologyAnalyteComposition.updateMany).toHaveBeenCalledWith({
      where: { analyteCode: 'BIO_NFS', verifieLe: DATE_BASE, retireeLe: null },
      data: { retireePar: PRATICIEN },
    });
  });

  it('une composition qui n’est plus celle vue ne se retire pas', async () => {
    prisma.biologyAnalyteComposition.updateMany.mockResolvedValue({ count: 0 });
    expect(
      await deciderComposition({ analyteCode: 'BIO_NFS', decision: 'retirer', verifieLeVu: DATE_BASE, praticien: PRATICIEN }),
    ).toEqual({ ok: false, raison: 'etat_divergent' });
    expect(await deciderComposition({ analyteCode: 'BIO_NFS', decision: 'retirer', praticien: PRATICIEN })).toEqual({
      ok: false,
      raison: 'etat_divergent',
    });
  });
});

describe('lireCompositionAnalyte', () => {
  it('rend l’active, les retirées, la préparée (codes présents au catalogue seulement) et les groupes dont il est membre', async () => {
    prisma.biologyAnalyte.findUnique.mockResolvedValue({
      code: 'BIO_IONOGRAMME',
      compositions: [
        { ...pose(['BIO_SODIUM']), retireePar: PRATICIEN, retireeLe: new Date('2026-01-03T00:00:00Z') },
      ],
      elementsComposition: [],
    });
    prisma.biologyAnalyte.findMany.mockResolvedValue([
      { code: 'BIO_SODIUM', libelle: 'Sodium', actif: true },
      { code: 'BIO_POTASSIUM', libelle: 'Potassium', actif: true },
    ]);
    const r = await lireCompositionAnalyte('BIO_IONOGRAMME');
    if (!r.ok) throw new Error('attendu ok');
    expect(r.active).toBeNull();
    expect(r.retirees).toHaveLength(1);
    expect(r.preparee?.composants.map(c => c.code)).toEqual(['BIO_SODIUM', 'BIO_POTASSIUM']);
    expect(r.operandesAbsents).toBeNull();
  });

  it('les groupes dont il est membre : compositions ACTIVES seulement, historique du plus récent au plus ancien', async () => {
    prisma.biologyAnalyte.findUnique.mockResolvedValue({
      code: 'BIO_HEMOGLOBINE',
      compositions: [],
      elementsComposition: [{ composition: { type: 'groupe', analyte: { code: 'BIO_NFS', libelle: 'Numération formule sanguine' } } }],
    });
    const r = await lireCompositionAnalyte('BIO_HEMOGLOBINE');
    if (!r.ok) throw new Error('attendu ok');
    expect(r.membreDe).toEqual([{ code: 'BIO_NFS', libelle: 'Numération formule sanguine', type: 'groupe' }]);
    const requete = prisma.biologyAnalyte.findUnique.mock.calls[0][0];
    expect(requete.select.elementsComposition.where).toEqual({ composition: { retireeLe: null } });
    expect(requete.select.compositions.orderBy).toEqual({ verifieLe: 'desc' });
  });

  it('un calculé sans opérandes au catalogue le dit, sans liste à signer', async () => {
    prisma.biologyAnalyte.findUnique.mockResolvedValue({ code: 'BIO_RATIO_AA_EPA', compositions: [], elementsComposition: [] });
    const r = await lireCompositionAnalyte('BIO_RATIO_AA_EPA');
    if (!r.ok) throw new Error('attendu ok');
    expect(r.preparee).toBeNull();
    expect(r.operandesAbsents).toMatch(/pas au catalogue/);
  });

  it('un analyte inconnu', async () => {
    prisma.biologyAnalyte.findUnique.mockResolvedValue(null);
    expect(await lireCompositionAnalyte('BIO_INCONNU')).toEqual({ ok: false, raison: 'analyte_inconnu' });
  });
});
