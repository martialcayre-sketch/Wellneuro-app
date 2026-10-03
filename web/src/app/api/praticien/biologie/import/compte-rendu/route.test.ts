import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, prisma } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    patient: { findUnique: vi.fn() },
    journalAccesDossier: { create: vi.fn(), deleteMany: vi.fn() },
    compteRenduBiologique: { findFirst: vi.fn(), create: vi.fn(), delete: vi.fn() },
    importBiologique: { create: vi.fn(), update: vi.fn(), deleteMany: vi.fn() },
    ligneBiologiqueCandidate: { createMany: vi.fn(), updateMany: vi.fn(), deleteMany: vi.fn() },
    resultatBiologique: { create: vi.fn() },
    biologyAnalyte: { findMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));
vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));

import { GET } from './route';

const URL_GET = 'http://localhost/api/praticien/biologie/import/compte-rendu?idPatient=pat_sophie&idCompteRendu=cr_1';

beforeEach(() => {
  process.env.WN_CB_ENABLED = 'true';
  process.env.WN_CB_RESULTS_ENABLED = 'true';
  process.env.WN_BIO_INGEST_ENABLED = 'true';
  getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });
  prisma.patient.findUnique.mockResolvedValue({ praticienEmail: 'praticien@wellneuro.fr' });
  prisma.compteRenduBiologique.findFirst.mockResolvedValue({
    id: 'cr_1',
    typeMime: 'application/pdf',
    deposePar: 'praticien@wellneuro.fr',
    deposeLe: new Date('2026-10-02T09:00:00.000Z'),
    imports: [{
      id: 'imp_1', statut: 'extrait', motifEchec: null, modele: 'claude-sonnet-5-5', versionPrompt: 'bio-extraction-v1',
      laboratoireLu: null, lanceLe: new Date('2026-10-02T09:01:00.000Z'), termineLe: new Date('2026-10-02T09:02:00.000Z'),
      lignes: [{
        id: 'l1', rang: 1, page: 1, libelleLu: 'Ferritine', valeurLue: '48', uniteLue: 'pmol/L', preleveLeLu: null,
        analytePropose: 'BIO_FERRITINE', statutMapping: 'resolu', statut: 'proposee', motifEcart: null, idResultat: null,
      }],
    }],
  });
  prisma.biologyAnalyte.findMany.mockResolvedValue([{ code: 'BIO_FERRITINE', unite: 'ng/mL' }]);
});

afterEach(() => {
  delete process.env.WN_CB_ENABLED;
  delete process.env.WN_CB_RESULTS_ENABLED;
  delete process.env.WN_BIO_INGEST_ENABLED;
  vi.clearAllMocks();
});

describe('GET /api/praticien/biologie/import/compte-rendu', () => {
  it('rend les lignes avec leur pré-marquage, et N’ÉCRIT RIEN', async () => {
    const res = await GET(new Request(URL_GET));
    expect(res.status).toBe(200);
    const corps = await res.json();
    expect(corps.compteRendu.imports[0].modele).toBe('claude-sonnet-5-5');
    expect(corps.compteRendu.imports[0].courant).toBe(true);
    expect(corps.compteRendu.imports[0].lignes[0].preMarquage).toBe('unite_divergente');
    for (const ecriture of [
      prisma.compteRenduBiologique.create, prisma.compteRenduBiologique.delete,
      prisma.importBiologique.create, prisma.importBiologique.update, prisma.importBiologique.deleteMany,
      prisma.ligneBiologiqueCandidate.createMany, prisma.ligneBiologiqueCandidate.updateMany,
      prisma.ligneBiologiqueCandidate.deleteMany, prisma.resultatBiologique.create, prisma.$transaction,
    ]) {
      expect(ecriture).not.toHaveBeenCalled();
    }
  });

  it('une extraction en cours au-delà de la péremption est dite périmée — par l’horloge du serveur', async () => {
    const base = await prisma.compteRenduBiologique.findFirst();
    const enCours = (minutes: number) => ({
      ...base.imports[0], id: `imp_${minutes}`, statut: 'en_cours', termineLe: null, lignes: [],
      lanceLe: new Date(Date.now() - minutes * 60_000),
    });
    prisma.compteRenduBiologique.findFirst.mockResolvedValueOnce({ ...base, imports: [enCours(6), enCours(1)] });
    const corps = await (await GET(new Request(URL_GET))).json();
    expect(corps.compteRendu.imports.map((i: { perime: boolean }) => i.perime)).toEqual([true, false]);
  });

  it('ne lit jamais le contenu du document', async () => {
    await GET(new Request(URL_GET));
    const { select } = prisma.compteRenduBiologique.findFirst.mock.calls[0][0];
    expect(select).not.toHaveProperty('contenu');
  });

  it('journalise la lecture du dossier (GD-1)', async () => {
    await GET(new Request(URL_GET));
    expect(prisma.journalAccesDossier.create).toHaveBeenCalledTimes(1);
  });

  it('drapeau éteint : 503, aucun accès journalisé', async () => {
    delete process.env.WN_BIO_INGEST_ENABLED;
    const res = await GET(new Request(URL_GET));
    expect(res.status).toBe(503);
    expect(prisma.journalAccesDossier.create).not.toHaveBeenCalled();
  });
});
