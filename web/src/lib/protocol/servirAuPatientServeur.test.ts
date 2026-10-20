import { beforeEach, describe, expect, it, vi } from 'vitest';

// « SERVI AU PATIENT », LES DEUX MARCHES ([[D-200]]) : la carte rejouée, puis
// le contrat patient — composées ici pour le portail, le miroir praticien et
// la désignation du signalement.

const { rejouerCarteDecision, vuePatientOuRefus } = vi.hoisted(() => ({
  rejouerCarteDecision: vi.fn(),
  vuePatientOuRefus: vi.fn(),
}));
vi.mock('@/lib/clinical-engine/rejeuCarteDecision', () => ({ rejouerCarteDecision }));
vi.mock('@/lib/protocol/servirAuPatient', () => ({ vuePatientOuRefus }));

import type { ProtocolDiffusionApproval, ProtocolDraft } from '@/lib/clinical-engine/types';
import { servirAuPatient } from './servirAuPatientServeur';

const approval: ProtocolDiffusionApproval = {
  decisionCardInputHash: 'empreinte-carte',
  protocolDraftInputHash: 'empreinte-brouillon',
  approvedAt: '2026-10-20T08:00:00.000Z',
  approvedBy: 'practitioner',
  confirmation: 'content_approved_for_diffusion',
};
const protocolDraft = { actions: [] } as unknown as ProtocolDraft;
const decisionCard = { id: 'runtime-decision-1' };
const entree = {
  idPatient: 'P-1',
  decisionCardId: 'runtime-decision-1',
  assessmentEpisodeId: 'episode-1',
  protocolDraft,
  approval,
};

beforeEach(() => {
  rejouerCarteDecision.mockReset();
  vuePatientOuRefus.mockReset();
});

describe('servirAuPatient', () => {
  it('rejoue la carte sur l’empreinte approuvée, puis sert la vue du contrat', async () => {
    rejouerCarteDecision.mockResolvedValue({ ok: true, decisionCard, selectionEcartee: false });
    vuePatientOuRefus.mockReturnValue({ ok: true, vue: { version: 'vue' } });

    await expect(servirAuPatient(entree)).resolves.toEqual({ ok: true, vue: { version: 'vue' } });
    expect(rejouerCarteDecision).toHaveBeenCalledWith({
      idPatient: 'P-1',
      decisionCardId: 'runtime-decision-1',
      assessmentEpisodeId: 'episode-1',
      decisionCardInputHash: 'empreinte-carte',
    });
    // Aucune limitation patient : une absence, pas un vide.
    expect(vuePatientOuRefus).toHaveBeenCalledWith({
      decisionCard, protocolDraft, approval, patientLimitations: [],
    });
  });

  it('carte non rejouable : refus à la première marche, le contrat n’est pas interrogé', async () => {
    rejouerCarteDecision.mockResolvedValue({ ok: false, motif: 'carte_derivee' });

    await expect(servirAuPatient(entree)).resolves.toEqual({ ok: false, marche: 'carte', motif: 'carte_derivee' });
    expect(vuePatientOuRefus).not.toHaveBeenCalled();
  });

  it('contrat refusé : refus à la seconde marche, son détail est rendu', async () => {
    rejouerCarteDecision.mockResolvedValue({ ok: true, decisionCard, selectionEcartee: false });
    vuePatientOuRefus.mockReturnValue({ ok: false, motif: 'contrat_refuse', detail: 'statut inconnu' });

    await expect(servirAuPatient(entree)).resolves.toEqual({ ok: false, marche: 'contrat', detail: 'statut inconnu' });
  });

  it('un rejeu mémoïsé par l’appelant remplace le rejeu par défaut', async () => {
    const rejouer = vi.fn().mockResolvedValue({ ok: false, motif: 'episode_absent' });

    await expect(servirAuPatient({ ...entree, rejouer })).resolves.toEqual({
      ok: false, marche: 'carte', motif: 'episode_absent',
    });
    expect(rejouer).toHaveBeenCalledWith(expect.objectContaining({ decisionCardInputHash: 'empreinte-carte' }));
    expect(rejouerCarteDecision).not.toHaveBeenCalled();
  });
});
