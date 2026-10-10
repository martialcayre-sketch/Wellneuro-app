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
// LOT-08 y verse la recette locale du 2026-10-10 : l'ordre refusé sans rien
// écrire, les « je ne sais pas » du contrat v4 ([[D-271]]), le rappel proposé
// après la première nuit et son fichier (LOT-05, LOT-06), et l'agenda commencé
// en v3 qui s'y termine ([[D-272]] §3). Le projet « iPhone 13 » les rejoue dans
// WebKit, le moteur de Safari.
//
// Patient fictif Michel Dogné (PAT_SEED_03), autorisé. `workers: 1` et
// `fullyParallel: false` : aucun autre spec ne tourne pendant celui-ci.
import { readFile } from 'node:fs/promises';
import { test, expect, type Page } from '@playwright/test';
import { praticienSessionCookie, patientPortailSessionCookie } from './helpers/auth';
import {
  resetPortailState,
  closePrisma,
  poserNuitsAgendaSommeil,
  lireNuitsAgendaSommeil,
} from './helpers/db';
import { dateJourParis } from '../src/lib/dateParis';
import { decalerDate } from '../src/lib/agenda-sommeil/nuit';
import { NB_JOURS_AGENDA, type NuitReponses } from '../src/lib/agenda-sommeil/types';

const PATIENT = { idPatient: 'PAT_SEED_03', email: 'michel.dogne@fictif.wellneuro.fr' };

// Une nuit sans histoire, déjà notée la veille : elle installe l'agenda en
// cours sans être l'objet du test.
const NUIT_DE_LA_VEILLE: NuitReponses = {
  heureCoucher: '23:00',
  heureLever: '07:00',
  latence: 'lt15',
  qualite: 4,
  reveils: { dureeTotale: 'aucun', nombre: 0 },
  aideSommeil: 'aucune',
  extinctionImmediate: true,
  leverImmediat: true,
};

async function ouvrirAgenda(
  page: Page,
  veille?: 'agenda-sommeil-v3' | 'agenda-sommeil-v4',
): Promise<void> {
  await resetPortailState(PATIENT.idPatient);

  await page.context().addCookies([await praticienSessionCookie()]);
  const creation = await page.request.post('/api/praticien/assignations', {
    data: { emailPatient: PATIENT.email, idQuestionnaire: 'Q_SOM_09' },
  });
  expect(creation.status()).toBe(200);
  const { idAssignation } = (await creation.json()) as { idAssignation: string };

  // La nuit de la veille, sous le contrat demandé : c'est elle qui fixe celui
  // de l'agenda ([[D-272]] §3).
  if (veille) {
    await poserNuitsAgendaSommeil(PATIENT.idPatient, idAssignation, veille, [
      { dateNuit: decalerDate(dateJourParis(), -1), reponses: NUIT_DE_LA_VEILLE },
    ]);
  }

  await page.context().addCookies([patientPortailSessionCookie(PATIENT.idPatient, PATIENT.email)]);
  await page.goto(`/portail/${PATIENT.idPatient}/questionnaires/${idAssignation}`);

  // Consentement de l'assignation : une case, un bouton. Il précède tout
  // questionnaire et n'est pas l'objet de ce spec.
  await page.getByLabel(/ai lu ces informations/).check();
  await page.getByRole('button', { name: 'Continuer vers le questionnaire' }).click();

  // La nuit du jour n'est pas encore notée : l'écran de saisie s'ouvre
  // directement, au soir.
  await expect(page.getByRole('heading', { name: 'Votre nuit passée' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Le soir' })).toBeVisible();
}

const jeNeSaisPas = (page: Page) => page.getByRole('button', { name: 'Je ne sais pas', exact: true });

// Les deux derniers écrans d'une nuit sans histoire, une fois le soir passé.
async function noterNuitEtMatin(page: Page): Promise<void> {
  await expect(page.getByRole('heading', { name: 'Pendant la nuit' })).toBeVisible();
  await page.getByRole('button', { name: 'Nuit continue, aucun réveil' }).click();
  await page.getByRole('button', { name: 'Aucune aide pour dormir cette nuit' }).click();
  await page.getByRole('button', { name: 'Continuer' }).click();

  await expect(page.getByRole('heading', { name: 'Le matin' })).toBeVisible();
  await page.getByLabel(/levé·e à/).selectOption('07:00');
  await page.getByRole('button', { name: 'Au même moment que mon réveil' }).click();
  await page.getByRole('button', { name: 'Très bonne' }).click();
  await page.getByRole('button', { name: 'C’est noté ✓' }).click();
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

  test('un ordre impossible est refusé sans rien écrire, puis la nuit corrigée part avec ses « je ne sais pas »', async ({
    page,
  }) => {
    await ouvrirAgenda(page);

    // Une liste vierge dit « Choisir », et re-choisir « Choisir » ne pose
    // aucune heure (LOT-03).
    const essai = page.getByLabel(/essayé de dormir à/);
    await expect(essai).toHaveValue('');
    await expect(essai.locator('option').first()).toHaveText('Choisir');
    await essai.selectOption('');
    await expect(essai).toHaveValue('');
    await expect(page.getByText('Par rapport à votre coucher, vous avez essayé de dormir…')).toBeVisible();

    // « Je ne sais pas » : une seule tuile au soir (l'endormissement)…
    await expect(jeNeSaisPas(page)).toHaveCount(1);

    // Essai de dormir AVANT la mise au lit : l'ordre est impossible.
    await essai.selectOption('23:00');
    await page.getByRole('button', { name: 'Plus tard que mon coucher' }).click();
    const miseAuLit = page.getByLabel(/mis·e au lit à/);
    await expect(miseAuLit).toHaveValue('');
    await miseAuLit.selectOption('23:30');
    await jeNeSaisPas(page).click();
    await page.getByRole('button', { name: 'Continuer' }).click();

    // … une seule la nuit (l'éveil nocturne, pas l'aide au sommeil) …
    await expect(page.getByRole('heading', { name: 'Pendant la nuit' })).toBeVisible();
    await expect(jeNeSaisPas(page)).toHaveCount(1);
    await jeNeSaisPas(page).click();
    await page.getByRole('button', { name: 'Aucune aide pour dormir cette nuit' }).click();
    await page.getByRole('button', { name: 'Continuer' }).click();

    // … et aucune au matin, détails ouverts compris.
    await expect(page.getByRole('heading', { name: 'Le matin' })).toBeVisible();
    await page.getByLabel(/levé·e à/).selectOption('07:00');
    await page.getByRole('button', { name: 'Au même moment que mon réveil' }).click();
    await page.getByRole('button', { name: 'Très bonne' }).click();
    await expect(jeNeSaisPas(page)).toHaveCount(0);
    await page.getByRole('button', { name: '+ Ajouter des détails (facultatif)' }).click();
    await expect(page.getByRole('button', { name: '− Masquer les détails' })).toBeVisible();
    await expect(jeNeSaisPas(page)).toHaveCount(0);
    await page.getByRole('button', { name: 'C’est noté ✓' }).click();

    // L'envoi ramène au soir, dit pourquoi, et rien n'est écrit.
    await expect(page.getByRole('heading', { name: 'Le soir' })).toBeVisible();
    await expect(
      page.getByRole('alert').filter({ hasText: 'L’heure où vous avez essayé de dormir doit suivre la mise au lit.' }),
    ).toBeVisible();
    expect(await lireNuitsAgendaSommeil(PATIENT.idPatient)).toEqual([]);

    // Corrigée, la nuit part : les réponses des écrans suivants sont gardées.
    await miseAuLit.selectOption('22:30');
    await page.getByRole('button', { name: 'Continuer' }).click();
    await expect(page.getByRole('heading', { name: 'Pendant la nuit' })).toBeVisible();
    await page.getByRole('button', { name: 'Continuer' }).click();
    await expect(page.getByRole('heading', { name: 'Le matin' })).toBeVisible();
    await page.getByRole('button', { name: 'C’est noté ✓' }).click();
    await expect(page.getByText('Merci, à demain matin. ☕')).toBeVisible();
    await expect(page.getByText('1 nuit notée sur 21.')).toBeVisible();

    const nuits = await lireNuitsAgendaSommeil(PATIENT.idPatient);
    expect(nuits).toHaveLength(1);
    expect(nuits[0].dateNuit).toBe(dateJourParis());
    expect(nuits[0].reponses).toMatchObject({
      contractVersion: 'agenda-sommeil-v4',
      heureMiseAuLit: '22:30',
      heureCoucher: '23:00',
      extinctionImmediate: false,
      latence: 'inconnu',
      reveils: { dureeTotale: 'inconnu' },
    });
  });

  test('la première nuit notée propose le rappel au-dessus de la frise, sans lien ni mot de santé dans le fichier', async ({
    page,
  }) => {
    await ouvrirAgenda(page);

    await page.getByLabel(/essayé de dormir à/).selectOption('23:00');
    await page.getByRole('button', { name: 'Au même moment que mon coucher' }).click();
    await page.getByRole('button', { name: 'En moins de 15 min' }).click();
    await page.getByRole('button', { name: 'Continuer' }).click();
    await noterNuitEtMatin(page);

    // Une seule nuit : la phrase et la carte passent AVANT la frise (LOT-06).
    const frise = page.getByText('1 nuit notée sur 21.');
    const phrase = page.getByText(/^Votre première nuit est notée\./);
    const carte = page.getByRole('heading', { name: 'Un rappel chaque matin' });
    await expect(frise).toBeVisible();
    await expect(phrase).toBeVisible();
    await expect(carte).toHaveCount(1);
    expect((await phrase.boundingBox())!.y).toBeLessThan((await frise.boundingBox())!.y);
    expect((await carte.boundingBox())!.y).toBeLessThan((await frise.boundingBox())!.y);

    // Le fichier calendrier est fabriqué dans le navigateur (LOT-05). Il est
    // lu EN ENTIER, ligne à ligne : aucun texte de plus que « Rappel du
    // matin » — ni lien, ni mot qui dirait la santé du patient à qui verrait
    // son agenda —, à l'heure choisie, dès demain, pour les matins restants.
    await page.getByLabel('Heure du rappel').selectOption('07:30');
    const telechargementAttendu = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Ajouter à mon agenda' }).click();
    const telechargement = await telechargementAttendu;
    expect(await telechargement.failure()).toBeNull();
    expect(telechargement.suggestedFilename()).toBe('rappel-du-matin.ics');
    const ics = await readFile(await telechargement.path(), 'utf8');
    const demain = decalerDate(dateJourParis(), 1).replaceAll('-', '');
    // UID et DTSTAMP sont un tirage et un horodatage : hors de cette lecture.
    expect(
      ics.split(/\r?\n/).filter((ligne) => ligne !== '' && !/^(UID|DTSTAMP):/.test(ligne)),
    ).toEqual([
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Rappel du matin//FR',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `DTSTART:${demain}T073000`,
      'DURATION:PT5M',
      `RRULE:FREQ=DAILY;COUNT=${NB_JOURS_AGENDA - 1}`,
      'SUMMARY:Rappel du matin',
      'TRANSP:TRANSPARENT',
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      'DESCRIPTION:Rappel du matin',
      'TRIGGER:PT0M',
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR',
    ]);
    await expect(page.getByText(/Le fichier « rappel-du-matin\.ics » est prêt/)).toBeVisible();
  });

  test('dès la deuxième nuit, la phrase s’efface et la carte du rappel revient sous la frise', async ({ page }) => {
    await ouvrirAgenda(page, 'agenda-sommeil-v4');

    await page.getByLabel(/essayé de dormir à/).selectOption('23:00');
    await page.getByRole('button', { name: 'Au même moment que mon coucher' }).click();
    await page.getByRole('button', { name: 'En moins de 15 min' }).click();
    await page.getByRole('button', { name: 'Continuer' }).click();
    await noterNuitEtMatin(page);

    const frise = page.getByText('2 nuits notées sur 21.');
    const carte = page.getByRole('heading', { name: 'Un rappel chaque matin' });
    await expect(frise).toBeVisible();
    await expect(page.getByText(/^Votre première nuit est notée\./)).toHaveCount(0);
    await expect(carte).toHaveCount(1);
    expect((await carte.boundingBox())!.y).toBeGreaterThan((await frise.boundingBox())!.y);
  });

  test('un agenda commencé en v3 s’y termine : extinction de la lumière, sans « je ne sais pas »', async ({ page }) => {
    await ouvrirAgenda(page, 'agenda-sommeil-v3');

    // Les mots du soir restent ceux de la v3 ([[D-272]] §3).
    const extinction = page.getByLabel(/J’ai éteint la lumière à/);
    await expect(extinction).toBeVisible();
    await expect(page.getByText('Par rapport à votre coucher, vous avez éteint la lumière…')).toBeVisible();
    await expect(page.getByText(/essayé de dormir/)).toHaveCount(0);
    await expect(jeNeSaisPas(page)).toHaveCount(0);

    await extinction.selectOption('23:00');
    await page.getByRole('button', { name: 'Au même moment que mon coucher' }).click();
    await page.getByRole('button', { name: 'En moins de 15 min' }).click();
    await page.getByRole('button', { name: 'Continuer' }).click();
    await expect(page.getByRole('heading', { name: 'Pendant la nuit' })).toBeVisible();
    await expect(jeNeSaisPas(page)).toHaveCount(0);
    await noterNuitEtMatin(page);
    await expect(page.getByText('2 nuits notées sur 21.')).toBeVisible();

    const nuits = await lireNuitsAgendaSommeil(PATIENT.idPatient);
    expect(nuits.map((n) => n.reponses.contractVersion)).toEqual(['agenda-sommeil-v3', 'agenda-sommeil-v3']);
  });
});
