import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma, createEmbeddings } = vi.hoisted(() => ({
  prisma: { $queryRaw: vi.fn() },
  createEmbeddings: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/rag/embeddings', () => ({ createEmbeddings }));

import { jouerQuestionRestitution, tirageOuvertDeSource } from './recherche';

function sqlDeAppel(appel: unknown[]): string {
  return (appel[0] as readonly string[]).join('?');
}

describe('jouerQuestionRestitution — restitution en mode revue', () => {
  beforeEach(() => {
    prisma.$queryRaw.mockReset();
    createEmbeddings.mockReset();
  });

  it('joue la question sur les claims ACTIFS de la source, EN_ATTENTE compris', async () => {
    createEmbeddings.mockResolvedValueOnce([[0.1, 0.2]]);
    prisma.$queryRaw.mockResolvedValueOnce([
      {
        claim_id: 'WN-CL-0056-001',
        version_claim: 'v1.0',
        statut: 'EN_ATTENTE_VALIDATION',
        texte_normalise: 'Le magnésium…',
        typologie_lecture: 'déclaré',
        prescriptif: false,
        similarity: 0.87,
        chunks_cites: ['WN-CH-0056-003'],
      },
    ]);

    const resultats = await jouerQuestionRestitution({
      sourceId: 'WN-SRC-0056',
      question: 'Que dit la source sur le magnésium ?',
    });

    expect(createEmbeddings).toHaveBeenCalledWith(['Que dit la source sur le magnésium ?']);
    expect(resultats).toEqual([
      {
        claimId: 'WN-CL-0056-001',
        versionClaim: 'v1.0',
        statut: 'EN_ATTENTE_VALIDATION',
        texteNormalise: 'Le magnésium…',
        typologieLecture: 'déclaré',
        prescriptif: false,
        similarity: 0.87,
        chunksCites: ['WN-CH-0056-003'],
      },
    ]);

    // Le périmètre est la source en revue — actif, TOUS statuts (ce n'est pas
    // la barrière patient) — et jamais un SELECT sans borne.
    const sql = sqlDeAppel(prisma.$queryRaw.mock.calls[0]);
    expect(sql).toContain('c.source_id = ?');
    expect(sql).toContain('c.active = true');
    expect(sql).not.toContain("statut = 'VALIDE'");
    expect(sql).toContain('LIMIT');
  });

  it('borne la limite à 12 et rend des chunks vides plutôt que null', async () => {
    createEmbeddings.mockResolvedValueOnce([[0.1]]);
    prisma.$queryRaw.mockResolvedValueOnce([
      {
        claim_id: 'WN-CL-0056-002',
        version_claim: 'v1.0',
        statut: 'VALIDE',
        texte_normalise: 'x',
        typologie_lecture: 'observé',
        prescriptif: false,
        similarity: 0.5,
        chunks_cites: null,
      },
    ]);

    const resultats = await jouerQuestionRestitution({
      sourceId: 'WN-SRC-0056',
      question: 'q',
      limit: 500,
    });
    expect(resultats[0].chunksCites).toEqual([]);
    const params = prisma.$queryRaw.mock.calls[0].slice(1);
    expect(params[params.length - 1]).toBe(12);
  });
});

describe('tirageOuvertDeSource — reprise sans re-tirer', () => {
  beforeEach(() => {
    prisma.$queryRaw.mockReset();
  });

  it('rend le tirage ouvert avec tirés et éligibles', async () => {
    prisma.$queryRaw.mockResolvedValueOnce([
      {
        id: BigInt(41),
        echantillon: { seed: 7, taux: 0.3, lot: 10, tires: ['a'], eligibles: ['a', 'b'] },
      },
    ]);
    expect(await tirageOuvertDeSource('WN-SRC-0056')).toEqual({
      tirageId: 41,
      seed: 7,
      taux: 0.3,
      lot: 10,
      tires: ['a'],
      eligibles: ['a', 'b'],
    });
    // Un tirage n'est « ouvert » que sans issue : le SQL exclut les tirages
    // déjà conclus par une decision_lot ou une bascule.
    const sql = sqlDeAppel(prisma.$queryRaw.mock.calls[0]);
    expect(sql).toContain('NOT EXISTS');
    expect(sql).toContain("'decision_lot', 'bascule_individuelle'");
  });

  it('rend null quand aucun tirage ouvert', async () => {
    prisma.$queryRaw.mockResolvedValueOnce([]);
    expect(await tirageOuvertDeSource('WN-SRC-0056')).toBeNull();
  });
});
