// Fiche-trajectoire praticien (C2B, index navigable de la Vague 2). Cette
// surface n'avait AUCUNE couverture E2E : ni l'onglet « Trajectoire », ni la
// phase « Réévaluation » du poste de pilotage n'étaient joués par un test de
// bout en bout. Patient fictif Sophie Nicola (PAT_SEED_01, déjà seedé) — il
// n'a aucun épisode confirmé, ce qui rend l'état vide vérifiable tel quel.
import { test, expect } from '@playwright/test';
import { praticienSessionCookie } from './helpers/auth';

const PATIENT_ID = 'PAT_SEED_01';

test.describe('Fiche-trajectoire (onglet Trajectoire)', () => {
  test('l’onglet ouvre la fiche-trajectoire et distingue l’état vide d’une erreur', async ({ page, context }) => {
    await context.addCookies([await praticienSessionCookie()]);
    await page.goto(`/dashboard/patients/${PATIENT_ID}`);

    const onglets = page.getByRole('tablist', { name: 'Vues de la fiche patient' });
    await expect(onglets).toBeVisible();

    const ongletTrajectoire = onglets.getByRole('tab', { name: 'Trajectoire' });
    // Cible tactile : garde-fou d'accessibilité 5.0 (≥ 44 px).
    expect((await ongletTrajectoire.boundingBox())?.height).toBeGreaterThanOrEqual(44);
    await ongletTrajectoire.click();
    await expect(ongletTrajectoire).toHaveAttribute('aria-selected', 'true');

    const panneau = page.getByRole('region', { name: 'Fiche-trajectoire — repères datés' });
    await expect(panneau).toBeVisible();

    // Sans épisode confirmé : état vide EXPLICITE, jamais une erreur déguisée
    // ni une affirmation par défaut sur l'historique clinique. L'assertion est
    // portée sur le panneau d'onglet (l'annonceur de route de Next.js occupe
    // lui aussi un `role="alert"` à l'échelle de la page).
    await expect(panneau.getByText('Aucun épisode confirmé pour l’instant.')).toBeVisible();
    await expect(page.locator('#panneau-trajectoire').getByRole('alert')).toHaveCount(0);
    await expect(page.getByText(/n’a pas pu être lue/)).toHaveCount(0);

    // Aucun index à afficher tant qu'aucun repère n'est confirmé : la
    // navigation de la Spirale ne s'invente pas.
    await expect(page.getByRole('navigation', { name: 'Index de la Spirale' })).toHaveCount(0);
  });

  test('la phase Réévaluation du poste de pilotage n’affirme rien sans épisode confirmé', async ({ page, context }) => {
    await context.addCookies([await praticienSessionCookie()]);
    await page.goto(`/dashboard/patients/${PATIENT_ID}`);

    const rail = page.getByRole('tablist', { name: 'Cycle clinique' });
    await rail.getByRole('tab', { name: /Réévaluation/ }).click();

    // Le second chemin d'affichage de la trajectoire. Sans épisode confirmé,
    // l'absence de cycle est rattachée à l'absence d'épisode — jamais présentée
    // comme le résultat d'une lecture de l'historique.
    await expect(page.getByText(/se construit après confirmation d’un épisode/)).toBeVisible();

    // Garde-fou responsive commun aux surfaces praticien : la grille du
    // comparateur défile dans son conteneur, jamais la page.
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
    ).toBe(true);
  });
});
