import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// LE CÔTÉ SERVEUR DE LA PAUSE ([[D-281]], étape 3) : verrous et lectures.

const { prisma, resolveProtocoleDiffuse, refusSaisieSantePour, reconstructProtocolDraft, signee } = vi.hoisted(() => ({
  prisma: {
    protocolDraft: { findUnique: vi.fn(), findMany: vi.fn() },
    trustAdverseEffectReport: { findMany: vi.fn() },
    trustAdverseEffectVerdict: { findMany: vi.fn() },
  },
  resolveProtocoleDiffuse: vi.fn(),
  refusSaisieSantePour: vi.fn(),
  reconstructProtocolDraft: vi.fn(),
  signee: { valeur: false },
}));
vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/protocol/portailProtocol', () => ({ resolveProtocoleDiffuse }));
vi.mock('@/lib/patient/gardeAgeServeur', () => ({ refusSaisieSantePour }));
vi.mock('@/lib/protocol/fromPrisma', () => ({ reconstructProtocolDraft }));
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
// Le module ne lit que l'identifiant, le type et l'intitulé d'une action.
const ACTIONS = [actionOrientation(true), MAGNESIUM] as ProtocolAction[];

describe('pauseEffetIndesirableServeur', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.WN_EI_INTERRUPTION = '1';
    signee.valeur = false;
    resolveProtocoleDiffuse.mockResolvedValue({ protocolDraftId: 'draft-1', protocolDraftInputHash: 'abcdef0123456789ffff' });
    prisma.protocolDraft.findUnique.mockResolvedValue({ payload: {}, inputHash: 'h' });
    reconstructProtocolDraft.mockReturnValue({ actions: ACTIONS });
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
  });

  it('programmeDiffuse : un payload dont l’intégrité échoue rend null', async () => {
    reconstructProtocolDraft.mockImplementation(() => { throw new Error('intégrité'); });
    expect(await programmeDiffuse('PAT_TEST')).toBeNull();
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
