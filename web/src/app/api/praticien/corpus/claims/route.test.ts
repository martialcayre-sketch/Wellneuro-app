import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, listerClaimsRevue, compterClaimsRevue, statutsDuClaim, getRagClaimsHealth } =
  vi.hoisted(() => ({
    getServerSession: vi.fn(),
    listerClaimsRevue: vi.fn(),
    compterClaimsRevue: vi.fn(),
    statutsDuClaim: vi.fn(),
    getRagClaimsHealth: vi.fn(),
  }));

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
  statutsDuClaim,
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
    statutsDuClaim.mockResolvedValue([]);
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

  it('filtre des exclus de la recherche (D-490) : seulement dans l’onglet Validés', async () => {
    expect((await GET(requete('statut=VALIDE&exclu=1'))).status).toBe(200);
    expect(listerClaimsRevue).toHaveBeenCalledWith(
      expect.objectContaining({ statut: 'VALIDE', excluRecherche: true }),
    );
    listerClaimsRevue.mockClear();
    for (const query of ['statut=EN_ATTENTE_VALIDATION&exclu=1', 'statut=REJETE&exclu=1', 'statut=VALIDE&exclu=oui']) {
      const reponse = await GET(requete(query));
      expect(reponse.status).toBe(400);
      expect((await reponse.json()).reason).toBe('exclu_invalide');
    }
    expect(listerClaimsRevue).not.toHaveBeenCalled();
  });

  it('refuse une recherche par identifiant illisible, sans lire la base (D/22)', async () => {
    for (const claim of ['0061-08', 'WN-CL-0061', 'WN-SRC-0061', '0061-008@x', '%25']) {
      const reponse = await GET(requete(`claim=${claim}`));
      expect(reponse.status).toBe(400);
      expect((await reponse.json()).reason).toBe('claim_invalide');
    }
    expect(listerClaimsRevue).not.toHaveBeenCalled();
    expect(statutsDuClaim).not.toHaveBeenCalled();
  });

  it('transmet l’identifiant normalisé ; résultat trouvé = aucun renvoi', async () => {
    listerClaimsRevue.mockResolvedValue({ total: 1, claims: [] });
    const reponse = await GET(requete('statut=VALIDE&claim=0061-008%40v1.0'));
    expect(reponse.status).toBe(200);
    const json = await reponse.json();
    expect(json.claimId).toBe('WN-CL-0061-008');
    expect(json.autresStatuts).toEqual([]);
    expect(listerClaimsRevue).toHaveBeenCalledWith({
      statut: 'VALIDE',
      sourceId: undefined,
      claimId: 'WN-CL-0061-008',
      limit: 50,
      offset: 0,
    });
    expect(statutsDuClaim).not.toHaveBeenCalled();
  });

  it('recherche vide dans l’onglet : renvoie les statuts où le claim est actif', async () => {
    statutsDuClaim.mockResolvedValue(['VALIDE']);
    const reponse = await GET(requete('claim=WN-CL-0061-008&source=WN-SRC-0061'));
    const json = await reponse.json();
    expect(json.autresStatuts).toEqual(['VALIDE']);
    expect(statutsDuClaim).toHaveBeenCalledWith({
      claimId: 'WN-CL-0061-008',
      sourceId: 'WN-SRC-0061',
      sourceIds: undefined,
    });
  });

  it('sans recherche : jamais de requête de renvoi, même sur une liste vide', async () => {
    const json = await (await GET(requete())).json();
    expect(json.claimId).toBeNull();
    expect(json.autresStatuts).toEqual([]);
    expect(statutsDuClaim).not.toHaveBeenCalled();
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
