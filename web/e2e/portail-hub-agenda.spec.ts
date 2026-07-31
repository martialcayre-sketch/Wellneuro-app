// Le hub patient quand un agenda du sommeil est ouvert, dans un vrai navigateur.
//
// Ce que ce spec apporte que le banc du domaine (lib/portail/
// hubQuestionnaires.test.ts) ne peut pas donner : la preuve que la décision
// atteint bien l'ÉCRAN. Le domaine dit quelle étape doit primer ; seul le
// navigateur dit ce que le patient lit à l'ouverture de son espace. CLAUDE.md
// est explicite là-dessus — une suite Vitest verte ne prouve rien sur les
// parcours.
//
// Patient fictif Michel Dogné (PAT_SEED_03), autorisé. `workers: 1` et
// `fullyParallel: false` : aucun autre spec ne tourne pendant celui-ci.
import { test, expect } from '@playwright/test';
import { praticienSessionCookie, patientPortailSessionCookie } from './helpers/auth';
import { resetPortailState, accuserCadreTrust, closePrisma } from './helpers/db';

const PATIENT = { idPatient: 'PAT_SEED_03', email: 'michel.dogne@fictif.wellneuro.fr' };

test.afterAll(async () => {
  await closePrisma();
});

test.describe('Hub patient — agenda du sommeil', () => {
  test('un agenda commencé dont la nuit du jour manque devient l’étape du moment', async ({
    page,
  }) => {
    await resetPortailState(PATIENT.idPatient);
    // Sans l'accusé, le hub est masqué par « Avant de commencer » (4 écrans).
    await accuserCadreTrust(PATIENT.idPatient);

    // Un agenda ET un questionnaire ordinaire : c'est la coexistence qui rend
    // le test discriminant — sans le second, n'importe quelle mise en avant
    // passerait.
    await page.context().addCookies([await praticienSessionCookie()]);
    const agenda = await page.request.post('/api/praticien/assignations', {
      data: { emailPatient: PATIENT.email, idQuestionnaire: 'Q_SOM_09' },
    });
    expect(agenda.status()).toBe(200);
    const { idAssignation } = (await agenda.json()) as { idAssignation: string };

    const autre = await page.request.post('/api/praticien/assignations', {
      data: { emailPatient: PATIENT.email, idQuestionnaire: 'Q_STR_06' },
    });
    expect(autre.status()).toBe(200);

    await page.context().addCookies([
      patientPortailSessionCookie(PATIENT.idPatient, PATIENT.email),
    ]);

    // 1. Agenda jamais commencé : il n'est PAS prioritaire — rien ne se perd à
    //    commencer demain, la fenêtre s'ancre sur la première nuit.
    await page.goto(`/portail/${PATIENT.idPatient}/questionnaires`);
    await expect(page.getByRole('heading', { name: 'Mon parcours' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Noter ma nuit' })).toHaveCount(0);

    // 2. Le patient note une nuit — celle d'HIER, donc celle du jour manque.
    //
    // La date se calcule en EUROPE/PARIS, comme le serveur (`dateJourParis`), et
    // surtout pas en UTC. `toISOString().slice(0, 10)` rendait la date UTC :
    // entre minuit et 2 h du matin l'été, UTC a un jour de retard sur Paris, et
    // « hier » tombait donc DEUX jours avant le « hier » du serveur.
    // `estDateSaisissable` n'accepte qu'aujourd'hui ou la veille — la saisie
    // était refusée, et ce test échouait deux heures par nuit, sur `main` comme
    // sur toute branche qui en descend. Le CI du 2026-07-30 à 23 h 29 UTC, soit
    // 1 h 29 à Paris, est tombé dedans.
    const dateParis = (decalageJours: number) => new Intl.DateTimeFormat('fr-CA', {
      timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(new Date(Date.now() + decalageJours * 86_400_000));
    const hier = dateParis(-1);
    const saisie = await page.request.post('/api/portail/agenda-sommeil', {
      data: {
        idAssignation,
        dateNuit: hier,
        reponses: {
          contractVersion: 'agenda-sommeil-v2',
          heureCoucher: '23:00',
          heureLever: '07:00',
          latence: 'lt15',
          qualite: 4,
          reveils: { dureeTotale: 'aucun' },
          aideSommeil: 'aucune',
          extinctionImmediate: true,
          leverImmediat: true,
        },
      },
    });
    expect(saisie.ok()).toBe(true);

    // 3. Maintenant l'agenda est la seule tâche périssable : il passe devant.
    await page.reload();
    const cta = page.getByRole('link', { name: 'Noter ma nuit' });
    await expect(cta).toBeVisible();
    await expect(cta).toHaveAttribute(
      'href',
      `/portail/${PATIENT.idPatient}/questionnaires/${idAssignation}`,
    );

    // La ligne factuelle accompagne le bouton — et ne dit rien d'autre qu'un
    // compte de nuits (doctrine : aucun compte à rebours, aucun reproche).
    await expect(page.getByText('1 nuit notée sur 21.')).toBeVisible();
    const corps = (await page.locator('body').innerText()).toLowerCase();
    for (const interdit of ['il vous reste', 'vous avez manqué', 'en retard']) {
      expect(corps).not.toContain(interdit);
    }

    // Le lien pointe la bonne assignation — l'ouverture du journal elle-même
    // (et son écran de consentement) est l'objet d'`agenda-sommeil-cadran`.
  });
});
