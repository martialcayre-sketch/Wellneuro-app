// Bibliothèque — rayon « Fiches conseils » ([[D-251]] §5 à §7, lot 6).
//
// Le parcours du responsable sur une version de fiche d'assiette : la relire
// côte à côte, déclarer la relecture intégrale, valider en deux temps, puis la
// retirer avec un motif. Les actes sont posés par l'ÉCRAN, via la route — la
// fixture ne dépose qu'un brouillon (`DC-16`). Texte SYNTHÉTIQUE uniquement
// (§4) ; aucun dossier patient n'est touché.
//
// Les tables sont append-only : chaque run (et chaque projet) ajoute une
// version. Le spec ne suppose donc jamais « v1 » : il vise le numéro rendu par
// la fixture.
import { test, expect, type Locator } from '@playwright/test';
import { PRATICIEN_EMAIL, praticienSessionCookie } from './helpers/auth';
import {
  closePrisma,
  deposerVersionFicheE2E,
  lireActesFicheE2E,
  PHRASE_VERBATIM_FICHE_E2E,
  PLATE_FICHE_E2E,
  versionsFicheE2EEncoreValidees,
} from './helpers/db';

const URL_ACTES = '/api/praticien/fiches-assiette/actes';
const MOTIF = 'Retrait de banc : fiche synthétique, jamais servie.';

// Aucun élément de LA ZONE du rayon ne sort de la largeur de l'écran. La page
// entière est tenue par `bibliotheque-mobile.spec.ts` ; ce banc-ci en a
// révélé le débordement, puis a été borné à sa zone. Sur échec, les éléments
// fautifs sont nommés (balise et classes, jamais leur texte). Deux formes : une boîte qui sort de l'écran, ou un texte qui
// sort de sa boîte — un mot long non coupé déborde de son paragraphe sans que
// le paragraphe bouge (mutation jouée : la première forme seule ne le voyait
// pas).
async function sansDebordement(zone: Locator) {
  const debordants = await zone.evaluate(racine => {
    const largeur = document.documentElement.clientWidth;
    return [racine, ...racine.querySelectorAll('*')]
      .filter(e => {
        const r = e.getBoundingClientRect();
        if (r.right > largeur + 1 || r.left < -1) return true;
        return getComputedStyle(e).overflowX === 'visible' && e.clientWidth > 0 && e.scrollWidth > e.clientWidth + 1;
      })
      .slice(0, 8)
      .map(e => `${e.tagName.toLowerCase()}[${String(e.getAttribute('class') ?? '').slice(0, 120)}]`);
  });
  expect(debordants, `Débordement horizontal : ${debordants.join(' | ')}`).toEqual([]);
}

test.describe('Bibliothèque — rayon Fiches conseils', () => {
  test.afterAll(async () => {
    await closePrisma();
  });

  test('relire côte à côte, déclarer la relecture, valider en deux temps, retirer avec motif', async ({ page }) => {
    await page.context().addCookies([await praticienSessionCookie(PRATICIEN_EMAIL)]);

    // Filet d'ENTRÉE — un afterAll ne tourne pas sur un run tué : ce qu'un run
    // précédent a laissé validé se retire par la vraie route (donc par
    // `decision.ts`, jamais par un acte écrit à la main).
    for (const v of await versionsFicheE2EEncoreValidees()) {
      const r = await page.request.post(URL_ACTES, {
        data: { idVersion: v.id, acte: 'retiree', contenuSha256Vu: v.contenuSha256, dernierActeVu: v.dernierActe, motif: MOTIF },
      });
      expect(r.ok()).toBe(true);
    }

    const { idVersion, numero, contenuSha256 } = await deposerVersionFicheE2E();

    await page.goto('/dashboard/bibliotheque');
    await expect(page.getByRole('heading', { name: 'Bibliothèque', exact: true })).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: /Fiches conseils/ }).click();

    const ligne = page.getByTestId(`fiche-assiette-${PLATE_FICHE_E2E}`);
    await expect(ligne).toContainText('Assiette végétale', { timeout: 10000 });
    await expect(ligne).toContainText(`v${numero} · À valider`);
    await expect(ligne).toContainText('Aucune version de référence');
    await ligne.getByRole('button', { name: `Relire la v${numero}`, exact: true }).click();

    // La surface de relecture, AVANT toute attestation (D-195 §2).
    const relecture = page.getByRole('region', { name: `Relecture — Assiette végétale, v${numero}` });
    // Délai large : en serveur de dev, la première lecture compile la route à
    // froid (constaté : plus de dix secondes).
    await expect(relecture).toBeVisible({ timeout: 30000 });
    const source = relecture.getByTestId('relecture-source');
    await expect(source).toContainText(PHRASE_VERBATIM_FICHE_E2E);
    await expect(source).toContainText('Page 1');
    expect(await source.innerText()).not.toContain('<!--');
    await expect(relecture.getByTestId('relecture-adaptation')).toContainText(PHRASE_VERBATIM_FICHE_E2E);
    await expect(relecture.getByText(/Aucune anomalie/)).toBeVisible();
    await sansDebordement(relecture);

    // Valider : la déclaration d'abord, puis armer, puis confirmer.
    const valider = relecture.getByRole('button', { name: 'Valider la fiche' });
    await expect(valider).toBeDisabled();
    await relecture.getByRole('checkbox', { name: /relu cette version en entier/ }).check();
    await valider.click();
    const [reqV, repV] = await Promise.all([
      page.waitForRequest(r => r.url().endsWith(URL_ACTES) && r.method() === 'POST'),
      page.waitForResponse(r => r.url().endsWith(URL_ACTES)),
      relecture.getByRole('button', { name: 'Confirmer la validation' }).click(),
    ]);
    expect(reqV.postDataJSON()).toEqual({
      idVersion,
      acte: 'validee',
      contenuSha256Vu: contenuSha256,
      dernierActeVu: null,
      relectureIntegrale: true,
    });
    expect(await repV.json()).toMatchObject({ ok: true, etat: { etat: 'validee' } });
    await expect(relecture.getByText(`Version ${numero} validée. Version de référence : v${numero}.`)).toBeVisible();
    // Rechargée : la déclaration valait pour l'affichage précédent.
    await expect(relecture.getByRole('checkbox')).toHaveCount(0);

    // Retirer : l'écran dit ce que le retrait change à la version de référence.
    await relecture.getByRole('button', { name: 'Retirer la version' }).click();
    await expect(relecture.getByText(/cette fiche n’aura plus aucune version de référence/)).toBeVisible();
    const confirmerRetrait = relecture.getByRole('button', { name: 'Confirmer le retrait' });
    await expect(confirmerRetrait).toBeDisabled();
    await relecture.getByLabel('Motif du retrait').fill(MOTIF);
    const [reqR, repR] = await Promise.all([
      page.waitForRequest(r => r.url().endsWith(URL_ACTES) && r.method() === 'POST'),
      page.waitForResponse(r => r.url().endsWith(URL_ACTES)),
      confirmerRetrait.click(),
    ]);
    expect(await repR.json()).toMatchObject({ ok: true, etat: { etat: 'retiree', motif: MOTIF } });
    await expect(relecture.getByText(`Version ${numero} retirée. Aucune version de référence.`)).toBeVisible();

    // En base : deux actes, posés par la session, sur CE texte-là.
    const actes = await lireActesFicheE2E(idVersion);
    const validateur = PRATICIEN_EMAIL.toLowerCase();
    expect(actes.map(a => a.acte)).toEqual(['validee', 'retiree']);
    expect(actes[0]).toMatchObject({ validateur, relectureIntegrale: true, motif: null, contenuSha256, confirmationRegistre: false });
    expect(actes[1]).toMatchObject({ validateur, relectureIntegrale: false, motif: MOTIF, contenuSha256 });
    // Le retrait porte le jeton RECHARGÉ après la validation, pas celui d'avant.
    expect(reqR.postDataJSON()).toEqual({
      idVersion,
      acte: 'retiree',
      contenuSha256Vu: contenuSha256,
      dernierActeVu: actes[0].ordre,
      motif: MOTIF,
    });

    // Retour au rayon : la version reste, avec sa mention (§7, rien ne disparaît).
    await relecture.getByRole('button', { name: /Retour aux fiches/ }).click();
    await expect(ligne).toContainText(`v${numero} · Retirée`);
    await sansDebordement(page.getByRole('region', { name: 'Fiches conseils' }));
  });
});
