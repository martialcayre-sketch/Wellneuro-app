import { beforeEach, describe, expect, it, vi } from 'vitest';

// Test minimal ciblé sur la garde d'appartenance et la journalisation des
// accès (G-TRUST-04) : le métier de la clôture est jugé par
// lib/copilote/minuteApres.test.ts, pas ici. Sans ce fichier, oublier le
// 3ᵉ argument `acces` sur cette route compilerait sans échec de test
// (paramètre optionnel).
const { getServerSession, prisma } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    patient: { findUnique: vi.fn() },
    protocolDraft: { findMany: vi.fn() },
    syntheseIA: { findMany: vi.fn() },
    protocolDiffusionApproval: { findMany: vi.fn() },
    journalAccesDossier: { create: vi.fn(), deleteMany: vi.fn() },
  },
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));

import { GET } from './route';

function request(query = 'idPatient=PAT_1'): Request {
  return new Request(`http://localhost/api/praticien/copilote/cloture?${query}`);
}

describe('GET /api/praticien/copilote/cloture — garde et journal des accès', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
    prisma.patient.findUnique.mockResolvedValue({ praticienEmail: 'p@wellneuro.fr' });
    prisma.protocolDraft.findMany.mockResolvedValue([]);
    prisma.syntheseIA.findMany.mockResolvedValue([]);
    prisma.protocolDiffusionApproval.findMany.mockResolvedValue([]);
  });

  it('un GET accessible journalise l’accès au gabarit littéral (G-TRUST-04)', async () => {
    const res = await GET(request());
    expect(res.status).toBe(200);
    expect(prisma.journalAccesDossier.create).toHaveBeenCalledTimes(1);
    expect(prisma.journalAccesDossier.create).toHaveBeenCalledWith({
      data: {
        idPatient: 'PAT_1',
        praticienEmail: 'p@wellneuro.fr',
        route: '/api/praticien/copilote/cloture',
        methode: 'GET',
      },
    });
  });

  // Les instantanés du carnet alimentaire vivent dans `protocol_drafts` et le
  // patient en écrit lui-même depuis le lot 2. La clôture prend le brouillon le
  // plus récent comme fil courant : sans exclusion, une transmission patient
  // ferait apparaître le protocole du praticien comme non relu et sa diffusion
  // comme caduque.
  it('exclut les instantanés du carnet alimentaire de la lecture des versions', async () => {
    await GET(request());
    expect(prisma.protocolDraft.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          contractVersion: { not: 'ja-food-observation-v1' },
        }),
      }),
    );
  });

  it('patient d’un autre praticien : 403, jamais journalisé', async () => {
    prisma.patient.findUnique.mockResolvedValue({ praticienEmail: 'autre@wellneuro.fr' });
    const res = await GET(request());
    expect(res.status).toBe(403);
    expect(prisma.protocolDraft.findMany).not.toHaveBeenCalled();
    // Un refus ne se journalise pas : la ligne nommerait un dossier non lu.
    expect(prisma.journalAccesDossier.create).not.toHaveBeenCalled();
  });

  it('patient inconnu : 404, jamais journalisé', async () => {
    prisma.patient.findUnique.mockResolvedValue(null);
    const res = await GET(request());
    expect(res.status).toBe(404);
    expect(prisma.journalAccesDossier.create).not.toHaveBeenCalled();
  });
});
