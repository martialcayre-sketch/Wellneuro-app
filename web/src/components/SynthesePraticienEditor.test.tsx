// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { nouveauBrouillonPraticien } from '@/lib/synthese-praticien';
import { SynthesePraticienEditor } from './SynthesePraticienEditor';

afterEach(cleanup);

describe('SynthesePraticienEditor', () => {
  it('édite les textes et transforme les champs multilignes en listes', () => {
    const onChange = vi.fn();
    const onSave = vi.fn();
    const value = {
      ...nouveauBrouillonPraticien(),
      resume_praticien: 'Résumé initial',
      narratif_patient: 'Texte patient initial',
      points_de_vigilance: ['Fatigue'],
    };

    render(
      <SynthesePraticienEditor
        value={value}
        onChange={onChange}
        onSave={onSave}
      />,
    );

    fireEvent.change(screen.getByLabelText(/Points de vigilance/), {
      target: { value: 'Fatigue\nSommeil\n' },
    });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      points_de_vigilance: ['Fatigue', 'Sommeil', ''],
    }));

    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer le brouillon' }));
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('limite le brouillon à trois axes', () => {
    const onChange = vi.fn();
    render(
      <SynthesePraticienEditor
        value={{
          ...nouveauBrouillonPraticien(),
          axes_prioritaires: [
            { axe: 'A', niveau_priorite: 'faible', arguments: [], points_a_confirmer: [] },
            { axe: 'B', niveau_priorite: 'modere', arguments: [], points_a_confirmer: [] },
            { axe: 'C', niveau_priorite: 'eleve', arguments: [], points_a_confirmer: [] },
          ],
        }}
        onChange={onChange}
        onSave={() => {}}
      />,
    );

    expect((screen.getByRole('button', { name: 'Ajouter un axe prioritaire' }) as HTMLButtonElement).disabled).toBe(true);
  });
});
