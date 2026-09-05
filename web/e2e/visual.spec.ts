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
// CE QUI SUIT REMPLACE UNE AFFIRMATION D'ISOLATION QUI ÉTAIT FAUSSE. Il était
// écrit ici que Jennifer Martin (PAT_SEED_02) n'était « jamais touchée par les
// parcours E2E ». Elle l'est par trois autres specs — dont
// `portail-pack-reevaluation`, qui la revendique en exclusivité pour la raison
// exacte qui rend le partage coûteux : « la mise en reprise mute ses réponses
// et son état de compte ». Sophie Nicola (PAT_SEED_01) est décrite ailleurs
// comme « le patient de tous les » parcours.
//
// Il n'y a pourtant PAS de course : `playwright.config.ts` pose
// `fullyParallel: false` et `workers: 1`. Les specs se suivent, et
// `visual.spec.ts` passe en dernier (ordre alphabétique). La conséquence est
// donc systématique, pas intermittente : le workflow `visual-baselines` ne joue
// que ce fichier, sur un seed vierge, tandis que `verify` le joue APRÈS les 21
// autres. Une baseline est produite dans un état de base, comparée dans un
// autre.
//
// Mesuré le 2026-09-04 : les six baselines promues passent quand même dans
// `verify` (#874, vert). Le vert dit « dans la tolérance », pas « identique » —
// l'écart réel entre les deux contextes n'est pas mesuré à ce jour. C'est la
// raison pour laquelle tout écran dont le contenu dépend de cet état partagé
// reste hors comparaison au pixel, motif par motif ci-dessous.
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

// `pixel: false` — DEUX familles de motifs, qu'il ne faut pas confondre, chacun
// vérifié sur l'image et non supposé (revue du 2026-09-04) :
//
//  1. LE CALENDRIER. Un texte avance tout seul : « Votre dernier envoi date
//     d'environ 20 mois » au portail, « T0 + X j » et les échéances datées des
//     trajectoires, les dates relatives du Fil. La baseline pourrirait sans
//     qu'aucun code n'ait changé.
//  2. L'ÉTAT PARTAGÉ. Le contenu dépend de ce que les autres specs ont écrit
//     avant, dans `verify` mais pas dans le workflow (voir l'en-tête).
//     `dashboard-patients` en est la preuve mesurée : 2386 contre 2546 px.
//
// Un motif de la première famille est définitif ; un de la seconde tomberait si
// la génération se faisait dans le même état que la comparaison. Les écrans
// exclus gardent capture de revue + snapshot ARIA.
async function capturer(
  page: Page,
  testInfo: TestInfo,
  nom: string,
  { fullPage = false, pixel = true }: { fullPage?: boolean; pixel?: boolean } = {},
): Promise<void> {
  await page.screenshot({ path: `${DOSSIER}/${nom}-${testInfo.project.name}.png`, fullPage });
  const baseline = `${nom}.png`;
  if (pixel && baselineComparable(testInfo, baseline)) {
    // SEUIL ABSOLU, ET MESURÉ — ne pas le desservir sans refaire la mesure.
    //
    // Le bruit réel a été mesuré le 2026-09-05 (run 33923782703, passe à
    // `maxDiffPixels: 0` dont le rouge était l'instrument). Il sépare l'image
    // produite par `visual-baselines` (seed vierge, ce fichier seul) de celle
    // que rend `verify` (base écrite par les 21 autres specs) :
    //
    //   écran                      Chromium   WebKit
    //   fiche-cockpit                 31 px      0
    //   fiche-tiroir-besoins          17 px      0
    //   fiche-trajectoire-onglet      33 px      0
    //   portail-connexion              0         0
    //
    // Cinq comparaisons sur huit sont identiques AU BIT PRÈS ; l'écart maximal
    // est de 33 pixels. Le seuil précédent, `maxDiffPixelRatio: 0.02`, en
    // tolérait ~48 960 sur le cockpit — 1 483 fois le bruit observé, de quoi
    // laisser passer un panneau entier sans rougir. C'est ainsi qu'une baseline
    // périmée a survécu (#872).
    //
    // 100 est borné des deux côtés, et les deux bornes sont calculées :
    //  — plancher : 3 × le maximum observé (33), marge pour une variation
    //    d'antialiasing qui n'aurait pas encore été vue ;
    //  — plafond : sous l'aire du plus petit élément dont le changement doit
    //    rougir — une icône de statut de 14 px occupe 196 px de boîte.
    //
    // ABSOLU ET NON RATIO, parce qu'un ratio se paie en surface : les mêmes
    // 2 % achetaient 48 960 px au cockpit (1440×1700) contre 7 560 à
    // `portail-connexion` (420×900). L'indulgence suivait la taille de l'image,
    // pas l'importance de l'écran — et des pixels morts gonflaient le
    // dénominateur (constaté en #871).
    await expect(page).toHaveScreenshot(baseline, { fullPage, maxDiffPixels: 100 });
  }
}

/**
 * Attend que le rail des phases porte un état ÉTABLI.
 *
 * `FichePatientPanel` rend « indéterminée » tant que `etatRuntime` n'est pas
 * posé (`!etatRuntime || chargement || erreur`) — jamais une affirmation par
 * défaut. C'est donc le marqueur juste, et il attend vraiment : présent au
 * premier rendu, il disparaît à la résolution.
 *
 * Un `toHaveCount(0)` sur « Chargement de la proposition… » ne vaudrait pas :
 * ce texte n'existe pas encore au moment du clic, et l'assertion passerait
 * aussitôt sans rien attendre.
 */
async function attendreRailPose(page: Page): Promise<void> {
  const rail = page.getByRole('tablist', { name: 'Cycle clinique' });
  await rail.waitFor();
  await expect(rail.getByText('indéterminée')).toHaveCount(0);
}

/**
 * Attend que l'onglet Trajectoire porte un état ÉTABLI.
 *
 * La capture du 2026-09-04 gelait DEUX panneaux en cours de lecture —
 * « Chargement des dépôts… » (`CeQuiComptePanel`) et « Lecture de
 * l'orientation… » (`OrientationPanel`) : le test n'attendait que l'existence
 * de la région, qui est rendue avant que ses panneaux aient répondu.
 *
 * Chaque panneau est attendu en DEUX temps, et l'ordre compte. Son titre est
 * rendu quel que soit l'état : l'attendre garantit que le panneau est monté.
 * Ce n'est qu'ensuite que l'absence du texte de chargement veut dire quelque
 * chose — c'est le piège de #871, où une absence constatée avant l'apparition
 * passait sans rien attendre. Les deux états initiaux valent bien
 * `'chargement'` (`useState<Etat>('chargement')`), donc le texte est présent
 * dès le premier rendu du panneau : la transition ne peut aller que vers son
 * absence.
 */
async function attendreFicheTrajectoirePosee(page: Page): Promise<void> {
  await page.getByRole('region', { name: 'Fiche-trajectoire' }).waitFor();

  await page.getByRole('heading', { name: 'Ce qui compte pour le patient' }).waitFor();
  await expect(page.getByText(/Chargement des dépôts/)).toHaveCount(0);

  await page.getByRole('heading', { name: 'Explorations complémentaires proposées' }).waitFor();
  await expect(page.getByText(/Lecture de l['’]orientation/)).toHaveCount(0);
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
    //
    // 1700 ET NON 2200 : à 2200, l'image portait ~850 px de vide en bas. Ce
    // n'est pas qu'inélégant — `maxDiffPixelRatio: 0.02` est un RATIO, et des
    // pixels vides qui ne diffèrent jamais gonflent le dénominateur : ils
    // achètent de la tolérance à un changement réel ailleurs. 1700 garde tout
    // le contenu (mesuré à ~1460 px sur l'image du 2026-09-04) avec la marge
    // qu'il faut pour qu'il grandisse sans être coupé — une baseline tronquée
    // serait pire qu'absente.
    await page.setViewportSize({ width: 1440, height: 1700 });
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
    //
    // « INDÉTERMINÉE » N'EST PAS UN ÉTAT STABLE, contrairement à ce qui était
    // écrit ici. `FichePatientPanel` rend ce statut tant que `etatRuntime` n'est
    // pas posé (`!etatRuntime || chargement || erreur`), et « à ouvrir » une
    // fois l'état établi sans rien en attente. Comparaison des deux baselines
    // du 2026-09-04 : l'image posée affiche « à ouvrir » en phase 7, celle
    // prise avant résolution « indéterminée ». C'est donc le marqueur d'attente
    // juste — d'où `attendreRailPose`, qui remplace la lecture négative de
    // « Chargement de la proposition… » (absente au premier rendu, elle passait
    // sans rien attendre).
    await attendreRailPose(page);
    // La fenêtre haute posée en tête de ce test suffit : le cockpit y tient
    // entier, et `fullPage` n'ajouterait rien qu'elle ne montre déjà.
    //
    // Le tiroir des 12 besoins, lui, RESTE en fenêtre ordinaire : c'est un
    // `dialog` ancré au viewport, que l'étirer ne rendrait pas plus lisible.
    await capturer(page, testInfo, 'fiche-cockpit');
  });

  test('fiche patient — tiroir « Les 12 besoins » ouvert', async ({ page }, testInfo) => {
    await page.goto(`/dashboard/patients/${PATIENT_PRATICIEN}`);
    // ATTENDRE L'ÉTAT POSÉ, ce que ce test ne faisait pas. Il cliquait aussitôt
    // après le `goto` : le rail visible derrière le tiroir était donc figé AVANT
    // résolution du runtime, phase 7 en « indéterminée ». La baseline du
    // 2026-09-04 le montre, à côté de celle du cockpit qui affiche « à ouvrir ».
    // Elle était reproductible par chance, pas par construction.
    await attendreRailPose(page);
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
    await attendreFicheTrajectoirePosee(page);
    // COMPARAISON AU PIXEL ACTIVÉE — le motif d'exclusion précédent ne tenait
    // pas. Il invoquait « les textes datés » : l'image du 2026-09-04 n'en porte
    // aucun qui dérive. Sur un dossier sans épisode, l'écran dit « Aucun épisode
    // confirmé pour l'instant », le panneau « Mode de vie » dit « non mesuré à
    // cette date », et la seule mention temporelle est « aujourd'hui » — un mot
    // constant, pas une date qui avance.
    //
    // Ce qui rendait vraiment cette capture inutilisable était ailleurs, et
    // n'était pas écrit : elle photographiait deux panneaux en cours de lecture.
    // `attendreFicheTrajectoirePosee` traite cette cause-là.
    //
    // Le risque qui subsiste est l'état partagé décrit en tête de fichier :
    // `fiche-trajectoire.spec.ts` joue un parcours complet sur le même dossier,
    // et passe avant celui-ci dans `verify`. Si cet écart mord, cette
    // comparaison rougira — ce qui est précisément ce qu'on veut savoir, et ce
    // qu'aucun raisonnement ne remplace. Le motif serait alors MESURÉ, là où le
    // précédent était supposé.
    await capturer(page, testInfo, 'fiche-trajectoire-onglet', { fullPage: true });
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
    // Pas de pixel, et le motif est VU, non supposé : le hub affiche « Votre
    // dernier envoi date d'environ 20 mois. » (capture du 2026-09-04). Ce
    // nombre s'incrémente avec le calendrier — une baseline au pixel y
    // pourrirait toute seule, sans qu'aucun code n'ait changé.
    await capturer(page, testInfo, 'portail-hub', { fullPage: true, pixel: false });
  });

  test('portail — hub, sections secondaires dépliées', async ({ page }, testInfo) => {
    await ouvrirHubPortail(page);
    for (const summary of await page.locator('details > summary').all()) {
      await summary.click();
    }
    // Le dépliage MONTE « Mon accompagnement », qui part en lecture : la capture
    // du 2026-09-04 gelait son « Chargement de votre accompagnement… ».
    // L'assertion ne peut ici que retarder la capture, jamais l'empêcher — et
    // si le texte restait indéfiniment, c'est une information qu'on veut voir
    // rouge plutôt que figée dans une image.
    await expect(page.getByText(/Chargement de votre accompagnement/)).toHaveCount(0);
    // Pas de pixel : même phrase de reprise en mois que le hub, à laquelle ce
    // dépliage ajoute le menu « Confort de lecture » ouvert — la boucle clique
    // TOUS les `summary` de la page, y compris celui de l'en-tête.
    await capturer(page, testInfo, 'portail-hub-details', { fullPage: true, pixel: false });
  });
});
