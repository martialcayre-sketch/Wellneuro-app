// Rayon Correspondance (LOT-00) — la page cesse d'annoncer un module différé
// pendant que le rail affiche un compteur réel à côté d'elle.
//
// AUCUN E2E NE VISITAIT CETTE ADRESSE avant ce fichier : elle était déclarée
// dans les trois navigations et parcourue par aucun test, si bien que rien ne
// rougissait quand son contenu contredisait le produit livré. Le seed ne crée
// aucune consignation — le panneau est donc VIDE, et c'est l'état honnête que
// ce spec épingle.
import { test, expect } from '@playwright/test';
import { praticienSessionCookie } from './helpers/auth';

test.describe('Rayon Correspondance', () => {
  test('la page dit ce que le rayon est, sans bannière de report ni promesse de pièce jointe', async ({
    page,
    context,
  }) => {
    await context.addCookies([await praticienSessionCookie()]);
    await page.goto('/dashboard/correspondance');

    await expect(page.getByRole('heading', { name: 'Correspondance', level: 2 })).toBeVisible();

    // LES DEUX AFFIRMATIONS RETIRÉES. « Module différé » décrivait comme à venir
    // une fonction en service depuis le 2026-07-22 ; les pièces jointes sont
    // interdites par D-122, et le modèle n'a aucun champ fichier.
    await expect(page.getByText(/Module différé/i)).toHaveCount(0);
    await expect(page.getByText(/pièces jointes/i)).toHaveCount(0);

    // Le geste est nommé, et il mène au dossier — pas à un cul-de-sac.
    const versDossiers = page.getByRole('link', { name: 'Ouvrir un dossier' });
    await expect(versDossiers).toBeVisible();
    expect((await versDossiers.boundingBox())?.height).toBeGreaterThanOrEqual(44);

    // Le panneau des dernières consignations est monté. Sans consignation au
    // seed, il dit l'état constaté plutôt que de se taire.
    await expect(page.getByTestId('correspondance-recente')).toBeVisible();
    await expect(page.getByText('Aucun échange consigné')).toBeVisible();

    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    ).toBe(true);
  });

  test('le rail mène à la page, et le clic n’aboutit plus à un écran réservé', async ({
    page,
    context,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'Desktop Chromium', 'rail latéral : desktop uniquement');
    await context.addCookies([await praticienSessionCookie()]);
    await page.goto('/dashboard');

    // DEUX LIENS PORTENT CE NOM sur l'accueil — le rail et la barre « Vues
    // rapides » — et c'est voulu. Le rail se désigne par son groupe, patron de
    // `trajectoires.spec.ts`.
    const rail = page.locator('nav').filter({ hasText: 'La Spirale' }).first();
    await rail.getByRole('link', { name: 'Correspondance' }).click();
    await expect(page).toHaveURL(/\/dashboard\/correspondance$/);
    await expect(page.getByRole('heading', { name: 'Correspondance', level: 2 })).toBeVisible();
    await expect(page.getByText(/Module différé/i)).toHaveCount(0);
  });
});
