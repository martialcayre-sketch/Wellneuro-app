import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getConfig, isAuthorized, deposer } = vi.hoisted(() => ({
  getConfig: vi.fn(),
  isAuthorized: vi.fn(),
  deposer: vi.fn(),
}));

vi.mock('@/lib/rag/config', () => ({ getRagConfig: getConfig }));
vi.mock('@/lib/rag/auth', () => ({ isAuthorizedRagRequest: isAuthorized }));
vi.mock('@/lib/fiches-usage/ingestion', () => ({ deposerBrouillonVersionUsage: deposer, deposerBrouillonLibelle: vi.fn() }));

import { POST } from './route';

// Texte SYNTHÉTIQUE uniquement ([[D-251]] §4).
const BROUILLON = {
  ficheId: 'FU_SYNTH',
  contenu: { question: 'Question synthétique.' },
  structureSha256: 'c'.repeat(64),
  modeleRedaction: 'modele-redacteur-fictif',
  modeleContreLecture: 'modele-relecteur-fictif',
  versionConsigne: 'fiche-usage-v1',
};

function requete(body: unknown, opts: { json?: boolean } = {}) {
  return new Request('http://localhost/api/internal/fiches-usage/ingest', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: 'Bearer secret-de-test' },
    body: opts.json === false ? '{ pas du json' : JSON.stringify(body),
  });
}

describe('POST /api/internal/fiches-usage/ingest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getConfig.mockReturnValue({ enabled: true, internalSecret: 'x'.repeat(32) });
    isAuthorized.mockReturnValue(true);
    deposer.mockResolvedValue({ issue: 'deposee', id: 'version-1', numero: 1 });
  });

  it('503 si la voie n’est pas configurée (fail-closed), avant toute authentification', async () => {
    getConfig.mockImplementation(() => {
      throw new Error('RAG_INTERNAL_SECRET est absent ou trop court.');
    });
    const res = await POST(requete(BROUILLON));
    expect(res.status).toBe(503);
    expect(isAuthorized).not.toHaveBeenCalled();
  });

  it('401 sans le secret', async () => {
    isAuthorized.mockReturnValue(false);
    expect((await POST(requete(BROUILLON))).status).toBe(401);
    expect(deposer).not.toHaveBeenCalled();
  });

  it('400 sur un JSON illisible', async () => {
    expect((await POST(requete(null, { json: false }))).status).toBe(400);
  });

  it('422 sur une faute de contrat, avec le message du contrat — une validation est refusée', async () => {
    const res = await POST(requete({ ...BROUILLON, acte: 'validee' }));
    expect(res.status).toBe(422);
    expect((await res.json()).error).toMatch(/ne valide jamais/);
    expect(deposer).not.toHaveBeenCalled();
  });

  it('422 sur un brouillon refusé par la structure, avec ses anomalies', async () => {
    deposer.mockResolvedValue({ issue: 'refusee', anomalies: [{ code: 'fiche_hors_structure' }] });
    const res = await POST(requete(BROUILLON));
    expect(res.status).toBe(422);
    expect(await res.json()).toEqual({ ok: false, error: 'BROUILLON_REFUSE', anomalies: [{ code: 'fiche_hors_structure' }] });
  });

  it('200 : un brouillon déposé, ou inchangé — jamais un texte validé', async () => {
    expect(await (await POST(requete(BROUILLON))).json()).toEqual({ ok: true, statut: 'BROUILLON_DEPOSE', id: 'version-1', numero: 1 });
    deposer.mockResolvedValue({ issue: 'inchangee', id: 'version-1', numero: 1 });
    expect((await (await POST(requete(BROUILLON))).json()).statut).toBe('BROUILLON_INCHANGE');
  });

  it('500 sans aucun texte : ni dans la réponse, ni dans le journal', async () => {
    const erreur = Object.assign(new Error('Question synthétique. recopiée par Prisma'), { code: 'P2002' });
    deposer.mockRejectedValue(erreur);
    const journal = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const res = await POST(requete(BROUILLON));
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain('synthétique');
    expect(JSON.stringify(journal.mock.calls)).not.toContain('synthétique');
    expect(JSON.stringify(journal.mock.calls)).toContain('P2002');
    journal.mockRestore();
  });
});
