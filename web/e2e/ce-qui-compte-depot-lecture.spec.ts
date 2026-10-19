// « Ce qui compte » de bout en bout : le patient DÉPOSE au portail, le
// praticien LIT au cockpit (dette du plan §8, fiche LOT-03:134). Le spec du
// dossier à deux voix lisait une entrée provisionnée en base ; aucun ne passait
// par le formulaire, aucun ne vérifiait que le texte déposé arrive tel quel à
// l'onglet « Trajectoire ». Surface ouverte en production.
//
// Drapeau `WN_CE_QUI_COMPTE` : posé au serveur sous test et au build (voir
// l'en-tête de `portail-dossier-deux-voix.spec.ts`), rien à ajouter ici.
//
// Patient fictif Sophie Nicola (PAT_SEED_01). Le dossier de fixture est PARTAGÉ
// entre les deux projets Playwright : après un premier dépôt, la fenêtre se
// ferme jusqu'à la prochaine ancre de cycle — d'où le nettoyage AVANT comme
// après, sans quoi le second projet trouverait la fenêtre fermée.
import { test, expect } from '@playwright/test';
import { closePrisma, nettoyerDossierDeuxVoix, provisionnerAccusesPorteTrust } from './helpers/db';
import { patientPortailSessionCookie, praticienSessionCookie } from './helpers/auth';

const PATIENT = {
  idPatient: 'PAT_SEED_01',
  email: 'sophie.nicola@fictif.wellneuro.fr',
};
const JETON = 'jeton-de-parcours';
const TEXTE = 'Pouvoir reprendre la marche le dimanche matin avec ma sœur.\nEt dormir sans me réveiller à 4 h.';

test.describe.serial('« Ce qui compte » — dépôt au portail, lecture au cockpit', () => {
  test.beforeAll(async () => {
    await nettoyerDossierDeuxVoix(PATIENT.idPatient);
    await provisionnerAccusesPorteTrust(PATIENT.idPatient);
  });

  test.afterAll(async () => {
    await nettoyerDossierDeuxVoix(PATIENT.idPatient);
    await closePrisma();
  });

  test('le patient dépose ; la fenêtre se ferme ensuite', async ({ page, context }) => {
    await context.addCookies([patientPortailSessionCookie(PATIENT.idPatient, PATIENT.email)]);
    await page.goto(`/portail/${JETON}/ce-qui-compte`);

    const envoyer = page.getByRole('button', { name: 'Envoyer' });
    await expect(envoyer).toBeDisabled();
    await page.getByLabel('Ce que je veux dire').fill(TEXTE);
    await envoyer.click();
    await expect(page.getByText('C’est enregistré. Merci de l’avoir écrit.')).toBeVisible();

    // Aucun chiffre ni jugement sur un texte libre (innerText : `textContent`
    // lit aussi les scripts RSC et leur buildId aléatoire).
    const lu = (await page.locator('body').innerText()).toLowerCase();
    for (const mot of ['score', 'niveau', 'moyenne', 'taux', 'points', 'sur 10']) {
      expect(lu).not.toContain(mot);
    }

    // Un seul dépôt par cycle : rechargée, la page ne rouvre pas le formulaire.
    await page.reload();
    await expect(page.getByText('Vous avez déjà écrit ce qui compte pour vous.')).toBeVisible();
    await expect(page.getByLabel('Ce que je veux dire')).toHaveCount(0);
  });

  test('le praticien lit le texte tel quel à l’onglet Trajectoire', async ({ page, context }) => {
    await context.addCookies([await praticienSessionCookie()]);
    await page.goto(`/dashboard/patients/${PATIENT.idPatient}?onglet=trajectoire`);

    const panneau = page.locator('section', {
      has: page.getByRole('heading', { name: 'Ce qui compte pour le patient' }),
    });
    await expect(panneau).toBeVisible();
    await expect(panneau.getByText('Chargement des dépôts')).toHaveCount(0);

    // Conservé tel quel : même texte, saut de ligne compris, ni résumé ni note.
    await expect(panneau.getByText(/aucune date indiquée/)).toBeVisible();
    expect(await panneau.innerText()).toContain(TEXTE);
    await expect(panneau.getByText(/Aucun dépôt à ce jour/)).toHaveCount(0);
  });
});
