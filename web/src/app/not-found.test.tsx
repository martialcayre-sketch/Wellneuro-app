// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import NotFound from './not-found';

afterEach(cleanup);

describe('404 racine — adresses qui ne mènent nulle part', () => {
  it('est en français et dit ce qui s’est passé', () => {
    render(<NotFound />);
    expect(screen.getByRole('heading', { name: /Cette page n’existe pas/ })).toBeTruthy();
    expect(screen.getByText(/mal recopiée/)).toBeTruthy();
  });

  // Cette page est servie aux deux publics, et `/` redirige selon la session :
  // un unique bouton « accueil » enverrait une personne suivie, sans session
  // praticien, vers l'écran de connexion praticien — une seconde impasse après
  // la première. Les deux entrées doivent donc rester nommées et distinctes.
  it('offre les deux entrées, chacune vers son espace', () => {
    render(<NotFound />);
    expect(screen.getByRole('link', { name: 'Accéder à mon espace' }).getAttribute('href')).toBe(
      '/portail/connexion',
    );
    expect(screen.getByRole('link', { name: 'Espace praticien' }).getAttribute('href')).toBe('/login');
  });

  it('ne renvoie personne vers la racine, qui arbitre selon la session', () => {
    render(<NotFound />);
    const cibles = screen.getAllByRole('link').map(l => l.getAttribute('href'));
    expect(cibles).not.toContain('/');
  });

  it('ne dit rien de l’adresse demandée ni de la raison technique', () => {
    // La page ne reçoit pas l'URL et ne doit pas chercher à la deviner : la
    // réafficher inviterait à y injecter du contenu, et nommer une cause
    // renseignerait qui sonde le service.
    const { container } = render(<NotFound />);
    expect(container.textContent).not.toMatch(
      /scalingo|vercel|supabase|postgres|prisma|token|jeton|404|erreur/i,
    );
  });
});
