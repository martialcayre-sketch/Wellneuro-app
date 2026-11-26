// Décor de l'entrée du parcours patient (lot PAT-2 décor ; [[D-481]] §1 bis,
// prototype validé le 2026-11-26, Q1 (b)). Réception du lot, sur les neuf
// écrans U01 à U09, mineur compris :
//   - le fond `entree-patient` est posé une fois, hors de l'accessibilité ;
//   - aucun champ n'est posé à même le fond : chacun a un ancêtre opaque
//     (la carte) entre lui et le décor ;
//   - sur les écrans à frise (U06 à U09), la frise est au-dessus de la zone
//     du fond, jamais dessus ;
//   - le cadre n'élargit jamais la page (aucun défilement horizontal) ;
//   - le fond est absent à l'impression ;
//   - le circuit mineur n'a aucune navigation adulte ([[D-283]] §5).
// Les règles du décor lui-même sont épinglées en Vitest
// (`components/ui/LienDecor.test.tsx`), la pose aussi
// (`components/patient/ui/FondEntreePatient.test.tsx`).
//
// Au bureau (Chromium), au téléphone (WebKit, iPhone 13) et au téléphone
// Chromium : ce dernier passe par le projet Chromium, avec l'émulation d'un
// téléphone de 412 px (le moteur ne change pas dans un groupe).
//
// Fixtures seules : Michel Dogné (PAT_SEED_03) pour le parcours, Jennifer
// Martin (PAT_SEED_02) pour la date de naissance et le circuit mineur — sa
// date est retirée, puis remise à la valeur du seed.
import { test, expect, devices, type Page } from '@playwright/test';
import {
  accuserPorteTrust,
  closePrisma,
  poserDateNaissanceFixture,
  resetPortailState,
} from './helpers/db';
import { praticienSessionCookie, patientPortailSessionCookie } from './helpers/auth';

const PARCOURS = { idPatient: 'PAT_SEED_03', email: 'michel.dogne@fictif.wellneuro.fr' };
// La date de naissance restituée est FIXE, celle de `prisma/seed.ts`, jamais
// relue : un run interrompu entre le retrait et la restitution laisserait
// sinon `null` ou la date de mineur, que le run suivant relirait et
// restituerait (constat PR-Agent sur #2384).
const MINEUR = {
  idPatient: 'PAT_SEED_02',
  email: 'jennifer.martin@fictif.wellneuro.fr',
  dateNaissanceSeed: '1979-07-28',
};
const FRISE = 'ol[aria-label="Étapes de votre parcours"]';

test.describe.configure({ mode: 'serial' });

test.afterAll(async () => {
  await poserDateNaissanceFixture(MINEUR.idPatient, MINEUR.dateNaissanceSeed);
  await resetPortailState(PARCOURS.idPatient);
  await closePrisma();
});

/** Le constat d'un écran : fond, champs, carte, frise. */
async function controlerFond(page: Page, { frise }: { frise: boolean }) {
  const fond = page.locator('[data-lien-decor="entree-patient"]');
  await expect(fond).toHaveCount(1);
  await expect(fond).toHaveAttribute('aria-hidden', 'true');

  const constat = await page.evaluate((selFrise) => {
    const decor = document.querySelector('[data-lien-decor="entree-patient"]');
    const zone = decor?.parentElement ?? null;
    const opaque = (el: Element) => {
      const m = getComputedStyle(el).backgroundColor.match(/rgba?\(([^)]+)\)/);
      if (!m) return false;
      const parts = m[1].split(',').map((x) => x.trim());
      return parts.length === 3 || Number(parts[3]) === 1;
    };
    const champs = Array.from(document.querySelectorAll('main input, main select, main textarea'));
    const nus = champs
      .filter((champ) => {
        for (let el = champ.parentElement; el && el !== zone; el = el.parentElement) {
          if (opaque(el)) return false;
        }
        return true;
      })
      .map((champ) => champ.outerHTML.slice(0, 80));
    const ol = document.querySelector(selFrise);
    return {
      nus,
      // Le cadre reprend les marges du `main` par des marges négatives : il
      // ne doit jamais élargir la page.
      debordement: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      friseDansZone: ol ? !!zone?.contains(ol) : null,
      ecartFrise: ol && zone ? zone.getBoundingClientRect().top - ol.getBoundingClientRect().bottom : null,
    };
  }, FRISE);
  expect(constat.nus, 'champ posé à même le fond').toEqual([]);
  expect(constat.debordement, 'défilement horizontal').toBeLessThanOrEqual(0);
  if (frise) {
    expect(constat.friseDansZone).toBe(false);
    expect(constat.ecartFrise ?? -1).toBeGreaterThanOrEqual(0);
  } else {
    expect(constat.friseDansZone).toBeNull();
  }
}

function scenarios() {
  test('U01 et U02 : fond posé, absent à l’impression', async ({ page }) => {
    await page.goto('/portail/connexion');
    await expect(page.getByRole('heading', { name: 'Accéder à votre espace' })).toBeVisible();
    await controlerFond(page, { frise: false });
    await page.emulateMedia({ media: 'print' });
    await expect(page.locator('[data-lien-decor="entree-patient"]')).toBeHidden();
    await page.emulateMedia({ media: 'screen' });

    await page.goto('/portail/lien/indisponible');
    await expect(page.getByRole('heading', { name: 'Votre lien n’est plus valable' })).toBeVisible();
    await controlerFond(page, { frise: false });
  });

  test('U04 et U05 : date de naissance, puis circuit mineur sans navigation', async ({ page, context }) => {
    await accuserPorteTrust(MINEUR.idPatient);
    await poserDateNaissanceFixture(MINEUR.idPatient, null);
    await context.addCookies([patientPortailSessionCookie(MINEUR.idPatient, MINEUR.email)]);
    await page.goto(`/portail/${MINEUR.idPatient}`);

    await expect(page.locator('#date-naissance')).toBeVisible();
    await controlerFond(page, { frise: false });
    await page.locator('#date-naissance').fill('2012-05-10');
    await page.locator('form button[type="submit"]').click();
    await page.getByRole('button', { name: 'C’est exact, enregistrer' }).click();

    await expect(page.getByRole('heading', { level: 2, name: /^Avant 15 ans/ })).toBeVisible();
    await controlerFond(page, { frise: false });
    await expect(page.getByRole('button', { name: 'Menu', exact: true })).toHaveCount(0);
    await expect(page.getByRole('navigation')).toHaveCount(0);
  });

  test('U03, U06 à U09 : le parcours d’entrée complet', async ({ page, context }) => {
    test.slow();
    await resetPortailState(PARCOURS.idPatient);
    await context.addCookies([await praticienSessionCookie()]);
    const res = await page.request.post('/api/praticien/consultations', { data: { idPatient: PARCOURS.idPatient } });
    expect(res.ok()).toBe(true);
    await context.addCookies([patientPortailSessionCookie(PARCOURS.idPatient, PARCOURS.email)]);
    await page.goto(`/portail/${PARCOURS.idPatient}`);

    await expect(page.getByRole('heading', { name: 'Bienvenue dans votre espace Wellneuro' })).toBeVisible();
    await controlerFond(page, { frise: false });
    await page.getByRole('button', { name: 'Continuer' }).click();
    await page.getByRole('button', { name: 'Je comprends le cadre' }).click();
    await page.getByRole('button', { name: 'Continuer' }).click();
    await expect(page.getByRole('heading', { name: 'Avant de commencer' })).toBeVisible();
    await controlerFond(page, { frise: false });
    for (const libelle of [/ne remplace pas un service d/, /conclusion médicale/, /mes données et mes choix/]) {
      await page.getByLabel(libelle).check();
    }
    await page.getByRole('button', { name: 'J’ai pris connaissance de ces informations' }).click();

    await expect(page.getByRole('heading', { name: 'Votre consentement au suivi' })).toBeVisible();
    await controlerFond(page, { frise: true });
    await page.getByLabel(/ai lu ces informations/i).check();
    await page.getByRole('button', { name: 'Donner mon consentement' }).click();

    await expect(page.getByRole('heading', { name: 'Fiche de renseignements' })).toBeVisible();
    await controlerFond(page, { frise: true });
    await page.locator('label:has-text("Situation familiale") + select').selectOption({ label: 'Marié·e / Pacsé·e' });
    await page.getByRole('button', { name: 'Suivant →' }).click();
    await page.locator('label:has-text("Profession") + input').fill('Retraité');
    await page.getByRole('button', { name: 'Suivant →' }).click();
    await page.getByLabel(/exactitude des informations fournies/i).check();
    await page.getByRole('button', { name: 'Continuer vers votre situation' }).click();

    await expect(page.getByRole('heading', { name: 'Parler de votre situation' })).toBeVisible();
    await controlerFond(page, { frise: true });
    await page.getByRole('button', { name: 'Suivant →' }).click();
    await page.locator('label:has-text("amène aujourd") + textarea').fill('Fatigue persistante depuis plusieurs mois.');
    // Sections 3 à 7 de l'anamnèse, sans autre champ requis.
    for (let i = 0; i < 5; i++) await page.getByRole('button', { name: 'Suivant →' }).click();
    await controlerFond(page, { frise: true });
    await page.getByRole('button', { name: /Valider et accéder à mon parcours/i }).click();

    await expect(page.getByText('Merci !')).toBeVisible();
    await controlerFond(page, { frise: true });
  });
}

test.describe('Portail — décor de l’entrée (PAT-2)', () => {
  scenarios();
});

test.describe('Portail — décor de l’entrée (PAT-2), téléphone Chromium', () => {
  // Le moteur d'un groupe est celui du projet : l'émulation d'un téléphone
  // garde Chromium, sans `defaultBrowserType`.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { defaultBrowserType, ...telephone } = devices['Pixel 7'];
  test.use(telephone);
  test.skip(({ browserName }) => browserName !== 'chromium', 'téléphone Chromium : projet Chromium seulement');
  scenarios();
});
