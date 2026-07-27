// @vitest-environment jsdom

import { useState } from 'react';
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

  it('recherche puis remplace une occurrence dans le texte destiné au patient', () => {
    const onChange = vi.fn();
    const value = {
      ...nouveauBrouillonPraticien(),
      resume_praticien: 'Résumé initial',
      narratif_patient: 'Le sommeil est perturbé. Le sommeil reste une priorité.',
    };

    render(
      <SynthesePraticienEditor value={value} onChange={onChange} onSave={() => {}} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Rechercher / remplacer' }));
    fireEvent.change(screen.getByLabelText('Rechercher un mot'), { target: { value: 'sommeil' } });
    fireEvent.click(screen.getByRole('button', { name: 'Occurrence suivante' }));
    expect(screen.getByText('Occurrence 1 sur 2.')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Remplacer par'), { target: { value: 'repos' } });
    fireEvent.click(screen.getByRole('button', { name: 'Remplacer' }));

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      narratif_patient: 'Le repos est perturbé. Le sommeil reste une priorité.',
    }));
  });

  it('remplace toutes les occurrences en une fois', () => {
    const onChange = vi.fn();
    const value = {
      ...nouveauBrouillonPraticien(),
      resume_praticien: 'Résumé initial',
      narratif_patient: 'Le sommeil est perturbé. Le sommeil reste une priorité.',
    };

    render(
      <SynthesePraticienEditor value={value} onChange={onChange} onSave={() => {}} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Rechercher / remplacer' }));
    fireEvent.change(screen.getByLabelText('Rechercher un mot'), { target: { value: 'sommeil' } });
    fireEvent.change(screen.getByLabelText('Remplacer par'), { target: { value: 'repos' } });
    fireEvent.click(screen.getByRole('button', { name: 'Remplacer tout' }));

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      narratif_patient: 'Le repos est perturbé. Le repos reste une priorité.',
    }));
    expect(screen.getByText('2 occurrence(s) remplacée(s).')).toBeTruthy();
  });

  it('signale l’absence d’occurrence sans modifier le texte', () => {
    const onChange = vi.fn();
    const value = {
      ...nouveauBrouillonPraticien(),
      resume_praticien: 'Résumé initial',
      narratif_patient: 'Texte patient initial',
    };

    render(
      <SynthesePraticienEditor value={value} onChange={onChange} onSave={() => {}} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Rechercher / remplacer' }));
    fireEvent.change(screen.getByLabelText('Rechercher un mot'), { target: { value: 'introuvable' } });
    fireEvent.click(screen.getByRole('button', { name: 'Occurrence suivante' }));

    expect(screen.getByText('Aucune occurrence trouvée.')).toBeTruthy();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('ignore une occurrence mémorisée devenue obsolète après une frappe manuelle', () => {
    function Wrapper() {
      const [value, setValue] = useState({
        ...nouveauBrouillonPraticien(),
        resume_praticien: 'Résumé initial',
        narratif_patient: 'Le sommeil est perturbé.',
      });
      return <SynthesePraticienEditor value={value} onChange={setValue} onSave={() => {}} />;
    }

    render(<Wrapper />);

    fireEvent.click(screen.getByRole('button', { name: 'Rechercher / remplacer' }));
    fireEvent.change(screen.getByLabelText('Rechercher un mot'), { target: { value: 'sommeil' } });
    fireEvent.click(screen.getByRole('button', { name: 'Occurrence suivante' }));
    expect(screen.getByText('Occurrence 1 sur 1.')).toBeTruthy();

    // Frappe manuelle qui décale le texte : l'occurrence mémorisée par le clic
    // précédent ne désigne plus « sommeil » aux mêmes indices.
    fireEvent.change(screen.getByLabelText('Texte destiné au patient'), {
      target: { value: 'Nouveau départ. Le sommeil reste perturbé.' },
    });

    fireEvent.change(screen.getByLabelText('Remplacer par'), { target: { value: 'repos' } });
    fireEvent.click(screen.getByRole('button', { name: 'Remplacer' }));

    const textarea = screen.getByLabelText('Texte destiné au patient') as HTMLTextAreaElement;
    expect(textarea.value).toBe('Nouveau départ. Le repos reste perturbé.');
  });
});
