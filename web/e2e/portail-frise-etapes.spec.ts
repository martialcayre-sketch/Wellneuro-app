// Frise des six étapes, navigable ([[D-423]] §8, lot L2b de l'audit « rails et
// menus », chapitre 11). `WN_PORTAIL_FRISE_NAVIGABLE` est armé par
// `playwright.config.ts`. Sur les deux projets (Desktop Chromium et iPhone 13) :
// la nav nommée, un seul `aria-current="step"`, des cibles de 44 px, la frise qui
// défile sans faire déborder la page à 390 px, le clic sur « Questionnaires »,
// et `axe` sur le hub. Les cibles des étapes 5 et 6, état par état, sont
// épinglées en Vitest (`questionnaires/frise.cablage.test.tsx`).
//
// Patient fictif Sophie Nicola (PAT_SEED_01). Lecture seule, hors l'accusé
// d'entrée que posent déjà les autres specs du hub.
import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { accuserPorteTrust, closePrisma } from './helpers/db';
import { patientPortailSessionCookie } from './helpers/auth';

const PATIENT = { idPatient: 'PAT_SEED_01', email: 'sophie.nicola@fictif.wellneuro.fr' };
const LIBELLES = ['Consentement', 'Informations', 'Situation', 'Questionnaires', 'Analyse du praticien', 'Restitution'];

test.describe('Portail — frise des étapes navigable', () => {
  test.beforeAll(async () => {
    // Sans l'accusé, le hub rend « Avant de commencer » et la frise n'existe pas.
    await accuserPorteTrust(PATIENT.idPatient);
  });

  test.afterAll(async () => {
    await closePrisma();
  });

  test.beforeEach(async ({ context }) => {
    await context.addCookies([patientPortailSessionCookie(PATIENT.idPatient, PATIENT.email)]);
  });

  async function frise(page: Page) {
    await page.goto(`/portail/${PATIENT.idPatient}/questionnaires`);
    await expect(page.getByRole('heading', { name: 'Mon parcours' })).toBeVisible();
    return page.getByRole('navigation', { name: 'Étapes de votre parcours' });
  }

  test('une nav nommée, six étapes dans l’ordre, une seule étape courante', async ({ page }) => {
    const nav = await frise(page);
    const items = nav.getByRole('listitem');
    await expect(items).toHaveCount(6);
    for (const [index, libelle] of LIBELLES.entries()) {
      await expect(items.nth(index)).toContainText(libelle);
    }
    await expect(nav.locator('[aria-current]')).toHaveCount(1);
    await expect(nav.locator('[aria-current]')).toHaveAttribute('aria-current', 'step');
    // « Autres espaces » garde son propre élément courant : deux navigations,
    // deux questions.
    await expect(page.getByRole('navigation', { name: 'Autres espaces' }).locator('[aria-current="page"]')).toHaveCount(1);
  });

  test('chaque étape cliquable a une cible de 44 px au moins', async ({ page }) => {
    const nav = await frise(page);
    const cibles = await nav.locator('a, button').all();
    expect(cibles.length).toBeGreaterThanOrEqual(1);
    for (const cible of cibles) {
      await cible.scrollIntoViewIfNeeded();
      const boite = await cible.boundingBox();
      const nom = (await cible.textContent()) ?? '';
      expect(boite?.height ?? 0, nom).toBeGreaterThanOrEqual(44);
      expect(boite?.width ?? 0, nom).toBeGreaterThanOrEqual(44);
    }
  });

  test('la frise défile seule : la page ne déborde pas, la dernière étape s’atteint', async ({ page }) => {
    const nav = await frise(page);
    const debordement = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(debordement).toBeLessThanOrEqual(0);
    // L'étape courante est dans le champ de la frise sans geste du patient.
    const courante = nav.locator('[aria-current="step"]');
    const [boiteCourante, boiteListe] = await Promise.all([courante.boundingBox(), nav.getByRole('list').boundingBox()]);
    expect(boiteCourante!.x).toBeGreaterThanOrEqual(boiteListe!.x - 1);
    expect(boiteCourante!.x + boiteCourante!.width).toBeLessThanOrEqual(boiteListe!.x + boiteListe!.width + 1);
    const derniere = nav.getByRole('listitem').last();
    await derniere.scrollIntoViewIfNeeded();
    await expect(derniere).toBeInViewport();
  });

  test('« Questionnaires » mène à sa cible dans le hub', async ({ page }) => {
    const nav = await frise(page);
    const lien = nav.getByRole('link', { name: /Questionnaires/ });
    const href = await lien.getAttribute('href');
    expect(['#mes-questionnaires', '#mon-parcours']).toContain(href);
    await lien.click();
    await expect(page).toHaveURL(new RegExp(`/portail/${PATIENT.idPatient}/questionnaires${href}$`));
    await expect(page.locator(href!)).toBeInViewport();
  });

  test('le hub, frise navigable comprise, passe axe (WCAG 2.1 AA)', async ({ page }) => {
    await frise(page);
    // Une entrée sondée au moins : la mesure ne part pas avant les sondes.
    await expect(page.getByRole('link', { name: 'Ouvrir mon dossier à deux voix', exact: true })).toBeVisible();
    const { violations } = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(violations.map(v => `${v.id} (${v.impact}) : ${v.nodes.map(n => n.target.join(' ')).join(' | ')}`)).toEqual([]);
  });
});
