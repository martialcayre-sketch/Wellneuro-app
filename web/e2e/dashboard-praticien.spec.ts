// Parcours praticien : authentification et accès au dashboard
// Teste la session NextAuth du praticien (sans automatiser le login OAuth réel)
// et vérifie que les routes du dashboard sont accessibles avec une session valide.
import { test, expect } from '@playwright/test';
import { praticienSessionCookie } from './helpers/auth';

const PRATICIEN_EMAIL = 'martialcayre@wellneuro.fr';

test.describe('Praticien Dashboard', () => {
  test('login via NextAuth session cookie and access dashboard', async ({ page }) => {
    // Fabrique un cookie de session NextAuth valide pour le praticien
    const sessionCookie = await praticienSessionCookie(PRATICIEN_EMAIL);

    // Ajoute le cookie à la page avant de naviguer
    await page.context().addCookies([sessionCookie]);

    // Navigue vers le dashboard
    await page.goto('/dashboard');

    // Vérifie que la page est chargée et que les éléments clés sont présents
    await expect(page).toHaveTitle(/Dashboard|Praticien/i); // Adjust title expectation
    
    // Vérifie que le titre du dashboard est visible
    const mainHeading = page.locator('h1, h2').filter({ hasText: /Dashboard|Espace praticien|Bienvenue|Bonjour/i });
    await expect(mainHeading.first()).toBeVisible({ timeout: 10000 });

    // Sur les largeurs < lg (tablette portrait/mobile), la navigation est repliée
    // derrière le bouton ☰ (panneau overlay, LOT-02) : on l'ouvre si présent.
    const menuToggle = page.getByRole('button', { name: 'Ouvrir la navigation' });
    if (await menuToggle.isVisible()) {
      await menuToggle.click();
    }

    // Vérifie qu'un lien vers Patients est visible (rail persistant sur desktop,
    // panneau overlay sur mobile) : ":visible" exclut le rail persistant masqué
    // par CSS sur mobile, qui resterait sinon le premier match du DOM.
    await expect(page.locator('a[href*="patients"]:visible').first()).toBeVisible({ timeout: 5000 });
  });

  test('navigate to patients section', async ({ page }) => {
    const sessionCookie = await praticienSessionCookie(PRATICIEN_EMAIL);
    await page.context().addCookies([sessionCookie]);

    await page.goto('/dashboard/patients');

    // Vérifie que la page patients est chargée
    await expect(page).toHaveURL(/.*\/dashboard\/patients/);
    
    // Attends un élément indicatif de contenu chargé
    // (peut être une liste vide initialement, un titre, etc.)
    const content = page.locator('main, [role="main"], article');
    await expect(content).toBeVisible({ timeout: 10000 });
  });

  test('session expires on missing NEXTAUTH_SECRET', async ({ page }) => {
    // Test de sensibilité : sans NEXTAUTH_SECRET, la fabrication du cookie échoue
    const originalSecret = process.env.NEXTAUTH_SECRET;
    delete process.env.NEXTAUTH_SECRET;

    try {
      await expect(async () => {
        await praticienSessionCookie(PRATICIEN_EMAIL);
      }).rejects.toThrow('NEXTAUTH_SECRET');
    } finally {
      process.env.NEXTAUTH_SECRET = originalSecret;
    }
  });
});
