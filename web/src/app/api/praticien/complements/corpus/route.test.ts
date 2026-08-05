import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, servirRayonCorpus } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  servirRayonCorpus: vi.fn(),
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma: {} }));
vi.mock('@/lib/supplement-library/rayonCorpus', async (importActual) => {
  const actual = await importActual<typeof import('@/lib/supplement-library/rayonCorpus')>();
  return { ...actual, servirRayonCorpus };
});

import { GET } from './route';
import { RAYON_MICRONUTRITION, RAYON_VERS_NOTEBOOK } from '@/lib/supplement-library/rayonCorpus';

const URL_BASE = 'http://localhost/api/praticien/complements/corpus';

const VIDE = {
  contractVersion: 'c4-rayon-corpus-v2',
  rayon: 'micronutrition',
  disponible: true,
  corpusVide: true,
  claims: [],
  message: 'Corpus en cours de constitution — aucun claim validé pour ce rayon.',
};

describe('/api/praticien/complements/corpus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.WN_C4_ENABLED = 'true';
    getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });
    servirRayonCorpus.mockResolvedValue(VIDE);
  });

  it('exige une session authentifiée', async () => {
    getServerSession.mockResolvedValue(null);
    const res = await GET(new Request(`${URL_BASE}?requete=magnésium`));
    expect(res.status).toBe(401);
    expect(servirRayonCorpus).not.toHaveBeenCalled();
  });

  it('répond 404 fail-closed quand WN_C4_ENABLED est éteint', async () => {
    delete process.env.WN_C4_ENABLED;
    const res = await GET(new Request(`${URL_BASE}?requete=magnésium`));
    expect(res.status).toBe(404);
    expect((await res.json()).reason).toBe('flag_eteint');
    expect(servirRayonCorpus).not.toHaveBeenCalled();
  });

  it('refuse un rayon invalide', async () => {
    const res = await GET(new Request(`${URL_BASE}?requete=magnésium&rayon=Pas Un Rayon`));
    expect(res.status).toBe(400);
    expect((await res.json()).reason).toBe('rayon_invalide');
    expect(servirRayonCorpus).not.toHaveBeenCalled();
  });

  // Cette route ne sert QUE micronutrition. Une validation syntaxique (l'ancienne
  // regex) laissait passer tout rayon de RAYON_VERS_NOTEBOOK : les rayons de la
  // recherche corpus clinique (cognition, douleur, intestin), gardés par
  // WN_RECHERCHE_CORPUS_ENABLED, devenaient joignables derrière WN_C4_ENABLED
  // seul — leur drapeau cessait d'être un interrupteur. Liste DÉRIVÉE du mapping :
  // un rayon ajouté demain est couvert sans toucher ce test.
  it.each(Object.keys(RAYON_VERS_NOTEBOOK).filter((r) => r !== RAYON_MICRONUTRITION))(
    'refuse le rayon « %s » (hors allowlist de cette route, malgré sa présence dans RAYON_VERS_NOTEBOOK)',
    async (rayon) => {
      const res = await GET(new Request(`${URL_BASE}?requete=magnésium&rayon=${rayon}`));
      expect(res.status).toBe(400);
      expect((await res.json()).reason).toBe('rayon_invalide');
      expect(servirRayonCorpus).not.toHaveBeenCalled();
    },
  );

  it('sert le rayon corpus (corpus vide géré sans erreur, 200)', async () => {
    const res = await GET(new Request(`${URL_BASE}?requete=magnésium%20sommeil`));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.corpusVide).toBe(true);
    expect(servirRayonCorpus).toHaveBeenCalledWith({ rayon: 'micronutrition', requete: 'magnésium sommeil' });
  });
});
