// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import {
  LABELS_ISSUE_TRACE,
  LONGUEUR_MAX_MOT_LIBRE,
  MESSAGE_SILENCE_UTILE,
} from '@/lib/food-observation';
import { FoodObservationJourney } from './FoodObservationJourney';
import {
  JA5_VALIDATION_DAILY_QUESTION,
  JA5_VALIDATION_EPISODE,
  JA5_VALIDATION_SILENCE_EPISODE,
} from './ja5ValidationFixture';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function choose(groupName: string, optionName: string) {
  const group = screen.getByRole('group', { name: groupName });
  fireEvent.click(within(group).getByRole('radio', { name: optionName }));
}

function completeSimpleTrace() {
  choose("L'occasion s'est-elle présentée ?", 'Oui');
  choose("C'était faisable ?", 'Oui');
  choose("Qu'est-ce qui a compté ?", LABELS_ISSUE_TRACE.fait);
}

describe('FoodObservationJourney — parcours JA5-02', () => {
  it('accepte une question courte sans réponse et confirme localement', () => {
    const onQuestionAnswered = vi.fn();
    render(
      <FoodObservationJourney
        episode={JA5_VALIDATION_EPISODE}
        question={JA5_VALIDATION_DAILY_QUESTION}
        onQuestionAnswered={onQuestionAnswered}
      />,
    );

    const answer = screen.getByRole('textbox', { name: 'Votre réponse' }) as HTMLInputElement;
    expect(answer.maxLength).toBe(80);
    fireEvent.click(screen.getByRole('button', { name: 'Noter et continuer' }));

    expect(onQuestionAnswered).toHaveBeenCalledWith({
      ...JA5_VALIDATION_DAILY_QUESTION,
      reponsePatient: undefined,
    });
    expect(screen.getByText(/Question du jour laissée sans réponse/)).not.toBeNull();
    expect(screen.getByText(/perdue au rechargement/)).not.toBeNull();
  });

  it('enchaîne occasion, faisabilité et issue puis efface les champs devenus sans objet', () => {
    const onTraceRecorded = vi.fn();
    render(
      <FoodObservationJourney
        episode={JA5_VALIDATION_EPISODE}
        question={JA5_VALIDATION_DAILY_QUESTION}
        onTraceRecorded={onTraceRecorded}
      />,
    );

    choose("L'occasion s'est-elle présentée ?", 'Oui');
    choose("C'était faisable ?", 'Oui');
    choose("Qu'est-ce qui a compté ?", LABELS_ISSUE_TRACE.partiel_empeche);
    fireEvent.change(screen.getByRole('combobox', { name: "Qu'est-ce qui a surtout compté ?" }), {
      target: { value: 'F8' },
    });
    const freeText = screen.getByRole('textbox', { name: 'Un mot si vous le souhaitez' }) as HTMLInputElement;
    expect(freeText.maxLength).toBe(LONGUEUR_MAX_MOT_LIBRE);
    fireEvent.change(freeText, { target: { value: 'Imprévu court' } });

    choose("L'occasion s'est-elle présentée ?", 'Non');
    expect(screen.queryByRole('group', { name: "C'était faisable ?" })).toBeNull();
    choose("Qu'est-ce qui a compté ?", LABELS_ISSUE_TRACE.fait);
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(screen.queryByRole('textbox', { name: 'Un mot si vous le souhaitez' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Noter cette trace' }));
    const trace = onTraceRecorded.mock.calls[0][0];
    expect(trace.occasionPresentee).toBe(false);
    expect(trace.faisable).toBeNull();
    expect(trace.issue).toBe('fait');
    expect(trace.frictionCode).toBeUndefined();
    expect(trace.motLibre).toBeUndefined();
  });

  it('propose les quatre issues et exige une friction fermée pour une issue empêchée', () => {
    render(<FoodObservationJourney episode={JA5_VALIDATION_EPISODE} question={JA5_VALIDATION_DAILY_QUESTION} />);
    choose("L'occasion s'est-elle présentée ?", 'Non');

    const issueGroup = screen.getByRole('group', { name: "Qu'est-ce qui a compté ?" });
    expect(within(issueGroup).getAllByRole('radio')).toHaveLength(4);
    for (const label of Object.values(LABELS_ISSUE_TRACE)) {
      expect(within(issueGroup).getByRole('radio', { name: label })).not.toBeNull();
    }

    choose("Qu'est-ce qui a compté ?", LABELS_ISSUE_TRACE.partiel_empeche);
    expect((screen.getByRole('button', { name: 'Noter cette trace' }) as HTMLButtonElement).disabled).toBe(true);
    const friction = screen.getByRole('combobox', { name: "Qu'est-ce qui a surtout compté ?" }) as HTMLSelectElement;
    expect(friction.options).toHaveLength(9);
    fireEvent.change(friction, { target: { value: 'F1' } });
    expect((screen.getByRole('button', { name: 'Noter cette trace' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('active librement un plan minimal de 1, 3 ou 7 jours sans justification', () => {
    const onMinimalPlanActivated = vi.fn();
    render(
      <FoodObservationJourney
        episode={JA5_VALIDATION_EPISODE}
        question={JA5_VALIDATION_DAILY_QUESTION}
        onMinimalPlanActivated={onMinimalPlanActivated}
      />,
    );

    for (const duration of [1, 3, 7]) {
      fireEvent.click(screen.getByRole('button', { name: `${duration} jour${duration > 1 ? 's' : ''}` }));
    }
    expect(onMinimalPlanActivated).toHaveBeenCalledTimes(3);
    expect(onMinimalPlanActivated.mock.calls.map(call => call[0].dureeJours)).toEqual([1, 3, 7]);
    expect(onMinimalPlanActivated.mock.calls.every(call => call[0].rationaleRequired === false)).toBe(true);
    expect(screen.queryByText(/justification \*/i)).toBeNull();
  });

  it('distingue une pause déclarée de l’absence de trace', () => {
    const onPauseDeclared = vi.fn();
    const onTraceRecorded = vi.fn();
    render(
      <FoodObservationJourney
        episode={JA5_VALIDATION_EPISODE}
        question={JA5_VALIDATION_DAILY_QUESTION}
        onPauseDeclared={onPauseDeclared}
        onTraceRecorded={onTraceRecorded}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Je n’ai pas pu cette semaine' }));
    expect(onPauseDeclared).toHaveBeenCalledOnce();
    expect(onTraceRecorded).not.toHaveBeenCalled();
    expect(onPauseDeclared.mock.calls[0][0]).toMatchObject({ episodeId: JA5_VALIDATION_EPISODE.episodeId });
  });

  it('conserve une solution comme repère intra-épisode sans la promouvoir', () => {
    const onSolutionRecorded = vi.fn();
    render(
      <FoodObservationJourney
        episode={JA5_VALIDATION_EPISODE}
        question={JA5_VALIDATION_DAILY_QUESTION}
        onSolutionRecorded={onSolutionRecorded}
      />,
    );

    expect(screen.getByText(/ne devient jamais automatiquement une recommandation/)).not.toBeNull();
    fireEvent.change(screen.getByRole('textbox', { name: 'Ma solution' }), { target: { value: 'Préparer la base le matin' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Dans quel contexte ?' }), { target: { value: 'Journée au cabinet' } });
    fireEvent.click(screen.getByRole('button', { name: 'Garder ce repère pour l’essai' }));

    expect(onSolutionRecorded).toHaveBeenCalledWith(expect.objectContaining({
      labelPatient: 'Préparer la base le matin',
      contexte: 'Journée au cabinet',
    }));
    expect(screen.queryByText(/recommandation active/i)).toBeNull();
  });

  it('affiche seulement le message neutre en régime silence', () => {
    render(<FoodObservationJourney episode={JA5_VALIDATION_SILENCE_EPISODE} question={JA5_VALIDATION_DAILY_QUESTION} />);
    expect(screen.getByText(MESSAGE_SILENCE_UTILE)).not.toBeNull();
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.queryByRole('radio')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('produit la même TrialTrace en saisie papier et indique la cible de 30 secondes', () => {
    const onTraceRecorded = vi.fn();
    render(
      <FoodObservationJourney
        episode={JA5_VALIDATION_EPISODE}
        question={JA5_VALIDATION_DAILY_QUESTION}
        mode="papier"
        onTraceRecorded={onTraceRecorded}
      />,
    );

    expect(screen.getByText(/moins de 30 secondes/)).not.toBeNull();
    completeSimpleTrace();
    fireEvent.click(screen.getByRole('button', { name: 'Saisir la trace papier' }));
    expect(onTraceRecorded.mock.calls[0][0]).toMatchObject({
      episodeId: JA5_VALIDATION_EPISODE.episodeId,
      occasionPresentee: true,
      faisable: true,
      issue: 'fait',
      frictionsVersion: 'frictions-v1',
    });
  });

  it('n’effectue aucun appel réseau ni écriture dans les stockages navigateur', () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const localSet = vi.spyOn(Storage.prototype, 'setItem');
    const localRemove = vi.spyOn(Storage.prototype, 'removeItem');
    render(<FoodObservationJourney episode={JA5_VALIDATION_EPISODE} question={JA5_VALIDATION_DAILY_QUESTION} />);

    completeSimpleTrace();
    fireEvent.click(screen.getByRole('button', { name: 'Noter cette trace' }));
    fireEvent.click(screen.getByRole('button', { name: '3 jours' }));

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(localSet).not.toHaveBeenCalled();
    expect(localRemove).not.toHaveBeenCalled();
  });
});
