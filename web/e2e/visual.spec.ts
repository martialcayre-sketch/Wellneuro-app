// Captures visuelles du chantier « refonte 5.0 » — pas d'assertion de
// comportement : chaque écran refondu est photographié pour comparaison
// humaine avec la maquette cible (docs/claude/propositions/
// 2026-07-18-refonte-ux-5-0/maquette-cible-ux-5-0.html). Les fichiers vont
// dans test-results/visual/ (artefacts, jamais commités). La promotion en
// baselines toHaveScreenshot() se fera au lot V12, écran par écran validé.
// Patients fictifs seedés uniquement (PAT_SEED_01 — Sophie Nicola).
import { test } from '@playwright/test';
import { praticienSessionCookie } from './helpers/auth';

const PATIENT_ID = 'PAT_SEED_01';
const DOSSIER = 'test-results/visual';

test.describe('Captures — refonte visuelle 5.0', () => {
  test('fiche patient — poste de pilotage', async ({ page, context }, testInfo) => {
    await context.addCookies([await praticienSessionCookie()]);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/dashboard/patients/${PATIENT_ID}`);
    await page.getByRole('tablist', { name: 'Cycle clinique' }).waitFor();
    await page.screenshot({
      path: `${DOSSIER}/fiche-cockpit-${testInfo.project.name}.png`,
      fullPage: false,
    });
  });

  test('fiche patient — tiroir « Les 12 besoins » ouvert', async ({ page, context }, testInfo) => {
    await context.addCookies([await praticienSessionCookie()]);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/dashboard/patients/${PATIENT_ID}`);
    await page.getByRole('button', { name: 'Les 12 besoins' }).first().click();
    await page.getByRole('dialog').waitFor();
    await page.screenshot({
      path: `${DOSSIER}/fiche-tiroir-besoins-${testInfo.project.name}.png`,
      fullPage: false,
    });
  });

  test('accueil praticien — le Fil du jour', async ({ page, context }, testInfo) => {
    await context.addCookies([await praticienSessionCookie()]);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/dashboard');
    await page.getByTestId('fil-du-jour').waitFor();
    // Attendre la fin des squelettes : les métriques affichent leur lien actif.
    await page.getByText('Voir →').first().waitFor();
    await page.screenshot({
      path: `${DOSSIER}/dashboard-fil-${testInfo.project.name}.png`,
      fullPage: false,
    });
  });

  test('patients & assignations', async ({ page, context }, testInfo) => {
    await context.addCookies([await praticienSessionCookie()]);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/dashboard/patients');
    await page.getByRole('button', { name: 'Créer le patient' }).waitFor();
    await page.screenshot({
      path: `${DOSSIER}/dashboard-patients-${testInfo.project.name}.png`,
      fullPage: true,
    });
  });
});
