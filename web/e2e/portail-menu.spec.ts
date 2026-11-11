// Menu patient « Mon espace » ([[D-442]], lot L3 de l'audit « rails et menus »,
// chapitre 11). `WN_PORTAIL_MENU` est armé par `playwright.config.ts`. Sur les
// deux projets (Desktop Chromium et iPhone 13) : le bouton « Menu » sur une
// sous-page, le panneau et sa page active, Échap et le focus rendu, un lien
// suivi, les cibles de 44 px, le lien d'évitement, le mot-symbole, l'impression,
// le confort 112,5 % et `axe`. Les cas d'âge, de murs et de clôture sont
// épinglés en Vitest (`components/patient/menu/MenuMonEspace.test.tsx`).
//
// Au bureau, le projet Desktop Chromium passe à 1 000 px : dès 1 024 px, le rail
// latéral remplace le bouton ([[D-447]] §1, `WN_PORTAIL_RAIL_LATERAL` armé), et
// le bouton se teste dans la bande de 768 à 1 023 px où il reste seul.
//
// Patient fictif Sophie Nicola (PAT_SEED_01), majeure. Lecture seule, hors
// l'accusé d'entrée que posent déjà les autres specs du hub.
import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { accuserPorteTrust, closePrisma } from './helpers/db';
import { patientPortailSessionCookie } from './helpers/auth';

const PATIENT = { idPatient: 'PAT_SEED_01', email: 'sophie.nicola@fictif.wellneuro.fr' };

test.describe('Portail — menu « Mon espace »', () => {
  test.beforeAll(async () => {
    // Sans l'accusé, « Avant de commencer » est requis et le menu n'existe pas.
    await accuserPorteTrust(PATIENT.idPatient);
  });

  test.afterAll(async () => {
    await closePrisma();
  });

  test.beforeEach(async ({ context, page, isMobile }) => {
    await context.addCookies([patientPortailSessionCookie(PATIENT.idPatient, PATIENT.email)]);
    if (!isMobile) await page.setViewportSize({ width: 1000, height: 800 });
  });

  async function surLeSuivi(page: Page) {
    await page.goto(`/portail/${PATIENT.idPatient}/suivi`);
    const bouton = page.getByRole('button', { name: 'Menu', exact: true });
    await expect(bouton).toBeVisible();
    return bouton;
  }

  test('le bouton ouvre « Mon espace » ; la page active est marquée ; Échap rend le focus', async ({ page }) => {
    const bouton = await surLeSuivi(page);
    await bouton.click();
    const panneau = page.getByRole('dialog', { name: 'Mon espace' });
    await expect(panneau).toBeVisible();
    const nav = panneau.getByRole('navigation', { name: 'Mon espace' });
    await expect(nav.getByRole('link').first()).toHaveText('Mon parcours');
    await expect(nav.locator('[aria-current]')).toHaveCount(1);
    await expect(nav.locator('[aria-current="page"]')).toHaveText('Ouvrir mes rendez-vous de suivi');
    await page.keyboard.press('Escape');
    await expect(panneau).toHaveCount(0);
    await expect(bouton).toBeFocused();
  });

  test('chaque cible du panneau fait 44 px au moins ; un lien suivi referme le panneau', async ({ page }) => {
    const bouton = await surLeSuivi(page);
    const boiteBouton = await bouton.boundingBox();
    expect(boiteBouton?.height ?? 0).toBeGreaterThanOrEqual(44);
    await bouton.click();
    const panneau = page.getByRole('dialog', { name: 'Mon espace' });
    // Une entrée sondée au moins avant de mesurer.
    await expect(panneau.getByRole('link', { name: 'Ouvrir mon dossier à deux voix', exact: true })).toBeVisible();
    for (const lien of await panneau.getByRole('link').all()) {
      const boite = await lien.boundingBox();
      expect(boite?.height ?? 0, (await lien.textContent()) ?? '').toBeGreaterThanOrEqual(44);
    }
    await panneau.getByRole('link', { name: 'Ouvrir mon carnet alimentaire' }).click();
    await expect(page).toHaveURL(new RegExp(`/portail/${PATIENT.idPatient}/alimentation$`));
    await expect(page.getByRole('heading', { name: 'Mon carnet alimentaire' })).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('le lien d’évitement ouvre la page et mène au contenu ; le mot-symbole mène au hub', async ({ page, browserName }) => {
    await surLeSuivi(page);
    await page.keyboard.press(browserName === 'webkit' ? 'Alt+Tab' : 'Tab');
    const evitement = page.getByRole('link', { name: 'Aller au contenu' });
    await expect(evitement).toBeFocused();
    await expect(evitement).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(page.locator('main#contenu')).toBeFocused();
    await page.getByRole('link', { name: 'Wellneuro' }).click();
    await expect(page).toHaveURL(new RegExp(`/portail/${PATIENT.idPatient}/questionnaires$`));
    await expect(page.getByRole('heading', { name: 'Mon parcours' })).toBeVisible();
  });

  test('le pied d’urgence reste visible ; rien du menu ne s’imprime', async ({ page }) => {
    await surLeSuivi(page);
    await expect(page.getByRole('contentinfo').getByRole('link', { name: '3114' })).toBeVisible();
    await page.emulateMedia({ media: 'print' });
    await expect(page.getByRole('button', { name: 'Menu', exact: true })).toBeHidden();
    await page.emulateMedia({ media: 'screen' });
  });

  test('confort de lecture 112,5 % : cibles agrandies, panneau lisible', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('wellneuro:portail:confort', JSON.stringify({ texteAgrandi: true, espacementRenforce: false }));
    });
    const bouton = await surLeSuivi(page);
    await expect(page.locator('html')).toHaveAttribute('data-reading-comfort', 'large');
    await bouton.click();
    const panneau = page.getByRole('dialog', { name: 'Mon espace' });
    const parcours = panneau.getByRole('link', { name: 'Mon parcours' });
    expect((await parcours.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(49);
    const debordement = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(debordement).toBeLessThanOrEqual(0);
  });

  test('panneau ouvert sur le hub : axe (WCAG 2.1 AA)', async ({ page }) => {
    await page.goto(`/portail/${PATIENT.idPatient}/questionnaires`);
    await expect(page.getByRole('heading', { name: 'Mon parcours' })).toBeVisible();
    await page.getByRole('button', { name: 'Menu', exact: true }).click();
    const panneau = page.getByRole('dialog', { name: 'Mon espace' });
    await expect(panneau.locator('[aria-current="page"]')).toHaveText('Mon parcours');
    await expect(panneau.getByRole('link', { name: 'Ouvrir mon dossier à deux voix', exact: true })).toBeVisible();
    const { violations } = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(violations.map(v => `${v.id} (${v.impact}) : ${v.nodes.map(n => n.target.join(' ')).join(' | ')}`)).toEqual([]);
  });
});
