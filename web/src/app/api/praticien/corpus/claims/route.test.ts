import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, listerClaimsRevue, compterClaimsRevue, getRagClaimsHealth } = vi.hoisted(
  () => ({
    getServerSession: vi.fn(),
    listerClaimsRevue: vi.fn(),
    compterClaimsRevue: vi.fn(),
    getRagClaimsHealth: vi.fn(),
  }),
);

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
// La lib réelle importe le client Prisma à l'import : neutralisé, aucun test
// ici ne touche la base.
vi.mock('@/lib/prisma', () => ({ prisma: {} }));
vi.mock('@/lib/rag/claims/revue', async (importOriginal) => ({
  // estClaimStatut réel : c'est lui la garde du paramètre `statut`.
  ...(await importOriginal<typeof import('@/lib/rag/claims/revue')>()),
  listerClaimsRevue,
  compterClaimsRevue,
}));
vi.mock('@/lib/rag/claims/store', () => ({ getRagClaimsHealth }));

import { GET } from './route';

const URL_BASE = 'http://localhost/api/praticien/corpus/claims';

function requete(query = ''): Request {
  return new Request(query ? `${URL_BASE}?${query}` : URL_BASE);
}

// La santé d'ingestion compte TOUT (y compris un claim désactivé) : seule sa
// partie « liens » alimente la réponse ; les tuiles viennent de
// compterClaimsRevue (périmètre active = true, celui de la liste).
const SANTE = {
  claims: { total: 4, active: 3, enAttenteValidation: 3, valide: 1, rejete: 0, sources: 1 },
  liens: { total: 4, claimsOrphelins: 0, empreintesDerivees: 0, sourcesSupersedees: 1 },
};

const TUILES = { EN_ATTENTE_VALIDATION: 2, VALIDE: 1, REJETE: 0 };

describe('/api/praticien/corpus/claims', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });
    listerClaimsRevue.mockResolvedValue({ total: 0, claims: [] });
    compterClaimsRevue.mockResolvedValue(TUILES);
    getRagClaimsHealth.mockResolvedValue(SANTE);
  });

  it('exige une session', async () => {
    getServerSession.mockResolvedValue(null);
    expect((await GET(requete())).status).toBe(401);
    expect(listerClaimsRevue).not.toHaveBeenCalled();
  });

  it('refuse un statut hors machine et une source malformée', async () => {
    expect((await GET(requete('statut=SUPPRIME'))).status).toBe(400);
    expect((await GET(requete('source=WN-CH-0001-001'))).status).toBe(400);
    expect((await GET(requete('limit=zero'))).status).toBe(400);
    expect((await GET(requete('offset=-1'))).status).toBe(400);
    expect(listerClaimsRevue).not.toHaveBeenCalled();
  });

  it('liste par défaut la file EN_ATTENTE_VALIDATION, tuiles au périmètre de la liste', async () => {
    const reponse = await GET(requete());
    expect(reponse.status).toBe(200);
    const json = await reponse.json();
    expect(json.ok).toBe(true);
    expect(json.statut).toBe('EN_ATTENTE_VALIDATION');
    // Tuiles = compterClaimsRevue (active = true), PAS la santé d'ingestion —
    // sinon un claim désactivé gonflerait « En attente » sans jamais
    // apparaître dans la liste dessous.
    expect(json.compteurs).toEqual({
      enAttenteValidation: 2,
      valide: 1,
      rejete: 0,
      empreintesDerivees: 0,
      sourcesSupersedees: 1,
    });
    expect(listerClaimsRevue).toHaveBeenCalledWith({
      statut: 'EN_ATTENTE_VALIDATION',
      sourceId: undefined,
      limit: 50,
      offset: 0,
    });
  });

  it('transmet statut, source et pagination valides', async () => {
    const reponse = await GET(requete('statut=VALIDE&source=WN-SRC-0056&limit=10&offset=20'));
    expect(reponse.status).toBe(200);
    expect(listerClaimsRevue).toHaveBeenCalledWith({
      statut: 'VALIDE',
      sourceId: 'WN-SRC-0056',
      limit: 10,
      offset: 20,
    });
  });

  it('répond 500 sans détail interne quand la lecture échoue', async () => {
    listerClaimsRevue.mockRejectedValue(new Error('connexion pgvector perdue'));
    const reponse = await GET(requete());
    expect(reponse.status).toBe(500);
    const json = await reponse.json();
    expect(json.error).toBe('Erreur technique.');
    expect(JSON.stringify(json)).not.toContain('pgvector');
  });
});
