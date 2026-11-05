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
// Aucune session, aucun dossier : l'en-tête ne dépend que du chemin.
import { test, expect, type APIResponse } from '@playwright/test';

function politique(reponse: APIResponse): string[] {
  return reponse
    .headersArray()
    .filter(h => h.name.toLowerCase() === 'permissions-policy')
    .map(h => h.value);
}

test.describe('Permissions-Policy — la caméra, sur la seule page de l’agenda', () => {
  test('la page d’un questionnaire du portail rend la caméra à elle-même, et à elle seule', async ({ request }) => {
    const reponse = await request.get('/portail/JETON_FICTIF/questionnaires/ASS_FICTIF', { maxRedirects: 0 });
    expect(politique(reponse)).toEqual(['camera=(self), microphone=(), geolocation=()']);
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
    }
  });
});
