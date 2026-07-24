import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, prisma, verifierAppartenancePatient } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    rendezVous: { findMany: vi.fn(), create: vi.fn() },
    patient: { findMany: vi.fn(), findUnique: vi.fn() },
  },
  verifierAppartenancePatient: vi.fn(),
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/praticien/appartenance', () => ({
  emailPraticien: (s: { user?: { email?: string } } | null) => s?.user?.email?.toLowerCase() ?? null,
  verifierAppartenancePatient,
}));

import { GET, POST } from './route';

function req(url: string, body?: unknown): Request {
  return new Request(url, body ? { method: 'POST', body: JSON.stringify(body) } : undefined);
}

describe('GET /api/praticien/rendez-vous', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
    prisma.rendezVous.findMany.mockResolvedValue([]);
    prisma.patient.findMany.mockResolvedValue([]);
  });

  it('sans session : 401', async () => {
    getServerSession.mockResolvedValue(null);
    const res = await GET(req('http://x/api/praticien/rendez-vous'));
    expect(res.status).toBe(401);
    expect(prisma.rendezVous.findMany).not.toHaveBeenCalled();
  });

  it('borne au praticien et au statut planifié', async () => {
    await GET(req('http://x/api/praticien/rendez-vous'));
    const where = prisma.rendezVous.findMany.mock.calls[0][0].where;
    expect(where.praticienEmail).toBe('p@wellneuro.fr');
    expect(where.statut).toBe('planifie');
    expect(where.dateHeure.gte).toBeInstanceOf(Date);
  });

  it('joint les noms des patients', async () => {
    prisma.rendezVous.findMany.mockResolvedValue([
      { id: 'RDV_1', idPatient: 'PAT_SEED_01', dateHeure: new Date('2026-07-15T09:00:00.000Z'), motif: 'Suivi' },
    ]);
    prisma.patient.findMany.mockResolvedValue([{ idPatient: 'PAT_SEED_01', prenom: 'Sophie', nom: 'Nicola' }]);
    const payload = await (await GET(req('http://x/api/praticien/rendez-vous'))).json();
    expect(payload.rendezVous[0].patient).toBe('Sophie Nicola');
    expect(payload.rendezVous[0].motif).toBe('Suivi');
  });
});

describe('POST /api/praticien/rendez-vous', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
    verifierAppartenancePatient.mockResolvedValue('accessible');
    prisma.patient.findUnique.mockResolvedValue({ actif: true, suiviClotureLe: null, prenom: 'Sophie', nom: 'Nicola' });
    prisma.rendezVous.create.mockResolvedValue({
      id: 'RDV_NEW',
      idPatient: 'PAT_SEED_01',
      dateHeure: new Date('2026-07-16T09:00:00.000Z'),
      motif: null,
    });
  });

  const corpsValide = { idPatient: 'PAT_SEED_01', dateHeure: '2026-07-16T09:00:00.000Z' };

  it('sans session : 401', async () => {
    getServerSession.mockResolvedValue(null);
    const res = await POST(req('http://x', corpsValide));
    expect(res.status).toBe(401);
  });

  it('date illisible : 400', async () => {
    const res = await POST(req('http://x', { idPatient: 'PAT_SEED_01', dateHeure: 'pas-une-date' }));
    expect(res.status).toBe(400);
    expect((await res.json()).reason).toBe('date_invalide');
  });

  it('patient d’un autre praticien : 403', async () => {
    verifierAppartenancePatient.mockResolvedValue('autre_praticien');
    const res = await POST(req('http://x', corpsValide));
    expect(res.status).toBe(403);
    expect(prisma.rendezVous.create).not.toHaveBeenCalled();
  });

  it('patient introuvable : 404', async () => {
    verifierAppartenancePatient.mockResolvedValue('introuvable');
    const res = await POST(req('http://x', corpsValide));
    expect(res.status).toBe(404);
  });

  it('dossier clos (suivi clôturé) : 409, aucune création', async () => {
    prisma.patient.findUnique.mockResolvedValue({
      actif: true,
      suiviClotureLe: new Date('2026-07-01'),
      prenom: 'Sophie',
      nom: 'Nicola',
    });
    const res = await POST(req('http://x', corpsValide));
    expect(res.status).toBe(409);
    expect(prisma.rendezVous.create).not.toHaveBeenCalled();
  });

  it('cas nominal : 201, praticienEmail pris de la session jamais du corps', async () => {
    const res = await POST(
      req('http://x', { ...corpsValide, praticienEmail: 'pirate@ailleurs.fr', motif: 'Suivi J14' }),
    );
    expect(res.status).toBe(201);
    const data = prisma.rendezVous.create.mock.calls[0][0].data;
    expect(data.praticienEmail).toBe('p@wellneuro.fr');
    expect(data.motif).toBe('Suivi J14');
  });
});
