// Les comptes du cabinet ([[D-385]], J3-cabinet, plan §5.3). Les trois dossiers
// de fixture (Sophie Nicola, Jennifer Martin, Michel Dogné) font moins de cinq
// dossiers : la répartition des DEUX tableaux est masquée, l'effectif reste
// affiché ([[D-298]] §2), et aucun dossier n'est nommé. Les comptes eux-mêmes
// se prouvent au niveau Vitest (`comptesCabinet.test.ts`,
// `pariteFichePage.test.tsx`) : ici, les lire trahirait le masquage.
import { test, expect } from '@playwright/test';
import { praticienSessionCookie } from './helpers/auth';

test.describe('Comptes du cabinet', () => {
  test('effectif affiché, répartition masquée par tableau sous cinq dossiers, aucun dossier nommé', async ({
    page,
    context,
  }) => {
    await context.addCookies([await praticienSessionCookie()]);
    await page.goto('/dashboard/cabinet');

    await expect(page.getByRole('heading', { name: 'Comptes du cabinet' })).toBeVisible();
    // Le rejeu peut prendre quelques secondes : le message d'attente, puis les tableaux.
    const etape = page.getByRole('table', { name: 'Prochaine étape' });
    const protocole = page.getByRole('table', { name: 'Protocole' });
    await expect(etape).toBeVisible({ timeout: 30_000 });
    await expect(protocole).toBeVisible();

    // Deux effectifs, identiques : la même population dans les deux tableaux.
    const effectifs = page.getByText(/^Effectif : \d+ dossiers?$/);
    await expect(effectifs).toHaveCount(2);
    const [premier, second] = await effectifs.allTextContents();
    expect(premier).toBe(second);
    const effectif = Number(/\d+/.exec(premier)?.[0]);
    expect(effectif).toBeGreaterThan(0);

    // Le banc « sous cinq », par tableau (D-385 §6) : la base E2E ne porte que
    // les trois dossiers de fixture.
    expect(effectif).toBeLessThan(5);
    await expect(page.getByText('Répartition masquée (moins de cinq dossiers sur au moins une ligne).')).toHaveCount(2);
    await expect(etape.getByText('masqué', { exact: true })).toHaveCount(9);
    await expect(protocole.getByText('masqué', { exact: true })).toHaveCount(4);

    // La page compte, elle ne nomme personne.
    for (const nom of ['Sophie Nicola', 'Jennifer Martin', 'Michel Dogné', 'PAT_SEED']) {
      await expect(page.getByText(nom)).toHaveCount(0);
    }

    // Pas de défilement horizontal de la page (garde responsive commune).
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
    ).toBe(true);
  });

  test('le rail desktop mène à la page, près de « Fiche-trajectoire »', async ({ page, context }, testInfo) => {
    test.skip(testInfo.project.name !== 'Desktop Chromium', 'rail latéral : desktop uniquement');
    await context.addCookies([await praticienSessionCookie()]);
    await page.goto('/dashboard/trajectoires');

    const rail = page.locator('nav').filter({ hasText: 'La Spirale' }).first();
    const lien = rail.getByRole('link', { name: 'Comptes du cabinet' });
    await expect(lien).toHaveAttribute('href', '/dashboard/cabinet');
    await lien.click();
    await expect(page).toHaveURL(/\/dashboard\/cabinet$/);
    await expect(rail.getByRole('link', { name: 'Comptes du cabinet' })).toHaveAttribute('aria-current', 'page');
  });
});
