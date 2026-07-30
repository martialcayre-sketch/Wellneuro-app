// Le glissement du cadran de l'agenda du sommeil, dans un vrai navigateur.
//
// Ce que ce spec apporte que le banc jsdom (CadranNuit.test.tsx) ne peut pas
// donner : le HIT-TEST. jsdom ne décide jamais quel élément se trouve sous un
// point — on lui désigne la cible. C'est précisément l'angle mort qui a laissé
// passer le défaut de #427 : le cercle visible de chaque poignée recouvrait la
// cible de saisie, et seul un navigateur pouvait le dire. Ici on presse à des
// COORDONNÉES, et c'est le moteur de rendu qui choisit la cible.
//
// Patient fictif Michel Dogné (PAT_SEED_03), autorisé. `workers: 1` et
// `fullyParallel: false` : aucun autre spec ne tourne pendant celui-ci.
import { test, expect, type Page } from '@playwright/test';
import { praticienSessionCookie, patientPortailSessionCookie } from './helpers/auth';
import { resetPortailState, closePrisma } from './helpers/db';

const PATIENT = { idPatient: 'PAT_SEED_03', email: 'michel.dogne@fictif.wellneuro.fr' };

// Repère de dessin du cadran — doit rester accordé à CadranNuit.tsx.
const VB_ORIGINE = -16;
const VB_TAILLE = 232;
const CX = 100;
const CY = 100;
const R = 70;

/**
 * Heure du cadran → point à l'écran. Reproduit la projection `xMidYMid meet` du
 * navigateur : échelle uniforme puis centrage. `rayon` permet de viser ailleurs
 * que sur l'anneau.
 */
function pointEcran(
  boite: { x: number; y: number; width: number; height: number },
  minutes: number,
  rayon = R,
): { x: number; y: number } {
  const a = ((minutes / 1440) * 360 - 90) * (Math.PI / 180);
  const echelle = Math.min(boite.width, boite.height) / VB_TAILLE;
  const margeX = (boite.width - VB_TAILLE * echelle) / 2;
  const margeY = (boite.height - VB_TAILLE * echelle) / 2;
  return {
    x: boite.x + margeX + (CX + rayon * Math.cos(a) - VB_ORIGINE) * echelle,
    y: boite.y + margeY + (CY + rayon * Math.sin(a) - VB_ORIGINE) * echelle,
  };
}

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

  // Aucune nuit encore notée : l'écran de saisie s'ouvre directement.
  await expect(page.getByRole('heading', { name: 'Votre nuit passée' })).toBeVisible();
}

test.afterAll(async () => {
  await resetPortailState(PATIENT.idPatient);
  await closePrisma();
});

test.describe('cadran de la nuit — glissement', () => {
  test('une pression au centre de la poignée la saisit et la déplace', async ({ page }) => {
    await ouvrirAgenda(page);

    const cadran = page.locator('svg:has([role="slider"])').first();
    const extinction = page.getByRole('slider').first();
    await expect(extinction).toHaveAttribute('aria-valuenow', '1380'); // 23:00 par défaut
    // Tant qu'elle n'est pas touchée, la poignée n'est qu'une proposition.
    await expect(extinction).toHaveAttribute('aria-valuetext', /proposition/);

    const boite = await cadran.boundingBox();
    expect(boite).not.toBeNull();
    const depart = pointEcran(boite!, 1380);
    const arrivee = pointEcran(boite!, 30); // 00:30, soit +1 h 30

    // Le centre EXACT de la poignée — le point que tout le monde vise, et le
    // seul qui ne déclenchait rien avant ce correctif.
    await page.mouse.move(depart.x, depart.y);
    await page.mouse.down();
    await page.mouse.move(arrivee.x, arrivee.y, { steps: 12 });
    await page.mouse.up();

    await expect(extinction).toHaveAttribute('aria-valuenow', '30');
    await expect(extinction).toHaveAttribute('aria-valuetext', /0 heures 30/);
    await expect(extinction).not.toHaveAttribute('aria-valuetext', /proposition/);
  });

  test('un balayage loin de l’anneau ne saisit ni ne déplace rien', async ({ page }) => {
    // Le geste de défilement, dans un vrai navigateur : le doigt part dans l'AXE
    // d'une poignée mais très au-delà de l'anneau, puis balaie. C'est le seul des
    // trois tests de ce fichier qui échoue sur la première version du correctif,
    // où la prise n'était bornée qu'en angle : elle accrochait alors la poignée
    // depuis le coin du cadran et écrivait une heure jamais donnée.
    await ouvrirAgenda(page);

    const cadran = page.locator('svg:has([role="slider"])').first();
    const extinction = page.getByRole('slider').first();
    const boite = await cadran.boundingBox();
    expect(boite).not.toBeNull();

    const depart = pointEcran(boite!, 1380, 112);
    const arrivee = pointEcran(boite!, 660, 112);
    await page.mouse.move(depart.x, depart.y);
    await page.mouse.down();
    await page.mouse.move(arrivee.x, arrivee.y, { steps: 10 });
    await page.mouse.up();

    await expect(extinction).toHaveAttribute('aria-valuenow', '1380');
    await expect(extinction).toHaveAttribute('aria-valuetext', /proposition/);
  });

  test('une pression hors tolérance ne confirme aucune valeur', async ({ page }) => {
    await ouvrirAgenda(page);

    const cadran = page.locator('svg:has([role="slider"])').first();
    const extinction = page.getByRole('slider').first();
    const boite = await cadran.boundingBox();
    expect(boite).not.toBeNull();

    // 02:00 : sur l'anneau, mais à 3 h de l'extinction et 5 h du lever. Un
    // contact ne doit pas y valoir réponse — la suggestion reste une suggestion.
    const loin = pointEcran(boite!, 120);
    await page.mouse.move(loin.x, loin.y);
    await page.mouse.down();
    await page.mouse.up();

    await expect(extinction).toHaveAttribute('aria-valuenow', '1380');
    await expect(extinction).toHaveAttribute('aria-valuetext', /proposition/);
  });
});
