// Le « dossier à deux voix » au portail (Alliance 6.0-A, LOT-06) — parcours
// PATIENT de bout en bout.
//
// CE SPEC SOLDE UNE DETTE DE DEUX LOTS : ni le LOT-03 (« ce qui compte ») ni le
// LOT-04 (synthèse de compréhension) n'avaient d'E2E, et leurs écrans n'étaient
// donc vérifiés qu'en unitaire — c'est-à-dire jamais contre un rendu serveur
// réel, avec les drapeaux dans la position où ces pages existent.
//
// TROIS DRAPEAUX SONT REQUIS, et ils sont posés en TROIS endroits :
// `playwright.config.ts` (serveur sous test), `scripts/wn-test-worktree.sh` et
// `.github/workflows/ci.yml` (la commande `npm run build`, parce que les pages
// portail lisent leur drapeau au RENDU SERVEUR). En manquer un rend les écrans
// introuvables, et le rouge ne désigne pas le drapeau.
//
// Patient fictif Sophie Nicola (PAT_SEED_01), l'une des trois identités
// autorisées. Aucune opération destructive hors des lignes créées par ce spec :
// `nettoyerDossierDeuxVoix` ne vise que les cinq tables de l'alliance, pour ce
// seul dossier de fixture (`D-075` : aucun seed ni E2E ne vise un dossier réel).
import { test, expect } from '@playwright/test';
import {
  closePrisma,
  lireRatifications,
  nettoyerDossierDeuxVoix,
  provisionnerAccuseCadre,
  provisionnerDossierDeuxVoix,
} from './helpers/db';
import { patientPortailSessionCookie } from './helpers/auth';

const PATIENT = {
  idPatient: 'PAT_SEED_01',
  email: 'sophie.nicola@fictif.wellneuro.fr',
};

// Le segment d'URL n'est PAS un facteur d'authentification depuis le LOT-04 du
// Socle : le cookie signé est l'unique credential. Une valeur littérale suffit
// donc à construire le chemin.
const JETON = 'jeton-de-parcours';

test.describe.serial('Portail — mon dossier à deux voix', () => {
  let idObjectif = '';

  test.beforeAll(async () => {
    ({ idObjectif } = await provisionnerDossierDeuxVoix(PATIENT.idPatient));
    // Sans lui, le hub rend « Avant de commencer » et la nav n'existe pas.
    await provisionnerAccuseCadre(PATIENT.idPatient);
  });

  test.afterAll(async () => {
    await nettoyerDossierDeuxVoix(PATIENT.idPatient);
    await closePrisma();
  });

  test.beforeEach(async ({ context }) => {
    await context.addCookies([
      patientPortailSessionCookie(PATIENT.idPatient, PATIENT.email),
    ]);
  });

  test('l’écran est atteignable depuis la navigation du hub', async ({ page }) => {
    await page.goto(`/portail/${JETON}/questionnaires`);

    // LE POINT DE CE CAS : le lien est dans la nav « Autres espaces », visible
    // sans rien déplier et sans dépendre d'un protocole diffusé. Le placer dans
    // « Mon accompagnement » — replié, et après un retour anticipé — aurait
    // livré un écran que personne n'ouvre.
    const lien = page.getByRole('link', { name: 'Ouvrir mon dossier à deux voix' });
    await expect(lien).toBeVisible();
    await lien.click();

    await expect(page.getByRole('heading', { name: 'Mon dossier, à deux voix' })).toBeVisible();
  });

  test('les trois objets sont assemblés sur une seule page', async ({ page }) => {
    await page.goto(`/portail/${JETON}/dossier`);

    // Ce que le patient a dit, ce que le praticien en a compris…
    await expect(page.getByText('sans avoir l’impression de n’avoir pas dormi')).toBeVisible();
    await expect(page.getByText('Un sommeil qui ne restaure pas')).toBeVisible();
    // …ce qui compte pour lui…
    await expect(page.getByText('la marche du dimanche avec ma fille')).toBeVisible();
    // …et la synthèse publiée.
    await expect(page.getByText('un sommeil qui se casse au milieu de la nuit')).toBeVisible();
  });

  test('aucun score, aucune bande, aucun décompte sur cet écran', async ({ page }) => {
    await page.goto(`/portail/${JETON}/dossier`);
    await expect(page.getByRole('heading', { name: 'Mon dossier, à deux voix' })).toBeVisible();

    const rendu = ((await page.locator('body').textContent()) ?? '').toLowerCase();
    for (const interdit of ['score', 'niveau', 'moyenne', 'taux', 'points', 'sur 10']) {
      expect(rendu, `« ${interdit} » n’a rien à faire sur cet écran`).not.toContain(interdit);
    }
  });

  test('l’état de départ ne dit rien du patient — jamais « non ratifié »', async ({ page }) => {
    await page.goto(`/portail/${JETON}/dossier`);
    await expect(page.getByText('ne vous êtes pas encore prononcé')).toBeVisible();

    const rendu = (await page.locator('body').textContent()) ?? '';
    expect(rendu).not.toContain('non ratifié');
    expect(rendu).not.toContain('refusé');
  });

  test('ratifier écrit une ligne, et l’écran le reflète', async ({ page }) => {
    await page.goto(`/portail/${JETON}/dossier`);
    await page.getByRole('button', { name: 'C’est bien ça' }).click();

    await expect(page.getByText('Vous avez répondu : c’est bien ça.')).toBeVisible();

    const lignes = await lireRatifications(PATIENT.idPatient);
    expect(lignes).toEqual([{ sens: 'ratifie', idObjectif }]);
  });

  test('CHANGER D’AVIS AJOUTE UNE LIGNE — rien n’est écrasé ni retiré', async ({ page }) => {
    await page.goto(`/portail/${JETON}/dossier`);
    // L'écran affiche l'état posé au cas précédent : la série est bien
    // séquentielle, et le second geste s'ajoute au premier.
    await expect(page.getByText('Vous avez répondu : c’est bien ça.')).toBeVisible();

    await page.getByRole('button', { name: 'Ce n’est pas exactement ça' }).click();
    await expect(page.getByText('Vous avez répondu : ce n’est pas exactement ça.')).toBeVisible();

    // DEUX lignes, dans l'ordre — pas une ligne corrigée. C'est l'invariant du
    // lot, et c'est le seul endroit où il se vérifie contre une vraie base.
    const lignes = await lireRatifications(PATIENT.idPatient);
    expect(lignes).toEqual([
      { sens: 'ratifie', idObjectif },
      { sens: 'conteste', idObjectif },
    ]);

    // Et aucun bouton pour retirer la réponse : il n'existe pas de verbe pour
    // cela, ni dans l'écran ni dans la route.
    const rendu = (await page.locator('body').textContent()) ?? '';
    expect(rendu).not.toContain('Annuler ma réponse');
    expect(rendu).not.toContain('Supprimer');
  });

  test('sans session portail, l’écran ne sert rien', async ({ browser }) => {
    const contexteAnonyme = await browser.newContext();
    const page = await contexteAnonyme.newPage();

    const reponse = await page.request.get('/api/portail/dossier');
    expect(reponse.status()).toBe(401);

    await contexteAnonyme.close();
  });
});
