// Motif d'alliance de l'en-tête de fiche (lot PRA-3a ; [[D-481]] §1 bis,
// variante A du prototype, question 20261126-2231-d). Réception du lot :
// - le motif est absent de l'accessibilité et de l'impression ;
// - il n'ajoute aucune hauteur : l'en-tête et la barre d'onglets gardent la
//   géométrie du témoin (même en-tête, structure d'avant le lot) à chaque
//   largeur ;
// - tout ou rien : entier au bureau (1440 px) et au téléphone, effacé à la
//   tablette (768 px), où la rangée n'a pas d'espace libre.
// Les règles de la primitive sont épinglées en Vitest
// (`components/ui/LienDecor.test.tsx`), la pose aussi
// (`components/FichePatientPanel.test.tsx`).
//
// Dossier de fixture Sophie Nicola (PAT_SEED_01). Lecture seule.
import { test, expect, type Page } from '@playwright/test';
import { PRATICIEN_EMAIL, praticienSessionCookie } from './helpers/auth';

const FICHE = '/dashboard/patients/PAT_SEED_01';
const MOTIF = '[data-lien-decor="entete-fiche"]';

type Geometrie = { rang: number; onglets: number; lignesTitre: number };

async function ouvrir(page: Page) {
  await page.context().addCookies([await praticienSessionCookie(PRATICIEN_EMAIL)]);
  await page.goto(FICHE);
  await expect(page.getByRole('heading', { level: 1, name: 'Sophie Nicola' })).toBeVisible();
  await expect(page.getByRole('tablist', { name: 'Vues de la fiche patient' })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}

/** Hauteur de la rangée d'en-tête, haut de la barre d'onglets, lignes du titre. */
function mesurer(page: Page): Promise<Geometrie> {
  return page.evaluate(() => {
    const titre = document.querySelector('main h1') as HTMLElement;
    const rang = titre.closest('main')!.querySelector('[role="tablist"]')!.previousElementSibling as HTMLElement;
    const onglets = document.querySelector('[role="tablist"]') as HTMLElement;
    return {
      rang: rang.getBoundingClientRect().height,
      onglets: onglets.getBoundingClientRect().top,
      lignesTitre: Math.round(titre.getBoundingClientRect().height / parseFloat(getComputedStyle(titre).lineHeight)),
    };
  });
}

/** Rend à l'en-tête sa structure d'avant le lot : l'identité seule, sans ligne ni motif. */
async function poserTemoin(page: Page) {
  await page.evaluate((selecteur) => {
    const motif = document.querySelector(selecteur) as HTMLElement;
    const ligne = motif.parentElement!.parentElement as HTMLElement;
    ligne.replaceWith(ligne.firstElementChild as HTMLElement);
  }, MOTIF);
}

async function comparerAuTemoin(page: Page) {
  const avecMotif = await mesurer(page);
  await poserTemoin(page);
  await expect(page.locator(MOTIF)).toHaveCount(0);
  const temoin = await mesurer(page);
  expect(avecMotif.rang).toBeCloseTo(temoin.rang, 0);
  expect(avecMotif.onglets).toBeCloseTo(temoin.onglets, 0);
  expect(avecMotif.lignesTitre).toBe(temoin.lignesTitre);
}

test.describe('Fiche — motif d’alliance de l’en-tête (PRA-3a)', () => {
  test('hors de l’arbre d’accessibilité, absent à l’impression, un seul titre', async ({ page }) => {
    await ouvrir(page);
    const motif = page.locator(MOTIF);
    await expect(motif).toHaveCount(1);
    await expect(motif).toHaveAttribute('aria-hidden', 'true');
    expect(await page.getByRole('heading', { level: 1 }).allTextContents()).toEqual(['Sophie Nicola']);
    await page.emulateMedia({ media: 'print' });
    await expect(motif).toBeHidden();
    await page.emulateMedia({ media: 'screen' });
  });

  test.describe('au bureau et à la tablette', () => {
    test.skip(({ isMobile }) => isMobile, 'largeurs du bureau');

    test('1440 px : arcs entiers, aucune hauteur ajoutée', async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await ouvrir(page);
      const motif = page.locator(MOTIF);
      await expect(motif).toBeVisible();
      const boite = await motif.boundingBox();
      expect(boite?.width ?? 0).toBeCloseTo(106, 0);
      expect(boite?.height ?? 0).toBeLessThanOrEqual(44.5);
      await comparerAuTemoin(page);
    });

    test('768 px : sans espace libre, le motif s’efface ; aucune hauteur ajoutée', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await ouvrir(page);
      await expect(page.locator(MOTIF)).toBeHidden();
      await comparerAuTemoin(page);
    });

    for (const largeur of [640, 1024, 1280]) {
      test(`${largeur} px : aucune hauteur ajoutée`, async ({ page }) => {
        await page.setViewportSize({ width: largeur, height: 900 });
        await ouvrir(page);
        await comparerAuTemoin(page);
      });
    }
  });

  test.describe('sur téléphone', () => {
    test.skip(({ isMobile }) => !isMobile, 'mesure au téléphone');

    test('arcs entiers à droite de l’identité, aucune hauteur ajoutée', async ({ page }) => {
      await ouvrir(page);
      const motif = page.locator(MOTIF);
      await expect(motif).toBeVisible();
      const [boiteMotif, boiteTitre] = await Promise.all([
        motif.boundingBox(),
        page.getByRole('heading', { level: 1, name: 'Sophie Nicola' }).boundingBox(),
      ]);
      expect(boiteMotif?.width ?? 0).toBeCloseTo(106, 0);
      expect(boiteMotif!.x).toBeGreaterThan(boiteTitre!.x + boiteTitre!.width);
      await comparerAuTemoin(page);
    });
  });
});
