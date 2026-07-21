// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { MonParcoursAccueil } from './MonParcoursAccueil';

/*
 * Garde-fous SP-SPI / LOT-01. Ce que ces tests protègent n'est pas la mise en
 * page mais des décisions actées : zéro score chiffré, une correction demandée
 * qui n'est jamais un bouton, et une reprise qui accueille au lieu de
 * reprocher.
 */
afterEach(cleanup);

describe('MonParcoursAccueil', () => {
  const maintenant = new Date('2026-07-21T12:00:00.000Z');
  const base = { token: 'TOK', prenom: 'Michel', derniereReponseLe: null, maintenant };

  it('met en avant une seule action, et la nomme', () => {
    render(
      <MonParcoursAccueil
        {...base}
        etape={{ kind: 'action', idAssignation: 'ASS1', cta: 'Commencer « Sommeil »' }}
      />,
    );
    const lien = screen.getByRole('link', { name: 'Commencer « Sommeil »' });
    expect(lien.getAttribute('href')).toBe('/portail/TOK/questionnaires/ASS1');
  });

  it('énonce une correction demandée sans en faire un appel à l’action', () => {
    render(
      <MonParcoursAccueil
        {...base}
        etape={{ kind: 'attente', texte: 'Votre demande de correction est en attente.' }}
      />,
    );
    expect(screen.getByText('Votre demande de correction est en attente.')).toBeTruthy();
    // Le patient ne peut rien faire tant que le praticien n'a pas déverrouillé.
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('distingue « tout transmis » de « rien assigné »', () => {
    const { unmount } = render(<MonParcoursAccueil {...base} etape={{ kind: 'stable' }} />);
    expect(screen.getByText(/transmis tout ce qui vous était demandé/i)).toBeTruthy();
    unmount();

    render(<MonParcoursAccueil {...base} etape={{ kind: 'vide' }} />);
    expect(screen.getByText(/Aucun questionnaire pour le moment/i)).toBeTruthy();
  });

  it('accueille une reprise longue sans reprocher ni décompter les jours', () => {
    render(
      <MonParcoursAccueil
        {...base}
        derniereReponseLe="2025-07-21T12:00:00.000Z"
        etape={{ kind: 'stable' }}
      />,
    );
    expect(screen.getByText(/environ 12 mois/i)).toBeTruthy();
    expect(screen.getByText(/à votre rythme/i)).toBeTruthy();
    expect(screen.getByText('Pour reprendre')).toBeTruthy();
    expect(screen.queryByText(/manqué|retard|devez/i)).toBeNull();
  });

  it('n’annonce pas de reprise à un patient actif', () => {
    render(
      <MonParcoursAccueil
        {...base}
        derniereReponseLe="2026-07-01T12:00:00.000Z"
        etape={{ kind: 'stable' }}
      />,
    );
    expect(screen.queryByText('Pour reprendre')).toBeNull();
    expect(screen.getByText('Votre étape du moment')).toBeTruthy();
  });

  it('n’affiche aucun chiffre de score ni pourcentage', () => {
    const { container } = render(
      <MonParcoursAccueil
        {...base}
        derniereReponseLe="2025-07-21T12:00:00.000Z"
        etape={{ kind: 'action', idAssignation: 'ASS1', cta: 'Commencer « Sommeil »' }}
      />,
    );
    // Le seul nombre tolérable sur cet écran est la durée d'absence en mois.
    expect(container.textContent).not.toMatch(/%/);
    expect(container.textContent).not.toMatch(/score/i);
  });
});
