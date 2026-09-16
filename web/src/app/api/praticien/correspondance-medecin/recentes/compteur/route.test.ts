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

const JOUR_MS = 24 * 60 * 60 * 1000;
const ilYA = (jours: number) => new Date(Date.now() - jours * JOUR_MS);

describe('GET /api/praticien/correspondance-medecin/recentes/compteur', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
    prisma.correspondanceMedecin.findMany.mockResolvedValue([]);
  });

  it('sans session : 401 et `unavailable`', async () => {
    getServerSession.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
    expect((await res.json()).unavailable).toBe(true);
    expect(prisma.correspondanceMedecin.findMany).not.toHaveBeenCalled();
  });

  it('ne lit qu’une ligne par dossier, la plus récente, et aucune identité', async () => {
    await GET();
    const appel = prisma.correspondanceMedecin.findMany.mock.calls[0][0];
    expect(appel.where.praticienEmail).toBe('p@wellneuro.fr');
    expect(appel.distinct).toEqual(['idPatient']);
    expect(appel.orderBy).toEqual([{ idPatient: 'asc' }, { consigneLe: 'desc' }]);
    // Ni le texte consigné ni la désignation du médecin ne sortent de la base.
    expect(Object.keys(appel.select).sort()).toEqual(['consigneLe', 'idPatient', 'sens']);
    expect(prisma.patient.findMany).not.toHaveBeenCalled();
  });

  it('compte les dossiers où l’on a écrit et où rien n’est revenu', async () => {
    prisma.correspondanceMedecin.findMany.mockResolvedValue([
      { idPatient: 'PAT_A', sens: 'sortant', consigneLe: ilYA(30) },
      { idPatient: 'PAT_B', sens: 'sortant', consigneLe: ilYA(8) },
    ]);
    const payload = await (await GET()).json();
    expect(payload.nbEnAttente).toBe(2);
    expect(payload.delaiJours).toBe(7);
  });

  it('une réponse transcrite referme l’attente, même si un envoi la précède', async () => {
    // LE CŒUR DU CHANGEMENT. L'ancien compteur additionnait les deux sens, donc
    // transcrire la réponse FAISAIT MONTER le chiffre. Ici elle le fait
    // descendre : seule la dernière ligne du dossier décide.
    prisma.correspondanceMedecin.findMany.mockResolvedValue([
      { idPatient: 'PAT_A', sens: 'entrant', consigneLe: ilYA(20) },
    ]);
    const payload = await (await GET()).json();
    expect(payload.nbEnAttente).toBe(0);
  });

  it('un envoi récent n’est pas une attente', async () => {
    prisma.correspondanceMedecin.findMany.mockResolvedValue([
      { idPatient: 'PAT_A', sens: 'sortant', consigneLe: ilYA(2) },
    ]);
    expect((await (await GET()).json()).nbEnAttente).toBe(0);
  });

  it('un sens illisible n’invente pas une attente', async () => {
    // Pendant du refus d'affirmer posé en D-209 : une valeur hors vocabulaire
    // n'est pas un envoi, donc elle ne réclame pas de relance.
    prisma.correspondanceMedecin.findMany.mockResolvedValue([
      { idPatient: 'PAT_A', sens: 'valeur_inattendue', consigneLe: ilYA(40) },
    ]);
    expect((await (await GET()).json()).nbEnAttente).toBe(0);
  });

  it('une panne rend le compteur indisponible, jamais un zéro qui passerait pour un fait', async () => {
    prisma.correspondanceMedecin.findMany.mockRejectedValue(new Error('base injoignable'));
    const res = await GET();
    const payload = await res.json();
    expect(res.status).toBe(500);
    expect(payload.unavailable).toBe(true);
    expect(payload.nbEnAttente).toBe(0);
  });
});
