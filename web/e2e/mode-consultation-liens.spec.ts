// Mode consultation : la fiche ne rend aucun lien qui la quitte ([[D-354]]
// amendement DOC-15, Q10 de PRA-5 ; [[D-481]] complément DOC-15). Banc
// d'inventaire : on relève chaque `a[href]` de la fiche en mode — son enveloppe
// `[data-mode-consultation="actif"]` et les tiroirs ouverts, portés hors d'elle
// par Radix — et aucun ne doit sortir. Hors du mode, le même relevé trouve les
// liens visés : sans cela, leur absence en mode ne prouverait rien.
//
// Le rail global et l'en-tête de l'application restent servis en mode (Q14) :
// ils sont hors du relevé. « Ouvrir le document » (documents déposés par le
// patient) est gardé par le banc unitaire de `DocumentsDeposesPanel` : le
// dossier de seed n'en porte aucun. Patient fictif Sophie Nicola (PAT_SEED_01),
// lecture seule.
import { test, expect, type Page } from '@playwright/test';
import { praticienSessionCookie } from './helpers/auth';

const PATIENT_ID = 'PAT_SEED_01';
const TIROIR = 'Synthèse IA & booklet';

/** Les liens qui quittent la fiche, dans l'enveloppe du mode et les tiroirs ouverts. */
async function liensSortants(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const racines = Array.from(document.querySelectorAll('[data-mode-consultation="actif"], [role="dialog"]'));
    return racines
      .flatMap(racine => Array.from(racine.querySelectorAll('a[href]')))
      .map(a => a.getAttribute('href') ?? '')
      .filter(href => !href.startsWith('#'));
  });
}

async function ouvrirTiroirSynthese(page: Page) {
  await page.getByRole('button', { name: TIROIR }).click();
  const tiroir = page.getByRole('dialog', { name: TIROIR });
  await expect(tiroir).toBeVisible();
  // La lecture de la synthèse est faite : l'état final est affiché.
  await expect(tiroir.getByRole('status')).toHaveCount(0);
  return tiroir;
}

test.describe('Mode consultation — aucun lien ne quitte la fiche (Q10)', () => {
  test('inventaire : hors du mode les liens sont là, en mode il n’en reste aucun', async ({ page, context }) => {
    await context.addCookies([await praticienSessionCookie()]);
    await page.goto(`/dashboard/patients/${PATIENT_ID}`);

    // Hors du mode : le retour de l'en-tête et les deux liens du tiroir.
    await expect(page.getByRole('link', { name: '← Retour aux patients' })).toBeVisible();
    const tiroirHorsMode = await ouvrirTiroirSynthese(page);
    await expect(tiroirHorsMode.getByRole('link', { name: 'Ouvrir la synthèse IA' })).toBeVisible();
    await expect(tiroirHorsMode.getByRole('link', { name: 'Composer un document' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(tiroirHorsMode).toBeHidden();

    await page.getByRole('button', { name: 'Mode consultation' }).click();
    await expect(page.locator('[data-mode-consultation="actif"]')).toBeVisible();

    await expect(page.getByRole('link', { name: '← Retour aux patients' })).toHaveCount(0);
    expect(await liensSortants(page)).toEqual([]);

    const tiroir = await ouvrirTiroirSynthese(page);
    await expect(tiroir.getByRole('link')).toHaveCount(0);
    expect(await liensSortants(page)).toEqual([]);
    await page.keyboard.press('Escape');

    // On sort par « Quitter » : la fiche rend de nouveau ses liens.
    await page.getByRole('button', { name: 'Quitter' }).click();
    await expect(page.getByRole('link', { name: '← Retour aux patients' })).toBeVisible();
  });

  test('au clavier, la tabulation ne rencontre aucun lien sortant dans la fiche en mode', async ({ page, context }) => {
    await context.addCookies([await praticienSessionCookie()]);
    await page.goto(`/dashboard/patients/${PATIENT_ID}`);
    await page.getByRole('button', { name: 'Mode consultation' }).click();
    const quitter = page.getByRole('button', { name: 'Quitter' });
    await quitter.focus();

    const rencontres: string[] = [];
    let dansLaFiche = 0;
    for (let i = 0; i < 80; i += 1) {
      await page.keyboard.press('Tab');
      const focus = await page.evaluate(() => {
        const el = document.activeElement;
        const fiche = document.querySelector('[data-mode-consultation="actif"]');
        if (!el || !fiche || !fiche.contains(el)) return null;
        const href = el instanceof HTMLAnchorElement ? el.getAttribute('href') : null;
        return { href };
      });
      if (!focus) continue;
      dansLaFiche += 1;
      if (focus.href && !focus.href.startsWith('#')) rencontres.push(focus.href);
    }

    // Le parcours a bien traversé la fiche, et n'y a rencontré aucun lien sortant.
    expect(dansLaFiche).toBeGreaterThan(5);
    expect(rencontres).toEqual([]);
  });
});
