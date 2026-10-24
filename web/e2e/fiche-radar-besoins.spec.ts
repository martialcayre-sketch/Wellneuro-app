// Radar des douze besoins (onglet « Les 12 besoins » de la fiche) : un besoin
// non mesuré est un trou nommé « non mesuré », jamais un zéro ([[D-301]],
// lettre ac, critère de fin de J2-radar : « non mesuré » constaté à l'écran).
//
// La réponse de `/api/praticien/besoins` est FIXÉE ici : deux besoins sans
// couverture sur douze. Le banc juge le rendu, pas le calcul des couvertures,
// qui ne change pas. Patient fictif Sophie Nicola (PAT_SEED_01).
import { test, expect } from '@playwright/test';
import { praticienSessionCookie } from './helpers/auth';

const PATIENT_ID = 'PAT_SEED_01';
const NON_MESURES = new Set([2, 6]);

const besoins = Array.from({ length: 12 }, (_, i) => {
  const id = i + 1;
  const mesure = !NON_MESURES.has(id);
  return {
    id,
    libellePraticien: `Besoin ${id}`,
    strate: 'CORPS',
    couverture: mesure ? 40 + id : null,
    niveauPreuve: mesure ? 'B' : 'NON_MESURE',
    sources: [],
    // r3_08 : le motif du non mesuré, servi par la route.
    motifNonMesure: mesure
      ? null
      : [{ motif: id === 2 ? 'hors_score' : 'sans_instrument', idsQuestionnaire: [], dateDernierePassation: null }],
  };
});

test.describe('Radar des besoins — un besoin non mesuré n’est pas un zéro (D-301)', () => {
  test('l’axe non mesuré est nommé et ne porte aucun point', async ({ page, context }) => {
    await context.addCookies([await praticienSessionCookie()]);
    await page.route('**/api/praticien/besoins?**', route => route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ patient: { idPatient: PATIENT_ID, prenom: 'Sophie', nom: 'Nicola' }, besoins }),
    }));
    await page.goto(`/dashboard/patients/${PATIENT_ID}?onglet=besoins`);

    const panneau = page.locator('#panneau-besoins');
    const axes = panneau.locator('.recharts-polar-angle-axis');
    await expect(axes.locator('tspan', { hasText: 'non mesuré' })).toHaveCount(2);
    // Un point par besoin MESURÉ, aucun pour les deux autres.
    await expect(panneau.locator('.recharts-radar-dots circle')).toHaveCount(10);
    // Le tableau voisin dit toujours « — » pour les deux mêmes besoins
    // ([[D-301]] §1) ; le motif se déplie dessous (r3_08).
    await expect(panneau.getByRole('cell', { name: /^—/ })).toHaveCount(2);

    // Un geste, au clavier : le motif est replié, Entrée le déplie.
    const motif = panneau.getByRole('group').filter({ has: page.locator('summary', { hasText: 'Motif' }) }).first();
    const geste = panneau.locator('summary', { hasText: 'Motif' }).first();
    await expect(panneau.getByText('Non mesuré · hors score (D-122)')).toBeHidden();
    await geste.focus();
    await page.keyboard.press('Enter');
    await expect(panneau.getByText('Non mesuré · hors score (D-122)')).toBeVisible();
    void motif;
  });
});
