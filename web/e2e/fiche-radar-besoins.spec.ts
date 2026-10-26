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
// r3_09 : un besoin mesuré servi SANS provenance n'est pas tracé ([[D-333]]
// §2 règle 1), et son axe ne se dit pas « non mesuré ».
const SANS_PROVENANCE = 12;

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
    provenance:
      mesure && id !== SANS_PROVENANCE
        ? { sources: [{ idQuestionnaire: 'Q_TEST', dateReponse: '2026-10-01T10:00:00.000Z' }], versionCalcul: 'v15' }
        : null,
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
    await expect(axes.locator('tspan', { hasText: 'source non enregistrée' })).toHaveCount(1);
    // Un point par besoin mesuré À PROVENANCE ÉTABLIE, aucun pour les trois autres.
    await expect(panneau.locator('.recharts-radar-dots circle')).toHaveCount(9);
    // La figure ouvre la provenance de ses valeurs tracées (r3_09).
    await expect(panneau.getByLabel('Source — radar des 12 besoins')).toBeVisible();
    // Le tableau voisin dit toujours « — » pour les deux mêmes besoins
    // ([[D-301]] §1) ; le motif se déplie dessous (r3_08).
    await expect(panneau.getByRole('cell', { name: /^—/ })).toHaveCount(2);

    // Un geste, au clavier : le motif est replié, Entrée le déplie.
    const geste = panneau.locator('summary', { hasText: 'Motif' }).first();
    await expect(panneau.getByText('Non mesuré · hors score (D-122)')).toBeHidden();
    await geste.focus();
    await page.keyboard.press('Enter');
    await expect(panneau.getByText('Non mesuré · hors score (D-122)')).toBeVisible();
  });
});
