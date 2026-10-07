import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, prisma } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    patient: { findUnique: vi.fn() },
    journalAccesDossier: { create: vi.fn() },
    compteRenduBiologique: { findFirst: vi.fn(), updateMany: vi.fn() },
    importBiologique: { count: vi.fn(), updateMany: vi.fn() },
    ligneBiologiqueCandidate: { count: vi.fn() },
    $executeRaw: vi.fn(),
    $transaction: vi.fn(),
  },
}));
vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));

import { POST } from './route';

const DRAPEAUX = ['WN_CB_ENABLED', 'WN_CB_RESULTS_ENABLED', 'WN_BIO_INGEST_ENABLED'];
const avant: Record<string, string | undefined> = {};

const requete = (body: unknown) =>
  new Request('http://localhost/api/praticien/biologie/import/ecart', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  vi.clearAllMocks();
  for (const nom of [...DRAPEAUX, 'WN_BIO_PORTAIL_ENABLED']) avant[nom] = process.env[nom];
  for (const nom of DRAPEAUX) process.env[nom] = 'true';
  delete process.env.WN_BIO_PORTAIL_ENABLED;
  getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });
  prisma.patient.findUnique.mockResolvedValue({ praticienEmail: 'praticien@wellneuro.fr' });
  prisma.$transaction.mockImplementation(async (cb: (tx: typeof prisma) => unknown) => cb(prisma));
  prisma.$executeRaw.mockResolvedValue(1);
  prisma.compteRenduBiologique.findFirst.mockResolvedValue({ origine: 'patient', purgeLe: null });
  prisma.compteRenduBiologique.updateMany.mockResolvedValue({ count: 1 });
  prisma.importBiologique.count.mockResolvedValue(0);
  prisma.importBiologique.updateMany.mockResolvedValue({ count: 0 });
  prisma.ligneBiologiqueCandidate.count.mockResolvedValue(0);
});

afterEach(() => {
  for (const nom of Object.keys(avant)) {
    if (avant[nom] === undefined) delete process.env[nom];
    else process.env[nom] = avant[nom];
  }
});

describe('POST /api/praticien/biologie/import/ecart (D-269 §3)', () => {
  it('écarte sous l’import seul — le drapeau du portail éteint ne retire pas le recours — avec l’e-mail de la session', async () => {
    const res = await POST(requete({ idPatient: 'pat_jennifer', idCompteRendu: 'cr_1', motif: 'document_non_conforme' }));
    expect(res.status).toBe(200);
    expect(prisma.compteRenduBiologique.updateMany.mock.calls[0][0].data).toEqual({
      contenu: null, motifPurge: 'ecarte', ecartePar: 'praticien@wellneuro.fr', motifEcart: 'document_non_conforme',
    });
  });

  it('import éteint : 503, rien d’écrit', async () => {
    delete process.env.WN_BIO_INGEST_ENABLED;
    expect((await POST(requete({ idPatient: 'pat_jennifer', idCompteRendu: 'cr_1', motif: 'illisible' }))).status).toBe(503);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('dossier d’un autre praticien : refusé par la garde, rien d’écrit', async () => {
    prisma.patient.findUnique.mockResolvedValue({ praticienEmail: 'autre@wellneuro.fr' });
    const res = await POST(requete({ idPatient: 'pat_jennifer', idCompteRendu: 'cr_1', motif: 'illisible' }));
    expect(res.status).toBeGreaterThanOrEqual(403);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('motif hors liste, ou texte libre : 400, rien d’écrit', async () => {
    for (const motif of ['autre', 'Le patient s’est trompé', undefined]) {
      const res = await POST(requete({ idPatient: 'pat_jennifer', idCompteRendu: 'cr_1', motif }));
      expect(res.status).toBe(400);
    }
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('un refus métier se dit en 409, un document introuvable en 404', async () => {
    prisma.ligneBiologiqueCandidate.count.mockResolvedValueOnce(1);
    let res = await POST(requete({ idPatient: 'pat_jennifer', idCompteRendu: 'cr_1', motif: 'illisible' }));
    expect(res.status).toBe(409);
    expect((await res.json()).reason).toBe('ligne_validee');
    prisma.compteRenduBiologique.findFirst.mockResolvedValueOnce(null);
    res = await POST(requete({ idPatient: 'pat_jennifer', idCompteRendu: 'cr_1', motif: 'illisible' }));
    expect(res.status).toBe(404);
  });
});
