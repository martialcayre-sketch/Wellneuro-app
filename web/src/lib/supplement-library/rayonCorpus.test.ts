import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma, createEmbeddings } = vi.hoisted(() => ({
  prisma: { $queryRaw: vi.fn() },
  createEmbeddings: vi.fn(),
}));
vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/rag/embeddings', () => ({ createEmbeddings }));

import { servirRayonCorpus } from './rayonCorpus';

function claim(over: Record<string, unknown> = {}) {
  return {
    claim_id: 'WN-CLAIM-0001',
    version_claim: 'v1',
    texte_normalise: 'Le magnésium bisglycinate soutient un sommeil de meilleure qualité.',
    classe_autorite: 'revue_systematique',
    niveau_preuve: 'modere',
    typologie_lecture: 'mecanistique',
    prescriptif: false,
    validateur: 'praticien@wellneuro.fr',
    valide_at: new Date('2026-07-20T00:00:00.000Z'),
    metadata: { rayon: 'micronutrition' },
    similarity: 0.82,
    ...over,
  };
}

describe('servirRayonCorpus (rayon corpus micronutrition, barrière D-003)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.WN_C4_ENABLED = 'true';
    createEmbeddings.mockResolvedValue([[0.1, 0.2, 0.3]]);
    prisma.$queryRaw.mockResolvedValue([]);
  });

  it('refuse tout service quand WN_C4_ENABLED est éteint (fail-closed)', async () => {
    delete process.env.WN_C4_ENABLED;
    await expect(servirRayonCorpus({ rayon: 'micronutrition', requete: 'magnésium' }))
      .rejects.toThrow(/WN_C4_ENABLED/);
    expect(createEmbeddings).not.toHaveBeenCalled();
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it('sans requête : ne fait aucun appel, rend corpusVide sans erreur', async () => {
    const res = await servirRayonCorpus({ rayon: 'micronutrition', requete: '   ' });
    expect(res.corpusVide).toBe(true);
    expect(res.disponible).toBe(true);
    expect(res.claims).toEqual([]);
    expect(createEmbeddings).not.toHaveBeenCalled();
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it('corpus vide : aucun claim, corpusVide=true, message « en cours de constitution »', async () => {
    prisma.$queryRaw.mockResolvedValue([]);
    const res = await servirRayonCorpus({ rayon: 'micronutrition', requete: 'magnésium sommeil' });
    expect(res.corpusVide).toBe(true);
    expect(res.claims).toEqual([]);
    expect(res.message).toMatch(/en cours de constitution/i);
  });

  it('ne restitue que les claims du rayon demandé (filtre metadata.rayon)', async () => {
    prisma.$queryRaw.mockResolvedValue([
      claim({ claim_id: 'WN-CLAIM-0001', metadata: { rayon: 'micronutrition' } }),
      claim({ claim_id: 'WN-CLAIM-0002', metadata: { rayon: 'phytotherapie' } }),
      claim({ claim_id: 'WN-CLAIM-0003', metadata: {} }),
    ]);
    const res = await servirRayonCorpus({ rayon: 'micronutrition', requete: 'magnésium' });
    expect(res.corpusVide).toBe(false);
    expect(res.claims.map(c => c.claimId)).toEqual(['WN-CLAIM-0001']);
    expect(res.claims[0].validateur).toBe('praticien@wellneuro.fr');
  });

  it('embeddings indisponibles (chaîne non configurée) : dégrade en indisponible, jamais une erreur', async () => {
    createEmbeddings.mockRejectedValue(new Error('OPENAI_API_KEY est absent.'));
    const res = await servirRayonCorpus({ rayon: 'micronutrition', requete: 'magnésium' });
    expect(res.disponible).toBe(false);
    expect(res.corpusVide).toBe(true);
    expect(res.claims).toEqual([]);
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it('un échec de récupération SQL dégrade proprement en indisponible', async () => {
    prisma.$queryRaw.mockRejectedValue(new Error('relation absente'));
    const res = await servirRayonCorpus({ rayon: 'micronutrition', requete: 'magnésium' });
    expect(res.disponible).toBe(false);
    expect(res.corpusVide).toBe(true);
  });
});
