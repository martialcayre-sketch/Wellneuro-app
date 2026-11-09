// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { Question } from '@/lib/questionnaire-types';
import { QuestionField } from './QuestionField';

/**
 * La légende d'un `fieldset` nomme le groupe, pas le champ qu'il contient : sans
 * lien explicite, un lecteur d'écran annonce « liste déroulante » ou « champ
 * numérique » sans la question. Les boutons radio ont, eux, leur propre libellé.
 */
describe('QuestionField — nom accessible du champ', () => {
  afterEach(() => cleanup());

  const options = [
    { v: 1, l: 'Oui' },
    { v: 0, l: 'Non' },
  ];

  it('nomme le select par le texte de la question', () => {
    const question = { id: 'q_select', texte: 'Question à choix', type: 'select', options } as Question;
    render(<QuestionField question={question} value="" onChange={vi.fn()} />);
    expect(screen.getByRole('combobox', { name: 'Question à choix' })).toBeTruthy();
  });

  it('nomme le champ numérique par le texte de la question', () => {
    const question = { id: 'q_nombre', texte: 'Question chiffrée', type: 'number', min: 0, max: 10 } as Question;
    render(<QuestionField question={question} value="" onChange={vi.fn()} />);
    expect(screen.getByRole('spinbutton', { name: 'Question chiffrée' })).toBeTruthy();
  });

  it('garde les noms distincts quand deux questions sont rendues ensemble', () => {
    const premiere = { id: 'q_a', texte: 'Première question', type: 'number' } as Question;
    const seconde = { id: 'q_b', texte: 'Seconde question', type: 'number' } as Question;
    render(
      <>
        <QuestionField question={premiere} value="" onChange={vi.fn()} />
        <QuestionField question={seconde} value="" onChange={vi.fn()} />
      </>,
    );
    expect(screen.getByRole('spinbutton', { name: 'Première question' })).toBeTruthy();
    expect(screen.getByRole('spinbutton', { name: 'Seconde question' })).toBeTruthy();
  });
});
