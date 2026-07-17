import { afterEach, describe, expect, it, vi } from 'vitest';
import { POST } from './route';
import { buildValidationErgoC1Fixture } from '@/lib/clinical-engine/validationErgoFixture';

function requeteSoumission(body: unknown): Request {
  return new Request('http://localhost/api/dev/validation-ergo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const soumissionComplete = {
  purpose: 'Raison fixture',
  followUpCriterion: 'Critère fixture',
  actions: [{
    actionId: 'ergo-action-1', type: 'food', title: 'Action fixture',
    idealPlan: 'Idéal fixture', minimalPlan: 'Minimal fixture', rescuePlan: 'Secours fixture',
    limitations: [],
  }],
  therapeuticLoad: { level: 'light', source: 'practitioner', justification: null },
};

describe('POST /api/dev/validation-ergo', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('répond 404 en production (harnais interdit)', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const response = await POST(requeteSoumission(soumissionComplete));
    expect(response.status).toBe(404);
  });

  it('construit un ProtocolDraft relu aligné sur la fixture déterministe', async () => {
    const response = await POST(requeteSoumission(soumissionComplete));
    expect(response.status).toBe(200);
    const { protocolDraft } = await response.json();
    const { decisionCard } = buildValidationErgoC1Fixture();
    expect(protocolDraft.status).toBe('practitioner_reviewed');
    expect(protocolDraft.decisionCardId).toBe(decisionCard.decisionCardId);
    expect(protocolDraft.decisionCardInputHash).toBe(decisionCard.inputHash);
    expect(protocolDraft.selectedPriorityId).toBe('ergo-priorite-1');
    expect(protocolDraft.review?.reviewedAt).toBe(protocolDraft.updatedAt);
    expect(protocolDraft.createdAt).toBe(protocolDraft.updatedAt);
  });

  it('répond 400 quand la soumission est incomplète ou invalide', async () => {
    const incomplet = await POST(requeteSoumission({ purpose: 'Seulement la raison' }));
    expect(incomplet.status).toBe(400);

    // Complet côté forme mais rejeté par le moteur (plan idéal vide).
    const rejeteMoteur = await POST(requeteSoumission({
      ...soumissionComplete,
      actions: [{ ...soumissionComplete.actions[0], idealPlan: '' }],
    }));
    expect(rejeteMoteur.status).toBe(400);
    const payload = await rejeteMoteur.json();
    expect(typeof payload.error).toBe('string');
  });
});
