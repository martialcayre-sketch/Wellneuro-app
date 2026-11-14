// Instrument du cabinet déclaré « oui », désignation COPIÉE à l'envoi
// ([[D-515]], lot de code §6.2, PR 3). `WN_ENABLE_DECLARATION_SUICIDE_CAB` est
// allumé pour le serveur des E2E seulement (`playwright.config.ts`), jamais
// en production avant le geste du responsable.
//
// CE QUE CE SPEC PROUVE, TABLE `SAF-QUEST-02` NON SIGNÉE (état livré) : le
// patient lit l'encart de [[D-275]] sur l'écran de saisie et au résumé, et
// JAMAIS le message de [[D-277]] §1 — même la réponse la plus grave à la
// question désignée. Le serveur ne sert pas la désignation tant que la table
// n'est pas signée : le patient ne peut pas lire « votre praticien sera
// prévenu » alors qu'aucun courriel ne partirait. Le jour de la signature
// (PR 4), ce spec change avec elle : le message paraît sous la question
// désignée et au résumé.
//
// Patient fictif Michel Dogné (PAT_SEED_03). Un instrument `CAB_E2E_DESIGNATION`
// et une assignation, retirés en fin de spec. Aucune réponse n'est transmise.
import { test, expect } from '@playwright/test';
import {
  accuserPorteTrust,
  closePrisma,
  creerAssignationCabinetDesignee,
  nettoyerInstrumentCabinetDesigneE2E,
  resetPortailState,
} from './helpers/db';
import { patientPortailSessionCookie } from './helpers/auth';

const PATIENT = { idPatient: 'PAT_SEED_03', email: 'michel.dogne@fictif.wellneuro.fr' };
const DEBUT_DU_MESSAGE = 'Vous venez d’indiquer des idées de mort ou de suicide.';

test.describe.serial('Portail — instrument du cabinet désigné, SAF-QUEST-02 non signée ([[D-515]])', () => {
  let idAssignation = '';

  test.beforeAll(async () => {
    await resetPortailState(PATIENT.idPatient);
    await accuserPorteTrust(PATIENT.idPatient);
    idAssignation = await creerAssignationCabinetDesignee(PATIENT.idPatient, PATIENT.email);
  });

  test.afterAll(async () => {
    await resetPortailState(PATIENT.idPatient);
    await nettoyerInstrumentCabinetDesigneE2E();
    await closePrisma();
  });

  test('l’encart à la saisie et au résumé ; ni désignation servie, ni message, même sur la réponse la plus grave', async ({ page, context }) => {
    await context.addCookies([patientPortailSessionCookie(PATIENT.idPatient, PATIENT.email)]);
    const reponseApi = page.waitForResponse(res => res.url().includes('/api/patient/questionnaire?') && res.request().method() === 'GET');
    await page.goto(`/portail/${PATIENT.idPatient}/questionnaires/${idAssignation}`);

    // Le verdict du serveur : l'encart est dû, la désignation n'est pas servie.
    const corps = await (await reponseApi).json() as { encartUrgenceCabinet?: boolean; designationSuicideCabinet?: unknown };
    expect(corps.encartUrgenceCabinet).toBe(true);
    expect('designationSuicideCabinet' in corps).toBe(false);

    const q2 = (valeur: number) => page.locator(`input[type="radio"][name="Q2"][value="${valeur}"]`);
    const consentement = page.getByLabel(/ai lu ces informations/);
    await expect(consentement.or(q2(0))).toBeAttached();
    if (await consentement.count()) {
      await consentement.check();
      await page.getByRole('button', { name: 'Continuer vers le questionnaire' }).click();
    }

    const encart = page.getByRole('note', { name: 'Besoin d’aide maintenant ?' });
    const message = page.getByRole('alert').filter({ hasText: DEBUT_DU_MESSAGE });
    await expect(encart).toBeVisible();

    await page.locator('input[type="radio"][name="Q1"][value="2"]').check();
    await q2(2).check();
    await expect(q2(2)).toBeChecked();
    await expect(message).toHaveCount(0);

    await page.getByRole('button', { name: 'Voir le résumé' }).click();
    await expect(page.getByRole('heading', { name: 'Vérifiez votre questionnaire' })).toBeVisible();
    await expect(encart).toBeVisible();
    await expect(message).toHaveCount(0);
  });
});
