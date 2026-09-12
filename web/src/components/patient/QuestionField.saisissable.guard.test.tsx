// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QUESTIONNAIRE_CATALOGUE } from '@/lib/questions';
import type { Question, QuestionnaireDef } from '@/lib/questionnaire-types';
import { QuestionField } from './QuestionField';
import { GenericQuestionnaire } from './GenericQuestionnaire';

/**
 * GARDE — tout item servi au patient porte un champ de saisie.
 *
 * `QuestionField` ne rend que les types qu'il connaît. Un item d'un type
 * inconnu ne produit AUCUN message d'erreur : il rend sa seule légende, le
 * patient lit la question et n'a rien à cocher, et `sectionAnswered` laisse
 * « Suivant » désactivé pour toujours — le questionnaire devient impassable
 * sans que rien ne le signale. C'est ce qui est arrivé à `Q_GAS_03`
 * (Échelle de Bristol), dont l'unique item porte `type: 'bristol'`.
 *
 * Le garde ne liste pas les types : il rend CHAQUE item du catalogue et exige
 * un contrôle de formulaire. Un type ajouté demain au catalogue sans branche
 * de rendu tombe ici, pas en production.
 */
describe('QuestionField — aucun item du catalogue ne reste sans champ', () => {
  afterEach(() => cleanup());

  const items: Array<{ idQuestionnaire: string; question: Question }> = [];
  for (const [idQuestionnaire, def] of Object.entries(
    QUESTIONNAIRE_CATALOGUE as unknown as Record<string, QuestionnaireDef>,
  )) {
    for (const section of def.sections ?? []) {
      for (const question of section.questions ?? []) items.push({ idQuestionnaire, question });
    }
  }

  it('parcourt un catalogue non vide', () => {
    expect(items.length).toBeGreaterThan(100);
  });

  it.each(items.map(i => [`${i.idQuestionnaire} / ${i.question.id}`, i.question] as const))(
    '%s est saisissable',
    (_nom, question) => {
      render(<QuestionField question={question} value="" onChange={vi.fn()} />);
      const champs = [
        ...screen.queryAllByRole('radio'),
        ...screen.queryAllByRole('combobox'),
        ...screen.queryAllByRole('spinbutton'),
        ...screen.queryAllByRole('textbox'),
        ...screen.queryAllByRole('checkbox'),
      ];
      expect(champs.length).toBeGreaterThan(0);
    },
  );
});

/**
 * Le symptôme, pas seulement sa cause : sur `Q_GAS_03` le patient voyait la
 * question « Type de selles habituel » et RIEN à cocher, « Voir le résumé »
 * désactivé sans message. Ce test rejoue l'écran entier.
 */
describe('Q_GAS_03 — Échelle de Bristol dans le formulaire patient', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('offre les sept types et débloque le passage au résumé', () => {
    vi.stubGlobal('scrollTo', vi.fn());
    localStorage.clear();
    render(
      <GenericQuestionnaire
        assignation={{
          idAssignation: 'ASS_TEST_GAS_03',
          idPatient: 'PAT_TEST',
          emailPatient: 'sophie.nicola@example.test',
          idQuestionnaire: 'Q_GAS_03',
          titre: 'Échelle de Bristol — Type de selles',
          dateLimite: null,
          notes: null,
          statut: 'envoye',
          consentement: 'donne',
          statutReponses: 'en_cours',
        }}
        questionnaire={QUESTIONNAIRE_CATALOGUE.Q_GAS_03 as unknown as QuestionnaireDef}
        email="sophie.nicola@example.test"
        onDone={vi.fn()}
      />,
    );

    const types = screen.getAllByRole('radio') as HTMLInputElement[];
    expect(types).toHaveLength(7);
    expect(types.map(t => t.value)).toEqual(['1', '2', '3', '4', '5', '6', '7']);

    const bouton = screen.getByRole('button', { name: 'Voir le résumé' }) as HTMLButtonElement;
    expect(bouton.disabled).toBe(true);
    fireEvent.click(types[3]); // Type 4 — selles normales
    expect(types[3].checked).toBe(true);
    expect((screen.getByRole('button', { name: 'Voir le résumé' }) as HTMLButtonElement).disabled).toBe(false);
  });
});
