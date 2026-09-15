import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, prisma, resolveProtocoleDiffuse, reconstructProtocolDraft, rejouerCarteDecision } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    patient: { findUnique: vi.fn() },
    protocolDraft: { findUnique: vi.fn() },
    journalAccesDossier: { create: vi.fn(), deleteMany: vi.fn() },
  },
  resolveProtocoleDiffuse: vi.fn(),
  reconstructProtocolDraft: vi.fn(),
  rejouerCarteDecision: vi.fn(),
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/protocol/portailProtocol', () => ({ resolveProtocoleDiffuse }));
vi.mock('@/lib/protocol/fromPrisma', () => ({
  reconstructProtocolDraft,
  ProtocolPayloadIntegrityError: class extends Error {},
}));
vi.mock('@/lib/clinical-engine/rejeuCarteDecision', () => ({ rejouerCarteDecision }));

import { GET } from './route';

const URL_BASE = 'http://localhost/api/praticien/ja/cycle?idPatient=PAT_TEST';

describe('api/praticien/ja/cycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });
    prisma.patient.findUnique.mockResolvedValue({ praticienEmail: 'praticien@wellneuro.fr' });
  });

  it('refuse sans session praticien', async () => {
    getServerSession.mockResolvedValue(null);
    expect((await GET(new Request(URL_BASE))).status).toBe(401);
  });

  it('refuse un patient hors périmètre du praticien', async () => {
    prisma.patient.findUnique.mockResolvedValue({ praticienEmail: 'autre@wellneuro.fr' });
    const res = await GET(new Request(URL_BASE));
    expect(res.status).toBe(403);
    expect(resolveProtocoleDiffuse).not.toHaveBeenCalled();
  });

  it('refuse un identifiant patient invalide', async () => {
    const res = await GET(new Request('http://localhost/api/praticien/ja/cycle?idPatient=PAT%20TEST'));
    expect(res.status).toBe(400);
  });

  // Journal des accès (G-TRUST-04) : une lecture accessible se trace au gabarit
  // littéral, jamais l'URL reçue. Toutes les routes praticien voisines le font.
  it('journalise la lecture accessible au gabarit littéral', async () => {
    resolveProtocoleDiffuse.mockResolvedValue(null);
    await GET(new Request(URL_BASE));

    expect(prisma.journalAccesDossier.create).toHaveBeenCalledTimes(1);
    expect(prisma.journalAccesDossier.create).toHaveBeenCalledWith({
      data: {
        idPatient: 'PAT_TEST',
        praticienEmail: 'praticien@wellneuro.fr',
        route: '/api/praticien/ja/cycle',
        methode: 'GET',
      },
    });
  });

  it('rend protocoleDiffuse=false quand aucun protocole n’est diffusé', async () => {
    resolveProtocoleDiffuse.mockResolvedValue(null);
    const res = await GET(new Request(URL_BASE));
    const json = (await res.json()) as { ok: boolean; protocoleDiffuse: boolean; vue: unknown };

    expect(res.status).toBe(200);
    expect(json.protocoleDiffuse).toBe(false);
    expect(json.vue).toBeNull();
  });

  // « MIROIR EXACT » L'ÉTAIT DEVENU FAUX ([[D-191]]) : cette route recopiait la
  // projection manuelle du portail — `actions[0]` comprise — au lieu de la
  // partager. Elle passe désormais par le MÊME contrat, et ce banc le tient.
  it('rend la même vue de cycle que la route patient — les trois actions', async () => {
    const EMPREINTE_CARTE = 'decision-hash';
    const ID_CARTE = 'runtime-decision-PAT_TEST-T0';
    const ID_PRIORITE = 'priority:sommeil-fragmente';
    resolveProtocoleDiffuse.mockResolvedValue({
      protocolDraftId: 'PD_1',
      protocolDraftInputHash: 'abcdef0123456789ZZZZ',
      decisionCardId: ID_CARTE,
      decisionCardInputHash: EMPREINTE_CARTE,
      approvedAt: new Date('2026-07-20T08:00:00.000Z'),
      approvedBy: 'practitioner',
      confirmation: 'content_approved_for_diffusion',
    });
    prisma.protocolDraft.findUnique.mockResolvedValue({
      payload: {}, inputHash: 'abcdef0123456789ZZZZ', assessmentEpisodeId: 'runtime-episode-PAT_TEST-T0',
    });
    reconstructProtocolDraft.mockReturnValue({
      protocolDraftId: 'PD_1',
      inputHash: 'abcdef0123456789ZZZZ',
      decisionCardId: ID_CARTE,
      decisionCardInputHash: EMPREINTE_CARTE,
      selectedPriorityId: ID_PRIORITE,
      status: 'practitioner_reviewed',
      review: { reviewedAt: '2026-07-19T08:00:00.000Z' },
      purpose: 'Rendre l’action alimentaire praticable.',
      followUpCriterion: 'Trois matins sur sept à J21.',
      adviceSheetRef: null,
      actions: [
        { actionId: 'a1', type: 'food', title: 'Ajouter une source de protéines au petit-déjeuner', minimalPlan: 'Le faire trois fois cette semaine.', idealPlan: 'INTERNE', rescuePlan: 'INTERNE', limitations: [], interventionStatus: 'active' },
        { actionId: 'a2', type: 'chronobiology', title: 'Avancer le coucher', minimalPlan: 'Vingt minutes plus tôt.', idealPlan: 'INTERNE', rescuePlan: 'INTERNE', limitations: [], interventionStatus: 'active' },
      ],
    });
    rejouerCarteDecision.mockResolvedValue({
      ok: true,
      selectionEcartee: false,
      decisionCard: {
        decisionCardId: ID_CARTE,
        inputHash: EMPREINTE_CARTE,
        abstention: { status: 'not_required', ruleIds: [], limitations: [] },
        safetyFindingIds: [],
        selectedMainPriority: { candidateId: ID_PRIORITE, selectedBy: 'practitioner', selectedAt: '2026-07-01T08:00:00.000Z', rationale: 'INTERNE' },
        priorityCandidates: [{ candidateId: ID_PRIORITE, label: 'Sommeil fragmenté', rationale: 'INTERNE' }],
      },
    });

    const res = await GET(new Request(URL_BASE));
    const json = (await res.json()) as {
      ok: boolean;
      vue: {
        purpose: string;
        priorityLabel: string;
        actions: { type: string; title: string; minimalPlan: string; idealPlan?: string }[];
        cycleRef: string;
        debutCycle: string;
      };
    };

    expect(res.status).toBe(200);
    expect(json.vue.cycleRef).toBe('abcdef0123456789');
    expect(json.vue.debutCycle).toBe('2026-07-20T08:00:00.000Z');
    expect(json.vue.priorityLabel).toBe('Sommeil fragmenté');
    expect(json.vue.actions).toHaveLength(2);
    // UNE ACTION FERME NE PORTE AUCUN STATUT. Le contrat ne le recopie pas :
    // « active » se lit telle quelle, sans mention — c'est l'absence de mention
    // qui distingue une action ferme d'une action retenue.
    expect(json.vue.actions[0]).toEqual({
      actionId: 'a1',
      type: 'food',
      title: 'Ajouter une source de protéines au petit-déjeuner',
      minimalPlan: 'Le faire trois fois cette semaine.',
    });
    // Le plan idéal reste interne au praticien : il ne transite pas par la vue
    // de cycle, qui est le miroir exact de ce que lit le patient.
    expect(JSON.stringify(json)).not.toContain('INTERNE');
  });

  // LE PRATICIEN VOIT CE QUE VOIT SON PATIENT — c'est-à-dire rien, et pour la
  // même raison. Servir ici un protocole que le portail refuse lui ferait croire
  // que son patient le lit.
  it('ne sert rien quand le rejeu refuse, comme la route patient', async () => {
    resolveProtocoleDiffuse.mockResolvedValue({
      protocolDraftId: 'PD_1',
      protocolDraftInputHash: 'abcdef0123456789ZZZZ',
      decisionCardId: 'runtime-decision-PAT_TEST-T0',
      decisionCardInputHash: 'decision-hash',
      approvedAt: new Date('2026-07-20T08:00:00.000Z'),
      approvedBy: 'practitioner',
      confirmation: 'content_approved_for_diffusion',
    });
    prisma.protocolDraft.findUnique.mockResolvedValue({
      payload: {}, inputHash: 'abcdef0123456789ZZZZ', assessmentEpisodeId: 'runtime-episode-PAT_TEST-T0',
    });
    reconstructProtocolDraft.mockReturnValue({ actions: [] });
    rejouerCarteDecision.mockResolvedValue({ ok: false, motif: 'carte_derivee' });

    const json = (await (await GET(new Request(URL_BASE))).json()) as { ok: boolean; protocoleDiffuse: boolean; vue: unknown };
    expect(json.ok).toBe(true);
    expect(json.protocoleDiffuse).toBe(false);
    expect(json.vue).toBeNull();
  });
});
