import { describe, expect, it } from 'vitest';
import { getCurrentRecommendedPlateRef } from '@/lib/food-compass/plates';
import { createAttentionBudget, createEpisode } from './episode';
import { buildPublishedJaFeasibility } from './feasibility';

function episode(withPlate = true) {
  return createEpisode({
    episodeId: 'EP_SOPHIE_1',
    patientId: 'PAT_SOPHIE',
    startDate: '2026-07-18',
    endDate: '2026-07-25',
    budget: createAttentionBudget(3),
    content: {
      regime: 'essai',
      hypothese: 'Observer la praticabilité de l’action discutée.',
      action: {
        actionId: 'ACTION_1',
        labelPatient: 'Essai alimentaire de la semaine',
        idealPlan: 'Version idéale discutée.',
        simplePlan: 'Version simple discutée.',
        ...(withPlate ? {
          recommendedPlateRef: getCurrentRecommendedPlateRef('ASSIETTE_PETIT_DEJEUNER_SIMPLE'),
        } : {}),
      },
    },
  });
}

const reviewedAt = '2026-07-18T12:00:00.000Z';
const sourceInputHash = 'a'.repeat(64);

describe('contrat de faisabilité JA publié', () => {
  it('publie uniquement des comptes factuels après validation praticien', () => {
    const result = buildPublishedJaFeasibility({
      sourceDraftId: 'JA_ACT_SOPHIE_1', sourceInputHash, reviewedAt,
      activationReviewedAt: reviewedAt, episode: episode(),
      traces: [
        { episodeId: 'EP_SOPHIE_1', occasionPresentee: true, faisable: true, issue: 'fait' },
        { episodeId: 'EP_SOPHIE_1', occasionPresentee: true, faisable: true, issue: 'adapte' },
        { episodeId: 'EP_SOPHIE_1', occasionPresentee: true, faisable: false, issue: 'partiel_empeche' },
        { episodeId: 'EP_SOPHIE_1', occasionPresentee: false, faisable: null, issue: 'oublie_non_note' },
      ],
    });
    expect(result).toMatchObject({
      publicationStatus: 'published', validatedBy: 'practitioner',
      facts: {
        tracesRecorded: 4, opportunitiesObserved: 3, feasibleDeclarations: 2,
        adaptedDeclarations: 1, blockedDeclarations: 1, noOpportunityDeclarations: 1,
      },
      recommendedPlateRef: { plateCode: 'ASSIETTE_PETIT_DEJEUNER_SIMPLE' },
    });
    expect(JSON.stringify(result)).not.toMatch(/score|pourcentage|percentage/i);
  });

  it('relit un épisode JA V1 sans référence d’assiette', () => {
    expect(buildPublishedJaFeasibility({
      sourceDraftId: 'JA_ACT_SOPHIE_1', sourceInputHash, reviewedAt,
      activationReviewedAt: reviewedAt, episode: episode(false), traces: [],
    }).recommendedPlateRef).toBeNull();
  });

  it('refuse une publication non validée ou des traces d’un autre épisode', () => {
    expect(() => buildPublishedJaFeasibility({
      sourceDraftId: 'JA_ACT_SOPHIE_1', sourceInputHash, reviewedAt,
      activationReviewedAt: '2026-07-18T11:00:00.000Z', episode: episode(), traces: [],
    })).toThrow(/validation praticien/);
    expect(() => buildPublishedJaFeasibility({
      sourceDraftId: 'JA_ACT_SOPHIE_1', sourceInputHash, reviewedAt,
      activationReviewedAt: reviewedAt, episode: episode(),
      traces: [{ episodeId: 'EP_AUTRE', occasionPresentee: true, faisable: true, issue: 'fait' }],
    })).toThrow(/incohérente/);
  });
});
