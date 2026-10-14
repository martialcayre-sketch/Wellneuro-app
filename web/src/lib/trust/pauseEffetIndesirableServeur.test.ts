import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// LE CÔTÉ SERVEUR DE LA PAUSE ([[D-281]], étape 3) : verrous et lectures.

const { prisma, resolveProtocoleDiffuse, refusSaisieSantePour, reconstructProtocolDraft, signee } = vi.hoisted(() => ({
  prisma: {
    protocolDraft: { findUnique: vi.fn() },
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
import { designationPour, pausesServies, programmeDiffuse } from './pauseEffetIndesirableServeur';

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
});
