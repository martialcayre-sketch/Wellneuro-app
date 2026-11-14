// « Me reconnecter » sous le refus 401 d'un envoi, dans un NOUVEL onglet
// (refonte Lien PAT-5 ; Q6a, [[D-488]] DOC-9 ; [[D-481]] correctif DOC-10).
//
// CE QUE LE SPEC PROUVE. Sur la compréhension (U24) et le dossier à deux voix
// (U25), le texte saisi n'existe que dans la page. Après un 401 :
// 1. « Me reconnecter » ouvre la connexion dans un nouvel onglet, et la page
//    d'origine reste ouverte avec le texte saisi ;
// 2. une fois la session du MÊME patient rétablie, le nouvel envoi depuis la
//    page restée ouverte réussit et écrit dans SON dossier ;
// 3. si c'est un AUTRE patient qui s'est connecté dans ce navigateur, l'envoi
//    est refusé et rien n'est écrit, ni dans un dossier ni dans l'autre.
//
// CE QU'IL NE PROUVE PAS : la connexion elle-même (lien magique, Google), que
// couvrent `portail-lien-magique` et `portail-google`. La reconnexion est
// simulée en posant le cookie de session que pose l'atterrissage — le même
// que `patientPortailSessionCookie`. Le point est que ce cookie est commun aux
// onglets d'un même navigateur.
//
// Patients fictifs : Sophie Nicola (PAT_SEED_01), dont le dossier est
// provisionné et nettoyé par ce spec seul ; Jennifer Martin (PAT_SEED_02),
// utilisée comme seconde identité de session, sans aucune écriture attendue.
// Aucun dossier réel n'est visé (`D-075`).
import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import {
  closePrisma,
  lireDesaccordsComprehension,
  lireRatifications,
  nettoyerDossierDeuxVoix,
  provisionnerAccusesPorteTrust,
  provisionnerDossierDeuxVoix,
} from './helpers/db';
import { patientPortailSessionCookie } from './helpers/auth';

const SOPHIE = { idPatient: 'PAT_SEED_01', email: 'sophie.nicola@fictif.wellneuro.fr' };
const JENNIFER = { idPatient: 'PAT_SEED_02', email: 'jennifer.martin@fictif.wellneuro.fr' };

// Le segment d'URL n'est pas un facteur d'authentification : le cookie signé
// est l'unique credential.
const JETON = 'jeton-de-parcours';

const TEXTE_DESACCORD = 'Ce que je voulais dire, c’est plutôt la fatigue du matin.';

/** Session expirée : le cookie du portail disparaît du navigateur. */
async function expirerSession(context: BrowserContext): Promise<void> {
  await context.clearCookies();
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

test.describe.serial('Portail — reconnexion à l’envoi, dans un nouvel onglet', () => {
  test.beforeEach(async ({ context }) => {
    // Chaque cas part d'un dossier vierge : `provisionnerDossierDeuxVoix`
    // appelle d'abord `nettoyerDossierDeuxVoix`, qui purge désaccords et
    // ratifications. Les « 0 ligne » de Sophie ne dépendent donc pas de l'ordre.
    await provisionnerDossierDeuxVoix(SOPHIE.idPatient);
    await provisionnerAccusesPorteTrust(SOPHIE.idPatient);
    await context.addCookies([patientPortailSessionCookie(SOPHIE.idPatient, SOPHIE.email)]);
  });

  test.afterAll(async () => {
    await nettoyerDossierDeuxVoix(SOPHIE.idPatient);
    await closePrisma();
  });

  test('U24 : même patient reconnecté, l’envoi depuis la page restée ouverte réussit', async ({
    page,
    context,
  }) => {
    await page.goto(`/portail/${JETON}/comprehension`);
    await expect(
      page.getByRole('heading', { name: 'Ce que mon praticien a compris de moi' }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Ce n’est pas exactement ça' }).click();
    const champ = page.getByLabel('Ce qui ne correspond pas');
    await champ.fill(TEXTE_DESACCORD);

    await expirerSession(context);
    await page.getByRole('button', { name: 'Envoyer' }).click();
    await expect(page.getByText('Session expirée. Reconnectez-vous.')).toBeVisible();
    expect(await lireDesaccordsComprehension(SOPHIE.idPatient)).toHaveLength(0);

    await seReconnecterDansUnNouvelOnglet(page, context, SOPHIE);

    // La page d'origine n'a pas bougé : le texte est toujours là.
    await expect(champ).toHaveValue(TEXTE_DESACCORD);
    await page.getByRole('button', { name: 'Envoyer' }).click();
    await expect(
      page.getByText('C’est transmis. Votre praticien le verra tel que vous l’avez écrit.'),
    ).toBeVisible();

    const desaccords = await lireDesaccordsComprehension(SOPHIE.idPatient);
    expect(desaccords).toHaveLength(1);
    expect(desaccords[0].texte).toBe(TEXTE_DESACCORD);
  });

  test('U24 : un AUTRE patient connecté, l’envoi est refusé et rien n’est écrit', async ({
    page,
    context,
  }) => {
    await page.goto(`/portail/${JETON}/comprehension`);
    await page.getByRole('button', { name: 'Ce n’est pas exactement ça' }).click();
    await page.getByLabel('Ce qui ne correspond pas').fill(TEXTE_DESACCORD);

    await expirerSession(context);
    await page.getByRole('button', { name: 'Envoyer' }).click();
    await seReconnecterDansUnNouvelOnglet(page, context, JENNIFER);

    const avantJennifer = (await lireDesaccordsComprehension(JENNIFER.idPatient)).length;
    const reponse = page.waitForResponse(
      (r) => r.url().endsWith('/api/portail/comprehension') && r.request().method() === 'POST',
    );
    await page.getByRole('button', { name: 'Envoyer' }).click();
    // Le refus vient de la route : la synthèse visée n'est pas celle du
    // patient de la session.
    expect((await reponse).ok()).toBe(false);
    await expect(page.getByText('C’est transmis', { exact: false })).toHaveCount(0);
    await expect(page.getByLabel('Ce qui ne correspond pas')).toHaveValue(TEXTE_DESACCORD);
    expect(await lireDesaccordsComprehension(SOPHIE.idPatient)).toHaveLength(0);
    expect(await lireDesaccordsComprehension(JENNIFER.idPatient)).toHaveLength(avantJennifer);
  });

  test('U25 : même patient reconnecté, « C’est bien ça » repart depuis la page restée ouverte', async ({
    page,
    context,
  }) => {
    await page.goto(`/portail/${JETON}/dossier`);
    await expect(page.getByRole('heading', { name: 'Mon dossier, à deux voix' })).toBeVisible();

    await expirerSession(context);
    await page.getByRole('button', { name: 'C’est bien ça' }).click();
    await expect(page.getByText('Session expirée. Reconnectez-vous.')).toBeVisible();
    expect(await lireRatifications(SOPHIE.idPatient)).toHaveLength(0);

    await seReconnecterDansUnNouvelOnglet(page, context, SOPHIE);

    await page.getByRole('button', { name: 'C’est bien ça' }).click();
    await expect(
      page.getByText('C’est transmis. Votre praticien le verra tel que vous l’avez indiqué.'),
    ).toBeVisible();
    const ratifications = await lireRatifications(SOPHIE.idPatient);
    expect(ratifications).toHaveLength(1);
    expect(ratifications[0].sens).toBe('ratifie');
  });

  test('U25 : un AUTRE patient connecté, l’envoi est refusé et rien n’est écrit', async ({
    page,
    context,
  }) => {
    await page.goto(`/portail/${JETON}/dossier`);
    await expect(page.getByRole('heading', { name: 'Mon dossier, à deux voix' })).toBeVisible();

    await expirerSession(context);
    await page.getByRole('button', { name: 'C’est bien ça' }).click();
    await seReconnecterDansUnNouvelOnglet(page, context, JENNIFER);

    const avantJennifer = (await lireRatifications(JENNIFER.idPatient)).length;
    const reponse = page.waitForResponse(
      (r) => r.url().endsWith('/api/portail/dossier') && r.request().method() === 'POST',
    );
    await page.getByRole('button', { name: 'C’est bien ça' }).click();
    // L'objectif visé n'appartient pas au patient de la session : la route
    // refuse, quelle que soit la garde qui tranche la première.
    expect((await reponse).ok()).toBe(false);
    await expect(page.getByText('C’est transmis', { exact: false })).toHaveCount(0);
    expect(await lireRatifications(SOPHIE.idPatient)).toHaveLength(0);
    expect(await lireRatifications(JENNIFER.idPatient)).toHaveLength(avantJennifer);
  });
});
