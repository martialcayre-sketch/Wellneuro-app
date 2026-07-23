// Preuve visuelle des deux univers (SP-CONV LOT-06 — lève la dérogation V12).
//
// Trois étages, du plus portable au plus exigeant :
// 1. CAPTURES de revue (toutes plateformes) : chaque écran est photographié
//    dans test-results/visual/ — artefacts, jamais commités.
// 2. SNAPSHOTS ARIA (toutes plateformes, committés en dur ici) : la structure
//    accessible des éléments sensibles aux polices est assertée en texte —
//    indépendante du rendu, elle casse si la structure régresse.
// 3. BASELINES toHaveScreenshot (Linux uniquement, e2e/visual.spec.ts-snapshots/) :
//    comparaison au pixel SEULEMENT là où le rendu est reproductible —
//    l'environnement du CI. En local macOS, aucune comparaison (la divergence
//    de rendu des polices est le motif historique de la dérogation V12).
//    Une baseline absente ne casse jamais verify : la comparaison est
//    conditionnée à son existence. Bootstrap : workflow manuel
//    `visual-baselines` (--update-snapshots sous Ubuntu, artefact à commiter).
//
// Isolation (motif du refus V12 de capturer le portail) : les captures
// portail utilisent Jennifer Martin (PAT_SEED_02), jamais touchée par les
// parcours E2E (Michel Dogné, PAT_SEED_03) ni par les captures praticien
// (Sophie Nicola, PAT_SEED_01) — plus d'interférence entre workers.
import { existsSync } from 'node:fs';
import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { praticienSessionCookie } from './helpers/auth';
import { preparerReprisePourTest, nettoyerReprise, closePrisma } from './helpers/db';

const PATIENT_PRATICIEN = 'PAT_SEED_01'; // Sophie Nicola — fiche praticien
const PATIENT_PORTAIL = 'PAT_SEED_02'; // Jennifer Martin — portail isolé
const EMAIL_PORTAIL = 'jennifer.martin@fictif.wellneuro.fr';
const DOSSIER = 'test-results/visual';

// Comparaison au pixel : Linux (environnement CI) + baseline déjà commise.
// `WN_VISUAL_UPDATE=1` (workflow visual-baselines, avec --update-snapshots)
// force le passage même sans baseline : c'est ce qui ÉCRIT la première —
// sans cette échappatoire, le garde-fou d'existence rendrait le bootstrap
// impossible (aucune baseline → jamais de comparaison → jamais d'écriture).
function baselineComparable(testInfo: TestInfo, nom: string): boolean {
  if (process.platform !== 'linux') return false;
  if (process.env.WN_VISUAL_UPDATE === '1') return true;
  return existsSync(testInfo.snapshotPath(nom));
}

async function capturer(page: Page, testInfo: TestInfo, nom: string, fullPage = false): Promise<void> {
  await page.screenshot({ path: `${DOSSIER}/${nom}-${testInfo.project.name}.png`, fullPage });
  const baseline = `${nom}.png`;
  if (baselineComparable(testInfo, baseline)) {
    await expect(page).toHaveScreenshot(baseline, { fullPage, maxDiffPixelRatio: 0.02 });
  }
}

async function ouvrirHubPortail(page: Page, token: string): Promise<void> {
  await page.goto(`/portail/${token}`);
  await page.getByPlaceholder('votre@email.fr').fill(EMAIL_PORTAIL);
  await Promise.all([
    page.waitForResponse(res => res.url().includes('/api/portail/session') && res.status() === 200),
    page.getByRole('button', { name: 'Accéder à mon espace' }).click(),
  ]);
  await page.goto(`/portail/${token}/questionnaires`);
  await page.getByRole('heading', { name: 'Mon parcours' }).waitFor();
}

test.describe('Preuve visuelle — Observatoire (praticien)', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.addCookies([await praticienSessionCookie()]);
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test('fiche patient — poste de pilotage', async ({ page }, testInfo) => {
    await page.goto(`/dashboard/patients/${PATIENT_PRATICIEN}`);
    await page.getByRole('tablist', { name: 'Cycle clinique' }).waitFor();

    // Structure accessible du rail des 7 phases — insensible aux polices.
    await expect(page.getByRole('tablist', { name: 'Cycle clinique' })).toMatchAriaSnapshot(`
      - tablist "Cycle clinique":
        - tab /Patient/
        - tab /Données fiables/
        - tab /Compréhension/
        - tab /Décision 21 j/
        - tab /Actions/
        - tab /Suivi/
        - tab /Réévaluation/
    `);
    await capturer(page, testInfo, 'fiche-cockpit');
  });

  test('fiche patient — tiroir « Les 12 besoins » ouvert', async ({ page }, testInfo) => {
    await page.goto(`/dashboard/patients/${PATIENT_PRATICIEN}`);
    await page.getByRole('button', { name: 'Les 12 besoins' }).first().click();
    await page.getByRole('dialog').waitFor();
    await capturer(page, testInfo, 'fiche-tiroir-besoins');
  });

  test('accueil praticien — le Fil du jour', async ({ page }, testInfo) => {
    await page.goto('/dashboard');
    // Attendre l'état résolu du Fil (les métriques n'existent plus —
    // maquette La Spirale) : le panneau « Aujourd'hui » ou un état vide.
    await page.getByTestId('fil-du-jour').waitFor();
    await page.waitForFunction(() => {
      const fil = document.querySelector('[data-testid="fil-du-jour"]');
      return fil !== null && fil.querySelector('.animate-pulse') === null;
    });
    await capturer(page, testInfo, 'dashboard-fil');
  });

  test('patients & assignations', async ({ page }, testInfo) => {
    await page.goto('/dashboard/patients');
    await page.getByRole('button', { name: 'Créer le patient' }).waitFor();
    await capturer(page, testInfo, 'dashboard-patients', true);
  });
});

test.describe('Preuve visuelle — Jardin (portail patient)', () => {
  let token: string;

  test.beforeAll(async () => {
    token = await preparerReprisePourTest(PATIENT_PORTAIL);
  });

  test.afterAll(async () => {
    await nettoyerReprise(PATIENT_PORTAIL);
    await closePrisma();
  });

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 420, height: 900 });
  });

  test('portail — porte d’entrée', async ({ page }, testInfo) => {
    await page.goto(`/portail/${token}`);
    await page.getByRole('heading', { name: 'Votre espace patient' }).waitFor();
    await capturer(page, testInfo, 'portail-gate');
  });

  test('portail — Mon parcours (hub) et frise des étapes', async ({ page }, testInfo) => {
    await ouvrirHubPortail(page, token);

    // Frise du parcours : 6 étapes HC-F, structure accessible committée.
    await expect(page.getByRole('list', { name: 'Étapes de votre parcours' })).toMatchAriaSnapshot(`
      - list "Étapes de votre parcours":
        - listitem:
          - text: /Consentement/
        - listitem:
          - text: /Informations/
        - listitem:
          - text: /Situation/
        - listitem:
          - text: /Questionnaires/
        - listitem:
          - text: /Analyse du praticien/
        - listitem:
          - text: /Restitution/
    `);
    await capturer(page, testInfo, 'portail-hub', true);
  });

  test('portail — hub, sections secondaires dépliées', async ({ page }, testInfo) => {
    await ouvrirHubPortail(page, token);
    for (const summary of await page.locator('details > summary').all()) {
      await summary.click();
    }
    await capturer(page, testInfo, 'portail-hub-details', true);
  });
});
