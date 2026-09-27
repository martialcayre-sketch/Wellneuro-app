// Export PDF du dossier patient (D-252) : la CHAÎNE bouton → route → rendu →
// fichier enregistré par le navigateur. Les bancs unitaires couvrent chaque
// maillon isolément (assembleur, masqueur, rendu, route, panneau) ; aucun ne
// voit le fichier que le praticien reçoit réellement, ni son nom.
//
// Patient fictif Sophie Nicola (PAT_SEED_01), déjà seedé. Le parcours est en
// lecture seule côté dossier : la seule écriture est la ligne du journal des
// accès (G-TRUST-04) posée par la garde d'appartenance, comme à toute ouverture
// de fiche.
//
// Non couvert ici : le CONTENU masqué du PDF (le texte est compressé dans les
// flux de page). Il est prouvé par `assembler.test.ts` et `masquage.test.ts`.
import { readFile } from 'node:fs/promises';
import { test, expect, type Locator, type Page } from '@playwright/test';
import { PDFDocument } from 'pdf-lib';
import { praticienSessionCookie } from './helpers/auth';

const PATIENT_ID = 'PAT_SEED_01';
const ROUTE_EXPORT = '/api/praticien/export-dossier';
const TITRE_PANNEAU = 'Exporter le dossier en PDF';

async function ouvrirPanneauExport(page: Page) {
  await page.getByRole('button', { name: 'Exporter en PDF', exact: true }).click();
  const panneau = page.getByRole('dialog', { name: TITRE_PANNEAU });
  await expect(panneau).toBeVisible();
  return panneau;
}

/** Clique « Télécharger le PDF » et rend le fichier reçu, après avoir vérifié
 *  que la route a bien été appelée avec la version affichée. */
async function telecharger(page: Page, panneau: Locator, versionAttendue: 'ia-externe' | 'complete') {
  const bouton = panneau.getByRole('button', { name: 'Télécharger le PDF', exact: true });
  await expect(bouton).toBeEnabled();

  const reponseAttendue = page.waitForResponse(r => new URL(r.url()).pathname === ROUTE_EXPORT);
  const telechargementAttendu = page.waitForEvent('download');
  // Si la route échoue, l'assertion de statut ci-dessous fait tomber le test
  // avant que l'attente du téléchargement ne soit consommée : sans ce
  // gestionnaire, son rejet à la fermeture de la page serait signalé comme une
  // rejection non gérée, qui masquerait la vraie cause.
  telechargementAttendu.catch(() => undefined);

  await bouton.click();
  const reponse = await reponseAttendue;
  expect(new URL(reponse.url()).searchParams.get('version')).toBe(versionAttendue);
  expect(reponse.status()).toBe(200);
  expect(reponse.headers()['content-type']).toContain('application/pdf');

  const telechargement = await telechargementAttendu;
  expect(await telechargement.failure()).toBeNull();
  const octets = await readFile(await telechargement.path());
  return { nom: telechargement.suggestedFilename(), octets };
}

async function lirePdf(octets: Buffer) {
  expect(octets.subarray(0, 5).toString('latin1')).toBe('%PDF-');
  const pdf = await PDFDocument.load(octets, { updateMetadata: false });
  expect(pdf.getPageCount()).toBeGreaterThan(0);
  return pdf;
}

test.describe('Export PDF du dossier patient (fiche patient)', () => {
  test('télécharge la version pseudonymisée par défaut, puis la version complète', async ({ page, context }) => {
    await context.addCookies([await praticienSessionCookie()]);
    await page.goto(`/dashboard/patients/${PATIENT_ID}`);

    const panneau = await ouvrirPanneauExport(page);
    const radioIaExterne = panneau.getByRole('radio', { name: 'Pour une IA externe (pseudonymisée)', exact: true });
    const radioComplete = panneau.getByRole('radio', { name: 'Complète', exact: true });
    await expect(radioIaExterne).toBeChecked();
    await expect(radioComplete).not.toBeChecked();

    const iaExterne = await telecharger(page, panneau, 'ia-externe');
    expect(iaExterne.nom).toMatch(/^dossier-[A-Za-z0-9_-]+-ia-externe-\d{4}-\d{2}-\d{2}\.pdf$/);
    expect(iaExterne.nom.startsWith(`dossier-${PATIENT_ID}-`)).toBe(true);
    expect((await lirePdf(iaExterne.octets)).getTitle()).toBe(`Dossier patient ${PATIENT_ID}`);

    await radioComplete.check();
    await expect(radioIaExterne).not.toBeChecked();
    const complete = await telecharger(page, panneau, 'complete');
    expect(complete.nom).toMatch(/^dossier-[A-Za-z0-9_-]+-complet-\d{4}-\d{2}-\d{2}\.pdf$/);
    expect(complete.nom.startsWith(`dossier-${PATIENT_ID}-`)).toBe(true);
    expect((await lirePdf(complete.octets)).getTitle()).toBe(`Dossier patient ${PATIENT_ID}`);

    // La version complète ne se retient pas : une réouverture repart de la
    // version pseudonymisée.
    await panneau.getByRole('button', { name: `Fermer ${TITRE_PANNEAU}` }).click();
    await expect(panneau).toBeHidden();
    const rouvert = await ouvrirPanneauExport(page);
    await expect(rouvert.getByRole('radio', { name: 'Pour une IA externe (pseudonymisée)', exact: true })).toBeChecked();
  });

  test('le bouton d’export disparaît en mode consultation', async ({ page, context }) => {
    await context.addCookies([await praticienSessionCookie()]);
    await page.goto(`/dashboard/patients/${PATIENT_ID}`);

    const exporter = page.getByRole('button', { name: 'Exporter en PDF', exact: true });
    await expect(exporter).toBeVisible();

    await page.getByRole('button', { name: 'Mode consultation' }).click();
    await expect(page.locator('[data-mode-consultation="actif"]')).toBeVisible();
    await expect(exporter).toHaveCount(0);

    await page.getByRole('button', { name: 'Quitter' }).click();
    await expect(page.locator('[data-mode-consultation]')).toHaveCount(0);
    await expect(exporter).toBeVisible();
  });
});
