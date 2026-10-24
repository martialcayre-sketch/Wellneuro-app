// Mode consultation sans chiffre ([[D-354]], t43) : l'écran partagé avec le
// patient tombe sous la règle du portail. Chaque banc prouve d'abord que la
// valeur SENTINELLE est à l'écran hors du mode — sinon son absence ne
// prouverait rien —, puis qu'elle n'y est plus dans le mode, remplacée par
// « masqué en mode consultation ».
//
// Les réponses de `/api/praticien/equilibre`, `/besoins` et `/reponses` sont
// FIXÉES ici, avec des valeurs que rien d'autre à l'écran ne porte. Le banc
// juge le rendu, pas les calculs, qui ne changent pas. Lecture seule côté
// dossier. Patient fictif Sophie Nicola (PAT_SEED_01).
//
// Non couverts ici, faute d'un dossier de seed qui les produise (épisode
// confirmé, résultats biologiques, deux cycles) : la plainte « x/10 » de la
// phase Décision, le motif du moteur, les valeurs des portes biologiques, la
// tendance J21 et le chip « Au tour précédent ». Ils sont gardés par les bancs
// unitaires des composants.
import { test, expect, type Page } from '@playwright/test';
import { praticienSessionCookie } from './helpers/auth';

const PATIENT_ID = 'PAT_SEED_01';
const MENTION = 'masqué en mode consultation';
const EMAIL = 'sophie.nicola@fictif.wellneuro.fr';
const DATE = '2026-10-01T10:00:00.000Z';
const provenance = (idQuestionnaire: string) => ({ sources: [{ idQuestionnaire, dateReponse: DATE }], versionCalcul: 'v15' });

// Valeurs sentinelles : à deux chiffres, distinctes deux à deux.
const COUVERTURES = { 1: 47, 4: 53 } as const;
const INDICE = 71;
const RESERVE = 64;
const CLARTE = 58;
const MOMENTUM = 9;
const SCORE = 37;
const INTERPRETATION = 'Interprétation sentinelle';

const priorites = Array.from({ length: 12 }, (_, i) => {
  const besoin = i + 1;
  const couverture = (COUVERTURES as Record<number, number>)[besoin] ?? null;
  return {
    besoin,
    libellePraticien: `Besoin ${besoin}`,
    strate: besoin <= 6 ? 'CORPS' : besoin <= 9 ? 'ANCRAGE' : 'ESPRIT',
    couverture,
    niveauPreuve: couverture === null ? 'NON_MESURE' : 'B',
    motifNonMesure: couverture === null ? [{ motif: 'sans_instrument', idsQuestionnaire: [], dateDernierePassation: null }] : null,
    provenance: couverture === null ? null : provenance('Q_STR_01'),
    carteLiee: null,
  };
});

const EQUILIBRE = {
  patient: { idPatient: PATIENT_ID, prenom: 'Sophie', nom: 'Nicola', email: EMAIL },
  objetsCliniques: {
    indiceGlobal: INDICE,
    besoinsMesures: 2,
    besoinsTotal: 12,
    stabiliteMetabolique: null,
    stabiliteMetaboliqueSources: [],
    reserveAdaptation: RESERVE,
    clarte: CLARTE,
    momentum: { delta: MOMENTUM, tendance: 'hausse' },
    plafondApplique: false,
    versionCalcul: 'v15',
    provenance: {
      indiceGlobal: provenance('Q_NEU_11'),
      stabiliteMetabolique: null,
      reserveAdaptation: provenance('Q_STR_02'),
      clarte: provenance('Q_NEU_11'),
      momentum: {
        depart: { jalon: 'T0', date: '2026-08-01T00:00:00.000Z' },
        arrivee: { jalon: 'J21', date: '2026-08-22T00:00:00.000Z' },
        versionCalcul: 'v15',
      },
    },
  },
  priorites,
};

const BESOINS = {
  patient: EQUILIBRE.patient,
  besoins: priorites.map(p => ({ ...p, id: p.besoin, sources: [] })),
  besoinsMesures: 2,
  besoinsTotal: 12,
};

const REPONSES = {
  reponses: [
    {
      idReponse: 'REP_SENTINELLE',
      idAssignation: 'ASG_SENTINELLE',
      idQuestionnaire: 'Q_SOM_01',
      titre: 'Questionnaire sentinelle',
      dateSoumission: DATE,
      scorePrincipal: SCORE,
      interpretation: INTERPRETATION,
      scoresParsed: null,
      subScoreRanges: null,
    },
  ],
};

async function ouvrirFiche(page: Page, onglet?: string) {
  await page.route('**/api/praticien/equilibre?**', route =>
    route.fulfill({ contentType: 'application/json', body: JSON.stringify(EQUILIBRE) }));
  await page.route('**/api/praticien/besoins?**', route =>
    route.fulfill({ contentType: 'application/json', body: JSON.stringify(BESOINS) }));
  await page.route('**/api/praticien/reponses?**', route =>
    route.fulfill({ contentType: 'application/json', body: JSON.stringify(REPONSES) }));
  await page.goto(`/dashboard/patients/${PATIENT_ID}${onglet ? `?onglet=${onglet}` : ''}`);
}

const activer = (page: Page) => page.getByRole('button', { name: 'Mode consultation' }).click();
const quitter = (page: Page) => page.getByRole('button', { name: 'Quitter' }).click();

/** Ouvre un instrument à tiroir, rend son panneau, le referme au retour. */
async function tiroir(page: Page, libelle: RegExp) {
  await page.getByRole('button', { name: libelle }).first().click();
  const panneau = page.getByRole('dialog');
  await expect(panneau).toBeVisible();
  return panneau;
}
async function fermer(page: Page) {
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
}

/** Le texte VISIBLE (innerText) : ce qu'un patient lit sur l'écran tourné vers lui. */
const visible = (page: Page, selecteur = 'main') => page.locator(selecteur).first().innerText();

test.describe('Mode consultation — aucun chiffre à l’écran partagé (D-354)', () => {
  test.beforeEach(async ({ context }) => {
    await context.addCookies([await praticienSessionCookie()]);
  });

  test('onglets : seuls le cockpit et les 12 besoins restent ; activé depuis un onglet masqué, ramène au cockpit', async ({ page }) => {
    await ouvrirFiche(page, 'trajectoire');
    const onglets = page.getByRole('tablist', { name: 'Vues de la fiche patient' });
    await expect(onglets.getByRole('tab')).toHaveCount(6);
    await activer(page);
    await expect(onglets.getByRole('tab')).toHaveText(['Poste de pilotage', 'Les 12 besoins']);
    await expect(onglets.getByRole('tab', { name: 'Poste de pilotage' })).toHaveAttribute('aria-selected', 'true');
    // Sans retour mémorisé (§8).
    await quitter(page);
    await expect(onglets.getByRole('tab')).toHaveCount(6);
    await expect(onglets.getByRole('tab', { name: 'Poste de pilotage' })).toHaveAttribute('aria-selected', 'true');
  });

  test('tiroir des 12 besoins : le pourcentage, puis la mention', async ({ page }) => {
    await ouvrirFiche(page);
    let panneau = await tiroir(page, /Les 12 besoins/);
    await expect(panneau).toContainText(`${COUVERTURES[1]}%`);
    await fermer(page);

    await activer(page);
    panneau = await tiroir(page, /Les 12 besoins/);
    const texte = await panneau.innerText();
    expect(texte).not.toMatch(/\d+\s*%/);
    await expect(panneau.getByText(MENTION)).toHaveCount(2);
    await expect(panneau.getByRole('img', { name: /Couverture/ })).toHaveCount(0);
  });

  test('objets cliniques : indice global, repères et momentum, puis la mention', async ({ page }) => {
    await ouvrirFiche(page);
    let panneau = await tiroir(page, /Objets cliniques & momentum/);
    for (const valeur of [String(INDICE), String(RESERVE), String(CLARTE), `+${MOMENTUM}`]) {
      await expect(panneau).toContainText(valeur);
    }
    await fermer(page);

    await activer(page);
    panneau = await tiroir(page, /Objets cliniques & momentum/);
    const texte = await panneau.innerText();
    for (const valeur of [String(INDICE), String(RESERVE), String(CLARTE), String(MOMENTUM)]) {
      expect(texte).not.toContain(valeur);
    }
    expect(texte).not.toContain('hausse');
    // Indice global, réserve, clarté, momentum ; la stabilité reste « Non mesuré ».
    await expect(panneau.getByText(MENTION)).toHaveCount(4);
    await expect(panneau.getByText('Non mesuré')).toHaveCount(1);
  });

  test('détail des réponses : le score et son interprétation, puis la mention', async ({ page }) => {
    await ouvrirFiche(page);
    let panneau = await tiroir(page, /Détail des réponses/);
    await expect(panneau).toContainText(String(SCORE));
    await expect(panneau).toContainText(INTERPRETATION);
    await fermer(page);

    await activer(page);
    panneau = await tiroir(page, /Détail des réponses/);
    await expect(panneau).toContainText('Questionnaire sentinelle');
    const texte = await panneau.innerText();
    expect(texte).not.toContain(String(SCORE));
    expect(texte).not.toContain(INTERPRETATION);
    await expect(panneau.getByText(MENTION)).toHaveCount(2);
  });

  test('phase Compréhension : les cercles sans pourcentage ni intensité', async ({ page }) => {
    await ouvrirFiche(page);
    const rail = page.getByRole('tablist', { name: 'Cycle clinique' });
    await rail.getByRole('tab', { name: /Compréhension/ }).click();
    const liste = page.getByRole('list', { name: 'Les 12 besoins, en texte' });
    await expect(liste).toContainText(`${COUVERTURES[4]}%`);

    await activer(page);
    await rail.getByRole('tab', { name: /Compréhension/ }).click();
    expect(await liste.innerText()).not.toMatch(/\d+\s*%/);
    await expect(liste.getByText(MENTION)).toHaveCount(2);
    const opacites = await page.locator('[data-mesure="oui"] circle').evaluateAll(points =>
      points.map(p => p.getAttribute('fill-opacity')));
    expect(new Set(opacites).size).toBe(1);
  });

  test('onglet « Les 12 besoins » : ni pourcentage, ni contour du radar ; ses axes restent', async ({ page }) => {
    await ouvrirFiche(page, 'besoins');
    const panneau = page.locator('#panneau-besoins');
    await expect(panneau).toContainText(`${COUVERTURES[1]}%`);
    await expect(panneau.locator('.recharts-radar')).toHaveCount(1);

    await activer(page);
    await expect(page.getByRole('tab', { name: 'Les 12 besoins' })).toHaveAttribute('aria-selected', 'true');
    await expect(panneau.getByText(MENTION)).toHaveCount(3);
    expect(await panneau.innerText()).not.toMatch(/\d+\s*%/);
    await expect(panneau.locator('.recharts-radar')).toHaveCount(0);
    // La structure reste (§3) : les douze axes, et les non mesurés nommés.
    await expect(panneau.locator('.recharts-polar-angle-axis tspan', { hasText: 'non mesuré' })).toHaveCount(10);
  });

  test('balayage : aucun pourcentage visible sur l’écran partagé, sur chaque phase du cockpit', async ({ page }) => {
    await ouvrirFiche(page);
    await activer(page);
    const rail = page.getByRole('tablist', { name: 'Cycle clinique' });
    const phases = await rail.getByRole('tab').count();
    for (let i = 0; i < phases; i += 1) {
      await rail.getByRole('tab').nth(i).click();
      expect(await visible(page)).not.toMatch(/\d+\s*%/);
      for (const valeur of [INDICE, RESERVE, CLARTE, SCORE]) {
        expect(await visible(page)).not.toMatch(new RegExp(`(^|\\D)${valeur}(\\D|$)`));
      }
    }
  });
});
