// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { focusPerdu, useFocusApresRelecture } from './useFocusApresRelecture';

// Le hook de PRA-6h (arbitrage 20261118-2228-d) et sa garde de PRA-6h2 :
// échec → bouton, succès → titre, sans titre → rien, focus posé ailleurs
// pendant la relecture → jamais repris.

type Lecture = () => Promise<boolean>;

/** Un panneau minimal : un titre (optionnel), un état d'échec et son bouton. */
function Panneau({ lecture, sansTitre = false }: { lecture: Lecture; sansTitre?: boolean }) {
  const [etat, setEtat] = useState<'echec' | 'chargement' | 'lu'>('echec');
  const { titreRef, boutonRef, relire } = useFocusApresRelecture();
  const charger = async () => {
    setEtat('chargement');
    setEtat((await lecture()) ? 'lu' : 'echec');
  };
  return (
    // Focusable par programme, comme le `<main id="contenu">` du tableau de bord.
    <section tabIndex={-1} aria-label="Conteneur">
      {!sansTitre && (
        <h3 ref={titreRef} tabIndex={-1}>
          Titre du panneau
        </h3>
      )}
      {etat === 'chargement' && <p role="status">Chargement…</p>}
      {etat === 'lu' && <p>Contenu relu</p>}
      {etat === 'echec' && (
        <button ref={boutonRef} type="button" onClick={() => void relire(charger)}>
          Réessayer
        </button>
      )}
      <input aria-label="Ailleurs" />
    </section>
  );
}

/** Une lecture que le banc résout à la main. */
function lectureDifferee() {
  let resoudre: (ok: boolean) => void = () => {};
  const lecture: Lecture = () => new Promise<boolean>(r => (resoudre = r));
  return { lecture, resoudre: (ok: boolean) => act(async () => resoudre(ok)) };
}

/** Un vrai clic pose le focus sur le bouton ; `fireEvent.click` non. */
function cliquerReessayer() {
  const bouton = screen.getByRole('button', { name: 'Réessayer' });
  bouton.focus();
  fireEvent.click(bouton);
}

describe('useFocusApresRelecture', () => {
  afterEach(cleanup);

  it('la relecture échoue encore : le focus revient au bouton, rendu de nouveau', async () => {
    const { lecture, resoudre } = lectureDifferee();
    render(<Panneau lecture={lecture} />);
    cliquerReessayer();
    // Le bouton s'est démonté : le focus est retombé sur la page.
    expect(screen.queryByRole('button', { name: 'Réessayer' })).toBeNull();
    expect(focusPerdu()).toBe(true);

    await resoudre(false);
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Réessayer' })));
  });

  it('la relecture réussit : le focus va au titre du panneau relu', async () => {
    const { lecture, resoudre } = lectureDifferee();
    render(<Panneau lecture={lecture} />);
    cliquerReessayer();
    await resoudre(true);
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Titre du panneau' })));
    expect(screen.getByText('Contenu relu')).toBeTruthy();
  });

  it('sans titre, une relecture réussie ne déplace pas le focus — aucun titre n’est créé', async () => {
    const { lecture, resoudre } = lectureDifferee();
    render(<Panneau lecture={lecture} sansTitre />);
    cliquerReessayer();
    await resoudre(true);
    await waitFor(() => expect(screen.getByText('Contenu relu')).toBeTruthy());
    expect(screen.queryByRole('heading')).toBeNull();
    expect(focusPerdu()).toBe(true);
  });

  it('WebKit : le clic laisse le focus au conteneur focusable qui englobe le bouton — il est rendu au titre', async () => {
    // Un clic WebKit ne donne pas le focus au bouton : il le pose sur l'ancêtre
    // focusable le plus proche (constaté en E2E iPhone 13, PRA-6h2).
    const { lecture, resoudre } = lectureDifferee();
    render(<Panneau lecture={lecture} />);
    const conteneur = screen.getByRole('region', { name: 'Conteneur' });
    conteneur.focus();
    fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }));
    expect(document.activeElement).toBe(conteneur);

    await resoudre(true);
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Titre du panneau' })));
  });

  it('un focus posé ailleurs pendant la relecture n’est pas repris, ni en réussite ni en échec', async () => {
    for (const ok of [true, false]) {
      const { lecture, resoudre } = lectureDifferee();
      const { unmount } = render(<Panneau lecture={lecture} />);
      cliquerReessayer();
      const ailleurs = screen.getByRole('textbox', { name: 'Ailleurs' });
      ailleurs.focus();

      await resoudre(ok);
      await waitFor(() => expect(screen.queryByRole('status')).toBeNull());
      expect(document.activeElement).toBe(ailleurs);
      unmount();
    }
  });
});
