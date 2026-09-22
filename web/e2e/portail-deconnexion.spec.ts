// Déconnexion patient (`D-241`, complétée par `D-242`).
//
// CE SPEC EXISTE PARCE QU'IL MANQUAIT. Le lot qui a livré le geste n'ajoutait
// aucun E2E — `frontend-ui.md` en attend un pour tout changement d'UI, et les
// bancs de composant ne prouvent rien sur le parcours : ils bouchonnent `fetch`
// et `window.location`, c'est-à-dire exactement les deux choses qu'on veut voir
// fonctionner pour de vrai.
//
// Ce qui est vérifié ici et nulle part ailleurs : que le cookie posé par le
// serveur est réellement EFFACÉ par le navigateur — la parité d'attributs entre
// la pose et l'effacement n'est une promesse qu'au niveau de l'en-tête.
import { test, expect } from '@playwright/test';
import { patientPortailSessionCookie } from './helpers/auth';

const PATIENT = { idPatient: 'PAT_SEED_02', email: 'jennifer.martin@fictif.wellneuro.fr' };

test('déconnexion : le bouton ferme la session et le cookie disparaît vraiment', async ({ page, context }) => {
  await context.addCookies([patientPortailSessionCookie(PATIENT.idPatient, PATIENT.email)]);

  await page.goto(`/portail/${PATIENT.idPatient}`);
  const bouton = page.getByRole('button', { name: 'Se déconnecter' });
  await expect(bouton).toBeVisible();

  await bouton.click();

  // Atterrissage sur la porte d'entrée, et le bouton n'y est plus : il n'est
  // rendu qu'en présence d'une session signée.
  await expect(page).toHaveURL(/\/portail\/connexion/);
  await expect(page.getByRole('button', { name: 'Se déconnecter' })).toHaveCount(0);

  // LA PREUVE QUI COMPTE : le navigateur n'a plus le cookie. Un effacement dont
  // les attributs ne correspondent pas à la pose laisserait l'original en place
  // — et rien, côté serveur, ne le dirait.
  const cookies = await context.cookies();
  expect(cookies.find((c) => c.name === 'wn_portail')).toBeUndefined();
});

test('déconnexion : sans session, la page de connexion n’offre pas le geste', async ({ page }) => {
  await page.goto('/portail/connexion');
  await expect(page.getByRole('button', { name: 'Se déconnecter' })).toHaveCount(0);
});
