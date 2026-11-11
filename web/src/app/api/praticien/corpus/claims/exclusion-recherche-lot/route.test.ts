import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, exclureDeLaRechercheLot } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  exclureDeLaRechercheLot: vi.fn(),
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma: {} }));
vi.mock('@/lib/rag/claims/revue', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/rag/claims/revue')>()),
  exclureDeLaRechercheLot,
}));

import { POST } from './route';

function requete(body: unknown): Request {
  return new Request('http://localhost/api/praticien/corpus/claims/exclusion-recherche-lot', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const LIGNES = [
  { claimId: 'WN-CL-0056-001', motif: 'dossier A' },
  { claimId: 'WN-CL-0056-002', versionClaim: 'v1.0', motif: ' dossier B ' },
];

describe('/api/praticien/corpus/claims/exclusion-recherche-lot ([[D-490]])', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerSession.mockResolvedValue({ user: { email: 'Praticien@wellneuro.fr' } });
    exclureDeLaRechercheLot.mockResolvedValue({ ok: true, n: 2, inchanges: 0 });
  });

  it('exige une session avec e-mail — jamais un geste anonyme', async () => {
    getServerSession.mockResolvedValue(null);
    expect((await POST(requete({ sens: 'exclure', lignes: LIGNES }))).status).toBe(401);
    getServerSession.mockResolvedValue({ user: {} });
    expect((await POST(requete({ sens: 'exclure', lignes: LIGNES }))).status).toBe(401);
    expect(exclureDeLaRechercheLot).not.toHaveBeenCalled();
  });

  it('traite la liste relue, au nom du praticien en session', async () => {
    const reponse = await POST(requete({ sens: 'exclure', lignes: LIGNES }));
    expect(reponse.status).toBe(200);
    expect(await reponse.json()).toEqual({ ok: true, n: 2, inchanges: 0 });
    expect(exclureDeLaRechercheLot).toHaveBeenCalledWith({
      sens: 'exclure',
      validateur: 'praticien@wellneuro.fr',
      lignes: [
        { claimId: 'WN-CL-0056-001', motif: 'dossier A' },
        { claimId: 'WN-CL-0056-002', versionClaim: 'v1.0', motif: 'dossier B' },
      ],
    });
  });

  it('sens absent ou inconnu : 400', async () => {
    expect((await POST(requete({ lignes: LIGNES }))).status).toBe(400);
    expect((await POST(requete({ sens: 'masquer', lignes: LIGNES }))).status).toBe(400);
    expect(exclureDeLaRechercheLot).not.toHaveBeenCalled();
  });

  it('une liste vide, une ligne sans motif, illisible ou en double : 422, rien n’est écrit', async () => {
    for (const lignes of [
      undefined,
      [],
      [{ claimId: 'WN-CL-0056-001' }],
      [{ claimId: 'WN-CL-0056-001', motif: ' ' }],
      [{ claimId: 'WN-CL-56-1', motif: 'm' }],
      [LIGNES[0], LIGNES[0]],
    ]) {
      expect((await POST(requete({ sens: 'exclure', lignes }))).status).toBe(422);
    }
    expect(exclureDeLaRechercheLot).not.toHaveBeenCalled();
  });

  it('au-delà de 500 lignes : 422, rien n’est écrit', async () => {
    const lignes = Array.from({ length: 501 }, (_, i) => ({
      claimId: `WN-CL-${String(1000 + Math.floor(i / 1000))}-${String(i % 1000).padStart(3, '0')}`,
      motif: 'm',
    }));
    expect((await POST(requete({ sens: 'exclure', lignes }))).status).toBe(422);
    expect(exclureDeLaRechercheLot).not.toHaveBeenCalled();
  });

  it('des claims refusés (non VALIDE…) : 409, tout ou rien, chaque claim nommé', async () => {
    exclureDeLaRechercheLot.mockResolvedValue({
      ok: false,
      raison: 'claims_refuses',
      refus: [{ claimId: 'WN-CL-0056-002', raison: 'claim_non_valide' }],
    });
    const reponse = await POST(requete({ sens: 'exclure', lignes: LIGNES }));
    expect(reponse.status).toBe(409);
    const corps = await reponse.json();
    expect(corps.reason).toBe('claims_refuses');
    expect(corps.refus).toEqual([{ claimId: 'WN-CL-0056-002', raison: 'claim_non_valide' }]);
  });

  it('un état qui bouge pendant le geste : 409, rien d’écrit', async () => {
    exclureDeLaRechercheLot.mockResolvedValue({ ok: false, raison: 'etat_divergent' });
    const reponse = await POST(requete({ sens: 'retablir', lignes: LIGNES }));
    expect(reponse.status).toBe(409);
    expect((await reponse.json()).reason).toBe('etat_divergent');
  });

  it('une exception : 500 sans contenu journalisé', async () => {
    const erreur = vi.spyOn(console, 'error').mockImplementation(() => {});
    exclureDeLaRechercheLot.mockRejectedValue(new Error('panne'));
    expect((await POST(requete({ sens: 'exclure', lignes: LIGNES }))).status).toBe(500);
    expect(erreur).toHaveBeenCalledWith('[praticien/corpus/claims/exclusion-recherche-lot POST]', 'panne');
    erreur.mockRestore();
  });
});
