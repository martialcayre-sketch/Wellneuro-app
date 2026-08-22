import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, prisma } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    patient: { findUnique: vi.fn() },
    entreeCeQuiCompte: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    journalAccesDossier: { create: vi.fn(), deleteMany: vi.fn() },
  },
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));

import { GET } from './route';

const URL_BASE = 'http://localhost/api/praticien/ce-qui-compte';
const PRATICIEN = 'praticien@wellneuro.fr';
const CREE_LE = new Date('2026-08-22T09:00:00.000Z');

function getRequest(query = 'idPatient=PAT_TEST'): Request {
  return new Request(`${URL_BASE}?${query}`);
}

beforeEach(() => {
  vi.clearAllMocks();
  getServerSession.mockResolvedValue({ user: { email: PRATICIEN } });
  prisma.patient.findUnique.mockResolvedValue({ praticienEmail: PRATICIEN });
  prisma.entreeCeQuiCompte.findMany.mockResolvedValue([]);
});

describe('GET /api/praticien/ce-qui-compte — gardes', () => {
  it('hors session : 401, et l’appartenance n’est PAS testée', async () => {
    getServerSession.mockResolvedValue(null);
    const res = await GET(getRequest());
    expect(res.status).toBe(401);
    // L'ordre est le point : `verifierAppartenancePatient` JOURNALISE. La
    // tester avant la session consignerait un accès qui n'a pas eu lieu.
    expect(prisma.patient.findUnique).not.toHaveBeenCalled();
    expect(prisma.journalAccesDossier.create).not.toHaveBeenCalled();
  });

  it('identifiant absent ou malformé : 400, sans toucher la base', async () => {
    for (const query of ['', 'idPatient=', 'idPatient=PAT%20TEST', 'idPatient=../etc', `idPatient=${'a'.repeat(65)}`]) {
      const res = await GET(getRequest(query));
      expect(res.status, `« ${query} » doit être refusé`).toBe(400);
    }
    expect(prisma.patient.findUnique).not.toHaveBeenCalled();
    expect(prisma.journalAccesDossier.create).not.toHaveBeenCalled();
  });

  it('patient inconnu : 404', async () => {
    prisma.patient.findUnique.mockResolvedValue(null);
    expect((await GET(getRequest())).status).toBe(404);
    expect(prisma.entreeCeQuiCompte.findMany).not.toHaveBeenCalled();
  });

  it('patient d’un autre praticien : 403, et aucune entrée n’est lue', async () => {
    prisma.patient.findUnique.mockResolvedValue({ praticienEmail: 'autre@wellneuro.fr' });
    expect((await GET(getRequest())).status).toBe(403);
    expect(prisma.entreeCeQuiCompte.findMany).not.toHaveBeenCalled();
    // Un refus ne journalise pas : la ligne nommerait un dossier NON lu.
    expect(prisma.journalAccesDossier.create).not.toHaveBeenCalled();
  });

  it('journal d’accès G-TRUST-04 : une seule ligne, gabarit LITTÉRAL', async () => {
    await GET(getRequest('idPatient=PAT_TEST&bruit=1'));
    expect(prisma.journalAccesDossier.create).toHaveBeenCalledTimes(1);
    const data = (prisma.journalAccesDossier.create.mock.calls[0][0] as { data: Record<string, unknown> }).data;
    expect(data.route).toBe('/api/praticien/ce-qui-compte');
    expect(data.methode).toBe('GET');
    expect(data.idPatient).toBe('PAT_TEST');
    // Jamais l'URL reçue : elle porterait les paramètres de la requête.
    expect(String(data.route)).not.toContain('bruit');
    expect(String(data.route)).not.toContain('?');
  });
});

describe('GET /api/praticien/ce-qui-compte — lecture', () => {
  it('sans drapeau : une liste vide est un SILENCE, pas un 503', async () => {
    // La route praticien n'est pas gardée par WN_CE_QUI_COMPTE. Drapeau
    // éteint, elle répond 200 avec une liste vide — un 503 ferait croire à
    // une panne sur un dossier où personne n'a simplement rien déposé.
    delete process.env.WN_CE_QUI_COMPTE;
    const res = await GET(getRequest());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, entrees: [] });
  });

  it('ordre chronologique DÉTERMINISTE sur deux entrées de même creeLe', async () => {
    prisma.entreeCeQuiCompte.findMany.mockResolvedValue([
      { id: 'ENT_B', texte: 'Deuxième.', creeLe: CREE_LE, saisiLe: null },
      { id: 'ENT_A', texte: 'Première.', creeLe: CREE_LE, saisiLe: null },
    ]);
    const res = await GET(getRequest());
    const json = (await res.json()) as { entrees: { id: string }[] };
    expect(json.entrees.map((e) => e.id)).toEqual(['ENT_B', 'ENT_A']);
    // Le second critère est ce qui rend l'ordre stable : sans lui, deux
    // entrées de la même milliseconde sortiraient dans un ordre arbitraire.
    const args = prisma.entreeCeQuiCompte.findMany.mock.calls[0][0] as { orderBy: unknown };
    expect(args.orderBy).toEqual([{ creeLe: 'desc' }, { id: 'desc' }]);
  });

  it('G5 : saisiLe absente reste null — jamais substituée par creeLe', async () => {
    prisma.entreeCeQuiCompte.findMany.mockResolvedValue([
      { id: 'ENT_1', texte: 'Sans date déclarée.', creeLe: CREE_LE, saisiLe: null },
      { id: 'ENT_2', texte: 'Avec date déclarée.', creeLe: CREE_LE, saisiLe: new Date('2026-08-20T00:00:00.000Z') },
    ]);
    const json = (await GET(getRequest()).then((r) => r.json())) as {
      entrees: { saisiLe: string | null; creeLe: string }[];
    };
    expect(json.entrees[0].saisiLe).toBeNull();
    expect(json.entrees[0].creeLe).toBe(CREE_LE.toISOString());
    expect(json.entrees[1].saisiLe).toBe('2026-08-20T00:00:00.000Z');
    expect(json.entrees[1].saisiLe).not.toBe(json.entrees[1].creeLe);
  });

  it('G2 : la réponse ne porte AUCUN agrégat, et la route n’écrit jamais', async () => {
    prisma.entreeCeQuiCompte.findMany.mockResolvedValue([
      { id: 'ENT_1', texte: 'Une parole.', creeLe: CREE_LE, saisiLe: null },
    ]);
    const json = (await GET(getRequest()).then((r) => r.json())) as Record<string, unknown>;
    // Ni `nombreEntrees`, ni `total`, ni moyenne, ni tendance : deux clés.
    expect(Object.keys(json).sort()).toEqual(['entrees', 'ok']);
    const entrees = json.entrees as Record<string, unknown>[];
    expect(Object.keys(entrees[0]).sort()).toEqual(['creeLe', 'id', 'saisiLe', 'texte']);
    // GET seul : aucune écriture possible depuis le dossier praticien.
    expect(prisma.entreeCeQuiCompte.create).not.toHaveBeenCalled();
    expect(prisma.entreeCeQuiCompte.update).not.toHaveBeenCalled();
    expect(prisma.entreeCeQuiCompte.delete).not.toHaveBeenCalled();
  });
});
