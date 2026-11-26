// Décor des lectures patient (lot PAT-5 décor ; [[D-481]] §1 bis, DOC-9 Q2a
// et Q3a ; prototype validé « Q1a — Q2a — Q3a » le 2026-11-26). Réception du
// lot, au bureau (Chromium) et au téléphone (WebKit) :
// - U25 : un séparateur `divider-two-voices` entre les deux sections du bas,
//   hors des cartes, 320 px au plus ; un germe sur le seul vide de l'objectif,
//   aucun sur les deux vides du bas ;
// - U24 et U26 : un germe sur l'état vide réel, avant la phrase ;
// - partout : décor hors de l'arbre d'accessibilité et absent à l'impression,
//   où les intitulés des deux voix restent.
// Les autres vides ornés (U28, U30, U31, U32) sont gardés par des drapeaux que
// le serveur de test n'allume pas : leur pose est épinglée en Vitest.
//
// Patient fictif Jennifer Martin (PAT_SEED_02) : aucun spec ne lui provisionne
// d'objectif, de synthèse ni de bilan ; ses vides sont réels. Lecture seule,
// hors l'accusé d'entrée que posent déjà les autres specs du portail.
import { test, expect, type Page } from '@playwright/test';
import { accuserPorteTrust, closePrisma } from './helpers/db';
import { patientPortailSessionCookie } from './helpers/auth';

const PATIENT = { idPatient: 'PAT_SEED_02', email: 'jennifer.martin@fictif.wellneuro.fr' };

test.describe('Portail — décor des lectures (PAT-5 décor)', () => {
  test.beforeAll(async () => {
    await accuserPorteTrust(PATIENT.idPatient);
  });

  test.afterAll(async () => {
    await closePrisma();
  });

  test.beforeEach(async ({ context }) => {
    await context.addCookies([patientPortailSessionCookie(PATIENT.idPatient, PATIENT.email)]);
  });

  const germes = (page: Page) => page.locator('[data-lien-decor="etat-vide"]');

  async function decorHorsAccessibiliteEtImpression(page: Page, decor: ReturnType<Page['locator']>) {
    await expect(decor).toBeVisible();
    await expect(decor).toHaveAttribute('aria-hidden', 'true');
    await page.emulateMedia({ media: 'print' });
    await expect(decor).toBeHidden();
    await page.emulateMedia({ media: 'screen' });
    await expect(decor).toBeVisible();
  }

  test('U25 : un séparateur entre les deux voix du bas, un germe sur le vide de l’objectif', async ({ page }) => {
    await page.goto(`/portail/${PATIENT.idPatient}/dossier`);
    const patient = page.getByRole('heading', { name: 'Ce qui compte pour moi', level: 2 });
    const praticien = page.getByRole('heading', { name: 'Ce que mon praticien a compris de moi', level: 2 });
    await expect(praticien).toBeVisible();

    const separateur = page.locator('[data-lien-decor="deux-voix"]');
    await expect(separateur).toHaveCount(1);
    await expect(separateur).toHaveAttribute('data-element', 'divider-two-voices');
    const [bPatient, bSep, bPraticien] = await Promise.all([
      patient.boundingBox(),
      separateur.boundingBox(),
      praticien.boundingBox(),
    ]);
    expect(bPatient && bSep && bPraticien).toBeTruthy();
    expect(bSep!.y).toBeGreaterThan(bPatient!.y);
    expect(bSep!.y + bSep!.height).toBeLessThanOrEqual(bPraticien!.y);
    expect(bSep!.width).toBeLessThanOrEqual(320.5);

    // Un seul germe : celui du vide de l'objectif, avant sa phrase.
    await expect(germes(page)).toHaveCount(1);
    const phrase = page.getByText('Aucun objectif n’a encore été écrit', { exact: false });
    const [bGerme, bPhrase] = await Promise.all([germes(page).boundingBox(), phrase.boundingBox()]);
    expect(bGerme!.y + bGerme!.height).toBeLessThanOrEqual(bPhrase!.y);
    expect(bGerme!.width).toBeCloseTo(160, 0);

    await decorHorsAccessibiliteEtImpression(page, separateur);
    await decorHorsAccessibiliteEtImpression(page, germes(page));

    // À l'impression, seul le décor tombe : les intitulés des deux voix restent.
    await page.emulateMedia({ media: 'print' });
    await expect(patient).toBeVisible();
    await expect(praticien).toBeVisible();
    await page.emulateMedia({ media: 'screen' });
  });

  for (const [ecran, route, phrase] of [
    ['U24', 'comprehension', 'Votre praticien n’a encore rien publié ici.'],
    ['U26', 'bilan', 'Votre praticien ne vous a pas encore transmis de bilan.'],
  ] as const) {
    test(`${ecran} : un germe avant la phrase de l’état vide`, async ({ page }) => {
      await page.goto(`/portail/${PATIENT.idPatient}/${route}`);
      const texte = page.getByText(phrase, { exact: false });
      await expect(texte).toBeVisible();
      await expect(germes(page)).toHaveCount(1);
      await expect(germes(page)).toHaveAttribute('data-element', 'nutrition-sprout');
      const [bGerme, bTexte] = await Promise.all([germes(page).boundingBox(), texte.boundingBox()]);
      expect(bGerme!.y + bGerme!.height).toBeLessThanOrEqual(bTexte!.y);
      await decorHorsAccessibiliteEtImpression(page, germes(page));
      await page.emulateMedia({ media: 'print' });
      await expect(texte).toBeVisible();
      await page.emulateMedia({ media: 'screen' });
    });
  }
});
