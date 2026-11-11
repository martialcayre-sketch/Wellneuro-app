// « Autres espaces » rangés en groupes ([[D-423]] §2, lot L2 de l'audit « rails
// et menus », chapitre 11). Les rendez-vous de suivi et le carnet n'étaient
// atteints par clic dans aucun E2E (EP-17) : ce spec les ouvre depuis le groupe
// « Au jour le jour » du hub, sur les deux projets (Desktop Chromium et
// iPhone 13), et épingle la cible de 44 px des liens de liste (Q17).
// Dès 1 024 px, rail servi, « Autres espaces » n'est plus rendu ([[D-483]] §2) :
// au bureau, la page est vue à 1 023 px, la plus grande largeur où il reste.
//
// Patient fictif Sophie Nicola (PAT_SEED_01). Lecture seule, hors l'accusé
// d'entrée que posent déjà les autres specs du hub.
import { test, expect, type Page } from '@playwright/test';
import { accuserPorteTrust, closePrisma } from './helpers/db';
import { patientPortailSessionCookie } from './helpers/auth';

const PATIENT = { idPatient: 'PAT_SEED_01', email: 'sophie.nicola@fictif.wellneuro.fr' };

test.describe('Portail — « Autres espaces » en groupes', () => {
  test.beforeAll(async () => {
    // Sans l'accusé, le hub rend « Avant de commencer » et la nav n'existe pas.
    await accuserPorteTrust(PATIENT.idPatient);
  });

  test.afterAll(async () => {
    await closePrisma();
  });

  test.beforeEach(async ({ context, page, isMobile }) => {
    await context.addCookies([patientPortailSessionCookie(PATIENT.idPatient, PATIENT.email)]);
    if (!isMobile) await page.setViewportSize({ width: 1023, height: 800 });
  });

  async function auJourLeJour(page: Page) {
    await page.goto(`/portail/${PATIENT.idPatient}/questionnaires`);
    await expect(page.getByRole('heading', { name: 'Mon parcours' })).toBeVisible();
    return page.getByRole('navigation', { name: 'Autres espaces' }).getByRole('list', { name: 'Au jour le jour' });
  }

  test('l’ancre et les liens de la nav ont une cible de 44 px au moins', async ({ page }) => {
    await auJourLeJour(page);
    const nav = page.getByRole('navigation', { name: 'Autres espaces' });
    const ancre = nav.getByRole('link', { name: 'Mon parcours', exact: true });
    await expect(ancre).toHaveAttribute('aria-current', 'page');
    // Une entrée sondée au moins (drapeau armé dans `playwright.config.ts`) :
    // sans cette attente, la mesure pourrait partir avant toute sonde.
    await expect(nav.getByRole('link', { name: 'Ouvrir mon dossier à deux voix', exact: true })).toBeVisible();
    const liens = await nav.getByRole('link').all();
    expect(liens.length).toBeGreaterThanOrEqual(3);
    for (const lien of liens) {
      const boite = await lien.boundingBox();
      expect(boite?.height ?? 0, (await lien.textContent()) ?? '').toBeGreaterThanOrEqual(44);
    }
  });

  test('« Au jour le jour » mène au point de suivi, et le retour au hub', async ({ page }) => {
    const groupe = await auJourLeJour(page);
    await groupe.getByRole('link', { name: 'Ouvrir mon point de suivi' }).click();
    await expect(page).toHaveURL(new RegExp(`/portail/${PATIENT.idPatient}/suivi$`));
    await page.getByRole('link', { name: '← Mon parcours' }).click();
    await expect(page).toHaveURL(new RegExp(`/portail/${PATIENT.idPatient}/questionnaires$`));
    await expect(page.getByRole('heading', { name: 'Mon parcours' })).toBeVisible();
  });

  test('« Au jour le jour » mène au carnet alimentaire', async ({ page }) => {
    const groupe = await auJourLeJour(page);
    await groupe.getByRole('link', { name: 'Ouvrir mon carnet alimentaire' }).click();
    await expect(page).toHaveURL(new RegExp(`/portail/${PATIENT.idPatient}/alimentation$`));
    await expect(page.getByRole('heading', { name: 'Mon carnet alimentaire' })).toBeVisible();
  });
});
