// « Mon bilan » dans le portail, dans un vrai navigateur.
//
// Ce que ce spec apporte que le banc du domaine (lib/documents/bilanPatient.test.ts)
// et le test de route ne donnent pas : la preuve que ce qui atteint L'ÉCRAN du
// patient est bien le narratif et la note — et rien des trois blocs réservés au
// praticien. Le domaine dit ce que la projection contient ; seul le navigateur
// dit ce que le patient lit.
//
// Patient fictif Michel Dogné (PAT_SEED_03), autorisé. `workers: 1` et
// `fullyParallel: false` : aucun autre spec ne tourne pendant celui-ci.
import { test, expect } from '@playwright/test';
import { patientPortailSessionCookie } from './helpers/auth';
import {
  resetPortailState,
  accuserCadreTrust,
  provisionBilanTransmis,
  rejeterBilanTransmis,
  annoterApresEnvoi,
  cleanupBilanTransmis,
  closePrisma,
} from './helpers/db';

const PATIENT = { idPatient: 'PAT_SEED_03', email: 'michel.dogne@fictif.wellneuro.fr' };

// Ce que le praticien garde pour lui — jamais dans la page du patient.
const RESERVE_AU_PRATICIEN = [
  'Résumé réservé au praticien',
  'Réveils nocturnes répétés',
  'Doser la ferritine',
  'Fatigue persistante',
  'Depuis quand dormez-vous mal',
];

test.afterAll(async () => {
  await cleanupBilanTransmis();
  await closePrisma();
});

test.describe('Portail — Mon bilan', () => {
  test('le bilan n’apparaît qu’une fois transmis, réduit au narratif et à la note', async ({
    page,
  }) => {
    await resetPortailState(PATIENT.idPatient);
    await cleanupBilanTransmis();
    // Sans l'accusé, le hub est masqué par « Avant de commencer » (4 écrans).
    await accuserCadreTrust(PATIENT.idPatient);
    await page.context().addCookies([
      patientPortailSessionCookie(PATIENT.idPatient, PATIENT.email),
    ]);

    // 1. Rien de transmis : aucun accès au bilan depuis le hub…
    await page.goto(`/portail/${PATIENT.idPatient}/questionnaires`);
    await expect(page.getByRole('heading', { name: 'Mon parcours' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Consulter mon bilan' })).toHaveCount(0);

    // …et la page atteinte directement le dit, sans ressembler à une panne.
    await page.goto(`/portail/${PATIENT.idPatient}/bilan`);
    await expect(page.getByRole('heading', { name: 'Mon bilan' })).toBeVisible();
    await expect(page.getByText('ne vous a pas encore transmis')).toBeVisible();

    // 2. Le praticien transmet.
    await provisionBilanTransmis(PATIENT.idPatient, PATIENT.email);

    // 3. L'accès apparaît dans le hub — en accès secondaire, pas en étape du
    //    moment : un document à relire n'est pas une tâche périssable.
    await page.goto(`/portail/${PATIENT.idPatient}/questionnaires`);
    const lien = page.getByRole('link', { name: 'Consulter mon bilan' });
    await expect(lien).toBeVisible();
    await expect(lien).toHaveAttribute('href', `/portail/${PATIENT.idPatient}/bilan`);

    // 4. Le document s'affiche.
    await lien.click();
    await expect(page.getByRole('heading', { name: 'Bilan neuronutritionnel' })).toBeVisible();
    await expect(page.getByText('sommeil fragmenté')).toBeVisible();
    await expect(page.getByText('On en reparle à votre prochain rendez-vous.')).toBeVisible();
    await expect(page.getByText('Transmis par votre praticien le 18 juillet 2026')).toBeVisible();
    // Formulation propre au document — le portail porte déjà une mention
    // générale (« Cet espace ne constitue pas… »), que ce spec ne vise pas.
    await expect(page.getByText('Ce bilan ne constitue pas un diagnostic médical.')).toBeVisible();

    // 5. Et rien de ce qui est réservé au praticien n'y figure.
    const corps = await page.locator('body').innerText();
    for (const reserve of RESERVE_AU_PRATICIEN) {
      expect(corps).not.toContain(reserve);
    }
  });

  // La moitié NÉGATIVE de la règle de visibilité, jouée contre une vraie base.
  // Les tests de route l'assertent en boîte blanche, sur l'objet `where` d'un
  // mock : cela prouve que la route *demande* le bon filtre, pas que la donnée
  // filtrée reste invisible.
  test('un envoi échoué ne rend rien visible — le patient ne l’a pas reçu', async ({ page }) => {
    await resetPortailState(PATIENT.idPatient);
    await accuserCadreTrust(PATIENT.idPatient);
    await provisionBilanTransmis(PATIENT.idPatient, PATIENT.email, { statutEnvoi: 'Erreur' });
    await page.context().addCookies([
      patientPortailSessionCookie(PATIENT.idPatient, PATIENT.email),
    ]);

    await page.goto(`/portail/${PATIENT.idPatient}/questionnaires`);
    await expect(page.getByRole('heading', { name: 'Mon parcours' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Consulter mon bilan' })).toHaveCount(0);

    await page.goto(`/portail/${PATIENT.idPatient}/bilan`);
    await expect(page.getByText('ne vous a pas encore transmis')).toBeVisible();
    expect(await page.locator('body').innerText()).not.toContain('sommeil fragmenté');
  });

  // Le défaut bloquant qu'une revue adversariale a trouvé sur ce lot : la page
  // servait la note VIVANTE de la synthèse. Or « Enregistrer la note » (action
  // `annoter`) n'a aucune garde de cycle de vie — un praticien pouvait donc
  // pousser un texte au patient sans rien envoyer, y compris sur un dossier
  // clôturé où tout renvoi est refusé, sous l'étiquette « Transmis le 18
  // juillet ». La colonne `note_transmise` fige ce qui est réellement parti.
  test('annoter après l’envoi ne change rien pour le patient', async ({ page }) => {
    await resetPortailState(PATIENT.idPatient);
    await accuserCadreTrust(PATIENT.idPatient);
    await provisionBilanTransmis(PATIENT.idPatient, PATIENT.email);
    await page.context().addCookies([
      patientPortailSessionCookie(PATIENT.idPatient, PATIENT.email),
    ]);

    await page.goto(`/portail/${PATIENT.idPatient}/bilan`);
    await expect(page.getByText('On en reparle à votre prochain rendez-vous.')).toBeVisible();

    await annoterApresEnvoi('Note écrite après coup, jamais transmise au patient.');

    await page.reload();
    await expect(page.getByText('On en reparle à votre prochain rendez-vous.')).toBeVisible();
    expect(await page.locator('body').innerText()).not.toContain('jamais transmise');
  });

  // Le seul chemin de retrait dont dispose le praticien : `effacer` est refusé
  // dès qu'un envoi existe, et l'e-mail est parti. Sans cette soupape, un bilan
  // erroné resterait lisible indéfiniment.
  //
  // LE RETRAIT PORTE SUR LES DEUX SURFACES, ET LE HUB EST LA PLUS EXPOSÉE : la
  // page atteinte directement dit au moins « rien ne vous a été transmis »,
  // tandis qu'un lien resté sur le hub PROPOSE un document qui n'existe plus —
  // le patient clique et tombe sur un démenti. Le hub sert `bilanConsultable`
  // (filtré par `whereEnvoiVisible`), et non `bookletEnvoye`, qui reste vrai
  // pour ne pas faire reculer la frise du parcours.
  test('un bilan rejeté après coup disparaît de l’écran du patient — page ET hub', async ({
    page,
  }) => {
    await resetPortailState(PATIENT.idPatient);
    await accuserCadreTrust(PATIENT.idPatient);
    await provisionBilanTransmis(PATIENT.idPatient, PATIENT.email);
    await page.context().addCookies([
      patientPortailSessionCookie(PATIENT.idPatient, PATIENT.email),
    ]);

    // Contrôle : avant le rejet, les deux surfaces proposent le bilan. Sans
    // lui, les assertions d'absence seraient vertes pour une mauvaise raison.
    await page.goto(`/portail/${PATIENT.idPatient}/questionnaires`);
    await expect(page.getByRole('link', { name: 'Consulter mon bilan' })).toBeVisible();

    await page.goto(`/portail/${PATIENT.idPatient}/bilan`);
    await expect(page.getByText('sommeil fragmenté')).toBeVisible();

    await rejeterBilanTransmis();

    await page.reload();
    await expect(page.getByText('ne vous a pas encore transmis')).toBeVisible();
    expect(await page.locator('body').innerText()).not.toContain('sommeil fragmenté');

    // Et le hub cesse de proposer le lien : il ne doit pas rester une porte
    // ouverte sur un document retiré.
    await page.goto(`/portail/${PATIENT.idPatient}/questionnaires`);
    await expect(page.getByRole('heading', { name: 'Mon parcours' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Consulter mon bilan' })).toHaveCount(0);
  });
});
