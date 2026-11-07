// Accessibilité des écrans de SAISIE du portail patient — audit UI du
// 2026-11-05 (grille WCAG 2.1 A/AA). Les specs axe existants couvrent le hub,
// la frise, les menus : aucun ne passait par la fiche de renseignements ni par
// le formulaire à curseurs `PlaintesForm`, là où les libellés n'étaient pas
// reliés à leurs champs (WCAG 1.3.1 / 4.1.2) et où les curseurs n'avaient pas
// de nom.
//
// Patient fictif Michel Dogné (PAT_SEED_03), autorisé. `workers: 1` et
// `fullyParallel: false` : aucun autre spec ne tourne pendant celui-ci.
// Les écritures se limitent à ce que le parcours normal produit (consultation
// par la route praticien, consentement par l'écran) et à une assignation
// `Q_PLAINTES` sans réponse ; `resetPortailState` les retire en fin de spec.
import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { accuserPorteTrust, closePrisma, creerAssignationPlaintes, resetPortailState } from './helpers/db';
import { praticienSessionCookie, patientPortailSessionCookie } from './helpers/auth';

const PATIENT = { idPatient: 'PAT_SEED_03', email: 'michel.dogne@fictif.wellneuro.fr' };

async function auditer(page: Page): Promise<void> {
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(violations.map(v => `${v.id} (${v.impact}) : ${v.nodes.map(n => n.target.join(' ')).join(' | ')}`)).toEqual([]);
}

test.describe.serial('Portail — accessibilité des écrans de saisie', () => {
  test.beforeAll(async () => {
    await resetPortailState(PATIENT.idPatient);
    // La séquence « Avant de commencer » n'est pas l'objet de ce spec :
    // `portail-parcours` la couvre.
    await accuserPorteTrust(PATIENT.idPatient);
  });

  test.afterAll(async () => {
    await resetPortailState(PATIENT.idPatient);
    await closePrisma();
  });

  test('la fiche de renseignements passe axe, et ses libellés nomment leurs champs', async ({ page, context }) => {
    await context.addCookies([await praticienSessionCookie()]);
    const res = await page.request.post('/api/praticien/consultations', { data: { idPatient: PATIENT.idPatient } });
    expect(res.ok()).toBe(true);
    await context.addCookies([patientPortailSessionCookie(PATIENT.idPatient, PATIENT.email)]);

    await page.goto(`/portail/${PATIENT.idPatient}`);
    await expect(page.getByRole('heading', { name: 'Votre consentement au suivi' })).toBeVisible();
    await page.getByLabel(/ai lu ces informations/i).check();
    await Promise.all([
      page.waitForResponse(r => r.url().includes('/api/portail/consentement') && r.status() === 200),
      page.getByRole('button', { name: 'Donner mon consentement' }).click(),
    ]);

    await expect(page.getByRole('heading', { name: 'Fiche de renseignements' })).toBeVisible();
    // Le libellé nomme le champ : c'était le défaut relevé par l'audit.
    await expect(page.getByLabel(/Situation familiale/)).toBeVisible();
    await auditer(page);
  });

  test('PlaintesForm passe axe, et chaque curseur porte un nom et une valeur lisible', async ({ page, context }) => {
    const idAssignation = await creerAssignationPlaintes(PATIENT.idPatient, PATIENT.email);
    await context.addCookies([patientPortailSessionCookie(PATIENT.idPatient, PATIENT.email)]);
    await page.goto(`/portail/${PATIENT.idPatient}/questionnaires/${idAssignation}`);

    // Consentement de l'assignation : il précède tout questionnaire.
    await page.getByLabel(/ai lu ces informations/).check();
    await page.getByRole('button', { name: 'Continuer vers le questionnaire' }).click();

    const fatigue = page.getByRole('slider', { name: 'Fatigue' });
    await expect(fatigue).toBeVisible();
    await expect(fatigue).toHaveAttribute('aria-valuetext', /sur 10$/);
    await auditer(page);

    // « Suivant » ne doit pas soumettre : avant le correctif, le même <button>
    // passait à `type="submit"` pendant le clic, et la confirmation de
    // transmission s'ouvrait dès l'arrivée sur l'étape 2 (audit UI du
    // 2026-11-07, reproduit dans Chromium). Le dialogue ne s'ouvrant qu'à la
    // soumission, l'attendre absent juste après le clic suffit.
    await page.getByRole('button', { name: 'Suivant →' }).click();
    await expect(page.getByRole('slider', { name: 'Insomnie / sommeil' })).toBeVisible();
    await expect(page.getByText('Étape 2 sur 2')).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });
});
