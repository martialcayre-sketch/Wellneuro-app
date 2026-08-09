// Colonne « Qualité » du tiroir « Détail des réponses » (campagne
// 2026-08-08-dettes-ouvertes-5-0, LOT-04 — dette nommée par D-036).
//
// CE QUE CE BANC PROUVE, et qu'aucun test unitaire ne peut prouver : la CHAÎNE.
// `libelleCertificationPassation` est déjà couvert par
// `certificationLibelles.guard.test.ts`, mais sur des littéraux — il ne dit rien
// de ce qui arrive réellement à l'écran. Entre les deux il y a `scores_json`, la
// route praticien et sa branche `nonInterpretable`. Jusqu'ici aucun bloc du seed
// ne portait la clé `certification` : la colonne retombait TOUJOURS sur
// « Historique », et aucun E2E ne voyait un seul des six libellés.
//
// Les trois lignes assérées sont les trois états que le seed peut produire, et
// les deux dernières sont ce qui empêche un futur seed généreux de mentir :
// poser une certification sur le PSQI rendrait ce banc rouge.
//
// Patients fictifs Sophie Nicola (PAT_SEED_01) et Jennifer Martin (PAT_SEED_02),
// déjà seedés — aucun parcours à jouer. Les helpers `e2e/helpers/db.ts`
// n'agissent que sur Michel Dogné : ces deux dossiers-ci sont en lecture seule
// pour toute la suite.
import { test, expect, type Page } from '@playwright/test';
import { praticienSessionCookie } from './helpers/auth';

/** Ouvre le tiroir et rend le tableau. Le tiroir vit hors du rail de phases :
 *  aucun onglet à traverser. */
async function ouvrirDetailDesReponses(page: Page, idPatient: string) {
  await page.goto(`/dashboard/patients/${idPatient}`);
  await page.getByRole('button', { name: 'Détail des réponses' }).click();
  return page.getByRole('dialog').getByRole('table');
}

/** Le badge de la colonne « Qualité » d'une ligne, texte ET couleur.
 *
 *  La ligne porte le badge, jamais la page : « Historique insuffisant » existe
 *  ailleurs dans la fiche, et un `getByText('Historique')` nu l'attraperait.
 *  `exact` pour la même raison — l'appartenance, jamais la sous-chaîne.
 *
 *  `data-variant` est assérée parce que le texte seul ne suffit pas : un
 *  « Scoring vérifié (Drive) » rendu en gris neutre dirait le contraire de ce
 *  qu'il affirme, et le banc resterait vert (relevé en revue au LOT-02). */
async function attendreBadgeQualite(
  table: ReturnType<Page['getByRole']>,
  motDeLaLigne: RegExp,
  libelle: string,
  variante: string,
) {
  const badge = table
    .getByRole('row', { name: motDeLaLigne })
    .getByText(libelle, { exact: true });
  await expect(badge).toBeVisible();
  await expect(badge).toHaveAttribute('data-variant', variante);
}

test.describe('Fiche patient — colonne « Qualité » du détail des réponses', () => {
  test('une passation certifiée au catalogue affiche son libellé, une passation muette reste « Historique »', async ({ page, context }) => {
    await context.addCookies([await praticienSessionCookie()]);
    const table = await ouvrirDetailDesReponses(page, 'PAT_SEED_01');

    // Le cas nominal : `Q_STR_02` est `certifie`/`drive` au catalogue, et le
    // registre le déclare `scoring_verifie`. C'est la seule des six formes que
    // le seed puisse produire aujourd'hui — les 13 blocs certifiés le sont tous
    // par la même provenance.
    await attendreBadgeQualite(table, /PSS-10/, 'Scoring vérifié (Drive)', 'success');

    // LE PLAFOND, et il est aussi important que le cas nominal. `Q_SOM_01`
    // (PSQI) est l'un des 18 instruments que le registre déclare
    // `scoring_verifie` et dont le catalogue ne dit rien — le badge muet que
    // D-037 doit trancher. Tant que la décision n'est pas prise, sa ligne
    // affiche « Historique », et c'est cette assertion qui interdit d'y poser
    // une certification que le catalogue ne porte pas.
    await attendreBadgeQualite(table, /PSQI/, 'Historique', 'neutral');
  });

  test('une passation antérieure à la reconstruction de son instrument reste « Non interprétable »', async ({ page, context }) => {
    await context.addCookies([await praticienSessionCookie()]);
    const table = await ouvrirDetailDesReponses(page, 'PAT_SEED_02');

    // `Q_SOM_07` (MFI-20) est nu au seed pour une raison DIFFÉRENTE du PSQI, et
    // c'est ce que ce cas fixe : sa passation est datée du 2026-06-15, donc
    // antérieure à la reconstruction du 2026-07-31. La route la rend
    // `nonInterpretable`, et cette branche passe AVANT celle du badge de
    // certification. Y poser une certification serait inerte à l'écran — sans ce
    // cas, on croirait le contraire.
    await attendreBadgeQualite(table, /MFI-20/, 'Non interprétable', 'danger');
  });
});
