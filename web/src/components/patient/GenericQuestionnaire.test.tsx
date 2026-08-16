// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QUESTIONNAIRE_CATALOGUE } from '@/lib/questions';
import type { QuestionnaireDef } from '@/lib/questionnaire-types';
import { readQuestionnaireDraft, writeDraft, writeQuestionnaireDraft } from '@/lib/questionnaire-draft';
import { GenericQuestionnaire } from './GenericQuestionnaire';
import { Q_ALI_01_SIIN_57 } from '@/lib/questionnaires/alimentaire';

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

function remplirJusquAuResume(): void {
  for (let batchIndex = 0; batchIndex < 9; batchIndex += 1) {
    for (const group of screen.getAllByRole('group')) {
      fireEvent.click(within(group).getAllByRole('radio')[0]);
    }
    fireEvent.click(screen.getByRole('button', {
      name: batchIndex === 8 ? 'Voir le résumé' : 'Suivant →',
    }));
  }
}

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

    remplirJusquAuResume();
    const summaryTitle = screen.getByRole('heading', { name: 'Vérifiez votre questionnaire' });
    expect(document.activeElement).toBe(summaryTitle);
    fireEvent.click(screen.getByRole('button', { name: 'Transmettre au praticien' }));
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

  it('reprend la page sauvegardée quand les lots précédents sont complets', () => {
    writeQuestionnaireDraft(assignation.idAssignation, {
      version: 1,
      answers: Object.fromEntries(Array.from({ length: 7 }, (_, index) => [
        `SIGH_Q${String(index + 1).padStart(3, '0')}`,
        '1',
      ])),
      currentPage: 2,
    });

    render(
      <GenericQuestionnaire
        assignation={assignation}
        questionnaire={QUESTIONNAIRE_CATALOGUE.Q_NEU_03 as QuestionnaireDef}
        email={assignation.emailPatient}
        onDone={vi.fn()}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Questions 8 à 10 sur 25' })).not.toBeNull();
    expect(screen.getByText('7 réponses sur 25')).not.toBeNull();
  });

  it('revient au premier lot incomplet si la page sauvegardée le dépasse', () => {
    writeQuestionnaireDraft(assignation.idAssignation, {
      version: 1,
      answers: { SIGH_Q001: '1', SIGH_Q002: '1', SIGH_Q003: '1' },
      currentPage: 8,
    });

    render(
      <GenericQuestionnaire
        assignation={assignation}
        questionnaire={QUESTIONNAIRE_CATALOGUE.Q_NEU_03 as QuestionnaireDef}
        email={assignation.emailPatient}
        onDone={vi.fn()}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Questions 4 à 7 sur 25' })).not.toBeNull();
  });

  it('autosauvegarde la navigation et permet une correction ciblée depuis le résumé', async () => {
    render(
      <GenericQuestionnaire
        assignation={assignation}
        questionnaire={QUESTIONNAIRE_CATALOGUE.Q_NEU_03 as QuestionnaireDef}
        email={assignation.emailPatient}
        onDone={vi.fn()}
      />,
    );

    for (const group of screen.getAllByRole('group')) {
      fireEvent.click(within(group).getAllByRole('radio')[0]);
    }
    fireEvent.click(screen.getByRole('button', { name: 'Suivant →' }));
    await waitFor(() => expect(readQuestionnaireDraft(assignation.idAssignation)?.currentPage).toBe(1));

    cleanup();
    localStorage.clear();
    render(
      <GenericQuestionnaire
        assignation={assignation}
        questionnaire={QUESTIONNAIRE_CATALOGUE.Q_NEU_03 as QuestionnaireDef}
        email={assignation.emailPatient}
        onDone={vi.fn()}
      />,
    );
    remplirJusquAuResume();

    expect(screen.getAllByText('Complète')).toHaveLength(9);
    expect(screen.queryByText('Jamais')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Vérifier cette partie : Questions 8 à 10' }));
    expect(screen.getByRole('heading', { name: 'Questions 8 à 10 sur 25' })).not.toBeNull();

    for (let pageIndex = 2; pageIndex < 9; pageIndex += 1) {
      fireEvent.click(screen.getByRole('button', { name: pageIndex === 8 ? 'Voir le résumé' : 'Suivant →' }));
    }
    expect(screen.getByRole('heading', { name: 'Vérifiez votre questionnaire' })).not.toBeNull();
  });

  it('conserve le résumé et le brouillon après une erreur réseau puis permet une nouvelle tentative', async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ json: vi.fn().mockResolvedValue({ ok: true }) });
    const onDone = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    render(
      <GenericQuestionnaire
        assignation={assignation}
        questionnaire={QUESTIONNAIRE_CATALOGUE.Q_NEU_03 as QuestionnaireDef}
        email={assignation.emailPatient}
        onDone={onDone}
      />,
    );
    remplirJusquAuResume();

    fireEvent.click(screen.getByRole('button', { name: 'Transmettre au praticien' }));
    fireEvent.click(screen.getByRole('button', { name: 'Transmettre' }));
    await waitFor(() => expect(screen.getByText('Erreur réseau. Réessayez.')).not.toBeNull());
    expect(screen.getByRole('heading', { name: 'Vérifiez votre questionnaire' })).not.toBeNull();
    expect(readQuestionnaireDraft(assignation.idAssignation)?.answers).toHaveProperty('SIGH_Q025');

    fireEvent.click(screen.getByRole('button', { name: 'Transmettre au praticien' }));
    fireEvent.click(screen.getByRole('button', { name: 'Transmettre' }));
    await waitFor(() => expect(onDone).toHaveBeenCalledOnce());
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(readQuestionnaireDraft(assignation.idAssignation)).toBeNull();
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

  it('reprend aussi la page sauvegardée avec le renderer standard', () => {
    const standardQuestionnaire: QuestionnaireDef = {
      id: 'Q_TEST_STANDARD_RESUME',
      titre: 'Questionnaire standard avec reprise',
      sections: [
        {
          id: 'S1',
          titre: 'Première partie',
          questions: [{ id: 'Q1', texte: 'Premier choix', type: 'select', options: [{ v: 0, l: 'A' }] }],
        },
        {
          id: 'S2',
          titre: 'Deuxième partie',
          questions: [{ id: 'Q2', texte: 'Deuxième choix', type: 'select', options: [{ v: 0, l: 'B' }] }],
        },
      ],
    };
    const standardAssignation = {
      ...assignation,
      idAssignation: 'ASS_TEST_STANDARD_RESUME',
      idQuestionnaire: standardQuestionnaire.id,
    };
    writeQuestionnaireDraft(standardAssignation.idAssignation, {
      version: 1,
      answers: { Q1: '0' },
      currentPage: 1,
    });

    render(
      <GenericQuestionnaire
        assignation={standardAssignation}
        questionnaire={standardQuestionnaire}
        email={assignation.emailPatient}
        onDone={vi.fn()}
      />,
    );

    expect(screen.getByText('Deuxième partie')).not.toBeNull();
    expect(screen.getByText('50% complété')).not.toBeNull();
    expect(screen.getByRole('combobox')).not.toBeNull();
  });
});

// ── Saisie en grille (Enquête alimentaire SIIN, 57 items) ────────────────────
//
// Le point verrouillé ici n'est pas l'esthétique : c'est que les options
// restent de VRAIS `input[type=radio]`. Le parcours patient E2E remplit le
// questionnaire en cochant `form input[type="radio"]` ; des `<button>` stylés
// casseraient tout le parcours, et `Q_ALI_01` est dans le pack de base.
describe('GenericQuestionnaire — grille guided_sections', () => {
  const assignationAli = { ...assignation, idAssignation: 'ASS_TEST_ALI', idQuestionnaire: 'Q_ALI_01', titre: 'Enquête alimentaire SIIN' };

  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal('scrollTo', vi.fn());
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  function rendre(renderer?: 'guided_sections') {
    render(
      <GenericQuestionnaire
        assignation={assignationAli}
        questionnaire={Q_ALI_01_SIIN_57 as unknown as QuestionnaireDef}
        email={assignationAli.emailPatient}
        onDone={vi.fn()}
        renderer={renderer}
      />,
    );
  }

  it('rend les options en radios cochables, jamais en liste déroulante', () => {
    rendre('guided_sections');
    const groupes = screen.getAllByRole('group');
    expect(groupes.length).toBeGreaterThan(0);
    for (const groupe of groupes) {
      expect(within(groupe).getAllByRole('radio').length).toBeGreaterThan(1);
    }
    expect(screen.queryAllByRole('combobox')).toHaveLength(0);
  });

  it('une option cochée le reste — le contrat de saisie tient', () => {
    rendre('guided_sections');
    const premier = within(screen.getAllByRole('group')[0]).getAllByRole('radio')[1] as HTMLInputElement;
    fireEvent.click(premier);
    expect(premier.checked).toBe(true);
  });

  it('contrôle négatif — sans le renderer serveur, la même définition retombe en liste déroulante', () => {
    // Sans lui, rendre des radios inconditionnellement ferait passer le premier
    // test au vert quoi qu'il arrive, et l'on ne saurait pas que la bascule
    // vient bien du serveur.
    rendre(undefined);
    expect(screen.queryAllByRole('combobox').length).toBeGreaterThan(0);
  });
});

// Le bandeau « en consultation » est la SEULE protection au point de risque
// maximal ([[D-066]] §3, revue finding MAJ-1) : l'assignation d'un instrument
// de consultation est ouverte, aucun logiciel ne force la présence du
// praticien, et c'est ce texte — lui seul — qui dit au patient de ne pas
// remplir seul. Une protection assumée comme non contraignante doit au minimum
// être garantie PRÉSENTE : sans ce banc, les six lignes du composant se
// retirent sans qu'une ligne rougisse.
describe('GenericQuestionnaire — bandeau de passation en consultation', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal('scrollTo', vi.fn());
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("un instrument `administrationMode: 'clinicien'` affiche l'avertissement au patient", () => {
    render(
      <GenericQuestionnaire
        assignation={{ ...assignation, idQuestionnaire: 'Q_GEO_04', titre: 'MMSE' }}
        questionnaire={QUESTIONNAIRE_CATALOGUE.Q_GEO_04 as QuestionnaireDef}
        email={assignation.emailPatient}
        onDone={vi.fn()}
      />,
    );
    expect(screen.getByText(/en consultation, avec votre praticien/)).toBeTruthy();
    expect(screen.getByText(/attendez le rendez-vous/)).toBeTruthy();
  });

  it('un auto-questionnaire ordinaire ne l’affiche pas', () => {
    // Contre-épreuve : un bandeau servi partout dirait à chaque patient
    // d'attendre un rendez-vous — la garde doit discriminer, pas tapisser.
    render(
      <GenericQuestionnaire
        assignation={assignation}
        questionnaire={QUESTIONNAIRE_CATALOGUE.Q_NEU_03 as QuestionnaireDef}
        email={assignation.emailPatient}
        onDone={vi.fn()}
      />,
    );
    expect(screen.queryByText(/en consultation, avec votre praticien/)).toBeNull();
  });
});
