// Mécanisme ModeConsultation (HC-F LOT-03) : enveloppe de bascule de mise en
// page sur la fiche patient, sans logique clinique propre. Patient fictif
// Sophie Nicola (PAT_SEED_01, déjà seedé — pas besoin d'un parcours complet).
import { test, expect } from '@playwright/test';
import { praticienSessionCookie } from './helpers/auth';

const PATIENT_ID = 'PAT_SEED_01';

test.describe('Mode consultation (fiche patient)', () => {
  test('affiche le cockpit prudent avant les couvertures sur bureau, tablette et mobile', async ({ page, context }) => {
    await context.addCookies([await praticienSessionCookie()]);
    for (const viewport of [
      { width: 1280, height: 800 },
      { width: 900, height: 1024 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto(`/dashboard/patients/${PATIENT_ID}`);
      const missing = page.getByRole('heading', { name: 'Données manquantes' });
      const decision = page.getByRole('heading', { name: 'Décision clinique' });
      const protocol = page.getByRole('heading', { name: 'Protocole 21 jours' });
      const closing = page.getByRole('heading', { name: 'Clôture et aperçu patient' });
      const coverage = page.getByRole('heading', { name: 'Couverture des 12 besoins' });
      await expect(missing).toBeVisible();
      await expect(decision).toBeVisible();
      await expect(page.getByText('Décision clinique non préparée')).toBeVisible();
      await expect(protocol).toBeVisible();
      await expect(page.getByText('Protocole indisponible — priorité praticien non sélectionnée')).toBeVisible();
      await expect(closing).toBeVisible();
      await expect(page.getByText(/Aperçu du protocole indisponible/)).toBeVisible();
      await expect(coverage).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
      const modeButtonBox = await page.getByRole('button', { name: 'Mode consultation' }).boundingBox();
      expect(modeButtonBox?.height).toBeGreaterThanOrEqual(44);
      const headings = await page.locator('h3').allTextContents();
      expect(headings.indexOf('Données manquantes')).toBeLessThan(headings.indexOf('Décision clinique'));
      expect(headings.indexOf('Décision clinique')).toBeLessThan(headings.indexOf('Protocole 21 jours'));
      expect(headings.indexOf('Protocole 21 jours')).toBeLessThan(headings.indexOf('Clôture et aperçu patient'));
      expect(headings.indexOf('Clôture et aperçu patient')).toBeLessThan(headings.indexOf('Couverture des 12 besoins'));
    }
  });

  test('bascule la mise en page et revient à l\'état initial', async ({ page, context }) => {
    await context.addCookies([await praticienSessionCookie()]);
    await page.goto(`/dashboard/patients/${PATIENT_ID}`);

    const activer = page.getByRole('button', { name: 'Mode consultation' });
    await expect(activer).toBeVisible();

    const fiche = page.locator('[data-mode-consultation]');
    await expect(fiche).toHaveCount(0);

    const mutatingRequests: string[] = [];
    page.on('request', request => {
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method())) mutatingRequests.push(request.url());
    });
    await activer.focus();
    await page.keyboard.press('Enter');

    const ficheActive = page.locator('[data-mode-consultation="actif"]');
    await expect(ficheActive).toBeVisible();
    await expect(activer).toBeHidden();

    const quitter = page.getByRole('button', { name: 'Quitter' });
    const quitBox = await quitter.boundingBox();
    expect(quitBox?.height).toBeGreaterThanOrEqual(44);
    await quitter.focus();
    await page.keyboard.press('Enter');

    await expect(page.locator('[data-mode-consultation]')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Mode consultation' })).toBeVisible();
    expect(mutatingRequests).toEqual([]);
  });
});
