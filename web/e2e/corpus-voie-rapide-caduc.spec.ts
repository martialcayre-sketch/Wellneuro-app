// Atelier corpus, voie rapide — clôture d'un tirage CADUC.
//
// Reproduit le deadlock de WN-SRC-0056 : un tirage ouvert dont le lot a divergé
// (claims traités individuellement) n'est ni signable ni relançable. La modale
// doit détecter l'état caduc, masquer « Signer » / « Basculer », et n'offrir que
// la clôture neutre (issue tirage_caduc). Le seed injecte un claim VALIDE (donc
// hors file « En attente », qu'un autre spec attend vide) + un tirage ouvert aux
// éligibles divergents.
import { test, expect } from '@playwright/test';
import { praticienSessionCookie } from './helpers/auth';
import {
  seedTirageCaducFixture,
  cleanupTirageCaducFixture,
  closePrisma,
} from './helpers/db';

const PRATICIEN_EMAIL = 'martialcayre@wellneuro.fr';

test.describe('Atelier corpus — clôture d’un tirage caduc (voie rapide)', () => {
  test.beforeEach(async () => {
    await seedTirageCaducFixture();
  });

  test.afterAll(async () => {
    await cleanupTirageCaducFixture();
    await closePrisma();
  });

  test('un tirage caduc se clôture sans signer ni basculer', async ({ page }) => {
    await page.context().addCookies([await praticienSessionCookie(PRATICIEN_EMAIL)]);
    await page.goto('/dashboard/corpus');

    await expect(page.getByRole('heading', { name: 'Atelier corpus' })).toBeVisible({
      timeout: 10000,
    });

    // La source apparaît dans la vue d'ensemble avec un tirage en cours : on
    // ouvre la modale de voie rapide sur sa ligne.
    const ligne = page.locator('tr', { hasText: 'WN-SRC-0056' });
    await expect(ligne).toBeVisible({ timeout: 10000 });
    await ligne.getByRole('button', { name: 'Voie rapide' }).click();

    // La modale reconnaît le tirage caduc : bandeau explicite, et AUCUNE action
    // de signature ni de bascule (elles seraient impossibles / hors sujet).
    await expect(page.getByRole('heading', { name: 'Tirage caduc' })).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByRole('button', { name: 'Signer le lot' })).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: 'Basculer en revue individuelle' }),
    ).toHaveCount(0);

    // Clôture neutre : armer puis confirmer.
    await page.getByRole('button', { name: 'Clore le tirage (caduc)' }).click();
    await page.getByRole('button', { name: 'Confirmer la clôture du tirage caduc' }).click();

    await expect(page.getByText('Tirage caduc clôturé', { exact: false })).toBeVisible({
      timeout: 10000,
    });
  });
});
