// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MonEquilibreDetail } from './MonEquilibreDetail';

const REPONSE = {
  indiceGlobal: 60,
  momentum: null,
  trajectoire: [],
  besoins: [
    { id: 1, libellePatient: 'Sommeil', strate: 'CORPS', couverture: 80 },
    { id: 2, libellePatient: 'Digestion', strate: 'CORPS', couverture: 20 },
    { id: 3, libellePatient: 'Ancrage social', strate: 'ANCRAGE', couverture: null },
  ],
};

// Régression E13 : la correspondance point↔besoin n'était joignable qu'à la
// souris (onMouseEnter/onMouseLeave sur un <li> non focusable), et la
// couverture n'était encodée que par l'opacité de la couleur, sans équivalent
// texte. Les deux invariants concernés : pas de fonction critique au seul
// survol, pas d'état clinique porté par la seule couleur.
describe('MonEquilibreDetail — accessibilité de « Mes 12 besoins »', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('chaque besoin est un vrai bouton, joignable au clavier', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ json: () => Promise.resolve(REPONSE) }),
    );
    render(<MonEquilibreDetail idAssignation="ASS_1" onRetour={() => {}} />);

    await waitFor(() => expect(screen.getByText('Sommeil')).not.toBeNull());

    const bouton = screen.getByText('Sommeil').closest('button');
    expect(bouton).not.toBeNull();
    expect(bouton?.tagName).toBe('BUTTON');
  });

  it('porte un équivalent texte de la couverture, pas seulement l’opacité', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ json: () => Promise.resolve(REPONSE) }),
    );
    render(<MonEquilibreDetail idAssignation="ASS_1" onRetour={() => {}} />);

    await waitFor(() => expect(screen.getByText('Sommeil')).not.toBeNull());

    expect(screen.getByText('Bien couvert')).not.toBeNull(); // couverture 80
    expect(screen.getByText('Peu couvert')).not.toBeNull(); // couverture 20
    expect(screen.getByText('Pas encore de données')).not.toBeNull(); // couverture null
  });

  it('le focus (pas seulement le survol souris) met le besoin en évidence', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ json: () => Promise.resolve(REPONSE) }),
    );
    render(<MonEquilibreDetail idAssignation="ASS_1" onRetour={() => {}} />);

    await waitFor(() => expect(screen.getByText('Sommeil')).not.toBeNull());

    const bouton = screen.getByText('Sommeil').closest('button') as HTMLButtonElement;
    fireEvent.focus(bouton);
    expect(bouton.className).toContain('bg-primary/10');
  });
});
