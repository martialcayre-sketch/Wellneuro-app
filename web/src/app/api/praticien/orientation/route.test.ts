import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, prisma, mockMeta, mockRegles } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    patient: { findUnique: vi.fn() },
    journalAccesDossier: { create: vi.fn(), deleteMany: vi.fn() },
    questionnaireReponse: { findMany: vi.fn() },
    assignation: { findMany: vi.fn() },
  },
  mockMeta: {
    version: 'orientation-nnpp2-v1',
    validationExterne: false,
    dateValidation: null as string | null,
    claimsSource: [] as unknown[],
  },
  mockRegles: [] as unknown[],
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));
// Table de règles contrôlable par test : le verrou réel (table vide, non
// validée) est épinglé par orientationRulesV1.test.ts — ici on teste la
// logique de la route des deux côtés du double verrou.
vi.mock('@/lib/clinical/orientationRulesV1', () => ({
  ORIENTATION_METADATA: mockMeta,
  ORIENTATION_RULES_V1: mockRegles,
  ORIENTATION_RULES_SHA256: 'sha-test',
}));

import { GET } from './route';

function getRequest(query = '?idPatient=PAT_SEED_03') {
  return new Request(`http://test.local/api/praticien/orientation${query}`);
}

describe('GET /api/praticien/orientation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    mockMeta.validationExterne = false;
    mockMeta.dateValidation = null;
    mockMeta.claimsSource.length = 0;
    mockRegles.length = 0;
    getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
    prisma.patient.findUnique.mockResolvedValue({ praticienEmail: 'p@wellneuro.fr' });
    prisma.journalAccesDossier.create.mockResolvedValue({});
    prisma.journalAccesDossier.deleteMany.mockResolvedValue({ count: 0 });
    prisma.questionnaireReponse.findMany.mockResolvedValue([]);
    prisma.assignation.findMany.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('sans session : 401', async () => {
    getServerSession.mockResolvedValue(null);
    const res = await GET(getRequest());
    expect(res.status).toBe(401);
  });

  it('idPatient invalide : 400', async () => {
    const res = await GET(getRequest('?idPatient=PAT%20SEED'));
    expect(res.status).toBe(400);
  });

  it('flag absent : inactif, sans aucune lecture du dossier', async () => {
    mockMeta.validationExterne = true;
    const payload = await (await GET(getRequest())).json();
    expect(payload).toMatchObject({ ok: true, actif: false });
    expect(prisma.patient.findUnique).not.toHaveBeenCalled();
    expect(prisma.questionnaireReponse.findMany).not.toHaveBeenCalled();
  });

  it('flag posé mais table non validée : inactif (double verrou)', async () => {
    vi.stubEnv('WN_ENABLE_ORIENTATION_NNPP2', '1');
    const payload = await (await GET(getRequest())).json();
    expect(payload).toMatchObject({ ok: true, actif: false });
    expect(prisma.patient.findUnique).not.toHaveBeenCalled();
  });

  it('validationExterne seul ne suffit pas : il faut date et claims (verrou auto-portant)', async () => {
    vi.stubEnv('WN_ENABLE_ORIENTATION_NNPP2', '1');
    mockMeta.validationExterne = true;
    const sansDate = await (await GET(getRequest())).json();
    expect(sansDate.actif).toBe(false);

    mockMeta.dateValidation = '2026-08-01';
    const sansClaims = await (await GET(getRequest())).json();
    expect(sansClaims.actif).toBe(false);
    expect(prisma.patient.findUnique).not.toHaveBeenCalled();
  });

  describe('verrous ouverts (flag + table signée)', () => {
    beforeEach(() => {
      vi.stubEnv('WN_ENABLE_ORIENTATION_NNPP2', '1');
      mockMeta.validationExterne = true;
      mockMeta.dateValidation = '2026-08-01';
      mockMeta.claimsSource = [{ claimId: 'WN-CL-0001-001', versionClaim: 'v1' }];
    });

    it('patient introuvable : 404, sans ligne de journal', async () => {
      prisma.patient.findUnique.mockResolvedValue(null);
      const res = await GET(getRequest());
      expect(res.status).toBe(404);
      expect(prisma.journalAccesDossier.create).not.toHaveBeenCalled();
    });

    it("patient d'un autre praticien : 403, sans ligne de journal", async () => {
      prisma.patient.findUnique.mockResolvedValue({ praticienEmail: 'autre@wellneuro.fr' });
      const res = await GET(getRequest());
      expect(res.status).toBe(403);
      expect(prisma.journalAccesDossier.create).not.toHaveBeenCalled();
    });

    it('exception base : 500 sans détail technique dans le corps', async () => {
      const erreur = vi.spyOn(console, 'error').mockImplementation(() => {});
      prisma.questionnaireReponse.findMany.mockRejectedValue(new Error('connexion Prisma P1001 rompue'));
      const res = await GET(getRequest());
      const payload = await res.json();
      expect(res.status).toBe(500);
      expect(payload).toMatchObject({ ok: false, reason: 'exception' });
      expect(JSON.stringify(payload)).not.toContain('P1001');
      expect(erreur).toHaveBeenCalled();
      erreur.mockRestore();
    });

    it("ne passe ni composition de packs ni filtre d'administrabilité tant que le lot 10 ne les fournit pas", async () => {
      // Test de contrat : si le lot 10 branche le registre des instruments, il
      // doit modifier ce test — l'oubli ne peut pas passer inaperçu.
      mockRegles.push({
        id: 'R-TEST-02',
        statut: 'publiee',
        declencheurs: [{ type: 'zone', idQuestionnaire: 'Q_STR_02', zone: { type: 'plage', min: 27, max: 50 } }],
        suggestions: [{ packId: 'pack_stress_chronique_burnout', priorite: 1 }],
        justificationClaims: [{ claimId: 'WN-CL-0001-001', versionClaim: 'v1' }],
        niveau: 'approfondissement',
      });
      prisma.questionnaireReponse.findMany.mockResolvedValue([
        { idReponse: 'R1', idQuestionnaire: 'Q_STR_02', dateReponse: new Date('2026-07-20T10:00:00.000Z'), scoresJson: { total: 33 } },
      ]);
      const payload = await (await GET(getRequest())).json();
      expect(payload.recommandations[0].dejaAssigne).toBe(false);
      expect(payload.recommandations[0].dejaRepondu).toBeNull();
    });

    it('évalue les règles sur les scores stockés et journalise la lecture', async () => {
      mockRegles.push({
        id: 'R-TEST-01',
        statut: 'publiee',
        declencheurs: [
          { type: 'zone', idQuestionnaire: 'Q_STR_02', zone: { type: 'plage', min: 27, max: 50 } },
        ],
        suggestions: [{ packId: 'pack_stress_chronique_burnout', priorite: 1 }],
        justificationClaims: [{ claimId: 'WN-CL-0001-001', versionClaim: 'v1' }],
        niveau: 'approfondissement',
      });
      prisma.questionnaireReponse.findMany.mockResolvedValue([
        { idReponse: 'R1', idQuestionnaire: 'Q_STR_02', dateReponse: new Date('2026-07-20T10:00:00.000Z'), scoresJson: { total: 33 } },
      ]);
      const payload = await (await GET(getRequest())).json();
      expect(payload.ok).toBe(true);
      expect(payload.actif).toBe(true);
      expect(payload.sha256).toBe('sha-test');
      expect(payload.recommandations).toHaveLength(1);
      expect(payload.recommandations[0]).toMatchObject({
        cible: { type: 'pack', packId: 'pack_stress_chronique_burnout' },
        priorite: 1,
        dejaAssigne: false,
      });
      expect(prisma.journalAccesDossier.create).toHaveBeenCalledTimes(1);
    });

    it('aucune réponse : recommandations vides, jamais une erreur', async () => {
      const payload = await (await GET(getRequest())).json();
      expect(payload).toMatchObject({ ok: true, actif: true, recommandations: [] });
    });
  });
});
