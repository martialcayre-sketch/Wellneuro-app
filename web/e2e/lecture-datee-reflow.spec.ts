// LA MESURE QUI MANQUAIT — cible native de `pointerdown`, `pointerup` et `click`
// pendant qu'un panneau INDÉPENDANT se résout au-dessus du bouton visé.
//
// CE QUE CE BANC PROUVE, et qu'aucune trace Playwright ne dit : « click action
// done » signifie que les événements bas niveau ont été ENVOYÉS, jamais que le
// bouton a reçu son `click`. Sur le run CI 34967533724, `/ce-qui-compte` a
// répondu à 12:21:51.133, soit ENTRE l'appui (.132) et le relâchement (.138) ;
// `CeQuiComptePanel` est rendu AU-DESSUS de la trajectoire, et sa ligne
// « Chargement des dépôts… » (22 caractères) cède la place à un paragraphe de
// cent caractères qui se replie sur plusieurs lignes en 390 px. La mise en page
// gagne une cinquantaine de pixels PENDANT le geste, et le relâchement tombe à
// côté de la cible.
//
// CE N'EST PAS UN DÉFAUT DE TEST. Un praticien qui tape « Retour au présent »
// sur téléphone pendant que ce panneau se résout tape ce qui a glissé sous son
// doigt — sur la seule surface dont le rôle est d'empêcher de confondre un état
// passé avec l'état actuel du patient.
import { test, expect } from '@playwright/test';
import { praticienSessionCookie } from './helpers/auth';
import { provisionEpisodeTrajectoire, cleanupEpisodeTrajectoire } from './helpers/db';

const PATIENT_ID = 'PAT_SEED_03';

type Trace = { phase: string; cible: string; scrollY: number; haut: number };

test.describe.configure({ mode: 'serial' });

test.describe('Lecture datée — le contenu ne saute pas sous le doigt', () => {
  test.beforeAll(async () => {
    await provisionEpisodeTrajectoire(PATIENT_ID);
  });
  test.afterAll(async () => {
    await cleanupEpisodeTrajectoire();
  });

  test('le relâchement atteint le bouton même si un panneau se résout au-dessus pendant le geste', async ({
    page,
    context,
  }) => {
    await context.addCookies([await praticienSessionCookie()]);

    // Le panneau indépendant est RETENU : sa réponse sera libérée à la main,
    // entre l'appui et le relâchement. C'est la seule façon de rendre la course
    // déterministe — en CI elle dépend de la charge, ce qui l'a fait passer pour
    // un flake depuis le 2026-09-07.
    let libererCeQuiCompte: (() => void) | null = null;
    const ceQuiCompteEnAttente = new Promise<void>(resolve => {
      libererCeQuiCompte = resolve;
    });
    await page.route('**/api/praticien/ce-qui-compte*', async route => {
      await ceQuiCompteEnAttente;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, entrees: [] }),
      });
    });

    // Enregistreur en phase de CAPTURE, au niveau `document` : il voit la cible
    // native de chaque événement, y compris ceux qui n'atteignent aucun bouton.
    await page.addInitScript(() => {
      (window as unknown as { __traces: Trace[] }).__traces = [];
      for (const phase of ['pointerdown', 'pointerup', 'click']) {
        document.addEventListener(
          phase,
          (evenement: Event) => {
            const cible = evenement.target as HTMLElement | null;
            const bouton = document.querySelector<HTMLElement>('[data-sortie-presente]');
            (window as unknown as { __traces: Trace[] }).__traces.push({
              phase,
              cible: cible ? `${cible.tagName}:${(cible.textContent || '').trim().slice(0, 28)}` : 'null',
              scrollY: Math.round(window.scrollY),
              haut: bouton ? Math.round(bouton.getBoundingClientRect().top) : -1,
            });
          },
          true,
        );
      }
    });

    await page.goto(`/dashboard/patients/${PATIENT_ID}?onglet=trajectoire`);
    const panneau = page.getByRole('region', { name: 'Fiche-trajectoire' });
    await expect(panneau).toBeVisible();

    // Ouvrir la lecture datée par le bouton texte (la géométrie de la Spirale
    // est une autre affaire — voir `fiche-trajectoire-peuplee.spec.ts`).
    await panneau.getByRole('button', { name: 'T0 · 01/06/2026' }).click();
    const bandeau = page.getByText(/Vous lisez l’état du 01\/06\/2026/);
    await expect(bandeau).toBeVisible();

    const sortie = page.getByRole('button', { name: 'Retour au présent' });
    await sortie.scrollIntoViewIfNeeded();
    const boite = await sortie.boundingBox();
    expect(boite, 'le bouton de sortie doit avoir une boîte').not.toBeNull();

    // LE GESTE, EN TROIS TEMPS — appui, résolution du panneau du dessus,
    // relâchement. Un `click()` Playwright ne permettrait pas d'intercaler.
    await page.mouse.move(boite!.x + boite!.width / 2, boite!.y + boite!.height / 2);
    await page.mouse.down();
    libererCeQuiCompte!();
    await expect(page.getByText(/Aucun dépôt à ce jour/)).toBeVisible();
    await page.mouse.up();

    const traces = await page.evaluate(() => (window as unknown as { __traces: Trace[] }).__traces);
    const surSortie = traces.filter(t => t.cible.includes('Retour au présent'));
    const appui = surSortie.find(t => t.phase === 'pointerdown');
    const relache = surSortie.find(t => t.phase === 'pointerup');
    const contexte = JSON.stringify(traces);

    // PRÉCONDITION — LA COURSE DOIT AVOIR EU LIEU. Sans cette assertion le banc
    // passerait à vide : il suffirait que le panneau se résolve AVANT l'appui
    // pour qu'il verdisse sans rien éprouver. Un banc qui ne peut pas prouver
    // qu'il a produit la situation qu'il teste est muet.
    expect(appui, `pas d'appui enregistré sur la sortie — ${contexte}`).toBeTruthy();
    expect(relache, `pas de relâchement enregistré sur la sortie — ${contexte}`).toBeTruthy();

    // CE QUI EST RÉELLEMENT FAUTIF : que la page bouge PENDANT le geste.
    //
    // Mesuré avant correctif, en WebKit iPhone 13 : `scrollY` passe de 1222 à
    // 1272 entre l'appui et le relâchement — les cinquante pixels que gagne
    // « Ce qui compte pour le patient » en remplaçant sa ligne de chargement par
    // un paragraphe qui se replie. L'ancrage de défilement du navigateur a
    // compensé ce jour-là et le clic a atteint sa cible ; RIEN NE GARANTIT qu'il
    // compense toujours, et un praticien qui vise du doigt pendant que la page
    // glisse de cinquante pixels ne tape pas forcément ce qu'il voulait.
    // La place est donc RÉSERVÉE en amont, et ce banc garde l'absence de saut.
    expect(
      relache!.scrollY - appui!.scrollY,
      `la page a glissé de ${relache!.scrollY - appui!.scrollY} px pendant le geste — ${contexte}`,
    ).toBe(0);

    // ET LE CLIC ATTEINT SA CIBLE — ce que la trace du CI ne pouvait pas dire,
    // « click action done » ne signifiant que « les événements ont été envoyés ».
    const clics = traces.filter(t => t.phase === 'click');
    expect(
      clics.some(t => t.cible.startsWith('BUTTON') && t.cible.includes('Retour au présent')),
      `le click n'a pas atteint le bouton de sortie — ${contexte}`,
    ).toBe(true);

    // ET LA CONSÉQUENCE, qui est ce que le praticien voit : la lecture datée
    // se referme.
    await expect(page.getByText(/Vous lisez l’état du/)).toHaveCount(0);
  });
});
