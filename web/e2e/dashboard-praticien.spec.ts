// Parcours praticien : authentification et accès au dashboard
// Teste la session NextAuth du praticien (sans automatiser le login OAuth réel)
// et vérifie que les routes du dashboard sont accessibles avec une session valide.
import { test, expect } from '@playwright/test';
import { praticienSessionCookie } from './helpers/auth';

const PRATICIEN_EMAIL = 'martialcayre@wellneuro.fr';

test.describe('Praticien Dashboard', () => {
  test('login via NextAuth session cookie and access dashboard', async ({ page }) => {
    // Fabrique un cookie de session NextAuth valide pour le praticien
    const sessionCookie = await praticienSessionCookie(PRATICIEN_EMAIL);

    // Ajoute le cookie à la page avant de naviguer
    await page.context().addCookies([sessionCookie]);

    // Navigue vers le dashboard
    await page.goto('/dashboard');

    // Vérifie que la page est chargée et que les éléments clés sont présents
    await expect(page).toHaveTitle(/Dashboard|Praticien/i); // Adjust title expectation

    // Vérifie que le titre du dashboard est visible (maquette La Spirale :
    // l'accueil s'intitule « Le Fil du jour », plus de salutation).
    const mainHeading = page.locator('h1, h2').filter({ hasText: /Le Fil du jour/i });
    await expect(mainHeading.first()).toBeVisible({ timeout: 10000 });

    // Sur les largeurs 768-1024px (tablette portrait), la navigation est repliée
    // derrière le bouton ☰ (panneau overlay, LOT-02) : on l'ouvre si présent. En
    // dessous de 768px (mobile), la navigation basse (LOT-03) est visible directement,
    // sans bouton ☰.
    const menuToggle = page.getByRole('button', { name: 'Ouvrir la navigation' });
    if (await menuToggle.isVisible()) {
      await menuToggle.click();
    }

    // Vérifie qu'un lien vers Patients est visible (rail persistant sur desktop,
    // panneau overlay sur mobile) : ":visible" exclut le rail persistant masqué
    // par CSS sur mobile, qui resterait sinon le premier match du DOM.
    await expect(page.locator('a[href*="patients"]:visible').first()).toBeVisible({ timeout: 5000 });
  });

  test('atelier corpus : la file de revue se rend, état vide compris', async ({ page }) => {
    const sessionCookie = await praticienSessionCookie(PRATICIEN_EMAIL);
    await page.context().addCookies([sessionCookie]);

    await page.goto('/dashboard/corpus');

    await expect(page.getByRole('heading', { name: 'Atelier corpus' })).toBeVisible({
      timeout: 10000,
    });
    // Base éphémère sans claims : l'écran doit annoncer la file vide, pas une
    // erreur — la route GET a donc réellement lu les tables rag_*.
    await expect(page.getByText('Aucun claim en attente de validation', { exact: false })).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByRole('tab', { name: 'En attente' })).toBeVisible();
  });

  test('bibliothèque : catalogue, aperçu vierge et file d’envoi se rendent', async ({ page }) => {
    const sessionCookie = await praticienSessionCookie(PRATICIEN_EMAIL);
    await page.context().addCookies([sessionCookie]);

    await page.goto('/dashboard/bibliotheque');

    await expect(page.getByRole('heading', { name: 'Bibliothèque', exact: true })).toBeVisible({
      timeout: 10000,
    });
    // Rayons : Questionnaires actif, deux rayons annoncés à venir.
    await expect(page.getByRole('button', { name: /^Questionnaires$/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Analyses biologiques/ })).toBeVisible();

    // Catalogue : la recherche filtre le rendu (catalogue en code, sans DB).
    const recherche = page.getByLabel('Rechercher dans le catalogue');
    await expect(recherche).toBeVisible();
    await recherche.fill('PSS-10');
    const lignePss = page.getByRole('button', { name: /PSS-10/ }).first();
    await expect(lignePss).toBeVisible();

    // Aperçu vierge : la première question réelle de l'instrument s'affiche.
    await lignePss.click();
    await expect(page.getByText('dérangé(e) par un évènement inattendu', { exact: false })).toBeVisible({
      timeout: 10000,
    });

    // File d'envoi : la colonne existe (état vide accepté sur base éphémère).
    await expect(page.getByRole('heading', { name: "File d'envoi" })).toBeVisible();
  });

  // Instruments du cabinet : le parcours complet créer → enregistrer →
  // demander la relecture → publier. La publication n'est JAMAIS automatique :
  // elle passe par l'écran de relecture de la grille. Titre unique par run, et
  // désactivation en fin de test — la base est partagée entre les postes.
  test('bibliothèque : créer un instrument du cabinet jusqu’à publication', async ({ page }) => {
    const sessionCookie = await praticienSessionCookie(PRATICIEN_EMAIL);
    await page.context().addCookies([sessionCookie]);
    await page.goto('/dashboard/bibliotheque');

    const titre = `Instrument E2E ${Date.now()}`;

    try {
      // Éditeur en tiroir : titre + deux questions, échelle par défaut.
      await page.getByRole('button', { name: 'Créer un questionnaire' }).click();
      const tiroir = page.getByRole('dialog', { name: 'Créer un questionnaire' });
      await expect(tiroir).toBeVisible();
      await tiroir.getByLabel('Titre', { exact: true }).fill(titre);
      await tiroir.getByLabel('Question 1', { exact: true }).fill('Je dors bien la semaine.');
      await tiroir.getByRole('button', { name: 'Ajouter une question' }).click();
      await tiroir.getByLabel('Question 2', { exact: true }).fill('Je me réveille reposé(e).');

      await tiroir.getByRole('button', { name: 'Enregistrer le brouillon' }).click();
      await expect(tiroir.getByText('Brouillon enregistré.')).toBeVisible({ timeout: 10000 });

      await tiroir.getByRole('button', { name: 'Demander la relecture' }).click();
      await expect(tiroir).toBeHidden({ timeout: 10000 });

      // La liste du cabinet montre le statut « Grille à relire ».
      const sectionCabinet = page.getByTestId('instruments-cabinet');
      const ligne = sectionCabinet.locator('li', { hasText: titre });
      await expect(ligne).toBeVisible({ timeout: 10000 });
      await expect(ligne.getByText('Grille à relire')).toBeVisible();

      // Relecture : récapitulatif (échelle + bandes) puis publication explicite.
      await ligne.getByRole('button', { name: 'Relire la grille' }).click();
      const relecture = page.getByRole('dialog', { name: 'Relire la grille' });
      await expect(relecture).toBeVisible();
      await expect(relecture.getByText(/Bandes d.interprétation/)).toBeVisible();
      await relecture.getByRole('button', { name: 'Grille relue — publier' }).click();
      await expect(relecture).toBeHidden({ timeout: 10000 });
      await expect(ligne.getByText('Publié')).toBeVisible({ timeout: 10000 });

      // Le catalogue porte l'entrée cabinet, badge « Cabinet — non certifié ».
      await page.getByLabel('Rechercher dans le catalogue').fill(titre);
      await expect(
        page.locator('li', { hasText: titre }).filter({ hasText: 'Cabinet — non certifié' }),
      ).toBeVisible({ timeout: 10000 });

      // Désactivation par l'UI : le bouton fait partie du parcours testé.
      await ligne.getByRole('button', { name: 'Désactiver' }).click();
      await expect(ligne).toBeHidden({ timeout: 10000 });
    } finally {
      // Filet : si une assertion a échoué en route, désactive par l'API tout
      // instrument de ce run resté actif — la base E2E est partagée entre les
      // postes, aucun orphelin ne doit s'y accumuler. `page.request` partage
      // le cookie de session praticien du contexte. Le nettoyage est enveloppé :
      // une exception ici (contexte fermé après échec) ne doit pas remplacer
      // l'erreur d'origine du test.
      try {
        const liste = await page.request.get('/api/praticien/instruments');
        const json = (await liste.json().catch(() => ({ instruments: [] }))) as {
          instruments?: { idInstrument: string; titre: string }[];
        };
        for (const instrument of json.instruments ?? []) {
          if (instrument.titre === titre) {
            await page.request.patch('/api/praticien/instruments', {
              data: { idInstrument: instrument.idInstrument, action: 'desactiver' },
            });
          }
        }
      } catch {
        // Nettoyage best-effort : l'erreur du test prime.
      }
    }
  });

  test('navigate to patients section', async ({ page }) => {
    const sessionCookie = await praticienSessionCookie(PRATICIEN_EMAIL);
    await page.context().addCookies([sessionCookie]);

    await page.goto('/dashboard/patients');

    // Vérifie que la page patients est chargée
    await expect(page).toHaveURL(/.*\/dashboard\/patients/);

    // Attends un élément indicatif de contenu chargé
    // (peut être une liste vide initialement, un titre, etc.)
    const content = page.locator('main, [role="main"], article');
    await expect(content).toBeVisible({ timeout: 10000 });
  });

  test.describe('mobile bottom navigation', () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test('shows 4 entries, hides the tablet drawer trigger, and Plus opens an accessible sheet', async ({
      page,
    }) => {
      const sessionCookie = await praticienSessionCookie(PRATICIEN_EMAIL);
      await page.context().addCookies([sessionCookie]);

      await page.goto('/dashboard');

      // En dessous de 768px, le bouton ☰ (panneau tablette, LOT-02) ne doit plus
      // être affiché : la navigation basse (LOT-03) le remplace.
      await expect(page.getByRole('button', { name: 'Ouvrir la navigation' })).toBeHidden();

      const bottomNav = page.locator('nav[aria-label="Navigation principale"]');
      await expect(bottomNav).toBeVisible();
      await expect(bottomNav.locator('a[href="/dashboard"]:visible')).toBeVisible();
      // SP-TRAJ LOT-04 : « Fiches » ouvre la porte d'entrée trajectoire.
      await expect(bottomNav.locator('a[href="/dashboard/trajectoires"]:visible')).toBeVisible();
      await expect(bottomNav.locator('a[href="/dashboard/synthese"]:visible')).toBeVisible();
      const plusButton = bottomNav.getByRole('button', { name: 'Plus' });
      await expect(plusButton).toBeVisible();

      // Cible tactile ≥ 44×44 px sur un lien de la navigation basse.
      const patientsLink = bottomNav.locator('a[href="/dashboard/trajectoires"]:visible');
      const box = await patientsLink.boundingBox();
      expect(box?.height).toBeGreaterThanOrEqual(44);

      await plusButton.click();
      const sheet = page.getByRole('dialog', { name: 'Menu' });
      await expect(sheet).toBeVisible();
      await expect(sheet.getByRole('link', { name: 'Paramètres' })).toBeVisible();

      await page.keyboard.press('Escape');
      await expect(sheet).toBeHidden();
      await expect(plusButton).toBeFocused();
    });
  });

  test.describe('tablet drawer navigation', () => {
    // 768–1023px : le rail persistant (lg) est caché, la navigation basse
    // (<768px) ne l'est pas encore — seul le tiroir ☰ (LOT-02, Radix Dialog)
    // donne accès à la navigation dans cette plage.
    test.use({ viewport: { width: 900, height: 1024 } });

    test('opens an accessible, opaque drawer via the menu trigger, closable with Escape', async ({ page }) => {
      const sessionCookie = await praticienSessionCookie(PRATICIEN_EMAIL);
      await page.context().addCookies([sessionCookie]);

      await page.goto('/dashboard');

      const menuToggle = page.getByRole('button', { name: 'Ouvrir la navigation' });
      await expect(menuToggle).toBeVisible();
      await menuToggle.click();

      const drawer = page.getByRole('dialog', { name: 'Navigation' });
      await expect(drawer).toBeVisible();
      await expect(drawer.getByRole('link', { name: 'Fiche-trajectoire' })).toBeVisible();

      // Régression verrouillée : Dialog.Portal (Radix) rend hors du conteneur
      // [data-theme="praticien"] dont dépendent les tokens --rail-* — sans
      // data-theme="praticien" posé directement sur Dialog.Content, ce fond
      // reste transparent (page visible au travers) au lieu du rail sombre.
      const backgroundColor = await drawer.evaluate((el) => getComputedStyle(el).backgroundColor);
      expect(backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
      expect(backgroundColor).not.toBe('transparent');

      await page.keyboard.press('Escape');
      await expect(drawer).toBeHidden();
      await expect(menuToggle).toBeFocused();
    });
  });

  test('accueil : le Fil du jour remplace les accès rapides (SP-FIL LOT-01)', async ({ page }) => {
    const sessionCookie = await praticienSessionCookie(PRATICIEN_EMAIL);
    await page.context().addCookies([sessionCookie]);
    await page.goto('/dashboard');

    // L'en-tête « Le Fil du jour » (maquette La Spirale, sans métriques) et le
    // conteneur du Fil sont présents quel que soit l'état des données.
    await expect(page.getByRole('heading', { name: 'Le Fil du jour' })).toBeVisible();
    await expect(page.getByTestId('fil-du-jour')).toBeVisible();

    const fil = page.getByTestId('fil-du-jour');
    await expect(fil).toBeVisible({ timeout: 10000 });

    // Les quatre états de rendu partagent ce `data-testid` : sa seule présence
    // laissait passer un Fil en erreur ou bloqué en chargement. On exige donc
    // un état RÉSOLU — cartes ou état vide explicite — et jamais l'état
    // d'indisponibilité, qui signalerait une session ou une base cassée.
    await expect(fil).not.toContainText('momentanément indisponible');
    await expect(fil.locator('.animate-pulse')).toHaveCount(0);
    await expect(
      fil.locator('article').first().or(fil.getByText(/Rien n.appelle votre attention/)),
    ).toBeVisible({ timeout: 10000 });
  });

  test('paramètres : blocs profil et gouvernance clinique (HC-F LOT-03)', async ({ page }) => {
    const sessionCookie = await praticienSessionCookie(PRATICIEN_EMAIL);
    await page.context().addCookies([sessionCookie]);
    await page.goto('/dashboard/parametres');

    await expect(page.getByRole('heading', { name: 'Profil praticien' })).toBeVisible();
    // Scopé à <main> : l'email apparaît aussi dans le menu « Profil » du rail.
    await expect(page.getByRole('main').getByText(PRATICIEN_EMAIL)).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Gouvernance clinique' })).toBeVisible();
    await expect(page.getByText('Version du moteur d’équilibre')).toBeVisible();
  });

  test('patients : le tableau d’abord, le formulaire de création en tiroir (SP-TRAJ LOT-05)', async ({ page }) => {
    const sessionCookie = await praticienSessionCookie(PRATICIEN_EMAIL);
    await page.context().addCookies([sessionCookie]);
    await page.goto('/dashboard/patients');

    // Le tableau patients est le premier contenu — les formulaires ne sont
    // plus empilés en tête de page.
    await expect(page.getByRole('table').first()).toBeVisible();
    await expect(page.getByPlaceholder('Prénom *', { exact: true })).toBeHidden();

    // Le tiroir « Nouveau patient » ouvre le formulaire complet.
    await page.getByRole('button', { name: 'Nouveau patient' }).click();
    const tiroir = page.getByRole('dialog', { name: 'Nouveau patient' });
    await expect(tiroir).toBeVisible();
    await expect(tiroir.getByPlaceholder('Prénom *', { exact: true })).toBeVisible();
    // { exact: true } : « Prénom * » contient « nom * » comme sous-chaîne,
    // ce qui matcherait sinon les deux champs (strict mode).
    await expect(tiroir.getByPlaceholder('Nom *', { exact: true })).toBeVisible();
    await expect(tiroir.getByRole('button', { name: 'Créer le patient' })).toBeVisible();

    // Échap referme et rend le focus au déclencheur.
    await page.keyboard.press('Escape');
    await expect(tiroir).toBeHidden();
    await expect(page.getByRole('button', { name: 'Nouveau patient' })).toBeFocused();
  });

  // IDP2 LOT-01b. Le menu « Gérer le dossier » est rendu dans une cellule du
  // tableau, elle-même dans un `overflow-x-auto` contenu dans une carte
  // `overflow-hidden` : un panneau positionné en `absolute` y était ROGNÉ, et
  // sur les dernières lignes « Effacer définitivement » devenait inatteignable.
  // Aucun test unitaire ne peut l'attraper — jsdom ne calcule pas de géométrie.
  // D'où ce parcours, qui n'efface RIEN : il ouvre le menu de la DERNIÈRE
  // ligne et exige que le dernier item soit réellement dans le viewport.
  test('patients : le menu de la dernière ligne n’est pas rogné par le tableau', async ({ page }) => {
    const sessionCookie = await praticienSessionCookie(PRATICIEN_EMAIL);
    await page.context().addCookies([sessionCookie]);
    await page.goto('/dashboard/patients');

    const declencheurs = page.getByRole('button', { name: 'Gérer le dossier' });
    await expect(declencheurs.first()).toBeVisible({ timeout: 10000 });
    await declencheurs.last().click();

    const menu = page.getByRole('menu', { name: 'Gérer le dossier' });
    await expect(menu).toBeVisible();
    // Le panneau lui-même tient dans la fenêtre : c'est ce qui manquait quand
    // il était rogné par la carte, et ce qui manquerait encore s'il débordait
    // simplement par le bas.
    await expect(menu).toBeInViewport();

    // Le dernier item du menu, celui qui était sous le bord de la carte. Sur un
    // écran court le panneau défile en interne — ce qui est acceptable, à la
    // différence d'un rognage : l'item reste ATTEIGNABLE.
    const effacer = menu.getByRole('menuitem', { name: 'Effacer définitivement' });
    await effacer.scrollIntoViewIfNeeded();
    await expect(effacer).toBeVisible();
    await expect(effacer).toBeInViewport();

    // Cible tactile ≥ 44 px (registre §1).
    const box = await effacer.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);

    // Échap referme et rend le focus au déclencheur.
    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
    await expect(declencheurs.last()).toBeFocused();
  });

  // La confirmation d'effacement est le dernier obstacle avant une destruction
  // sans retour : on vérifie qu'elle existe et qu'elle est inerte, SANS jamais
  // la confirmer — la base est partagée entre les postes et `PAT_SEED_03` est
  // une fixture des autres suites.
  test('patients : la confirmation d’effacement nomme le dossier et reste inerte', async ({ page }) => {
    const sessionCookie = await praticienSessionCookie(PRATICIEN_EMAIL);
    await page.context().addCookies([sessionCookie]);
    await page.goto('/dashboard/patients');

    const declencheurs = page.getByRole('button', { name: 'Gérer le dossier' });
    await expect(declencheurs.first()).toBeVisible({ timeout: 10000 });
    await declencheurs.first().click();
    const item = page.getByRole('menuitem', { name: 'Effacer définitivement' });
    await item.scrollIntoViewIfNeeded();
    await item.click();

    const dialogue = page.getByRole('dialog');
    await expect(dialogue).toBeVisible();
    // `.first()` : le dialogue porte aussi les intitulés « Ce qui est détruit »
    // et « Ce qui subsiste », vérifiés juste en dessous.
    await expect(dialogue.getByRole('heading').first()).toContainText(
      'Effacer définitivement le dossier de',
    );
    await expect(dialogue.getByRole('heading', { name: 'Ce qui est détruit' })).toBeVisible();
    await expect(dialogue.getByRole('heading', { name: 'Ce qui subsiste' })).toBeVisible();

    const confirmer = dialogue.getByRole('button', { name: 'Effacer définitivement' });
    await expect(confirmer).toBeDisabled();
    await dialogue.getByLabel(/saisissez/i).fill('effacer');
    await expect(confirmer).toBeDisabled();

    // On s'arrête ici, délibérément : on n'efface pas une fixture partagée.
    await dialogue.getByRole('button', { name: 'Annuler' }).click();
    await expect(dialogue).toBeHidden();
  });

  test('route praticien : accès Trajectoire alimentaire (JA5-03)', async ({ page }) => {
    const sessionCookie = await praticienSessionCookie(PRATICIEN_EMAIL);
    await page.context().addCookies([sessionCookie]);

    await page.goto('/dashboard/patients/PAT_SEED_03/alimentation');
    await expect(page).toHaveURL(/\/dashboard\/patients\/PAT_SEED_03\/alimentation$/);
    await expect(page.getByRole('heading', { name: 'Trajectoire alimentaire' })).toBeVisible();
    await expect(page.getByTestId('ja-praticien-calibrage')).toBeVisible();
    await expect(page.getByTestId('ja-praticien-moments-explorer')).toBeVisible();
    await expect(page.getByTestId('ja-praticien-revue-decision')).toBeVisible();

    await page.getByTestId('ja-praticien-assiette').selectOption('ASSIETTE_SOIR_LEGER');
    await page.getByTestId('ja-praticien-valider-revue').click();
    await expect(page.getByTestId('ja-praticien-review-summary')).toContainText('Accepté');
  });

  test('session expires on missing NEXTAUTH_SECRET', async ({ page }) => {
    // Test de sensibilité : sans NEXTAUTH_SECRET, la fabrication du cookie échoue
    const originalSecret = process.env.NEXTAUTH_SECRET;
    delete process.env.NEXTAUTH_SECRET;

    try {
      await expect(async () => {
        await praticienSessionCookie(PRATICIEN_EMAIL);
      }).rejects.toThrow('NEXTAUTH_SECRET');
    } finally {
      process.env.NEXTAUTH_SECRET = originalSecret;
    }
  });
});
