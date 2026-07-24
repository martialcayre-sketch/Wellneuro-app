import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, resoudreIntentions } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  resoudreIntentions: vi.fn(),
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma: {} }));
vi.mock('@/lib/supplement-library/resolution', () => ({ resoudreIntentions }));

import { POST } from './route';

const URL_BASE = 'http://localhost/api/praticien/regles/previsualisation';

const RESOLUTION = {
  contractVersion: 'c4b-resolution-v1',
  intentions: [],
  codesInconnus: ['code_inconnu'],
  aucunScoreAgrege: true,
};

function requete(body: unknown): Request {
  return new Request(URL_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('/api/praticien/regles/previsualisation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.WN_C4_ENABLED = 'true';
    getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });
    resoudreIntentions.mockResolvedValue(RESOLUTION);
  });

  it('exige une session et le drapeau C4 — fail-closed avant toute résolution', async () => {
    getServerSession.mockResolvedValue(null);
    expect((await POST(requete({ codes: ['sommeil_fragmente'] }))).status).toBe(401);

    getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });
    delete process.env.WN_C4_ENABLED;
    expect((await POST(requete({ codes: ['sommeil_fragmente'] }))).status).toBe(404);
    expect(resoudreIntentions).not.toHaveBeenCalled();
  });

  it('appelle la résolution AVEC inclureNonValidees — prévisualisation d’atelier seulement', async () => {
    const reponse = await POST(requete({ codes: ['sommeil_fragmente', 'stress_chronique'] }));
    expect(reponse.status).toBe(200);
    const json = await reponse.json();
    expect(json.ok).toBe(true);
    expect(json.resolution).toEqual(RESOLUTION);
    // LE contrat de cette route : les brouillons sortent, marqués — c'est la
    // seule surface autorisée à passer inclureNonValidees: true.
    expect(resoudreIntentions).toHaveBeenCalledWith(
      ['sommeil_fragmente', 'stress_chronique'],
      { inclureNonValidees: true },
    );
  });

  it('borne les codes (1 à 20, chaînes non vides)', async () => {
    expect((await POST(requete({ codes: [] }))).status).toBe(400);
    expect((await POST(requete({ codes: ['   '] }))).status).toBe(400);
    expect((await POST(requete({ codes: 'sommeil' }))).status).toBe(400);
    expect(
      (await POST(requete({ codes: Array.from({ length: 21 }, (_, i) => `code_${i}`) }))).status,
    ).toBe(400);
    expect(resoudreIntentions).not.toHaveBeenCalled();
  });

  it('répond 500 sans détail interne sur une exception de résolution', async () => {
    resoudreIntentions.mockRejectedValue(new Error('timeout base'));
    const reponse = await POST(requete({ codes: ['sommeil_fragmente'] }));
    expect(reponse.status).toBe(500);
    expect((await reponse.json()).error).toBe('Erreur technique.');
  });
});
