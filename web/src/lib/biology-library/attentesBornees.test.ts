import { describe, expect, it } from 'vitest';

import type { ProtocolAction } from '@/lib/clinical-engine/types';
import { attentesAPoser, refusCodeInconnu, refusHorsProposition } from './attentesBornees';
import type { LignePanelProposition } from './statuts';

// La partie pure de la borne de [[D-190]] §3 tenue au serveur ([[D-305]]).

function suspendue(overrides: Partial<ProtocolAction> = {}): ProtocolAction {
  return {
    actionId: 'action-1', type: 'supplement_exploration', title: 'Fer',
    idealPlan: 'Idéal.', minimalPlan: 'Minimal.', rescuePlan: 'Secours.', limitations: [],
    interventionStatus: 'conditionnelle_biologie',
    waitFor: { type: 'biologie', cible: 'ferritine', analyteCodes: ['BIO_FERRITINE'] },
    ...overrides,
  };
}

function ligne(statut: LignePanelProposition['statut'], codes: string[], declencheurRempli: boolean | null = null) {
  return {
    panelCode: 'P', libelle: 'Panel', niveau: '1', objectif: null, statut, declencheurRempli,
    condition: null, motifs: [], justificationClaims: [], ratios: [],
    analytes: codes.map(code => ({
      code, libelle: code, validationMedicaleRequise: false, remboursement: { statut: 'non_evalue' },
    })),
  } as unknown as LignePanelProposition;
}

describe('attentesAPoser — la borne juge le geste', () => {
  it('une attente sans version active est jugée', () => {
    expect(attentesAPoser([], [suspendue()])).toEqual([
      { actionId: 'action-1', title: 'Fer', analyteCodes: ['BIO_FERRITINE'] },
    ]);
  });

  it('une action suspendue IDENTIQUE à la version active n’est pas rejugée', () => {
    expect(attentesAPoser([suspendue()], [suspendue()])).toEqual([]);
  });

  // CONTRE-REVUE DU 2026-10-15 : le constructeur renumérote depuis `action-1`.
  // Une autre action sous le même identifiant, mêmes codes, est un geste neuf.
  it('même identifiant, AUTRE action, mêmes codes ⇒ jugée', () => {
    const autre = suspendue({ title: 'Magnésium', type: 'food' });
    expect(attentesAPoser([suspendue()], [autre])).toHaveLength(1);
  });

  it('un code ajouté, une cible changée ⇒ jugée', () => {
    const plus = suspendue({
      waitFor: { type: 'biologie', cible: 'ferritine', analyteCodes: ['BIO_FERRITINE', 'BIO_TSH'] },
    });
    const cible = suspendue({
      waitFor: { type: 'biologie', cible: 'bilan martial', analyteCodes: ['BIO_FERRITINE'] },
    });
    expect(attentesAPoser([suspendue()], [plus])).toHaveLength(1);
    expect(attentesAPoser([suspendue()], [cible])).toHaveLength(1);
  });

  it('une version active où l’action n’était pas suspendue ⇒ jugée', () => {
    const active = suspendue({ interventionStatus: 'active', waitFor: undefined });
    expect(attentesAPoser([active], [suspendue()])).toHaveLength(1);
  });

  it('une version active à attente non typée ⇒ la soumission typée est jugée', () => {
    const nonTypee = suspendue({ waitFor: { type: 'biologie', cible: 'ferritine' } });
    expect(attentesAPoser([nonTypee], [suspendue()])).toHaveLength(1);
  });

  it('les actions qui n’attendent rien ne sont pas des attentes', () => {
    expect(attentesAPoser([], [suspendue({ interventionStatus: 'active', waitFor: undefined })])).toEqual([]);
  });
});

describe('refusCodeInconnu / refusHorsProposition', () => {
  const attentes = [{ actionId: 'action-1', title: 'Fer', analyteCodes: ['BIO_FERRITINE', 'BIO_TSH'] }];

  it('nomme le premier code inconnu du catalogue', () => {
    expect(refusCodeInconnu(attentes, new Set(['BIO_FERRITINE']))).toContain('« BIO_TSH »');
    expect(refusCodeInconnu(attentes, new Set(['BIO_FERRITINE', 'BIO_TSH']))).toBeNull();
  });

  it('admet recommandé, à répéter et conditionnel rempli ; refuse le reste', () => {
    expect(refusHorsProposition(attentes, [
      ligne('recommande', ['BIO_FERRITINE']), ligne('conditionnel', ['BIO_TSH'], true),
    ])).toBeNull();
    expect(refusHorsProposition(attentes, [
      ligne('a_repeter', ['BIO_FERRITINE']), ligne('conditionnel', ['BIO_TSH'], false),
    ])).toContain('« BIO_TSH »');
    expect(refusHorsProposition(attentes, [
      ligne('recommande', ['BIO_FERRITINE']), ligne('optionnel', ['BIO_TSH']),
    ])).toContain('« BIO_TSH »');
  });
});
