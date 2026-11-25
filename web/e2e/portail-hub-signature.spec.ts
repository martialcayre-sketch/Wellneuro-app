// Signature du hub « Mon parcours » (lot PAT-3b ; [[D-481]] §1 bis,
// complément DOC-21 du 2026-11-25). Réception du lot : la première action
// reste visible sans défilement au téléphone ; le bandeau est absent de
// l'accessibilité et de l'impression ; il garde sa hauteur fixe (52 px au
// téléphone, 64 px au bureau). Les règles de la primitive sont épinglées en
// Vitest (`components/ui/LienDecor.test.tsx`), la pose dans la carte aussi
// (`components/patient/MonParcoursAccueil.test.tsx`).
//
// Patient fictif Sophie Nicola (PAT_SEED_01), majeure. Lecture seule, hors
// l'accusé d'entrée que posent déjà les autres specs du hub.
import { test, expect, type Page } from '@playwright/test';
import { accuserPorteTrust, closePrisma } from './helpers/db';
import { patientPortailSessionCookie } from './helpers/auth';

const PATIENT = { idPatient: 'PAT_SEED_01', email: 'sophie.nicola@fictif.wellneuro.fr' };

test.describe('Portail — signature du hub (PAT-3b)', () => {
  test.beforeAll(async () => {
    // Sans l'accusé, « Avant de commencer » est requis et le hub n'est pas servi.
    await accuserPorteTrust(PATIENT.idPatient);
  });

  test.afterAll(async () => {
    await closePrisma();
  });

  test.beforeEach(async ({ context }) => {
    await context.addCookies([patientPortailSessionCookie(PATIENT.idPatient, PATIENT.email)]);
  });

  async function surLeHub(page: Page) {
    await page.goto(`/portail/${PATIENT.idPatient}/questionnaires`);
    await expect(page.getByRole('heading', { name: 'Mon parcours', level: 1 })).toBeVisible();
    return page.locator('[data-lien-decor="hub-patient"]');
  }

  /** Ce qui suit l'intitulé du fil : l'action du moment, ou la phrase du repos. */
  function premiereAction(page: Page) {
    return page
      .getByText(/^(Ce que j’ai à faire aujourd’hui|Pour reprendre)$/)
      .locator('xpath=following-sibling::*[1]');
  }

  test('le bandeau est hors de l’arbre d’accessibilité et absent à l’impression', async ({ page }) => {
    const bandeau = await surLeHub(page);
    await expect(bandeau).toHaveCount(1);
    await expect(bandeau).toHaveAttribute('aria-hidden', 'true');
    // Le titre reste le premier contenu lisible de la carte.
    const titres = await page.getByRole('heading', { level: 1 }).allTextContents();
    expect(titres).toEqual(['Mon parcours']);
    await page.emulateMedia({ media: 'print' });
    await expect(bandeau).toBeHidden();
    await page.emulateMedia({ media: 'screen' });
    await expect(bandeau).toBeVisible();
  });

  test('au bureau : bandeau de 64 px en tête de carte', async ({ page, isMobile }) => {
    test.skip(isMobile, 'cas du bureau');
    const bandeau = await surLeHub(page);
    const boite = await bandeau.boundingBox();
    expect(boite?.height).toBe(64);
  });

  test.describe('sur téléphone', () => {
    test.skip(({ isMobile }) => !isMobile, 'mesure au téléphone');

    test('bandeau de 52 px ; la première action se lit sans défiler, au-dessus de la barre basse', async ({ page }) => {
      const bandeau = await surLeHub(page);
      expect((await bandeau.boundingBox())?.height).toBe(52);
      expect(await page.evaluate(() => window.scrollY)).toBe(0);
      const action = premiereAction(page);
      await expect(action).toBeVisible();
      const boiteAction = await action.boundingBox();
      const barre = page.getByRole('navigation', { name: 'Accès rapides' });
      // Sans barre basse (drapeau éteint), la limite est le bas de la fenêtre.
      const limite = (await barre.isVisible())
        ? (await barre.boundingBox())!.y
        : page.viewportSize()!.height;
      expect(boiteAction).toBeTruthy();
      expect(boiteAction!.y + boiteAction!.height).toBeLessThanOrEqual(limite);
    });
  });
});
