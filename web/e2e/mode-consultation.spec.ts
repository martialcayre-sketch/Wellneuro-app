// Mécanisme ModeConsultation (HC-F LOT-03) : enveloppe de bascule de mise en
// page sur la fiche patient, sans logique clinique propre. Patient fictif
// Sophie Nicola (PAT_SEED_01, déjà seedé — pas besoin d'un parcours complet).
import { test, expect } from '@playwright/test';
import { praticienSessionCookie } from './helpers/auth';

const PATIENT_ID = 'PAT_SEED_01';

test.describe('Mode consultation (fiche patient)', () => {
  test('bascule la mise en page et revient à l\'état initial', async ({ page, context }) => {
    await context.addCookies([await praticienSessionCookie()]);
    await page.goto(`/dashboard/patients/${PATIENT_ID}`);

    const activer = page.getByRole('button', { name: 'Mode consultation' });
    await expect(activer).toBeVisible();

    const fiche = page.locator('[data-mode-consultation]');
    await expect(fiche).toHaveCount(0);

    await activer.click();

    const ficheActive = page.locator('[data-mode-consultation="actif"]');
    await expect(ficheActive).toBeVisible();
    await expect(activer).toBeHidden();

    await page.getByRole('button', { name: 'Quitter' }).click();

    await expect(page.locator('[data-mode-consultation]')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Mode consultation' })).toBeVisible();
  });
});
