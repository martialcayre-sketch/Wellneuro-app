import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, prisma, resolveProtocoleDiffuse, reconstructProtocolDraft } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    patient: { findUnique: vi.fn() },
    protocolDraft: { findUnique: vi.fn() },
    journalAccesDossier: { create: vi.fn(), deleteMany: vi.fn() },
  },
  resolveProtocoleDiffuse: vi.fn(),
  reconstructProtocolDraft: vi.fn(),
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/protocol/portailProtocol', () => ({ resolveProtocoleDiffuse }));
vi.mock('@/lib/protocol/fromPrisma', () => ({
  reconstructProtocolDraft,
  ProtocolPayloadIntegrityError: class extends Error {},
}));

import { GET } from './route';

const URL_BASE = 'http://localhost/api/praticien/ja/cycle?idPatient=PAT_TEST';

describe('api/praticien/ja/cycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });
    prisma.patient.findUnique.mockResolvedValue({ praticienEmail: 'praticien@wellneuro.fr' });
  });

  it('refuse sans session praticien', async () => {
    getServerSession.mockResolvedValue(null);
    expect((await GET(new Request(URL_BASE))).status).toBe(401);
  });

  it('refuse un patient hors périmètre du praticien', async () => {
    prisma.patient.findUnique.mockResolvedValue({ praticienEmail: 'autre@wellneuro.fr' });
    const res = await GET(new Request(URL_BASE));
    expect(res.status).toBe(403);
    expect(resolveProtocoleDiffuse).not.toHaveBeenCalled();
  });

  it('refuse un identifiant patient invalide', async () => {
    const res = await GET(new Request('http://localhost/api/praticien/ja/cycle?idPatient=PAT%20TEST'));
    expect(res.status).toBe(400);
  });

  it('rend protocoleDiffuse=false quand aucun protocole n’est diffusé', async () => {
    resolveProtocoleDiffuse.mockResolvedValue(null);
    const res = await GET(new Request(URL_BASE));
    const json = (await res.json()) as { ok: boolean; protocoleDiffuse: boolean; vue: unknown };

    expect(res.status).toBe(200);
    expect(json.protocoleDiffuse).toBe(false);
    expect(json.vue).toBeNull();
  });

  it('rend la même vue de cycle que la route patient', async () => {
    resolveProtocoleDiffuse.mockResolvedValue({
      protocolDraftId: 'PD_1',
      protocolDraftInputHash: 'abcdef0123456789ZZZZ',
      approvedAt: new Date('2026-07-20T08:00:00.000Z'),
    });
    prisma.protocolDraft.findUnique.mockResolvedValue({ payload: {}, inputHash: 'abcdef0123456789ZZZZ' });
    reconstructProtocolDraft.mockReturnValue({
      purpose: 'Rendre l’action alimentaire praticable.',
      actions: [{
        type: 'alimentation',
        title: 'Ajouter une source de protéines au petit-déjeuner',
        minimalPlan: 'Le faire trois fois cette semaine.',
        idealPlan: 'Chaque matin.',
      }],
    });

    const res = await GET(new Request(URL_BASE));
    const json = (await res.json()) as {
      ok: boolean;
      vue: {
        purpose: string;
        actionPrincipale: Record<string, unknown>;
        cycleRef: string;
        debutCycle: string;
      };
    };

    expect(res.status).toBe(200);
    expect(json.vue.cycleRef).toBe('abcdef0123456789');
    expect(json.vue.debutCycle).toBe('2026-07-20T08:00:00.000Z');
    expect(json.vue.actionPrincipale).toEqual({
      type: 'alimentation',
      title: 'Ajouter une source de protéines au petit-déjeuner',
      minimalPlan: 'Le faire trois fois cette semaine.',
    });
    // Le plan idéal reste interne au praticien : il ne transite pas par la vue
    // de cycle, qui est le miroir exact de ce que lit le patient.
    expect(json.vue.actionPrincipale.idealPlan).toBeUndefined();
  });
});
