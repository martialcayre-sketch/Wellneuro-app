// La saisie de résultats biologiques, de bout en bout (campagne « Biologie
// exploitée », LOT-03 §2) : deux mesures du même analyte à deux heures → série
// groupée ; doublon exact → refus 409 DIT à l'écran ; panne de lecture → « on
// ne peut pas affirmer qu'aucune mesure n'existe » (`DC-24`).
//
// LE DRAPEAU DE CET ÉTAGE N'EST PAS POSÉ EN PRODUCTION, et c'est la seule
// différence de nature avec les autres parcours du rayon. `WN_CB_ENABLED` et
// `WN_CB_PROPOSITION` ALIGNENT le banc sur la production ; `WN_CB_RESULTS_ENABLED`
// ouvre ici la seule position où cette surface existe. Un lecteur qui verrait ce
// spec vert n'en doit RIEN conclure sur l'état de l'étage 2 chez le praticien :
// la table `resultats_biologiques` compte 0 ligne en production
// (`one-off-7473`), et c'est voulu.
//
// Le drapeau est posé à DEUX endroits, jamais au niveau du runner :
// `webServer.env` (le serveur sous test) et la seule commande `npm run build`
// (le composant serveur du dossier le lit pour alimenter `CbFeatureProvider`).
// Posé au niveau du job, il déplacerait la position de toute la suite Vitest,
// qui s'exécute en position CB éteinte — dix bancs rougis, leçon du 2026-08-22.
//
// Patient fictif Sophie Nicola (PAT_SEED_01), déjà seedé : aucune fixture à
// provisionner, la surface vit dans l'onglet Trajectoire et ne demande ni
// épisode ni passation. Seules les mesures que le parcours consigne sont
// ramassées — bornées à l'instant du run, `saisi_le` étant posé par la base.
//
// Mode sériel : la première mesure consignée est ce que la deuxième groupe et
// ce que la troisième fait refuser en doublon. L'ordre EST le parcours.
import { test, expect, type Page } from '@playwright/test';
import { praticienSessionCookie } from './helpers/auth';
import { nettoyerResultatsBiologiques } from './helpers/db';

const PATIENT_ID = 'PAT_SEED_01';

/** Analyte du catalogue de niveau 1 (migration `20260817090000`) — actif. */
const ANALYTE_LIBELLE = 'Ferritine';
const ANALYTE_CODE = 'BIO_FERRITINE';
/** L'unité vient du CATALOGUE, jamais de la saisie : la vérifier le prouve. */
const ANALYTE_UNITE = 'ng/mL';
/** Second analyte du même catalogue de niveau 1, pour un bilan à deux lignes. */
const ZINC_LIBELLE = 'Zinc plasmatique';
const ZINC_CODE = 'BIO_ZINC_PLASMATIQUE';
const ZINC_UNITE = 'µmol/L';

/**
 * Deux prélèvements du MÊME JOUR, distingués par la seule heure — c'est le cas
 * qui a fondé la frontière de la PR #838 (cortisol salivaire matin/soir), et
 * la raison pour laquelle l'unicité porte l'horodatage et non la date.
 */
const MATIN = '2026-07-01T08:15';
const SOIR = '2026-07-01T18:45';
const VALEUR_MATIN = '51.2';
const VALEUR_SOIR = '47.8';
/** Le prélèvement du bilan à deux lignes — un autre jour, aucune collision. */
const BILAN = '2026-07-02T07:30';

let debutDuRun: Date;

test.describe.configure({ mode: 'serial' });

/** Le panneau « Estimé et mesuré » vit dans l'onglet Trajectoire du dossier. */
async function ouvrirPanneauMesures(page: Page) {
  await page.goto(`/dashboard/patients/${PATIENT_ID}?onglet=trajectoire`);
  const panneau = page.getByRole('region', { name: 'Estimé et mesuré' });
  await expect(panneau).toBeVisible();
  return panneau;
}

/**
 * Enregistre un bilan (date commune, N lignes) et rend la réponse du serveur.
 *
 * L'attente porte sur la RÉPONSE, pas sur un délai : sans elle, l'assertion
 * suivante courserait le rendu et le banc deviendrait intermittent — la classe
 * d'échec la plus coûteuse à diagnostiquer.
 */
async function enregistrerBilan(
  page: Page,
  panneau: ReturnType<Page['getByRole']>,
  bilan: { preleveLe: string; lignes: Array<{ code: string; valeur: string }> },
) {
  // LE FORMULAIRE EST ATTENDU AU REPOS AVANT D'ÊTRE REMPLI. Après un
  // enregistrement réussi, le composant enchaîne : réponse du POST, puis
  // `chargerResultats()` — un SECOND aller-retour —, puis `envoiEnCours`
  // relâché, et ENFIN les lignes remises à une seule ligne vide
  // (`SaisieBilan.tsx`). Commencer avant ce reset ferait effacer ce qu'on vient
  // de taper : le bouton resterait `disabled` et Playwright réessaierait 120 s
  // avant d'accuser la saisie d'un défaut qui n'est qu'un ordre d'arrivée
  // (observé en CI le 2026-09-07, #929, sur l'ancien formulaire unitaire).
  // Une ligne unique ET vide : c'est la DERNIÈRE écriture d'état de la séquence.
  await expect(panneau.getByRole('button', { name: /^Retirer/ })).toHaveCount(0);
  await expect(panneau.getByLabel(/^Valeur.*, ligne 1$/)).toHaveValue('');

  await panneau.getByLabel(/Prélevé le/).fill(bilan.preleveLe);
  for (const [i, ligne] of bilan.lignes.entries()) {
    if (i > 0) await panneau.getByRole('button', { name: 'Ajouter une analyse' }).click();
    await panneau
      .getByLabel(`Analyte (unité du catalogue), ligne ${i + 1}`, { exact: true })
      .selectOption(ligne.code);
    await panneau.getByLabel(new RegExp(`^Valeur.*, ligne ${i + 1}$`)).fill(ligne.valeur);
  }
  const reponse = page.waitForResponse(
    r => r.url().includes('/api/praticien/biologie/resultats/bilan') && r.request().method() === 'POST',
  );
  await panneau.getByRole('button', { name: /^Enregistrer le bilan/ }).click();
  return reponse;
}

/** Une mesure seule : un bilan d'une ligne. */
function consigner(
  page: Page,
  panneau: ReturnType<Page['getByRole']>,
  saisie: { valeur: string; preleveLe: string },
) {
  return enregistrerBilan(page, panneau, {
    preleveLe: saisie.preleveLe,
    lignes: [{ code: ANALYTE_CODE, valeur: saisie.valeur }],
  });
}

test.describe('Saisie de résultats biologiques — série, doublon, panne de lecture', () => {
  test.beforeAll(() => {
    debutDuRun = new Date(Date.now() - 1_000);
  });

  test.afterAll(async () => {
    await nettoyerResultatsBiologiques(PATIENT_ID, debutDuRun);
  });

  test('deux mesures du même analyte à deux heures coexistent, groupées sous un seul analyte', async ({
    page,
    context,
  }) => {
    await context.addCookies([await praticienSessionCookie()]);
    const panneau = await ouvrirPanneauMesures(page);

    // La surface est OUVERTE : sans le drapeau, le panneau rendrait son second
    // temps « à activer » et tout ce qui suit serait introuvable pour une
    // raison qui n'a rien à voir avec la saisie.
    await expect(panneau.getByText('Second temps — à activer')).toHaveCount(0);

    // Aucune unité n'est saisie : le libellé du sélecteur le dit, et le rendu
    // de la série le prouvera.
    await expect(panneau.getByLabel('Analyte (unité du catalogue), ligne 1')).toBeVisible();
    await expect(panneau.getByLabel(/^Unité$/)).toHaveCount(0);

    const premiere = await consigner(page, panneau, {
      valeur: VALEUR_MATIN,
      preleveLe: MATIN,
    });
    expect(
      premiere.status(),
      `la première consignation a été refusée — corps : ${await premiere.text()}`,
    ).toBe(201);

    const seconde = await consigner(page, panneau, {
      valeur: VALEUR_SOIR,
      preleveLe: SOIR,
    });
    expect(
      seconde.status(),
      `la seconde consignation a été refusée — corps : ${await seconde.text()}`,
    ).toBe(201);

    // UN groupe d'analyte, DEUX lignes : c'est le cœur de la frontière #838 —
    // l'heure distingue, et l'écran montre les deux plutôt que d'en écraser une.
    //
    // `exact: true`, ET CE N'EST PAS COSMÉTIQUE. Le sélecteur de saisie porte
    // une `<option>` « Ferritine (ng/mL) » qui existe MÊME QUAND LA SÉRIE EST
    // VIDE : une recherche par sous-chaîne la compte, si bien qu'une série qui
    // ne rendrait rien passerait quand même le comptage. Le repère lâche ne
    // prouvait rien — il fallait celui du titre de groupe, dont le texte est
    // exactement le libellé.
    await expect(panneau.getByText(ANALYTE_LIBELLE, { exact: true })).toHaveCount(1);
    await expect(panneau.getByText(`${VALEUR_MATIN} ${ANALYTE_UNITE}`)).toBeVisible();
    await expect(panneau.getByText(`${VALEUR_SOIR} ${ANALYTE_UNITE}`)).toBeVisible();

    // L'unité affichée VIENT DU CATALOGUE : elle n'a été saisie nulle part.
    // Si un jour la saisie se mettait à la fournir, cette assertion tiendrait
    // encore par accident — d'où l'absence de champ, éprouvée plus haut.
    await expect(panneau.getByText(/saisie praticien/).first()).toBeVisible();
  });

  test('un doublon EXACT est refusé, et le refus est DIT à l’écran', async ({ page, context }) => {
    await context.addCookies([await praticienSessionCookie()]);
    const panneau = await ouvrirPanneauMesures(page);

    // Même analyte, même horodatage EXACT que la mesure du matin : c'est la
    // clé d'unicité. Le préflight du bilan la lit AVANT d'écrire — le `P2002`
    // de la base reste le filet d'une course, éprouvé par son propre banc
    // (`contrat-unicite-p2002.spec.ts`).
    const reponse = await consigner(page, panneau, {
      valeur: '99.9',
      preleveLe: MATIN,
    });
    expect(reponse.status()).toBe(409);
    const corps = await reponse.json();
    expect(corps.reason).toBe('lignes_invalides');
    expect(corps.lignes).toEqual([expect.objectContaining({ index: 0, reason: 'doublon_mesure' })]);

    // LE REFUS EST DIT, et il est dit UTILEMENT : sous la ligne, le message
    // nomme la sortie (l'heure distingue deux prélèvements du même jour). Un
    // 409 avalé en silence laisserait le praticien croire sa mesure consignée.
    await expect(panneau.getByRole('alert')).toHaveText('Rien n’a été enregistré : 1 ligne à reprendre.');
    await expect(panneau.getByText(/existe déjà pour ce patient à cet horodatage/)).toBeVisible();

    // ET RIEN N'A ÉTÉ ÉCRIT : la valeur refusée n'apparaît pas dans la série,
    // et elle reste dans le champ — refusée, pas perdue.
    await expect(panneau.getByText(`99.9 ${ANALYTE_UNITE}`)).toHaveCount(0);
    await expect(panneau.getByLabel(/^Valeur.*, ligne 1$/)).toHaveValue('99.9');
  });

  test('un bilan de deux analytes s’enregistre en UNE validation, clavier compris', async ({
    page,
    context,
  }) => {
    await context.addCookies([await praticienSessionCookie()]);
    const panneau = await ouvrirPanneauMesures(page);

    // « Ajouter une analyse » au CLAVIER : la nouvelle ligne reçoit le focus,
    // sans quoi un bilan de dix analytes se saisirait à la souris seulement.
    await panneau.getByRole('button', { name: 'Ajouter une analyse' }).focus();
    await page.keyboard.press('Enter');
    await expect(panneau.getByLabel('Analyte (unité du catalogue), ligne 2', { exact: true })).toBeFocused();
    await panneau.getByRole('button', { name: 'Retirer la ligne 2' }).click();

    const reponse = await enregistrerBilan(page, panneau, {
      preleveLe: BILAN,
      lignes: [
        { code: ANALYTE_CODE, valeur: '60.1' },
        { code: ZINC_CODE, valeur: '14.2' },
      ],
    });
    expect(reponse.status(), `bilan refusé — corps : ${await reponse.text()}`).toBe(201);
    expect(await reponse.json()).toEqual({ ok: true, nombre: 2 });

    await expect(panneau.getByText(`60.1 ${ANALYTE_UNITE}`)).toBeVisible();
    await expect(panneau.getByText(`14.2 ${ZINC_UNITE}`)).toBeVisible();
    await expect(panneau.getByText(ZINC_LIBELLE, { exact: true })).toHaveCount(1);
  });

  test('TOUT OU RIEN : une ligne en doublon, et la ligne valide n’est PAS écrite', async ({
    page,
    context,
  }) => {
    await context.addCookies([await praticienSessionCookie()]);
    const panneau = await ouvrirPanneauMesures(page);

    // Ligne 1 : zinc au matin — valide seule. Ligne 2 : ferritine au matin —
    // la mesure du premier test occupe déjà cet horodatage. Le cas A3 :
    // l'une refusée, AUCUNE écrite.
    const reponse = await enregistrerBilan(page, panneau, {
      preleveLe: MATIN,
      lignes: [
        { code: ZINC_CODE, valeur: '9.9' },
        { code: ANALYTE_CODE, valeur: '33.3' },
      ],
    });
    expect(reponse.status()).toBe(409);
    expect((await reponse.json()).lignes).toEqual([
      expect.objectContaining({ index: 1, reason: 'doublon_mesure' }),
    ]);

    // La ligne fautive est NOMMÉE, et elle seule.
    const ferritine = panneau.getByLabel('Analyte (unité du catalogue), ligne 2', { exact: true });
    await expect(ferritine).toHaveAttribute('aria-invalid', 'true');
    await expect(panneau.getByLabel('Analyte (unité du catalogue), ligne 1', { exact: true })).not.toHaveAttribute(
      'aria-invalid',
      'true',
    );

    // Le zinc, valide, n'a PAS été écrit — après relecture de la page entière,
    // pas seulement de l'état local du composant.
    await page.reload();
    const relu = page.getByRole('region', { name: 'Estimé et mesuré' });
    await expect(relu.getByText(`14.2 ${ZINC_UNITE}`)).toBeVisible();
    await expect(relu.getByText(`9.9 ${ZINC_UNITE}`)).toHaveCount(0);
    await expect(relu.getByText(`33.3 ${ANALYTE_UNITE}`)).toHaveCount(0);
  });

  test('une panne de lecture ne se lit JAMAIS « aucune mesure » (DC-24)', async ({
    page,
    context,
  }) => {
    await context.addCookies([await praticienSessionCookie()]);

    // La panne est simulée AU RÉSEAU, pas en base : ce qu'on éprouve est la
    // réaction de l'écran à une lecture qui échoue, et le dossier porte
    // justement des mesures — donc « aucune mesure » serait un mensonge
    // doublement faux.
    await page.route('**/api/praticien/biologie/resultats?*', route =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ ok: false, reason: 'server_error', error: 'Erreur technique.' }),
      }),
    );

    const panneau = await ouvrirPanneauMesures(page);

    const alerte = panneau.getByRole('alert');
    await expect(alerte).toBeVisible();
    await expect(alerte).toContainText(
      'La série n’a pas pu être lue : impossible d’affirmer qu’aucune mesure n’existe.',
    );
    // L'état vide ne s'affirme QU'APRÈS une lecture aboutie — jamais sur panne.
    await expect(panneau.getByText('Aucune mesure consignée pour ce dossier.')).toHaveCount(0);
    // Et la sortie est offerte : constater une panne sans pouvoir réessayer
    // laisserait le praticien devant un écran mort.
    await expect(panneau.getByRole('button', { name: 'Relire la série' })).toBeVisible();
  });
});
