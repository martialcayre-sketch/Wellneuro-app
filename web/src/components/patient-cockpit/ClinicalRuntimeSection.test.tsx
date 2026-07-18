// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CockpitRuntimeApiResponse } from '@/app/api/praticien/cockpit/route';
import type { ProposedAssessmentEpisode } from '@/lib/clinical-engine/types';
import { buildValidationErgoC1Fixture } from '@/lib/clinical-engine/validationErgoFixture';
import { ClinicalRuntimeSection } from './ClinicalRuntimeSection';
import { EpisodeConfirmationPanel } from './EpisodeConfirmationPanel';
import { C5FeatureProvider } from './C5FeatureProvider';

const proposal: ProposedAssessmentEpisode = {
  assessmentEpisodeId: 'episode-T0',
  patientId: 'PAT_TEST',
  milestone: 'T0',
  targetAt: '2026-07-01T12:00:00.000Z',
  window: { start: '2026-06-28T12:00:00.000Z', end: '2026-07-04T12:00:00.000Z', toleranceDays: 3 },
  candidateResponses: [
    { responseId: 'R-IN', questionnaireId: 'Q-IN', observedAt: '2026-07-01T12:00:00.000Z', scoreVersion: null },
    { responseId: 'R-OUT', questionnaireId: 'Q-OUT', observedAt: '2026-07-10T12:00:00.000Z', scoreVersion: null },
  ],
  inWindowResponseIds: ['R-IN'],
  outOfWindowResponseIds: ['R-OUT'],
  includedResponseIds: ['R-IN'],
  sourceDateRange: { min: '2026-07-01T12:00:00.000Z', max: '2026-07-10T12:00:00.000Z' },
  status: 'proposed',
};

const proposalResponse: CockpitRuntimeApiResponse = {
  status: 'proposal_required',
  proposal,
  proposalHash: 'hash-proposal',
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('EpisodeConfirmationPanel', () => {
  it('sélectionne les réponses dans la fenêtre par défaut et permet une correction hors fenêtre', () => {
    const onConfirm = vi.fn();
    render(<EpisodeConfirmationPanel proposal={proposal} submitting={false} onConfirm={onConfirm} />);

    expect((screen.getByLabelText(/Q-IN/) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByLabelText(/Q-OUT/) as HTMLInputElement).checked).toBe(false);
    fireEvent.click(screen.getByLabelText(/Q-OUT/));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer l’épisode T0' }));

    expect(onConfirm).toHaveBeenCalledWith(['R-IN', 'R-OUT']);
    expect(screen.queryByText(/scoresJson/)).toBeNull();
  });

  it('exige aussi une confirmation explicite pour un épisode vide', () => {
    const onConfirm = vi.fn();
    render(
      <EpisodeConfirmationPanel
        proposal={{ ...proposal, candidateResponses: [], inWindowResponseIds: [], outOfWindowResponseIds: [], includedResponseIds: [], sourceDateRange: null }}
        submitting={false}
        onConfirm={onConfirm}
      />,
    );

    expect(screen.getByText(/Aucune réponse disponible/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer l’épisode T0' }));
    expect(onConfirm).toHaveBeenCalledWith([]);
  });
});

describe('ClinicalRuntimeSection', () => {
  it('enchaîne GET, confirmation POST et rendu prudent des objets C1', async () => {
    const fixture = buildValidationErgoC1Fixture();
    const ready: CockpitRuntimeApiResponse = {
      status: 'ready',
      snapshot: fixture.snapshot,
      review: { ...fixture.review, abstention: { status: 'not_evaluated', ruleIds: [], limitations: ['Règles non validées.'] } },
      decisionCard: {
        ...fixture.decisionCard,
        priorityCandidates: [],
        proposedMainPriorityId: null,
        selectedMainPriority: null,
        abstention: { status: 'not_evaluated', ruleIds: [], limitations: ['Règles non validées.'] },
      },
    };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => proposalResponse })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ready });
    vi.stubGlobal('fetch', fetchMock);

    render(<ClinicalRuntimeSection idPatient="PAT_TEST" fixture={null} protocolDraft={null} onFixtureReviewed={vi.fn()} />);
    await screen.findByRole('heading', { name: 'Confirmation de l’épisode T0' });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer l’épisode T0' }));

    await screen.findByText(/Épisode T0 confirmé/);
    expect(screen.getByText('Aucune priorité proposée')).toBeTruthy();
    expect(screen.getByText('Protocole indisponible — bloqueurs décisionnels à revoir')).toBeTruthy();
    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/praticien/cockpit?idPatient=PAT_TEST&milestone=T0');
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toMatchObject({
      idPatient: 'PAT_TEST', milestone: 'T0', includedResponseIds: ['R-IN'], proposalHash: 'hash-proposal',
    });
  });

  it('recharge automatiquement une proposition périmée et redemande confirmation', async () => {
    const stale: CockpitRuntimeApiResponse = { status: 'unavailable', reason: 'proposal_stale', error: 'Périmée.' };
    const refreshed = { ...proposalResponse, proposalHash: 'hash-refreshed' } satisfies CockpitRuntimeApiResponse;
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => proposalResponse })
      .mockResolvedValueOnce({ ok: false, status: 409, json: async () => stale })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => refreshed });
    vi.stubGlobal('fetch', fetchMock);

    render(<ClinicalRuntimeSection idPatient="PAT_TEST" fixture={null} protocolDraft={null} onFixtureReviewed={vi.fn()} />);
    await screen.findByRole('button', { name: 'Confirmer l’épisode T0' });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer l’épisode T0' }));

    expect(await screen.findByText(/proposition a été rechargée/)).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Confirmer l’épisode T0' }) as HTMLButtonElement).disabled).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it.each([
    ['unauthenticated', 401, /Votre session a expiré/],
    ['patient_not_found', 404, /Patient introuvable/],
    ['exception', 500, /Erreur technique/],
  ] as const)('affiche l’état indisponible %s', async (reason, status, expected) => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status,
      json: async () => ({ status: 'unavailable', reason, error: 'Indisponible.' }),
    });
    vi.stubGlobal('fetch', fetchMock);
    render(
      <ClinicalRuntimeSection idPatient="PAT_TEST" fixture={null} protocolDraft={null} onFixtureReviewed={vi.fn()} />,
    );
    expect(await screen.findByText(expected)).toBeTruthy();
  });

  it('ne contacte jamais le runtime avec la fixture ergonomique', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    render(
      <ClinicalRuntimeSection
        idPatient="PAT_TEST"
        fixture={buildValidationErgoC1Fixture()}
        protocolDraft={null}
        onFixtureReviewed={vi.fn()}
      />,
    );
    await waitFor(() => expect(fetchMock).not.toHaveBeenCalled());
  });

  it('n’affiche l’Observatoire que lorsque le flag serveur est actif', async () => {
    const fixture = buildValidationErgoC1Fixture();
    const ready: CockpitRuntimeApiResponse = {
      status: 'ready', snapshot: fixture.snapshot, review: fixture.review, decisionCard: fixture.decisionCard,
    };
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ready });
    vi.stubGlobal('fetch', fetchMock);
    const { rerender } = render(
      <ClinicalRuntimeSection idPatient="PAT_TEST" fixture={null} protocolDraft={null} onFixtureReviewed={vi.fn()} />,
    );
    expect(screen.queryByRole('heading', { name: /Boussole alimentaire/ })).toBeNull();
    rerender(
      <C5FeatureProvider enabled>
        <ClinicalRuntimeSection idPatient="PAT_TEST" fixture={null} protocolDraft={null} onFixtureReviewed={vi.fn()} />
      </C5FeatureProvider>,
    );
    expect(await screen.findByRole('heading', { name: /Boussole alimentaire/ })).toBeTruthy();
  });
});
