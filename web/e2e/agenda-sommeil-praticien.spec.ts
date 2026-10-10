// Le panneau praticien de l'agenda du sommeil, dans un vrai navigateur : le
// chronogramme et la clôture.
//
// Né du LOT-07 de la campagne 2026-10-07-agenda-sommeil-adhesion : depuis sa
// création (#427, 2026-07-28), le chronogramme ne dessinait AUCUNE nuit — sur
// l'axe des heures inversé, recharts passe à la forme une hauteur négative, que
// `BarreNuit` écartait. Le banc jsdom ne pouvait pas le voir : recharts n'y rend
// rien. Ce spec lit la géométrie que le navigateur reçoit — chaque barre court
// de son repère du soir à son lever, sur les graduations de l'axe — et rougit
// sur le code d'avant le correctif.
//
// La clôture (LOT-06) : sous sept nuits exploitables, le geste demande
// confirmation et « Laisser l’agenda ouvert » ne ferme rien ; à sept, il agrège
// sans rien demander.
//
// De la clôture au dossier exporté (trou nommé au LOT-08, fermé au LOT-10) :
// sept nuits « je ne sais pas » pour l'endormissement, clôturées, puis le PDF
// lu tel qu'il est dessiné — l'endormissement y est « Non calculé », jamais 0 ;
// et le témoin, sept nuits à endormissement connu, qui doit y paraître chiffré.
//
// Patient fictif Michel Dogné (PAT_SEED_03), autorisé. Les nuits sont posées en
// base (`poserNuitsAgendaSommeil`, validées par le validateur de la route).
import { test, expect, type Page } from '@playwright/test';
import { praticienSessionCookie } from './helpers/auth';
import {
  resetPortailState,
  closePrisma,
  poserNuitsAgendaSommeil,
  lireStatutAssignation,
} from './helpers/db';
import { lignesPdf } from './helpers/textePdf';
import { dateJourParis } from '../src/lib/dateParis';
import { decalerDate } from '../src/lib/agenda-sommeil/nuit';
import type { NuitReponses } from '../src/lib/agenda-sommeil/types';

const PATIENT = { idPatient: 'PAT_SEED_03', email: 'michel.dogne@fictif.wellneuro.fr' };

const NUIT: NuitReponses = {
  heureCoucher: '22:00',
  heureLever: '08:00',
  latence: 'lt15',
  qualite: 4,
  reveils: { dureeTotale: 'aucun', nombre: 0 },
  aideSommeil: 'aucune',
  extinctionImmediate: true,
  leverImmediat: true,
};

// Les nuits datées à rebours, la dernière la veille.
function nuitsJusquAHier(reponses: NuitReponses[]): { dateNuit: string; reponses: NuitReponses }[] {
  const aujourdHui = dateJourParis();
  return reponses.map((r, i) => ({ dateNuit: decalerDate(aujourdHui, i - reponses.length), reponses: r }));
}

async function ouvrirPanneau(page: Page, nuits: NuitReponses[]): Promise<string> {
  await resetPortailState(PATIENT.idPatient);
  await page.context().addCookies([await praticienSessionCookie()]);
  const creation = await page.request.post('/api/praticien/assignations', {
    data: { emailPatient: PATIENT.email, idQuestionnaire: 'Q_SOM_09' },
  });
  expect(creation.status()).toBe(200);
  const { idAssignation } = (await creation.json()) as { idAssignation: string };
  await poserNuitsAgendaSommeil(PATIENT.idPatient, idAssignation, 'agenda-sommeil-v4', nuitsJusquAHier(nuits));

  await page.goto(`/dashboard/patients/${PATIENT.idPatient}`);
  await page.getByRole('button', { name: /Agenda du sommeil/ }).first().click();
  await expect(page.getByRole('button', { name: 'Clôturer et agréger' })).toBeVisible();
  return idAssignation;
}

// Ordonnée SVG d'une graduation de l'axe des heures (« 22h », « 0h »…).
async function graduation(page: Page, heure: string): Promise<number> {
  const texte = page.locator('.recharts-yAxis-tick-labels text').filter({ hasText: new RegExp(`^${heure}$`) });
  await expect(texte).toHaveCount(1);
  return Number(await texte.getAttribute('y'));
}

// Ce que `BarreNuit` a réellement posé dans le SVG, nuit par nuit : le haut et
// le pied de ses rectangles pleins (le liseré du week-end, sans remplissage,
// n'en est pas), ses portions claires, et le tiret de « je ne sais pas ».
// `null` : rien de dessiné. Attend d'abord une forme par nuit : recharts
// enregistre axes et barres par effets, les graduations peuvent précéder les
// barres d'un rendu.
async function barres(page: Page, nombre: number) {
  await expect(page.locator('.recharts-bar-rectangle')).toHaveCount(nombre);
  return page.locator('.recharts-bar-rectangle').evaluateAll((groupes) =>
    groupes.map((g) => {
      const rects = [...g.querySelectorAll('rect')].filter((r) => r.getAttribute('fill') !== 'none');
      if (rects.length === 0) return null;
      const boite = (r: Element) => ({ y: Number(r.getAttribute('y')), h: Number(r.getAttribute('height')) });
      const haut = Math.min(...rects.map((r) => boite(r).y));
      const pied = Math.max(...rects.map((r) => boite(r).y + boite(r).h));
      const claires = rects.filter((r) => r.getAttribute('opacity') !== null).map(boite);
      const tiret = g.querySelector('line[stroke-dasharray="2 2"]');
      return { haut, pied, claires, tiret: tiret === null ? null : Number(tiret.getAttribute('y1')) };
    }),
  );
}

test.afterAll(async () => {
  await resetPortailState(PATIENT.idPatient);
  await closePrisma();
});

test.describe('agenda du sommeil — panneau praticien', () => {
  test('le chronogramme dessine chaque nuit de son repère du soir à son lever', async ({ page }) => {
    await ouvrirPanneau(page, [
      // Portions claires aux deux bouts : endormissement en tête, éveil au lit
      // en pied (réveil à 5 h, levé à 6 h).
      { ...NUIT, heureLever: '06:00', latence: 'e15_30', leverImmediat: false, heureReveilFinal: '05:00' },
      // « Je ne sais pas » : aucune portion, un tiret en tête ([[D-271]]).
      { ...NUIT, heureCoucher: '00:00', latence: 'inconnu' },
      NUIT,
    ]);

    const [h22, h0, h6, h8] = [
      await graduation(page, '22h'),
      await graduation(page, '0h'),
      await graduation(page, '6h'),
      await graduation(page, '8h'),
    ];
    // Le soir en haut : l'axe est inversé, c'est lui qui donnait la hauteur
    // négative.
    expect(h22).toBeLessThan(h6);

    const lues = await barres(page, 3);
    expect(lues).toHaveLength(3);
    const [n1, n2, n3] = lues;
    expect(n1).not.toBeNull();
    expect(n2).not.toBeNull();
    expect(n3).not.toBeNull();
    expect(n1!.haut).toBeCloseTo(h22, 0);
    expect(n1!.pied).toBeCloseTo(h6, 0);
    expect(n2!.haut).toBeCloseTo(h0, 0);
    expect(n2!.pied).toBeCloseTo(h8, 0);
    expect(n2!.tiret).not.toBeNull();
    expect(n2!.tiret!).toBeCloseTo(n2!.haut, 0);
    expect(n3!.haut).toBeCloseTo(h22, 0);
    expect(n3!.pied).toBeCloseTo(h8, 0);
    expect(n1!.tiret).toBeNull();
    expect(n3!.tiret).toBeNull();

    // Les portions claires de la première nuit, à leur place et à leur
    // taille : l'endormissement (classe 15-30 min, centre 22 min) en tête,
    // l'éveil au lit (de 5 h à 6 h) en pied, sur une barre de 8 h.
    const parHeure = (h6 - h22) / 8;
    expect(n1!.claires).toHaveLength(2);
    const [latence, eveilMatin] = [...n1!.claires].sort((a, b) => a.y - b.y);
    expect(latence.y).toBeCloseTo(h22, 0);
    expect(latence.h).toBeCloseTo((22 / 60) * parHeure, 0);
    expect(eveilMatin.y + eveilMatin.h).toBeCloseTo(h6, 0);
    expect(eveilMatin.h).toBeCloseTo(parHeure, 0);
    // « Je ne sais pas » : aucune portion dessinée, le tiret seul.
    expect(n2!.claires).toHaveLength(0);

    // Et le navigateur les peint : une barre a une hauteur à l'écran.
    const boite = await page.locator('.recharts-bar-rectangle').first().boundingBox();
    expect(boite?.height ?? 0).toBeGreaterThan(20);

    // L'infobulle se lit au survol : sans objet sur un écran tactile.
    if (!test.info().project.use.isMobile) {
      await page.locator('.recharts-bar-rectangle').nth(1).hover();
      await expect(page.getByText('Essai de dormir 00:00 · lever 08:00')).toBeVisible();
      await expect(page.getByText('Endormissement : Ne sait pas')).toBeVisible();
    }
  });

  test('sous sept nuits, la clôture demande confirmation et « Laisser l’agenda ouvert » ne ferme rien', async ({
    page,
  }) => {
    // Six nuits : un cran sous le seuil (`MIN_NUITS_AGREGATS`).
    const idAssignation = await ouvrirPanneau(page, Array.from({ length: 6 }, () => NUIT));
    const statutAvant = await lireStatutAssignation(idAssignation);
    // Ni le premier clic ni « Laisser l’agenda ouvert » ne doivent appeler la
    // route de clôture : un statut relu en base ne verrait pas une écriture
    // encore en vol.
    const appelsCloture: string[] = [];
    page.on('request', (r) => {
      if (new URL(r.url()).pathname.endsWith('/agenda-sommeil/cloture')) appelsCloture.push(r.method());
    });

    await page.getByRole('button', { name: 'Clôturer et agréger' }).click();
    await expect(
      page.getByRole('alert').filter({
        hasText:
          'Moins de 7 nuits exploitables : la clôture ne calculera aucune moyenne, et le patient ne pourra plus noter de nuit.',
      }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Laisser l’agenda ouvert' }).click();

    await expect(page.getByRole('button', { name: 'Clôturer et agréger' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Clôturer quand même' })).toHaveCount(0);
    await expect(page.getByText(/^En cours · 6 nuits notées/)).toBeVisible();
    expect(appelsCloture).toEqual([]);
    expect(await lireStatutAssignation(idAssignation)).toBe(statutAvant);
    expect(statutAvant).not.toBe('Complété');
  });

  test('à sept nuits, la clôture agrège sans rien demander', async ({ page }) => {
    const idAssignation = await ouvrirPanneau(page, Array.from({ length: 7 }, () => NUIT));

    const reponseAttendue = page.waitForResponse((r) => new URL(r.url()).pathname.endsWith('/agenda-sommeil/cloture'));
    await page.getByRole('button', { name: 'Clôturer et agréger' }).click();
    await expect(page.getByRole('button', { name: 'Clôturer quand même' })).toHaveCount(0);
    expect((await reponseAttendue).status()).toBe(200);

    await expect(page.getByRole('button', { name: /Clôtur/ })).toHaveCount(0);
    await expect(page.getByText(/^Clôturé · 7 nuits notées/)).toBeVisible();
    expect(await lireStatutAssignation(idAssignation)).toBe('Complété');
  });

  // Aucune nuit n'a d'endormissement connu : la médiane n'a rien à porter. Les
  // deux versions de l'export, puisque le masqueur de la version « IA externe »
  // ne touche que les textes libres.
  //
  // « Non calculé » s'écrit aussi pour un agrégat qui MANQUE (clôture repliée
  // sur le seul nombre de nuits, clé perdue en route) : la qualité moyenne, que
  // ces nuits renseignent, prouve que la même clôture a bien agrégé.
  test('sept nuits « je ne sais pas », clôturées : le dossier exporté écrit l’endormissement « Non calculé », jamais 0', async ({ page }) => {
    await ouvrirPanneau(page, Array.from({ length: 7 }, () => ({ ...NUIT, latence: 'inconnu' as const })));
    await cloturerDepuisLePanneau(page);

    for (const version of ['ia-externe', 'complete'] as const) {
      const texte = await texteDuDossier(page, version);
      expect(texte.match(/Latence d'endormissement médiane :/g) ?? []).toHaveLength(1);
      expect(texte).toContain("Latence d'endormissement médiane : Non calculé : données insuffisantes");
      expect(texte).not.toMatch(/Latence d'endormissement médiane : 0/);
      expect(texte).toMatch(/Qualité subjective moyenne : 4\b/);
    }
  });

  // Le témoin : un endormissement connu (« en moins de 15 min », centre de
  // classe 8 min) passe jusqu'au dossier. Sans lui, une médiane toujours
  // « Non calculé » laisserait le test du dessus vert.
  test('sept nuits « en moins de 15 min », clôturées : le dossier exporté écrit la médiane chiffrée', async ({ page }) => {
    await ouvrirPanneau(page, Array.from({ length: 7 }, () => NUIT));
    await cloturerDepuisLePanneau(page);

    for (const version of ['ia-externe', 'complete'] as const) {
      const texte = await texteDuDossier(page, version);
      expect(texte).toContain("Latence d'endormissement médiane : 8 min");
      expect(texte).not.toContain("Latence d'endormissement médiane : Non calculé");
    }
  });
});

async function cloturerDepuisLePanneau(page: Page): Promise<void> {
  const reponseAttendue = page.waitForResponse((r) => new URL(r.url()).pathname.endsWith('/agenda-sommeil/cloture'));
  await page.getByRole('button', { name: 'Clôturer et agréger' }).click();
  expect((await reponseAttendue).status()).toBe(200);
  await expect(page.getByText(/^Clôturé · 7 nuits notées/)).toBeVisible();
}

// Le dossier exporté, lignes jointes : un champ trop long se replie sur deux
// lignes dessinées.
async function texteDuDossier(page: Page, version: 'ia-externe' | 'complete'): Promise<string> {
  const pdf = await page.request.get(`/api/praticien/export-dossier?idPatient=${PATIENT.idPatient}&version=${version}`);
  expect(pdf.status()).toBe(200);
  return (await lignesPdf(await pdf.body())).join(' ').replace(/\s+/g, ' ');
}
