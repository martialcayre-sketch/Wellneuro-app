// Bibliothèque — la page entière ne défile pas en largeur.
//
// Le rayon « Assignations et packs » faisait défiler toute la page sur iPhone :
// la ligne « Vue catégories » du formulaire de création d'un pack posait deux
// sélecteurs et leurs libellés sur une seule ligne, sans retour. L'E2E du rayon
// Fiches conseils (lot 6b de D-251) l'a constaté, et a dû borner sa propre
// vérification à sa zone. Ce banc tient la page entière.
//
// Tourne sur les deux projets ; sur Desktop il est trivialement vert, c'est
// iPhone 13 qui le rend utile.
import { test, expect } from '@playwright/test';
import { PRATICIEN_EMAIL, praticienSessionCookie } from './helpers/auth';

test.describe('Bibliothèque — aucun défilement horizontal de la page', () => {
  test('la page, rayon par défaut, tient dans la largeur de l’écran', async ({ page }) => {
    await page.context().addCookies([await praticienSessionCookie(PRATICIEN_EMAIL)]);
    await page.goto('/dashboard/bibliotheque');
    await expect(page.getByRole('heading', { name: 'Bibliothèque', exact: true })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'Nouveau pack de questionnaires' })).toBeVisible({ timeout: 10000 });

    // Sur échec, les éléments fautifs sont nommés (balise et classes). Un
    // élément dans un conteneur à défilement horizontal VOULU (le tableau des
    // assignations, `overflow-x-auto`) n'est pas un débordement de la page.
    const debordants = await page.evaluate(() => {
      const largeur = document.documentElement.clientWidth;
      if (document.documentElement.scrollWidth <= largeur) return [];
      const dansUnDefilement = (e: Element) => {
        for (let p = e.parentElement; p; p = p.parentElement) {
          const x = getComputedStyle(p).overflowX;
          if (x === 'auto' || x === 'scroll' || x === 'hidden') return true;
        }
        return false;
      };
      return [...document.querySelectorAll('body *')]
        .filter(e => e.getBoundingClientRect().right > largeur + 1 && !dansUnDefilement(e))
        .slice(0, 8)
        .map(e => `${e.tagName.toLowerCase()}[${String(e.getAttribute('class') ?? '').slice(0, 120)}]`);
    });
    expect(debordants, `Débordement horizontal : ${debordants.join(' | ')}`).toEqual([]);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
    ).toBe(true);
  });
});
