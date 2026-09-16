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

describe('GET /api/praticien/correspondance-medecin/recentes/compteur', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
    prisma.correspondanceMedecin.count.mockResolvedValue(0);
  });

  it('sans session : 401 et `unavailable`', async () => {
    getServerSession.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
    expect((await res.json()).unavailable).toBe(true);
    expect(prisma.correspondanceMedecin.count).not.toHaveBeenCalled();
  });

  it('borne au praticien en session et compte la fenêtre de 7 jours', async () => {
    prisma.correspondanceMedecin.count.mockResolvedValue(3);
    const payload = await (await GET()).json();
    const where = prisma.correspondanceMedecin.count.mock.calls[0][0].where;
    expect(where.praticienEmail).toBe('p@wellneuro.fr');
    expect(where.consigneLe.gte).toBeInstanceOf(Date);
    expect(payload.nbRecentes7j).toBe(3);
  });

  it('NE LIT AUCUNE IDENTITÉ : ni ligne de correspondance, ni patient', async () => {
    // Le cœur de la séparation. Le badge du rail lisait une route qui servait
    // cinq dossiers nommés — et jetait les lignes. Ici la réponse ne peut
    // structurellement pas porter de donnée patient : c'est une garantie de
    // forme, pas une discipline de rendu.
    const payload = await (await GET()).json();
    expect(prisma.correspondanceMedecin.findMany).not.toHaveBeenCalled();
    expect(prisma.patient.findMany).not.toHaveBeenCalled();
    expect(Object.keys(payload)).toEqual(['ok', 'nbRecentes7j']);
  });

  it('une panne rend le compteur indisponible, jamais un zéro qui passerait pour un fait', async () => {
    prisma.correspondanceMedecin.count.mockRejectedValue(new Error('base injoignable'));
    const res = await GET();
    const payload = await res.json();
    expect(res.status).toBe(500);
    expect(payload.unavailable).toBe(true);
  });
});
