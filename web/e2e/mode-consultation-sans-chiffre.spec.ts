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

// La vignette du constat du praticien ([[D-551]], [[D-553]] §5) : le drapeau
// `WN_CONSTAT_BESOIN` est forcé allumé pour ce banc seulement (`playwright.config.ts`).
// Le besoin 2 est « non mesuré » dans ces fixtures ; son verdict est la SENTINELLE.
const VERDICT_SENTINELLE = 'à soutenir';
const LIGNE_VIGNETTE = `constat du praticien : ${VERDICT_SENTINELLE}`;
const VIGNETTES_SENTINELLE = { ok: true, vignettes: { 2: { verdict: 'a_soutenir', aRelire: false } } };
const VIGNETTES_AUCUNE = { ok: true, vignettes: {} };
// Le panneau du constat (D-347), sous le tableau de l'onglet « Les 12 besoins » : il dit le
// verdict et la note, un état que seul le praticien lit — remplacé par la mention en consultation.
const NOTE_SENTINELLE = 'Note sentinelle du constat';
const CONSTATS_SENTINELLE = {
  ok: true,
  offerts: [{ besoin: 2, libelle: 'Besoin 2', avecScore: false }],
  aujourdhui: '2026-11-25',
  besoins: [{
    besoin: 2,
    tete: {
      id: 'c1', acte: 'pose', besoin: 2, verdict: 'a_soutenir', motif: null, note: NOTE_SENTINELLE, aRevoirLe: null,
      praticienEmail: 'praticien@wellneuro.fr', acteLe: '2026-11-20T09:00:00.000Z', pieces: [],
    },
    aRelire: [],
    historique: [],
  }],
  citables: [],
};

async function ouvrirFiche(page: Page, onglet?: string, vignettes: unknown = VIGNETTES_AUCUNE, constats: unknown = null) {
  if (constats !== null) {
    await page.route('**/api/praticien/besoins/constats?**', route =>
      route.fulfill({ contentType: 'application/json', body: JSON.stringify(constats) }));
  }
  await page.route('**/api/praticien/besoins/vignettes?**', route =>
    route.fulfill({ contentType: 'application/json', body: JSON.stringify(vignettes) }));
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
    // Sept onglets depuis « Évolution » (OF-2), masqué lui aussi (D-560 §2).
    await expect(onglets.getByRole('tab')).toHaveCount(7);
    await activer(page);
    await expect(onglets.getByRole('tab')).toHaveText(['Poste de pilotage', 'Les 12 besoins']);
    await expect(onglets.getByRole('tab', { name: 'Poste de pilotage' })).toHaveAttribute('aria-selected', 'true');
    // Sans retour mémorisé (§8).
    await quitter(page);
    await expect(onglets.getByRole('tab')).toHaveCount(7);
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
    // Trois mentions des besoins, plus celle qui remplace le panneau du constat (drapeau forcé allumé).
    await expect(panneau.getByText(MENTION)).toHaveCount(4);
    expect(await panneau.innerText()).not.toMatch(/\d+\s*%/);
    await expect(panneau.locator('.recharts-radar')).toHaveCount(0);
    // La structure reste (§3) : les douze axes, et les non mesurés nommés.
    await expect(panneau.locator('.recharts-polar-angle-axis tspan', { hasText: 'non mesuré' })).toHaveCount(10);
  });

  // D-553 §5 : contrôle positif hors du mode, puis absence du verdict dans le mode,
  // dans chacun des deux emplacements (l'onglet et le tiroir), au clic et au clavier.
  test('vignette du constat, onglet « Les 12 besoins » : le verdict hors du mode, la mention dans le mode', async ({ page }) => {
    await ouvrirFiche(page, 'besoins', VIGNETTES_SENTINELLE, CONSTATS_SENTINELLE);
    const panneau = page.locator('#panneau-besoins');
    await expect(panneau).toContainText(LIGNE_VIGNETTE);
    // Contrôle positif du panneau du constat : sa note est à l'écran hors du mode.
    await expect(panneau).toContainText(NOTE_SENTINELLE);
    // Le besoin reste « non mesuré » : la vignette ne le remplace pas.
    await expect(panneau.locator('tr', { hasText: 'Besoin 2' })).toContainText('non mesuré');

    await activer(page);
    await expect(panneau.locator('[data-vignette-constat-besoin="2"]')).toHaveText(MENTION);
    const texte = await panneau.innerText();
    expect(texte).not.toContain(VERDICT_SENTINELLE);
    expect(texte).not.toContain('constat du praticien');
    // Le panneau du constat ne dit plus ni sa note, ni son verdict, ni l'e-mail du praticien.
    expect(texte).not.toContain(NOTE_SENTINELLE);
    expect(texte).not.toContain('praticien@wellneuro.fr');
    // Et sortir du mode rend le verdict.
    await quitter(page);
    await expect(panneau).toContainText(LIGNE_VIGNETTE);
  });

  test('vignette du constat, tiroir des 12 besoins : le verdict hors du mode, la mention dans le mode', async ({ page }) => {
    await ouvrirFiche(page, undefined, VIGNETTES_SENTINELLE);
    let panneau = await tiroir(page, /Les 12 besoins/);
    await expect(panneau).toContainText(LIGNE_VIGNETTE);
    await fermer(page);

    await activer(page);
    panneau = await tiroir(page, /Les 12 besoins/);
    await expect(panneau.locator('[data-vignette-constat-besoin="2"]')).toHaveText(MENTION);
    const texte = await panneau.innerText();
    expect(texte).not.toContain(VERDICT_SENTINELLE);
    expect(texte).not.toContain('constat du praticien');
  });

  test('vignette du constat, au clavier : activer le mode par Entrée masque le verdict de l’onglet', async ({ page }) => {
    await ouvrirFiche(page, 'besoins', VIGNETTES_SENTINELLE);
    const panneau = page.locator('#panneau-besoins');
    await expect(panneau).toContainText(LIGNE_VIGNETTE);
    await page.getByRole('button', { name: 'Mode consultation' }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: 'Quitter' })).toBeVisible();
    await expect(panneau.locator('[data-vignette-constat-besoin="2"]')).toHaveText(MENTION);
    expect(await panneau.innerText()).not.toContain(VERDICT_SENTINELLE);
    expect(await panneau.innerText()).not.toContain(NOTE_SENTINELLE);
  });

  test('vignette du constat, au clavier : le mode activé par Entrée, le tiroir ouvert par Entrée, la mention à la place du verdict', async ({ page }) => {
    await ouvrirFiche(page, undefined, VIGNETTES_SENTINELLE);
    await page.getByRole('button', { name: 'Mode consultation' }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: 'Quitter' })).toBeVisible();
    await page.getByRole('button', { name: /Les 12 besoins/ }).first().focus();
    await page.keyboard.press('Enter');
    const panneau = page.getByRole('dialog');
    await expect(panneau).toBeVisible();
    await expect(panneau.locator('[data-vignette-constat-besoin="2"]')).toHaveText(MENTION);
    expect(await panneau.innerText()).not.toContain(VERDICT_SENTINELLE);
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
