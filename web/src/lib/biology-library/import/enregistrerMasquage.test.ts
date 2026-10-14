import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import sharp from 'sharp';

const { prisma } = vi.hoisted(() => {
  const prisma = {
    $transaction: vi.fn(),
    $executeRaw: vi.fn(async () => 1),
    $queryRaw: vi.fn(async () => [] as Array<{ id: string; frais: boolean }>),
    compteRenduBiologique: { findFirst: vi.fn() },
    travailExtractionBiologique: { count: vi.fn(async () => 0) },
    importBiologique: { update: vi.fn(async () => ({})) },
    ligneBiologiqueCandidate: { count: vi.fn(async () => 0) },
    masquageCompteRendu: { create: vi.fn(async () => ({ id: 'mq_1' })) },
  };
  return { prisma };
});
vi.mock('@/lib/prisma', () => ({ prisma }));

import { enregistrerMasquage, pagesDuDocument, preparerPages } from './enregistrerMasquage';

async function jpeg(largeur = 20, hauteur = 30): Promise<Buffer> {
  return sharp({ create: { width: largeur, height: hauteur, channels: 3, background: '#ffffff' } })
    .withMetadata({ exif: { IFD0: { Artist: 'Sophie Nicola' } } })
    .jpeg()
    .toBuffer();
}

async function pdf(pages: number): Promise<Buffer> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pages; i++) doc.addPage();
  return Buffer.from(await doc.save());
}

const PARAMS = { idPatient: 'pat_sophie', idCompteRendu: 'cr_1', posePar: 'praticien@wellneuro.fr', zonesMasquees: 2, aucuneIdentite: false };

beforeEach(async () => {
  prisma.$transaction.mockImplementation(async (cb: (tx: typeof prisma) => unknown) => cb(prisma));
  prisma.compteRenduBiologique.findFirst.mockResolvedValue({
    typeMime: 'application/pdf', purgeLe: null, contenu: new Uint8Array(await pdf(2)),
  });
});

afterEach(() => vi.clearAllMocks());

describe('preparerPages — le serveur ne croit pas le navigateur sur parole', () => {
  it('réencode chaque page : aucune métadonnée de l’image reçue ne survit', async () => {
    const recue = await jpeg();
    expect((await sharp(recue).metadata()).exif).toBeDefined();
    const r = await preparerPages([recue]);
    if (!r.ok) throw new Error(r.reason);
    expect((await sharp(r.pages[0]).metadata()).exif).toBeUndefined();
    expect([...r.pages[0].subarray(0, 3)]).toEqual([0xff, 0xd8, 0xff]);
  });

  it('refuse une page qui n’est pas un JPEG, une liste vide, plus de 20 pages', async () => {
    const png = await sharp({ create: { width: 4, height: 4, channels: 3, background: '#fff' } }).png().toBuffer();
    expect(await preparerPages([png])).toMatchObject({ ok: false, reason: 'page_non_jpeg' });
    expect(await preparerPages([])).toMatchObject({ ok: false, reason: 'pages_absentes' });
    expect(await preparerPages(Array.from({ length: 21 }, () => png))).toMatchObject({ ok: false, reason: 'trop_de_pages' });
  });

  it('refuse un JPEG illisible derrière une signature correcte', async () => {
    expect(await preparerPages([Buffer.from([0xff, 0xd8, 0xff, 0x00, 0x01])])).toMatchObject({ ok: false, reason: 'page_illisible' });
  });
});

describe('pagesDuDocument', () => {
  it('compte les pages d’un PDF ; une image en a une ; un PDF illisible ne se compte pas', async () => {
    expect(await pagesDuDocument(await pdf(3), 'application/pdf')).toBe(3);
    expect(await pagesDuDocument(Buffer.from([0xff, 0xd8, 0xff]), 'image/jpeg')).toBe(1);
    expect(await pagesDuDocument(Buffer.from('%PDF-cassé'), 'application/pdf')).toBeNull();
  });
});

describe('enregistrerMasquage', () => {
  it('consigne les pages réencodées, la déclaration et l’auteur, sous le verrou du compte rendu', async () => {
    const issue = await enregistrerMasquage({ ...PARAMS, pages: [await jpeg(), await jpeg()] });
    expect(issue).toEqual({ ok: true, idMasquage: 'mq_1' });
    const sql = (prisma.$executeRaw.mock.calls[0] as unknown[])[0] as TemplateStringsArray;
    expect(sql.join('?')).toContain('pg_advisory_xact_lock');
    const data = (prisma.masquageCompteRendu.create.mock.calls[0] as unknown as [{ data: Record<string, unknown> }])[0].data;
    expect(data).toMatchObject({
      idPatient: 'pat_sophie', idCompteRendu: 'cr_1', nombrePages: 2, zonesMasquees: 2, aucuneIdentite: false,
      posePar: 'praticien@wellneuro.fr',
    });
    expect((data.pages as Uint8Array[]).length).toBe(2);
  });

  it('une déclaration irrecevable est refusée avant tout', async () => {
    expect(await enregistrerMasquage({ ...PARAMS, zonesMasquees: 0, pages: [await jpeg()] }))
      .toMatchObject({ ok: false, reason: 'declaration_invalide' });
    expect(await enregistrerMasquage({ ...PARAMS, zonesMasquees: 1, aucuneIdentite: true, pages: [await jpeg()] }))
      .toMatchObject({ ok: false, reason: 'declaration_invalide' });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('le nombre de pages doit être celui du document', async () => {
    expect(await enregistrerMasquage({ ...PARAMS, pages: [await jpeg()] }))
      .toMatchObject({ ok: false, reason: 'pages_incompletes' });
    expect(prisma.masquageCompteRendu.create).not.toHaveBeenCalled();
  });

  it.each([
    ['document purgé', () => prisma.compteRenduBiologique.findFirst.mockResolvedValueOnce({ typeMime: 'application/pdf', purgeLe: new Date(), contenu: null }), 'document_purge'],
    ['compte rendu d’un autre dossier', () => prisma.compteRenduBiologique.findFirst.mockResolvedValueOnce(null), 'compte_rendu_introuvable'],
    ['lecture demandée', () => prisma.travailExtractionBiologique.count.mockResolvedValueOnce(1), 'lecture_demandee'],
    ['lecture fraîche en cours', () => prisma.$queryRaw.mockResolvedValueOnce([{ id: 'imp_1', frais: true }]), 'extraction_en_cours'],
    ['ligne validée', () => prisma.ligneBiologiqueCandidate.count.mockResolvedValueOnce(1), 'ligne_validee'],
  ])('%s : refusé, rien n’est consigné', async (_cas, preparer, reason) => {
    preparer();
    expect(await enregistrerMasquage({ ...PARAMS, pages: [await jpeg(), await jpeg()] })).toMatchObject({ ok: false, reason });
    expect(prisma.masquageCompteRendu.create).not.toHaveBeenCalled();
  });

  it('un import périmé (processus mort) est clos `delai_depasse`, puis le masquage passe', async () => {
    prisma.$queryRaw.mockResolvedValueOnce([{ id: 'imp_mort', frais: false }]);
    expect(await enregistrerMasquage({ ...PARAMS, pages: [await jpeg(), await jpeg()] })).toEqual({ ok: true, idMasquage: 'mq_1' });
    expect(prisma.importBiologique.update).toHaveBeenCalledWith({
      where: { id: 'imp_mort' },
      data: { statut: 'echec', motifEchec: 'delai_depasse' },
    });
  });
});
