import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, deciderClaim } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  deciderClaim: vi.fn(),
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
// La lib réelle (et appartenance.ts pour emailPraticien) importe le client
// Prisma à l'import : neutralisé, aucun test ici ne touche la base.
vi.mock('@/lib/prisma', () => ({ prisma: {} }));
vi.mock('@/lib/rag/claims/revue', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/rag/claims/revue')>()),
  deciderClaim,
}));

import { POST } from './route';

const URL_BASE = 'http://localhost/api/praticien/corpus/claims/decision';

function requete(body: unknown): Request {
  return new Request(URL_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const CORPS = {
  id: 'WN-CL-0056-001@v1.0',
  decision: 'VALIDE',
  statutAttendu: 'EN_ATTENTE_VALIDATION',
};

describe('/api/praticien/corpus/claims/decision', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerSession.mockResolvedValue({ user: { email: 'Praticien@wellneuro.fr' } });
    deciderClaim.mockResolvedValue({
      ok: true,
      claim: {
        id: CORPS.id,
        statut: 'VALIDE',
        validateur: 'praticien@wellneuro.fr',
        valideAt: '2026-07-22T18:00:00.000Z',
      },
    });
  });

  it('exige une session, e-mail compris — jamais de signature anonyme', async () => {
    getServerSession.mockResolvedValue(null);
    expect((await POST(requete(CORPS))).status).toBe(401);

    getServerSession.mockResolvedValue({ user: {} });
    expect((await POST(requete(CORPS))).status).toBe(401);

    expect(deciderClaim).not.toHaveBeenCalled();
  });

  it('refuse un corps illisible ou malformé', async () => {
    const illisible = new Request(URL_BASE, { method: 'POST', body: '{pas du json' });
    expect((await POST(illisible)).status).toBe(400);

    expect((await POST(requete({ ...CORPS, id: 'WN-CL-0056-001' }))).status).toBe(400);
    expect((await POST(requete({ ...CORPS, decision: 'SUPPRIME' }))).status).toBe(400);
    expect((await POST(requete({ ...CORPS, statutAttendu: '' }))).status).toBe(400);
    expect(deciderClaim).not.toHaveBeenCalled();
  });

  it('signe avec l’e-mail praticien normalisé de la session', async () => {
    const reponse = await POST(requete(CORPS));
    expect(reponse.status).toBe(200);
    const json = await reponse.json();
    expect(json).toEqual({
      ok: true,
      claim: {
        id: CORPS.id,
        statut: 'VALIDE',
        validateur: 'praticien@wellneuro.fr',
        valideAt: '2026-07-22T18:00:00.000Z',
      },
    });
    expect(deciderClaim).toHaveBeenCalledWith({
      id: CORPS.id,
      decision: 'VALIDE',
      statutAttendu: 'EN_ATTENTE_VALIDATION',
      // emailPraticien normalise en minuscules : la signature est stable.
      validateur: 'praticien@wellneuro.fr',
    });
  });

  it('traduit les refus de la lib en statuts HTTP', async () => {
    deciderClaim.mockResolvedValue({ ok: false, raison: 'transition_invalide' });
    expect((await POST(requete(CORPS))).status).toBe(409);

    deciderClaim.mockResolvedValue({ ok: false, raison: 'claim_introuvable' });
    expect((await POST(requete(CORPS))).status).toBe(404);

    deciderClaim.mockResolvedValue({ ok: false, raison: 'etat_divergent' });
    const divergent = await POST(requete(CORPS));
    expect(divergent.status).toBe(409);
    expect((await divergent.json()).reason).toBe('etat_divergent');

    // Gardes d'intégrité à la signature : claim orphelin et verbatim modifié.
    deciderClaim.mockResolvedValue({ ok: false, raison: 'sources_absentes' });
    expect((await POST(requete(CORPS))).status).toBe(409);

    deciderClaim.mockResolvedValue({ ok: false, raison: 'source_derivee' });
    const derive = await POST(requete(CORPS));
    expect(derive.status).toBe(409);
    expect((await derive.json()).reason).toBe('source_derivee');
  });

  it('répond 500 sans détail interne sur une exception', async () => {
    deciderClaim.mockRejectedValue(new Error('timeout base'));
    const reponse = await POST(requete(CORPS));
    expect(reponse.status).toBe(500);
    expect((await reponse.json()).error).toBe('Erreur technique.');
  });
});
