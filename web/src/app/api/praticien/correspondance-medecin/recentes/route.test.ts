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

const LIGNE = {
  id: 'C1',
  idPatient: 'PAT_SEED_01',
  sens: 'entrant',
  medecinLibelle: 'Dr Exemple',
  consigneLe: new Date('2026-07-15T08:00:00.000Z'),
};

describe('GET /api/praticien/correspondance-medecin/recentes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
    prisma.correspondanceMedecin.findMany.mockResolvedValue([]);
    prisma.patient.findMany.mockResolvedValue([]);
  });

  it('sans session : 401 et `unavailable`', async () => {
    getServerSession.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
    expect((await res.json()).unavailable).toBe(true);
    expect(prisma.correspondanceMedecin.findMany).not.toHaveBeenCalled();
  });

  it('borne au praticien en session', async () => {
    await GET();
    expect(prisma.correspondanceMedecin.findMany.mock.calls[0][0].where.praticienEmail).toBe(
      'p@wellneuro.fr',
    );
  });

  it('ne SÉLECTIONNE plus le texte consigné — il ne sort pas de la base', async () => {
    // Le retrait porte sur le `select`, pas sur le rendu : un extrait retiré de
    // l'écran mais toujours chargé resterait à un `console.log` de distance.
    await GET();
    const select = prisma.correspondanceMedecin.findMany.mock.calls[0][0].select;
    expect(select.texte).toBeUndefined();
    expect(Object.keys(select)).not.toContain('texte');
  });

  it('ne sert aucun extrait, et plus aucun compteur', async () => {
    prisma.correspondanceMedecin.findMany.mockResolvedValue([LIGNE]);
    prisma.patient.findMany.mockResolvedValue([
      { idPatient: 'PAT_SEED_01', prenom: 'Sophie', nom: 'Nicola' },
    ]);
    const payload = await (await GET()).json();
    expect(payload.lignes[0].patient).toBe('Sophie Nicola');
    expect(payload.lignes[0].sens).toBe('entrant');
    expect(payload.lignes[0].medecinLibelle).toBe('Dr Exemple');
    expect(payload.lignes[0].extrait).toBeUndefined();
    // Le compteur a sa propre route : celle-ci ne compte plus rien, et n'a donc
    // plus de raison de lire au-delà des cinq dernières lignes.
    expect(payload.nbRecentes7j).toBeUndefined();
    expect(prisma.correspondanceMedecin.count).not.toHaveBeenCalled();
  });

  it('un sens hors vocabulaire est exposé `null`, JAMAIS replié sur « sortant »', async () => {
    // La route repliait `l.sens === 'entrant' ? 'entrant' : 'sortant'` pendant
    // que la fiche repliait dans l'autre sens : la même ligne se lisait
    // « Envoi consigné » ici et « Réponse transcrite » là-bas.
    prisma.correspondanceMedecin.findMany.mockResolvedValue([
      { ...LIGNE, id: 'C2', sens: 'valeur_inattendue' },
    ]);
    prisma.patient.findMany.mockResolvedValue([
      { idPatient: 'PAT_SEED_01', prenom: 'Sophie', nom: 'Nicola' },
    ]);
    const payload = await (await GET()).json();
    expect(payload.lignes[0].sens).toBeNull();
    expect(payload.lignes[0].sens).not.toBe('sortant');
  });
});
