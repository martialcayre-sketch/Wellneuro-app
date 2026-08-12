// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CockpitRuntimeApiResponse } from '@/app/api/praticien/cockpit/route';
import type { AbstentionAssessment, ProposedAssessmentEpisode } from '@/lib/clinical-engine/types';
import type { PlainteDominante } from '@/lib/clinical-engine/chaineC1';
import type { PreconditionsT0 } from '@/lib/clinical-engine/preconditionsT0';
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

// Checklist minimale : tout est satisfait sauf ce que le cas décrit.
function preconditions(surcharge: Partial<PreconditionsT0> = {}): PreconditionsT0 {
  return {
    dures: [{ id: 'rideau_t0', libelle: 'Premier rideau renseigné et cotable', satisfaite: true, detail: null }],
    souples: [],
    bloquant: false,
    contournementsRequis: [],
    ...surcharge,
  };
}

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

    expect(onConfirm).toHaveBeenCalledWith(['R-IN', 'R-OUT'], []);
    expect(screen.queryByText(/scoresJson/)).toBeNull();
  });

  // REMPLACE « exige aussi une confirmation explicite pour un épisode vide ».
  // Ce banc encodait le comportement que [[D-052]] supprime : le panneau
  // invitait à confirmer un dossier vide, et rien côté API ne s'y opposait.
  it('une condition dure non remplie interdit la confirmation', () => {
    const onConfirm = vi.fn();
    render(
      <EpisodeConfirmationPanel
        proposal={proposal}
        preconditions={preconditions({
          dures: [{
            id: 'rideau_t0', libelle: 'Premier rideau renseigné et cotable',
            satisfaite: false, detail: 'Premier rideau incomplet — non renseignés : Q_MOD_03, Q_MOD_01.',
          }],
          bloquant: true,
        })}
        submitting={false}
        onConfirm={onConfirm}
      />,
    );

    expect(screen.getByText(/Premier rideau incomplet/)).toBeTruthy();
    const bouton = screen.getByRole('button', { name: 'Confirmer l’épisode T0' }) as HTMLButtonElement;
    expect(bouton.disabled).toBe(true);
    fireEvent.click(bouton);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('une condition souple se contourne, mais jamais sans motif', () => {
    const onConfirm = vi.fn();
    render(
      <EpisodeConfirmationPanel
        proposal={proposal}
        preconditions={preconditions({
          souples: [{
            id: 'contradictions_ouvertes', libelle: 'Aucune contradiction ouverte',
            satisfaite: false, detail: '2 contradictions ouvertes sur ce dossier.',
          }],
          contournementsRequis: ['contradictions_ouvertes'],
        })}
        submitting={false}
        onConfirm={onConfirm}
      />,
    );

    const bouton = screen.getByRole('button', { name: 'Confirmer l’épisode T0' }) as HTMLButtonElement;
    expect(bouton.disabled).toBe(true);

    fireEvent.change(screen.getByPlaceholderText(/Pourquoi confirmer/), {
      target: { value: 'Discordance déjà reprise en entretien.' },
    });
    expect(bouton.disabled).toBe(false);
    fireEvent.click(bouton);
    expect(onConfirm).toHaveBeenCalledWith(
      ['R-IN'],
      [{ conditionId: 'contradictions_ouvertes', motif: 'Discordance déjà reprise en entretien.' }],
    );
  });

  it('nomme ce qui n’est pas requis pour un T0, plutôt que de le taire', () => {
    render(
      <EpisodeConfirmationPanel
        proposal={proposal}
        preconditions={preconditions()}
        submitting={false}
        onConfirm={vi.fn()}
      />,
    );
    expect(screen.getByText(/Q_SOM_09/)).toBeTruthy();
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
      // Table non signée : c'est la réponse que la production sert aujourd'hui.
      contradictions: [],
      plainteDominante: null,
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
      status: 'ready',
      snapshot: fixture.snapshot,
      review: fixture.review,
      decisionCard: fixture.decisionCard,
      contradictions: [],
      plainteDominante: null,
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

// LE CÂBLAGE DE BOUT EN BOUT — [[D-050]].
//
// La capacité d'affichage existait depuis l'étape 5 ; aucun site d'appel ne la
// nourrissait, et le critère de sortie du LOT-01 n'était donc pas tenu. Ce banc
// tient le fil entier : ce que la route rend arrive à l'écran. Les bancs de
// `MissingDataPanel.test.tsx` gardent le rendu lui-même ; celui-ci garde la
// LIAISON, qui se coupe sans bruit — un `contradictions={[]}` codé en dur
// laisserait tous les autres bancs verts.
describe('ClinicalRuntimeSection — les constats déterministes atteignent l’écran', () => {
  it('un constat rendu par la route est affiché dans le panneau', async () => {
    const fixture = buildValidationErgoC1Fixture();
    const ready: CockpitRuntimeApiResponse = {
      status: 'ready',
      snapshot: fixture.snapshot,
      review: fixture.review,
      decisionCard: fixture.decisionCard,
      contradictions: [{
        id: 'C-STR',
        description: 'Une contradiction que le praticien doit voir.',
        actionSuggeree: 'Clarifier en entretien avant toute conclusion.',
        hypotheses: ['Une charge de stress que les échelles ne captent pas.'],
        limitations: ['Un questionnaire isolé ne suffit pas à conclure.'],
        passations: [
          { idQuestionnaire: 'Q_MOD_01', date: '2026-03-12', dateLisible: '12/03/2026' },
          { idQuestionnaire: 'Q_STR_04', date: '2026-08-10', dateLisible: '10/08/2026' },
        ],
        ecartJours: 151,
        claims: [{ claimId: 'WN-CL-0238-002', versionClaim: 'v1.0' }],
        importance: 'useful_not_urgent',
        resolution: { statut: 'ouverte' },
        regleId: 'C-STR',
      }],
      plainteDominante: null,
    };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => proposalResponse })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ready });
    vi.stubGlobal('fetch', fetchMock);

    render(<ClinicalRuntimeSection idPatient="PAT_TEST" fixture={null} protocolDraft={null} onFixtureReviewed={vi.fn()} />);
    await screen.findByRole('heading', { name: 'Confirmation de l’épisode T0' });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer l’épisode T0' }));

    // Le niveau 1 du panneau, sans dépliage : la description doit se lire
    // d'emblée — une contradiction que le praticien doit cliquer pour voir est
    // une contradiction qu'il peut manquer.
    await screen.findByText('Une contradiction que le praticien doit voir.');
  });
});

// LE CANAL PLAINTE ET L'ÉTAT RÉEL DE LA DÉCISION — [[D-054]].
//
// Le bandeau annonçait « Décision suspendue : l'abstention clinique n'est pas
// encore évaluée » QUEL QUE SOIT l'état réel : il devenait faux le jour où
// l'abstention est évaluée, et rien ne l'aurait dit. Ce banc tient les trois
// positions, et l'ordre d'affichage — la plainte AVANT l'agrégat, sans quoi un
// score global honorable recouvre une plainte à 9/10.
describe('ClinicalRuntimeSection — plainte du patient et état de la décision', () => {
  function reponsePrete(
    abstention: AbstentionAssessment,
    plainteDominante: PlainteDominante | null,
  ): CockpitRuntimeApiResponse {
    const fixture = buildValidationErgoC1Fixture();
    return {
      status: 'ready',
      snapshot: {
        ...fixture.snapshot,
        patientContext: { ...fixture.snapshot.patientContext, priorityGoal: 'Retrouver un confort digestif' },
      },
      review: { ...fixture.review, abstention },
      decisionCard: { ...fixture.decisionCard, abstention },
      contradictions: [],
      plainteDominante,
    };
  }

  async function afficher(reponse: CockpitRuntimeApiResponse) {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => proposalResponse })
      .mockResolvedValue({ ok: true, status: 200, json: async () => reponse });
    vi.stubGlobal('fetch', fetchMock);
    render(<ClinicalRuntimeSection idPatient="PAT_TEST" fixture={null} protocolDraft={null} onFixtureReviewed={vi.fn()} />);
    await screen.findByRole('heading', { name: 'Confirmation de l’épisode T0' });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer l’épisode T0' }));
  }

  it('affiche la plainte dominante et l’objectif prioritaire en tête, avant la décision', async () => {
    await afficher(reponsePrete(
      { status: 'not_required', ruleIds: ['PRIO-PON-01'], limitations: [] },
      { domaine: 'surpoids', libelle: 'Surpoids', valeur: 9, bande: 'Intensité très élevée' },
    ));

    const panneau = await screen.findByRole('region', { name: 'Plainte et objectif du patient' });
    expect(panneau.textContent).toContain('Surpoids — 9/10 (Intensité très élevée)');
    expect(panneau.textContent).toContain('Retrouver un confort digestif');

    // EN TÊTE, et pas seulement « présent » : la position est ce que le lot
    // demande, et un panneau juste sous l'agrégat serait vert sans elle.
    const bandeau = screen.getByText(/Abstention clinique évaluée/);
    expect(panneau.compareDocumentPosition(bandeau) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('dit l’état réel de l’abstention, et non une phrase figée', async () => {
    await afficher(reponsePrete(
      { status: 'required', ruleIds: ['PRIO-PON-01'], limitations: [] },
      { domaine: 'digestion', libelle: 'Digestion', valeur: 8, bande: 'Intensité élevée' },
    ));
    expect(await screen.findByText(/l’abstention clinique est requise/)).toBeTruthy();
    expect(screen.queryByText(/n’est pas encore évaluée/)).toBeNull();
  });

  it('conserve le message d’origine tant que l’abstention n’est pas évaluée', async () => {
    await afficher(reponsePrete(
      { status: 'not_evaluated', ruleIds: [], limitations: ['Règles non validées.'] },
      null,
    ));
    expect(await screen.findByText(/n’est pas encore évaluée/)).toBeTruthy();
    // La plainte est absente, l'objectif ne l'est pas : le panneau reste utile.
    const panneau = screen.getByRole('region', { name: 'Plainte et objectif du patient' });
    expect(panneau.textContent).toContain('Non renseignée');
  });
});
