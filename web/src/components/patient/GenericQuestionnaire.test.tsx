// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QUESTIONNAIRE_CATALOGUE } from '@/lib/questions';
import type { QuestionnaireDef } from '@/lib/questionnaire-types';
import { writeDraft } from '@/lib/questionnaire-draft';
import { GenericQuestionnaire } from './GenericQuestionnaire';

const assignation = {
  idAssignation: 'ASS_TEST_NEU_03',
  idPatient: 'PAT_TEST',
  emailPatient: 'sophie.nicola@example.test',
  idQuestionnaire: 'Q_NEU_03',
  titre: 'SIGH-SAD-SA',
  dateLimite: null,
  notes: null,
  statut: 'envoye',
  consentement: 'donne',
  statutReponses: 'en_cours',
};

describe('GenericQuestionnaire — micro_batch Q_NEU_03', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal('scrollTo', vi.fn());
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('bloque un lot incomplet puis conserve les réponses en navigation arrière', () => {
    render(
      <GenericQuestionnaire
        assignation={assignation}
        questionnaire={QUESTIONNAIRE_CATALOGUE.Q_NEU_03 as QuestionnaireDef}
        email={assignation.emailPatient}
        onDone={vi.fn()}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Questions 1 à 3 sur 25' })).not.toBeNull();
    expect(screen.getByText('0 réponses sur 25')).not.toBeNull();
    const nextButton = screen.getByRole('button', { name: 'Suivant →' }) as HTMLButtonElement;
    expect(nextButton.disabled).toBe(true);
    fireEvent.submit(nextButton.closest('form')!);
    expect(screen.getByRole('heading', { name: 'Questions 1 à 3 sur 25' })).not.toBeNull();

    const groups = screen.getAllByRole('group');
    expect(groups).toHaveLength(3);
    for (const group of groups) {
      fireEvent.click(within(group).getAllByRole('radio')[0]);
    }

    expect(screen.getByText('3 réponses sur 25')).not.toBeNull();
    expect(nextButton.disabled).toBe(false);
    fireEvent.click(nextButton);

    const secondBatchTitle = screen.getByRole('heading', { name: 'Questions 4 à 7 sur 25' });
    expect(document.activeElement).toBe(secondBatchTitle);
    fireEvent.click(screen.getByRole('button', { name: '← Précédent' }));

    expect(screen.getByRole('heading', { name: 'Questions 1 à 3 sur 25' })).not.toBeNull();
    for (const group of screen.getAllByRole('group')) {
      expect((within(group).getAllByRole('radio')[0] as HTMLInputElement).checked).toBe(true);
    }
  });

  it('transmet le contrat historique avec uniquement les 25 réponses numériques', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue({ ok: true }),
    });
    vi.stubGlobal('fetch', fetchMock);

    render(
      <GenericQuestionnaire
        assignation={assignation}
        questionnaire={QUESTIONNAIRE_CATALOGUE.Q_NEU_03 as QuestionnaireDef}
        email={assignation.emailPatient}
        onDone={vi.fn()}
      />,
    );

    for (let batchIndex = 0; batchIndex < 9; batchIndex += 1) {
      for (const group of screen.getAllByRole('group')) {
        fireEvent.click(within(group).getAllByRole('radio')[0]);
      }
      fireEvent.click(screen.getByRole('button', {
        name: batchIndex === 8 ? 'Transmettre au praticien' : 'Suivant →',
      }));
    }

    fireEvent.click(screen.getByRole('button', { name: 'Transmettre' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    const [, request] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(request.body as string)).toEqual({
      idAssignation: assignation.idAssignation,
      idPatient: assignation.idPatient,
      email: assignation.emailPatient,
      idQuestionnaire: assignation.idQuestionnaire,
      answers: Object.fromEntries(
        Array.from({ length: 25 }, (_, index) => [`SIGH_Q${String(index + 1).padStart(3, '0')}`, 0]),
      ),
    });
  });

  it('reprend un brouillon préexistant sans perdre les réponses du premier lot', () => {
    writeDraft(assignation.idAssignation, {
      SIGH_Q001: '1',
      SIGH_Q002: '1',
      SIGH_Q003: '1',
    });

    render(
      <GenericQuestionnaire
        assignation={assignation}
        questionnaire={QUESTIONNAIRE_CATALOGUE.Q_NEU_03 as QuestionnaireDef}
        email={assignation.emailPatient}
        onDone={vi.fn()}
      />,
    );

    expect(screen.getByText('3 réponses sur 25')).not.toBeNull();
    for (const group of screen.getAllByRole('group')) {
      expect((within(group).getAllByRole('radio')[1] as HTMLInputElement).checked).toBe(true);
    }
    expect((screen.getByRole('button', { name: 'Suivant →' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('conserve le renderer standard pour un questionnaire non pilote', () => {
    const standardQuestionnaire: QuestionnaireDef = {
      id: 'Q_TEST_STANDARD',
      titre: 'Questionnaire standard fictif',
      sections: [{
        id: 'S1',
        titre: 'Section standard',
        questions: [
          {
            id: 'Q1',
            texte: 'Choix standard',
            type: 'select',
            options: [{ v: 0, l: 'Option A' }, { v: 1, l: 'Option B' }],
          },
        ],
      }],
    };

    render(
      <GenericQuestionnaire
        assignation={{ ...assignation, idAssignation: 'ASS_TEST_STANDARD', idQuestionnaire: standardQuestionnaire.id }}
        questionnaire={standardQuestionnaire}
        email={assignation.emailPatient}
        onDone={vi.fn()}
      />,
    );

    expect(screen.getByRole('combobox')).not.toBeNull();
    expect(screen.queryByRole('radio')).toBeNull();
    expect(screen.queryByRole('heading', { name: /Questions .* sur/ })).toBeNull();
    expect(screen.getByText('0% complété')).not.toBeNull();
  });
});
