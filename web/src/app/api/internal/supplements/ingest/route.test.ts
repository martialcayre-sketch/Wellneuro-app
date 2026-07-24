import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getConfig, isAuthorized, ingest } = vi.hoisted(() => ({
  getConfig: vi.fn(),
  isAuthorized: vi.fn(),
  ingest: vi.fn(),
}));

vi.mock('@/lib/supplement-library/config', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/supplement-library/config')>();
  return { ...actual, getSupplementLibraryConfig: getConfig };
});
vi.mock('@/lib/supplement-library/auth', () => ({ isAuthorizedSupplementsRequest: isAuthorized }));
vi.mock('@/lib/supplement-library/ingest', () => ({ ingestSupplementFiches: ingest }));

import { POST } from './route';

function requete(body: unknown, opts: { json?: boolean } = {}) {
  return new Request('http://localhost/api/internal/supplements/ingest', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: 'Bearer secret-de-test' },
    body: opts.json === false ? '{ pas du json' : JSON.stringify(body),
  });
}

const ficheValide = {
  nomCommercial: 'Magnésium marin 300',
  marque: 'Laboratoire Fictif',
  sourceProvenance: 'complalim',
  sourceIdentifiant: 'complalim-12345',
  niveauCompletude: 'partielle',
  compositions: [{ ingredientId: 'ing_magnesium', doseParPortion: 300, unite: 'mg' }],
};

describe('POST /api/internal/supplements/ingest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getConfig.mockReturnValue({ enabled: true, internalSecret: 'x'.repeat(32) });
    isAuthorized.mockReturnValue(true);
    ingest.mockResolvedValue({
      ok: true,
      resume: { total: 1, creees: 1, nouvellesVersions: 0, inchangees: 0, echecs: 0 },
      resultats: [{ action: 'creee' }],
    });
  });

  it('répond 503 si la voie n’est pas configurée (fail-closed)', async () => {
    getConfig.mockImplementation(() => {
      throw new Error('SUPPLEMENTS_INTERNAL_SECRET est absent ou trop court (minimum 32 caractères).');
    });
    const res = await POST(requete({ fiches: [ficheValide] }));
    expect(res.status).toBe(503);
    expect(ingest).not.toHaveBeenCalled();
  });

  it('répond 401 sans secret valide', async () => {
    isAuthorized.mockReturnValue(false);
    const res = await POST(requete({ fiches: [ficheValide] }));
    expect(res.status).toBe(401);
    expect(ingest).not.toHaveBeenCalled();
  });

  it('répond 400 sur JSON invalide', async () => {
    const res = await POST(requete({}, { json: false }));
    expect(res.status).toBe(400);
  });

  it('répond 422 sur payload invalide (provenance hors vocabulaire)', async () => {
    const res = await POST(requete({ fiches: [{ ...ficheValide, sourceProvenance: 'wikipedia' }] }));
    expect(res.status).toBe(422);
    expect(ingest).not.toHaveBeenCalled();
  });

  it('répond 200 et importe en brouillons sur payload valide', async () => {
    const res = await POST(requete({ fiches: [ficheValide] }));
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: boolean; statut: string; resume: { creees: number } };
    expect(json.ok).toBe(true);
    expect(json.statut).toBe('IMPORTE_BROUILLONS');
    expect(json.resume.creees).toBe(1);
    expect(ingest).toHaveBeenCalledTimes(1);
  });
});
