// Barre basse du portail ([[D-444]], lot L4 de l'audit « rails et menus »,
// chapitre 11). `WN_PORTAIL_BARRE_BASSE` et `WN_PORTAIL_MENU` sont armés par
// `playwright.config.ts`. Sur iPhone 13 : la barre, sa page active, un lien
// suivi, les cibles de 44 px, le pied d'urgence lisible en fin de défilement,
// l'impression, le confort 112,5 % et `axe`. Sur Desktop Chromium : aucune
// barre. Les cas d'âge, de murs, de chemin et de clôture sont épinglés en
// Vitest (`components/patient/barre-basse/BarreBasse.test.tsx`).
//
// Patient fictif Sophie Nicola (PAT_SEED_01), majeure. Lecture seule, hors
// l'accusé d'entrée que posent déjà les autres specs du hub.
import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { accuserPorteTrust, closePrisma } from './helpers/db';
import { patientPortailSessionCookie } from './helpers/auth';

const PATIENT = { idPatient: 'PAT_SEED_01', email: 'sophie.nicola@fictif.wellneuro.fr' };

test.describe('Portail — barre basse', () => {
  test.beforeAll(async () => {
    // Sans l'accusé, « Avant de commencer » est requis et la barre n'existe pas.
    await accuserPorteTrust(PATIENT.idPatient);
  });

  test.afterAll(async () => {
    await closePrisma();
  });

  test.beforeEach(async ({ context }) => {
    await context.addCookies([patientPortailSessionCookie(PATIENT.idPatient, PATIENT.email)]);
  });

  async function surLeSuivi(page: Page) {
    await page.goto(`/portail/${PATIENT.idPatient}/suivi`);
    // Le bouton « Menu » dit que la garde est franchie, sur les deux projets.
    await expect(page.getByRole('button', { name: 'Menu', exact: true })).toBeVisible();
    return page.getByRole('navigation', { name: 'Accès rapides' });
  }

  test('au bureau : aucune barre, le bouton « Menu » seul', async ({ page, isMobile }) => {
    test.skip(isMobile, 'cas du bureau');
    // Sous le seuil du rail latéral ([[D-447]] §1) : de 768 à 1 023 px, le
    // bouton reste seul ; au-delà, le rail le remplace.
    await page.setViewportSize({ width: 1000, height: 800 });
    const barre = await surLeSuivi(page);
    await expect(barre).toBeHidden();
  });

  test.describe('sur téléphone', () => {
    test.skip(({ isMobile }) => !isMobile, 'la barre ne sert que sous 768 px');

    test('Accueil, Carnet, Suivi ; la page active est marquée ; un lien suivi la déplace', async ({ page }) => {
      const barre = await surLeSuivi(page);
      await expect(barre).toBeVisible();
      await expect(barre.getByRole('link').nth(0)).toHaveText('Accueil');
      await expect(barre.getByRole('link').nth(1)).toHaveText('Carnet');
      await expect(barre.getByRole('link').nth(2)).toHaveText('Suivi');
      await expect(barre.locator('[aria-current]')).toHaveCount(1);
      await expect(barre.locator('[aria-current="page"]')).toHaveText('Suivi');
      for (const lien of await barre.getByRole('link').all()) {
        const boite = await lien.boundingBox();
        expect(boite?.height ?? 0, (await lien.textContent()) ?? '').toBeGreaterThanOrEqual(44);
      }
      await barre.getByRole('link', { name: 'Carnet', exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`/portail/${PATIENT.idPatient}/alimentation$`));
      await expect(page.getByRole('heading', { name: 'Mon carnet alimentaire' })).toBeVisible();
      await expect(barre.locator('[aria-current="page"]')).toHaveText('Carnet');
    });

    test('en fin de défilement, le pied d’urgence est lu en entier au-dessus de la barre', async ({ page }) => {
      const barre = await surLeSuivi(page);
      await expect(barre).toBeVisible();
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      const pied = page.getByRole('contentinfo');
      const boitePied = await pied.boundingBox();
      const boiteBarre = await barre.boundingBox();
      expect(boitePied && boiteBarre).toBeTruthy();
      // Un demi-pixel d'arrondi au plus (défilement entier, hauteurs en `rem`) :
      // jamais la bordure de la barre, comptée dans la réserve.
      expect(boitePied!.y + boitePied!.height).toBeLessThanOrEqual(boiteBarre!.y + 0.5);
      // Le numéro reçoit bien le clic : rien ne le recouvre.
      const numero = pied.getByRole('link', { name: '3114' });
      const recouvert = await numero.evaluate(el => {
        const r = el.getBoundingClientRect();
        const dessus = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return !(dessus === el || el.contains(dessus));
      });
      expect(recouvert).toBe(false);
    });

    test('la barre ne s’imprime pas', async ({ page }) => {
      const barre = await surLeSuivi(page);
      await expect(barre).toBeVisible();
      await page.emulateMedia({ media: 'print' });
      await expect(barre).toBeHidden();
      await page.emulateMedia({ media: 'screen' });
    });

    test('confort de lecture 112,5 % : cibles agrandies, aucun débordement', async ({ page }) => {
      await page.addInitScript(() => {
        window.localStorage.setItem('wellneuro:portail:confort', JSON.stringify({ texteAgrandi: true, espacementRenforce: true }));
      });
      const barre = await surLeSuivi(page);
      await expect(page.locator('html')).toHaveAttribute('data-reading-comfort', 'large');
      await expect(barre).toBeVisible();
      for (const lien of await barre.getByRole('link').all()) {
        expect((await lien.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(49);
        // Une ligne par case : la hauteur du libellé ne dépasse pas une ligne.
        const lignes = await lien.locator('span').evaluate(el => {
          const style = getComputedStyle(el);
          return Math.round(el.getBoundingClientRect().height / parseFloat(style.lineHeight));
        });
        expect(lignes).toBeLessThanOrEqual(1);
      }
      const debordement = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(debordement).toBeLessThanOrEqual(0);
    });

    test('barre sur le hub : axe (WCAG 2.1 AA)', async ({ page }) => {
      await page.goto(`/portail/${PATIENT.idPatient}/questionnaires`);
      await expect(page.getByRole('heading', { name: 'Mon parcours' })).toBeVisible();
      const barre = page.getByRole('navigation', { name: 'Accès rapides' });
      await expect(barre.locator('[aria-current="page"]')).toHaveText('Accueil');
      const { violations } = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
      expect(violations.map(v => `${v.id} (${v.impact}) : ${v.nodes.map(n => n.target.join(' ')).join(' | ')}`)).toEqual([]);
    });
  });
});
