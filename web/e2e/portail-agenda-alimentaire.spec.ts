// L'agenda alimentaire (`Q_ALI_09`) de bout en bout, dans un vrai navigateur.
//
// Ce que ce spec apporte que les bancs jsdom ne peuvent pas donner : la preuve
// que la CHAÎNE tient. `SaisieJourneeForm.test.tsx` sait qu'un clic écrit un
// tri-état, `hubQuestionnaires.test.ts` sait quelle étape doit primer, la route
// a ses neuf barrières — aucun des trois ne dit qu'un patient à qui l'agenda est
// assigné le voit dans son hub, y entre, note une journée et la relit. C'est
// exactement le critère de done du lot, et il ne s'observe qu'ici. CLAUDE.md est
// explicite : une suite Vitest verte ne prouve rien sur les parcours.
//
// ── POURQUOI AUCUN GESTE À COORDONNÉES ─────────────────────────────────────
// La ligne de prises est tactile, mais le geste au doigt est le chemin RAPIDE,
// pas le seul : `LigneDePrises.tsx` expose pour chaque acte un bouton explicite
// et un chemin clavier, précisément parce qu'un lecteur d'écran ne glisse pas.
// Ce spec emprunte ces chemins-là. Deux prises consécutives (08:00 et 08:15) se
// recouvrent à l'écran — 44 px de large pour 15 minutes d'écart —, si bien
// qu'un clic au centre de la première serait intercepté par la seconde. Le
// glissement du cadran, lui, a son spec dédié côté sommeil
// (`agenda-sommeil-cadran.spec.ts`) : c'est là qu'un hit-test se teste.
//
// Patient fictif Michel Dogné (PAT_SEED_03), autorisé. `workers: 1` et
// `fullyParallel: false` : aucun autre spec ne tourne pendant celui-ci.
//
// Le drapeau `WN_AGENDA_ALI` est posé dans `webServer.env` de
// `playwright.config.ts`, et surtout PAS ici : `process.env` d'un spec ne vaut
// que pour le code Node du test, jamais pour le serveur Next qui répond.
import { test, expect, type Page } from '@playwright/test';
import { praticienSessionCookie, patientPortailSessionCookie } from './helpers/auth';
import { resetPortailState, accuserCadreTrust, closePrisma } from './helpers/db';

const PATIENT = { idPatient: 'PAT_SEED_03', email: 'michel.dogne@fictif.wellneuro.fr' };

/**
 * La date se calcule en EUROPE/PARIS, comme le serveur (`dateJourParis`), et
 * surtout pas en UTC. `toISOString().slice(0, 10)` rendrait la date UTC : entre
 * minuit et 2 h du matin l'été, UTC a un jour de retard sur Paris, et « hier »
 * tomberait donc DEUX jours avant le « hier » du serveur. `estDateSaisissable`
 * n'accepte qu'aujourd'hui ou la veille — la saisie serait refusée, et ce spec
 * échouerait deux heures par nuit. C'est arrivé au CI du 2026-07-30 sur le
 * jumeau du sommeil ; le piège est le même ici, la journée alimentaire courant
 * de 04:00 à 03:59.
 */
function dateParis(decalageJours: number): string {
  return new Intl.DateTimeFormat('fr-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(Date.now() + decalageJours * 86_400_000));
}

/** Assigne `Q_ALI_09` à Michel Dogné et rend l'identifiant d'assignation. */
async function assignerAgenda(page: Page): Promise<string> {
  const creation = await page.request.post('/api/praticien/assignations', {
    data: { emailPatient: PATIENT.email, idQuestionnaire: 'Q_ALI_09' },
  });
  expect(creation.status()).toBe(200);
  const { idAssignation } = (await creation.json()) as { idAssignation: string };
  return idAssignation;
}

test.afterAll(async () => {
  await resetPortailState(PATIENT.idPatient);
  await closePrisma();
});

test.describe('Agenda alimentaire — parcours patient', () => {
  test('assigné, l’agenda se voit au hub, s’ouvre, se note et se relit', async ({ page }) => {
    await resetPortailState(PATIENT.idPatient);
    // Sans l'accusé, le hub est masqué par « Avant de commencer » (4 écrans).
    await accuserCadreTrust(PATIENT.idPatient);

    await page.context().addCookies([await praticienSessionCookie()]);
    const idAssignation = await assignerAgenda(page);

    await page.context().addCookies([
      patientPortailSessionCookie(PATIENT.idPatient, PATIENT.email),
    ]);

    // ── 1. L'agenda apparaît dans le hub ───────────────────────────────────
    // Jamais commencé, l'agenda n'est PAS prioritaire (rien ne se perd à
    // commencer demain : la fenêtre s'ancre sur la première journée notée). Il
    // est mis en avant comme premier « à compléter », avec le libellé propre à
    // l'agenda — « Commencer mon agenda alimentaire », et non le « Commencer »
    // générique d'un questionnaire ordinaire.
    await page.goto(`/portail/${PATIENT.idPatient}/questionnaires`);
    await expect(page.getByRole('heading', { name: 'Mon parcours' })).toBeVisible();
    const entree = page.getByRole('link', { name: 'Commencer mon agenda alimentaire' });
    await expect(entree).toBeVisible();
    await expect(entree).toHaveAttribute(
      'href',
      `/portail/${PATIENT.idPatient}/questionnaires/${idAssignation}`,
    );

    // ── 2. Le patient y entre, et tombe sur la SURFACE D'AGENDA ────────────
    await entree.click();

    // Consentement de l'assignation : une case, un bouton. C'est la barrière
    // 403 `consentement_absent` de la route agenda, et le parcours la franchit
    // comme un patient — pas par un POST de fixture.
    await page.getByLabel(/ai lu ces informations/).check();
    await page.getByRole('button', { name: 'Continuer vers le questionnaire' }).click();

    // Agenda vide : l'écran s'ouvre DIRECTEMENT sur la saisie du jour, sans
    // écran intermédiaire. Le titre est « Votre journée » — ni une correction,
    // ni la veille.
    await expect(page.getByRole('heading', { name: 'Votre journée' })).toBeVisible();
    await expect(page.getByTestId('piste-prises')).toBeVisible();
    await expect(page.getByText('Vos prises de la journée')).toBeVisible();
    // Et surtout PAS le formulaire générique : `/api/patient/questionnaire` ne
    // connaît pas `Q_ALI_09`, son resolver rendrait « pas encore disponible en
    // ligne » sur un instrument qui existe et fonctionne.
    await expect(page.getByText(/pas encore disponible en ligne/)).toHaveCount(0);

    // ── 3. Il note une journée : prises, puis présences ─────────────────────
    const etatLigne = page.getByText(/prises? : |Aucune prise posée/);
    await expect(etatLigne).toHaveText('Aucune prise posée pour l’instant.');

    // « Ajouter une prise » pose 08:00 (l'emplacement proposé à défaut de
    // doigt), puis le premier libre suivant, soit 08:15.
    const ajouter = page.getByRole('button', { name: 'Ajouter une prise' });
    await ajouter.click();
    await expect(etatLigne).toHaveText('1 prise : 08:00 repas.');
    await ajouter.click();
    await expect(etatLigne).toHaveText('2 prises : 08:00 repas, 08:15 repas.');

    // Bascule repas → hors repas par le chemin CLAVIER (Entrée sur la prise) :
    // un `<button>` transforme nativement Entrée en clic, et aucun hit-test
    // n'entre en jeu — voir l'en-tête de ce fichier.
    await page.getByTestId('prise-08:15').press('Enter');
    await expect(etatLigne).toHaveText('2 prises : 08:00 repas, 08:15 hors repas.');

    // Les quatre présences ont TROIS choix. On en exerce les trois, dont
    // l'abstention explicite — c'est elle qui vaut `null`, une réponse, et non
    // une clé absente.
    await page.getByRole('button', { name: 'Des protéines à votre première prise ? Oui' }).click();
    await page.getByRole('button', { name: 'Des légumes à au moins deux prises ? Non' }).click();
    await page
      .getByRole('button', { name: 'Des fruits ou des fruits à coque ? Je ne sais pas' })
      .click();
    await page.getByRole('button', { name: 'Des produits ultra-transformés ? Non' }).click();
    // `soirPlusCopieux` n'en a que DEUX : l'abstention y produirait un 400.
    await expect(
      page.getByRole('button', {
        name: 'Le repas du soir était le plus important de la journée ? Je ne sais pas',
      }),
    ).toHaveCount(0);
    await page
      .getByRole('button', { name: 'Le repas du soir était le plus important de la journée ? Oui' })
      .click();

    await page.getByRole('button', { name: 'C’est noté ✓' }).click();

    // ── 4. L'envoi a réussi, et la journée compte dans l'avancement ────────
    // La journée du jour étant désormais notée, l'écran retombe sur la frise :
    // corriger est un geste délibéré, pas l'état par défaut.
    await expect(page.getByRole('heading', { name: 'Vos journées' })).toBeVisible();
    await expect(page.getByText('1 journée notée sur 21.')).toBeVisible();
    await expect(page.getByText('Jour 1 sur 21')).toBeVisible();
    // Le seul chiffre de l'écran est un COMPTE DE SAISIES : aucun reproche,
    // aucun compte à rebours (registre des frontières).
    const corpsFrise = (await page.locator('body').innerText()).toLowerCase();
    for (const interdit of ['il vous reste', 'vous avez manqué', 'en retard']) {
      expect(corpsFrise).not.toContain(interdit);
    }

    // ── 5. Il RELIT ce qu'il a noté ────────────────────────────────────────
    // « Modifier ma journée » rouvre le formulaire pré-rempli : c'est le seul
    // endroit où le patient revoit ses propres réponses, et le seul cas de
    // pré-remplissage autorisé (la doctrine « rien n'est pré-coché » vise la
    // saisie initiale).
    await page.getByRole('button', { name: 'Modifier ma journée' }).click();
    await expect(page.getByRole('heading', { name: 'Modifier votre journée' })).toBeVisible();
    await expect(page.getByText(/prises? : /)).toHaveText(
      '2 prises : 08:00 repas, 08:15 hors repas.',
    );
    await expect(
      page.getByRole('button', { name: 'Des protéines à votre première prise ? Oui' }),
    ).toHaveAttribute('aria-pressed', 'true');
    await expect(
      page.getByRole('button', { name: 'Des légumes à au moins deux prises ? Non' }),
    ).toHaveAttribute('aria-pressed', 'true');
    // L'abstention relue se réaffiche en abstention, jamais en « non » : le
    // tri-état survit à l'aller-retour serveur.
    await expect(
      page.getByRole('button', { name: 'Des fruits ou des fruits à coque ? Je ne sais pas' }),
    ).toHaveAttribute('aria-pressed', 'true');
    await expect(
      page.getByRole('button', { name: 'Des fruits ou des fruits à coque ? Non' }),
    ).toHaveAttribute('aria-pressed', 'false');

    // ── 6. Le hub reflète la journée notée ─────────────────────────────────
    await page.getByRole('button', { name: 'Voir ma frise' }).click();
    await page.getByRole('button', { name: 'Retour à mon parcours' }).click();
    await expect(page.getByRole('heading', { name: 'Mon parcours' })).toBeVisible();
    // Le libellé d'entrée a changé d'état : plus rien à noter aujourd'hui.
    await expect(page.getByRole('link', { name: 'Commencer mon agenda alimentaire' })).toHaveCount(
      0,
    );
    await expect(
      page.getByRole('link', { name: 'Consulter « Agenda alimentaire — 21 jours »' }),
    ).toBeVisible();
  });

  test('la journée du jour manquante fait passer l’agenda devant, avec son avancement', async ({
    page,
  }) => {
    await resetPortailState(PATIENT.idPatient);
    await accuserCadreTrust(PATIENT.idPatient);

    // Un agenda ET un questionnaire ordinaire : c'est la coexistence qui rend
    // le test discriminant — sans le second, n'importe quelle mise en avant
    // passerait.
    await page.context().addCookies([await praticienSessionCookie()]);
    const idAssignation = await assignerAgenda(page);
    const autre = await page.request.post('/api/praticien/assignations', {
      data: { emailPatient: PATIENT.email, idQuestionnaire: 'Q_STR_06' },
    });
    expect(autre.status()).toBe(200);

    await page.context().addCookies([
      patientPortailSessionCookie(PATIENT.idPatient, PATIENT.email),
    ]);

    // Consentement par la route, pas par l'écran : le franchissement à l'écran
    // est l'objet du premier test, et le rejouer ici n'ajouterait rien.
    const consentement = await page.request.post('/api/patient/consentement', {
      data: { idAssignation, action: 'donner' },
    });
    expect(consentement.status()).toBe(200);

    // La journée d'HIER, donc celle du jour manque. La fenêtre s'ancre sur
    // hier ; aujourd'hui est le jour 2 du recueil.
    const saisie = await page.request.post('/api/portail/agenda-alimentaire', {
      data: {
        idAssignation,
        dateJour: dateParis(-1),
        reponses: {
          prises: [
            { heure: '08:00', nature: 'repas' },
            { heure: '12:30', nature: 'repas' },
            { heure: '19:30', nature: 'repas' },
          ],
          premierePriseProteines: true,
          legumesDeuxPrises: true,
          fruitsOuOleagineux: null,
          ultraTransformes: false,
        },
      },
    });
    expect(saisie.ok()).toBe(true);

    // L'agenda est la seule tâche PÉRISSABLE du portail : il passe devant le
    // questionnaire ordinaire, avec le compte de journées en appui.
    await page.goto(`/portail/${PATIENT.idPatient}/questionnaires`);
    await expect(page.getByRole('heading', { name: 'Mon parcours' })).toBeVisible();
    const cta = page.getByRole('link', { name: 'Noter ma journée' });
    await expect(cta).toBeVisible();
    await expect(cta).toHaveAttribute(
      'href',
      `/portail/${PATIENT.idPatient}/questionnaires/${idAssignation}`,
    );
    // L'avancement, et rien de plus qu'un compte de saisies.
    await expect(page.getByText('1 journée notée sur 21.')).toBeVisible();

    const corps = (await page.locator('body').innerText()).toLowerCase();
    for (const interdit of ['il vous reste', 'vous avez manqué', 'en retard']) {
      expect(corps).not.toContain(interdit);
    }
  });

  // ── Clôture praticien → l'agenda entre au dossier (LOT-00 + bouton) ───────
  // La preuve de bout en bout du LOT-00 : le praticien clôture depuis l'écran,
  // et la passation apparaît dans « Détail des réponses ». Elle rend
  // « Historique » — `Q_ALI_09` n'a pas de bloc `certification` au catalogue,
  // donc `certification: null` (D-039 : la clôture ne cote rien). Ce badge
  // était devenu inatteignable en E2E depuis D-038, où le seed ne produisait
  // plus que des passations certifiées ; ce chemin le ré-atteint par une vraie
  // clôture, pas par le seed.
  test('le praticien clôture l’agenda depuis l’écran, et la passation entre au dossier en « Historique »', async ({ page }) => {
    await resetPortailState(PATIENT.idPatient);
    await accuserCadreTrust(PATIENT.idPatient);

    await page.context().addCookies([await praticienSessionCookie()]);
    const idAssignation = await assignerAgenda(page);

    // Le consentement et la saisie passent par la SESSION PORTAIL du patient
    // (routes `/api/patient/*` et `/api/portail/*`). Le cookie praticien
    // (`next-auth.session-token`) et le cookie portail (`wn_portail`) portent
    // des noms distincts : ajoutés tous deux, ils coexistent — le premier sert
    // la fiche `/dashboard` plus bas, le second ces deux appels-ci.
    await page.context().addCookies([
      patientPortailSessionCookie(PATIENT.idPatient, PATIENT.email),
    ]);
    const consentement = await page.request.post('/api/patient/consentement', {
      data: { idAssignation, action: 'donner' },
    });
    expect(consentement.status()).toBe(200);

    // Deux journées par l'API — hier et aujourd'hui, dates en Europe/Paris.
    for (const decalage of [-1, 0]) {
      const saisie = await page.request.post('/api/portail/agenda-alimentaire', {
        data: {
          idAssignation,
          dateJour: dateParis(decalage),
          reponses: {
            prises: [
              { heure: '08:00', nature: 'repas' },
              { heure: '12:30', nature: 'repas' },
              { heure: '19:30', nature: 'repas' },
            ],
            premierePriseProteines: true,
            legumesDeuxPrises: true,
            fruitsOuOleagineux: null,
            ultraTransformes: false,
          },
        },
      });
      expect(saisie.ok()).toBe(true);
    }

    // ── Le praticien ouvre la fiche, le tiroir de l'agenda, et clôture ──────
    await page.goto(`/dashboard/patients/${PATIENT.idPatient}`);
    await page.getByRole('button', { name: 'Agenda alimentaire' }).click();
    const tiroir = page.getByRole('dialog');
    await expect(tiroir.getByText('En cours', { exact: false })).toBeVisible();

    await tiroir.getByRole('button', { name: 'Clôturer et verser au dossier' }).click();

    // Rechargé après clôture : le statut passe à « Clôturé », le bouton s'en va.
    await expect(tiroir.getByText('Clôturé', { exact: false })).toBeVisible();
    await expect(tiroir.getByRole('button', { name: 'Clôturer et verser au dossier' })).toHaveCount(0);
    // Fermer le tiroir avant d'en ouvrir un autre.
    await tiroir.getByRole('button', { name: /Fermer l’instrument/ }).click();

    // ── La passation clôturée est au dossier, en « Historique » ─────────────
    await page.getByRole('button', { name: 'Détail des réponses' }).click();
    const table = page.getByRole('dialog').getByRole('table');
    const ligne = table.getByRole('row', { name: /Agenda alimentaire/ });
    const badge = ligne.getByText('Historique', { exact: true });
    await expect(badge).toBeVisible();
    await expect(badge).toHaveAttribute('data-variant', 'neutral');
  });
});
