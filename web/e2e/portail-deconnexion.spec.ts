// Déconnexion patient (`D-241`, complétée par `D-243`).
//
// CE SPEC EXISTE PARCE QU'IL MANQUAIT. Le lot qui a livré le geste n'ajoutait
// aucun parcours — `frontend-ui.md` en attend un pour tout changement d'UI, et
// les bancs de composant ne prouvent rien ici : ils bouchonnent `fetch` et
// `window.location`, c'est-à-dire exactement les deux choses qu'on veut voir
// fonctionner pour de vrai.
//
// `exact: true` sur le libellé du bouton : sans lui, « Se déconnecter » attrape
// AUSSI « Se déconnecter et effacer » du dialogue, et le spec se met à cliquer
// au hasard dès que la confirmation s'ouvre.
import { test, expect } from '@playwright/test';
import { patientPortailSessionCookie } from './helpers/auth';

const PATIENT = { idPatient: 'PAT_SEED_02', email: 'jennifer.martin@fictif.wellneuro.fr' };

const CLE_BROUILLON = 'wellneuro:questionnaire-draft:v1:E2E_DECONNEXION';
const CLE_META = 'wellneuro:questionnaire-draft-meta:v1:E2E_DECONNEXION';
const CLE_SESSION = 'wellneuro:wizard-draft:anamnese:E2E_DECONNEXION';
const CLE_CONFORT = 'wellneuro:portail:confort';

/** Dépose du travail non envoyé, dans les DEUX stockages. */
const semerTravailEnCours = `
  window.localStorage.setItem(${JSON.stringify(CLE_BROUILLON)}, JSON.stringify({ version: 1, answers: { q1: 'oui' }, currentPage: 0 }));
  window.localStorage.setItem(${JSON.stringify(CLE_META)}, new Date().toISOString());
  window.sessionStorage.setItem(${JSON.stringify(CLE_SESSION)}, JSON.stringify({ valeurs: { a: 1 } }));
  window.localStorage.setItem(${JSON.stringify(CLE_CONFORT)}, JSON.stringify({ texteAgrandi: true }));
`;

test('déconnexion sans travail en cours : part directement, et le cookie disparaît vraiment', async ({ page, context }) => {
  await context.addCookies([patientPortailSessionCookie(PATIENT.idPatient, PATIENT.email)]);

  await page.goto(`/portail/${PATIENT.idPatient}`);
  const bouton = page.getByRole('button', { name: 'Se déconnecter', exact: true });
  await expect(bouton).toBeVisible();

  await bouton.click();

  await expect(page).toHaveURL(/\/portail\/connexion/);
  await expect(page.getByRole('button', { name: 'Se déconnecter', exact: true })).toHaveCount(0);

  // LA PREUVE QUI COMPTE : le navigateur n'a plus le cookie. Un effacement dont
  // les attributs ne correspondent pas à la pose laisserait l'original en place
  // — et rien, côté serveur, ne le dirait.
  expect((await context.cookies()).find((c) => c.name === 'wn_portail')).toBeUndefined();
});

test('déconnexion avec travail en cours : avertit, puis purge les deux stockages', async ({ page, context }) => {
  await context.addCookies([patientPortailSessionCookie(PATIENT.idPatient, PATIENT.email)]);

  await page.goto(`/portail/${PATIENT.idPatient}`);
  await page.evaluate(semerTravailEnCours);

  await page.getByRole('button', { name: 'Se déconnecter', exact: true }).click();

  // Le dialogue dit CE QUI sera perdu — et rien n'a encore bougé.
  const dialogue = page.getByRole('dialog');
  await expect(dialogue).toBeVisible();
  await expect(dialogue).toContainText('ne sont pas encore envoyées');
  expect(await page.evaluate(`window.localStorage.getItem(${JSON.stringify(CLE_BROUILLON)})`)).not.toBeNull();

  await page.getByRole('button', { name: 'Se déconnecter et effacer' }).click();
  await expect(page).toHaveURL(/\/portail\/connexion/);

  // Les deux stockages sont vidés de leurs données patient — `sessionStorage`
  // compris, qui survit à la redirection dans le même onglet et portait donc le
  // défaut entier.
  expect(await page.evaluate(`window.localStorage.getItem(${JSON.stringify(CLE_BROUILLON)})`)).toBeNull();
  expect(await page.evaluate(`window.localStorage.getItem(${JSON.stringify(CLE_META)})`)).toBeNull();
  expect(await page.evaluate(`window.sessionStorage.getItem(${JSON.stringify(CLE_SESSION)})`)).toBeNull();
  // Le confort de lecture est un réglage d'APPAREIL : il survit.
  expect(await page.evaluate(`window.localStorage.getItem(${JSON.stringify(CLE_CONFORT)})`)).not.toBeNull();
  expect((await context.cookies()).find((c) => c.name === 'wn_portail')).toBeUndefined();
});

test('annuler l’avertissement : rien n’est effacé, la session reste ouverte', async ({ page, context }) => {
  await context.addCookies([patientPortailSessionCookie(PATIENT.idPatient, PATIENT.email)]);

  await page.goto(`/portail/${PATIENT.idPatient}`);
  await page.evaluate(semerTravailEnCours);

  await page.getByRole('button', { name: 'Se déconnecter', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Annuler' }).click();

  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page).not.toHaveURL(/\/portail\/connexion/);
  expect(await page.evaluate(`window.localStorage.getItem(${JSON.stringify(CLE_BROUILLON)})`)).not.toBeNull();
  expect((await context.cookies()).find((c) => c.name === 'wn_portail')).toBeDefined();
});

test('déconnexion : sans session, la page de connexion n’offre pas le geste', async ({ page }) => {
  await page.goto('/portail/connexion');
  await expect(page.getByRole('button', { name: 'Se déconnecter', exact: true })).toHaveCount(0);
});
