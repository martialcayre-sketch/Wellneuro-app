// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

// `notFound()` lève en vrai ; on remplace par une exception reconnaissable pour
// pouvoir affirmer qu'elle a bien été levée, et pas simplement que le rendu a
// échoué pour une autre raison.
const NON_TROUVE = new Error('notFound');
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw NON_TROUVE;
  },
}));

import { MESSAGE_ACCES_GOOGLE_REFUSE } from '@/lib/portail/googleIdentite';
import ConnexionPortailPage from './page';

afterEach(cleanup);

describe('/portail/connexion', () => {
  // Le lot affirme que les trois surfaces répondent 404 sans le drapeau. Les
  // deux routes le prouvaient, la page non — et l'E2E tourne toujours drapeau
  // allumé. Relevé en revue adversariale le 2026-07-21.
  it('drapeau éteint : la page n’existe pas', () => {
    delete process.env.WN_G5_GOOGLE_PATIENT;
    expect(() => ConnexionPortailPage({})).toThrow(NON_TROUVE);
  });

  it('drapeau allumé : la porte d’entrée est un lien vers le départ Google', () => {
    process.env.WN_G5_GOOGLE_PATIENT = 'true';
    render(ConnexionPortailPage({}));
    const lien = screen.getByRole('link', { name: 'Continuer avec Google' });
    expect(lien.getAttribute('href')).toBe('/portail/google');
  });

  // Le registre inscrit Google comme sous-traitant nouveau sur les patients.
  // La personne doit l'apprendre avant de cliquer, pas après.
  it('prévient de la redirection vers Google avant le clic', () => {
    process.env.WN_G5_GOOGLE_PATIENT = 'true';
    render(ConnexionPortailPage({}));
    expect(screen.getByText(/redirigé vers Google/i)).toBeTruthy();
    expect(screen.getByText(/aucune donnée de santé/i)).toBeTruthy();
    // Et l'autre chemin reste nommé : Google est optionnel (décision D1).
    expect(screen.getByText(/sans passer par Google/i)).toBeTruthy();
  });

  it('sans refus, aucun message d’erreur n’est affiché', () => {
    process.env.WN_G5_GOOGLE_PATIENT = 'true';
    render(ConnexionPortailPage({}));
    expect(screen.queryByText(MESSAGE_ACCES_GOOGLE_REFUSE)).toBeNull();
  });

  it('le refus affiche le message unique, et ne nomme aucun motif', () => {
    process.env.WN_G5_GOOGLE_PATIENT = 'true';
    render(ConnexionPortailPage({ searchParams: { etat: 'refus' } }));
    expect(screen.getByText(MESSAGE_ACCES_GOOGLE_REFUSE)).toBeTruthy();
    expect(screen.queryByText(/inconnue|révoqué|expiré|inactif|non vérifi/i)).toBeNull();
  });

  // Le paramètre ne prend qu'une valeur : rien d'autre ne doit produire d'écran
  // de refus, sans quoi une variante finirait par dire quelque chose de plus.
  it('une autre valeur du paramètre n’affiche rien de particulier', () => {
    process.env.WN_G5_GOOGLE_PATIENT = 'true';
    render(ConnexionPortailPage({ searchParams: { etat: 'adresse_inconnue' } }));
    expect(screen.queryByText(MESSAGE_ACCES_GOOGLE_REFUSE)).toBeNull();
  });
});
