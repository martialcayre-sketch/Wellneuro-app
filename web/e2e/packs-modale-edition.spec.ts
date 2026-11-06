// La modale d'édition d'un pack (`PacksPanel`), depuis sa migration vers
// `PanneauSuperpose` (lot accessibilité du 2026-11-06) : un vrai `dialog`, que
// Échap ferme, mais qu'un clic sur l'overlay NE ferme PAS. L'ancienne modale
// artisanale ne se fermait jamais au clic extérieur, et toute fermeture passe
// par `onCancelEditPack`, qui efface la saisie du pack : un clic à côté
// coûterait toute l'édition sans recours (relevé par PR-Agent sur la PR).
//
// jsdom ne rejoue pas le clic extérieur de Radix (constaté : la modale y reste
// ouverte avec ou sans `preventDefault`) — d'où ce banc dans un vrai navigateur.
// Lecture seule : la modale est ouverte puis refermée, rien n'est enregistré.
import { test, expect } from '@playwright/test';
import { PRATICIEN_EMAIL, praticienSessionCookie } from './helpers/auth';

test.describe('Packs — modale d’édition', () => {
  test('un clic sur l’overlay ne ferme pas la modale ; Échap la ferme', async ({ page }) => {
    await page.context().addCookies([await praticienSessionCookie(PRATICIEN_EMAIL)]);
    await page.goto('/dashboard/bibliotheque/questionnaires');
    await expect(page.getByRole('heading', { name: 'Nouveau pack de questionnaires' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Chargement des packs...')).toHaveCount(0, { timeout: 10000 });

    await page.getByRole('button', { name: 'Modifier', exact: true }).first().click();
    const modale = page.getByRole('dialog', { name: 'Modifier un pack de questionnaires' });
    await expect(modale).toBeVisible();
    const nom = modale.getByPlaceholder('Nom du pack *');
    const nomInitial = await nom.inputValue();
    await nom.fill(`${nomInitial} (brouillon)`);

    // Coin haut gauche du viewport : l'overlay, hors de la boîte centrée.
    await page.mouse.click(4, 4);
    await expect(modale).toBeVisible();
    await expect(nom).toHaveValue(`${nomInitial} (brouillon)`);

    await page.keyboard.press('Escape');
    await expect(modale).toBeHidden();
  });
});
