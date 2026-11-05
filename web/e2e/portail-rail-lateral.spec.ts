// Rail latéral du portail ([[D-447]], lot L5 de l'audit « rails et menus »,
// chapitre 11). `WN_PORTAIL_RAIL_LATERAL` et `WN_PORTAIL_MENU` sont armés par
// `playwright.config.ts`. Au bureau (Desktop Chromium) : le rail à la place du
// bouton « Menu », sa page active, les cibles de 44 px, la colonne mesurée à
// 1 024 px en confort 100 % et 112,5 %, le bouton seul à 1 023 px, le panneau
// fermé au seuil, le pied d'urgence, le lien d'évitement, l'impression et `axe`
// sur le hub, où « Autres espaces » reste. Sur iPhone 13 : aucun rail. Les cas
// d'âge, de murs, de chemin (questionnaire en cours) et de clôture sont
// épinglés en Vitest (`components/patient/rail/RailMonEspace.test.tsx`).
//
// Patient fictif Sophie Nicola (PAT_SEED_01), majeure. Lecture seule, hors
// l'accusé d'entrée que posent déjà les autres specs du hub.
import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { accuserPorteTrust, closePrisma } from './helpers/db';
import { patientPortailSessionCookie } from './helpers/auth';

const PATIENT = { idPatient: 'PAT_SEED_01', email: 'sophie.nicola@fictif.wellneuro.fr' };

test.describe('Portail — rail latéral', () => {
  test.beforeAll(async () => {
    // Sans l'accusé, « Avant de commencer » est requis et le rail n'existe pas.
    await accuserPorteTrust(PATIENT.idPatient);
  });

  test.afterAll(async () => {
    await closePrisma();
  });

  test.beforeEach(async ({ context }) => {
    await context.addCookies([patientPortailSessionCookie(PATIENT.idPatient, PATIENT.email)]);
  });

  const rail = (page: Page) => page.getByRole('navigation', { name: 'Mon espace' });
  const bouton = (page: Page) => page.getByRole('button', { name: 'Menu', exact: true });

  async function surLeSuivi(page: Page) {
    await page.goto(`/portail/${PATIENT.idPatient}/suivi`);
    // Une entrée sondée au moins : la liste est complète avant toute mesure.
    await expect(rail(page).getByRole('link', { name: 'Ouvrir mon dossier à deux voix', exact: true })).toBeVisible();
    return rail(page);
  }

  test('sur téléphone : aucun rail, le bouton « Menu »', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'cas du téléphone');
    await page.goto(`/portail/${PATIENT.idPatient}/suivi`);
    await expect(bouton(page)).toBeVisible();
    await expect(rail(page)).toHaveCount(0);
  });

  test.describe('au bureau', () => {
    test.skip(({ isMobile }) => isMobile, 'le rail ne sert que dès 1 024 px');

    test('le rail remplace le bouton ; « Mon parcours » en tête, la page active marquée ; cibles de 44 px', async ({ page }) => {
      const nav = await surLeSuivi(page);
      await expect(bouton(page)).toBeHidden();
      await expect(nav.getByRole('link').first()).toHaveText('Mon parcours');
      await expect(nav.locator('[aria-current]')).toHaveCount(1);
      await expect(nav.locator('[aria-current="page"]')).toHaveText('Ouvrir mes rendez-vous de suivi');
      for (const lien of await nav.getByRole('link').all()) {
        const boite = await lien.boundingBox();
        expect(boite?.height ?? 0, (await lien.textContent()) ?? '').toBeGreaterThanOrEqual(44);
      }
      await nav.getByRole('link', { name: 'Ouvrir Mon carnet alimentaire' }).click();
      await expect(page).toHaveURL(new RegExp(`/portail/${PATIENT.idPatient}/alimentation$`));
      await expect(page.getByRole('heading', { name: 'Mon carnet alimentaire' })).toBeVisible();
      await expect(nav.locator('[aria-current="page"]')).toHaveText('Ouvrir Mon carnet alimentaire');
    });

    for (const [confort, largeurRail, colonne] of [
      ['100 %', 252, 668],
      ['112,5 %', 283.5, 623.5],
    ] as const) {
      test(`à 1 024 px, confort ${confort} : rail de ${largeurRail} px, colonne de ${colonne} px`, async ({ page }) => {
        if (confort !== '100 %') {
          await page.addInitScript(() => {
            window.localStorage.setItem('wellneuro:portail:confort', JSON.stringify({ texteAgrandi: true, espacementRenforce: false }));
          });
        }
        await page.setViewportSize({ width: 1024, height: 800 });
        const nav = await surLeSuivi(page);
        const mesures = await page.evaluate(() => {
          const main = document.querySelector('main')!;
          const style = getComputedStyle(main);
          return {
            vue: document.documentElement.clientWidth,
            rail: document.querySelector('nav[aria-label="Mon espace"]')!.getBoundingClientRect().width,
            // `getBoundingClientRect`, pas `clientWidth`, qui arrondit au pixel entier.
            colonne: main.getBoundingClientRect().width - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight),
          };
        });
        expect(mesures.rail).toBeCloseTo(largeurRail, 1);
        // La colonne suit la mise en page du shell praticien ([[D-447]] §6) :
        // vue − rail − `gap-6` − `px-6` de chaque côté − `px-4` du `main`.
        // Une barre de défilement classique la réduirait d'autant que la vue.
        expect(mesures.colonne).toBeCloseTo(colonne - (1024 - mesures.vue), 1);
        await expect(nav).toBeVisible();
        const debordement = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        expect(debordement).toBeLessThanOrEqual(0);
      });
    }

    test('à 1 023 px : le bouton seul ; ouvert, le panneau se ferme quand la largeur atteint 1 024 px', async ({ page }) => {
      await page.setViewportSize({ width: 1023, height: 800 });
      await page.goto(`/portail/${PATIENT.idPatient}/suivi`);
      await expect(bouton(page)).toBeVisible();
      await expect(rail(page)).toHaveCount(0);
      await bouton(page).click();
      const panneau = page.getByRole('dialog', { name: 'Mon espace' });
      await expect(panneau).toBeVisible();
      await page.setViewportSize({ width: 1024, height: 800 });
      await expect(panneau).toHaveCount(0);
      await expect(bouton(page)).toBeHidden();
      await expect(rail(page)).toBeVisible();
      // Le bouton n'est plus affiché : le focus va au contenu, pas sur `body`.
      await expect(page.locator('main#contenu')).toBeFocused();
    });

    test('jamais sur le pied d’urgence ; le lien d’évitement passe le rail', async ({ page, browserName }) => {
      await surLeSuivi(page);
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      const numero = page.getByRole('contentinfo').getByRole('link', { name: '3114' });
      await expect(numero).toBeVisible();
      const recouvert = await numero.evaluate(el => {
        const r = el.getBoundingClientRect();
        const dessus = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return !(dessus === el || el.contains(dessus));
      });
      expect(recouvert).toBe(false);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.keyboard.press(browserName === 'webkit' ? 'Alt+Tab' : 'Tab');
      await expect(page.getByRole('link', { name: 'Aller au contenu' })).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(page.locator('main#contenu')).toBeFocused();
    });

    test('le rail ne s’imprime pas', async ({ page }) => {
      const nav = await surLeSuivi(page);
      await page.emulateMedia({ media: 'print' });
      await expect(nav).toBeHidden();
      await page.emulateMedia({ media: 'screen' });
    });

    test('sur le hub, le rail et « Autres espaces » ; axe (WCAG 2.1 AA)', async ({ page }) => {
      await page.goto(`/portail/${PATIENT.idPatient}/questionnaires`);
      await expect(page.getByRole('heading', { name: 'Mon parcours' })).toBeVisible();
      await expect(rail(page).locator('[aria-current="page"]')).toHaveText('Mon parcours');
      const autres = page.getByRole('navigation', { name: 'Autres espaces' });
      await expect(autres.getByRole('link', { name: 'Ouvrir mon dossier à deux voix', exact: true })).toBeVisible();
      await expect(rail(page).getByRole('link', { name: 'Ouvrir mon dossier à deux voix', exact: true })).toBeVisible();
      const { violations } = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
      expect(violations.map(v => `${v.id} (${v.impact}) : ${v.nodes.map(n => n.target.join(' ')).join(' | ')}`)).toEqual([]);
    });
  });
});
