// La sentinelle biologie exempte la marque imprimée par le laboratoire, et
// elle seule ([[D-267]] §6). Ce spec exerce le VRAI helper sur un DOM minimal :
// la marque passe, le même mot hors de l'élément rougit, un élément exempté
// qui porterait autre chose que le texte brut (enfant, classe, style) rougit.
import { expect, test } from '@playwright/test';
import { assertSentinelleBiologie } from './helpers/sentinelle';

function region(corps: string): string {
  return `<section aria-label="Région">${corps}</section>`;
}

test.describe('Sentinelle biologie — marque imprimée par le laboratoire', () => {
  test('la marque imprimée est exemptée, et rendue intacte après la lecture', async ({ page }) => {
    await page.setContent(region(
      '<p>Ferritine 48 µg/L. Imprimé par le laboratoire : marque <span data-fait-laboratoire="marquage">Anormal</span></p>',
    ));
    const r = page.getByRole('region', { name: 'Région' });
    await assertSentinelleBiologie(r);
    await expect(r.locator('[data-fait-laboratoire="marquage"]')).toHaveText('Anormal');
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
  ] as const) {
    test(`un élément exempté qui porte ${cas} rougit`, async ({ page }) => {
      await page.setContent(region(`<p>Marque ${marque}</p>`));
      await expect(assertSentinelleBiologie(page.getByRole('region', { name: 'Région' }))).rejects.toThrow();
    });
  }
});
