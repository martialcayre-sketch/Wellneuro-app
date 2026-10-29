import { describe, expect, it } from 'vitest';
import type { ProtocolAction } from '@/lib/clinical-engine/types';
import { getCurrentRecommendedPlateRef } from '@/lib/food-compass/plates';
import { refusActionsEnDouble } from './actionsEnDouble';

const base: ProtocolAction = {
  actionId: 'A1',
  type: 'food',
  title: 'Petit-déjeuner protéiné',
  idealPlan: 'Chaque matin',
  minimalPlan: 'Trois matins',
  rescuePlan: 'Un fruit',
  limitations: [],
};

describe('refusActionsEnDouble (D-394)', () => {
  it('rien à dire sur une action seule, ni sur deux actions distinctes', () => {
    expect(refusActionsEnDouble([base])).toBeNull();
    expect(refusActionsEnDouble([base, { ...base, actionId: 'A2', title: 'Dîner léger' }])).toBeNull();
    expect(refusActionsEnDouble([base, { ...base, actionId: 'A2', type: 'chronobiology' }])).toBeNull();
  });

  it('même type et même intitulé, à la casse et aux espaces près', () => {
    expect(refusActionsEnDouble([base, { ...base, actionId: 'A2', title: ' PETIT-DÉJEUNER  protéiné' }]))
      .toBe('Deux actions portent le même intitulé, « Petit-déjeuner protéiné », et le même type. '
        + 'Retirez-en une, ou changez son intitulé, puis enregistrez.');
  });

  it('un accent compte : l’intitulé n’est pas désaccentué', () => {
    expect(refusActionsEnDouble([base, { ...base, actionId: 'A2', title: 'Petit-dejeuner protéiné' }])).toBeNull();
  });

  it('un accent décomposé (NFD) vaut l’accent composé', () => {
    const decompose = 'Petit-déjeuner protéiné'.normalize('NFD');
    expect(refusActionsEnDouble([base, { ...base, actionId: 'A2', title: decompose }])).not.toBeNull();
  });

  it('deux intitulés vides ne font pas un doublon d’intitulé', () => {
    expect(refusActionsEnDouble([{ ...base, title: ' ' }, { ...base, actionId: 'A2', title: '' }])).toBeNull();
  });

  it('même fiche d’assiette sous deux intitulés', () => {
    const assiette = getCurrentRecommendedPlateRef('ASSIETTE_DOPAMINERGIQUE');
    expect(refusActionsEnDouble([
      { ...base, recommendedPlateRef: assiette },
      { ...base, actionId: 'A2', title: 'Déjeuner coloré', recommendedPlateRef: assiette },
    ])).toBe('Les actions « Petit-déjeuner protéiné » et « Déjeuner coloré » indiquent la même assiette. '
      + 'Retirez-en une, ou changez son assiette, puis enregistrez.');
  });

  it('une paire qui répond aux deux critères rend le texte de l’intitulé', () => {
    const assiette = getCurrentRecommendedPlateRef('ASSIETTE_DOPAMINERGIQUE');
    expect(refusActionsEnDouble([
      { ...base, recommendedPlateRef: assiette },
      { ...base, actionId: 'A2', recommendedPlateRef: assiette },
    ])).toMatch(/^Deux actions portent le même intitulé/);
  });

  it('les paires se lisent dans l’ordre de la soumission, au-delà des deux premières', () => {
    expect(refusActionsEnDouble([
      base,
      { ...base, actionId: 'A2', title: 'Dîner léger' },
      { ...base, actionId: 'A3', title: 'dîner léger' },
    ])).toMatch(/« Dîner léger »/);
  });
});
