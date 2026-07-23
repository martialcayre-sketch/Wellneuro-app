import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, prisma } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    rendezVous: { findUnique: vi.fn(), update: vi.fn() },
  },
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/praticien/appartenance', () => ({
  emailPraticien: (s: { user?: { email?: string } } | null) => s?.user?.email?.toLowerCase() ?? null,
}));

import { POST } from './route';

const req = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) });

describe('POST /api/praticien/rendez-vous/annulation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
    prisma.rendezVous.findUnique.mockResolvedValue({ praticienEmail: 'p@wellneuro.fr', statut: 'planifie' });
    prisma.rendezVous.update.mockResolvedValue({});
  });

  it('sans session : 401', async () => {
    getServerSession.mockResolvedValue(null);
    expect((await POST(req({ id: 'RDV_1' }))).status).toBe(401);
  });

  it('rendez-vous d’un autre praticien : 404, aucune écriture', async () => {
    prisma.rendezVous.findUnique.mockResolvedValue({ praticienEmail: 'autre@wellneuro.fr', statut: 'planifie' });
    const res = await POST(req({ id: 'RDV_1' }));
    expect(res.status).toBe(404);
    expect(prisma.rendezVous.update).not.toHaveBeenCalled();
  });

  it('annule en posant le statut et la date, jamais une suppression', async () => {
    const res = await POST(req({ id: 'RDV_1' }));
    expect(res.status).toBe(200);
    const data = prisma.rendezVous.update.mock.calls[0][0].data;
    expect(data.statut).toBe('annule');
    expect(data.annuleLe).toBeInstanceOf(Date);
  });

  it('idempotent : un rendez-vous déjà annulé n’est pas ré-écrit', async () => {
    prisma.rendezVous.findUnique.mockResolvedValue({ praticienEmail: 'p@wellneuro.fr', statut: 'annule' });
    const res = await POST(req({ id: 'RDV_1' }));
    expect(res.status).toBe(200);
    expect(prisma.rendezVous.update).not.toHaveBeenCalled();
  });
});
