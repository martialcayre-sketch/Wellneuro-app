// Gate G5 — entrée patient par Google (IDP2 LOT-03c).
//
// Les autres chemins ne sont PAS couverts ici : `portail-lien-magique.spec.ts`
// vérifie l'entrée par lien magique, `portail-parcours.spec.ts` le parcours une
// fois la session ouverte. Depuis le LOT-04, l'accès repose sur le cookie de
// session (le jeton permanent a été retiré) ; Google reste l'une des deux voies.
//
// Ce que ce spec couvre, et qu'aucun test unitaire ne couvre : le comportement
// du VRAI serveur quand quelqu'un frappe ces routes sans passer par Google.
// Le parcours nominal (consentement Google, code d'autorisation, jeton
// d'identité) exige un compte Google réel : il est vérifié en unitaire, avec un
// jeton forgé, dans `src/app/portail/google/retour/route.test.ts`.
import { test, expect } from '@playwright/test';
// Le message est importé, jamais recopié : c'est la seule façon qu'une
// reformulation ne laisse pas ce test vérifier une phrase qui n'existe plus.
import { MESSAGE_ACCES_GOOGLE_REFUSE } from '../src/lib/portail/googleIdentite';

test('la page d’entrée propose Google et la redemande d’un lien (LOT-04)', async ({ page }) => {
  await page.goto('/portail/connexion');
  await expect(page.getByRole('heading', { name: 'Accéder à votre espace' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Continuer avec Google' })).toBeVisible();
  // Les deux voies de reprise cohabitent (drapeaux G5 + G4-redemande allumés) :
  // sans cela, un patient sans Google resterait sans porte.
  await expect(page.getByRole('button', { name: 'Recevoir un nouveau lien' })).toBeVisible();
});

test('le départ ne pose jamais de session, configuré ou non', async ({ page }) => {
  // Le serveur de test n'a pas de client OAuth patient : c'est l'état de la
  // production après le merge de 03c et avant l'activation de 03d. La route
  // doit refuser proprement — ni 500, ni session ouverte.
  const res = await page.request.get('/portail/google', { maxRedirects: 0 });
  expect(res.status()).toBeGreaterThanOrEqual(300);
  expect(res.status()).toBeLessThan(400);

  // La destination est connue, pas au choix : `playwright.config.ts` ne pose
  // délibérément aucun client OAuth. Accepter aussi `accounts.google.com`
  // rendait ce test presque infalsifiable — relevé en revue le 2026-07-21.
  expect(res.headers()['location']).toContain('/portail/connexion?etat=refus');
  expect(res.headers()['set-cookie'] ?? '').not.toContain('wn_portail=');
});

test('un retour forgé n’ouvre rien et atterrit sur l’écran unique', async ({ page }) => {
  // Ni cookie d'aller, ni state valide : c'est exactement ce que produirait un
  // lien fabriqué par un tiers. Le `state` est là pour ça.
  const res = await page.request.get('/portail/google/retour?code=code-forge&state=state-forge', {
    maxRedirects: 0,
  });
  expect(res.headers()['location']).toContain('/portail/connexion?etat=refus');
  expect(res.headers()['set-cookie'] ?? '').not.toContain('wn_portail=');

  // Et l'écran d'atterrissage ne dit pas pourquoi.
  await page.goto('/portail/connexion?etat=refus');
  await expect(page.getByText(MESSAGE_ACCES_GOOGLE_REFUSE)).toBeVisible();
  await expect(page.getByText(/inconnue|révoqué|expiré|inactif/i)).toHaveCount(0);
});
