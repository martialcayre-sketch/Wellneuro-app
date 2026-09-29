import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getServerSession, prisma, rejouerCarteDecision, reconstructProtocolDraft, vuePatientOuRefus,
  apercuFichesDuProtocole, remettreFiches, annoncerDocumentRemis,
} = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  // L'E-MAIL NEUTRE ([[D-251]] §9, lot 11) : seul l'envoi est simulé. La règle
  // « est-il dû ? » (`annonceDue`) est la vraie, lue sur le drapeau.
  annoncerDocumentRemis: vi.fn(),
  // LES FICHES D'ASSIETTE ([[D-251]] §7) : ce banc juge le CÂBLAGE de la
  // route — drapeau, jeton, transaction, approbation reprise ou créée. Le calcul
  // de l'aperçu et l'écriture ont leurs propres bancs (`remise.test.ts`,
  // `apercuRemise.test.ts`), et ce que la base refuse, son contrat SQL.
  apercuFichesDuProtocole: vi.fn(),
  remettreFiches: vi.fn(),
  rejouerCarteDecision: vi.fn(),
  // LE CONTRAT PATIENT EST LA SECONDE MARCHE DU CONSTAT, et il se moque ici pour
  // la même raison que le rejeu : ce banc juge le MIROIR, pas le contrat — qui a
  // ses propres bancs. Ce qu'il doit prouver, c'est que le verdict du contrat
  // arrive bien jusqu'à `servieAuPatient`.
  reconstructProtocolDraft: vi.fn(),
  vuePatientOuRefus: vi.fn(),
  prisma: {
    patient: { findUnique: vi.fn() },
    protocolDraft: { findUnique: vi.fn(), findMany: vi.fn() },
    protocolDiffusionApproval: { findMany: vi.fn(), create: vi.fn() },
    journalAccesDossier: { create: vi.fn(), deleteMany: vi.fn() },
    $transaction: vi.fn(),
    $queryRaw: vi.fn(),
    $executeRaw: vi.fn(),
  },
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/clinical-engine/rejeuCarteDecision', () => ({ rejouerCarteDecision }));
vi.mock('@/lib/protocol/fromPrisma', () => ({ reconstructProtocolDraft }));
vi.mock('@/lib/protocol/servirAuPatient', () => ({ vuePatientOuRefus }));
vi.mock('@/lib/fiches-assiette/remise', () => ({ apercuFichesDuProtocole, remettreFiches }));
vi.mock('@/lib/fiches-assiette/annonce', async orig => ({
  ...(await orig<typeof import('@/lib/fiches-assiette/annonce')>()),
  annoncerDocumentRemis,
}));

import { deriveProtocolDraftId, deriveVersionId } from '@/lib/protocol/versioning';
import { GET, POST } from './route';

const versionId = deriveVersionId(deriveProtocolDraftId('DEC_1'), 'HASH_V1');

const versionRow = {
  idPatient: 'PAT_1',
  inputHash: 'HASH_V1',
  decisionCardInputHash: 'HASH_DEC',
  assessmentEpisodeId: 'EPISODE_V1',
  status: 'practitioner_reviewed',
  reviewedAt: new Date('2026-01-02T00:00:00.000Z'),
};

/** Une carte rejouée SANS bloqueur — le cas nominal de l'approbation. */
function carteSansBloqueur(surcharges: Record<string, unknown> = {}) {
  return {
    ok: true,
    selectionEcartee: false,
    decisionCard: {
      decisionCardId: 'DEC_1',
      inputHash: 'HASH_DEC',
      abstention: { status: 'not_required', ruleIds: [], limitations: [] },
      safetyFindingIds: [],
      ...surcharges,
    },
  };
}

function postRequest(body: unknown): Request {
  return new Request('http://localhost/api/praticien/protocoles/diffusion', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const body = { idPatient: 'PAT_1', decisionCardId: 'DEC_1', protocolDraftInputHash: 'HASH_V1' };

describe('POST /api/praticien/protocoles/diffusion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.patient.findUnique.mockResolvedValue({ praticienEmail: 'p@wellneuro.fr' });
    rejouerCarteDecision.mockResolvedValue(carteSansBloqueur());
  });

  // ── LES BLOQUEURS DE LA CARTE ([[D-192]]) ───────────────────────────────
  //
  // `buildPatientProtocolView` les refuse depuis toujours, et il n'avait aucun
  // appelant de production avant `D-191` ; cette route, elle, n'a jamais
  // construit de carte. Les deux refus les plus graves du moteur clinique ne
  // mordaient donc nulle part sur le chemin qui les rend opposables.

  it('refuse d’approuver sous abstention requise (409)', async () => {
    getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
    prisma.protocolDraft.findUnique.mockResolvedValue(versionRow);
    rejouerCarteDecision.mockResolvedValue(carteSansBloqueur({
      abstention: { status: 'required', ruleIds: ['R1'], limitations: [] },
    }));

    const res = await POST(postRequest(body));
    const json = (await res.json()) as { ok: boolean; reason: string; error: string };
    expect(res.status).toBe(409);
    expect(json.reason).toBe('abstention_requise');
    // LE MESSAGE EST CELUI QUE L'ÉCRAN AFFICHE : `approveForDiffusion` rend
    // `payload.error` tel quel. Un refus dont le motif reste au serveur serait
    // la garde du booklet — confirmable depuis toujours, et jamais envoyée.
    expect(json.error).toMatch(/abstention explicite/i);
    expect(prisma.protocolDiffusionApproval.create).not.toHaveBeenCalled();
  });

  it('refuse d’approuver sur un constat de sécurité ouvert (409)', async () => {
    getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
    prisma.protocolDraft.findUnique.mockResolvedValue(versionRow);
    rejouerCarteDecision.mockResolvedValue(carteSansBloqueur({
      safetyFindingIds: ['safety-1', 'safety-2'],
    }));

    const res = await POST(postRequest(body));
    const json = (await res.json()) as { ok: boolean; reason: string; error: string };
    expect(res.status).toBe(409);
    expect(json.reason).toBe('constat_securite');
    // LE NOMBRE, JAMAIS LES CONSTATS. L'écran de décision les porte déjà ; les
    // recopier ici ferait de cette route une seconde restitution clinique,
    // qu'aucune garde ne relit.
    expect(json.error).toContain('2 constat');
    expect(json.error).not.toContain('safety-1');
    expect(prisma.protocolDiffusionApproval.create).not.toHaveBeenCalled();
  });

  // UN PROTOCOLE APPROUVÉ ICI EST UN PROTOCOLE QUE LE PORTAIL SAURA SERVIR.
  // Deux verdicts « équivalents » finiraient par diverger, et le praticien
  // validerait alors un écran qui reste vide.
  it('refuse d’approuver une décision que le serveur ne sait plus rejouer (409)', async () => {
    getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
    prisma.protocolDraft.findUnique.mockResolvedValue(versionRow);
    rejouerCarteDecision.mockResolvedValue({ ok: false, motif: 'carte_derivee' });

    const res = await POST(postRequest(body));
    const json = (await res.json()) as { reason: string; error: string };
    expect(res.status).toBe(409);
    expect(json.reason).toBe('carte_non_rejouable');
    expect(json.error).toMatch(/ne se recalcule plus/i);
    expect(prisma.protocolDiffusionApproval.create).not.toHaveBeenCalled();
  });

  // LE REJEU EST CELUI DU CHEMIN PATIENT, À LA LETTRE : même épisode, même
  // empreinte comparée. Un rejeu pris sur une autre ancre rendrait un verdict
  // sur un autre protocole.
  it('rejoue la carte sur l’épisode et l’empreinte de LA VERSION approuvée', async () => {
    getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
    prisma.protocolDraft.findUnique.mockResolvedValue(versionRow);
    prisma.protocolDiffusionApproval.findMany.mockResolvedValue([]);
    prisma.protocolDiffusionApproval.create.mockResolvedValue({ id: 'appr_1' });

    await POST(postRequest(body));
    expect(rejouerCarteDecision).toHaveBeenCalledWith({
      idPatient: 'PAT_1',
      decisionCardId: 'DEC_1',
      assessmentEpisodeId: 'EPISODE_V1',
      decisionCardInputHash: 'HASH_DEC',
    });
  });

  it('refuse un praticien non authentifié (401)', async () => {
    getServerSession.mockResolvedValue(null);
    const res = await POST(postRequest(body));
    expect(res.status).toBe(401);
    expect(prisma.protocolDiffusionApproval.create).not.toHaveBeenCalled();
  });

  it('rejette une version introuvable (404)', async () => {
    getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
    prisma.protocolDraft.findUnique.mockResolvedValue(null);
    const res = await POST(postRequest(body));
    expect(res.status).toBe(404);
    expect(prisma.protocolDiffusionApproval.create).not.toHaveBeenCalled();
  });

  it('refuse le patient d’un autre praticien (403)', async () => {
    getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
    prisma.patient.findUnique.mockResolvedValue({ praticienEmail: 'autre@wellneuro.fr' });
    const res = await POST(postRequest(body));
    expect(res.status).toBe(403);
    // Corps 403 historique préservé à l'octet malgré le ralliement à la garde.
    expect(await res.json()).toEqual({
      ok: false,
      reason: 'forbidden',
      error: 'Patient non accessible pour ce praticien.',
    });
    expect(prisma.protocolDraft.findUnique).not.toHaveBeenCalled();
    expect(prisma.journalAccesDossier.create).not.toHaveBeenCalled();
  });

  it('rejette l’accès inter-patient (404)', async () => {
    getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
    prisma.protocolDraft.findUnique.mockResolvedValue({ ...versionRow, idPatient: 'AUTRE' });
    const res = await POST(postRequest(body));
    expect(res.status).toBe(404);
  });

  it('persiste une première approbation (supersedes null)', async () => {
    getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
    prisma.protocolDraft.findUnique.mockResolvedValue(versionRow);
    prisma.protocolDiffusionApproval.findMany.mockResolvedValue([]);
    prisma.protocolDiffusionApproval.create.mockResolvedValue({ id: 'appr_1' });
    const res = await POST(postRequest(body));
    const json = (await res.json()) as { ok: boolean; unchanged: boolean; approvalId: string };
    expect(res.status).toBe(200);
    expect(json.unchanged).toBe(false);
    expect(json.approvalId).toBe('appr_1');
    expect(prisma.protocolDiffusionApproval.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          idPatient: 'PAT_1',
          protocolDraftId: versionId,
          protocolDraftInputHash: 'HASH_V1',
          supersedesApprovalId: null,
          confirmation: 'content_approved_for_diffusion',
        }),
      }),
    );
    // Une écriture laisse déjà sa propre trace datée et attribuée (GD-1).
    expect(prisma.journalAccesDossier.create).not.toHaveBeenCalled();
  });

  it('est idempotent quand la version active est déjà approuvée (no-op)', async () => {
    getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
    prisma.protocolDraft.findUnique.mockResolvedValue(versionRow);
    prisma.protocolDiffusionApproval.findMany.mockResolvedValue([
      { id: 'appr_1', protocolDraftInputHash: 'HASH_V1', supersedesApprovalId: null, createdAt: new Date('2026-01-03T00:00:00.000Z') },
    ]);
    const res = await POST(postRequest(body));
    const json = (await res.json()) as { unchanged: boolean; approvalId: string };
    expect(res.status).toBe(200);
    expect(json.unchanged).toBe(true);
    expect(json.approvalId).toBe('appr_1');
    expect(prisma.protocolDiffusionApproval.create).not.toHaveBeenCalled();
  });
});

describe('GET /api/praticien/protocoles/diffusion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.patient.findUnique.mockResolvedValue({ praticienEmail: 'p@wellneuro.fr' });
    rejouerCarteDecision.mockResolvedValue({ ok: true, decisionCard: { inputHash: 'HASH_DEC' }, selectionEcartee: false });
    reconstructProtocolDraft.mockReturnValue({ protocolDraftId: 'PD_1', inputHash: 'HASH_V1', actions: [] });
    vuePatientOuRefus.mockReturnValue({ ok: true, vue: {} });
  });

  it('retourne l’approbation active et sa caducité', async () => {
    getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
    // La version active porte HASH_V2, l'approbation ancre HASH_V1 → caduque.
    prisma.protocolDraft.findMany.mockResolvedValue([
      { id: 'v2', inputHash: 'HASH_V2', decisionCardInputHash: 'HASH_DEC', assessmentEpisodeId: 'EPISODE_V2', supersedesDraftId: 'v1', createdAt: new Date('2026-01-05T00:00:00.000Z') },
      { id: 'v1', inputHash: 'HASH_V1', decisionCardInputHash: 'HASH_DEC', assessmentEpisodeId: 'EPISODE_V1', supersedesDraftId: null, createdAt: new Date('2026-01-03T00:00:00.000Z') },
    ]);
    prisma.protocolDiffusionApproval.findMany.mockResolvedValue([
      { id: 'appr_1', protocolDraftInputHash: 'HASH_V1', supersedesApprovalId: null, createdAt: new Date('2026-01-03T00:00:00.000Z'), approvedAt: new Date('2026-01-03T12:00:00.000Z') },
    ]);
    const res = await GET(new Request('http://localhost/api/praticien/protocoles/diffusion?idPatient=PAT_1&decisionCardId=DEC_1'));
    const json = (await res.json()) as { ok: boolean; approval: { protocolDraftInputHash: string } | null; stale: boolean; servieAuPatient: boolean | null };
    expect(res.status).toBe(200);
    expect(json.approval?.protocolDraftInputHash).toBe('HASH_V1');
    expect(json.stale).toBe(true);
    // LE CONSTAT EST PRIS SUR LA VERSION APPROUVÉE, pas sur la version active :
    // c'est l'ancienne que le patient lit tant que la nouvelle n'est pas
    // diffusée. `stale` compare deux VERSIONS ; ce constat-ci compare le
    // DOSSIER à lui-même ([[D-191]]).
    expect(rejouerCarteDecision).toHaveBeenCalledWith(expect.objectContaining({
      idPatient: 'PAT_1', decisionCardId: 'DEC_1', decisionCardInputHash: 'HASH_DEC',
      assessmentEpisodeId: 'EPISODE_V1',
    }));
    expect(json.servieAuPatient).toBe(true);
    // Le GET accessible journalise la lecture au gabarit littéral (G-TRUST-04).
    expect(prisma.journalAccesDossier.create).toHaveBeenCalledTimes(1);
    expect(prisma.journalAccesDossier.create).toHaveBeenCalledWith({
      data: {
        idPatient: 'PAT_1',
        praticienEmail: 'p@wellneuro.fr',
        route: '/api/praticien/protocoles/diffusion',
        methode: 'GET',
      },
    });
  });

  it('retourne approval null sans versions', async () => {
    getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
    prisma.protocolDraft.findMany.mockResolvedValue([]);
    const res = await GET(new Request('http://localhost/api/praticien/protocoles/diffusion?idPatient=PAT_1&decisionCardId=DEC_1'));
    const json = (await res.json()) as { approval: null; stale: boolean; servieAuPatient: boolean | null };
    expect(json.approval).toBeNull();
    expect(json.stale).toBe(false);
    // `null`, et non `false` : sans rien de diffusé il n'y a rien à servir, et
    // « non servie » serait un faux constat.
    expect(json.servieAuPatient).toBeNull();
    expect(rejouerCarteDecision).not.toHaveBeenCalled();
  });

  // LE CONSTAT QUI MANQUAIT. Une validation pour diffusion pouvait cesser d'être
  // servie sans que personne ne l'apprenne : le patient lisait une
  // indisponibilité, le praticien lisait « Validé pour diffusion ».
  it('dit au praticien que son protocole n’est plus affiché au patient', async () => {
    getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
    rejouerCarteDecision.mockResolvedValue({ ok: false, motif: 'carte_derivee' });
    prisma.protocolDraft.findMany.mockResolvedValue([
      { id: 'v1', inputHash: 'HASH_V1', decisionCardInputHash: 'HASH_DEC', assessmentEpisodeId: 'EPISODE_V1', supersedesDraftId: null, createdAt: new Date('2026-01-03T00:00:00.000Z') },
    ]);
    prisma.protocolDiffusionApproval.findMany.mockResolvedValue([
      { id: 'appr_1', protocolDraftInputHash: 'HASH_V1', supersedesApprovalId: null, createdAt: new Date('2026-01-03T00:00:00.000Z'), approvedAt: new Date('2026-01-03T12:00:00.000Z') },
    ]);
    const res = await GET(new Request('http://localhost/api/praticien/protocoles/diffusion?idPatient=PAT_1&decisionCardId=DEC_1'));
    const json = (await res.json()) as { stale: boolean; servieAuPatient: boolean | null };
    // La version approuvée EST la version active : rien de caduc, et pourtant
    // l'écran du patient est vide. Les deux constats sont distincts.
    expect(json.stale).toBe(false);
    expect(json.servieAuPatient).toBe(false);
  });

  // LA SECONDE MARCHE, QUE LE MIROIR NE REGARDAIT PAS ([[D-200]]). Le rejeu
  // réussit — l'empreinte n'a pas dérivé — mais le CONTRAT patient refuse :
  // statut d'intervention inconnu, action hors liste patient, incohérence
  // relue. Le portail éteint alors l'écran du patient. Avant cette correction,
  // `servieAuPatient` valait `rejeu.ok`, donc `true` : le praticien lisait
  // « Validé pour diffusion » sur un écran patient vide.
  it('dit « non servi » quand le CONTRAT patient refuse, rejeu réussi', async () => {
    getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
    rejouerCarteDecision.mockResolvedValue({ ok: true, decisionCard: { inputHash: 'HASH_DEC' }, selectionEcartee: false });
    vuePatientOuRefus.mockReturnValue({ ok: false, motif: 'contrat_refuse', detail: 'statut inconnu' });
    prisma.protocolDraft.findMany.mockResolvedValue([
      { id: 'v1', inputHash: 'HASH_V1', decisionCardInputHash: 'HASH_DEC', assessmentEpisodeId: 'EPISODE_V1', supersedesDraftId: null, createdAt: new Date('2026-01-03T00:00:00.000Z'), payload: { quelconque: true } },
    ]);
    prisma.protocolDiffusionApproval.findMany.mockResolvedValue([
      { id: 'appr_1', protocolDraftInputHash: 'HASH_V1', supersedesApprovalId: null, createdAt: new Date('2026-01-03T00:00:00.000Z'), approvedAt: new Date('2026-01-03T12:00:00.000Z') },
    ]);
    const res = await GET(new Request('http://localhost/api/praticien/protocoles/diffusion?idPatient=PAT_1&decisionCardId=DEC_1'));
    const json = (await res.json()) as { stale: boolean; servieAuPatient: boolean | null };
    expect(json.stale).toBe(false);
    expect(json.servieAuPatient).toBe(false);
    // Le contrat est jugé sur la version APPROUVÉE, reconstruite depuis son payload.
    expect(reconstructProtocolDraft).toHaveBeenCalledWith({ quelconque: true }, 'HASH_V1');
  });

  // UN PAYLOAD ILLISIBLE NE FAIT PAS TOMBER L'ÉCRAN DU PRATICIEN : il vaut
  // « non servi », ce qui est exactement ce que le portail ferait.
  it('dit « non servi » quand le payload approuvé est illisible', async () => {
    getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
    reconstructProtocolDraft.mockImplementation(() => { throw new Error('Payload de protocole illisible.'); });
    prisma.protocolDraft.findMany.mockResolvedValue([
      { id: 'v1', inputHash: 'HASH_V1', decisionCardInputHash: 'HASH_DEC', assessmentEpisodeId: 'EPISODE_V1', supersedesDraftId: null, createdAt: new Date('2026-01-03T00:00:00.000Z'), payload: null },
    ]);
    prisma.protocolDiffusionApproval.findMany.mockResolvedValue([
      { id: 'appr_1', protocolDraftInputHash: 'HASH_V1', supersedesApprovalId: null, createdAt: new Date('2026-01-03T00:00:00.000Z'), approvedAt: new Date('2026-01-03T12:00:00.000Z') },
    ]);
    const res = await GET(new Request('http://localhost/api/praticien/protocoles/diffusion?idPatient=PAT_1&decisionCardId=DEC_1'));
    const json = (await res.json()) as { servieAuPatient: boolean | null };
    expect(res.status).toBe(200);
    expect(json.servieAuPatient).toBe(false);
  });

  it('refuse la lecture du patient d’un autre praticien (403)', async () => {
    getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
    prisma.patient.findUnique.mockResolvedValue({ praticienEmail: 'autre@wellneuro.fr' });
    const res = await GET(new Request('http://localhost/api/praticien/protocoles/diffusion?idPatient=PAT_1&decisionCardId=DEC_1'));
    expect(res.status).toBe(403);
    // Corps 403 historique préservé à l'octet malgré le ralliement à la garde.
    expect(await res.json()).toEqual({
      ok: false,
      reason: 'forbidden',
      error: 'Patient non accessible pour ce praticien.',
    });
    expect(prisma.protocolDraft.findMany).not.toHaveBeenCalled();
    expect(prisma.journalAccesDossier.create).not.toHaveBeenCalled();
  });
});

// ── L'APERÇU DE CE QUE LE PATIENT LIRA ([[D-200]] dette 1) ──────────────────
//
// Le seul aperçu patient du cockpit vivait dans `ProtocolConsultationPanel`,
// alimenté par une fixture et débranché hors d'elle : sur un dossier réel, le
// praticien validait pour diffusion sans avoir jamais vu une ligne de ce que
// son patient allait lire.
//
// `apercuContenuPatient` N'EST PAS MOQUÉ ICI, à la différence de
// `vuePatientOuRefus` : ce que ce banc doit prouver, c'est que le contenu servi
// SORT DU CONTRAT — phrase d'attente comprise —, et non qu'un verdict voyage.
describe('GET /api/praticien/protocoles/diffusion — aperçu patient', () => {
  const carteRejouee = {
    ok: true,
    selectionEcartee: false,
    decisionCard: {
      decisionCardId: 'DEC_1',
      inputHash: 'HASH_DEC',
      abstention: { status: 'not_required', ruleIds: [], limitations: [] },
      safetyFindingIds: [],
      selectedMainPriority: { candidateId: 'priority-1' },
      priorityCandidates: [{ candidateId: 'priority-1', label: 'Axe signé' }],
    },
  };

  function draft(surcharges: Record<string, unknown> = {}) {
    return {
      protocolDraftId: 'PD_1', decisionCardId: 'DEC_1', decisionCardInputHash: 'HASH_DEC',
      selectedPriorityId: 'priority-1', status: 'practitioner_reviewed',
      review: { reviewedAt: '2026-01-02T00:00:00.000Z', reviewerRole: 'practitioner', confirmation: 'content_reviewed' },
      purpose: 'Raison patient.', followUpCriterion: 'Critère patient.', adviceSheetRef: null,
      actions: [{
        actionId: 'a1', type: 'biological_exploration', title: 'Bilan',
        idealPlan: 'Idéal interne.', minimalPlan: 'Plan minimal patient.', rescuePlan: 'Secours interne.',
        limitations: [], interventionStatus: 'conditionnelle_biologie',
      }],
      ...surcharges,
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
    prisma.patient.findUnique.mockResolvedValue({ praticienEmail: 'p@wellneuro.fr' });
    prisma.protocolDiffusionApproval.findMany.mockResolvedValue([]);
    rejouerCarteDecision.mockResolvedValue(carteRejouee);
    reconstructProtocolDraft.mockReturnValue(draft());
    vuePatientOuRefus.mockReturnValue({ ok: true, vue: {} });
  });

  function requete(): Request {
    return new Request('http://localhost/api/praticien/protocoles/diffusion?idPatient=PAT_1&decisionCardId=DEC_1');
  }

  // L'INTERVENTION SUSPENDUE PORTE SA PHRASE, et c'est tout l'objet du lot :
  // l'aperçu fait main ne lisait jamais `interventionStatus`.
  it('projette le contenu patient par le contrat, phrase d’attente comprise', async () => {
    prisma.protocolDraft.findMany.mockResolvedValue([
      { id: 'v1', inputHash: 'HASH_V1', decisionCardInputHash: 'HASH_DEC', assessmentEpisodeId: 'EPISODE_V1', supersedesDraftId: null, createdAt: new Date('2026-01-03T00:00:00.000Z'), payload: { p: 1 } },
    ]);
    const json = (await (await GET(requete())).json()) as {
      apercu: { ok: boolean; contenu?: { priorityLabel: string; actions: { attente?: string; minimalPlan: string }[] } };
    };
    expect(json.apercu.ok).toBe(true);
    expect(json.apercu.contenu?.priorityLabel).toBe('Axe signé');
    expect(json.apercu.contenu?.actions[0].minimalPlan).toBe('Plan minimal patient.');
    expect(json.apercu.contenu?.actions[0].attente).toBe('En attente de confirmation par votre bilan.');
  });

  // SUR LA VERSION ACTIVE, PAS SUR L'APPROUVÉE. `servieAuPatient` dit ce qui est
  // servi aujourd'hui ; l'aperçu montre ce qui le sera après le geste. Montrer
  // l'ancienne version ferait valider une version en en lisant une autre.
  it('porte sur la version ACTIVE quand une version plus ancienne est approuvée', async () => {
    prisma.protocolDraft.findMany.mockResolvedValue([
      { id: 'v2', inputHash: 'HASH_V2', decisionCardInputHash: 'HASH_DEC', assessmentEpisodeId: 'EPISODE_V2', supersedesDraftId: 'v1', createdAt: new Date('2026-01-05T00:00:00.000Z'), payload: { version: 2 } },
      { id: 'v1', inputHash: 'HASH_V1', decisionCardInputHash: 'HASH_DEC', assessmentEpisodeId: 'EPISODE_V1', supersedesDraftId: null, createdAt: new Date('2026-01-03T00:00:00.000Z'), payload: { version: 1 } },
    ]);
    prisma.protocolDiffusionApproval.findMany.mockResolvedValue([
      { id: 'appr_1', protocolDraftInputHash: 'HASH_V1', supersedesApprovalId: null, createdAt: new Date('2026-01-03T00:00:00.000Z'), approvedAt: new Date('2026-01-03T12:00:00.000Z') },
    ]);
    const json = (await (await GET(requete())).json()) as { stale: boolean; apercu: { ok: boolean } };
    expect(json.stale).toBe(true);
    expect(json.apercu.ok).toBe(true);
    expect(reconstructProtocolDraft).toHaveBeenCalledWith({ version: 2 }, 'HASH_V2');
  });

  it('rend le motif du contrat plutôt qu’un aperçu vide', async () => {
    reconstructProtocolDraft.mockReturnValue(draft({ status: 'draft', review: null }));
    prisma.protocolDraft.findMany.mockResolvedValue([
      { id: 'v1', inputHash: 'HASH_V1', decisionCardInputHash: 'HASH_DEC', assessmentEpisodeId: 'EPISODE_V1', supersedesDraftId: null, createdAt: new Date('2026-01-03T00:00:00.000Z'), payload: { p: 1 } },
    ]);
    const json = (await (await GET(requete())).json()) as { apercu: { ok: boolean; motif?: string; detail?: string } };
    expect(json.apercu.ok).toBe(false);
    expect(json.apercu.motif).toBe('contrat_refuse');
    expect(json.apercu.detail).toContain('relu par le praticien');
  });

  it('dit que la carte ne se rejoue plus, sans emporter le reste de l’état', async () => {
    rejouerCarteDecision.mockResolvedValue({ ok: false, motif: 'carte_derivee' });
    prisma.protocolDraft.findMany.mockResolvedValue([
      { id: 'v1', inputHash: 'HASH_V1', decisionCardInputHash: 'HASH_DEC', assessmentEpisodeId: 'EPISODE_V1', supersedesDraftId: null, createdAt: new Date('2026-01-03T00:00:00.000Z'), payload: { p: 1 } },
    ]);
    const res = await GET(requete());
    const json = (await res.json()) as { ok: boolean; apercu: { ok: boolean; motif?: string } };
    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.apercu.motif).toBe('carte_non_rejouable');
  });

  it('dit que le contenu de la version active ne se relit pas', async () => {
    reconstructProtocolDraft.mockImplementation(() => { throw new Error('Payload de protocole illisible.'); });
    prisma.protocolDraft.findMany.mockResolvedValue([
      { id: 'v1', inputHash: 'HASH_V1', decisionCardInputHash: 'HASH_DEC', assessmentEpisodeId: 'EPISODE_V1', supersedesDraftId: null, createdAt: new Date('2026-01-03T00:00:00.000Z'), payload: null },
    ]);
    const json = (await (await GET(requete())).json()) as { apercu: { ok: boolean; motif?: string } };
    expect(json.apercu.motif).toBe('payload_illisible');
  });

  it('ne rend aucun aperçu sans version', async () => {
    prisma.protocolDraft.findMany.mockResolvedValue([]);
    const json = (await (await GET(requete())).json()) as { apercu: unknown };
    expect(json.apercu).toBeNull();
  });
});

// ── LES FICHES D'ASSIETTE AU CLIC ([[D-251]] §7, lot 8) ────────────────────
//
// Drapeau fermé, la route fait exactement ce qu'elle faisait : ni aperçu, ni
// transaction, ni remise. Drapeau ouvert, le clic porte le jeton de l'aperçu
// affiché ; un jeton absent ou périmé est un clic refusé, RIEN d'écrit — ni
// approbation, ni remise (arbitrage du 2026-09-28 : « refuser et remontrer »).
describe('POST et GET /api/praticien/protocoles/diffusion — fiches d’assiette', () => {
  const apercuServi = { jeton: 'J1', blocage: null, lignes: [] };
  const requeteGet = () => new Request('http://localhost/api/praticien/protocoles/diffusion?idPatient=PAT_1&decisionCardId=DEC_1');

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.WN_FICHES_ASSIETTE = 'true';
    getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
    prisma.patient.findUnique.mockResolvedValue({ praticienEmail: 'p@wellneuro.fr', actif: true, suiviClotureLe: null });
    prisma.protocolDraft.findUnique.mockResolvedValue({ ...versionRow, payload: { actions: [] } });
    prisma.protocolDiffusionApproval.findMany.mockResolvedValue([]);
    prisma.protocolDiffusionApproval.create.mockResolvedValue({ id: 'appr_new' });
    prisma.$transaction.mockImplementation(async (fn: (tx: typeof prisma) => unknown) => fn(prisma));
    // Le dossier AU CLIC : lu dans la transaction, verrouillé en partage.
    prisma.$queryRaw.mockResolvedValue([{ actif: true, suivi_cloture_le: null }]);
    rejouerCarteDecision.mockResolvedValue(carteSansBloqueur());
    reconstructProtocolDraft.mockReturnValue({ protocolDraftId: 'PD_1', inputHash: 'HASH_V1', actions: [] });
    vuePatientOuRefus.mockReturnValue({ ok: true, vue: {} });
    apercuFichesDuProtocole.mockResolvedValue(apercuServi);
    remettreFiches.mockResolvedValue(2);
  });

  afterEach(() => {
    delete process.env.WN_FICHES_ASSIETTE;
    delete process.env.WN_FICHES_ASSIETTE_LECTURE;
  });

  it('drapeau FERMÉ : ni aperçu, ni transaction, ni remise — la route d’avant', async () => {
    delete process.env.WN_FICHES_ASSIETTE;
    const res = await POST(postRequest(body));
    const json = (await res.json()) as { ok: boolean; fichesRemises?: number };
    expect(res.status).toBe(200);
    expect(json.fichesRemises).toBeUndefined();
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(apercuFichesDuProtocole).not.toHaveBeenCalled();
    expect(remettreFiches).not.toHaveBeenCalled();
    // Ni le payload, ni le dossier : la lecture reste celle d'avant le lot.
    expect(prisma.protocolDraft.findUnique.mock.calls[0][0].select.payload).toBe(false);
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
    expect(prisma.$executeRaw).not.toHaveBeenCalled();
    expect(annoncerDocumentRemis).not.toHaveBeenCalled();

    prisma.protocolDraft.findMany.mockResolvedValue([
      { id: 'v1', inputHash: 'HASH_V1', decisionCardInputHash: 'HASH_DEC', assessmentEpisodeId: 'E', supersedesDraftId: null, createdAt: new Date('2026-01-03T00:00:00.000Z'), payload: {} },
    ]);
    const lecture = (await (await GET(requeteGet())).json()) as { fiches: unknown };
    expect(lecture.fiches).toBeNull();
    expect(apercuFichesDuProtocole).not.toHaveBeenCalled();
  });

  it('refuse un clic SANS jeton d’aperçu (409), sans rien écrire', async () => {
    const res = await POST(postRequest(body));
    const json = (await res.json()) as { ok: boolean; reason: string };
    expect(res.status).toBe(409);
    expect(json.reason).toBe('apercu_fiches_perime');
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.protocolDiffusionApproval.create).not.toHaveBeenCalled();
  });

  it('refuse un clic dont l’aperçu a changé (409) : ni approbation, ni remise', async () => {
    apercuFichesDuProtocole.mockResolvedValue({ ...apercuServi, jeton: 'J2' });
    const res = await POST(postRequest({ ...body, jetonApercuFiches: 'J1' }));
    const json = (await res.json()) as { ok: boolean; reason: string; error: string };
    expect(res.status).toBe(409);
    expect(json.reason).toBe('apercu_fiches_perime');
    expect(json.error).toContain('n’est plus exact');
    // L'aperçu du clic est recalculé SOUS VERROU, dans la transaction.
    expect(apercuFichesDuProtocole).toHaveBeenCalledWith(prisma, expect.objectContaining({ protocolDraftInputHash: 'HASH_V1' }), { verrouiller: true });
    expect(prisma.protocolDiffusionApproval.create).not.toHaveBeenCalled();
    expect(remettreFiches).not.toHaveBeenCalled();
  });

  it('approuve et remet dans la même transaction, rattachées à l’approbation créée', async () => {
    const res = await POST(postRequest({ ...body, jetonApercuFiches: 'J1' }));
    const json = (await res.json()) as { ok: boolean; unchanged: boolean; approvalId: string; fichesRemises: number };
    expect(res.status).toBe(200);
    expect(json).toMatchObject({ ok: true, unchanged: false, approvalId: 'appr_new', fichesRemises: 2 });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.protocolDiffusionApproval.create).toHaveBeenCalledTimes(1);
    expect(remettreFiches).toHaveBeenCalledWith(prisma, apercuServi, { idPatient: 'PAT_1', idApprobation: 'appr_new' });
  });

  it('une version DÉJÀ approuvée : l’approbation est reprise, et seules les fiches validées depuis partent', async () => {
    prisma.protocolDiffusionApproval.findMany.mockResolvedValue([
      { id: 'appr_1', protocolDraftInputHash: 'HASH_V1', supersedesApprovalId: null, createdAt: new Date('2026-01-03T00:00:00.000Z') },
    ]);
    const json = (await (await POST(postRequest({ ...body, jetonApercuFiches: 'J1' }))).json()) as {
      unchanged: boolean; approvalId: string; fichesRemises: number;
    };
    expect(json).toMatchObject({ unchanged: true, approvalId: 'appr_1', fichesRemises: 2 });
    expect(prisma.protocolDiffusionApproval.create).not.toHaveBeenCalled();
    expect(remettreFiches).toHaveBeenCalledWith(prisma, apercuServi, { idPatient: 'PAT_1', idApprobation: 'appr_1' });
  });

  it('un dossier clos bloque toutes les fiches — lu DANS la transaction, verrouillé en partage', async () => {
    prisma.$queryRaw.mockResolvedValue([{ actif: true, suivi_cloture_le: new Date('2026-09-01T00:00:00.000Z') }]);
    await POST(postRequest({ ...body, jetonApercuFiches: 'J1' }));
    expect(apercuFichesDuProtocole).toHaveBeenCalledWith(
      prisma,
      expect.objectContaining({ blocage: expect.objectContaining({ motif: 'dossier_non_suivi' }) }),
      { verrouiller: true },
    );
    const sql = (prisma.$queryRaw.mock.calls[0][0] as string[]).join('?');
    expect(sql).toMatch(/FROM patients WHERE id_patient = \? FOR SHARE/);
  });

  it('sérialise la chaîne d’approbations : son verrou est pris EN PREMIER, avant tout aperçu', async () => {
    // Deux clics concurrents sur un protocole sans fiche ne prennent aucun
    // verrou de fiche : sans celui-ci, ils créeraient deux têtes (revue Copilot).
    const ordre: string[] = [];
    prisma.$executeRaw.mockImplementation(async (sql: string[], ...valeurs: unknown[]) => {
      ordre.push(`verrou ${String(valeurs[0])} (${sql.join('?').includes('pg_advisory_xact_lock') ? 'consultatif' : '?'})`);
      return 1;
    });
    apercuFichesDuProtocole.mockImplementation(async () => {
      ordre.push('aperçu');
      return apercuServi;
    });
    await POST(postRequest({ ...body, jetonApercuFiches: 'J1' }));
    expect(ordre).toEqual(['verrou protocol_diffusion_approvals:PAT_1:HASH_DEC (consultatif)', 'aperçu']);
  });

  it('une remise qui échoue emporte tout le clic (500) — la transaction est annulée', async () => {
    remettreFiches.mockRejectedValue(new Error('remise des fiches : 0 ligne(s) écrite(s) pour 1 attendue(s).'));
    process.env.WN_FICHES_ASSIETTE_LECTURE = 'true';
    const res = await POST(postRequest({ ...body, jetonApercuFiches: 'J1' }));
    expect(res.status).toBe(500);
    expect(((await res.json()) as { reason: string }).reason).toBe('exception');
    // Rien de remis, rien d'annoncé.
    expect(annoncerDocumentRemis).not.toHaveBeenCalled();
  });

  describe('l’e-mail neutre (lot 11)', () => {
    beforeEach(() => {
      process.env.WN_FICHES_ASSIETTE_LECTURE = 'true';
      annoncerDocumentRemis.mockResolvedValue('envoye');
    });

    afterEach(() => {
      delete process.env.WN_FICHES_ASSIETTE_LECTURE;
    });

    it('UN par clic qui remet, APRÈS le commit, et son sort dans la réponse', async () => {
      const ordre: string[] = [];
      prisma.$transaction.mockImplementation(async (fn: (tx: typeof prisma) => unknown) => {
        const issue = await fn(prisma);
        ordre.push('commit');
        return issue;
      });
      annoncerDocumentRemis.mockImplementation(async () => {
        ordre.push('annonce');
        return 'envoye';
      });
      const res = await POST(postRequest({ ...body, jetonApercuFiches: 'J1' }));
      const json = (await res.json()) as { fichesRemises: number; annonceFiches: string };
      expect(res.status).toBe(200);
      expect(json).toMatchObject({ fichesRemises: 2, annonceFiches: 'envoye' });
      expect(annoncerDocumentRemis).toHaveBeenCalledTimes(1);
      expect(annoncerDocumentRemis).toHaveBeenCalledWith('PAT_1');
      expect(ordre).toEqual(['commit', 'annonce']);
    });

    it('un clic qui ne remet RIEN (double clic, rien de neuf) n’annonce rien', async () => {
      remettreFiches.mockResolvedValue(0);
      const json = (await (await POST(postRequest({ ...body, jetonApercuFiches: 'J1' }))).json()) as Record<string, unknown>;
      expect(annoncerDocumentRemis).not.toHaveBeenCalled();
      expect(json).not.toHaveProperty('annonceFiches');
    });

    it('espace de lecture FERMÉ : les fiches partent, l’e-mail non', async () => {
      delete process.env.WN_FICHES_ASSIETTE_LECTURE;
      const json = (await (await POST(postRequest({ ...body, jetonApercuFiches: 'J1' }))).json()) as Record<string, unknown>;
      expect(json).toMatchObject({ fichesRemises: 2 });
      expect(json).not.toHaveProperty('annonceFiches');
      expect(annoncerDocumentRemis).not.toHaveBeenCalled();
    });

    it('un aperçu périmé n’annonce rien', async () => {
      apercuFichesDuProtocole.mockResolvedValue({ ...apercuServi, jeton: 'J2' });
      await POST(postRequest({ ...body, jetonApercuFiches: 'J1' }));
      expect(annoncerDocumentRemis).not.toHaveBeenCalled();
    });

    it('un envoi qui échoue ne défait pas le clic : 200, et l’échec est dit', async () => {
      annoncerDocumentRemis.mockResolvedValue('echoue');
      const res = await POST(postRequest({ ...body, jetonApercuFiches: 'J1' }));
      expect(res.status).toBe(200);
      expect(await res.json()).toMatchObject({ ok: true, fichesRemises: 2, annonceFiches: 'echoue' });
    });
  });

  it('les bloqueurs de la carte refusent AVANT toute transaction, drapeau ouvert comme fermé', async () => {
    rejouerCarteDecision.mockResolvedValue(carteSansBloqueur({
      abstention: { status: 'required', ruleIds: ['R1'], limitations: [] },
    }));
    const res = await POST(postRequest({ ...body, jetonApercuFiches: 'J1' }));
    expect(res.status).toBe(409);
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(remettreFiches).not.toHaveBeenCalled();
  });

  it('GET : une carte qui ne se rejoue plus bloque toutes les fiches (contrat refusé)', async () => {
    rejouerCarteDecision.mockResolvedValue({ ok: false, reason: 'x' });
    prisma.protocolDraft.findMany.mockResolvedValue([
      { id: 'v1', inputHash: 'HASH_V1', decisionCardInputHash: 'HASH_DEC', assessmentEpisodeId: 'E1', supersedesDraftId: null, createdAt: new Date('2026-01-03T00:00:00.000Z'), payload: {} },
    ]);
    await GET(requeteGet());
    expect(apercuFichesDuProtocole).toHaveBeenCalledWith(
      prisma,
      expect.objectContaining({ blocage: expect.objectContaining({ motif: 'contrat_refuse' }) }),
      { verrouiller: false },
    );
  });

  it('GET : une lecture des fiches en échec se DIT, sans emporter l’état de diffusion', async () => {
    apercuFichesDuProtocole.mockRejectedValue(new Error('base indisponible'));
    prisma.protocolDraft.findMany.mockResolvedValue([
      { id: 'v1', inputHash: 'HASH_V1', decisionCardInputHash: 'HASH_DEC', assessmentEpisodeId: 'E1', supersedesDraftId: null, createdAt: new Date('2026-01-03T00:00:00.000Z'), payload: {} },
    ]);
    const res = await GET(requeteGet());
    const json = (await res.json()) as { ok: boolean; stale: boolean; fiches: { jeton: string; blocage: { motif: string } } };
    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.fiches.blocage.motif).toBe('lecture_impossible');
    // Un jeton qui ne peut égaler aucun aperçu calculé (64 hexadécimaux).
    expect(json.fiches.jeton).not.toMatch(/^[0-9a-f]{64}$/);
  });

  it('GET drapeau ouvert : l’aperçu des fiches de la version ACTIVE, lu SANS verrou', async () => {
    prisma.protocolDraft.findMany.mockResolvedValue([
      { id: 'v2', inputHash: 'HASH_V2', decisionCardInputHash: 'HASH_DEC', assessmentEpisodeId: 'E2', supersedesDraftId: 'v1', createdAt: new Date('2026-01-05T00:00:00.000Z'), payload: {} },
      { id: 'v1', inputHash: 'HASH_V1', decisionCardInputHash: 'HASH_DEC', assessmentEpisodeId: 'E1', supersedesDraftId: null, createdAt: new Date('2026-01-03T00:00:00.000Z'), payload: {} },
    ]);
    const json = (await (await GET(requeteGet())).json()) as { fiches: { jeton: string } | null };
    expect(json.fiches?.jeton).toBe('J1');
    expect(apercuFichesDuProtocole).toHaveBeenCalledWith(
      prisma,
      expect.objectContaining({ idPatient: 'PAT_1', protocolDraftInputHash: 'HASH_V2' }),
      { verrouiller: false },
    );
  });

  it('GET drapeau ouvert, sans version : aucun aperçu de fiches', async () => {
    prisma.protocolDraft.findMany.mockResolvedValue([]);
    const json = (await (await GET(requeteGet())).json()) as { fiches: unknown };
    expect(json.fiches).toBeNull();
    expect(apercuFichesDuProtocole).not.toHaveBeenCalled();
  });
});
