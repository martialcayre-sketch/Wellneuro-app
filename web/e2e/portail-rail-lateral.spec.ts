// Rail latéral du portail ([[D-447]], lot L5 de l'audit « rails et menus »,
// chapitre 11). `WN_PORTAIL_RAIL_LATERAL` et `WN_PORTAIL_MENU` sont armés par
// `playwright.config.ts`. Au bureau (Desktop Chromium) : le rail à la place du
// bouton « Menu », sa page active, les cibles de 44 px, la colonne mesurée à
// 1 024 px en confort 100 % et 112,5 %, le bouton seul à 1 023 px, le panneau
// fermé au seuil, le pied d'urgence, le lien d'évitement, l'impression et `axe`
// sur le hub, où « Autres espaces » n'est plus rendu ([[D-483]] §2). Ses trois
// états ([[D-482]], lot PAT-1) : réduit mesuré à 1 024 px en confort 100 % et
// 112,5 %, libellés entiers ; escamoté hors du clavier, le bouton « Menu » qui
// le rouvre ; l'état gardé d'une page à l'autre, perdu au rechargement. Sur
// iPhone 13 : aucun rail. Les cas
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
      await expect(nav.locator('[aria-current="page"]')).toHaveText('Ouvrir mon point de suivi');
      for (const lien of await nav.getByRole('link').all()) {
        const boite = await lien.boundingBox();
        expect(boite?.height ?? 0, (await lien.textContent()) ?? '').toBeGreaterThanOrEqual(44);
      }
      await nav.getByRole('link', { name: 'Ouvrir mon carnet alimentaire' }).click();
      await expect(page).toHaveURL(new RegExp(`/portail/${PATIENT.idPatient}/alimentation$`));
      await expect(page.getByRole('heading', { name: 'Mon carnet alimentaire' })).toBeVisible();
      await expect(nav.locator('[aria-current="page"]')).toHaveText('Ouvrir mon carnet alimentaire');
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
      // Le bouton n'est plus affiché : le focus passe à l'entrée active du rail,
      // pas sur `body`.
      await expect(rail(page).locator('[aria-current="page"]')).toBeFocused();
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

    for (const texteAgrandi of [false, true]) {
      test(`à 1 024 px, confort ${texteAgrandi ? '112,5' : '100'} % : la frise tient à côté du rail, sans défiler`, async ({ page }) => {
        await page.addInitScript(agrandi => {
          window.localStorage.setItem('wellneuro:portail:confort', JSON.stringify({ texteAgrandi: agrandi, espacementRenforce: false }));
        }, texteAgrandi);
        await page.setViewportSize({ width: 1024, height: 800 });
        await page.goto(`/portail/${PATIENT.idPatient}/questionnaires`);
        await expect(rail(page).locator('[aria-current="page"]')).toHaveText('Mon parcours');
        const liste = page.getByRole('navigation', { name: 'Étapes de votre parcours' }).locator('ol');
        const { defile, largeur } = await liste.evaluate(el => ({ defile: el.scrollWidth, largeur: el.clientWidth }));
        expect(defile).toBeLessThanOrEqual(largeur);
        const cibles = await page.getByRole('navigation', { name: 'Étapes de votre parcours' }).locator('[aria-current="step"]').all();
        expect(cibles).toHaveLength(1);
        for (const cible of cibles) {
          expect((await cible.boundingBox())!.height).toBeGreaterThanOrEqual(44);
        }
      });
    }

    test('sur le hub, le rail seul : « Autres espaces » non rendu, la frise reste ; axe (WCAG 2.1 AA)', async ({ page }) => {
      await page.goto(`/portail/${PATIENT.idPatient}/questionnaires`);
      await expect(page.getByRole('heading', { name: 'Mon parcours' })).toBeVisible();
      await expect(rail(page).locator('[aria-current="page"]')).toHaveText('Mon parcours');
      await expect(rail(page).getByRole('link', { name: 'Ouvrir mon dossier à deux voix', exact: true })).toBeVisible();
      await expect(page.getByRole('navigation', { name: 'Autres espaces' })).toBeHidden();
      await expect(page.getByRole('navigation', { name: 'Étapes de votre parcours' })).toBeVisible();
      // Plus d'onglets dans l'en-tête ([[D-483]] §1) : une seule navigation
      // « Mon espace », aucune « Accès rapides » visible.
      await expect(page.getByRole('navigation', { name: 'Accès rapides' })).toBeHidden();
      await expect(page.getByRole('banner').getByRole('navigation')).toHaveCount(0);
      const { violations } = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
      expect(violations.map(v => `${v.id} (${v.impact}) : ${v.nodes.map(n => n.target.join(' ')).join(' | ')}`)).toEqual([]);
    });

    test.describe('trois états ([[D-482]])', () => {
      const commande = (page: Page, nom: string) => rail(page).getByRole('button', { name: nom, exact: true });

      for (const [confort, largeurReduit] of [
        ['100 %', 208],
        ['112,5 %', 234],
      ] as const) {
        test(`réduit à 1 024 px, confort ${confort} : ${largeurReduit} px, libellés entiers, cibles de 44 px`, async ({ page }) => {
          if (confort !== '100 %') {
            await page.addInitScript(() => {
              window.localStorage.setItem('wellneuro:portail:confort', JSON.stringify({ texteAgrandi: true, espacementRenforce: false }));
            });
          }
          await page.setViewportSize({ width: 1024, height: 800 });
          const nav = await surLeSuivi(page);
          const libelles = await nav.getByRole('link').allTextContents();
          await commande(page, 'Réduire le menu').click();
          await expect(commande(page, 'Agrandir le menu')).toBeFocused();
          expect((await nav.boundingBox())!.width).toBeCloseTo(largeurReduit, 1);
          expect(await nav.getByRole('link').allTextContents()).toEqual(libelles);
          for (const cible of [...(await nav.getByRole('link').all()), ...(await nav.getByRole('button').all())]) {
            const nom = (await cible.textContent()) ?? '';
            expect((await cible.boundingBox())!.height, nom).toBeGreaterThanOrEqual(44);
            // Entier : ni coupé ni masqué, passé à la ligne au besoin.
            const coupe = await cible.evaluate(el => [...el.querySelectorAll('span')].some(s => s.scrollWidth > s.clientWidth + 1));
            expect(coupe, nom).toBe(false);
          }
          const debordement = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
          expect(debordement).toBeLessThanOrEqual(0);
          await commande(page, 'Agrandir le menu').click();
          expect((await nav.boundingBox())!.width).toBeCloseTo(confort === '100 %' ? 252 : 283.5, 1);
        });
      }

      test('escamoté : hors de la page et du clavier, la colonne s’élargit ; « Menu » le rouvre déplié', async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 800 });
        const nav = await surLeSuivi(page);
        const colonneAvant = (await page.locator('main').boundingBox())!.width;
        await commande(page, 'Masquer le menu').focus();
        await page.keyboard.press('Enter');
        await expect(rail(page)).toHaveCount(0);
        // Un seul déclencheur visible : le bouton « Menu », qui a le focus.
        await expect(bouton(page)).toBeVisible();
        await expect(bouton(page)).toBeFocused();
        expect((await page.locator('main').boundingBox())!.width).toBeGreaterThan(colonneAvant);
        // Le clavier ne rencontre plus aucune entrée de la liste.
        const parcourus: string[] = [];
        for (let i = 0; i < 25; i += 1) {
          await page.keyboard.press('Tab');
          parcourus.push(await page.evaluate(() => document.activeElement?.textContent?.trim() ?? ''));
        }
        expect(parcourus).not.toContain('Ouvrir mon point de suivi');
        await bouton(page).click();
        await expect(nav).toBeVisible();
        await expect(nav.locator('[aria-current="page"]')).toBeFocused();
        await expect(bouton(page)).toBeHidden();
        await expect(page.getByRole('dialog')).toHaveCount(0);
      });

      test('l’état suit la navigation entre pages, pas le rechargement', async ({ page }) => {
        const nav = await surLeSuivi(page);
        await commande(page, 'Réduire le menu').click();
        await nav.getByRole('link', { name: 'Ouvrir mon carnet alimentaire' }).click();
        await expect(page).toHaveURL(new RegExp(`/portail/${PATIENT.idPatient}/alimentation$`));
        await expect(nav.locator('[aria-current="page"]')).toHaveText('Ouvrir mon carnet alimentaire');
        await expect(commande(page, 'Agrandir le menu')).toBeVisible();
        await commande(page, 'Masquer le menu').click();
        await page.getByRole('banner').getByRole('link', { name: 'Wellneuro' }).click();
        await expect(page).toHaveURL(new RegExp(`/portail/${PATIENT.idPatient}/questionnaires$`));
        await expect(rail(page)).toHaveCount(0);
        await expect(bouton(page)).toBeVisible();
        // Rail escamoté sur le hub : « Autres espaces » reste non rendu, le
        // bouton « Menu » rouvre la liste ([[D-483]] §2).
        await expect(page.getByRole('navigation', { name: 'Autres espaces' })).toBeHidden();
        await page.reload();
        await expect(rail(page)).toBeVisible();
        await expect(commande(page, 'Réduire le menu')).toBeVisible();
        await expect(bouton(page)).toBeHidden();
        // Rien n'est écrit sur l'appareil pour le rail (Q56).
        const cles = await page.evaluate(() => [...Object.keys(localStorage), ...Object.keys(sessionStorage)]);
        expect(cles.filter(cle => /rail|menu/i.test(cle))).toEqual([]);
      });

      test('rail escamoté, à 1 023 px : le seul bouton « Menu » ouvre le panneau', async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 800 });
        await surLeSuivi(page);
        await commande(page, 'Masquer le menu').click();
        await page.setViewportSize({ width: 1023, height: 800 });
        await expect(bouton(page)).toBeVisible();
        await bouton(page).click();
        await expect(page.getByRole('dialog', { name: 'Mon espace' })).toBeVisible();
      });
    });
  });
});
