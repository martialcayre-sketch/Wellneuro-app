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

// Depuis le LOT-07, le cockpit lit la TRAJECTOIRE avant de demander une
// proposition : le jalon n'est plus codé en dur, il s'en dérive. Les mocks
// ordonnés d'avant (`mockResolvedValueOnce` en cascade) décalaient donc d'un
// cran. Ils répondent désormais PAR URL — plus robuste, et indifférent à
// l'ordre comme au nombre d'appels.
type ReponseMock = { ok: boolean; status: number; json: () => Promise<unknown> };
const rep = (payload: unknown, ok = true, status = 200): ReponseMock => ({
  ok, status, json: async () => payload,
});

function fetchParRoute(routes: {
  trajectoire?: ReponseMock;
  cockpitGet?: ReponseMock[];
  cockpitPost?: ReponseMock[];
}) {
  const get = [...(routes.cockpitGet ?? [])];
  const post = [...(routes.cockpitPost ?? [])];
  return vi.fn(async (url: string, init?: { method?: string; body?: string }) => {
    if (String(url).includes('/api/praticien/trajectoire')) {
      return routes.trajectoire ?? rep({ ok: true, trajectoire: null });
    }
    if (init?.method === 'POST') return post.shift() ?? rep({}, false, 500);
    return get.shift() ?? rep({}, false, 500);
  });
}

/** Toutes les URLs de GET cockpit, dans l'ordre d'appel. */
function urlsCockpit(mock: { mock: { calls: unknown[][] } }): string[] {
  return mock.mock.calls
    .map(appel => String(appel[0]))
    .filter(url => url.includes('/api/praticien/cockpit'));
}

/** La première d'entre elles. */
function urlCockpit(mock: { mock: { calls: unknown[][] } }): string | undefined {
  return urlsCockpit(mock)[0];
}

/** Le corps du POST cockpit, quel que soit son rang. */
function corpsPoste(mock: { mock: { calls: unknown[][] } }): Record<string, unknown> | null {
  const appel = mock.mock.calls.find(
    candidat => (candidat[1] as { method?: string } | undefined)?.method === 'POST',
  );
  const corps = (appel?.[1] as { body?: string } | undefined)?.body;
  return corps ? (JSON.parse(corps) as Record<string, unknown>) : null;
}

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
      // Alliance 6.0-B, LOT-03 : le SHA voyage à côté de la carte, jamais dedans.
      perimetreSigne: null,
      canalPlainte: 'Q_MOD_03',
    };
    const fetchMock = fetchParRoute({
      cockpitGet: [rep(proposalResponse)],
      cockpitPost: [rep(ready)],
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<ClinicalRuntimeSection idPatient="PAT_TEST" fixture={null} protocolDraft={null} onFixtureReviewed={vi.fn()} />);
    await screen.findByRole('heading', { name: 'Confirmation de l’épisode T0' });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer l’épisode T0' }));

    await screen.findByText(/Épisode T0 confirmé/);
    expect(screen.getByText('Aucune priorité proposée')).toBeTruthy();
    expect(screen.getByText('Protocole indisponible — bloqueurs décisionnels à revoir')).toBeTruthy();
    expect(urlCockpit(fetchMock)).toBe('/api/praticien/cockpit?idPatient=PAT_TEST&milestone=T0');
    expect(corpsPoste(fetchMock)).toMatchObject({
      idPatient: 'PAT_TEST', milestone: 'T0', includedResponseIds: ['R-IN'], proposalHash: 'hash-proposal',
    });
  });

  it('recharge automatiquement une proposition périmée et redemande confirmation', async () => {
    const stale: CockpitRuntimeApiResponse = { status: 'unavailable', reason: 'proposal_stale', error: 'Périmée.' };
    const refreshed = { ...proposalResponse, proposalHash: 'hash-refreshed' } satisfies CockpitRuntimeApiResponse;
    const fetchMock = fetchParRoute({
      cockpitGet: [rep(proposalResponse), rep(refreshed)],
      cockpitPost: [rep(stale, false, 409)],
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<ClinicalRuntimeSection idPatient="PAT_TEST" fixture={null} protocolDraft={null} onFixtureReviewed={vi.fn()} />);
    await screen.findByRole('button', { name: 'Confirmer l’épisode T0' });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer l’épisode T0' }));

    expect(await screen.findByText(/proposition a été rechargée/)).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Confirmer l’épisode T0' }) as HTMLButtonElement).disabled).toBe(false);
    // Trajectoire + GET initial + POST périmé + GET rechargé.
    expect(fetchMock).toHaveBeenCalledTimes(4);
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
      // Alliance 6.0-B, LOT-03 : le SHA voyage à côté de la carte, jamais dedans.
      perimetreSigne: null,
      canalPlainte: 'Q_MOD_03',
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
        forme: 'DISCORDANCE' as const,
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
      // Alliance 6.0-B, LOT-03 : le SHA voyage à côté de la carte, jamais dedans.
      perimetreSigne: null,
      canalPlainte: 'Q_MOD_03',
    };
    const fetchMock = fetchParRoute({
      cockpitGet: [rep(proposalResponse)],
      cockpitPost: [rep(ready)],
    });
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
      // Alliance 6.0-B, LOT-03 : le SHA voyage à côté de la carte, jamais dedans.
      perimetreSigne: null,
      canalPlainte: 'Q_MOD_03',
    };
  }

  async function afficher(reponse: CockpitRuntimeApiResponse) {
    const fetchMock = fetchParRoute({
      cockpitGet: [rep(proposalResponse)],
      cockpitPost: [rep(reponse)],
    });
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

  // Proposition J21 telle que la route la rendrait : même forme que le T0,
  // jalon et hash propres. Le panneau doit NOMMER ce jalon (revue LOT-07, M2).
  const propositionJ21: CockpitRuntimeApiResponse = {
    status: 'proposal_required',
    proposal: { ...proposal, assessmentEpisodeId: 'episode-J21', milestone: 'J21' },
    proposalHash: 'hash-J21',
  };

  function trajectoireT0ConfirmeIlYA(jours: number) {
    const dateT0 = new Date(Date.now() - jours * 24 * 60 * 60 * 1000).toISOString();
    return rep({
      ok: true,
      trajectoire: {
        index: [{ milestone: 'T0', date: dateT0, cycleId: 'cycle-1' }],
        cycles: [{
          cycleId: 'cycle-1', dateT0, versionScore: 'v15', jalons: [], momentum: null,
          momentumParBesoin: [],
        }],
        comparaison: { disponible: false, raison: 'un_seul_cycle' },
      },
    });
  }

  it('demande le J21 quand sa fenêtre est ouverte, et le panneau NOMME le jalon', async () => {
    // LE COMPORTEMENT NEUF DU LOT-07. Avant, `milestone=T0` était codé en dur :
    // J21, J42 et J90 étaient inatteignables depuis l'interface alors que le
    // back les acceptait déjà.
    const fetchMock = fetchParRoute({
      trajectoire: trajectoireT0ConfirmeIlYA(21),
      cockpitGet: [rep(proposalResponse), rep(propositionJ21)],
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<ClinicalRuntimeSection idPatient="PAT_TEST" fixture={null} protocolDraft={null} onFixtureReviewed={vi.fn()} />);
    // Le T0 part d'abord — c'est le plancher, la trajectoire ne doit jamais
    // retarder la proposition. Le J21 suit dès qu'elle a répondu.
    await waitFor(() => expect(urlsCockpit(fetchMock).some(url => url.includes('milestone=J21'))).toBe(true));
    expect(urlCockpit(fetchMock)).toContain('milestone=T0');
    // Le panneau dit « J21 » partout où il disait « T0 » en dur (M2) : un
    // praticien qui confirme un J21 ne doit lire T0 nulle part.
    await screen.findByRole('heading', { name: 'Confirmation de l’épisode J21' });
    expect(screen.queryByRole('button', { name: 'Confirmer l’épisode T0' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Confirmer l’épisode J21' })).toBeTruthy();
  });

  it('le POST porte le jalon et le hash de la proposition AFFICHÉE', async () => {
    const fixture = buildValidationErgoC1Fixture();
    const confirme: CockpitRuntimeApiResponse = {
      status: 'ready',
      snapshot: fixture.snapshot,
      review: fixture.review,
      decisionCard: fixture.decisionCard,
      contradictions: [],
      plainteDominante: null,
      // Alliance 6.0-B, LOT-03 : le SHA voyage à côté de la carte, jamais dedans.
      perimetreSigne: null,
      canalPlainte: 'Q_MOD_03',
    };
    const fetchMock = fetchParRoute({
      trajectoire: trajectoireT0ConfirmeIlYA(21),
      cockpitGet: [rep(proposalResponse), rep(propositionJ21)],
      cockpitPost: [rep(confirme)],
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<ClinicalRuntimeSection idPatient="PAT_TEST" fixture={null} protocolDraft={null} onFixtureReviewed={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Confirmer l’épisode J21' }));
    await waitFor(() => expect(corpsPoste(fetchMock)).not.toBeNull());
    expect(corpsPoste(fetchMock)).toMatchObject({ milestone: 'J21', proposalHash: 'hash-J21' });
  });

  it('hors fenêtre : le motif se dit ET aucun bouton de confirmation n’existe', async () => {
    // T0 confirmé il y a 31 jours : la fenêtre du J21 est fermée (29), celle du
    // J42 pas encore ouverte (34). Le GET rend `proposal_required` — la SEULE
    // forme que la route émette avec `unavailable`. Le banc précédent jouait un
    // `ready` que le GET ne rend jamais, et cette fabrication masquait le
    // défaut : le panneau de confirmation restait actif sous le message
    // « aucun jalon confirmable » (revue LOT-07, M1).
    const fetchMock = fetchParRoute({
      trajectoire: trajectoireT0ConfirmeIlYA(31),
      cockpitGet: [rep(proposalResponse)],
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<ClinicalRuntimeSection idPatient="PAT_TEST" fixture={null} protocolDraft={null} onFixtureReviewed={vi.fn()} />);
    // Le motif se dit : un cockpit muet se lirait comme une panne.
    expect(await screen.findByText(/s’ouvrira/)).toBeTruthy();
    // HORS FENÊTRE, RIEN N'EST PROPOSÉ — le panneau non plus, pas seulement
    // le message. Le T0 du plancher est resté chargé : il ne doit PAS être
    // confirmable.
    expect(screen.queryByRole('button', { name: /Confirmer l’épisode/ })).toBeNull();
    // Et AUCUN jalon hors fenêtre n'est demandé : seul le T0 du plancher part.
    expect(urlsCockpit(fetchMock)).toEqual(['/api/praticien/cockpit?idPatient=PAT_TEST&milestone=T0']);
  });
});
