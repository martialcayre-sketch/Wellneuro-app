// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { PanneauRail } from './PanneauRail';

afterEach(cleanup);

describe('PanneauRail', () => {
  it('déplie le panneau et affiche son complément quand il a quelque chose à dire', () => {
    render(
      <PanneauRail
        testId="panneau-essai"
        titre="File d’envoi"
        complement={<span>1 mail par patient</span>}
        vide={false}
        resumeVide="File vide"
      >
        <p>Sophie Nicola — 2 éléments</p>
      </PanneauRail>,
    );

    expect(screen.getByRole('heading', { name: 'File d’envoi' })).toBeTruthy();
    expect(screen.getByText('1 mail par patient')).toBeTruthy();
    expect(screen.getByText('Sophie Nicola — 2 éléments')).toBeTruthy();
    // Aucun dépliant : le panneau est ouvert, pas replié.
    expect(screen.getByTestId('panneau-essai').querySelector('details')).toBeNull();
    expect(screen.queryByText('File vide')).toBeNull();
  });

  it('replie le panneau vide sur une seule ligne — titre et état restent lisibles', () => {
    render(
      <PanneauRail testId="panneau-essai" titre="File d’envoi" vide resumeVide="File vide">
        <p>La file est vide — ajoutez des questionnaires depuis la Bibliothèque.</p>
      </PanneauRail>,
    );

    const panneau = screen.getByTestId('panneau-essai');
    const details = panneau.querySelector('details');
    expect(details).not.toBeNull();
    // Replié par défaut : le texte long ne coûte aucune hauteur tant qu'on ne
    // l'ouvre pas — mais il n'est pas retiré du document, rien n'est perdu.
    expect(details?.hasAttribute('open')).toBe(false);
    expect(screen.getByRole('heading', { name: 'File d’envoi' })).toBeTruthy();
    expect(screen.getByText('File vide')).toBeTruthy();
    expect(screen.getByText(/La file est vide/)).toBeTruthy();
  });

  it('garde le nom accessible du panneau quand il est replié', () => {
    render(
      <PanneauRail
        testId="panneau-essai"
        ariaLabel="File d’envoi des questionnaires"
        titre="File d’envoi"
        vide
        resumeVide="File vide"
      >
        <p>La file est vide.</p>
      </PanneauRail>,
    );

    expect(screen.getByLabelText('File d’envoi des questionnaires')).toBeTruthy();
  });
});
