import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '@/generated/prisma';

const { getServerSession, prisma, mockMeta, mockRegles } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    patient: { findUnique: vi.fn() },
    journalAccesDossier: { create: vi.fn(), deleteMany: vi.fn() },
    questionnaireReponse: { findMany: vi.fn() },
    assignation: { findMany: vi.fn() },
    pack: { findMany: vi.fn() },
    // Anamnèse la plus récente : source des déclencheurs `drapeau` (LOT-05).
    consultation: { findFirst: vi.fn() },
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

// PSS-10 complet, total 33 — bande « Niveau élevé de stress et désadaptation ».
//
// `rawAnswers` EST OBLIGATOIRE depuis le 2026-08-04 : la route ne relit plus le
// score stocké, elle le RECALCULE depuis les réponses brutes (voir
// `orientationService`). Une fixture réduite à `{ total: 33 }` décrit un dossier
// que le service écarte — et c'est voulu : un score dont on ne peut pas
// re-dériver la provenance sous la doctrine courante ne fonde aucune
// recommandation. Les six items directs au maximum, les quatre inversés à 3/2/2/2.
const PSS10_COMPLET_33 = { P1: 4, P2: 4, P3: 4, P6: 4, P9: 4, P10: 4, P4: 3, P5: 2, P7: 2, P8: 2 };

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
    prisma.pack.findMany.mockResolvedValue([]);
    // Par défaut aucune consultation : les déclencheurs `drapeau` ne portent
    // pas, ce qui est le cas fail-closed attendu.
    prisma.consultation.findFirst.mockResolvedValue(null);
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

    it("filtre un pack recommandé si sa composition contient un questionnaire non administrable", async () => {
      mockRegles.push({
        id: 'R-TEST-02',
        statut: 'publiee',
        declencheurs: [{ type: 'zone', idQuestionnaire: 'Q_STR_02', zone: { type: 'plage', min: 27, max: 50 } }],
        suggestions: [{ packId: 'pack_stress_chronique_burnout', priorite: 1 }],
        justificationClaims: [{ claimId: 'WN-CL-0001-001', versionClaim: 'v1' }],
        niveau: 'approfondissement',
      });
      prisma.pack.findMany.mockResolvedValue([
        { idPack: 'PACK_STRESS_BURNOUT', qids: ['Q_STR_04', 'Q_PED_03'] },
      ]);
      prisma.questionnaireReponse.findMany.mockResolvedValue([
        { idReponse: 'R1', idQuestionnaire: 'Q_STR_02', dateReponse: new Date('2026-07-20T10:00:00.000Z'), scoresJson: { total: 33, rawAnswers: PSS10_COMPLET_33 } },
      ]);
      const payload = await (await GET(getRequest())).json();
      expect(payload.recommandations).toEqual([]);
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
        { idReponse: 'R1', idQuestionnaire: 'Q_STR_02', dateReponse: new Date('2026-07-20T10:00:00.000Z'), scoresJson: { total: 33, rawAnswers: PSS10_COMPLET_33 } },
      ]);
      // `idPack` porte la valeur RÉELLE de la base (`PACK_STRESS_BURNOUT`), pas
      // le slug de doctrine. Jusqu'au LOT-03 cette fixture inventait un
      // `id_pack` égal au slug : le test passait au vert alors que la route ne
      // pouvait rien produire en production.
      prisma.pack.findMany.mockResolvedValue([
        { idPack: 'PACK_STRESS_BURNOUT', qids: ['Q_STR_04', 'Q_STR_05'] },
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
      expect(prisma.pack.findMany).toHaveBeenCalledTimes(1);
      expect(prisma.journalAccesDossier.create).toHaveBeenCalledTimes(1);
    });

    it('aucune réponse : recommandations vides, jamais une erreur', async () => {
      const payload = await (await GET(getRequest())).json();
      expect(payload).toMatchObject({ ok: true, actif: true, recommandations: [] });
    });

    // --- Correspondance base ↔ doctrine (LOT-03) ---
    //
    // Les `id_pack` de la base et les `PackId` du code sont deux espaces de noms
    // disjoints. Sans traduction, aucune recommandation de pack ne pouvait
    // sortir — et aucun test ne le voyait, faute de fixture réaliste.
    //
    // Attention à ce que chaque cas garde RÉELLEMENT. Seuls les deux premiers
    // ci-dessous rougissent si l'on remet la comparaison directe ; les deux
    // suivants gardent le fail-closed, qui passait déjà avant. Les compter
    // comme garde anti-retour serait se rassurer à bon compte.

    function regleVersStress() {
      mockRegles.push({
        id: 'R-TEST-03',
        statut: 'publiee',
        declencheurs: [{ type: 'zone', idQuestionnaire: 'Q_STR_02', zone: { type: 'plage', min: 27, max: 50 } }],
        suggestions: [{ packId: 'pack_stress_chronique_burnout', priorite: 1 }],
        justificationClaims: [{ claimId: 'WN-CL-0001-001', versionClaim: 'v1' }],
        niveau: 'approfondissement',
      });
      prisma.questionnaireReponse.findMany.mockResolvedValue([
        { idReponse: 'R1', idQuestionnaire: 'Q_STR_02', dateReponse: new Date('2026-07-20T10:00:00.000Z'), scoresJson: { total: 33, rawAnswers: PSS10_COMPLET_33 } },
      ]);
    }

    it("un id_pack de production est traduit et la recommandation sort", async () => {
      regleVersStress();
      prisma.pack.findMany.mockResolvedValue([
        { idPack: 'PACK_STRESS_BURNOUT', qids: ['Q_STR_04', 'Q_STR_05'] },
      ]);
      const payload = await (await GET(getRequest())).json();
      expect(payload.recommandations).toHaveLength(1);
      expect(payload.recommandations[0].cible).toEqual({ type: 'pack', packId: 'pack_stress_chronique_burnout' });
    });

    it("la recommandation porte l'id_pack attendu par l'assignation", async () => {
      // Sans ce champ, un praticien qui clique « assigner » enverrait le slug de
      // doctrine à `/api/praticien/packs/assign`, qui cherche un `id_pack` :
      // 404. Une recommandation qu'on ne peut pas suivre n'est pas une
      // recommandation.
      regleVersStress();
      prisma.pack.findMany.mockResolvedValue([
        { idPack: 'PACK_STRESS_BURNOUT', qids: ['Q_STR_04', 'Q_STR_05'] },
      ]);
      const payload = await (await GET(getRequest())).json();
      expect(payload.recommandations[0].idPackBase).toBe('PACK_STRESS_BURNOUT');
    });

    it("un slug de doctrine trouvé tel quel en base n'est PAS traité comme un id_pack", async () => {
      // Garde anti-retour : si un jour la traduction redevenait une comparaison
      // directe, ce cas repasserait au vert et le défaut reviendrait sans bruit.
      regleVersStress();
      prisma.pack.findMany.mockResolvedValue([
        { idPack: 'pack_stress_chronique_burnout', qids: ['Q_STR_04', 'Q_STR_05'] },
      ]);
      const payload = await (await GET(getRequest())).json();
      expect(payload.recommandations).toEqual([]);
    });

    it("un pack composé par le praticien n'est jamais une cible d'orientation", async () => {
      regleVersStress();
      prisma.pack.findMany.mockResolvedValue([
        { idPack: 'PACK_-bG21yeIvVYRhrdlYuWIMnFz', qids: ['Q_STR_04', 'Q_STR_05'] },
      ]);
      const payload = await (await GET(getRequest())).json();
      expect(payload.recommandations).toEqual([]);
    });

    // --- Drapeaux d'anamnèse (LOT-04 branché par LOT-05) ---
    //
    // `extraireDrapeauxAnamnese` n'avait aucun consommateur avant ce lot. Ces
    // bancs prouvent que la route lit bien l'anamnèse et la passe au moteur —
    // le banc unitaire du moteur, lui, ne dit rien du câblage.

    function regleSurAttenteSommeil() {
      mockRegles.push({
        id: 'R-TEST-ANA',
        statut: 'publiee',
        declencheurs: [{ type: 'drapeau', champ: 'attentes', valeurs: ['Améliorer le sommeil'] }],
        suggestions: [{ questionnaireId: 'Q_SOM_01', priorite: 1 }],
        justificationClaims: [{ claimId: 'WN-CL-0001-001', versionClaim: 'v1' }],
        niveau: 'socle',
      });
    }

    it("une attente déclarée en anamnèse déclenche une recommandation", async () => {
      regleSurAttenteSommeil();
      prisma.consultation.findFirst.mockResolvedValue({
        anamnese: { attentes: ['Améliorer le sommeil'] },
      });
      const payload = await (await GET(getRequest())).json();
      expect(payload.recommandations).toHaveLength(1);
      expect(payload.recommandations[0].cible).toEqual({ type: 'questionnaire', questionnaireId: 'Q_SOM_01' });
    });

    // Ces deux-là épinglent le contrat sans prouver de différence observable :
    // aucune anamnèse et une anamnèse vide donnent aujourd'hui le même vide.
    it("sans consultation, une règle de drapeau ne déclenche pas", async () => {
      regleSurAttenteSommeil();
      prisma.consultation.findFirst.mockResolvedValue(null);
      const payload = await (await GET(getRequest())).json();
      expect(payload.recommandations).toEqual([]);
    });

    it("une consultation sans anamnèse ne déclenche pas non plus", async () => {
      regleSurAttenteSommeil();
      prisma.consultation.findFirst.mockResolvedValue({ anamnese: null });
      const payload = await (await GET(getRequest())).json();
      expect(payload.recommandations).toEqual([]);
    });

    // Celui-ci, lui, mord : il échouerait si la route retenait la consultation
    // la plus récente au lieu de la plus récente PORTEUSE d'une anamnèse — le
    // défaut trouvé en revue. La sélection se lit dans l'argument passé à
    // Prisma, seul endroit où elle est observable depuis un banc mocké.
    it("retient la dernière consultation qui porte une anamnèse, pas la dernière", async () => {
      regleSurAttenteSommeil();
      prisma.consultation.findFirst.mockResolvedValue({
        anamnese: { attentes: ['Améliorer le sommeil'] },
      });
      await GET(getRequest());
      const critere = prisma.consultation.findFirst.mock.calls[0][0];
      // Égalité stricte au sentinel : `Prisma.JsonNull` à la place de
      // `Prisma.DbNull` cesserait d'exclure les NULL SQL et ferait revenir le
      // défaut, sans qu'une assertion « NOT est défini » s'en aperçoive.
      expect(critere.where.NOT).toEqual({ anamnese: { equals: Prisma.DbNull } });
      expect(critere.orderBy).toEqual({ createdAt: 'desc' });
    });

    it("un libellé d'attente hors énuméré est ignoré, jamais deviné", async () => {
      regleSurAttenteSommeil();
      prisma.consultation.findFirst.mockResolvedValue({
        anamnese: { attentes: ['Ameliorer le sommeil'] },
      });
      const payload = await (await GET(getRequest())).json();
      expect(payload.recommandations).toEqual([]);
    });

    it("un pack de doctrine sans existence en base n'est jamais recommandé", async () => {
      mockRegles.push({
        id: 'R-TEST-04',
        statut: 'publiee',
        declencheurs: [{ type: 'zone', idQuestionnaire: 'Q_STR_02', zone: { type: 'plage', min: 27, max: 50 } }],
        // `pack_migraine_cephalees` porte `idPackBase: null` : déclaré en
        // doctrine, jamais créé en base, donc non assignable.
        suggestions: [{ packId: 'pack_migraine_cephalees', priorite: 1 }],
        justificationClaims: [{ claimId: 'WN-CL-0001-001', versionClaim: 'v1' }],
        niveau: 'approfondissement',
      });
      prisma.questionnaireReponse.findMany.mockResolvedValue([
        { idReponse: 'R1', idQuestionnaire: 'Q_STR_02', dateReponse: new Date('2026-07-20T10:00:00.000Z'), scoresJson: { total: 33, rawAnswers: PSS10_COMPLET_33 } },
      ]);
      prisma.pack.findMany.mockResolvedValue([
        { idPack: 'PACK_STRESS_BURNOUT', qids: ['Q_STR_04', 'Q_STR_05'] },
      ]);
      const payload = await (await GET(getRequest())).json();
      expect(payload.recommandations).toEqual([]);
    });
  });
});
