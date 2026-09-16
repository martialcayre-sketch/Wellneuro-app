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

  // DEUX ITEMS DU RAIL PARTAGENT UN PRÉFIXE D'URL, et c'est ce que ce test
  // garde. « Patients » mène à la liste des dossiers (`/dashboard/patients`) ;
  // « Fiche-trajectoire » mène ailleurs (`/dashboard/trajectoires`) tout en
  // s'allumant sur les FICHES, qui vivent sous le préfixe du premier.
  //
  // Le test citait auparavant « Questionnaires & packs », l'entrée d'héritage
  // 4.0 qui occupait `/dashboard/patients`. Elle a quitté le rail le
  // 2026-09-16 : ses assignations et ses packs sont un rayon de la
  // Bibliothèque, et la gestion des dossiers est devenue « Patients ».
  test('le rail desktop distingue « Patients » (la liste) de « Fiche-trajectoire »', async ({
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
    await expect(rail.getByRole('link', { name: 'Patients', exact: true })).toHaveAttribute(
      'href',
      '/dashboard/patients',
    );
    // L'entrée d'héritage a bien disparu : un rail qui la garderait mènerait à
    // une page qui ne porte plus ni assignations ni packs.
    await expect(rail.getByRole('link', { name: /Questionnaires & packs/ })).toHaveCount(0);
  });
});
