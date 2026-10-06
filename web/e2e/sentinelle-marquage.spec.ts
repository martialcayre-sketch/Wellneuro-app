// La sentinelle biologie exempte la marque et l'intervalle imprimés par le
// laboratoire, et eux seuls ([[D-267]] §6, précision du 2026-10-06). Ce spec
// exerce le VRAI helper sur un DOM minimal : les faits passent, le même mot
// hors de leurs éléments rougit, un élément exempté qui porterait autre chose
// que le texte brut (enfant, classe, style) rougit.
import { expect, test } from '@playwright/test';
import { assertSentinelleBiologie } from './helpers/sentinelle';

function region(corps: string): string {
  return `<section aria-label="Région">${corps}</section>`;
}

test.describe('Sentinelle biologie — faits imprimés par le laboratoire', () => {
  test('la marque imprimée est exemptée, et rendue intacte après la lecture', async ({ page }) => {
    await page.setContent(region(
      '<p>Ferritine 48 µg/L. Imprimé par le laboratoire : marque <span data-fait-laboratoire="marquage">Anormal</span></p>',
    ));
    const r = page.getByRole('region', { name: 'Région' });
    await assertSentinelleBiologie(r);
    await expect(r.locator('[data-fait-laboratoire="marquage"]')).toHaveText('Anormal');
  });

  test('l’intervalle imprimé est exempté, et rendu intact après la lecture', async ({ page }) => {
    await page.setContent(region(
      '<p>CRP 4 mg/L. Imprimé par le laboratoire : intervalle <span data-fait-laboratoire="intervalle">anormal au-delà de la borne, risque élevé</span></p>',
    ));
    const r = page.getByRole('region', { name: 'Région' });
    await assertSentinelleBiologie(r);
    await expect(r.locator('[data-fait-laboratoire="intervalle"]')).toHaveText('anormal au-delà de la borne, risque élevé');
  });

  test('un autre marqueur de fait n’est pas exempté', async ({ page }) => {
    await page.setContent(region(
      '<p>Imprimé par le laboratoire : <span data-fait-laboratoire="commentaire">Anormal</span></p>',
    ));
    await expect(assertSentinelleBiologie(page.getByRole('region', { name: 'Région' }))).rejects.toThrow(/anormal/);
  });

  test('le même mot HORS de l’élément exempté rougit', async ({ page }) => {
    await page.setContent(region(
      '<p>Valeur anormale. Marque <span data-fait-laboratoire="marquage">a</span></p>',
    ));
    await expect(assertSentinelleBiologie(page.getByRole('region', { name: 'Région' }))).rejects.toThrow();
  });

  // Chaque forme seule, pour qu'aucune ne passe à l'abri d'une autre.
  for (const [cas, marque] of [
    ['un enfant', '<span data-fait-laboratoire="marquage"><b>H</b></span>'],
    ['une classe', '<span data-fait-laboratoire="marquage" class="font-bold">L</span>'],
    ['un style', '<span data-fait-laboratoire="marquage" style="color:red;font-weight:bold">H</span>'],
    ['un enfant (intervalle)', '<span data-fait-laboratoire="intervalle"><b>30 – 400</b></span>'],
    ['une classe (intervalle)', '<span data-fait-laboratoire="intervalle" class="font-bold">30 – 400</span>'],
    ['un style (intervalle)', '<span data-fait-laboratoire="intervalle" style="color:red">30 – 400</span>'],
  ] as const) {
    test(`un élément exempté qui porte ${cas} rougit`, async ({ page }) => {
      await page.setContent(region(`<p>Marque ${marque}</p>`));
      await expect(assertSentinelleBiologie(page.getByRole('region', { name: 'Région' }))).rejects.toThrow();
    });
  }
});
