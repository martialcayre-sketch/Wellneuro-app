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
import { praticienSessionCookie, patientPortailSessionCookie } from './helpers/auth';
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

// `pixel: false` — écrans dont un texte dépend du temps qui passe (phrase de
// reprise en mois, dates relatives du Fil) : une baseline au pixel y dériverait
// avec le calendrier. Ils gardent capture de revue + snapshot ARIA.
async function capturer(
  page: Page,
  testInfo: TestInfo,
  nom: string,
  { fullPage = false, pixel = true }: { fullPage?: boolean; pixel?: boolean } = {},
): Promise<void> {
  await page.screenshot({ path: `${DOSSIER}/${nom}-${testInfo.project.name}.png`, fullPage });
  const baseline = `${nom}.png`;
  if (pixel && baselineComparable(testInfo, baseline)) {
    await expect(page).toHaveScreenshot(baseline, { fullPage, maxDiffPixelRatio: 0.02 });
  }
}

async function ouvrirHubPortail(page: Page): Promise<void> {
  // LOT-04 : session par cookie (comme l'atterrissage magic-link/Google), plus
  // de gate e-mail ni de jeton d'URL.
  await page.context().addCookies([patientPortailSessionCookie(PATIENT_PORTAIL, EMAIL_PORTAIL)]);
  await page.goto(`/portail/${PATIENT_PORTAIL}/questionnaires`);
  await page.getByRole('heading', { name: 'Mon parcours' }).waitFor();
}

test.describe('Preuve visuelle — Observatoire (praticien)', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.addCookies([await praticienSessionCookie()]);
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test('fiche patient — poste de pilotage', async ({ page }, testInfo) => {
    // FENÊTRE HAUTE, ET NON `fullPage` — mesuré, pas supposé.
    //
    // Le cockpit est un TROIS-COLONNES DONT CHAQUE COLONNE DÉFILE POUR
    // ELLE-MÊME, bornée à la hauteur de fenêtre
    // (`FichePatientPanel`, `lg:h-[calc(100dvh-11.75rem)] lg:overflow-y-auto`) :
    // c'est le principe `A6-R1`, naviguer par phase et jamais défiler la page.
    // `fullPage` photographie donc la PAGE, qui ne dépasse presque pas la
    // fenêtre — le passage en page entière n'avait gagné que 88 pixels
    // (1440×988 contre 1440×900), sans rien montrer de plus de l'intérieur des
    // colonnes. Les colonnes étant dimensionnées sur `100dvh`, seule une
    // fenêtre haute les étire et rend leur contenu visible d'un coup.
    await page.setViewportSize({ width: 1440, height: 2200 });
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
    // État posé : le panneau runtime a fini de charger — une baseline sur
    // un état transitoire serait structurellement flaky (constaté au premier
    // run du workflow : « Chargement de la proposition… » figé dans l'image).
    // (« indéterminée » peut légitimement rester : Réévaluation sans épisode
    // est un état stable — seul le chargement en vol est transitoire.)
    await expect(page.getByText(/Chargement de la proposition/)).toHaveCount(0);
    // La fenêtre haute posée en tête de ce test suffit : le cockpit y tient
    // entier, et `fullPage` n'ajouterait rien qu'elle ne montre déjà.
    //
    // Le tiroir des 12 besoins, lui, RESTE en fenêtre ordinaire : c'est un
    // `dialog` ancré au viewport, que l'étirer ne rendrait pas plus lisible.
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
    await capturer(page, testInfo, 'dashboard-fil', { pixel: false });
  });

  test('porte d’entrée trajectoires — liste orientée trajectoire (SP-TRAJ LOT-04)', async ({ page }, testInfo) => {
    await page.goto('/dashboard/trajectoires');
    await page.getByRole('link', { name: /Sophie Nicola/ }).waitFor();
    // Pas de pixel : « T0 + X j » et les échéances datées bougent avec le
    // temps, et l'état des lignes dépend des parcours E2E du même run.
    await capturer(page, testInfo, 'dashboard-trajectoires', { fullPage: true, pixel: false });
  });

  test('fiche patient — onglet Trajectoire, état vide honnête (SP-TRAJ LOT-01)', async ({ page }, testInfo) => {
    await page.goto(`/dashboard/patients/${PATIENT_PRATICIEN}?onglet=trajectoire`);
    await page.getByRole('region', { name: 'Fiche-trajectoire' }).waitFor();
    // Pas de pixel : le panneau « Mode de vie » et les textes datés varient
    // avec les réponses laissées par les autres suites du run.
    await capturer(page, testInfo, 'fiche-trajectoire-onglet', { fullPage: true, pixel: false });
  });

  test('patients & assignations', async ({ page }, testInfo) => {
    await page.goto('/dashboard/patients');
    // SP-TRAJ LOT-05 : les formulaires vivent en tiroirs — l'ancrage se fait
    // sur la barre d'actions, le tableau est le premier contenu.
    await page.getByRole('button', { name: 'Nouveau patient' }).waitFor();
    await page.getByRole('table').first().waitFor();
    // Pas de pixel : la liste dépend de l'état laissé par les parcours E2E du
    // même run (assignations créées pour Michel) — attrapé par la toute
    // première comparaison active en CI, hauteur 2386 vs 2546 px.
    await capturer(page, testInfo, 'dashboard-patients', { fullPage: true, pixel: false });
  });
});

test.describe('Preuve visuelle — Jardin (portail patient)', () => {
  test.beforeAll(async () => {
    // Le jeton retourné est inerte depuis le LOT-04 : l'accès passe par le cookie.
    await preparerReprisePourTest(PATIENT_PORTAIL);
  });

  test.afterAll(async () => {
    await nettoyerReprise(PATIENT_PORTAIL);
    await closePrisma();
  });

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 420, height: 900 });
  });

  test('portail — porte d’entrée (page de connexion)', async ({ page }, testInfo) => {
    // LOT-04 : la porte d'entrée est la page de connexion (Google + redemande),
    // le gate e-mail a disparu. Nouvelle baseline (l'ancienne `portail-gate` est
    // retirée) — régénérée par le workflow visual-baselines.
    await page.goto('/portail/connexion');
    await page.getByRole('heading', { name: 'Accéder à votre espace' }).waitFor();
    await capturer(page, testInfo, 'portail-connexion');
  });

  test('portail — Mon parcours (hub) et frise des étapes', async ({ page }, testInfo) => {
    await ouvrirHubPortail(page);

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
    await capturer(page, testInfo, 'portail-hub', { fullPage: true, pixel: false });
  });

  test('portail — hub, sections secondaires dépliées', async ({ page }, testInfo) => {
    await ouvrirHubPortail(page);
    for (const summary of await page.locator('details > summary').all()) {
      await summary.click();
    }
    await capturer(page, testInfo, 'portail-hub-details', { fullPage: true, pixel: false });
  });
});
