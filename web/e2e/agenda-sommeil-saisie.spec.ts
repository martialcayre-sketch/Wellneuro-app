// La saisie d'une nuit de l'agenda du sommeil, de bout en bout, dans un vrai
// navigateur.
//
// Remplace `agenda-sommeil-cadran.spec.ts` : le cadran circulaire et ses
// poignées ont laissé place à des listes d'heures au quart d'heure, en trois
// écrans (LOT-03 de la campagne 2026-10-07-agenda-sommeil-adhesion). Ce spec
// prouve ce que le banc jsdom ne peut pas : que le parcours réel — consentement,
// trois écrans, envoi au serveur, retour à la frise — aboutit, et qu'un écran
// incomplet dit ce qui manque au lieu de rester muet.
//
// Patient fictif Michel Dogné (PAT_SEED_03), autorisé. `workers: 1` et
// `fullyParallel: false` : aucun autre spec ne tourne pendant celui-ci.
import { test, expect, type Page } from '@playwright/test';
import { praticienSessionCookie, patientPortailSessionCookie } from './helpers/auth';
import { resetPortailState, closePrisma } from './helpers/db';

const PATIENT = { idPatient: 'PAT_SEED_03', email: 'michel.dogne@fictif.wellneuro.fr' };

async function ouvrirAgenda(page: Page): Promise<void> {
  await resetPortailState(PATIENT.idPatient);

  await page.context().addCookies([await praticienSessionCookie()]);
  const creation = await page.request.post('/api/praticien/assignations', {
    data: { emailPatient: PATIENT.email, idQuestionnaire: 'Q_SOM_09' },
  });
  expect(creation.status()).toBe(200);
  const { idAssignation } = (await creation.json()) as { idAssignation: string };

  await page.context().addCookies([patientPortailSessionCookie(PATIENT.idPatient, PATIENT.email)]);
  await page.goto(`/portail/${PATIENT.idPatient}/questionnaires/${idAssignation}`);

  // Consentement de l'assignation : une case, un bouton. Il précède tout
  // questionnaire et n'est pas l'objet de ce spec.
  await page.getByLabel(/ai lu ces informations/).check();
  await page.getByRole('button', { name: 'Continuer vers le questionnaire' }).click();

  // Aucune nuit encore notée : l'écran de saisie s'ouvre directement, au soir.
  await expect(page.getByRole('heading', { name: 'Votre nuit passée' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Le soir' })).toBeVisible();
}

test.afterAll(async () => {
  await resetPortailState(PATIENT.idPatient);
  await closePrisma();
});

test.describe('agenda du sommeil — saisie d’une nuit', () => {
  test('un écran incomplet nomme ce qui manque et ne passe pas', async ({ page }) => {
    await ouvrirAgenda(page);

    await page.getByRole('button', { name: 'Continuer' }).click();
    await expect(page.getByText(/^Il reste à renseigner : /)).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Le soir' })).toBeVisible();
  });

  test('une nuit se note en trois écrans et rejoint la frise', async ({ page }) => {
    await ouvrirAgenda(page);

    // Le soir. Un agenda neuf s'ouvre sous le contrat v4 ([[D-271]], [[D-272]]) :
    // le repère est l'heure où le patient a essayé de dormir, et « je ne sais
    // pas » est une réponse que le serveur accepte.
    await page.getByLabel(/essayé de dormir à/).selectOption('23:00');
    await page.getByRole('button', { name: 'Au même moment que mon coucher' }).click();
    await page.getByRole('button', { name: 'Je ne sais pas' }).click();
    await page.getByRole('button', { name: 'Continuer' }).click();

    // La nuit.
    await expect(page.getByRole('heading', { name: 'Pendant la nuit' })).toBeVisible();
    await page.getByRole('button', { name: 'Nuit continue, aucun réveil' }).click();
    await page.getByRole('button', { name: 'Aucune aide pour dormir cette nuit' }).click();
    await page.getByRole('button', { name: 'Continuer' }).click();

    // Le matin.
    await expect(page.getByRole('heading', { name: 'Le matin' })).toBeVisible();
    await page.getByLabel(/levé·e à/).selectOption('07:00');
    await page.getByRole('button', { name: 'Au même moment que mon réveil' }).click();
    await page.getByRole('button', { name: 'Très bonne' }).click();
    await page.getByRole('button', { name: 'C’est noté ✓' }).click();

    // La nuit du jour est notée : l'écran retombe sur la frise.
    await expect(page.getByText('1 nuit notée sur 21.')).toBeVisible();
  });
});
