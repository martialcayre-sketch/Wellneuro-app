// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PatientVolet } from './PatientVolet';

// PAT-7k (F5 a) : le volet habille un `<details>` natif sans le remplacer —
// le dépliage, le clavier et la restitution restent ceux du navigateur.
afterEach(cleanup);

const volet = (titre: string) => screen.getByText(titre).closest('details') as HTMLDetailsElement;

describe('PatientVolet', () => {
  it('reste un <details> natif, replié par défaut, dont le résumé porte le titre et un chevron décoratif', () => {
    render(<PatientVolet titre="Conditions">Corps</PatientVolet>);
    const el = volet('Conditions');
    expect(el.open).toBe(false);
    const resume = el.querySelector('summary') as HTMLElement;
    expect(resume.textContent).toBe('Conditions');
    expect(resume.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    expect(resume.className).toContain('min-h-12');
  });

  it('reprend l’ouverture initiale et se déplie au clic sur le résumé', () => {
    render(
      <>
        <PatientVolet titre="Ouvert" open>A</PatientVolet>
        <PatientVolet titre="Fermé">B</PatientVolet>
      </>,
    );
    expect(volet('Ouvert').open).toBe(true);
    const ferme = volet('Fermé');
    fireEvent.click(ferme.querySelector('summary') as HTMLElement);
    expect(ferme.open).toBe(true);
  });
});
