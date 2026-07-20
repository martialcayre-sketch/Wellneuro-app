import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, prisma } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    patient: { findMany: vi.fn(), count: vi.fn(), findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    assignation: { findMany: vi.fn() },
  },
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));

import { GET, PATCH, DELETE } from './route';

function get(query = ''): Request {
  return new Request(`http://localhost/api/praticien/patients${query ? `?${query}` : ''}`);
}

function patch(body: Record<string, unknown>): Request {
  return new Request('http://localhost/api/praticien/patients', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function del(query: string): Request {
  return new Request(`http://localhost/api/praticien/patients?${query}`, { method: 'DELETE' });
}

// Régression E7 — cette route renvoyait tous les patients de la base (e-mail,
// téléphone inclus) et laissait PATCH/DELETE muter n'importe lequel, sans
// vérifier l'appartenance au praticien en session. Garde ajoutée 2026-07-21.
describe('GET /api/praticien/patients', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
    prisma.patient.findMany.mockResolvedValue([]);
    prisma.patient.count.mockResolvedValue(0);
    prisma.assignation.findMany.mockResolvedValue([]);
  });

  it('refuse sans session (401)', async () => {
    getServerSession.mockResolvedValue(null);
    const res = await GET(get());
    expect(res.status).toBe(401);
    expect(prisma.patient.findMany).not.toHaveBeenCalled();
  });

  it('liste non paginée : scope patients et assignations au praticien en session', async () => {
    await GET(get());
    expect(prisma.patient.findMany).toHaveBeenCalledWith({
      where: { praticienEmail: { equals: 'p@wellneuro.fr', mode: 'insensitive' } },
      orderBy: [{ nom: 'asc' }, { prenom: 'asc' }],
    });
    expect(prisma.assignation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { patient: { praticienEmail: { equals: 'p@wellneuro.fr', mode: 'insensitive' } } } })
    );
  });

  it('liste paginée : scope aussi le where de recherche', async () => {
    await GET(get('page=1&search=Nicola'));
    const where = prisma.patient.findMany.mock.calls[0][0].where;
    expect(where.praticienEmail).toEqual({ equals: 'p@wellneuro.fr', mode: 'insensitive' });
    expect(where.OR).toBeDefined();
    expect(prisma.patient.count).toHaveBeenCalledWith({ where });
  });
});

describe('PATCH /api/praticien/patients', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
    prisma.patient.findUnique.mockResolvedValue({ idPatient: 'PAT001', praticienEmail: 'p@wellneuro.fr' });
    prisma.patient.update.mockResolvedValue({});
  });

  it('patient d’un autre praticien : 403, aucune écriture', async () => {
    prisma.patient.findUnique.mockResolvedValue({ idPatient: 'PAT001', praticienEmail: 'autre@wellneuro.fr' });
    const res = await PATCH(patch({ idPatient: 'PAT001', actif: 'NON' }));
    expect(res.status).toBe(403);
    expect(prisma.patient.update).not.toHaveBeenCalled();
  });

  it('patient accessible : autorise la modification', async () => {
    const res = await PATCH(patch({ idPatient: 'PAT001', actif: 'NON' }));
    expect(res.status).toBe(200);
    expect(prisma.patient.update).toHaveBeenCalledOnce();
  });
});

describe('DELETE /api/praticien/patients', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
  });

  it('patient d’un autre praticien : le where scopé ne matche aucune ligne → 404', async () => {
    // Simule le comportement réel de Postgres : le praticienEmail scopé exclut
    // la ligne d'un autre praticien, updateMany ne touche rien.
    prisma.patient.updateMany.mockResolvedValue({ count: 0 });
    const res = await DELETE(del('idPatient=PAT_1'));
    expect(res.status).toBe(404);
    expect(prisma.patient.updateMany).toHaveBeenCalledWith({
      where: { idPatient: 'PAT_1', praticienEmail: { equals: 'p@wellneuro.fr', mode: 'insensitive' } },
      data: { actif: false },
    });
  });

  it('patient accessible : désactive (200)', async () => {
    prisma.patient.updateMany.mockResolvedValue({ count: 1 });
    const res = await DELETE(del('idPatient=PAT_1'));
    expect(res.status).toBe(200);
  });
});
