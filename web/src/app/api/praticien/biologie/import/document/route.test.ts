import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, prisma } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    patient: { findUnique: vi.fn() },
    journalAccesDossier: { create: vi.fn() },
    compteRenduBiologique: { findFirst: vi.fn() },
  },
}));
vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));

import { GET } from './route';

// Le regard du praticien sur le document déposé ([[D-269]] §1) : accès
// journalisé, type consigné, en-têtes d'un fichier venu de l'extérieur.

const DRAPEAUX = ['WN_CB_ENABLED', 'WN_CB_RESULTS_ENABLED', 'WN_BIO_INGEST_ENABLED'];
const avant: Record<string, string | undefined> = {};
const PDF = Buffer.from('%PDF-1.7\n% fixture Jennifer Martin\n%%EOF');
const url = (idCompteRendu = 'cr_1') =>
  `http://localhost/api/praticien/biologie/import/document?idPatient=pat_jennifer&idCompteRendu=${idCompteRendu}`;

beforeEach(() => {
  vi.clearAllMocks();
  for (const nom of DRAPEAUX) {
    avant[nom] = process.env[nom];
    process.env[nom] = 'true';
  }
  getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });
  prisma.patient.findUnique.mockResolvedValue({ praticienEmail: 'praticien@wellneuro.fr' });
  prisma.journalAccesDossier.create.mockResolvedValue({});
  prisma.compteRenduBiologique.findFirst.mockResolvedValue({ contenu: new Uint8Array(PDF), typeMime: 'application/pdf' });
});

afterEach(() => {
  for (const nom of DRAPEAUX) {
    if (avant[nom] === undefined) delete process.env[nom];
    else process.env[nom] = avant[nom];
  }
});

describe('GET /api/praticien/biologie/import/document', () => {
  it('sert les octets consignés, type consigné, nosniff, sans cache ni nom de fichier ; l’accès est journalisé', async () => {
    const res = await GET(new Request(url()));
    expect(res.status).toBe(200);
    expect(Buffer.from(await res.arrayBuffer()).equals(PDF)).toBe(true);
    expect(res.headers.get('content-type')).toBe('application/pdf');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('content-disposition')).toBe('inline');
    expect(res.headers.get('cache-control')).toBe('no-store, private');
    expect(prisma.journalAccesDossier.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ route: '/api/praticien/biologie/import/document', methode: 'GET' }),
    }));
    expect(prisma.compteRenduBiologique.findFirst.mock.calls[0][0].where).toEqual({ id: 'cr_1', idPatient: 'pat_jennifer' });
  });

  it('une image est servie sous `sandbox`', async () => {
    prisma.compteRenduBiologique.findFirst.mockResolvedValue({ contenu: new Uint8Array([0xff, 0xd8, 0xff]), typeMime: 'image/jpeg' });
    const res = await GET(new Request(url()));
    expect(res.headers.get('content-type')).toBe('image/jpeg');
    expect(res.headers.get('content-security-policy')).toBe('sandbox');
  });

  it('un type hors de la liste fermée n’est jamais servi', async () => {
    prisma.compteRenduBiologique.findFirst.mockResolvedValue({ contenu: new Uint8Array([1]), typeMime: 'text/html' });
    expect((await GET(new Request(url()))).status).toBe(500);
  });

  it('document purgé : 410 ; d’un autre dossier : 404 ; identifiant mal formé : 400', async () => {
    prisma.compteRenduBiologique.findFirst.mockResolvedValueOnce({ contenu: null, typeMime: 'application/pdf' });
    expect((await GET(new Request(url()))).status).toBe(410);
    prisma.compteRenduBiologique.findFirst.mockResolvedValueOnce(null);
    expect((await GET(new Request(url()))).status).toBe(404);
    expect((await GET(new Request(url('../x')))).status).toBe(400);
  });

  it('dossier d’un autre praticien, ou import éteint : refusé, aucun octet lu', async () => {
    prisma.patient.findUnique.mockResolvedValue({ praticienEmail: 'autre@wellneuro.fr' });
    expect((await GET(new Request(url()))).status).toBeGreaterThanOrEqual(403);
    prisma.patient.findUnique.mockResolvedValue({ praticienEmail: 'praticien@wellneuro.fr' });
    delete process.env.WN_BIO_INGEST_ENABLED;
    expect((await GET(new Request(url()))).status).toBe(503);
    expect(prisma.compteRenduBiologique.findFirst).not.toHaveBeenCalled();
  });
});
