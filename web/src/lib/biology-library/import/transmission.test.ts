import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma, journal } = vi.hoisted(() => {
  const journal: string[] = [];
  const prisma = {
    $executeRaw: vi.fn(async () => {
      journal.push('verrou');
      return 1;
    }),
    $queryRaw: vi.fn(),
    $transaction: vi.fn(),
    trustAcknowledgement: { count: vi.fn() },
    compteRenduBiologique: {
      count: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(async (_args: { data: Record<string, unknown>; select: unknown }) => {
        journal.push('create');
        return { id: 'cr_neuf' };
      }),
    },
  };
  return { prisma, journal };
});
vi.mock('@/lib/prisma', () => ({ prisma }));

import { getDocumentCourant } from '@/lib/trust/contenus/registre';
import { aPrisConnaissanceUsageIa, deposerTransmission, jugerPlafonds, listerTransmissions } from './transmission';

const OCTETS = Buffer.from('%PDF-1.7 fixture');

beforeEach(() => {
  journal.length = 0;
  prisma.$transaction.mockImplementation(async (cb: (tx: typeof prisma) => unknown) => cb(prisma));
  prisma.compteRenduBiologique.count.mockResolvedValue(0);
  prisma.$queryRaw.mockResolvedValue([{ n: 0 }]);
});

afterEach(() => vi.clearAllMocks());

describe('aPrisConnaissanceUsageIa (D-269 §6)', () => {
  it('exige un accusé `pris_connaissance` de la version COURANTE, version ET hash', async () => {
    prisma.trustAcknowledgement.count.mockResolvedValueOnce(1);
    expect(await aPrisConnaissanceUsageIa('pat_jennifer')).toBe(true);
    const courant = getDocumentCourant('usage_ia');
    expect(prisma.trustAcknowledgement.count).toHaveBeenCalledWith({
      where: {
        idPatient: 'pat_jennifer',
        documentKey: 'usage_ia',
        documentVersion: courant.version,
        contentHash: courant.hash,
        type: 'pris_connaissance',
      },
    });
    prisma.trustAcknowledgement.count.mockResolvedValueOnce(0);
    expect(await aPrisConnaissanceUsageIa('pat_jennifer')).toBe(false);
  });
});

describe('jugerPlafonds (D-269 §5)', () => {
  it('3 documents en attente ou reçus, non purgés et sans ligne validée : refus', async () => {
    prisma.compteRenduBiologique.count.mockResolvedValueOnce(3);
    expect(await jugerPlafonds('pat_jennifer')).toEqual({ ok: false, reason: 'plafond_en_attente' });
    expect(prisma.compteRenduBiologique.count).toHaveBeenCalledWith({
      where: {
        idPatient: 'pat_jennifer',
        origine: 'patient',
        purgeLe: null,
        imports: { none: { lignes: { some: { statut: 'validee' } } } },
      },
    });
  });

  it('2 en attente : admis', async () => {
    prisma.compteRenduBiologique.count.mockResolvedValueOnce(2);
    expect(await jugerPlafonds('pat_jennifer')).toEqual({ ok: true });
  });

  it('10 transmissions dans les 24 heures, à l’horloge de la base : refus', async () => {
    prisma.$queryRaw.mockResolvedValueOnce([{ n: 10 }]);
    expect(await jugerPlafonds('pat_jennifer')).toEqual({ ok: false, reason: 'plafond_24h' });
    const sql = (prisma.$queryRaw.mock.calls[0][0] as TemplateStringsArray).join('?');
    expect(sql).toContain("origine = 'patient'");
    expect(sql).toContain("clock_timestamp() AT TIME ZONE 'UTC') - interval '24 hours'");
  });
});

describe('deposerTransmission', () => {
  it('rejuge les plafonds SOUS le verrou du dossier, puis consigne un dépôt patient sans auteur praticien', async () => {
    expect(await deposerTransmission({ idPatient: 'pat_jennifer', octets: OCTETS, typeMime: 'application/pdf' })).toEqual({ ok: true });
    expect(journal).toEqual(['verrou', 'create']);
    const data = prisma.compteRenduBiologique.create.mock.calls[0][0].data;
    expect(data).toMatchObject({ idPatient: 'pat_jennifer', typeMime: 'application/pdf', origine: 'patient', deposePar: null });
    expect(data.empreinteSha256).toMatch(/^[0-9a-f]{64}$/);
    // Aucun nom de fichier n'est gardé.
    expect(Object.keys(data).sort()).toEqual(['contenu', 'deposePar', 'empreinteSha256', 'idPatient', 'origine', 'typeMime']);
  });

  it('un plafond atteint entre le premier contrôle et le verrou : rien n’est écrit', async () => {
    prisma.compteRenduBiologique.count.mockResolvedValueOnce(3);
    expect(await deposerTransmission({ idPatient: 'pat_jennifer', octets: OCTETS, typeMime: 'application/pdf' }))
      .toEqual({ ok: false, reason: 'plafond_en_attente' });
    expect(journal).toEqual(['verrou']);
  });

  it('un document déjà dans le dossier (unicité patient, empreinte) : refus, sans identifiant rendu', async () => {
    prisma.$transaction.mockRejectedValueOnce(Object.assign(new Error('unique'), { code: 'P2002' }));
    expect(await deposerTransmission({ idPatient: 'pat_jennifer', octets: OCTETS, typeMime: 'application/pdf' }))
      .toEqual({ ok: false, reason: 'document_deja_transmis' });
    // La recherche de l'écart ne vise que les transmissions du patient.
    expect(prisma.compteRenduBiologique.count).toHaveBeenLastCalledWith({
      where: { idPatient: 'pat_jennifer', empreinteSha256: expect.stringMatching(/^[0-9a-f]{64}$/), origine: 'patient', motifEcart: { not: null } },
    });
  });

  it('le même fichier, déjà écarté par le praticien : le message le dit, au lieu de « figure déjà »', async () => {
    prisma.$transaction.mockRejectedValueOnce(Object.assign(new Error('unique'), { code: 'P2002' }));
    prisma.compteRenduBiologique.count.mockResolvedValueOnce(1);
    expect(await deposerTransmission({ idPatient: 'pat_jennifer', octets: OCTETS, typeMime: 'application/pdf' }))
      .toEqual({ ok: false, reason: 'document_deja_ecarte' });
  });

  it('une autre erreur n’est pas maquillée en doublon', async () => {
    prisma.$transaction.mockRejectedValueOnce(new Error('panne'));
    await expect(deposerTransmission({ idPatient: 'pat_jennifer', octets: OCTETS, typeMime: 'application/pdf' })).rejects.toThrow('panne');
  });
});

describe('listerTransmissions (D-269 §4)', () => {
  it('ne lit que les documents du patient, sans contenu, et ne rend que date et statut', async () => {
    prisma.compteRenduBiologique.findMany.mockResolvedValueOnce([
      { deposeLe: new Date('2026-10-07T09:00:00Z'), purgeLe: null, motifEcart: null, imports: [] },
      { deposeLe: new Date('2026-10-06T09:00:00Z'), purgeLe: null, motifEcart: null, imports: [{ lignes: [] }] },
      { deposeLe: new Date('2026-10-05T09:00:00Z'), purgeLe: new Date('2026-10-05T10:00:00Z'), motifEcart: null, imports: [{ lignes: [{ id: 'l1' }] }] },
      { deposeLe: new Date('2026-10-04T09:00:00Z'), purgeLe: new Date('2026-10-04T10:00:00Z'), motifEcart: 'document_non_conforme', imports: [] },
    ]);
    expect(await listerTransmissions('pat_jennifer')).toEqual([
      { deposeLe: '2026-10-07T09:00:00.000Z', statut: 'en_attente' },
      { deposeLe: '2026-10-06T09:00:00.000Z', statut: 'recu' },
      { deposeLe: '2026-10-05T09:00:00.000Z', statut: 'valide' },
      { deposeLe: '2026-10-04T09:00:00.000Z', statut: 'refuse' },
    ]);
    const requete = prisma.compteRenduBiologique.findMany.mock.calls[0][0];
    expect(requete.where).toEqual({ idPatient: 'pat_jennifer', origine: 'patient' });
    expect(requete.select.contenu).toBeUndefined();
    expect(JSON.stringify(requete.select)).not.toMatch(/valeurLue|libelleLu|marquageLu/);
  });
});
