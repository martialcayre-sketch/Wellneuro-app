// Proposition de pack de réévaluation, de bout en bout (SP-SPI / LOT-01).
//
// C'est le seul trou laissé par la PR #216 : les tests unitaires couvrent le
// domaine, la route et le composant, mais aucun ne prouvait que l'écran
// s'affiche pour un vrai patient en reprise, dans un vrai navigateur, et que le
// refus s'y tient.
//
// Patient : Jennifer Martin (PAT_SEED_02). Le motif de ce choix tient toujours :
// la mise en reprise mute ses réponses et son état de compte, et l'appliquer à
// Michel (PAT_SEED_03) casserait `portail-parcours`.
//
// EN REVANCHE, DEUX AFFIRMATIONS QUI VIVAIENT ICI ÉTAIENT FAUSSES, et elles se
// tenaient l'une l'autre : « utilisé par aucun autre spec », justifié par le
// fait que « les specs tournent en parallèle sur la même base éphémère ».
//
// Elle est nommée par QUATRE specs. Trois y écrivent — celui-ci et
// `visual.spec.ts` par `preparerReprisePourTest`, `biologie-proposition-courrier`
// en confirmant un épisode T0 ; `fiche-detail-reponses` se contente de lire.
//
// Et rien ne tourne en parallèle : `playwright.config.ts` pose
// `fullyParallel: false` et `workers: 1`. Les specs se suivent, dans l'ordre
// alphabétique des fichiers, donc celui-ci passe après
// `biologie-proposition-courrier` et avant `visual.spec.ts`.
//
// Ce qui protège n'est donc pas une exclusivité qui n'existe pas, mais deux
// choses réelles : la séquence est déterministe, et chaque spec qui mute
// nettoie derrière lui (`nettoyerReprise` ici et dans `visual`,
// `nettoyerDossierBiologie` dans le troisième). Écrit parce qu'un commentaire
// crédible et faux est ce sur quoi quelqu'un s'appuiera.
import { test, expect } from '@playwright/test';
import { preparerReprisePourTest, nettoyerReprise, closePrisma } from './helpers/db';
import { patientPortailSessionCookie } from './helpers/auth';

const PATIENT = {
  idPatient: 'PAT_SEED_02',
  email: 'jennifer.martin@fictif.wellneuro.fr',
};

test.describe.serial('Proposition de pack de réévaluation (reprise)', () => {
  test.beforeAll(async () => {
    // Met le patient en état « reprise » ; l'accès passe par le cookie de
    // session (le jeton permanent n'existe plus — colonnes purgées, D-085).
    await preparerReprisePourTest(PATIENT.idPatient);
  });

  test.afterAll(async () => {
    await nettoyerReprise(PATIENT.idPatient);
    await closePrisma();
  });

  async function seConnecter(page: import('@playwright/test').Page): Promise<void> {
    // LOT-04 : session par cookie (comme l'atterrissage magic-link/Google), plus
    // de gate e-mail ni de jeton d'URL. TRUST « Avant de commencer » est sauté
    // (accusé posé par le helper) ; l'accueil vit sur la page questionnaires.
    await page.context().addCookies([patientPortailSessionCookie(PATIENT.idPatient, PATIENT.email)]);
    await page.goto(`/portail/${PATIENT.idPatient}/questionnaires`);
    await expect(page.getByRole('heading', { name: 'Mon parcours' })).toBeVisible();
  }

  test('la proposition s’affiche, se décline, et ne revient pas', async ({ page }) => {
    test.slow();

    await seConnecter(page);

    // La proposition est là, avec ses deux réponses au même niveau — refuser
    // n'est pas relégué à un lien.
    const proposition = page.getByRole('heading', { name: /Refaire le point/i });
    await expect(proposition).toBeVisible();
    const refuser = page.getByRole('button', { name: /Non, pas maintenant/i });
    await expect(refuser).toBeVisible();
    await expect(page.getByRole('button', { name: /Oui, je veux bien/i })).toBeVisible();

    // Aucun chiffre de score, aucune pression dans ce qui est rendu.
    const carte = page.locator('section', { has: proposition });
    await expect(carte).not.toContainText(/score|jours manqués|vous devez/i);

    // On décline : l'accusé promet que la question ne reviendra pas.
    await Promise.all([
      page.waitForResponse(
        (r) =>
          r.url().includes('/api/portail/pack-reevaluation') &&
          r.request().method() === 'POST' &&
          r.status() === 200,
      ),
      refuser.click(),
    ]);
    await expect(page.getByText(/ne vous sera pas reposée/i)).toBeVisible();

    // Rechargement : la question ne se repose pas — c'est le cœur de la réserve
    // (une proposition qui revient serait une relance).
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Mon parcours' })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Refaire le point/i })).toHaveCount(0);
  });
});
