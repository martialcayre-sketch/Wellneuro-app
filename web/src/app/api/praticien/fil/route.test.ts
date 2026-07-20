import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, prisma } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    trustAdverseEffectReport: { findMany: vi.fn() },
    trustPrivacyIncident: { findMany: vi.fn() },
    trustRightsRequest: { findMany: vi.fn() },
    syntheseIA: { findMany: vi.fn() },
    assignation: { findMany: vi.fn() },
    questionnaireReponse: { findMany: vi.fn(), groupBy: vi.fn() },
    patient: { findMany: vi.fn() },
  },
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));

import { GET } from './route';

// L'accueil praticien (SP-FIL LOT-01) n'avait aucun test de route. Les gardes
// vérifiées ici sont celles dont dépend l'honnêteté du Fil : une session
// absente ne doit jamais produire un fil vide (« rien à traiter » serait faux),
// et un patient inactif ne doit jamais réapparaître dans les cartes.

describe('GET /api/praticien/fil', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
    prisma.trustAdverseEffectReport.findMany.mockResolvedValue([]);
    prisma.trustPrivacyIncident.findMany.mockResolvedValue([]);
    prisma.trustRightsRequest.findMany.mockResolvedValue([]);
    prisma.syntheseIA.findMany.mockResolvedValue([]);
    prisma.assignation.findMany.mockResolvedValue([]);
    prisma.questionnaireReponse.findMany.mockResolvedValue([]);
    prisma.questionnaireReponse.groupBy.mockResolvedValue([]);
    prisma.patient.findMany.mockResolvedValue([]);
  });

  it('sans session : 401 et `unavailable`, jamais un fil vide silencieux', async () => {
    getServerSession.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
    const payload = await res.json();
    expect(payload.unavailable).toBe(true);
    expect(prisma.assignation.findMany).not.toHaveBeenCalled();
  });

  it('aucune matière : 200 avec un fil vide et sans drapeau d’indisponibilité', async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const payload = await res.json();
    expect(payload.cartes).toEqual([]);
    expect(payload.unavailable).toBeUndefined();
  });

  it('un patient inactif ne produit aucune carte', async () => {
    prisma.questionnaireReponse.findMany.mockResolvedValue([
      { idPatient: 'PAT_INACTIF', idQuestionnaire: 'Q_1', dateReponse: new Date() },
    ]);
    // Le second appel ne remonte que les patients actifs : la carte doit
    // disparaître plutôt que d'afficher un patient sans nom.
    prisma.patient.findMany.mockResolvedValue([]);
    const res = await GET();
    const payload = await res.json();
    expect(payload.cartes).toEqual([]);
  });

  it('une réponse récente d’un patient actif produit une carte sourcée', async () => {
    const dateReponse = new Date();
    prisma.questionnaireReponse.findMany.mockResolvedValue([
      { idReponse: 'REP_1', idPatient: 'PAT_SEED_01', idQuestionnaire: 'Q_1', dateReponse },
    ]);
    prisma.patient.findMany.mockResolvedValue([
      { idPatient: 'PAT_SEED_01', prenom: 'Sophie', nom: 'Nicola' },
    ]);
    const res = await GET();
    const payload = await res.json();
    expect(payload.cartes.length).toBeGreaterThan(0);
    const carte = payload.cartes[0];
    expect(carte.patient).toContain('Sophie');
    // Chaque carte porte son « pourquoi maintenant » et une action explicite.
    expect(carte.pourquoi).toBeTruthy();
    expect(carte.href).toBeTruthy();
    expect(carte.actionLabel).toBeTruthy();
    // Prérequis de G1 : la carte est identifiée par sa ligne source.
    expect(carte.cle).toBe('reponse_recente:REP_1');
  });

  // Sans l'identifiant dans le `select`, la clé vaudrait silencieusement
  // « …:undefined » : toutes les cartes d'un même type se confondraient, et un
  // refus persisté en emporterait d'autres. Le contrat se vérifie ici, à
  // l'endroit où il peut être cassé par inadvertance.
  it('chaque requête du Fil sélectionne l’identifiant de sa ligne source', async () => {
    await GET();
    const selectDe = (mock: { mock: { calls: { select?: Record<string, boolean> }[][] } }) =>
      mock.mock.calls[0][0].select ?? {};

    expect(selectDe(prisma.trustAdverseEffectReport.findMany).id).toBe(true);
    expect(selectDe(prisma.trustPrivacyIncident.findMany).id).toBe(true);
    expect(selectDe(prisma.trustRightsRequest.findMany).id).toBe(true);
    expect(selectDe(prisma.syntheseIA.findMany).idSynthese).toBe(true);
    expect(selectDe(prisma.assignation.findMany).idAssignation).toBe(true);
    expect(selectDe(prisma.questionnaireReponse.findMany).idReponse).toBe(true);
  });

  it('une panne de lecture est annoncée, jamais présentée comme un fil vide', async () => {
    prisma.assignation.findMany.mockRejectedValue(new Error('base indisponible'));
    const res = await GET();
    const payload = await res.json();
    expect(payload.unavailable).toBe(true);
    expect(payload.cartes).toEqual([]);
  });
});
