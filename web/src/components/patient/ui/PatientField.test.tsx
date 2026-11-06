// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { PatientField } from './PatientField';

afterEach(cleanup);

// WCAG 1.3.1 / 4.1.2 : le libellé du portail doit nommer son champ. Avant ce
// lot, le `<label>` était un frère sans `htmlFor` — un lecteur d'écran
// annonçait « zone de texte » sans dire laquelle.
describe('PatientField', () => {
  it('relie le libellé au premier champ natif, même suivi d’un compteur', () => {
    render(
      <PatientField label="Ce que je veux dire" requis>
        <textarea />
        <p>0 / 4000 caractères</p>
      </PatientField>,
    );
    expect(screen.getByLabelText('Ce que je veux dire *').tagName).toBe('TEXTAREA');
  });

  it('respecte un id déjà posé sur le champ', () => {
    render(
      <PatientField label="Votre adresse e-mail">
        <input id="email-patient" type="email" />
      </PatientField>,
    );
    expect(screen.getByLabelText('Votre adresse e-mail').id).toBe('email-patient');
  });

  it('erreur : aria-invalid et aria-describedby, sans perdre la description existante', () => {
    render(
      <PatientField label="Votre adresse e-mail" erreur="Adresse e-mail invalide.">
        <input type="email" aria-describedby="aide-email" />
      </PatientField>,
    );
    const champ = screen.getByLabelText('Votre adresse e-mail');
    expect(champ.getAttribute('aria-invalid')).toBe('true');
    const decrit = champ.getAttribute('aria-describedby')!.split(' ');
    expect(decrit[0]).toBe('aide-email');
    expect(document.getElementById(decrit[1])!.textContent).toBe('Adresse e-mail invalide.');
  });

  it('sans erreur : ni aria-invalid ni message', () => {
    render(
      <PatientField label="Motif de consultation">
        <select><option value="">Choisir…</option></select>
      </PatientField>,
    );
    expect(screen.getByLabelText('Motif de consultation').hasAttribute('aria-invalid')).toBe(false);
  });

  it('groupe : un fieldset nommé par sa legend', () => {
    render(
      <PatientField label="Qualité du sommeil" groupe>
        <button type="button" aria-pressed={false}>Bonne</button>
        <button type="button" aria-pressed>Mauvaise</button>
      </PatientField>,
    );
    expect(screen.getByRole('group', { name: 'Qualité du sommeil' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Mauvaise', pressed: true })).toBeTruthy();
  });
});
