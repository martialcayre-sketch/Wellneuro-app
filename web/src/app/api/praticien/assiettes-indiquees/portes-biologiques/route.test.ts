import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, prisma, mockCorpus } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    patient: { findUnique: vi.fn() },
    journalAccesDossier: { create: vi.fn(), deleteMany: vi.fn() },
    biologyAnalyte: { findMany: vi.fn() },
    resultatBiologique: { findMany: vi.fn() },
    $queryRaw: vi.fn(),
  },
  mockCorpus: { claimsValidesAuCorpus: vi.fn() },
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/rag/claims/validite', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/rag/claims/validite')>()),
  claimsValidesAuCorpus: mockCorpus.claimsValidesAuCorpus,
}));

import { cleClaim } from '@/lib/rag/claims/validite';
import { PORTES_BIOLOGIQUES_ASSIETTES_V1 } from '@/lib/clinical/portesBiologiquesAssiettesV1';
import { GET, type PortesBiologiquesApiResponse } from './route';

function requete(query = '?idPatient=PAT_SEED_03') {
  return new Request(`http://test.local/api/praticien/assiettes-indiquees/portes-biologiques${query}`);
}

const CLAIMS = [...new Map(PORTES_BIOLOGIQUES_ASSIETTES_V1.flatMap(l => l.claims).map(c => [cleClaim(c), c])).values()];

/** Le corpus rend un texte par claim — `texte de <id>`. */
function corpusComplet() {
  return CLAIMS.map(c => ({ claim_id: c.claimId, version_claim: c.versionClaim, texte_normalise: `texte de ${c.claimId}` }));
}

// `Decimal` de Prisma : la route doit rendre `toString()`, jamais `Number(...)`.
function decimal(texte: string) {
  return { toString: () => texte };
}

function resultat(p: { id: string; analyteCode: string; valeur: string; preleveLe: string; saisiLe?: string; supersedesResultatId?: string | null }) {
  return {
    id: p.id,
    analyteCode: p.analyteCode,
    valeur: decimal(p.valeur),
    unite: 'mg/L',
    preleveLe: new Date(p.preleveLe),
    source: 'saisie_praticien',
    saisiLe: new Date(p.saisiLe ?? p.preleveLe),
    supersedesResultatId: p.supersedesResultatId ?? null,
  };
}

async function corps(res: Response): Promise<PortesBiologiquesApiResponse> {
  return (await res.json()) as PortesBiologiquesApiResponse;
}

describe('GET /api/praticien/assiettes-indiquees/portes-biologiques', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.stubEnv('WN_ASSIETTES_INDIQUEES', 'true');
    vi.stubEnv('WN_CB_ENABLED', 'true');
    vi.stubEnv('WN_CB_RESULTS_ENABLED', 'true');
    getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
    prisma.patient.findUnique.mockResolvedValue({ praticienEmail: 'p@wellneuro.fr' });
    prisma.journalAccesDossier.create.mockResolvedValue({});
    prisma.journalAccesDossier.deleteMany.mockResolvedValue({ count: 0 });
    prisma.biologyAnalyte.findMany.mockResolvedValue([{ code: 'BIO_CRP_US', libelle: 'CRP ultrasensible' }]);
    prisma.resultatBiologique.findMany.mockResolvedValue([]);
    prisma.$queryRaw.mockResolvedValue(corpusComplet());
    mockCorpus.claimsValidesAuCorpus.mockResolvedValue(new Set(CLAIMS.map(cleClaim)));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('sans session : 401, et rien n’est lu', async () => {
    getServerSession.mockResolvedValue(null);
    expect((await GET(requete())).status).toBe(401);
    expect(prisma.patient.findUnique).not.toHaveBeenCalled();
  });

  it('idPatient invalide : 400', async () => {
    expect((await GET(requete('?idPatient=PAT%20X'))).status).toBe(400);
  });

  // TROIS TERMES AU VERROU, et chacun ferme SANS journaliser d'accès.
  for (const [nom, cle] of [
    ['drapeau de la carte', 'WN_ASSIETTES_INDIQUEES'],
    ['drapeau des résultats', 'WN_CB_RESULTS_ENABLED'],
    ['drapeau du rayon biologie', 'WN_CB_ENABLED'],
  ] as const) {
    it(`${nom} absent : inactif, et AUCUN accès journalisé`, async () => {
      vi.stubEnv(cle, '');
      const c = await corps(await GET(requete()));
      expect(c).toMatchObject({ ok: true, actif: false });
      expect(prisma.journalAccesDossier.create).not.toHaveBeenCalled();
      expect(prisma.resultatBiologique.findMany).not.toHaveBeenCalled();
    });
  }

  it('dossier d’un autre praticien : 403, et aucun résultat lu', async () => {
    prisma.patient.findUnique.mockResolvedValue({ praticienEmail: 'autre@wellneuro.fr' });
    expect((await GET(requete())).status).toBe(403);
    expect(prisma.resultatBiologique.findMany).not.toHaveBeenCalled();
  });

  it('les cinq portes sortent, claims cités ENTIERS, et « aucun résultat » est un null', async () => {
    const c = await corps(await GET(requete()));
    if (!c.ok || !c.actif) throw new Error('réponse inattendue');
    expect(c.corpusLu).toBe(true);
    expect(c.portes.map(p => p.ligneId)).toEqual(PORTES_BIOLOGIQUES_ASSIETTES_V1.map(l => l.id));
    const methylation = c.portes.find(p => p.ligneId === 'PB-METHYLATION');
    expect(methylation?.claims.map(x => x.texte)).toEqual([
      'texte de WN-CL-0043-013',
      'texte de WN-CL-0043-014',
      'texte de WN-CL-0043-015',
    ]);
    expect(methylation?.marqueurs).toEqual([{ analyteCode: 'BIO_HOMOCYSTEINE', libelle: 'BIO_HOMOCYSTEINE', dernier: null }]);
  });

  it('le dernier résultat par PRÉLÈVEMENT, correction appliquée, valeur en texte exact', async () => {
    prisma.resultatBiologique.findMany.mockResolvedValue([
      resultat({ id: 'r1', analyteCode: 'BIO_CRP_US', valeur: '1.8', preleveLe: '2026-06-01T00:00:00.000Z' }),
      resultat({ id: 'r2', analyteCode: 'BIO_CRP_US', valeur: '3.10', preleveLe: '2026-09-01T00:00:00.000Z' }),
      resultat({
        id: 'r3',
        analyteCode: 'BIO_CRP_US',
        valeur: '3.15',
        preleveLe: '2026-09-01T00:00:00.000Z',
        saisiLe: '2026-09-02T00:00:00.000Z',
        supersedesResultatId: 'r2',
      }),
    ]);
    const c = await corps(await GET(requete()));
    if (!c.ok || !c.actif) throw new Error('réponse inattendue');
    const crp = c.portes.find(p => p.ligneId === 'PB-SEROTONINERGIQUE')?.marqueurs.find(m => m.analyteCode === 'BIO_CRP_US');
    expect(crp).toEqual({
      analyteCode: 'BIO_CRP_US',
      libelle: 'CRP ultrasensible',
      dernier: { valeur: '3.15', unite: 'mg/L', preleveLe: '2026-09-01T00:00:00.000Z', source: 'saisie_praticien' },
    });
  });

  it('corpus illisible : corpusLu false, aucune porte — et aucun résultat lu', async () => {
    mockCorpus.claimsValidesAuCorpus.mockRejectedValue(new Error('base indisponible'));
    const c = await corps(await GET(requete()));
    expect(c).toMatchObject({ ok: true, actif: true, corpusLu: false, retireesFauteDeClaim: 0, portes: [] });
    expect(prisma.resultatBiologique.findMany).not.toHaveBeenCalled();
  });

  it('un claim invalide retire SA porte, et le compte le dit', async () => {
    const valides = new Set(CLAIMS.map(cleClaim));
    valides.delete(cleClaim({ claimId: 'WN-CL-0289-005', versionClaim: 'v1.0' }));
    mockCorpus.claimsValidesAuCorpus.mockResolvedValue(valides);
    const c = await corps(await GET(requete()));
    if (!c.ok || !c.actif) throw new Error('réponse inattendue');
    expect(c.portes.map(p => p.ligneId)).not.toContain('PB-DOPAMINERGIQUE');
    expect(c.retireesFauteDeClaim).toBe(1);
  });

  it('un texte introuvable au corpus retire aussi sa porte — jamais une citation vide', async () => {
    prisma.$queryRaw.mockResolvedValue(corpusComplet().filter(l => l.claim_id !== 'WN-CL-0294-005'));
    const c = await corps(await GET(requete()));
    if (!c.ok || !c.actif) throw new Error('réponse inattendue');
    expect(c.portes.map(p => p.ligneId)).not.toContain('PB-OMEGA-3');
    expect(c.retireesFauteDeClaim).toBe(1);
    expect(c.portes.flatMap(p => p.claims).every(x => x.texte.length > 0)).toBe(true);
  });

  // LE TEXTE SE LIT SOUS LE MÊME PRÉDICAT QUE LA VALIDITÉ — constat de revue :
  // la première version n'exigeait que `active`/`VALIDE`.
  it('la lecture des textes porte les QUATRE conditions d’éligibilité du corpus', async () => {
    await GET(requete());
    const sql = (prisma.$queryRaw.mock.calls[0][0] as TemplateStringsArray).join('?');
    for (const condition of [
      "c.statut = 'VALIDE'",
      'c.active = true',
      'c.patient_identifiable = false',
      "c.compartment = 'ACTIF'",
      'rag_corpus_claim_sources',
    ]) {
      expect(sql, condition).toContain(condition);
    }
  });

  it('la route n’exporte que GET — aucune écriture au dossier', async () => {
    const moduleRoute = await import('./route');
    expect(Object.keys(moduleRoute).filter(k => /^(POST|PUT|PATCH|DELETE)$/.test(k))).toEqual([]);
  });
});
