// La garde du dossier de la page ([[D-481]], complément DOC-12 ; [[D-488]],
// amendement DOC-12), lot `garde-portail-dossier-session`.
//
// CE QUE LE SPEC PROUVE.
// 1. Une page ouverte pour un patient fictif, puis un AUTRE patient fictif
//    connecté dans le même navigateur (le cookie est commun aux onglets) :
//    l'envoi depuis la page restée ouverte est refusé, T-51 paraît sous le
//    geste refusé, et rien n'est écrit, ni dans un dossier ni dans l'autre.
//    Sur U40, la mention de sécurité existante paraît sous T-51 (Q11 a).
// 2. Une page ouverte sous un segment quelconque, avec une session valide, est
//    renvoyée à l'entrée du dossier de la session (Q9 a), sans texte.
//
// CE QU'IL NE PROUVE PAS : les trois autres routes de la garde (documents,
// comptes rendus, renseignements), tenues par leurs bancs de route et de
// composant ; la connexion elle-même (lien magique, Google), que couvrent
// `portail-lien-magique` et `portail-google`. Le changement de compte est
// simulé en posant le cookie de session que pose l'atterrissage.
//
// Patients fictifs : Sophie Nicola (PAT_SEED_01), dont la page est ouverte ;
// Jennifer Martin (PAT_SEED_02), seconde identité de session. Aucune écriture
// n'est attendue dans l'un ou l'autre dossier. Aucun dossier réel n'est visé
// (`D-075`).
import { test, expect, type Page } from '@playwright/test';
import { closePrisma, compterEcrituresTrust, provisionnerAccusesPorteTrust } from './helpers/db';
import { patientPortailSessionCookie } from './helpers/auth';

const SOPHIE = { idPatient: 'PAT_SEED_01', email: 'sophie.nicola@fictif.wellneuro.fr' };
const JENNIFER = { idPatient: 'PAT_SEED_02', email: 'jennifer.martin@fictif.wellneuro.fr' };

const T51 = 'Rien n’a été envoyé : cette page a été ouverte sous un autre compte. Rechargez-la pour continuer.';
const MENTION =
  'Ces signalements ne sont pas surveillés en continu. En cas de symptôme grave ou inquiétant, contactez le 15 ou le 112 sans attendre.';

/** Ouvre le centre d'informations de Sophie, puis connecte Jennifer dans ce navigateur. */
async function ouvrirPuisChangerDeCompte(page: Page): Promise<void> {
  await page.context().addCookies([patientPortailSessionCookie(SOPHIE.idPatient, SOPHIE.email)]);
  await page.goto(`/portail/${SOPHIE.idPatient}/informations`);
  await expect(page.getByRole('heading', { name: 'Mes choix et autorisations' })).toBeVisible();
  // Même nom, même domaine, même chemin : le cookie de Jennifer remplace celui de Sophie.
  await page.context().addCookies([patientPortailSessionCookie(JENNIFER.idPatient, JENNIFER.email)]);
}

test.describe.serial('Portail — garde du dossier de la page', () => {
  test.beforeAll(async () => {
    await provisionnerAccusesPorteTrust(SOPHIE.idPatient);
  });

  test.afterAll(async () => {
    await closePrisma();
  });

  test('U39 : un autre compte connecté, le choix est refusé sous le geste et rien n’est écrit', async ({ page }) => {
    await ouvrirPuisChangerDeCompte(page);
    const avantSophie = await compterEcrituresTrust(SOPHIE.idPatient);
    const avantJennifer = await compterEcrituresTrust(JENNIFER.idPatient);

    const choix = page.locator('details', { hasText: 'Partage avec le médecin traitant' });
    await choix.locator('summary').click();
    const reponse = page.waitForResponse(
      r => r.url().endsWith('/api/portail/trust/choix') && r.request().method() === 'POST',
    );
    // L'état de départ du choix dépend des specs passés : l'un des deux gestes est là.
    await choix.getByRole('button', { name: /^(J’autorise|Je retire mon autorisation)$/ }).click();
    expect((await reponse).status()).toBe(409);

    // À l'endroit du geste : dans l'accordéon du choix (Q5 a).
    await expect(choix.getByText(T51)).toBeVisible();
    expect(await compterEcrituresTrust(SOPHIE.idPatient)).toEqual(avantSophie);
    expect(await compterEcrituresTrust(JENNIFER.idPatient)).toEqual(avantJennifer);
  });

  test('U40 : un autre compte connecté, le signalement est refusé ; T-51 puis les numéros d’urgence', async ({ page }) => {
    await ouvrirPuisChangerDeCompte(page);
    const avantSophie = await compterEcrituresTrust(SOPHIE.idPatient);
    const avantJennifer = await compterEcrituresTrust(JENNIFER.idPatient);

    const carte = page.locator('#signaler');
    await carte.getByRole('button', { name: /Un problème de confidentialité/ }).click();
    await carte.getByLabel('Type de problème *').selectOption('autre');
    await carte.getByLabel('Décrivez ce que vous avez constaté *').fill('Parcours E2E de la garde du dossier.');
    const reponse = page.waitForResponse(
      r => r.url().endsWith('/api/portail/trust/signalement') && r.request().method() === 'POST',
    );
    await carte.getByRole('button', { name: 'Signaler' }).click();
    expect((await reponse).status()).toBe(409);

    const refus = carte.getByText(T51);
    await expect(refus).toBeVisible();
    // Sous le bouton d'envoi, et la mention de sécurité sous T-51, dans le formulaire.
    const formulaire = carte.locator('form');
    await expect(formulaire.getByText(MENTION)).toBeVisible();
    const ordre = await formulaire.evaluate((form, textes) => {
      const bouton = [...form.querySelectorAll('button')].find(b => b.textContent?.trim() === 'Signaler')!;
      const trouver = (t: string) => [...form.querySelectorAll('*')].find(e => e.children.length === 0 && e.textContent?.includes(t))!;
      const t51 = trouver(textes.t51);
      const mention = trouver(textes.mention);
      return {
        t51ApresBouton: Boolean(bouton.compareDocumentPosition(t51) & Node.DOCUMENT_POSITION_FOLLOWING),
        mentionApresT51: Boolean(t51.compareDocumentPosition(mention) & Node.DOCUMENT_POSITION_FOLLOWING),
      };
    }, { t51: T51, mention: MENTION });
    expect(ordre).toEqual({ t51ApresBouton: true, mentionApresT51: true });
    // Rien de confirmé ; la saisie reste.
    await expect(page.getByText('Votre demande a bien été enregistrée', { exact: false })).toHaveCount(0);
    await expect(carte.getByLabel('Décrivez ce que vous avez constaté *')).toHaveValue('Parcours E2E de la garde du dossier.');

    expect(await compterEcrituresTrust(SOPHIE.idPatient)).toEqual(avantSophie);
    expect(await compterEcrituresTrust(JENNIFER.idPatient)).toEqual(avantJennifer);
  });

  test('un segment quelconque est renvoyé à l’entrée du dossier de la session', async ({ page }) => {
    await page.context().addCookies([patientPortailSessionCookie(SOPHIE.idPatient, SOPHIE.email)]);
    await page.goto('/portail/segment-quelconque/informations');
    // Renvoi à l'entrée ; l'entrée peut ensuite conduire où elle conduit
    // d'ordinaire, toujours sous l'`idPatient` de la session.
    await expect(page).toHaveURL(new RegExp(`/portail/${SOPHIE.idPatient}(/|$|\\?)`));
    await expect(page).not.toHaveURL(/segment-quelconque/);
  });
});
