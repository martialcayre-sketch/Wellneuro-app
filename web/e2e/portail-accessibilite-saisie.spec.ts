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

// ÉCARTS CONNUS, antérieurs à ce lot et relevés par ce spec à sa création
// (2026-11-06). Chacun est désigné par sa règle ET par un fragment du HTML de
// l'élément fautif : tout autre nœud de la même règle reste un échec. Leur
// correctif est une décision de design, hors de la finalité de ce lot
// (apparence constante) ; les retirer d'ici dès qu'ils sont corrigés.
const ECARTS_CONNUS: { regle: string; html: string; motif: string }[] = [
  {
    // `text-primary` sur `bg-primary/10` posé sur le fond beige de la page
    // (hors carte) : environ 4,1:1 pour 4,5:1 exigés (WCAG 1.4.3).
    regle: 'color-contrast',
    html: 'rounded-xl border border-border bg-primary/10 px-4 py-3 text-xs text-primary',
    motif: 'bandeau « Ce questionnaire entre dans le cadre… » de questionnaires/[idAssignation]',
  },
  {
    // `PatientJourneyProgress` défile horizontalement sous 390 px sans
    // contenu focalisable : même famille que le défilement clavier des
    // frises, laissé hors périmètre (WCAG 2.1.1).
    regle: 'scrollable-region-focusable',
    html: 'aria-label="Étapes de votre parcours"',
    motif: 'frise PatientJourneyProgress sur iPhone',
  },
];

async function auditer(page: Page): Promise<void> {
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  const restantes = violations
    .map(v => ({
      ...v,
      nodes: v.nodes.filter(n => !ECARTS_CONNUS.some(e => e.regle === v.id && n.html.includes(e.html))),
    }))
    .filter(v => v.nodes.length > 0);
  expect(restantes.map(v => `${v.id} (${v.impact}) : ${v.nodes.map(n => n.target.join(' ')).join(' | ')}`)).toEqual([]);
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
  });
});
