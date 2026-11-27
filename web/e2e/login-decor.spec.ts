// Décor de la connexion praticien (lot PRA-2 décor ; [[D-481]] §1 bis, Q8 a ;
// prototype validé le 2026-11-26, variante B, calage portrait par COM-3).
// Réception du lot, au bureau (Chromium, paysage) et au téléphone (WebKit,
// iPhone 13, portrait) :
//   - le fond `connexion-praticien` est posé une fois, hors de l'accessibilité,
//     sans pointeur, sous le contenu ;
//   - le bouton de connexion n'est pas posé à même le fond : la carte, opaque,
//     est entre lui et le décor ;
//   - la couche visible est calée au centre en paysage, en haut à droite en
//     portrait ;
//   - le cadre n'élargit jamais la page ;
//   - le fond est absent à l'impression.
// Les règles du décor lui-même sont épinglées en Vitest
// (`components/ui/LienDecor.test.tsx`), la pose aussi (`app/login/page.test.tsx`).
// Aucune session : la page se lit déconnectée, aucun dossier n'est touché.
import { test, expect } from '@playwright/test';

const DECOR = '[data-lien-decor="connexion-praticien"]';

test.describe('Connexion praticien — décor (PRA-2)', () => {
  test('fond posé en périphérie, sous une carte opaque, absent à l’impression', async ({ page }) => {
    await page.goto('/login');
    const bouton = page.getByRole('button', { name: 'Se connecter avec Google Workspace' });
    await expect(bouton).toBeVisible();

    const fond = page.locator(DECOR);
    await expect(fond).toHaveCount(1);
    await expect(fond).toHaveAttribute('aria-hidden', 'true');

    const constat = await page.evaluate((sel) => {
      const decor = document.querySelector(sel) as HTMLElement;
      const cadre = decor.parentElement as HTMLElement;
      const opaque = (el: Element) => {
        const m = getComputedStyle(el).backgroundColor.match(/rgba?\(([^)]+)\)/);
        if (!m) return false;
        const parts = m[1].split(',').map((x) => x.trim());
        return parts.length === 3 || Number(parts[3]) === 1;
      };
      const btn = Array.from(document.querySelectorAll('main button')).find((b) =>
        b.textContent?.includes('Google'),
      ) as HTMLElement;
      let carteOpaque = false;
      for (let el = btn.parentElement; el && el !== cadre; el = el.parentElement) {
        if (opaque(el)) {
          carteOpaque = true;
          break;
        }
      }
      const visibles = Array.from(decor.children).filter(
        (c) => getComputedStyle(c).display !== 'none',
      ) as HTMLElement[];
      return {
        carteOpaque,
        pointeur: getComputedStyle(decor).pointerEvents,
        zIndex: getComputedStyle(decor).zIndex,
        isolation: getComputedStyle(cadre).isolation,
        couchesVisibles: visibles.length,
        // WebKit sérialise le zéro en `0px`, Chromium en `0%` : même calage.
        position: visibles[0]
          ? getComputedStyle(visibles[0]).backgroundPosition.replace(/(^|\s)0px(?=\s|$)/g, '$10%')
          : null,
        portrait: window.matchMedia('(orientation: portrait)').matches,
        debordement: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    }, DECOR);

    expect(constat.carteOpaque, 'bouton posé à même le fond').toBe(true);
    expect(constat.pointeur).toBe('none');
    expect(constat.zIndex).toBe('-10');
    expect(constat.isolation).toBe('isolate');
    expect(constat.couchesVisibles).toBe(1);
    expect(constat.position).toBe(constat.portrait ? '100% 0%' : '50% 50%');
    expect(constat.debordement, 'défilement horizontal').toBeLessThanOrEqual(0);

    await page.emulateMedia({ media: 'print' });
    await expect(fond).toBeHidden();
    await page.emulateMedia({ media: 'screen' });
    await expect(fond).toBeAttached();
  });
});
