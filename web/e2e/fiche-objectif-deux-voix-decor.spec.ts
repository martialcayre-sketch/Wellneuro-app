// Séparateur des deux voix de l'objectif négocié (lot PRA-3b décor ;
// [[D-481]] §1 bis, prototype validé « Q1a — Q2a — Q3a » le 2026-11-28,
// question 20261127-2220-d). Réception du lot, au bureau (Chromium) et au
// téléphone (WebKit) :
// - un `divider-two-voices` entre « Le patient » et « Le praticien a
//   compris » de la version courante, 320 px au plus ;
// - hors de l'arbre d'accessibilité, absent à l'impression, où les deux
//   intitulés restent ;
// - à 195 px, gardé, sans débordement horizontal.
// La pose (version courante seulement, et seulement avec une reformulation)
// est épinglée en Vitest (`ObjectifNegociePanel.test.tsx`), les règles de la
// primitive aussi (`components/ui/LienDecor.test.tsx`).
//
// Dossier de fixture Sophie Nicola (PAT_SEED_01) : l'objectif est provisionné
// puis nettoyé par ce spec, comme les autres specs des deux voix.
import { test, expect, type Page } from '@playwright/test';
import { PRATICIEN_EMAIL, praticienSessionCookie } from './helpers/auth';
import { closePrisma, nettoyerDossierDeuxVoix, provisionnerDossierDeuxVoix } from './helpers/db';

const ID_PATIENT = 'PAT_SEED_01';
const FICHE = `/dashboard/patients/${ID_PATIENT}`;
const SEPARATEUR = '[data-lien-decor="deux-voix"]';

async function ouvrirObjectif(page: Page) {
  await page.context().addCookies([await praticienSessionCookie(PRATICIEN_EMAIL)]);
  await page.goto(FICHE);
  await expect(page.getByRole('heading', { level: 1, name: 'Sophie Nicola' })).toBeVisible();
  await page.getByRole('tablist', { name: 'Cycle clinique' }).getByRole('tab', { name: /Compréhension/ }).click();
  await page.getByRole('button', { name: 'Objectif négocié' }).click();
  await expect(page.getByText('Le praticien a compris', { exact: true })).toBeVisible();
}

const intitule = (page: Page, texte: string) => page.getByText(texte, { exact: true });

test.describe.serial('Fiche — séparateur des deux voix de l’objectif (PRA-3b)', () => {
  test.beforeAll(async () => {
    await provisionnerDossierDeuxVoix(ID_PATIENT);
  });

  test.afterAll(async () => {
    await nettoyerDossierDeuxVoix(ID_PATIENT);
    await closePrisma();
  });

  test('entre les deux voix, hors de l’accessibilité, absent à l’impression où les intitulés restent', async ({
    page,
  }) => {
    await ouvrirObjectif(page);
    const separateur = page.locator(SEPARATEUR);
    await expect(separateur).toHaveCount(1);
    await expect(separateur).toBeVisible();
    await expect(separateur).toHaveAttribute('data-element', 'divider-two-voices');
    await expect(separateur).toHaveAttribute('aria-hidden', 'true');

    const patient = intitule(page, 'Le patient');
    const praticien = intitule(page, 'Le praticien a compris');
    const [bPatient, bSep, bPraticien] = await Promise.all([
      patient.boundingBox(),
      separateur.boundingBox(),
      praticien.boundingBox(),
    ]);
    expect(bPatient && bSep && bPraticien).toBeTruthy();
    expect(bSep!.y).toBeGreaterThan(bPatient!.y + bPatient!.height);
    expect(bSep!.y + bSep!.height).toBeLessThanOrEqual(bPraticien!.y);
    expect(bSep!.width).toBeLessThanOrEqual(320.5);

    await page.emulateMedia({ media: 'print' });
    await expect(separateur).toBeHidden();
    await expect(patient).toBeVisible();
    await expect(praticien).toBeVisible();
    await page.emulateMedia({ media: 'screen' });
    await expect(separateur).toBeVisible();
  });

  test('195 px : gardé, dans sa carte, sans débordement horizontal', async ({ page, isMobile }) => {
    test.skip(isMobile, 'largeur fixée au bureau');
    await page.setViewportSize({ width: 195, height: 800 });
    await ouvrirObjectif(page);
    const separateur = page.locator(SEPARATEUR);
    await expect(separateur).toBeVisible();
    const largeurs = await separateur.evaluate((noeud) => ({
      separateur: noeud.getBoundingClientRect().width,
      parent: (noeud.parentElement as HTMLElement).getBoundingClientRect().width,
      debordement: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    }));
    expect(largeurs.separateur).toBeGreaterThan(0);
    expect(largeurs.separateur).toBeLessThanOrEqual(largeurs.parent + 0.5);
    expect(largeurs.debordement).toBeLessThanOrEqual(0);
  });
});
