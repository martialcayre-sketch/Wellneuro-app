// Gate G4 — lien magique d'accès patient (IDP LOT-01).
//
// Le parcours portail existant (`portail-parcours.spec.ts`) n'est PAS touché :
// il entre par le jeton permanent, qui reste valable. Les deux chemins
// coexistent — c'est l'exigence du registre, et ce spec vérifie le second.
//
// Le drapeau `WN_G4_LIEN_MAGIQUE` est allumé par `playwright.config.ts` pour le
// serveur de test uniquement ; il reste absent de Vercel.
import { test, expect } from '@playwright/test';
import { praticienSessionCookie } from './helpers/auth';

const PATIENT = { idPatient: 'PAT_SEED_03', email: 'michel.dogne@fictif.wellneuro.fr' };

test('lien magique : ouvre une fois, refuse au second passage', async ({ page, context }) => {
  await context.addCookies([await praticienSessionCookie()]);

  const emission = await page.request.post('/api/praticien/token', {
    data: { idPatient: PATIENT.idPatient, action: 'lien_magique' },
  });
  expect(emission.ok()).toBe(true);
  const lien = (await emission.json()).lien as string;
  expect(lien).toContain('/portail/lien/');

  // Première ouverture : la session s'ouvre et le patient atterrit dans son
  // espace, sans repasser par le gate e-mail — le lien reçu dans la boîte vaut
  // preuve de contrôle de la boîte.
  await page.goto(lien);
  await expect(page).toHaveURL(/\/portail\/(?!lien\/)/);
  await expect(page).not.toHaveURL(/\/portail\/lien\/indisponible/);

  // Second passage sur le MÊME lien : refusé. C'est l'invariant du gate.
  await page.goto(lien);
  await expect(page).toHaveURL(/\/portail\/lien\/indisponible/);
  await expect(page.getByRole('heading', { name: 'Votre lien n’est plus valable' })).toBeVisible();
});

test('lien inconnu : même écran, même message qu’un lien déjà consommé', async ({ page }) => {
  await page.goto('/portail/lien/jeton-qui-na-jamais-existe');
  await expect(page).toHaveURL(/\/portail\/lien\/indisponible/);
  await expect(page.getByRole('heading', { name: 'Votre lien n’est plus valable' })).toBeVisible();
  // Rien n'indique si le jeton a existé, expiré ou été consommé.
  await expect(page.getByText(/expir|déjà utilisé|inconnu/i)).toHaveCount(0);
});

test('la redemande répond la même chose sur une adresse connue et une inconnue', async ({ page }) => {
  await page.goto('/portail/lien/indisponible');

  const connue = await page.request.post('/api/portail/lien/demande', {
    data: { email: PATIENT.email },
  });
  const inconnue = await page.request.post('/api/portail/lien/demande', {
    data: { email: 'personne@example.test' },
  });

  expect(inconnue.status()).toBe(connue.status());
  expect(await inconnue.text()).toBe(await connue.text());
});
