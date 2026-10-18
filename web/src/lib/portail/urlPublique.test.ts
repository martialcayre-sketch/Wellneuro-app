import { afterEach, describe, expect, it } from 'vitest';
import { baseLiensAbsenteEnProduction, baseLiensCourriel, urlPubliquePortail } from './urlPublique';

const NEXTAUTH_URL_AVANT = process.env.NEXTAUTH_URL;
const WN_DEPLOY_ENV_AVANT = process.env.WN_DEPLOY_ENV;

afterEach(() => {
  if (NEXTAUTH_URL_AVANT === undefined) delete process.env.NEXTAUTH_URL;
  else process.env.NEXTAUTH_URL = NEXTAUTH_URL_AVANT;
  if (WN_DEPLOY_ENV_AVANT === undefined) delete process.env.WN_DEPLOY_ENV;
  else process.env.WN_DEPLOY_ENV = WN_DEPLOY_ENV_AVANT;
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

describe('base des liens de courriel (H43, repli localhost)', () => {
  it('NEXTAUTH_URL posée : elle, sans barre finale', () => {
    process.env.NEXTAUTH_URL = 'https://app.exemple.fr/';
    expect(baseLiensCourriel()).toBe('https://app.exemple.fr');
  });

  it('absente : le repli de développement', () => {
    delete process.env.NEXTAUTH_URL;
    expect(baseLiensCourriel()).toBe('http://localhost:3000');
  });

  it('production réelle sans NEXTAUTH_URL (ou vide) : signalée — c’est ce qui arrête le démarrage', () => {
    expect(baseLiensAbsenteEnProduction({ WN_DEPLOY_ENV: 'production' })).toBe(true);
    expect(baseLiensAbsenteEnProduction({ WN_DEPLOY_ENV: 'production', NEXTAUTH_URL: '  ' })).toBe(true);
  });

  it('base posée, ou hors production réelle (E2E sur build de production compris) : rien à signaler', () => {
    expect(baseLiensAbsenteEnProduction({ WN_DEPLOY_ENV: 'production', NEXTAUTH_URL: 'https://app.exemple.fr' })).toBe(false);
    expect(baseLiensAbsenteEnProduction({ NODE_ENV: 'production' })).toBe(false);
    expect(baseLiensAbsenteEnProduction({ WN_DEPLOY_ENV: 'staging' })).toBe(false);
  });
});
