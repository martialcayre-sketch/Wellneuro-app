// Instrument du cabinet déclaré « oui », désignation COPIÉE à l'envoi
// ([[D-515]], lot de code §6.2, PR 3 ; inversé à la signature, PR 4).
// `WN_ENABLE_DECLARATION_SUICIDE_CAB` est allumé pour le serveur des E2E
// seulement (`playwright.config.ts`), jamais en production avant le geste du
// responsable.
//
// CE QUE CE SPEC PROUVE, TABLE `SAF-QUEST-02` SIGNÉE (2026-11-15, [[D-524]]) :
// le serveur sert la désignation copiée (question et valeur « non ») ; le
// patient lit l'encart de [[D-275]] sur l'écran de saisie et au résumé ; la
// valeur « non » désignée n'ouvre AUCUN message, une autre question non plus ;
// la réponse la plus légère autre que « non » à la question désignée ouvre le
// message de [[D-277]] §1 sous la question, puis au résumé. Le courriel,
// appelé aux mêmes conditions, est éprouvé par `reponseSuicide.guard.test.ts`
// (banc navigateur ↔ serveur) : aucune réponse n'est transmise ici.
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

test.describe.serial('Portail — instrument du cabinet désigné, SAF-QUEST-02 signée ([[D-515]], [[D-524]])', () => {
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

  test('la désignation servie ; « non » et une autre question muettes ; la réponse la plus légère ouvre le message, sous la question et au résumé', async ({ page, context }) => {
    await context.addCookies([patientPortailSessionCookie(PATIENT.idPatient, PATIENT.email)]);
    const reponseApi = page.waitForResponse(res => res.url().includes('/api/patient/questionnaire?') && res.request().method() === 'GET');
    await page.goto(`/portail/${PATIENT.idPatient}/questionnaires/${idAssignation}`);

    // Le verdict du serveur : l'encart est dû, et la désignation copiée est servie.
    const corps = await (await reponseApi).json() as {
      encartUrgenceCabinet?: boolean;
      designationSuicideCabinet?: { idQuestion: string; valeurNon: number };
    };
    expect(corps.encartUrgenceCabinet).toBe(true);
    expect(corps.designationSuicideCabinet).toEqual({ idQuestion: 'Q2', valeurNon: 0 });

    const q1 = (valeur: number) => page.locator(`input[type="radio"][name="Q1"][value="${valeur}"]`);
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

    // Une autre question, même à sa réponse la plus haute : rien.
    await q1(2).check();
    await expect(message).toHaveCount(0);
    // La valeur « non » désignée : rien.
    await q2(0).check();
    await expect(q2(0)).toBeChecked();
    await expect(message).toHaveCount(0);
    // La réponse la plus légère autre que « non » : le message paraît.
    await q2(1).check();
    await expect(q2(1)).toBeChecked();
    await expect(message).toBeVisible();
    // Sous la question désignée : le message suit Q2 dans le document, et Q1
    // la précède (revue `wn-reviewer` de la PR de signature, P3-1).
    expect(await message.evaluate(el => {
      const designee = document.querySelector('input[type="radio"][name="Q2"]');
      const autre = document.querySelector('input[type="radio"][name="Q1"]');
      return !!designee && !!autre
        && (designee.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0
        && (autre.compareDocumentPosition(designee) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
    })).toBe(true);

    await page.getByRole('button', { name: 'Voir le résumé' }).click();
    await expect(page.getByRole('heading', { name: 'Vérifiez votre questionnaire' })).toBeVisible();
    await expect(encart).toBeVisible();
    await expect(message).toBeVisible();
  });
});
