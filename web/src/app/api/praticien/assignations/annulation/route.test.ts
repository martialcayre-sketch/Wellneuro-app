import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, prisma } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    assignation: { findFirst: vi.fn(), update: vi.fn() },
  },
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/praticien/appartenance', () => ({
  emailPraticien: (s: { user?: { email?: string } } | null) => s?.user?.email?.toLowerCase() ?? null,
  filtrePatientsDuPraticien: (email: string) => ({ praticienEmail: { equals: email, mode: 'insensitive' } }),
}));

import { POST } from './route';

const req = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) });

describe('POST /api/praticien/assignations/annulation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
    // Assignation ouverte du praticien de session par défaut.
    prisma.assignation.findFirst.mockResolvedValue({ statut: 'En attente', statutReponses: 'non_rempli' });
    prisma.assignation.update.mockResolvedValue({});
  });

  it('sans session : 401, aucune écriture', async () => {
    getServerSession.mockResolvedValue(null);
    expect((await POST(req({ idAssignation: 'ASS_1' }))).status).toBe(401);
    expect(prisma.assignation.update).not.toHaveBeenCalled();
  });

  it('identifiant absent : 400, aucune écriture', async () => {
    const res = await POST(req({}));
    expect(res.status).toBe(400);
    expect(prisma.assignation.update).not.toHaveBeenCalled();
  });

  it('assignation d’un autre praticien : 404, aucune écriture', async () => {
    // La garde d'appartenance (findFirst scopé) ne la trouve pas.
    prisma.assignation.findFirst.mockResolvedValue(null);
    const res = await POST(req({ idAssignation: 'ASS_1' }));
    expect(res.status).toBe(404);
    expect(prisma.assignation.update).not.toHaveBeenCalled();
  });

  it('annule une ouverte en posant statut = Annulée (un update, jamais un delete)', async () => {
    const res = await POST(req({ idAssignation: 'ASS_1' }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    const data = prisma.assignation.update.mock.calls[0][0].data;
    expect(data.statut).toBe('Annulée');
    // Le mock n'expose PAS de méthode `delete` : une suppression casserait la
    // suite, ce que la route ne fait jamais (statut daté, patron rendez-vous).
    expect('delete' in prisma.assignation).toBe(false);
  });

  it('refuse une assignation soumise (verrouille) : 409, statut inchangé', async () => {
    prisma.assignation.findFirst.mockResolvedValue({ statut: 'Complété', statutReponses: 'verrouille' });
    const res = await POST(req({ idAssignation: 'ASS_1' }));
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ ok: false, reason: 'already_filled' });
    expect(prisma.assignation.update).not.toHaveBeenCalled();
  });

  it('refuse une correction en cours (modification_demandee) : 409', async () => {
    prisma.assignation.findFirst.mockResolvedValue({ statut: 'Complété', statutReponses: 'modification_demandee' });
    expect((await POST(req({ idAssignation: 'ASS_1' }))).status).toBe(409);
    expect(prisma.assignation.update).not.toHaveBeenCalled();
  });

  it('refuse une incohérence statut=Complété malgré non_rempli : 409', async () => {
    // Isole la clause `|| statut === 'Complété'` du garde de portée : sans elle,
    // cette incohérence passerait (statutReponses vaut bien 'non_rempli').
    prisma.assignation.findFirst.mockResolvedValue({ statut: 'Complété', statutReponses: 'non_rempli' });
    expect((await POST(req({ idAssignation: 'ASS_1' }))).status).toBe(409);
    expect(prisma.assignation.update).not.toHaveBeenCalled();
  });

  it('idempotent : une assignation déjà annulée n’est pas ré-écrite', async () => {
    prisma.assignation.findFirst.mockResolvedValue({ statut: 'Annulée', statutReponses: 'non_rempli' });
    const res = await POST(req({ idAssignation: 'ASS_1' }));
    expect(res.status).toBe(200);
    expect(prisma.assignation.update).not.toHaveBeenCalled();
  });
});
