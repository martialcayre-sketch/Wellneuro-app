// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { MESSAGE_DEMANDE_ENVOYEE } from '@/lib/portail/lienMagique';
import { DemandeLienForm } from './DemandeLienForm';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function reponseServeur(corps: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ json: () => Promise.resolve(corps) } as Response),
  );
}

async function soumettre(email = 'sophie.nicola@exemple.fr') {
  render(<DemandeLienForm />);
  fireEvent.change(screen.getByRole('textbox'), { target: { value: email } });
  fireEvent.click(screen.getByRole('button', { name: 'Recevoir un nouveau lien' }));
}

describe('DemandeLienForm', () => {
  // Le lot ajoute un recours à `MESSAGE_DEMANDE_ENVOYEE` parce que la route
  // répond « envoyé » même quand l'envoi a échoué. Épingler la constante ne
  // prouvait pas que la personne la LIT : l'écran affiche ce que le serveur
  // renvoie, et c'est ce chemin-là qui porte le recours.
  it('la réponse du serveur est affichée telle quelle, recours compris', async () => {
    reponseServeur({ ok: true, message: MESSAGE_DEMANDE_ENVOYEE });
    await soumettre();
    await waitFor(() => {
      expect(screen.getByText(MESSAGE_DEMANDE_ENVOYEE)).toBeTruthy();
    });
    expect(screen.getByText(/courriers indésirables/)).toBeTruthy();
    expect(screen.getByText(/praticien/)).toBeTruthy();
  });

  it('le formulaire disparaît après une demande — le renvoyer épuiserait le plafond', async () => {
    reponseServeur({ ok: true, message: MESSAGE_DEMANDE_ENVOYEE });
    await soumettre();
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Recevoir un nouveau lien' })).toBeNull();
    });
  });

  // Le formulaire disparaît, et le bouton qui avait le focus avec lui : sans
  // région déjà présente ni transfert, un lecteur d'écran n'entend rien.
  it('le succès s’annonce dans une région déjà présente, et le focus s’y pose', async () => {
    reponseServeur({ ok: true, message: MESSAGE_DEMANDE_ENVOYEE });
    render(<DemandeLienForm />);
    const region = screen.getByRole('status');
    expect(region.textContent).toBe('');

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'sophie.nicola@exemple.fr' } });
    fireEvent.click(screen.getByRole('button', { name: 'Recevoir un nouveau lien' }));

    await waitFor(() => expect(region.textContent).toBe(MESSAGE_DEMANDE_ENVOYEE));
    expect(screen.getByRole('status')).toBe(region);
    expect(document.activeElement).toBe(region);
  });

  it('une panne réseau laisse une issue au lieu d’un écran figé', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('hors ligne')));
    await soumettre();
    await waitFor(() => {
      expect(screen.getByText(/Erreur réseau/i)).toBeTruthy();
    });
    // Le formulaire reste, sinon la personne n'a plus aucun moyen de réessayer.
    expect(screen.getByRole('button', { name: 'Recevoir un nouveau lien' })).toBeTruthy();
  });
});
