import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getConfig, isAuthorized, deposer } = vi.hoisted(() => ({
  getConfig: vi.fn(),
  isAuthorized: vi.fn(),
  deposer: vi.fn(),
}));

vi.mock('@/lib/rag/config', () => ({ getRagConfig: getConfig }));
vi.mock('@/lib/rag/auth', () => ({ isAuthorizedRagRequest: isAuthorized }));
vi.mock('@/lib/fiches-assiette/ingestion', () => ({ deposerBrouillonFiche: deposer }));

import { POST } from './route';

// Texte SYNTHÉTIQUE uniquement ([[D-251]] §4).
const BROUILLON = {
  sourceId: 'WN-SRC-0300',
  plateCode: 'ASSIETTE_PROTEINEE',
  texteSource: 'Texte source synthétique.',
  sourceSha256: 'a'.repeat(64),
  modeleRedaction: 'modele-redacteur-fictif',
  modeleFidelite: 'modele-relecteur-fictif',
  versionConsigne: 'fiche-assiette-v1',
  contenu: {
    titre: 'Titre synthétique',
    precautions: [],
    sections: [{ titre: 'Section', blocs: [{ texte: 'Texte source', provenance: { type: 'verbatim' } }] }],
  },
};

function requete(body: unknown, opts: { json?: boolean } = {}) {
  return new Request('http://localhost/api/internal/fiches-assiette/ingest', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: 'Bearer secret-de-test' },
    body: opts.json === false ? '{ pas du json' : JSON.stringify(body),
  });
}

describe('POST /api/internal/fiches-assiette/ingest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getConfig.mockReturnValue({ enabled: true, internalSecret: 'x'.repeat(32) });
    isAuthorized.mockReturnValue(true);
    deposer.mockResolvedValue({ issue: 'deposee', idVersion: 'version-1', numero: 1, contenuSha256: 'c'.repeat(64) });
  });

  it('répond 503 si la voie n’est pas configurée (fail-closed)', async () => {
    getConfig.mockImplementation(() => {
      throw new Error('RAG_INTERNAL_SECRET est absent ou trop court (minimum 32 caractères).');
    });
    const res = await POST(requete(BROUILLON));
    expect(res.status).toBe(503);
    expect(deposer).not.toHaveBeenCalled();
  });

  it('répond 401 sans secret valide', async () => {
    isAuthorized.mockReturnValue(false);
    const res = await POST(requete(BROUILLON));
    expect(res.status).toBe(401);
    expect(deposer).not.toHaveBeenCalled();
  });

  it('répond 400 sur JSON invalide', async () => {
    expect((await POST(requete({}, { json: false }))).status).toBe(400);
  });

  it('répond 422 à un brouillon qui prétend se valider — DC-16, rien n’est déposé', async () => {
    const res = await POST(requete({ ...BROUILLON, acte: 'validee', validateur: 'quelqu’un' }));
    expect(res.status).toBe(422);
    expect((await res.json()).error).toMatch(/ne valide jamais \(DC-16\)/);
    expect(deposer).not.toHaveBeenCalled();
  });

  it('répond 422 avec les anomalies quand les contrôles refusent la fiche', async () => {
    deposer.mockResolvedValue({
      issue: 'refusee',
      anomalies: [{ code: 'precaution_manquante', detail: 'La réserve de sécurité … n’est portée par aucune précaution.' }],
    });
    const res = await POST(requete(BROUILLON));
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.error).toBe('FICHE_REFUSEE');
    expect(json.anomalies[0].code).toBe('precaution_manquante');
  });

  it('répond 200 BROUILLON_DEPOSE, puis BROUILLON_INCHANGE au rejeu', async () => {
    const res = await POST(requete(BROUILLON));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, statut: 'BROUILLON_DEPOSE', numero: 1, sourceId: 'WN-SRC-0300' });

    deposer.mockResolvedValue({ issue: 'inchangee', idVersion: 'version-1', numero: 1, contenuSha256: 'c'.repeat(64) });
    expect(await (await POST(requete(BROUILLON))).json()).toMatchObject({ statut: 'BROUILLON_INCHANGE' });
  });

  it('une erreur de base ne recopie rien du texte, ni dans la réponse ni dans le journal', async () => {
    const journal = vi.spyOn(console, 'error').mockImplementation(() => {});
    const erreur = Object.assign(new Error('Invalid invocation: texteSource: "Texte source synthétique."'), {
      code: 'P2010',
    });
    deposer.mockRejectedValue(erreur);

    const res = await POST(requete(BROUILLON));
    expect(res.status).toBe(500);
    const corps = JSON.stringify(await res.json());
    expect(corps).not.toContain('synthétique');
    const journalise = JSON.stringify(journal.mock.calls);
    expect(journalise).not.toContain('synthétique');
    expect(journalise).toContain('P2010');
    journal.mockRestore();
  });
});
