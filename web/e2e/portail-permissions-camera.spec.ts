// LA CAMÉRA N'EST RENDUE QU'À LA PAGE DE L'AGENDA ([[D-437]], H83).
//
// `Permissions-Policy: camera=()` posé sur `/:path*` interdisait `getUserMedia`
// à la page même de l'agenda alimentaire : le navigateur rendait la permission
// « refusée » quels que soient les réglages du patient, et la photo du repas
// n'était jamais proposée (constaté en production le 2026-11-05). Aucun banc
// jsdom ne voit un en-tête de réponse : seul le serveur Next construit le dit.
//
// Trois faits tenus ici, sur une vraie réponse :
// - la route qui sert l'agenda porte `camera=(self)`, et UN SEUL en-tête — Next
//   doit REMPLACER la valeur de `/:path*`, pas l'ajouter à côté (deux valeurs
//   se combinent au plus restrictif, et la caméra resterait fermée) ;
// - micro et géolocalisation y restent fermés ;
// - toute autre page garde `camera=()`.
//
// Et la garde qui va avec (constat PR-Agent sur #1878) : `camera=(self)` ouvre
// la caméra à tout script exécuté dans le document, même venu d'une autre
// origine. Cette route seule porte donc un `script-src 'self'` — le build sous
// test est celui de production, sans `'unsafe-eval'` — et garde
// `frame-ancestors 'none'`, que la même clé remplacerait sinon.
//
// Aucune session, aucun dossier : l'en-tête ne dépend que du chemin.
import { test, expect, type APIResponse } from '@playwright/test';

function enTete(reponse: APIResponse, nom: string): string[] {
  return reponse
    .headersArray()
    .filter(h => h.name.toLowerCase() === nom)
    .map(h => h.value);
}

const politique = (reponse: APIResponse) => enTete(reponse, 'permissions-policy');
const csp = (reponse: APIResponse) => enTete(reponse, 'content-security-policy');

// En mode `start` (T2, T3, CI), le serveur est TOUJOURS lancé par Playwright
// (`reuseExistingServer` faux) : le build de production est exigé, sans
// `'unsafe-eval'`. En mode `dev` (défaut local), un serveur déjà lancé peut
// être réutilisé, et il peut être un `next dev` comme un `next start` : les
// deux valeurs y sont admises, jamais une troisième.
const CSP_PRODUCTION = "script-src 'self' 'unsafe-inline'; frame-ancestors 'none'";
const CSP_DEVELOPPEMENT = "script-src 'self' 'unsafe-inline' 'unsafe-eval'; frame-ancestors 'none'";
const cspAdmises =
  process.env.PLAYWRIGHT_WEB_SERVER === 'start' ? [CSP_PRODUCTION] : [CSP_PRODUCTION, CSP_DEVELOPPEMENT];

test.describe('Permissions-Policy — la caméra, sur la seule page de l’agenda', () => {
  test('la page d’un questionnaire du portail rend la caméra à elle-même, et à elle seule', async ({ request }) => {
    const reponse = await request.get('/portail/JETON_FICTIF/questionnaires/ASS_FICTIF', { maxRedirects: 0 });
    expect(politique(reponse)).toEqual(['camera=(self), microphone=(), geolocation=()']);
    const valeurs = csp(reponse);
    expect(valeurs).toHaveLength(1);
    expect(cspAdmises).toContain(valeurs[0]);
  });

  test('ailleurs, la caméra reste fermée', async ({ request }) => {
    // Les deux voisins immédiats du motif — le hub, et un sous-chemin — en tête.
    for (const chemin of [
      '/portail/JETON_FICTIF/questionnaires',
      '/portail/JETON_FICTIF/questionnaires/ASS_FICTIF/x',
      '/portail/connexion',
      '/portail/JETON_FICTIF',
      '/login',
    ]) {
      const reponse = await request.get(chemin, { maxRedirects: 0 });
      expect(politique(reponse), chemin).toEqual(['camera=(), microphone=(), geolocation=()']);
      expect(csp(reponse), chemin).toEqual(["frame-ancestors 'none'"]);
    }
  });
});
