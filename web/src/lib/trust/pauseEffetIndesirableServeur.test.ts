import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// LE CÔTÉ SERVEUR DE LA PAUSE ([[D-281]], étape 3) : verrous et lectures.

const {
  prisma, resolveProtocoleDiffuse, refusSaisieSantePour, reconstructProtocolDraft, rejouerCarteDecision, vuePatientOuRefus, signee,
} = vi.hoisted(() => ({
  prisma: {
    protocolDraft: { findUnique: vi.fn(), findMany: vi.fn() },
    trustAdverseEffectReport: { findMany: vi.fn() },
    trustAdverseEffectVerdict: { findMany: vi.fn() },
  },
  resolveProtocoleDiffuse: vi.fn(),
  refusSaisieSantePour: vi.fn(),
  reconstructProtocolDraft: vi.fn(),
  rejouerCarteDecision: vi.fn(),
  vuePatientOuRefus: vi.fn(),
  signee: { valeur: false },
}));
vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/protocol/portailProtocol', () => ({ resolveProtocoleDiffuse }));
vi.mock('@/lib/patient/gardeAgeServeur', () => ({ refusSaisieSantePour }));
vi.mock('@/lib/protocol/fromPrisma', () => ({ reconstructProtocolDraft }));
vi.mock('@/lib/clinical-engine/rejeuCarteDecision', () => ({ rejouerCarteDecision }));
vi.mock('@/lib/protocol/servirAuPatient', () => ({ vuePatientOuRefus }));
vi.mock('@/lib/clinical/safetyEffetIndesirableV1', () => ({
  associationEffetIndesirableDisponible: () => process.env.WN_EI_INTERRUPTION === '1',
  interruptionEffetIndesirableActive: () => process.env.WN_EI_INTERRUPTION === '1' && signee.valeur,
}));

import { actionOrientation } from '@/lib/clinical-engine/orientationAdressage';
import type { ProtocolAction } from '@/lib/clinical-engine/types';
import {
  designationPour,
  elementsDesProgrammesVises,
  pausesServies,
  programmeDiffuse,
  signalementsEnAttenteDuDossier,
} from './pauseEffetIndesirableServeur';

const MAGNESIUM = { actionId: 'a-magnesium', type: 'supplement_exploration', title: 'Magnésium le soir' };
// Le module ne lit que l'identifiant, le type, l'intitulé et le statut d'une action.
const ACTIONS = [actionOrientation(true), MAGNESIUM] as ProtocolAction[];
const DIFFUSE = {
  protocolDraftId: 'draft-1',
  protocolDraftInputHash: 'abcdef0123456789ffff',
  decisionCardId: 'carte-1',
  decisionCardInputHash: 'carte-hash',
  approvedAt: new Date('2026-10-01T10:00:00Z'),
};

describe('pauseEffetIndesirableServeur', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.WN_EI_INTERRUPTION = '1';
    signee.valeur = false;
    resolveProtocoleDiffuse.mockResolvedValue(DIFFUSE);
    prisma.protocolDraft.findUnique.mockResolvedValue({ payload: {}, inputHash: 'h', assessmentEpisodeId: 'episode-1' });
    reconstructProtocolDraft.mockReturnValue({ actions: ACTIONS });
    rejouerCarteDecision.mockResolvedValue({ ok: true, decisionCard: { decisionCardId: 'carte-1' } });
    vuePatientOuRefus.mockReturnValue({ ok: true, vue: {} });
    refusSaisieSantePour.mockResolvedValue(null);
    prisma.trustAdverseEffectReport.findMany.mockResolvedValue([
      { id: 's1', rattachement: 'element', elementActionId: MAGNESIUM.actionId, protocolDraftId: 'draft-1' },
    ]);
    prisma.trustAdverseEffectVerdict.findMany.mockResolvedValue([]);
  });
  afterEach(() => {
    delete process.env.WN_EI_INTERRUPTION;
  });

  describe('designationPour', () => {
    it('patient majeur, programme diffusé : les éléments sans l’orientation, et la version', async () => {
      expect(await designationPour('PAT_TEST')).toEqual({
        version: 'abcdef0123456789',
        elements: [{ actionId: MAGNESIUM.actionId, title: MAGNESIUM.title }],
      });
    });

    it('drapeau absent : null', async () => {
      delete process.env.WN_EI_INTERRUPTION;
      expect(await designationPour('PAT_TEST')).toBeNull();
    });

    it('dossier mineur ou sans date : null, aucune surface neuve (D-283 §5, D-284)', async () => {
      refusSaisieSantePour.mockResolvedValue({ reason: 'circuit_mineur_requis', error: '…' });
      expect(await designationPour('PAT_TEST')).toBeNull();
      expect(resolveProtocoleDiffuse).not.toHaveBeenCalled();
    });

    it('aucun programme diffusé : null', async () => {
      resolveProtocoleDiffuse.mockResolvedValue(null);
      expect(await designationPour('PAT_TEST')).toBeNull();
    });

    it('un programme réduit à l’orientation : null, rien à désigner', async () => {
      reconstructProtocolDraft.mockReturnValue({ actions: [actionOrientation(true)] });
      expect(await designationPour('PAT_TEST')).toBeNull();
    });

    // LA LISTE QUE LE PATIENT VOIT (arbitrages du responsable du 2026-10-16).
    it('une intervention non ferme n’est pas proposée au patient ; une action sans statut (avant V4) l’est', async () => {
      reconstructProtocolDraft.mockReturnValue({
        actions: [
          ...ACTIONS,
          { actionId: 'a-zinc', type: 'supplement_exploration', title: 'Zinc', interventionStatus: 'differee' },
          { actionId: 'a-fer', type: 'supplement_exploration', title: 'Fer', interventionStatus: 'conditionnelle_biologie' },
          { actionId: 'a-repas', type: 'food', title: 'Repas du soir', interventionStatus: 'active' },
        ],
      });
      expect((await designationPour('PAT_TEST'))?.elements.map(e => e.actionId)).toEqual([MAGNESIUM.actionId, 'a-repas']);
    });

    it('aucune intervention ferme : la désignation sans liste (liste vide), pas le formulaire d’avant', async () => {
      reconstructProtocolDraft.mockReturnValue({
        actions: [actionOrientation(true), { ...MAGNESIUM, interventionStatus: 'contre_indiquee' }],
      });
      expect(await designationPour('PAT_TEST')).toEqual({ version: 'abcdef0123456789', elements: [] });
    });

    it.each([
      ['le rejeu de la carte échoue', () => rejouerCarteDecision.mockResolvedValue({ ok: false, motif: 'carte_derivee' })],
      ['le contrat patient refuse', () => vuePatientOuRefus.mockReturnValue({ ok: false, motif: 'contrat_refuse', detail: '…' })],
    ])('programme non servi au portail (%s) : la désignation sans liste', async (_cas, preparer) => {
      preparer();
      expect(await designationPour('PAT_TEST')).toEqual({ version: 'abcdef0123456789', elements: [] });
    });
  });

  it('programmeDiffuse : un payload dont l’intégrité échoue rend null', async () => {
    reconstructProtocolDraft.mockImplementation(() => { throw new Error('intégrité'); });
    expect(await programmeDiffuse('PAT_TEST')).toBeNull();
  });

  it('programmeDiffuse : les deux marches du portail, le rejeu de la carte diffusée puis le contrat patient', async () => {
    expect(await programmeDiffuse('PAT_TEST')).toMatchObject({ protocolDraftId: 'draft-1', servi: true });
    expect(rejouerCarteDecision).toHaveBeenCalledWith({
      idPatient: 'PAT_TEST',
      decisionCardId: 'carte-1',
      assessmentEpisodeId: 'episode-1',
      decisionCardInputHash: 'carte-hash',
    });
    // L'APPEL EXACT, comme celui du portail (`api/portail/protocole`) : un
    // champ qui divergerait ferait diverger la liste et l'écran ([[D-200]]).
    expect(vuePatientOuRefus).toHaveBeenCalledWith({
      decisionCard: { decisionCardId: 'carte-1' },
      protocolDraft: { actions: ACTIONS },
      approval: {
        decisionCardInputHash: 'carte-hash',
        protocolDraftInputHash: DIFFUSE.protocolDraftInputHash,
        approvedAt: '2026-10-01T10:00:00.000Z',
        approvedBy: 'practitioner',
        confirmation: 'content_approved_for_diffusion',
      },
      patientLimitations: [],
    });
    rejouerCarteDecision.mockResolvedValue({ ok: false, motif: 'carte_derivee' });
    expect(await programmeDiffuse('PAT_TEST')).toMatchObject({ servi: false });
  });

  describe('pausesServies', () => {
    it('règle non signée : aucune pause servie, aucune lecture (D-281 §6)', async () => {
      expect(await pausesServies('PAT_TEST', 'draft-1', ACTIONS)).toEqual([]);
      expect(prisma.trustAdverseEffectReport.findMany).not.toHaveBeenCalled();
    });

    it('règle signée : l’élément désigné est en pause', async () => {
      signee.valeur = true;
      expect(await pausesServies('PAT_TEST', 'draft-1', ACTIONS)).toEqual([{ actionId: MAGNESIUM.actionId, texte: 'element' }]);
      expect(prisma.trustAdverseEffectReport.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { idPatient: 'PAT_TEST', rattachement: { not: null } },
      }));
    });

    it('règle signée : un signalement d’une autre version ne met rien en pause', async () => {
      signee.valeur = true;
      expect(await pausesServies('PAT_TEST', 'draft-2', ACTIONS)).toEqual([]);
    });
  });

  describe('elementsDesProgrammesVises (étape 4)', () => {
    it('chaque programme visé : ses éléments désignables ; absent ou illisible : null', async () => {
      prisma.protocolDraft.findMany.mockResolvedValue([
        { id: 'draft-1', payload: {}, inputHash: 'h1' },
        { id: 'draft-2', payload: {}, inputHash: 'h2' },
      ]);
      reconstructProtocolDraft.mockImplementation((_payload: unknown, hash: string) => {
        if (hash === 'h2') throw new Error('intégrité');
        // Orientation ET prise de sang : ni l'une ni l'autre n'est désignable.
        return { actions: [...ACTIONS, { actionId: 'a-bilan', type: 'biological_exploration', title: 'Bilan sanguin' }] };
      });
      const resultat = await elementsDesProgrammesVises(['draft-1', 'draft-2', 'draft-3', 'draft-1']);
      expect(prisma.protocolDraft.findMany.mock.calls[0][0].where).toEqual({ id: { in: ['draft-1', 'draft-2', 'draft-3'] } });
      expect(resultat.get('draft-1')).toEqual([{ actionId: MAGNESIUM.actionId, title: MAGNESIUM.title }]);
      expect(resultat.get('draft-2')).toBeNull();
      expect(resultat.get('draft-3')).toBeNull();
    });

    it('aucun programme : aucune lecture', async () => {
      expect((await elementsDesProgrammesVises([])).size).toBe(0);
      expect(prisma.protocolDraft.findMany).not.toHaveBeenCalled();
    });
  });

  describe('signalementsEnAttenteDuDossier (étape 4, garde de diffusion)', () => {
    it('tous les signalements du dossier qui reçoivent un avis, quelle que soit la version ; seuls ceux sans avis', async () => {
      prisma.trustAdverseEffectReport.findMany.mockResolvedValue([
        { id: 's1', rattachement: 'element', protocolDraftId: 'draft-1', soumisLe: new Date('2026-10-10T10:00:00Z') },
        { id: 's2', rattachement: 'ne_sait_pas', protocolDraftId: 'draft-1', soumisLe: new Date('2026-10-11T10:00:00Z') },
        // Le formulaire d'avant : « oui » au programme, sans élément (D-281 §5).
        { id: 's3', rattachement: null, protocolDraftId: 'draft-1', soumisLe: new Date('2026-10-12T10:00:00Z') },
      ]);
      prisma.trustAdverseEffectVerdict.findMany.mockResolvedValue([
        { id: 'v1', reportId: 's1', verdict: 'non_implique', elementActionId: null, supersedesVerdictId: null },
      ]);
      expect(await signalementsEnAttenteDuDossier('PAT_TEST')).toEqual([
        { id: 's2', soumisLe: new Date('2026-10-11T10:00:00Z') },
        { id: 's3', soumisLe: new Date('2026-10-12T10:00:00Z') },
      ]);
      // Aucun filtre de version ni de statut : le signalement survit au
      // remplacement du programme (§3), et le statut ne lève rien (§5).
      expect(prisma.trustAdverseEffectReport.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { idPatient: 'PAT_TEST', OR: [{ rattachement: { not: null } }, { protocolDraftId: { not: null } }] },
      }));
      expect(prisma.trustAdverseEffectVerdict.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { idPatient: 'PAT_TEST' },
      }));
    });

    it('fail-closed : deux avis racines, ou l’avis d’un autre signalement, laissent l’attente', async () => {
      prisma.trustAdverseEffectReport.findMany.mockResolvedValue([
        { id: 's1', rattachement: 'element', soumisLe: new Date('2026-10-10T10:00:00Z') },
        { id: 's2', rattachement: 'element', soumisLe: new Date('2026-10-11T10:00:00Z') },
      ]);
      prisma.trustAdverseEffectVerdict.findMany.mockResolvedValue([
        { id: 'v1', reportId: 's1', verdict: 'non_implique', elementActionId: null, supersedesVerdictId: null },
        { id: 'v2', reportId: 's1', verdict: 'non_implique', elementActionId: null, supersedesVerdictId: null },
        { id: 'v3', reportId: 's9', verdict: 'non_implique', elementActionId: null, supersedesVerdictId: null },
      ]);
      expect((await signalementsEnAttenteDuDossier('PAT_TEST')).map(s => s.id)).toEqual(['s1', 's2']);
    });
  });
});
