import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getConfig, isAuthorized, deposer } = vi.hoisted(() => ({
  getConfig: vi.fn(),
  isAuthorized: vi.fn(),
  deposer: vi.fn(),
}));

vi.mock('@/lib/rag/config', () => ({ getRagConfig: getConfig }));
vi.mock('@/lib/rag/auth', () => ({ isAuthorizedRagRequest: isAuthorized }));
vi.mock('@/lib/fiches-usage/ingestion', () => ({ deposerBrouillonLibelle: deposer, deposerBrouillonVersionUsage: vi.fn() }));

import { POST } from './route';

// Texte SYNTHÉTIQUE uniquement ([[D-251]] §4). Le cœur de la voie est éprouvé
// par le banc de la route des versions, qui partage `traiterIngestion` ; ce
// banc tient ce qui est propre aux libellés.
const BROUILLON = {
  termeId: 'POP_SYNTH',
  libelle: 'Libellé synthétique',
  structureSha256: 'c'.repeat(64),
  modeleRedaction: 'modele-redacteur-fictif',
  modeleContreLecture: 'modele-relecteur-fictif',
  versionConsigne: 'libelle-v1',
};

function requete(body: unknown) {
  return new Request('http://localhost/api/internal/fiches-usage/libelles/ingest', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: 'Bearer secret-de-test' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/internal/fiches-usage/libelles/ingest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getConfig.mockReturnValue({ enabled: true, internalSecret: 'x'.repeat(32) });
    isAuthorized.mockReturnValue(true);
    deposer.mockResolvedValue({ issue: 'deposee', id: 'libelle-1', numero: 1 });
  });

  it('dépose un libellé de population, sa nature déduite du terme', async () => {
    const res = await POST(requete(BROUILLON));
    expect(res.status).toBe(200);
    expect(deposer.mock.calls[0][0]).toMatchObject({ termeId: 'POP_SYNTH', nature: 'population' });
  });

  it('401 sans le secret', async () => {
    isAuthorized.mockReturnValue(false);
    expect((await POST(requete(BROUILLON))).status).toBe(401);
  });

  it('422 sur une nature fournie par l’appelant', async () => {
    const res = await POST(requete({ ...BROUILLON, nature: 'hypothese' }));
    expect(res.status).toBe(422);
    expect(deposer).not.toHaveBeenCalled();
  });
});
