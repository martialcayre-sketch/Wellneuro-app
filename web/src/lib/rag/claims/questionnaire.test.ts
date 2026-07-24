import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Sémantique d'annulation de la génération serveur (voie SSE Scalingo) :
// un signal aborté doit ressortir en ERREUR, pas en « questionnaire vide ».
const { queryRaw } = vi.hoisted(() => ({ queryRaw: vi.fn() }));
vi.mock('@/lib/prisma', () => ({ prisma: { $queryRaw: queryRaw } }));

import { genererQuestionnaireSource } from './questionnaire';

const fetchMock = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  process.env.ANTHROPIC_API_KEY = 'test-key';
  vi.stubGlobal('fetch', fetchMock);
  // Deux chunks atteignables (un claim actif chacun).
  queryRaw.mockResolvedValue([
    { chunk_id: 'CH1', claim_id: 'CL1', texte_normalise: 'affirmation 1' },
    { chunk_id: 'CH2', claim_id: 'CL2', texte_normalise: 'affirmation 2' },
  ]);
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.ANTHROPIC_API_KEY;
});

function reponseOk(question: string) {
  return {
    ok: true,
    json: async () => ({ content: [{ type: 'text', text: JSON.stringify({ question }) }] }),
  };
}

describe('genererQuestionnaireSource — annulation', () => {
  it('signal aborté : lève « interrompue » plutôt que de rendre un questionnaire vide', async () => {
    // Chaque appel LLM échoue (comme sous AbortError), et le signal est aborté.
    fetchMock.mockRejectedValue(new Error('aborted'));
    const abort = new AbortController();
    abort.abort();

    await expect(
      genererQuestionnaireSource('WN-SRC-0001', { signal: abort.signal }),
    ).rejects.toThrow(/interrompue/i);
  });

  it('sans annulation, un chunk en échec ne lève pas : questionnaire partiel signalé', async () => {
    // CH1 réussit, CH2 échoue — aucune annulation : couverture incomplète, pas d'exception.
    fetchMock
      .mockResolvedValueOnce(reponseOk('Question CH1 ?'))
      .mockRejectedValueOnce(new Error('502'));

    const res = await genererQuestionnaireSource('WN-SRC-0001');
    expect(res.questions).toHaveLength(1);
    expect(res.couvertureComplete).toBe(false);
    expect(res.chunksSansQuestion.length).toBe(1);
  });

  it('cas nominal : une question par chunk, couverture complète', async () => {
    fetchMock.mockImplementation(async () => reponseOk('Une question ?'));
    const res = await genererQuestionnaireSource('WN-SRC-0001');
    expect(res.questions).toHaveLength(2);
    expect(res.couvertureComplete).toBe(true);
    expect(res.chunksSansQuestion).toEqual([]);
  });

  it('passe le signal au fetch (annulation réelle des appels en vol)', async () => {
    fetchMock.mockImplementation(async () => reponseOk('Q ?'));
    const abort = new AbortController();
    await genererQuestionnaireSource('WN-SRC-0001', { signal: abort.signal });
    // Chaque appel fetch reçoit le signal dans ses options.
    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ signal: abort.signal }),
    );
  });
});
