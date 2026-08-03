import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

const URL_BASE = 'http://localhost/api/praticien/corpus/rayons';

const VIDE = {
  contractVersion: 'c4-rayon-corpus-v2',
  rayon: 'cognition',
  disponible: true,
  corpusVide: true,
  claims: [],
  message: 'Corpus en cours de constitution — aucun claim validé pour ce rayon.',
};

describe('/api/praticien/corpus/rayons', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.WN_RECHERCHE_CORPUS_ENABLED = 'true';
    getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });
    servirRayonCorpus.mockResolvedValue(VIDE);
  });

  afterEach(() => {
    delete process.env.WN_RECHERCHE_CORPUS_ENABLED;
    delete process.env.WN_C4_ENABLED;
  });

  it('exige une session authentifiée', async () => {
    getServerSession.mockResolvedValue(null);
    const res = await GET(new Request(`${URL_BASE}?rayon=cognition&requete=mémoire`));
    expect(res.status).toBe(401);
    expect(servirRayonCorpus).not.toHaveBeenCalled();
  });

  it('répond 404 fail-closed quand WN_RECHERCHE_CORPUS_ENABLED est éteint', async () => {
    delete process.env.WN_RECHERCHE_CORPUS_ENABLED;
    const res = await GET(new Request(`${URL_BASE}?rayon=cognition&requete=mémoire`));
    expect(res.status).toBe(404);
    expect((await res.json()).reason).toBe('flag_eteint');
    expect(servirRayonCorpus).not.toHaveBeenCalled();
  });

  it('ne dépend pas de WN_C4_ENABLED (gate distincte du catalogue compléments)', async () => {
    delete process.env.WN_C4_ENABLED;
    const res = await GET(new Request(`${URL_BASE}?rayon=cognition&requete=mémoire`));
    expect(res.status).toBe(200);
  });

  it('refuse un rayon manquant ou syntaxiquement invalide', async () => {
    const res = await GET(new Request(`${URL_BASE}?requete=mémoire`));
    expect(res.status).toBe(400);
    expect((await res.json()).reason).toBe('rayon_invalide');
    expect(servirRayonCorpus).not.toHaveBeenCalled();
  });

  // Le défaut bloquant trouvé en revue : une regex syntaxique seule laisserait
  // cette route servir N'IMPORTE QUEL rayon de RAYON_VERS_NOTEBOOK, y compris
  // micronutrition — en contournant WN_C4_ENABLED. L'allowlist
  // RAYONS_RECHERCHE_CORPUS doit refuser tout rayon hors cognition/intestin,
  // même syntaxiquement valide et même déclaré ailleurs dans la carte.
  it.each(['micronutrition', 'biologie', 'nutrition', 'stress', 'humeur', 'sommeil'])(
    'refuse le rayon « %s » (hors allowlist de cette route, malgré sa présence dans RAYON_VERS_NOTEBOOK)',
    async (rayon) => {
      const res = await GET(new Request(`${URL_BASE}?rayon=${rayon}&requete=mémoire`));
      expect(res.status).toBe(400);
      expect((await res.json()).reason).toBe('rayon_invalide');
      expect(servirRayonCorpus).not.toHaveBeenCalled();
    },
  );

  it('refuse une requête au-delà de la longueur maximale', async () => {
    const requete = 'a'.repeat(501);
    const res = await GET(new Request(`${URL_BASE}?rayon=cognition&requete=${requete}`));
    expect(res.status).toBe(400);
    expect((await res.json()).reason).toBe('requete_invalide');
    expect(servirRayonCorpus).not.toHaveBeenCalled();
  });

  it('sert le rayon corpus (corpus vide géré sans erreur, 200)', async () => {
    const res = await GET(new Request(`${URL_BASE}?rayon=intestin&requete=microbiote%20axe`));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.corpusVide).toBe(true);
    expect(servirRayonCorpus).toHaveBeenCalledWith({ rayon: 'intestin', requete: 'microbiote axe' });
  });

  it('requête absente avec un rayon valide : appelle le service avec une requête vide (corpusVide attendu)', async () => {
    const res = await GET(new Request(`${URL_BASE}?rayon=cognition`));
    expect(res.status).toBe(200);
    expect(servirRayonCorpus).toHaveBeenCalledWith({ rayon: 'cognition', requete: '' });
  });
});
