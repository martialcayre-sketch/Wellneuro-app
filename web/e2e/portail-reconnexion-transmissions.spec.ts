// « Me reconnecter » sous le refus 401 d'un dépôt ou d'un enregistrement, dans
// un NOUVEL onglet (refonte Lien PAT-6 ; Q2 a et Q3 a de [[D-481]] complément
// DOC-11 ; [[D-488]] amendement DOC-11), sous la garde du dossier de la page
// (DOC-12). Modèle : `portail-reconnexion-envoi.spec.ts` (PAT-5).
//
// CE QUE LE SPEC PROUVE, sur U34 (compte rendu d'analyses), U39 (mes choix) et
// U40 (signaler un problème). Après un 401 :
// 1. la page reste ouverte, avec la saisie (fichier, champs) ; le message de la
//    route paraît, puis « Me reconnecter », qui ouvre la connexion dans un
//    nouvel onglet ; rien n'est écrit, et rien ne repart seul ;
// 2. une fois la session du MÊME patient rétablie, le renvoi manuel depuis
//    l'onglet initial réussit et écrit dans SON dossier ;
// 3. si c'est un AUTRE patient qui s'est connecté, le renvoi est refusé par la
//    garde (409, T-51) et rien n'est écrit, ni dans un dossier ni dans l'autre.
//
// CE QU'IL NE PROUVE PAS :
// - U33 (dépôt d'un document) : `WN_PORTAIL_DEPOT_DOCUMENTS` est éteint dans
//   l'environnement E2E (page en `notFound`) ; tenu par
//   `DepotDocuments.reconnexion.test.tsx`.
// - U35 (fiche de renseignements) : `WN_PHYSIO_TRAITEMENTS` est absent de
//   l'environnement E2E ; tenu par `DeclarationsPatient.reconnexion.test.tsx`.
// - la connexion elle-même (lien magique, Google), que couvrent
//   `portail-lien-magique` et `portail-google`. La reconnexion est simulée en
//   posant le cookie de session que pose l'atterrissage.
//
// L'expiration n'efface que le cookie du portail : la session praticien du
// banc, qui écarte les comptes rendus (seul nettoyage admis), reste posée.
//
// Patients fictifs : Sophie Nicola (PAT_SEED_01), dont la page est ouverte ; ce
// spec n'efface que ce que son parcours a écrit (comptes rendus écartés par la
// route praticien, choix et incidents par identifiant). Jennifer Martin
// (PAT_SEED_02), seconde identité de session, sans aucune écriture attendue.
// Aucun dossier réel n'est visé (`D-075`).
import { randomBytes } from 'node:crypto';
import { test, expect, type APIRequestContext, type BrowserContext, type Page } from '@playwright/test';
import {
  closePrisma,
  compterEcrituresTrust,
  effacerEcrituresTrustNeuves,
  idsEcrituresTrust,
  provisionnerAccusesPorteTrust,
  transmissionsNonPurgees,
  transmissionsSur24h,
} from './helpers/db';
import { patientPortailSessionCookie, praticienSessionCookie } from './helpers/auth';
import { PORTAIL_COOKIE_NAME } from '../src/lib/patient-session';

const SOPHIE = { idPatient: 'PAT_SEED_01', email: 'sophie.nicola@fictif.wellneuro.fr' };
const JENNIFER = { idPatient: 'PAT_SEED_02', email: 'jennifer.martin@fictif.wellneuro.fr' };

const SESSION_EXPIREE = 'Session expirée. Reconnectez-vous.';
const T51 = 'Rien n’a été envoyé : cette page a été ouverte sous un autre compte. Rechargez-la pour continuer.';
const MARQUE_INCIDENT = 'Parcours E2E de la reconnexion (PAT-6).';

/** Session expirée : le cookie du portail, et lui seul, disparaît du navigateur. */
async function expirerSession(context: BrowserContext): Promise<void> {
  await context.clearCookies({ name: PORTAIL_COOKIE_NAME });
}

/**
 * Clique « Me reconnecter », vérifie que la connexion s'ouvre dans un nouvel
 * onglet, puis pose la session voulue — ce que fait l'atterrissage de la
 * connexion — et referme l'onglet.
 */
async function seReconnecterDansUnNouvelOnglet(
  page: Page,
  context: BrowserContext,
  qui: { idPatient: string; email: string },
): Promise<void> {
  const lien = page.getByRole('link', { name: 'Me reconnecter' });
  await expect(lien).toBeVisible();
  await expect(lien).toHaveAttribute('target', '_blank');
  const [onglet] = await Promise.all([context.waitForEvent('page'), lien.click()]);
  await onglet.waitForLoadState();
  expect(new URL(onglet.url()).pathname).toBe('/portail/connexion');
  await context.addCookies([patientPortailSessionCookie(qui.idPatient, qui.email)]);
  await onglet.close();
}

/** Écarte, par la route du praticien, tout compte rendu de Sophie encore non purgé. */
async function ecarterTransmissions(api: APIRequestContext) {
  for (const idCompteRendu of await transmissionsNonPurgees(SOPHIE.idPatient)) {
    const res = await api.post('/api/praticien/biologie/import/ecart', {
      data: { idPatient: SOPHIE.idPatient, idCompteRendu, motif: 'document_non_conforme' },
    });
    expect(res.status(), `écart de ${idCompteRendu}`).toBe(200);
  }
}

/** U34 : ouvre la page, accuse si besoin, choisit un PDF unique, puis expire la session et envoie. */
async function deposerApresExpiration(page: Page, context: BrowserContext) {
  await page.goto(`/portail/${SOPHIE.idPatient}/comptes-rendus`);
  const accuse = page.getByRole('button', { name: 'J’en ai pris connaissance' });
  const envoyer = page.getByRole('button', { name: 'Envoyer à mon praticien' });
  await expect(accuse.or(envoyer)).toBeVisible();
  if (await accuse.isVisible()) await accuse.click();
  await expect(envoyer).toBeVisible();
  await page.getByLabel(/Votre compte rendu : un PDF de 10 Mo au plus/).setInputFiles({
    name: 'compte-rendu.pdf',
    mimeType: 'application/pdf',
    // Unique par run : l'unicité (patient, empreinte) refuserait un doublon.
    buffer: Buffer.from(`%PDF-1.4\n% E2E PAT-6 ${randomBytes(8).toString('hex')}\n%%EOF\n`, 'utf8'),
  });

  await expirerSession(context);
  await envoyer.click();
  await expect(page.getByText(SESSION_EXPIREE)).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`/portail/${SOPHIE.idPatient}/comptes-rendus$`));
  // Le fichier reste choisi : le bouton n'est pas revenu à l'état désactivé.
  await expect(envoyer).toBeEnabled();
  return envoyer;
}

test.describe.serial('Portail — reconnexion aux transmissions et aux droits (PAT-6)', () => {
  test.beforeAll(async () => {
    await provisionnerAccusesPorteTrust(SOPHIE.idPatient);
  });

  test.beforeEach(async ({ context }) => {
    await context.addCookies([
      await praticienSessionCookie(),
      patientPortailSessionCookie(SOPHIE.idPatient, SOPHIE.email),
    ]);
  });

  test.afterAll(async () => {
    await closePrisma();
  });

  test('U34 : même patient reconnecté, le renvoi manuel depuis l’onglet initial réussit', async ({ page, context }) => {
    const api = context.request;
    await ecarterTransmissions(api);
    const avant = await transmissionsSur24h(SOPHIE.idPatient);
    try {
      const envoyer = await deposerApresExpiration(page, context);
      expect(await transmissionsSur24h(SOPHIE.idPatient)).toBe(avant);

      await seReconnecterDansUnNouvelOnglet(page, context, SOPHIE);
      // Rien n'est reparti seul.
      expect(await transmissionsSur24h(SOPHIE.idPatient)).toBe(avant);
      await envoyer.click();
      await expect(page.getByRole('status')).toHaveText('Votre compte rendu a été transmis à votre praticien.');
      await expect(page.getByText(SESSION_EXPIREE)).toHaveCount(0);
      expect(await transmissionsSur24h(SOPHIE.idPatient)).toBe(avant + 1);
    } finally {
      await ecarterTransmissions(api);
    }
  });

  test('U34 : un AUTRE patient connecté, le renvoi est refusé (T-51) et rien n’est écrit', async ({ page, context }) => {
    const api = context.request;
    await ecarterTransmissions(api);
    const avantSophie = await transmissionsSur24h(SOPHIE.idPatient);
    const avantJennifer = await transmissionsSur24h(JENNIFER.idPatient);
    try {
      const envoyer = await deposerApresExpiration(page, context);
      await seReconnecterDansUnNouvelOnglet(page, context, JENNIFER);
      const reponse = page.waitForResponse(
        r => r.url().endsWith('/api/portail/comptes-rendus') && r.request().method() === 'POST',
      );
      await envoyer.click();
      expect((await reponse).status()).toBe(409);
      await expect(page.getByText(T51)).toBeVisible();
      await expect(page.getByText('Votre compte rendu a été transmis', { exact: false })).toHaveCount(0);
      expect(await transmissionsSur24h(SOPHIE.idPatient)).toBe(avantSophie);
      expect(await transmissionsSur24h(JENNIFER.idPatient)).toBe(avantJennifer);
    } finally {
      await ecarterTransmissions(api);
    }
  });

  test('U39 : même patient reconnecté, le choix refait depuis l’onglet initial est enregistré', async ({ page, context }) => {
    const avantIds = await idsEcrituresTrust(SOPHIE.idPatient);
    try {
      await page.goto(`/portail/${SOPHIE.idPatient}/informations`);
      const choix = page.locator('details', { hasText: 'Communications non essentielles' });
      await choix.locator('summary').click();
      // L'état de départ du choix dépend des specs passés : l'un des deux gestes est là.
      const geste = choix.getByRole('button', { name: /^(J’autorise|Je retire mon autorisation)$/ });
      const libelle = (await geste.textContent())!.trim();
      const avant = await compterEcrituresTrust(SOPHIE.idPatient);

      await expirerSession(context);
      await geste.click();
      // À l'endroit du geste : dans l'accordéon du choix (Q5 a), puis T-36.
      await expect(choix.getByText(SESSION_EXPIREE)).toBeVisible();
      await expect(choix.getByRole('link', { name: 'Me reconnecter' })).toBeVisible();
      expect(await compterEcrituresTrust(SOPHIE.idPatient)).toEqual(avant);

      await seReconnecterDansUnNouvelOnglet(page, context, SOPHIE);
      expect(await compterEcrituresTrust(SOPHIE.idPatient)).toEqual(avant);
      const reponse = page.waitForResponse(
        r => r.url().endsWith('/api/portail/trust/choix') && r.request().method() === 'POST',
      );
      await choix.getByRole('button', { name: libelle }).click();
      expect((await reponse).ok()).toBe(true);
      await expect(choix.getByText(SESSION_EXPIREE)).toHaveCount(0);
      await expect(choix.getByRole('button', { name: libelle })).toHaveCount(0);
      expect(await compterEcrituresTrust(SOPHIE.idPatient)).toEqual({ ...avant, choix: avant.choix + 1 });
    } finally {
      await effacerEcrituresTrustNeuves(SOPHIE.idPatient, avantIds);
    }
  });

  test('U39 : un AUTRE patient connecté, le choix est refusé (T-51) et rien n’est écrit', async ({ page, context }) => {
    await page.goto(`/portail/${SOPHIE.idPatient}/informations`);
    const choix = page.locator('details', { hasText: 'Communications non essentielles' });
    await choix.locator('summary').click();
    const geste = choix.getByRole('button', { name: /^(J’autorise|Je retire mon autorisation)$/ });
    const avantSophie = await compterEcrituresTrust(SOPHIE.idPatient);
    const avantJennifer = await compterEcrituresTrust(JENNIFER.idPatient);

    await expirerSession(context);
    await geste.click();
    await seReconnecterDansUnNouvelOnglet(page, context, JENNIFER);
    const reponse = page.waitForResponse(
      r => r.url().endsWith('/api/portail/trust/choix') && r.request().method() === 'POST',
    );
    await geste.click();
    expect((await reponse).status()).toBe(409);
    await expect(choix.getByText(T51)).toBeVisible();
    expect(await compterEcrituresTrust(SOPHIE.idPatient)).toEqual(avantSophie);
    expect(await compterEcrituresTrust(JENNIFER.idPatient)).toEqual(avantJennifer);
  });

  /** U40 : ouvre le formulaire d'incident, le remplit, puis expire la session et l'envoie. */
  async function signalerApresExpiration(page: Page, context: BrowserContext) {
    await page.goto(`/portail/${SOPHIE.idPatient}/informations`);
    const carte = page.locator('#signaler');
    await carte.getByRole('button', { name: /Un problème de confidentialité/ }).click();
    await carte.getByLabel('Type de problème *').selectOption('autre');
    await carte.getByLabel('Décrivez ce que vous avez constaté *').fill(MARQUE_INCIDENT);

    await expirerSession(context);
    await carte.getByRole('button', { name: 'Signaler' }).click();
    const formulaire = carte.locator('form');
    await expect(formulaire.getByText(SESSION_EXPIREE)).toBeVisible();
    await expect(formulaire.getByRole('link', { name: 'Me reconnecter' })).toBeVisible();
    // La saisie reste.
    await expect(carte.getByLabel('Type de problème *')).toHaveValue('autre');
    await expect(carte.getByLabel('Décrivez ce que vous avez constaté *')).toHaveValue(MARQUE_INCIDENT);
    return carte;
  }

  test('U40 : même patient reconnecté, le renvoi manuel du signalement est enregistré', async ({ page, context }) => {
    const avantIds = await idsEcrituresTrust(SOPHIE.idPatient);
    const avant = await compterEcrituresTrust(SOPHIE.idPatient);
    try {
      const carte = await signalerApresExpiration(page, context);
      expect(await compterEcrituresTrust(SOPHIE.idPatient)).toEqual(avant);

      await seReconnecterDansUnNouvelOnglet(page, context, SOPHIE);
      expect(await compterEcrituresTrust(SOPHIE.idPatient)).toEqual(avant);
      const reponse = page.waitForResponse(
        r => r.url().endsWith('/api/portail/trust/signalement') && r.request().method() === 'POST',
      );
      await carte.getByRole('button', { name: 'Signaler' }).click();
      expect((await reponse).ok()).toBe(true);
      await expect(carte.getByRole('button', { name: 'Faire un autre signalement' })).toBeVisible();
      await expect(page.getByText(SESSION_EXPIREE)).toHaveCount(0);
      expect(await compterEcrituresTrust(SOPHIE.idPatient)).toEqual({ ...avant, incidents: avant.incidents + 1 });
    } finally {
      await effacerEcrituresTrustNeuves(SOPHIE.idPatient, avantIds);
    }
  });

  test('U40 : un AUTRE patient connecté, le signalement est refusé (T-51) et rien n’est écrit', async ({ page, context }) => {
    const avantSophie = await compterEcrituresTrust(SOPHIE.idPatient);
    const avantJennifer = await compterEcrituresTrust(JENNIFER.idPatient);
    const carte = await signalerApresExpiration(page, context);
    await seReconnecterDansUnNouvelOnglet(page, context, JENNIFER);
    const reponse = page.waitForResponse(
      r => r.url().endsWith('/api/portail/trust/signalement') && r.request().method() === 'POST',
    );
    await carte.getByRole('button', { name: 'Signaler' }).click();
    expect((await reponse).status()).toBe(409);
    await expect(carte.getByText(T51)).toBeVisible();
    await expect(page.getByText('Votre demande a bien été enregistrée', { exact: false })).toHaveCount(0);
    expect(await compterEcrituresTrust(SOPHIE.idPatient)).toEqual(avantSophie);
    expect(await compterEcrituresTrust(JENNIFER.idPatient)).toEqual(avantJennifer);
  });
});
