import { describe, expect, it } from 'vitest';
import type { ProtocolAction } from '@/lib/clinical-engine/types';
import { LONGUEUR_MAX_NOTE, preparerArbitrage } from './arbitrage';

function action(surcharge: Partial<ProtocolAction> & { actionId: string }): ProtocolAction {
  return {
    type: 'biological_exploration',
    title: 'Explorer le statut martial',
    idealPlan: 'plan idéal',
    minimalPlan: 'plan minimal',
    rescuePlan: 'plan de secours',
    limitations: [],
    interventionStatus: 'conditionnelle_biologie',
    waitFor: { type: 'biologie', cible: 'ferritine' },
    ...surcharge,
  };
}

const ACTIONS: ProtocolAction[] = [
  action({ actionId: 'act-fer' }),
  action({ actionId: 'act-active', interventionStatus: 'active', waitFor: undefined }),
];

describe('preparerArbitrage', () => {
  it('accepte un verdict confirmé sans note', () => {
    const preparation = preparerArbitrage({
      intentionId: 'act-fer',
      verdict: 'confirme',
      actions: ACTIONS,
    });
    expect(preparation).toEqual({
      ok: true,
      donnees: { intentionId: 'act-fer', verdict: 'confirme', noteCourte: null },
    });
  });

  it('un verdict infirmé sans note est impossible à enregistrer (Lot F, critère 3)', () => {
    for (const noteCourte of [undefined, '', '   ']) {
      const preparation = preparerArbitrage({
        intentionId: 'act-fer',
        verdict: 'infirme',
        noteCourte,
        actions: ACTIONS,
      });
      expect(preparation).toEqual({ ok: false, raison: 'note_obligatoire_pour_infirme' });
    }
  });

  it('borne la note à 2000 caractères (miroir du CHECK SQL)', () => {
    const preparation = preparerArbitrage({
      intentionId: 'act-fer',
      verdict: 'infirme',
      noteCourte: 'x'.repeat(LONGUEUR_MAX_NOTE + 1),
      actions: ACTIONS,
    });
    expect(preparation).toEqual({ ok: false, raison: 'note_trop_longue' });
  });

  it('refuse un verdict hors énuméré', () => {
    for (const verdict of ['valide', '', 42, null, undefined]) {
      expect(preparerArbitrage({ intentionId: 'act-fer', verdict, actions: ACTIONS }))
        .toEqual({ ok: false, raison: 'verdict_invalide' });
    }
  });

  it('refuse une intention inconnue de la version visée', () => {
    expect(preparerArbitrage({ intentionId: 'act-fantome', verdict: 'confirme', actions: ACTIONS }))
      .toEqual({ ok: false, raison: 'intention_inconnue' });
  });

  it('refuse une intention qui n’attend pas de biologie', () => {
    expect(preparerArbitrage({ intentionId: 'act-active', verdict: 'confirme', actions: ACTIONS }))
      .toEqual({ ok: false, raison: 'intention_non_conditionnelle' });
  });

  it('normalise la note : trim, vide devient null hors infirme', () => {
    const preparation = preparerArbitrage({
      intentionId: 'act-fer',
      verdict: 'sans_objet',
      noteCourte: '  bilan porté sur un autre axe  ',
      actions: ACTIONS,
    });
    expect(preparation).toEqual({
      ok: true,
      donnees: {
        intentionId: 'act-fer',
        verdict: 'sans_objet',
        noteCourte: 'bilan porté sur un autre axe',
      },
    });
  });
});
