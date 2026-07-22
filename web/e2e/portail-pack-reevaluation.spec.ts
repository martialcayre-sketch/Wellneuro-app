// Proposition de pack de réévaluation, de bout en bout (SP-SPI / LOT-01).
//
// C'est le seul trou laissé par la PR #216 : les tests unitaires couvrent le
// domaine, la route et le composant, mais aucun ne prouvait que l'écran
// s'affiche pour un vrai patient en reprise, dans un vrai navigateur, et que le
// refus s'y tient.
//
// Patient : Jennifer Martin (PAT_SEED_02), fictif autorisé et **utilisé par
// aucun autre spec** — la mise en reprise mute ses réponses et son jeton, et les
// specs tournent en parallèle sur la même base éphémère. L'appliquer à Michel
// (PAT_SEED_03) casserait `portail-parcours`.
import { test, expect } from '@playwright/test';
import { preparerReprisePourTest, nettoyerReprise, closePrisma } from './helpers/db';

const PATIENT = {
  idPatient: 'PAT_SEED_02',
  email: 'jennifer.martin@fictif.wellneuro.fr',
};

test.describe.serial('Proposition de pack de réévaluation (reprise)', () => {
  let token = '';

  test.beforeAll(async () => {
    token = await preparerReprisePourTest(PATIENT.idPatient);
  });

  test.afterAll(async () => {
    await nettoyerReprise(PATIENT.idPatient);
    await closePrisma();
  });

  async function seConnecter(page: import('@playwright/test').Page): Promise<void> {
    await page.goto(`/portail/${token}`);
    await expect(page.getByRole('heading', { name: 'Votre espace patient' })).toBeVisible();
    await page.getByPlaceholder('votre@email.fr').fill(PATIENT.email);
    await Promise.all([
      page.waitForResponse((r) => r.url().includes('/api/portail/session') && r.status() === 200),
      page.getByRole('button', { name: 'Accéder à mon espace' }).click(),
    ]);
    // TRUST « Avant de commencer » est sauté (accusé posé par le helper) ;
    // l'accueil vit sur la page questionnaires.
    await page.goto(`/portail/${token}/questionnaires`);
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
