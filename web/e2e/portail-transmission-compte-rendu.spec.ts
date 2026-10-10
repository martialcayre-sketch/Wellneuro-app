// Transmission du compte rendu d'analyses PAR LE PATIENT ([[D-269]], BIO-INGEST
// LOT-04), prouvée de bout en bout au LOT-11 : un patient de fixture entre par
// son lien magique, trouve la surface depuis son hub, prend connaissance de
// « L'intelligence artificielle dans Wellneuro », dépose un PDF et lit
// « En attente » — le statut réel après un dépôt (« Reçu » suppose une
// lecture lancée par le praticien, donc l'IA : hors E2E, arbitrage du
// 2026-10-10).
//
// LE PARCOURS SE FAIT AU CLAVIER SEUL — Tab, Entrée, Espace — et chaque cible
// atteinte doit porter un focus VISIBLE. axe-core (WCAG 2.1 A et AA) passe sur
// les trois états de l'écran : accusé, formulaire, liste après dépôt. Zéro
// violation exigée ; aucune règle désactivée.
//
// NETTOYAGE PAR LE GESTE DU PRATICIEN : aucun code hors l'effacement nommé ne
// supprime un compte rendu (`staging.guard.test.ts`). Les dépôts sont donc
// ÉCARTÉS par la route praticien, avant et après — un document écarté est
// purgé et sort du plafond de 3.
//
// Patient fictif Michel Dogné (PAT_SEED_03), qu'aucun spec biologie ne lit.
// `workers: 1` : aucun autre spec ne tourne pendant celui-ci.
import { randomBytes } from 'node:crypto';
import { test, expect, type APIRequestContext, type Locator, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { praticienSessionCookie } from './helpers/auth';
import {
  closePrisma,
  provisionnerAccusesPorteTrust,
  transmissionsNonPurgees,
  transmissionsSur24h,
} from './helpers/db';

const PATIENT = { idPatient: 'PAT_SEED_03' };
const TITRE = 'Transmettre un compte rendu d’analyses';

test.afterAll(async () => {
  await closePrisma();
});

/** Écarte, par la route du praticien, tout document transmis encore non purgé. */
async function ecarterTransmissions(api: APIRequestContext) {
  for (const idCompteRendu of await transmissionsNonPurgees(PATIENT.idPatient)) {
    const res = await api.post('/api/praticien/biologie/import/ecart', {
      data: { idPatient: PATIENT.idPatient, idCompteRendu, motif: 'document_non_conforme' },
    });
    expect(res.status(), `écart de ${idCompteRendu}`).toBe(200);
  }
}

/**
 * Avance au Tab jusqu'à `cible`, puis exige un focus VISIBLE : l'état
 * `:focus-visible` ET un indicateur rendu (contour ou anneau).
 *
 * Sous WebKit, la touche est `Option+Tab` : Safari ne place par défaut que
 * les champs de formulaire dans l'ordre du Tab, et c'est `Option+Tab` (ou le
 * réglage « Tab sélectionne chaque élément ») qui y met liens et boutons —
 * le geste réel d'un utilisateur de Safari au clavier.
 */
let toucheTab = 'Tab';

async function tabulerJusqua(page: Page, cible: Locator, max = 80) {
  for (let i = 0; i < max; i++) {
    await page.keyboard.press(toucheTab);
    if (await cible.evaluate(el => el === document.activeElement)) {
      const focus = await cible.evaluate(el => {
        const style = getComputedStyle(el);
        return {
          visible: el.matches(':focus-visible'),
          indicateur: (style.outlineStyle !== 'none' && style.outlineWidth !== '0px') || style.boxShadow !== 'none',
        };
      });
      expect(focus, 'focus visible sur la cible atteinte au clavier').toEqual({ visible: true, indicateur: true });
      return;
    }
  }
  throw new Error(`cible jamais atteinte en ${max} Tab`);
}

async function sansViolationAxe(page: Page, etat: string) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(
    violations.map(v => `${v.id} (${v.impact}) : ${v.nodes.map(n => n.target.join(' ')).join(' | ')}`),
    `violations axe — ${etat}`,
  ).toEqual([]);
}

test('le patient transmet son compte rendu au clavier, du lien magique au statut « En attente »', async ({ context, browserName }) => {
  toucheTab = browserName === 'webkit' ? 'Alt+Tab' : 'Tab';
  // Accusés du gate du hub posés, TOUS les autres effacés — dont `usage_ia` :
  // l'écran passe par son étape d'accusé.
  await provisionnerAccusesPorteTrust(PATIENT.idPatient);
  await context.addCookies([await praticienSessionCookie()]);
  const api = context.request;
  await ecarterTransmissions(api);
  const deja = await transmissionsSur24h(PATIENT.idPatient);
  if (deja >= 9) {
    throw new Error(
      `${deja} dépôts sur 24 h pour ${PATIENT.idPatient} : le plafond de 10 serait atteint. Base locale réutilisée ` +
        '— T3 et le CI partent d’une base neuve.',
    );
  }

  let page: Page;
  try {
    // 1. Le lien magique ouvre la session, le hub mène à la surface. Le hub
    //    s'ouvre dans un SECOND onglet du même contexte : la page d'atterrissage
    //    navigue encore côté client, et sous WebKit un `goto` dans le même
    //    onglet entrait en course avec elle.
    const emission = await api.post('/api/praticien/token', {
      data: { idPatient: PATIENT.idPatient, action: 'lien_magique' },
    });
    expect(emission.ok()).toBe(true);
    const atterrissage = await context.newPage();
    await atterrissage.goto((await emission.json()).lien as string);
    await expect(atterrissage).toHaveURL(/\/portail\/(?!lien\/)/);
    page = await context.newPage();
    await atterrissage.close();
    await page.goto(`/portail/${PATIENT.idPatient}/questionnaires`);
    const lien = page.getByRole('link', { name: TITRE });
    await expect(lien).toBeVisible();
    await tabulerJusqua(page, lien);
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { level: 1, name: TITRE })).toBeVisible();

    // 2. Avant le premier envoi : l'accusé.
    await expect(page.getByRole('heading', { name: 'Avant votre premier envoi' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Envoyer à mon praticien' })).toHaveCount(0);
    await sansViolationAxe(page, 'étape d’accusé');
    await tabulerJusqua(page, page.getByRole('button', { name: 'J’en ai pris connaissance' }));
    await page.keyboard.press('Enter');

    // 3. Le formulaire : le champ est nommé par son libellé.
    const champ = page.getByLabel(/Votre compte rendu : un PDF de 10 Mo au plus/);
    await expect(champ).toBeVisible();
    await sansViolationAxe(page, 'formulaire de dépôt');
    const avant = await page.getByRole('listitem').filter({ hasText: 'Déposé le' }).count();

    await tabulerJusqua(page, champ);
    const selecteur = page.waitForEvent('filechooser');
    await page.keyboard.press('Space');
    // Un PDF minimal, unique par run : l'unicité (patient, empreinte) refuserait un doublon.
    await (await selecteur).setFiles({
      name: 'compte-rendu.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from(`%PDF-1.4\n% E2E LOT-11 ${randomBytes(8).toString('hex')}\n%%EOF\n`, 'utf8'),
    });
    await tabulerJusqua(page, page.getByRole('button', { name: 'Envoyer à mon praticien' }));
    await page.keyboard.press('Enter');

    // 4. Le succès est ANNONCÉ (région `status`), et le statut se lit.
    await expect(page.getByRole('status')).toHaveText('Votre compte rendu a été transmis à votre praticien.');
    const depots = page.getByRole('listitem').filter({ hasText: 'Déposé le' });
    await expect(depots).toHaveCount(avant + 1);
    await expect(depots.first()).toContainText('En attente');
    await expect(depots.first()).toContainText('Votre document est bien arrivé ; votre praticien ne l’a pas encore ouvert.');
    await sansViolationAxe(page, 'liste après dépôt');
  } finally {
    await ecarterTransmissions(api);
  }
});
