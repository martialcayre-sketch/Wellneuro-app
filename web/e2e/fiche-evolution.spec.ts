// Onglet « Évolution » (OF-2, D-560). Patient fictif Sophie Nicola
// (PAT_SEED_01, déjà seedé) : aucun épisode confirmé, ce qui rend l'état vide
// vérifiable tel quel. Le parcours prouve le MÉCANISME — l'onglet s'ouvre,
// porte l'encart des refus, distingue l'état vide d'une erreur ; il ne décrit
// aucun parcours réel (D-125).
import { test, expect } from '@playwright/test';
import { praticienSessionCookie } from './helpers/auth';

const PATIENT_ID = 'PAT_SEED_01';

test.describe('Fiche patient — onglet Évolution', () => {
  test('l’onglet porte l’encart des refus et distingue l’état vide d’une erreur', async ({ page, context }) => {
    await context.addCookies([await praticienSessionCookie()]);
    await page.goto(`/dashboard/patients/${PATIENT_ID}`);

    const onglets = page.getByRole('tablist', { name: 'Vues de la fiche patient' });
    const onglet = onglets.getByRole('tab', { name: 'Évolution' });
    // Cible tactile : garde-fou d'accessibilité 5.0 (≥ 44 px).
    expect((await onglet.boundingBox())?.height).toBeGreaterThanOrEqual(44);
    await onglet.click();
    await expect(onglet).toHaveAttribute('aria-selected', 'true');

    const panneau = page.locator('#panneau-evolution');
    await expect(panneau.getByRole('heading', { name: 'Évolution', level: 2 })).toBeVisible();

    // D-560 §4 : l'encart, sur la surface même.
    const encart = panneau.getByRole('complementary', { name: 'Ce que cette vue ne calcule pas' });
    await expect(encart).toBeVisible();
    await expect(encart.getByRole('listitem')).toHaveCount(5);

    // Sans épisode confirmé : état vide explicite, jamais une erreur déguisée.
    await expect(panneau.getByText('Aucun épisode confirmé pour l’instant.')).toBeVisible();
    await expect(panneau.getByRole('heading', { name: 'Biologie, par date de prélèvement' })).toBeVisible();
    await expect(panneau.getByText(/n’a pas pu être lue|n’ont pas pu être lues/)).toHaveCount(0);
  });

  test('le deep-link ?onglet=evolution ouvre l’onglet', async ({ page, context }) => {
    await context.addCookies([await praticienSessionCookie()]);
    await page.goto(`/dashboard/patients/${PATIENT_ID}?onglet=evolution`);
    const onglet = page.getByRole('tablist', { name: 'Vues de la fiche patient' }).getByRole('tab', { name: 'Évolution' });
    await expect(onglet).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#panneau-evolution').getByRole('complementary', { name: 'Ce que cette vue ne calcule pas' })).toBeVisible();
  });
});
