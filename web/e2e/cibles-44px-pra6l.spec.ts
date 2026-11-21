// PRA-6l — les cibles du praticien laissées par PRA-6d tiennent 44 px.
//
// La mesure est celle de l'écran rendu (boîte englobante), pas la classe : sous
// WebKit (projet iPhone 13), une `<select>` stylée ignore `min-height` et
// retombe à 20-24 px ; seule `height` la tient (mesure isolée de PRA-6d). Ce
// banc joue les deux projets — c'est iPhone 13 qui le rend utile pour les
// listes ; pour les liens et boutons, les deux moteurs comptent pareil.
//
// Écrans : rayon Questionnaires (`PacksPanel`, `AssignationsPacksPanel`),
// onglet Alimentation d'un dossier de fixture (`PractitionerFoodObservation
// Panel`), tiroir des questionnaires à consulter du Fil (`InboxQuestionnaires`).
// Le tiroir est vide au seed : sa lecture est servie ici, sur une identité de
// fixture, et rien n'est écrit — les gestes du tiroir ne sont pas cliqués,
// sauf « Retirer du raisonnement clinique », qui n'ouvre qu'une saisie locale.
import { test, expect, type Locator, type Page } from '@playwright/test';
import { PRATICIEN_EMAIL, praticienSessionCookie } from './helpers/auth';

const CIBLE_PX = 44;

async function hauteur(cible: Locator): Promise<number> {
  await expect(cible).toBeVisible({ timeout: 10000 });
  const boite = await cible.boundingBox();
  if (!boite) throw new Error('Cible sans boîte englobante');
  return boite.height;
}

async function attendreCibles(cibles: Record<string, Locator>) {
  for (const [nom, cible] of Object.entries(cibles)) {
    const h = await hauteur(cible);
    expect(h, `${nom} : ${h} px`).toBeGreaterThanOrEqual(CIBLE_PX - 0.5);
  }
}

async function connecter(page: Page) {
  await page.context().addCookies([await praticienSessionCookie(PRATICIEN_EMAIL)]);
}

test.describe('PRA-6l — cibles de 44 px', () => {
  test('rayon Questionnaires : les listes des packs et le filtre des assignations', async ({ page }) => {
    await connecter(page);
    await page.goto('/dashboard/bibliotheque/questionnaires');
    await expect(page.getByRole('heading', { name: 'Nouveau pack de questionnaires' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Chargement des packs...')).toHaveCount(0, { timeout: 10000 });

    await attendreCibles({
      'Type de catégories': page.getByRole('combobox', { name: 'Type de catégories', exact: true }),
      'Filtrer par catégorie': page.getByRole('combobox', { name: 'Filtrer par catégorie', exact: true }),
      Pack: page.getByRole('combobox', { name: 'Pack', exact: true }),
      Patient: page.getByRole('combobox', { name: 'Patient', exact: true }),
      'Filtrer par statut': page.getByRole('combobox', { name: 'Filtrer par statut', exact: true }),
    });
  });

  test('onglet Alimentation : les listes de saisie et de revue', async ({ page }) => {
    await connecter(page);
    await page.goto('/dashboard/patients/PAT_SEED_03?onglet=alimentation');
    await expect(page.getByRole('heading', { name: 'Trajectoire alimentaire' })).toBeVisible({ timeout: 10000 });

    // « Friction principale » n'est rendue que pour une issue empêchée : état
    // local, rien n'est enregistré.
    await page.getByTestId('ja-praticien-issue').selectOption('partiel_empeche');

    await attendreCibles(
      Object.fromEntries(
        [
          'ja-praticien-issue',
          'ja-praticien-friction',
          'ja-praticien-assiette',
          'ja-praticien-activation-milestone',
          'ja-praticien-charge-percue',
        ].map(id => [id, page.getByTestId(id)]),
      ),
    );
  });

  test('Fil : les gestes du tiroir des questionnaires à consulter', async ({ page }) => {
    await connecter(page);
    const reponse = {
      idPatient: 'PAT_SEED_01',
      idQuestionnaire: 'NEU_03',
      titre: 'Sommeil',
      dateSoumission: '2026-07-15T08:00:00.000Z',
      scoresParsed: { rawAnswers: { MM1: 2 } },
      rawAnswers: { MM1: 2 },
      scorePrincipal: null,
      interpretation: '',
      subScoreRanges: null,
      reponsesLisibles: [],
    };
    await page.route(
      url => url.pathname === '/api/praticien/inbox-questionnaires',
      route => {
        if (route.request().method() !== 'GET') return route.abort();
        const detail = new URL(route.request().url()).searchParams.get('idPatient');
        const corps = detail
          ? {
              ok: true,
              lignes: [],
              validiteActive: true,
              patient: { idPatient: 'PAT_SEED_01', nom: 'Sophie Nicola' },
              reponses: [
                { ...reponse, idReponse: 'REP_E2E_1', idAssignation: 'ASS_E2E_1' },
                {
                  ...reponse,
                  idReponse: 'REP_E2E_2',
                  idAssignation: 'ASS_E2E_2',
                  statutValidite: 'INVALID',
                  motifInvalidation: 'Motif de fixture.',
                },
              ],
            }
          : {
              ok: true,
              lignes: [
                {
                  idPatient: 'PAT_SEED_01',
                  patient: 'Sophie Nicola',
                  nb: 2,
                  derniereDate: '2026-07-15T08:00:00.000Z',
                  titres: ['Sommeil'],
                },
              ],
            };
        return route.fulfill({ json: corps });
      },
    );
    await page.goto('/dashboard');
    await page.getByRole('button', { name: /Sophie Nicola/ }).first().click();
    const tiroir = page.getByRole('dialog');

    await attendreCibles({
      'Ouvrir la fiche-trajectoire': tiroir.getByRole('link', { name: 'Ouvrir la fiche-trajectoire' }),
      'Confirmer la lecture': tiroir.getByRole('button', { name: 'Confirmer la lecture' }),
      'Retirer du raisonnement clinique': tiroir.getByRole('button', { name: 'Retirer du raisonnement clinique' }),
      'Rétablir dans le raisonnement': tiroir.getByRole('button', { name: 'Rétablir dans le raisonnement' }),
    });

    await tiroir.getByRole('button', { name: 'Retirer du raisonnement clinique' }).click();
    await attendreCibles({
      'Confirmer le retrait': tiroir.getByRole('button', { name: 'Confirmer le retrait' }),
      Annuler: tiroir.getByRole('button', { name: 'Annuler', exact: true }),
    });
  });
});
