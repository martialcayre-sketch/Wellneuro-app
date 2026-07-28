import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma, createEmbeddings } = vi.hoisted(() => ({
  prisma: { $queryRaw: vi.fn() },
  createEmbeddings: vi.fn(),
}));
vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/rag/embeddings', () => ({ createEmbeddings }));

import { servirRayonCorpus, RAYON_VERS_NOTEBOOK } from './rayonCorpus';
import { sourcesDuNotebook } from '@/lib/rag/claims/notebooks';

const NOTEBOOK_MICRO = '10 — Micronutrition et compléments';
const SOURCES_MICRO = sourcesDuNotebook(NOTEBOOK_MICRO);

// La 4ᵉ valeur interpolée du $queryRaw est la liste des source_ids jointe par
// virgule (filter_source_ids). Ordre des interpolations : littéral, matchCount,
// minSimilarity, filtreSources.
function filtreSourcesDuDernierAppel(): string {
  const call = prisma.$queryRaw.mock.calls.at(-1);
  return call?.[4] as string;
}

// Le SELECT ne remonte plus metadata : le filtre rayon se fait au niveau SQL
// (filter_source_ids). Le mock rend donc des claims DÉJÀ filtrés par notebook.
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
    similarity: 0.82,
    ...over,
  };
}

describe('servirRayonCorpus (rayon corpus par notebook, barrière D-003)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.WN_C4_ENABLED = 'true';
    createEmbeddings.mockResolvedValue([[0.1, 0.2, 0.3]]);
    prisma.$queryRaw.mockResolvedValue([]);
  });

  it('la correspondance micronutrition→notebook 10 a bien des sources (garde-fou fixture)', () => {
    expect(SOURCES_MICRO.length).toBeGreaterThan(0);
  });

  it('chaque rayon déclaré mappe un notebook du registre POURVU de sources (garde anti-typo)', () => {
    // Une faute de frappe dans un libellé de RAYON_VERS_NOTEBOOK rendrait
    // l'étagère silencieusement vide (fail-closed) — exactement le bug corrigé.
    // Ce garde couvre TOUS les rayons déclarés, y compris ceux encore inertes.
    for (const [rayon, notebook] of Object.entries(RAYON_VERS_NOTEBOOK)) {
      expect(
        sourcesDuNotebook(notebook).length,
        `rayon « ${rayon} » → notebook « ${notebook} » sans source (libellé erroné ?)`,
      ).toBeGreaterThan(0);
    }
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

  it('rayon inconnu : résultat vide, JAMAIS un filtre ignoré (aucune requête base)', async () => {
    const res = await servirRayonCorpus({ rayon: 'rayon_inexistant', requete: 'magnésium' });
    expect(res.corpusVide).toBe(true);
    expect(res.claims).toEqual([]);
    expect(res.message).toMatch(/inconnu/i);
    expect(createEmbeddings).not.toHaveBeenCalled();
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it('filtre AU NIVEAU SQL sur les sources du notebook du rayon (filter_source_ids)', async () => {
    prisma.$queryRaw.mockResolvedValue([claim()]);
    await servirRayonCorpus({ rayon: 'micronutrition', requete: 'magnésium' });
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    // Positions des interpolations : 1=vecteur, 2=matchCount, 3=minSimilarity, 4=filtreSources.
    const call = prisma.$queryRaw.mock.calls.at(-1)!;
    expect(call[2]).toBe(24);
    expect(call[3]).toBe(0.5);
    expect(call[4]).toBe(SOURCES_MICRO.join(','));
    expect(filtreSourcesDuDernierAppel()).toBe(SOURCES_MICRO.join(','));
  });

  it('restitue tous les claims retournés par le filtre SQL, avec le rayon demandé', async () => {
    prisma.$queryRaw.mockResolvedValue([
      claim({ claim_id: 'WN-CLAIM-0001' }),
      claim({ claim_id: 'WN-CLAIM-0002' }),
    ]);
    const res = await servirRayonCorpus({ rayon: 'micronutrition', requete: 'magnésium' });
    expect(res.corpusVide).toBe(false);
    expect(res.claims.map(c => c.claimId)).toEqual(['WN-CLAIM-0001', 'WN-CLAIM-0002']);
    expect(res.claims.every(c => c.rayon === 'micronutrition')).toBe(true);
    expect(res.claims[0].validateur).toBe('praticien@wellneuro.fr');
  });

  it('conserve le drapeau prescriptif (servi, à baliser côté UI)', async () => {
    prisma.$queryRaw.mockResolvedValue([
      claim({ claim_id: 'WN-CLAIM-0009', prescriptif: true }),
    ]);
    const res = await servirRayonCorpus({ rayon: 'micronutrition', requete: 'posologie' });
    expect(res.claims).toHaveLength(1);
    expect(res.claims[0].prescriptif).toBe(true);
  });

  it('corpus vide : aucun claim, corpusVide=true, message « en cours de constitution »', async () => {
    prisma.$queryRaw.mockResolvedValue([]);
    const res = await servirRayonCorpus({ rayon: 'micronutrition', requete: 'magnésium sommeil' });
    expect(res.corpusVide).toBe(true);
    expect(res.claims).toEqual([]);
    expect(res.message).toMatch(/en cours de constitution/i);
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
