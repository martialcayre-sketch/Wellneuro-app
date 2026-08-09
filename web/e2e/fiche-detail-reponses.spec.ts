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
// Les trois lignes assérées sont les trois états que le seed peut produire.
// CE QUE CHACUNE RÉFUTE, et elles ne se valent pas :
//   · PSS-10 → tombe si la clé `certification` disparaît du seed ;
//   · PSQI → tombe si un futur seed y pose une certification que le catalogue ne
//     porte pas. C'est la seule des trois qui garde contre un seed généreux ;
//   · MFI-20 → ne tombe PAS si on y pose une certification : la branche
//     `nonInterpretable` gagne, et la route retire même la clé avant l'écran
//     (`passationsNonInterpretables.ts`). Elle fixe ce comportement-là, pas le
//     plafond du seed. (Relevé en revue le 2026-08-09 : une première rédaction
//     attribuait aux deux dernières la même vertu.)
//
// SUR UNE BASE DÉJÀ SEEDÉE, CE BANC EST ROUGE, et ce n'est pas une régression :
// `prisma/seed.ts` upserte les passations avec `update: {}`, donc les clés
// `certification` ne s'écrivent que sur une base neuve (`test:worktree`, CI).
// Le remède est de faire re-créer les huit lignes concernées — bornées aux DEUX
// patients fictifs, jamais un effacement large :
//   DELETE FROM "QuestionnaireReponse"
//    WHERE "idReponse" IN ('REP_S01_STR01','REP_S01_STR02','REP_S01_STR05',
//                          'REP_S01_INF03','REP_J02_NEU11','REP_J02_SOM06',
//                          'REP_J02_INF02','REP_J02_STR04');
// puis `npm run prisma:seed`. Ne jamais toucher à l'`update: {}` du seed : il
// protège le travail en cours sur une base de dev.
//
// Patients fictifs Sophie Nicola (PAT_SEED_01) et Jennifer Martin (PAT_SEED_02),
// déjà seedés — aucun parcours à jouer.
//
// ATTENTION, CES DOSSIERS NE SONT PAS EN LECTURE SEULE. Une première rédaction
// l'affirmait, sur la foi de l'en-tête de `helpers/db.ts` (« n'agit que sur
// Michel Dogné ») — c'est faux depuis que `provisionnerReponseOrientation`
// écrit une seconde passation `Q_STR_02` pour SOPHIE
// (`orientation-file-envoi.spec.ts`). D'où l'ancrage des lignes plus bas :
// c'est la conséquence concrète, et l'affirmation contraire aurait fait
// conclure à un bug là où il n'y a qu'un doublon attendu.
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
    //
    // La ligne est ancrée sur son INTERPRÉTATION et non sur « PSS-10 » seul :
    // `helpers/db.ts` (`provisionnerReponseOrientation`) écrit pour ce même
    // patient une seconde passation `Q_STR_02` au titre identique. Elle est
    // nettoyée en run nominal, mais un run interrompu la laisse — et deux
    // lignes résolues violeraient le mode strict de Playwright.
    await attendreBadgeQualite(table, /PSS-10.*risque cardio-métabolique/, 'Scoring vérifié (Drive)', 'success');

    // LE PLAFOND, et il est aussi important que le cas nominal. `Q_SOM_01`
    // (PSQI) est l'un des 18 instruments que le registre déclare
    // `scoring_verifie` et dont le catalogue ne dit rien — le badge muet qu'une
    // décision produit doit trancher. Tant qu'elle n'est pas prise, sa ligne
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
