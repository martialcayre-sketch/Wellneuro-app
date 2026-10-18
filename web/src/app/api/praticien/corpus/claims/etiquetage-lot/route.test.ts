import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, etiqueterClaimsLot } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  etiqueterClaimsLot: vi.fn(),
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma: {} }));
vi.mock('@/lib/rag/claims/revue', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/rag/claims/revue')>()),
  etiqueterClaimsLot,
}));

import { POST } from './route';

function requete(body: unknown): Request {
  return new Request('http://localhost/api/praticien/corpus/claims/etiquetage-lot', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const LIGNES = [
  { claimId: 'WN-CL-0056-001', besoins: [2], rubrique: 'limites' },
  { claimId: 'WN-CL-0056-002', besoins: [4, 2], rubrique: 'options' },
];

describe('/api/praticien/corpus/claims/etiquetage-lot', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerSession.mockResolvedValue({ user: { email: 'Praticien@wellneuro.fr' } });
    etiqueterClaimsLot.mockResolvedValue({ ok: true, n: 2 });
  });

  it('exige une session avec e-mail — jamais d’étiquetage anonyme', async () => {
    getServerSession.mockResolvedValue(null);
    expect((await POST(requete({ lignes: LIGNES }))).status).toBe(401);
    getServerSession.mockResolvedValue({ user: {} });
    expect((await POST(requete({ lignes: LIGNES }))).status).toBe(401);
    expect(etiqueterClaimsLot).not.toHaveBeenCalled();
  });

  it('étiquette la liste relue, au nom du praticien en session', async () => {
    const reponse = await POST(requete({ lignes: LIGNES }));
    expect(reponse.status).toBe(200);
    expect(await reponse.json()).toEqual({ ok: true, n: 2 });
    expect(etiqueterClaimsLot).toHaveBeenCalledWith({
      validateur: 'praticien@wellneuro.fr',
      lignes: [
        { claimId: 'WN-CL-0056-001', besoins: [2], rubrique: 'limites' },
        { claimId: 'WN-CL-0056-002', besoins: [2, 4], rubrique: 'options' },
      ],
    });
  });

  it('une liste vide, une ligne illisible ou en double : 422, rien n’est écrit', async () => {
    for (const corps of [
      {},
      { lignes: [] },
      { lignes: [{ claimId: 'WN-CL-0056-001', besoins: [2] }] },
      { lignes: [{ claimId: 'WN-CL-0056-001', besoins: [2], rubrique: 'adressage' }] },
      { lignes: [LIGNES[0], LIGNES[0]] },
    ]) {
      expect((await POST(requete(corps))).status).toBe(422);
    }
    expect(etiqueterClaimsLot).not.toHaveBeenCalled();
  });

  it('au-delà de 500 lignes : 422, rien n’est écrit', async () => {
    const lignes = Array.from({ length: 501 }, (_, i) => ({
      claimId: `WN-CL-${String(1000 + Math.floor(i / 1000))}-${String(i % 1000).padStart(3, '0')}`,
      besoins: [2],
      rubrique: 'limites',
    }));
    expect((await POST(requete({ lignes }))).status).toBe(422);
    expect(etiqueterClaimsLot).not.toHaveBeenCalled();
  });

  it('une exception : 500 sans contenu journalisé', async () => {
    const erreur = vi.spyOn(console, 'error').mockImplementation(() => {});
    etiqueterClaimsLot.mockRejectedValue(new Error('panne'));
    const reponse = await POST(requete({ lignes: LIGNES }));
    expect(reponse.status).toBe(500);
    expect(erreur).toHaveBeenCalledWith('[praticien/corpus/claims/etiquetage-lot POST]', 'panne');
    erreur.mockRestore();
  });

  it('des claims refusés par la base : 409 et chaque claim nommé', async () => {
    etiqueterClaimsLot.mockResolvedValue({
      ok: false,
      raison: 'claims_refuses',
      refus: [{ claimId: 'WN-CL-0056-002', raison: 'claim_non_valide' }],
    });
    const reponse = await POST(requete({ lignes: LIGNES }));
    expect(reponse.status).toBe(409);
    const corps = await reponse.json();
    expect(corps.reason).toBe('claims_refuses');
    expect(corps.refus).toEqual([{ claimId: 'WN-CL-0056-002', raison: 'claim_non_valide' }]);
  });

  it('un état qui bouge pendant le geste : 409, rien d’écrit', async () => {
    etiqueterClaimsLot.mockResolvedValue({ ok: false, raison: 'etat_divergent' });
    const reponse = await POST(requete({ lignes: LIGNES }));
    expect(reponse.status).toBe(409);
    expect((await reponse.json()).reason).toBe('etat_divergent');
  });
});
