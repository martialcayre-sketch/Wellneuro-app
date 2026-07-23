// Porte d'entrée « Trajectoires » (SP-TRAJ LOT-04) : le rail « Fiche-
// trajectoire » mène à la liste orientée trajectoire, chaque ligne ouvrant la
// fiche sur l'onglet Trajectoire (deep-link LOT-01). Patient fictif Sophie
// Nicola (PAT_SEED_01) — sans épisode confirmé, la ligne dit « T0 à
// confirmer » / « Aucun épisode confirmé » : rien n'est inventé.
import { test, expect } from '@playwright/test';
import { praticienSessionCookie } from './helpers/auth';

test.describe('Porte d’entrée Trajectoires', () => {
  test('le rail mène à la liste, la ligne patient dit l’état réel, le clic ouvre la fiche sur Trajectoire', async ({
    page,
    context,
  }) => {
    await context.addCookies([await praticienSessionCookie()]);
    await page.goto('/dashboard/trajectoires');

    await expect(page.getByRole('heading', { name: 'Fiche-trajectoire' })).toBeVisible();

    // La ligne Sophie Nicola existe et n'affirme aucun épisode.
    const ligne = page.getByRole('link', { name: /Sophie Nicola/ });
    await expect(ligne).toBeVisible();
    await expect(ligne.getByText('Aucun épisode confirmé')).toBeVisible();
    // Cible tactile ≥ 44 px.
    expect((await ligne.boundingBox())?.height).toBeGreaterThanOrEqual(44);

    // Le clic ouvre la fiche directement sur l'onglet Trajectoire.
    await ligne.click();
    await expect(page).toHaveURL(/\/dashboard\/patients\/PAT_SEED_01\?onglet=trajectoire/);
    const onglets = page.getByRole('tablist', { name: 'Vues de la fiche patient' });
    await expect(onglets.getByRole('tab', { name: 'Trajectoire' })).toHaveAttribute('aria-selected', 'true');

    // Pas de défilement horizontal de la page (garde responsive commune).
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
    ).toBe(true);
  });

  test('le rail desktop pointe « Fiche-trajectoire » vers la liste, « Questionnaires & packs » vers la page héritage', async ({
    page,
    context,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'Desktop Chromium', 'rail latéral : desktop uniquement');
    await context.addCookies([await praticienSessionCookie()]);
    await page.goto('/dashboard/trajectoires');

    const rail = page.locator('nav').filter({ hasText: 'La Spirale' }).first();
    await expect(rail.getByRole('link', { name: 'Fiche-trajectoire' })).toHaveAttribute(
      'href',
      '/dashboard/trajectoires',
    );
    await expect(rail.getByRole('link', { name: /Questionnaires & packs/ })).toHaveAttribute(
      'href',
      '/dashboard/patients',
    );
  });
});
