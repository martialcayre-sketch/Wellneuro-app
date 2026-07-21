import { describe, expect, it } from 'vitest';
import { profilPraticienAutorise } from './auth';

/*
 * R7 de l'audit 5.0 — le contrôle d'accès praticien ne regardait que le texte
 * de l'adresse Google, sans vérifier ni `email_verified` ni `hd`.
 *
 * Le cas qui compte le plus ici est le dernier : `hd` absent doit rester
 * passant. L'exiger fermerait l'accès à la production au seul compte
 * praticien le jour où Google cesserait de le renvoyer.
 */
describe('profilPraticienAutorise', () => {
  const praticien = {
    email: 'martialcayre@wellneuro.fr',
    email_verified: true,
    hd: 'wellneuro.fr',
  };

  it('accepte un compte Workspace du domaine, vérifié, avec hd cohérent', () => {
    expect(profilPraticienAutorise(praticien)).toBe(true);
  });

  it('accepte un compte du domaine et vérifié dont le profil n’expose pas hd', () => {
    expect(profilPraticienAutorise({ email: praticien.email, email_verified: true })).toBe(true);
  });

  it('refuse une adresse hors domaine', () => {
    expect(profilPraticienAutorise({ ...praticien, email: 'quelquun@gmail.com', hd: undefined })).toBe(false);
  });

  it('refuse une adresse du domaine mais non vérifiée', () => {
    expect(profilPraticienAutorise({ ...praticien, email_verified: false })).toBe(false);
  });

  it('refuse quand email_verified est absent — l’absence ne vaut pas vérification', () => {
    expect(profilPraticienAutorise({ email: praticien.email })).toBe(false);
  });

  it('refuse un hd qui désigne un autre domaine que celui de l’adresse', () => {
    expect(profilPraticienAutorise({ ...praticien, hd: 'exemple.com' })).toBe(false);
  });

  it('refuse un profil absent, vide ou sans adresse', () => {
    expect(profilPraticienAutorise(null)).toBe(false);
    expect(profilPraticienAutorise(undefined)).toBe(false);
    expect(profilPraticienAutorise({})).toBe(false);
    expect(profilPraticienAutorise({ email: '', email_verified: true })).toBe(false);
  });
});
