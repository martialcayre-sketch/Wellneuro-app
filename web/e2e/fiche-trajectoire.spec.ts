// Fiche-trajectoire praticien (C2B, index navigable de la Vague 2). Cette
// surface n'avait AUCUNE couverture E2E : ni l'onglet « Trajectoire », ni la
// phase « Réévaluation » du poste de pilotage n'étaient joués par un test de
// bout en bout. Patient fictif Sophie Nicola (PAT_SEED_01, déjà seedé) — il
// n'a aucun épisode confirmé, ce qui rend l'état vide vérifiable tel quel.
import { test, expect } from '@playwright/test';
import { praticienSessionCookie } from './helpers/auth';

const PATIENT_ID = 'PAT_SEED_01';

test.describe('Fiche-trajectoire (onglet Trajectoire)', () => {
  test('l’onglet ouvre la fiche-trajectoire et distingue l’état vide d’une erreur', async ({ page, context }) => {
    await context.addCookies([await praticienSessionCookie()]);
    await page.goto(`/dashboard/patients/${PATIENT_ID}`);

    const onglets = page.getByRole('tablist', { name: 'Vues de la fiche patient' });
    await expect(onglets).toBeVisible();

    const ongletTrajectoire = onglets.getByRole('tab', { name: 'Trajectoire' });
    // Cible tactile : garde-fou d'accessibilité 5.0 (≥ 44 px).
    expect((await ongletTrajectoire.boundingBox())?.height).toBeGreaterThanOrEqual(44);
    await ongletTrajectoire.click();
    await expect(ongletTrajectoire).toHaveAttribute('aria-selected', 'true');

    const panneau = page.getByRole('region', { name: 'Fiche-trajectoire' });
    await expect(panneau).toBeVisible();
    // En-tête d'identité (maquette 5.0) : sans épisode confirmé, l'identité
    // seule — aucun « épisode N » n'est affirmé.
    await expect(panneau.getByRole('heading', { name: 'Sophie Nicola' })).toBeVisible();
    await expect(panneau.getByText(/— épisode/)).toHaveCount(0);

    // Sans épisode confirmé : état vide EXPLICITE, jamais une erreur déguisée
    // ni une affirmation par défaut sur l'historique clinique. L'assertion est
    // portée sur le panneau d'onglet (l'annonceur de route de Next.js occupe
    // lui aussi un `role="alert"` à l'échelle de la page).
    await expect(panneau.getByText('Aucun épisode confirmé pour l’instant.')).toBeVisible();
    await expect(page.locator('#panneau-trajectoire').getByRole('alert')).toHaveCount(0);
    await expect(page.getByText(/n’a pas pu être lue/)).toHaveCount(0);

    // Aucun index à afficher tant qu'aucun repère n'est confirmé : la
    // navigation de la Spirale ne s'invente pas — ni en boutons texte, ni en
    // arcs SVG.
    await expect(page.getByRole('navigation', { name: 'Index de la Spirale' })).toHaveCount(0);
    await expect(page.getByRole('group', { name: /Spirale de trajectoire/ })).toHaveCount(0);

    // Mode de vie 7 domaines (LOT-02) : le panneau existe au présent — mesuré
    // ou « non mesuré » selon les réponses du patient seedé, jamais absent.
    await expect(panneau.getByRole('region', { name: 'Mode de vie — 7 domaines' })).toBeVisible();
  });

  test('le deep-link ?onglet=trajectoire ouvre la fiche directement sur la trajectoire', async ({ page, context }) => {
    await context.addCookies([await praticienSessionCookie()]);
    await page.goto(`/dashboard/patients/${PATIENT_ID}?onglet=trajectoire`);

    const onglets = page.getByRole('tablist', { name: 'Vues de la fiche patient' });
    await expect(onglets.getByRole('tab', { name: 'Trajectoire' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('region', { name: 'Fiche-trajectoire' })).toBeVisible();

    // Une valeur inconnue est ignorée — jamais une erreur. Depuis la mémoire
    // d'onglet (audit 2026-09-02), « ignorée » = « aucune intention » : la
    // fiche restaure l'onglet mémorisé s'il existe (ici « Trajectoire »,
    // consulté juste au-dessus)…
    await page.goto(`/dashboard/patients/${PATIENT_ID}?onglet=inconnu`);
    await expect(onglets.getByRole('tab', { name: 'Trajectoire' })).toHaveAttribute('aria-selected', 'true');

    // …et sans mémoire, elle retombe sur le poste de pilotage, comme avant.
    await page.evaluate(() => window.localStorage.clear());
    await page.goto(`/dashboard/patients/${PATIENT_ID}?onglet=inconnu`);
    await expect(onglets.getByRole('tab', { name: 'Poste de pilotage' })).toHaveAttribute('aria-selected', 'true');
  });

  test('la phase Réévaluation du poste de pilotage n’affirme rien sans épisode confirmé', async ({ page, context }) => {
    await context.addCookies([await praticienSessionCookie()]);
    await page.goto(`/dashboard/patients/${PATIENT_ID}`);

    const rail = page.getByRole('tablist', { name: 'Cycle clinique' });
    await rail.getByRole('tab', { name: /Réévaluation/ }).click();

    // Le second chemin d'affichage de la trajectoire. Sans épisode confirmé,
    // l'absence de cycle est rattachée à l'absence d'épisode — jamais présentée
    // comme le résultat d'une lecture de l'historique.
    await expect(page.getByText(/se construit après confirmation d’un épisode/)).toBeVisible();

    // Garde-fou responsive commun aux surfaces praticien : la grille du
    // comparateur défile dans son conteneur, jamais la page.
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
    ).toBe(true);
  });
});

// PRA-3a — structure de la fiche ([[D-486]] §3, T-14, T-15 ; prototype de
// l'étape 3 validé le 2026-11-12). Au bureau seulement : sous 1 024 px, rien
// ne se replie (colonnes empilées, sans commande).
test.describe('Fiche-trajectoire — replis des phases et du contexte (PRA-3a)', () => {
  test.skip(({ isMobile }) => isMobile, 'Les replis n’existent qu’au bureau (≥ 1 024 px).');

  test('le focus suit la commande, le rail replié quitte le clavier, le brouillon reste', async ({ page, context }) => {
    await context.addCookies([await praticienSessionCookie()]);
    await page.goto(`/dashboard/patients/${PATIENT_ID}`);

    const rail = page.getByRole('tablist', { name: 'Cycle clinique' });
    await expect(rail).toBeVisible();
    const masquerPhases = page.getByRole('button', { name: 'Masquer les phases' });
    const afficherPhases = page.getByRole('button', { name: 'Afficher les phases' });
    await expect(afficherPhases).toBeHidden();

    // Clic rejoué jusqu'à son effet : le premier peut partir avant l'hydratation.
    await expect(async () => {
      await masquerPhases.click({ timeout: 1_000 });
      await expect(rail).toBeHidden({ timeout: 1_000 });
    }).toPass();
    await expect(afficherPhases).toBeFocused();
    // Replié, aucune phase ne prend le focus.
    await page.getByRole('tab', { name: /Actions/, includeHidden: true }).focus().catch(() => undefined);
    await expect(page.getByRole('tab', { name: /Actions/, includeHidden: true })).not.toBeFocused();

    await afficherPhases.click();
    await expect(rail).toBeVisible();
    await expect(masquerPhases).toBeFocused();

    const masquerContexte = page.getByRole('button', { name: 'Masquer le contexte' });
    const afficherContexte = page.getByRole('button', { name: 'Afficher le contexte' });
    const instruments = page.getByText('Instruments', { exact: true });
    await expect(instruments).toBeVisible();
    await masquerContexte.click();
    await expect(instruments).toBeHidden();
    await expect(afficherContexte).toBeFocused();

    // Rechargement : la session repart, les deux panneaux reviennent.
    await page.reload();
    await expect(rail).toBeVisible();
    await expect(page.getByText('Instruments', { exact: true })).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
    ).toBe(true);
  });

  test('de 1 024 à 1 279 px, le contexte est escamoté d’office et se rouvre par sa commande', async ({ page, context }) => {
    await page.setViewportSize({ width: 1100, height: 800 });
    await context.addCookies([await praticienSessionCookie()]);
    await page.goto(`/dashboard/patients/${PATIENT_ID}`);

    await expect(page.getByRole('tablist', { name: 'Cycle clinique' })).toBeVisible();
    await expect(page.getByText('Instruments', { exact: true })).toBeHidden();
    const afficherContexte = page.getByRole('button', { name: 'Afficher le contexte' });
    await expect(async () => {
      await afficherContexte.click({ timeout: 1_000 });
      await expect(page.getByText('Instruments', { exact: true })).toBeVisible({ timeout: 1_000 });
    }).toPass();
    await expect(page.getByRole('button', { name: 'Masquer le contexte' })).toBeFocused();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
    ).toBe(true);
  });
});

