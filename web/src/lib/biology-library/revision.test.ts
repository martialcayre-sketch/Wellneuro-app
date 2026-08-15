import { describe, expect, it } from 'vitest';
import type { ProtocolAction } from '@/lib/clinical-engine/types';
import { appliquerArbitrages, refusResolutionSansArbitrage, type ArbitrageLie } from './revision';

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

function arbitrage(surcharge: Partial<ArbitrageLie> & { intentionId: string }): ArbitrageLie {
  return {
    verdict: 'confirme',
    noteCourte: null,
    arbitreLe: '2026-08-15T09:00:00.000Z',
    ...surcharge,
  };
}

const FER = action({ actionId: 'act-fer' });

describe('refusResolutionSansArbitrage — l’invariant du lot (Lot G, critère 2)', () => {
  it('refuse toute résolution sans arbitrage lié', () => {
    const refus = refusResolutionSansArbitrage({
      actionsActives: [FER],
      actionsSoumises: [{ ...FER, interventionStatus: 'active', waitFor: undefined }],
      arbitrages: [],
    });
    expect(refus).toContain('exige un arbitrage biologique lié');
  });

  it('refuse la disparition d’une intention en attente — même arbitrée', () => {
    const refus = refusResolutionSansArbitrage({
      actionsActives: [FER],
      actionsSoumises: [],
      arbitrages: [arbitrage({ intentionId: 'act-fer', verdict: 'infirme', noteCourte: 'n' })],
    });
    expect(refus).toContain('ne peut pas disparaître');
  });

  it('laisse passer une intention qui reste en attente', () => {
    expect(refusResolutionSansArbitrage({
      actionsActives: [FER],
      actionsSoumises: [FER],
      arbitrages: [],
    })).toBeNull();
  });

  it('la résolution suit le verdict : confirme ⇒ active, rien d’autre', () => {
    const arbitrages = [arbitrage({ intentionId: 'act-fer', verdict: 'confirme' })];
    expect(refusResolutionSansArbitrage({
      actionsActives: [FER],
      actionsSoumises: [{ ...FER, interventionStatus: 'active', waitFor: undefined }],
      arbitrages,
    })).toBeNull();
    expect(refusResolutionSansArbitrage({
      actionsActives: [FER],
      actionsSoumises: [{ ...FER, interventionStatus: 'non_indiquee_actuellement', waitFor: undefined }],
      arbitrages,
    })).toContain('ne peut être que « active »');
  });

  it('infirme ⇒ non indiquée actuellement, conservée', () => {
    const arbitrages = [arbitrage({ intentionId: 'act-fer', verdict: 'infirme', noteCourte: 'ferritine documentée normale' })];
    expect(refusResolutionSansArbitrage({
      actionsActives: [FER],
      actionsSoumises: [{ ...FER, interventionStatus: 'non_indiquee_actuellement', waitFor: undefined }],
      arbitrages,
    })).toBeNull();
    expect(refusResolutionSansArbitrage({
      actionsActives: [FER],
      actionsSoumises: [{ ...FER, interventionStatus: 'active', waitFor: undefined }],
      arbitrages,
    })).toContain('ne peut être que « non indiquée actuellement »');
  });

  it('sans_objet ne fonde aucune résolution', () => {
    const refus = refusResolutionSansArbitrage({
      actionsActives: [FER],
      actionsSoumises: [{ ...FER, interventionStatus: 'active', waitFor: undefined }],
      arbitrages: [arbitrage({ intentionId: 'act-fer', verdict: 'sans_objet' })],
    });
    expect(refus).toContain('sans objet');
  });

  it('ignore les actions qui n’attendent pas de biologie', () => {
    const active = action({ actionId: 'act-libre', interventionStatus: 'active', waitFor: undefined });
    expect(refusResolutionSansArbitrage({
      actionsActives: [active],
      actionsSoumises: [{ ...active, interventionStatus: 'differee' }],
      arbitrages: [],
    })).toBeNull();
  });
});

describe('appliquerArbitrages — la matière de la révision', () => {
  it('confirme ⇒ active, attente levée', () => {
    const [resultat] = appliquerArbitrages([FER], [arbitrage({ intentionId: 'act-fer' })]);
    expect(resultat.interventionStatus).toBe('active');
    expect('waitFor' in resultat).toBe(false);
  });

  it('infirme ⇒ non indiquée actuellement, motif visible avec la note', () => {
    const [resultat] = appliquerArbitrages(
      [FER],
      [arbitrage({ intentionId: 'act-fer', verdict: 'infirme', noteCourte: 'ferritine normale au bilan' })],
    );
    expect(resultat.interventionStatus).toBe('non_indiquee_actuellement');
    expect('waitFor' in resultat).toBe(false);
    expect(resultat.limitations).toEqual([
      'Non indiquée après bilan biologique (arbitrage praticien du 2026-08-15) : ferritine normale au bilan',
    ]);
  });

  it('sans_objet et non-arbitrée : inchangées, toujours en attente', () => {
    const resultats = appliquerArbitrages(
      [FER, action({ actionId: 'act-zinc', waitFor: { type: 'biologie', cible: 'zinc' } })],
      [arbitrage({ intentionId: 'act-fer', verdict: 'sans_objet' })],
    );
    expect(resultats[0]).toEqual(FER);
    expect(resultats[1].interventionStatus).toBe('conditionnelle_biologie');
  });

  it('ne touche jamais une action non conditionnelle', () => {
    const libre = action({ actionId: 'act-libre', interventionStatus: 'active', waitFor: undefined });
    const [resultat] = appliquerArbitrages([libre], [arbitrage({ intentionId: 'act-libre' })]);
    expect(resultat).toEqual(libre);
  });
});
