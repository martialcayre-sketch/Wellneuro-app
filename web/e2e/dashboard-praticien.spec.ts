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

    // Sur les largeurs 768-1024px (tablette portrait), la navigation est repliée
    // derrière le bouton ☰ (panneau overlay, LOT-02) : on l'ouvre si présent. En
    // dessous de 768px (mobile), la navigation basse (LOT-03) est visible directement,
    // sans bouton ☰.
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

  test.describe('mobile bottom navigation', () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test('shows 4 entries, hides the tablet drawer trigger, and Plus opens an accessible sheet', async ({
      page,
    }) => {
      const sessionCookie = await praticienSessionCookie(PRATICIEN_EMAIL);
      await page.context().addCookies([sessionCookie]);

      await page.goto('/dashboard');

      // En dessous de 768px, le bouton ☰ (panneau tablette, LOT-02) ne doit plus
      // être affiché : la navigation basse (LOT-03) le remplace.
      await expect(page.getByRole('button', { name: 'Ouvrir la navigation' })).toBeHidden();

      const bottomNav = page.locator('nav[aria-label="Navigation principale"]');
      await expect(bottomNav).toBeVisible();
      await expect(bottomNav.locator('a[href="/dashboard"]:visible')).toBeVisible();
      await expect(bottomNav.locator('a[href="/dashboard/patients"]:visible')).toBeVisible();
      await expect(bottomNav.locator('a[href="/dashboard/synthese"]:visible')).toBeVisible();
      const plusButton = bottomNav.getByRole('button', { name: 'Plus' });
      await expect(plusButton).toBeVisible();

      // Cible tactile ≥ 44×44 px sur un lien de la navigation basse.
      const patientsLink = bottomNav.locator('a[href="/dashboard/patients"]:visible');
      const box = await patientsLink.boundingBox();
      expect(box?.height).toBeGreaterThanOrEqual(44);

      await plusButton.click();
      const sheet = page.getByRole('dialog', { name: 'Menu' });
      await expect(sheet).toBeVisible();
      await expect(sheet.getByRole('link', { name: 'Paramètres' })).toBeVisible();

      await page.keyboard.press('Escape');
      await expect(sheet).toBeHidden();
      await expect(plusButton).toBeFocused();
    });
  });

  test.describe('tablet drawer navigation', () => {
    // 768–1023px : le rail persistant (lg) est caché, la navigation basse
    // (<768px) ne l'est pas encore — seul le tiroir ☰ (LOT-02, Radix Dialog)
    // donne accès à la navigation dans cette plage.
    test.use({ viewport: { width: 900, height: 1024 } });

    test('opens an accessible, opaque drawer via the menu trigger, closable with Escape', async ({ page }) => {
      const sessionCookie = await praticienSessionCookie(PRATICIEN_EMAIL);
      await page.context().addCookies([sessionCookie]);

      await page.goto('/dashboard');

      const menuToggle = page.getByRole('button', { name: 'Ouvrir la navigation' });
      await expect(menuToggle).toBeVisible();
      await menuToggle.click();

      const drawer = page.getByRole('dialog', { name: 'Navigation' });
      await expect(drawer).toBeVisible();
      await expect(drawer.getByRole('link', { name: 'Patients' })).toBeVisible();

      // Régression verrouillée : Dialog.Portal (Radix) rend hors du conteneur
      // [data-theme="praticien"] dont dépendent les tokens --rail-* — sans
      // data-theme="praticien" posé directement sur Dialog.Content, ce fond
      // reste transparent (page visible au travers) au lieu du rail sombre.
      const backgroundColor = await drawer.evaluate((el) => getComputedStyle(el).backgroundColor);
      expect(backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
      expect(backgroundColor).not.toBe('transparent');

      await page.keyboard.press('Escape');
      await expect(drawer).toBeHidden();
      await expect(menuToggle).toBeFocused();
    });
  });

  test('accueil : le Fil du jour remplace les accès rapides (SP-FIL LOT-01)', async ({ page }) => {
    const sessionCookie = await praticienSessionCookie(PRATICIEN_EMAIL);
    await page.context().addCookies([sessionCookie]);
    await page.goto('/dashboard');

    // La carte métriques « le cabinet en un coup d'œil » et le conteneur du
    // Fil sont présents quel que soit l'état des données (cartes ou état
    // vide) — les cartes elles-mêmes dépendent du seed.
    await expect(page.getByRole('heading', { name: /coup d/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Le Fil', exact: true })).toBeVisible();
    await expect(page.getByTestId('fil-du-jour')).toBeVisible({ timeout: 10000 });
  });

  test('paramètres : blocs profil et gouvernance clinique (HC-F LOT-03)', async ({ page }) => {
    const sessionCookie = await praticienSessionCookie(PRATICIEN_EMAIL);
    await page.context().addCookies([sessionCookie]);
    await page.goto('/dashboard/parametres');

    await expect(page.getByRole('heading', { name: 'Profil praticien' })).toBeVisible();
    // Scopé à <main> : l'email apparaît aussi dans le menu « Profil » du rail.
    await expect(page.getByRole('main').getByText(PRATICIEN_EMAIL)).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Gouvernance clinique' })).toBeVisible();
    await expect(page.getByText('Version du moteur d’équilibre')).toBeVisible();
  });

  test('patients : formulaire de création patient utilisable après refactor (HC-F LOT-03)', async ({ page }) => {
    const sessionCookie = await praticienSessionCookie(PRATICIEN_EMAIL);
    await page.context().addCookies([sessionCookie]);
    await page.goto('/dashboard/patients');

    await expect(page.getByPlaceholder('Prénom *', { exact: true })).toBeVisible();
    // { exact: true } : « Prénom * » contient « nom * » comme sous-chaîne,
    // ce qui matcherait sinon les deux champs (strict mode).
    await expect(page.getByPlaceholder('Nom *', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Créer le patient' })).toBeVisible();
    await expect(page.getByRole('table').first()).toBeVisible();
  });

  test('route praticien : accès Trajectoire alimentaire (JA5-03)', async ({ page }) => {
    const sessionCookie = await praticienSessionCookie(PRATICIEN_EMAIL);
    await page.context().addCookies([sessionCookie]);

    await page.goto('/dashboard/patients/PAT_SEED_03/alimentation');
    await expect(page).toHaveURL(/\/dashboard\/patients\/PAT_SEED_03\/alimentation$/);
    await expect(page.getByRole('heading', { name: 'Trajectoire alimentaire' })).toBeVisible();
    await expect(page.getByTestId('ja-praticien-calibrage')).toBeVisible();
    await expect(page.getByTestId('ja-praticien-moments-explorer')).toBeVisible();
    await expect(page.getByTestId('ja-praticien-revue-decision')).toBeVisible();

    await page.getByTestId('ja-praticien-assiette').selectOption('ASSIETTE_SOIR_LEGER');
    await page.getByTestId('ja-praticien-valider-revue').click();
    await expect(page.getByTestId('ja-praticien-review-summary')).toContainText('Accepté');
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
