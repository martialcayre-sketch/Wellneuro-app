// Bibliothèque — la page entière ne défile pas en largeur.
//
// Le rayon « Assignations et packs » faisait défiler toute la page sur iPhone :
// la ligne « Vue catégories » du formulaire de création d'un pack posait deux
// sélecteurs et leurs libellés sur une seule ligne, sans retour. L'E2E du rayon
// Fiches conseils (lot 6b de D-251) l'a constaté, et a dû borner sa propre
// vérification à sa zone. Ce banc tient la page entière.
//
// Tourne sur les deux projets ; sur Desktop il est trivialement vert, c'est
// iPhone 13 qui le rend utile.
//
// Depuis PRA-6g, il tient aussi le reflow à 320 px (WCAG 1.4.10 : zoom 200 %
// sur un téléphone) de deux écrans praticien que le constat PRA-6 (§3.7) a vus
// déborder : le rayon Connaissances (P46) et l'import d'un compte rendu dans
// l'onglet Biologie du dossier (P25). La largeur est posée par le test :
// Chromium et WebKit le jouent tous deux à 320 px.
import { test, expect, type Page } from '@playwright/test';
import { PRATICIEN_EMAIL, praticienSessionCookie } from './helpers/auth';

/**
 * Les éléments, et les TEXTES, qui dépassent le bord droit de la page. Sur
 * échec, les fautifs sont nommés (balise et classes). Un élément dans un
 * conteneur à défilement horizontal VOULU (le tableau des assignations,
 * `overflow-x-auto`) n'est pas un débordement de la page.
 *
 * Les nœuds de texte comptent à part : un mot sans espace qui dépasse sa boîte
 * (un nom de drapeau dans un message) fait défiler la page sans qu'aucun
 * élément ne dépasse — c'était le cas de P46.
 */
async function debordantsDeLaPage(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const largeur = document.documentElement.clientWidth;
    if (document.documentElement.scrollWidth <= largeur) return [];
    const dansUnDefilement = (e: Element | null) => {
      for (let p = e; p; p = p.parentElement) {
        const x = getComputedStyle(p).overflowX;
        if (x === 'auto' || x === 'scroll' || x === 'hidden') return true;
      }
      return false;
    };
    const nom = (e: Element) => `${e.tagName.toLowerCase()}[${String(e.getAttribute('class') ?? '').slice(0, 120)}]`;
    const elements = [...document.querySelectorAll('body *')]
      .filter(e => e.getBoundingClientRect().right > largeur + 1 && !dansUnDefilement(e.parentElement))
      .map(nom);
    const textes: string[] = [];
    const parcours = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = parcours.nextNode(); n; n = parcours.nextNode()) {
      if (!n.textContent?.trim() || !n.parentElement) continue;
      const plage = document.createRange();
      plage.selectNodeContents(n);
      if (plage.getBoundingClientRect().right > largeur + 1 && !dansUnDefilement(n.parentElement)) {
        textes.push(`texte dans ${nom(n.parentElement)}`);
      }
    }
    if (elements.length > 0 || textes.length > 0) return [...elements, ...textes].slice(0, 8);
    // Rien ne dépasse, et la page défile pourtant : un débordement interne à
    // un élément qui, lui, tient dans l'écran (le contenu d'une liste
    // `<select>` sous WebKit, PRA-6m). Le coupable est nommé par retrait : le
    // plus profond élément dont le retrait (`display: none`, rétabli aussitôt)
    // ramène la page à sa largeur.
    const chaine: string[] = [];
    let courant: Element = document.body;
    for (let profondeur = 0; profondeur < 40; profondeur++) {
      const coupable = [...courant.children].find(enfant => {
        const style = (enfant as HTMLElement).style;
        const avant = style.display;
        style.display = 'none';
        const tient = document.documentElement.scrollWidth <= largeur;
        style.display = avant;
        return tient;
      });
      if (!coupable) break;
      chaine.push(nom(coupable).slice(0, 60));
      courant = coupable;
    }
    const mesure = (e: Element) => {
      const style = getComputedStyle(e);
      return `largeur ${Math.round(e.getBoundingClientRect().width)}, scrollWidth ${e.scrollWidth}, overflow ${style.overflowX}, appearance ${style.appearance}`;
    };
    return [`par retrait : ${chaine.slice(-3).join(' > ') || 'aucun'} (${courant === document.body ? '' : mesure(courant)}) ; parent : ${courant.parentElement ? mesure(courant.parentElement) : ''}`];
  });
}

async function attendreAucunDebordement(page: Page) {
  const debordants = await debordantsDeLaPage(page);
  expect(debordants, `Débordement horizontal : ${debordants.join(' | ')}`).toEqual([]);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
  ).toBe(true);
}

test.describe('Bibliothèque — aucun défilement horizontal de la page', () => {
  test('le rayon Questionnaires, assignations et packs compris, tient dans la largeur de l’écran', async ({ page }) => {
    await page.context().addCookies([await praticienSessionCookie(PRATICIEN_EMAIL)]);
    await page.goto('/dashboard/bibliotheque/questionnaires');
    await expect(page.getByRole('heading', { name: 'Questionnaires', exact: true })).toBeVisible({ timeout: 10000 });
    // Mesurer après les chargements qui donnent leur largeur aux sélecteurs et
    // aux listes. Le titre du formulaire n'est rendu qu'une fois les
    // questionnaires et le registre des catégories chargés (le panneau parent
    // les attend ensemble) ; la liste des packs, elle, se charge ensuite, dans
    // `PacksPanel` même.
    await expect(page.getByRole('heading', { name: 'Nouveau pack de questionnaires' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Chargement des packs...')).toHaveCount(0, { timeout: 10000 });

    await attendreAucunDebordement(page);
  });
});

test.describe('Reflow à 320 px (WCAG 1.4.10) — PRA-6g', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.context().addCookies([await praticienSessionCookie(PRATICIEN_EMAIL)]);
  });

  // Deux états selon `WN_RECHERCHE_CORPUS_ENABLED`, qui n'est pas posé au banc
  // (le `.env.local` d'un poste peut le poser) : le message d'indisponibilité,
  // celui qui débordait de 5 px, ou le formulaire de recherche. Les deux
  // doivent tenir.
  test('P46 — le rayon Connaissances tient à 320 px', async ({ page }) => {
    await page.goto('/dashboard/bibliotheque/connaissances');
    await expect(page.getByRole('heading', { name: 'Connaissances', exact: true })).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByRole('status').filter({ hasText: 'La recherche corpus clinique' }).or(page.getByRole('button', { name: 'Rechercher' })),
    ).toBeVisible({ timeout: 10000 });

    await attendreAucunDebordement(page);
  });

  // Sophie Nicola (PAT_SEED_01), déjà seedée. L'import vit derrière
  // `WN_BIO_INGEST_ENABLED`, posé au banc (`webServer.env` et build).
  test('P25 — l’import d’un compte rendu, onglet Biologie, tient à 320 px', async ({ page }) => {
    await page.goto('/dashboard/patients/PAT_SEED_01?onglet=biologie');
    await expect(page.getByRole('heading', { name: 'Importer un compte rendu de laboratoire' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByLabel(/Compte rendu \(PDF de 10 Mo/)).toBeVisible();

    await attendreAucunDebordement(page);
  });
});

// PRA-6m — la convention du dépôt, plus stricte que WCAG : 195 px CSS, soit
// le zoom 200 % d'un téléphone de 390 px (D-506, la même que le portail
// patient depuis PAT-7e et PAT-7f). Le constat PRA-6 (§3.7) y voyait seize
// écrans praticien déborder. Chaque écran tenu ici est un écran corrigé par
// PRA-6m ou déjà tenu. Comme à 320 px, la largeur est posée par le test, et les deux moteurs
// le jouent. Le titre de page suffit comme signal de rendu : les écrans dont
// le débordement venait d'un contenu chargé après lui l'attendent en plus.
const ECRANS_195: Array<{ id: string; url: string; titre: string; attendre?: (page: Page) => Promise<void> }> = [
  { id: 'P01 Fil du jour', url: '/dashboard', titre: 'Le Fil du jour',
    // Les cartes du Fil se chargent après le titre : c'est elles qui débordaient.
    attendre: async page => {
      await expect(page.getByTestId('fil-du-jour').getByRole('heading', { name: "Aujourd'hui" })).toBeVisible({ timeout: 10000 });
    } },
  { id: 'P25 Biologie du dossier', url: '/dashboard/patients/PAT_SEED_01?onglet=biologie', titre: 'Importer un compte rendu de laboratoire' },
  { id: 'P33 Agenda', url: '/dashboard/agenda', titre: 'Agenda & consultations' },
  { id: 'P34 Copilote', url: '/dashboard/copilote', titre: 'Consultation copilote' },
  { id: 'P35 Trajectoires', url: '/dashboard/trajectoires', titre: 'Fiche-trajectoire' },
  { id: 'P36 Cabinet', url: '/dashboard/cabinet', titre: 'Comptes du cabinet' },
  // La liste des packs se charge après le titre : sa rangée d'actions débordait.
  // Le pack de base du seed (`PACK_SEED_BASE`) la rend : le test attend son
  // bouton « Modifier », sans quoi il passerait sur une liste vide.
  { id: 'P37 Questionnaires', url: '/dashboard/bibliotheque/questionnaires', titre: 'Questionnaires',
    attendre: async page => {
      await expect(page.getByRole('heading', { name: 'Nouveau pack de questionnaires' })).toBeVisible({ timeout: 10000 });
      await expect(page.getByText('Chargement des packs...')).toHaveCount(0, { timeout: 10000 });
      await expect(page.getByRole('button', { name: 'Modifier', exact: true }).first()).toBeVisible({ timeout: 10000 });
    } },
  { id: 'P40 Analyses biologiques', url: '/dashboard/bibliotheque/biologie', titre: 'Analyses biologiques' },
  { id: 'P44 Compléments', url: '/dashboard/bibliotheque/complements', titre: 'Compléments alimentaires' },
  // Comme à 320 px : le message d'indisponibilité au banc (sans
  // `WN_RECHERCHE_CORPUS_ENABLED`), le formulaire de recherche sur un poste
  // qui le pose. Le test attend l'un ou l'autre.
  { id: 'P46 Connaissances', url: '/dashboard/bibliotheque/connaissances', titre: 'Connaissances',
    attendre: async page => {
      await expect(
        page.getByRole('status').filter({ hasText: 'La recherche corpus clinique' }).or(page.getByRole('button', { name: 'Rechercher' })),
      ).toBeVisible({ timeout: 10000 });
    } },
  { id: 'P47 Corpus', url: '/dashboard/corpus', titre: 'Atelier corpus' },
  // Sans `WN_C4_ENABLED`, que le banc ne pose pas, l'atelier n'affiche que son
  // message de fermeture : ses grilles et compteurs, corrigés par PRA-6m, ne
  // sont mesurés que sur un poste qui pose le drapeau.
  { id: 'P49 Règles', url: '/dashboard/regles', titre: 'Atelier de règles cliniques' },
  { id: 'P51 Synthèses', url: '/dashboard/synthese', titre: 'Synthèse IA & Booklet' },
  { id: 'P52 Documents', url: '/dashboard/documents', titre: 'Documents contextuels' },
  { id: 'P53 Correspondance', url: '/dashboard/correspondance', titre: 'Correspondance' },
  { id: 'P57 Paramètres', url: '/dashboard/parametres', titre: 'Paramètres' },
];

test.describe('Reflow à 195 px (zoom 200 % sur 390 px) — PRA-6m', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 195, height: 332 });
    await page.context().addCookies([await praticienSessionCookie(PRATICIEN_EMAIL)]);
  });

  for (const ecran of ECRANS_195) {
    test(`${ecran.id} tient à 195 px`, async ({ page }) => {
      await page.goto(ecran.url);
      await expect(page.getByRole('heading', { name: ecran.titre, exact: true })).toBeVisible({ timeout: 15000 });
      if (ecran.attendre) await ecran.attendre(page);
      await page.waitForLoadState('networkidle');

      await attendreAucunDebordement(page);
    });
  }
});
