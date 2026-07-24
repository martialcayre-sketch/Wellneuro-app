import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, prisma } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    patient: { findMany: vi.fn() },
    protocolCheckin: { findMany: vi.fn() },
  },
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));

import { GET } from './route';

// La Météo de la patientèle réutilise l'agrégat SP-MET. Les gardes vérifiées
// ici sont celles de la frontière : praticien seul, aucun patient d'autrui,
// et JAMAIS un champ numérique de score dans la réponse.

const reponsesRegulieres = { adhesion: 'tous_les_jours', tolerance: 'bien', energie: 'stable', sommeil: 'stable' };

describe('GET /api/praticien/meteo-adhesion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
    prisma.patient.findMany.mockResolvedValue([]);
    prisma.protocolCheckin.findMany.mockResolvedValue([]);
  });

  it('sans session : 401 et `unavailable`', async () => {
    getServerSession.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
    expect((await res.json()).unavailable).toBe(true);
    expect(prisma.patient.findMany).not.toHaveBeenCalled();
  });

  it('borne la lecture au praticien en session', async () => {
    await GET();
    const where = prisma.patient.findMany.mock.calls[0][0].where;
    expect(where.actif).toBe(true);
    expect(where.praticienEmail).toEqual({ equals: 'p@wellneuro.fr', mode: 'insensitive' });
  });

  it('rend l’état nommé et sa source, sans aucun champ chiffré de score', async () => {
    prisma.patient.findMany.mockResolvedValue([{ idPatient: 'PAT_SEED_01', prenom: 'Sophie', nom: 'Nicola' }]);
    prisma.protocolCheckin.findMany.mockResolvedValue([
      {
        id: 'C1',
        idPatient: 'PAT_SEED_01',
        idAssignation: 'ASG',
        protocolDraftId: 'DRAFT',
        pointEtape: 'J14',
        reponses: reponsesRegulieres,
        canal: 'portail',
        supersedesCheckinId: null,
        soumisLe: new Date('2026-07-14T08:00:00.000Z'),
      },
    ]);
    const payload = await (await GET()).json();
    expect(payload.determinees).toHaveLength(1);
    const ligne = payload.determinees[0];
    expect(ligne.etat).toBe('reguliere');
    expect(ligne.pointEtapeSource).toBe('J14');
    // Aucune valeur numérique : ni score, ni pourcentage, ni classement.
    for (const valeur of Object.values(ligne)) {
      expect(typeof valeur).not.toBe('number');
    }
  });

  it('un check-in illisible n’est pas deviné : le patient reste indéterminé', async () => {
    prisma.patient.findMany.mockResolvedValue([{ idPatient: 'PAT_SEED_01', prenom: 'Sophie', nom: 'Nicola' }]);
    prisma.protocolCheckin.findMany.mockResolvedValue([
      {
        id: 'C1',
        idPatient: 'PAT_SEED_01',
        idAssignation: 'ASG',
        protocolDraftId: 'DRAFT',
        pointEtape: 'J14',
        reponses: { corrompu: true },
        canal: 'portail',
        supersedesCheckinId: null,
        soumisLe: new Date('2026-07-14T08:00:00.000Z'),
      },
    ]);
    const payload = await (await GET()).json();
    expect(payload.determinees).toEqual([]);
    expect(payload.nbIndeterminees).toBe(1);
  });
});
