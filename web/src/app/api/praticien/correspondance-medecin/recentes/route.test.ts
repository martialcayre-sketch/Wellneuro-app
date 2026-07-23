import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, prisma } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    correspondanceMedecin: { findMany: vi.fn(), count: vi.fn() },
    patient: { findMany: vi.fn() },
  },
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));

import { GET } from './route';

describe('GET /api/praticien/correspondance-medecin/recentes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
    prisma.correspondanceMedecin.findMany.mockResolvedValue([]);
    prisma.correspondanceMedecin.count.mockResolvedValue(0);
    prisma.patient.findMany.mockResolvedValue([]);
  });

  it('sans session : 401 et `unavailable`', async () => {
    getServerSession.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
    expect((await res.json()).unavailable).toBe(true);
    expect(prisma.correspondanceMedecin.findMany).not.toHaveBeenCalled();
  });

  it('borne au praticien en session et renvoie le compteur 7 jours', async () => {
    prisma.correspondanceMedecin.count.mockResolvedValue(3);
    const payload = await (await GET()).json();
    expect(prisma.correspondanceMedecin.findMany.mock.calls[0][0].where.praticienEmail).toBe('p@wellneuro.fr');
    expect(payload.nbRecentes7j).toBe(3);
  });

  it('n’expose qu’un extrait court du texte, jamais l’intégralité', async () => {
    const texteLong = 'x'.repeat(400);
    prisma.correspondanceMedecin.findMany.mockResolvedValue([
      {
        id: 'C1',
        idPatient: 'PAT_SEED_01',
        sens: 'entrant',
        medecinLibelle: 'Dr Exemple',
        texte: texteLong,
        consigneLe: new Date('2026-07-15T08:00:00.000Z'),
      },
    ]);
    prisma.patient.findMany.mockResolvedValue([{ idPatient: 'PAT_SEED_01', prenom: 'Sophie', nom: 'Nicola' }]);
    const payload = await (await GET()).json();
    expect(payload.lignes[0].patient).toBe('Sophie Nicola');
    expect(payload.lignes[0].sens).toBe('entrant');
    expect(payload.lignes[0].extrait.length).toBeLessThan(texteLong.length);
    expect(payload.lignes[0].extrait.endsWith('…')).toBe(true);
  });
});
