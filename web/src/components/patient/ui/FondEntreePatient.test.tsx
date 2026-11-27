// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { FondEntreePatient } from './FondEntreePatient';

// Pose du fond de l'entrée (lot PAT-2 décor ; [[D-481]] §1 bis). Les règles
// du décor lui-même (aria-hidden, pointeur, impression, mouvement) sont
// épinglées par `components/ui/LienDecor.test.tsx` ; ce banc tient la pose :
// un seul fond, l'emplacement `entree-patient`, dans une zone positionnée
// qui porte aussi le contenu, et la frise hors de cette zone (Q1 (b) du
// prototype, 2026-11-26). La réception à l'écran est
// `e2e/portail-entree-decor.spec.ts`.

afterEach(cleanup);

function fondDe(container: HTMLElement) {
  return container.querySelectorAll('[data-lien-decor]');
}

describe('FondEntreePatient', () => {
  it('pose un seul fond, `entree-patient`, par LienDecor, hors de l’accessibilité', () => {
    const { container } = render(
      <FondEntreePatient>
        <p>Contenu de la carte</p>
      </FondEntreePatient>,
    );
    const fonds = fondDe(container);
    expect(fonds).toHaveLength(1);
    expect(fonds[0].getAttribute('data-lien-decor')).toBe('entree-patient');
    expect(fonds[0].getAttribute('aria-hidden')).toBe('true');
    expect(fonds[0].textContent).toBe('');
  });

  it('le fond remplit la zone qui porte le contenu : parent positionné et isolé', () => {
    const { container } = render(
      <FondEntreePatient>
        <p>Contenu de la carte</p>
      </FondEntreePatient>,
    );
    const zone = fondDe(container)[0].parentElement as HTMLElement;
    expect(zone.className).toMatch(/\brelative\b/);
    expect(zone.className).toMatch(/\bisolate\b/);
    expect(zone.contains(screen.getByText('Contenu de la carte'))).toBe(true);
  });

  it('la frise passée en `entete` est rendue avant la zone du fond, jamais dedans', () => {
    const { container } = render(
      <FondEntreePatient entete={<nav aria-label="Étapes">Frise</nav>}>
        <p>Contenu de la carte</p>
      </FondEntreePatient>,
    );
    const zone = fondDe(container)[0].parentElement as HTMLElement;
    const frise = screen.getByRole('navigation', { name: 'Étapes' });
    expect(zone.contains(frise)).toBe(false);
    // Ordre du document inchangé : la frise, puis la carte.
    expect(frise.compareDocumentPosition(zone) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(zone.contains(screen.getByText('Contenu de la carte'))).toBe(true);
  });

  it('sans `entete`, aucun bloc au-dessus de la zone du fond', () => {
    const { container } = render(
      <FondEntreePatient>
        <p>Contenu de la carte</p>
      </FondEntreePatient>,
    );
    const zone = fondDe(container)[0].parentElement as HTMLElement;
    expect(zone.previousElementSibling).toBeNull();
  });
});
