import { afterEach, describe, expect, it } from 'vitest';
import { urlPubliquePortail } from './urlPublique';

const NEXTAUTH_URL_AVANT = process.env.NEXTAUTH_URL;

afterEach(() => {
  if (NEXTAUTH_URL_AVANT === undefined) delete process.env.NEXTAUTH_URL;
  else process.env.NEXTAUTH_URL = NEXTAUTH_URL_AVANT;
});

describe('urlPubliquePortail', () => {
  // Le cas qui a cassé la production (2026-08-25) : derrière le routeur
  // Scalingo, `req.url` porte l'hôte interne du conteneur — une redirection
  // bâtie dessus envoyait le navigateur du patient vers localhost.
  it('vise l’hôte public NEXTAUTH_URL, jamais celui de la requête', () => {
    process.env.NEXTAUTH_URL = 'https://app.exemple.fr/';
    const url = urlPubliquePortail('/portail/PAT_TEST', 'https://localhost:23577/portail/lien/x');
    expect(url.toString()).toBe('https://app.exemple.fr/portail/PAT_TEST');
  });

  it('sans NEXTAUTH_URL (dev, banc E2E), se replie sur l’hôte de la requête', () => {
    delete process.env.NEXTAUTH_URL;
    const url = urlPubliquePortail('/portail/lien/indisponible', 'http://localhost:3111/portail/lien/x');
    expect(url.toString()).toBe('http://localhost:3111/portail/lien/indisponible');
  });
});
