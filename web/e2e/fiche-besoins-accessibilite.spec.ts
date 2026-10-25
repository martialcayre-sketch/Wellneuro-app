// Banc d'accessibilité des instruments des 12 besoins (r3_14, audit F59 Q12,
// choix B) : axe-core (WCAG 2.1 A et AA) passe sur l'onglet « Les 12 besoins »
// et sur son tiroir du poste de pilotage, motifs repliés puis dépliés. Zéro
// violation exigée ; aucune règle désactivée — même patron que
// `portail-transmission-compte-rendu.spec.ts`.
//
// La portée est bornée aux instruments (le panneau de l'onglet, le tiroir
// ouvert) : un défaut ailleurs dans la fiche ne rougit pas ce banc. Le banc
// vise le panneau par son id et le tiroir par son rôle, jamais leur structure
// interne : la réorganisation de l'onglet (J3-12b) ne le casse pas, il la garde.
//
// Les réponses de `/api/praticien/besoins` et `/equilibre` sont FIXÉES ici :
// mesurés, non mesurés avec motif (r3_08), un écart avec la décision (r3_10).
// Le banc juge le rendu, pas les calculs. Patient fictif Sophie Nicola
// (PAT_SEED_01), en lecture seule.
import { test, expect, type Locator, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { praticienSessionCookie } from './helpers/auth';

const PATIENT_ID = 'PAT_SEED_01';
const PATIENT = { idPatient: PATIENT_ID, prenom: 'Sophie', nom: 'Nicola' };
const DATE = '2026-10-01T10:00:00.000Z';
const NON_MESURES = new Set([2, 6]);
const ECART = 8;

const strate = (id: number) => (id <= 6 ? 'CORPS' : id <= 9 ? 'ANCRAGE' : 'ESPRIT');
const motif = (id: number) =>
  NON_MESURES.has(id)
    ? [{ motif: id === 2 ? 'hors_score' : 'sans_instrument', idsQuestionnaire: [], dateDernierePassation: null }]
    : null;
const ecart = (id: number) => (id === ECART ? [{ idQuestionnaire: 'Q_NEU_11', dateDernierePassation: DATE }] : null);

const BESOINS = {
  patient: PATIENT,
  besoins: Array.from({ length: 12 }, (_, i) => {
    const id = i + 1;
    const mesure = !NON_MESURES.has(id);
    return {
      id,
      libellePraticien: `Besoin ${id}`,
      strate: strate(id),
      couverture: mesure ? 40 + id : null,
      niveauPreuve: mesure ? 'B' : 'NON_MESURE',
      sources: mesure ? [{ idQuestionnaire: 'Q_NEU_11', titre: 'Questionnaire de fixture' }] : [],
      motifNonMesure: motif(id),
      ecartDecision: ecart(id),
    };
  }),
  besoinsMesures: 10,
  besoinsTotal: 12,
};

const EQUILIBRE = {
  patient: PATIENT,
  objetsCliniques: {
    indiceGlobal: null,
    besoinsMesures: 10,
    besoinsTotal: 12,
    stabiliteMetabolique: null,
    stabiliteMetaboliqueSources: [],
    reserveAdaptation: null,
    clarte: null,
    momentum: null,
    plafondApplique: false,
    versionCalcul: 'v15',
    provenance: { indiceGlobal: null, stabiliteMetabolique: null, reserveAdaptation: null, clarte: null, momentum: null },
  },
  priorites: BESOINS.besoins.map(b => ({
    besoin: b.id,
    libellePraticien: b.libellePraticien,
    strate: b.strate,
    couverture: b.couverture,
    niveauPreuve: b.niveauPreuve,
    motifNonMesure: b.motifNonMesure,
    ecartDecision: b.ecartDecision,
    provenance: b.couverture === null ? null : { sources: [{ idQuestionnaire: 'Q_NEU_11', dateReponse: DATE }], versionCalcul: 'v15' },
    carteLiee: null,
  })),
};

async function ouvrirFiche(page: Page, onglet?: string) {
  await page.route('**/api/praticien/besoins?**', route =>
    route.fulfill({ contentType: 'application/json', body: JSON.stringify(BESOINS) }));
  await page.route('**/api/praticien/equilibre?**', route =>
    route.fulfill({ contentType: 'application/json', body: JSON.stringify(EQUILIBRE) }));
  await page.goto(`/dashboard/patients/${PATIENT_ID}${onglet ? `?onglet=${onglet}` : ''}`);
}

/** Déplie au clavier chaque repli (`summary`) de la zone : motifs et écart. */
async function deplierTout(page: Page, zone: Locator) {
  const replis = zone.locator('details:not([open]) > summary');
  for (let i = 0; i < 30 && (await replis.count()); i++) {
    await replis.first().focus();
    await page.keyboard.press('Enter');
  }
  await expect(replis, 'un repli ne s’ouvre pas au clavier').toHaveCount(0);
}

/** Attend la fin des transitions de la zone : axe ne juge pas un contraste en cours d'animation. */
async function animationsFinies(zone: Locator) {
  await zone.evaluate(el => Promise.all(el.getAnimations({ subtree: true }).map(a => a.finished)));
}

async function sansViolationAxe(page: Page, portee: string, etat: string) {
  const { violations } = await new AxeBuilder({ page })
    .include(portee)
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(
    violations.map(v => `${v.id} (${v.impact}) : ${v.nodes.map(n => n.target.join(' ')).join(' | ')}`),
    `violations axe — ${etat}`,
  ).toEqual([]);
}

test.describe('Instruments des 12 besoins — aucune violation axe (r3_14, Q12)', () => {
  test.beforeEach(async ({ context }) => {
    await context.addCookies([await praticienSessionCookie()]);
  });

  test('onglet « Les 12 besoins » : radar et tableau, motifs repliés puis dépliés', async ({ page }) => {
    await ouvrirFiche(page, 'besoins');
    const panneau = page.locator('#panneau-besoins');
    // Le rendu des réponses fixées est là avant de juger (ni chargement ni
    // erreur) : le motif d'un non mesuré et l'écart d'un mesuré.
    await expect(panneau.locator('summary', { hasText: 'Motif' }).first()).toBeVisible();
    await expect(panneau.locator('summary', { hasText: 'Écart avec la décision' }).first()).toBeVisible();
    await animationsFinies(panneau);
    await sansViolationAxe(page, '#panneau-besoins', 'onglet, replis fermés');

    await deplierTout(page, panneau);
    await expect(panneau.getByText('Non mesuré · hors score (D-122)').first()).toBeVisible();
    await animationsFinies(panneau);
    await sansViolationAxe(page, '#panneau-besoins', 'onglet, replis ouverts');
  });

  test('tiroir « Les 12 besoins » du poste de pilotage : ouvert et fermé au clavier', async ({ page }) => {
    await ouvrirFiche(page);
    const bouton = page.getByRole('button', { name: /Les 12 besoins/ }).first();
    await bouton.focus();
    await page.keyboard.press('Enter');
    const tiroir = page.getByRole('dialog', { name: 'Les 12 besoins' });
    await expect(tiroir).toBeVisible();
    await expect(tiroir.locator('summary', { hasText: 'Écart avec la décision' }).first()).toBeVisible();
    await animationsFinies(tiroir);
    await sansViolationAxe(page, '[role="dialog"]', 'tiroir, replis fermés');

    await deplierTout(page, tiroir);
    await animationsFinies(tiroir);
    await sansViolationAxe(page, '[role="dialog"]', 'tiroir, replis ouverts');

    // Échap ferme, et le focus revient sur le bouton qui a ouvert.
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(bouton).toBeFocused();
  });
});
