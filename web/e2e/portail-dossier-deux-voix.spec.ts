// Le « dossier à deux voix » au portail (Alliance 6.0-A, LOT-06) — parcours
// PATIENT de bout en bout.
//
// CE SPEC SOLDE UNE DETTE DE DEUX LOTS : ni le LOT-03 (« ce qui compte ») ni le
// LOT-04 (synthèse de compréhension) n'avaient d'E2E, et leurs écrans n'étaient
// donc vérifiés qu'en unitaire — c'est-à-dire jamais contre un rendu serveur
// réel, avec les drapeaux dans la position où ces pages existent.
//
// TROIS DRAPEAUX SONT REQUIS, et ils sont posés en TROIS endroits :
// `playwright.config.ts` (serveur sous test), `scripts/wn-test-worktree.sh` et
// `.github/workflows/ci.yml` (la commande `npm run build`, parce que les pages
// portail lisent leur drapeau au RENDU SERVEUR). En manquer un rend les écrans
// introuvables, et le rouge ne désigne pas le drapeau.
//
// Patient fictif Sophie Nicola (PAT_SEED_01), l'une des trois identités
// autorisées. Aucune opération destructive hors des lignes créées par ce spec :
// `nettoyerDossierDeuxVoix` ne vise que les cinq tables de l'alliance, pour ce
// seul dossier de fixture (`D-075` : aucun seed ni E2E ne vise un dossier réel).
import { test, expect } from '@playwright/test';
import {
  cleanupAncreJalon,
  closePrisma,
  lireRatifications,
  lireReponsesJalon,
  nettoyerDossierDeuxVoix,
  provisionAncreJalon,
  provisionnerRatification,
  provisionnerAccuseCadre,
  provisionnerDossierDeuxVoix,
} from './helpers/db';
import { patientPortailSessionCookie } from './helpers/auth';

const PATIENT = {
  idPatient: 'PAT_SEED_01',
  email: 'sophie.nicola@fictif.wellneuro.fr',
};

// Le segment d'URL n'est PAS un facteur d'authentification depuis le LOT-04 du
// Socle : le cookie signé est l'unique credential. Une valeur littérale suffit
// donc à construire le chemin.
const JETON = 'jeton-de-parcours';

test.describe.serial('Portail — mon dossier à deux voix', () => {
  let idObjectif = '';

  test.beforeAll(async () => {
    ({ idObjectif } = await provisionnerDossierDeuxVoix(PATIENT.idPatient));
    // Sans lui, le hub rend « Avant de commencer » et la nav n'existe pas.
    await provisionnerAccuseCadre(PATIENT.idPatient);
  });

  test.afterAll(async () => {
    await nettoyerDossierDeuxVoix(PATIENT.idPatient);
    // PAS de `closePrisma()` ICI : une seconde série vit dans ce fichier, et
    // les `afterAll` d'un `describe` tournent à la fin de CE describe, pas du
    // fichier. Fermer le client ici le retirait sous les pieds de la série
    // suivante — elle survivait par la reconnexion automatique de Prisma,
    // c'est-à-dire par chance. Le client se ferme une fois, au dernier bloc.
  });

  test.beforeEach(async ({ context }) => {
    await context.addCookies([
      patientPortailSessionCookie(PATIENT.idPatient, PATIENT.email),
    ]);
  });

  test('l’écran est atteignable depuis la navigation du hub', async ({ page }) => {
    await page.goto(`/portail/${JETON}/questionnaires`);

    // LE POINT DE CE CAS : le lien est dans la nav « Autres espaces », visible
    // sans rien déplier et sans dépendre d'un protocole diffusé. Le placer dans
    // « Mon accompagnement » — replié, et après un retour anticipé — aurait
    // livré un écran que personne n'ouvre.
    const lien = page.getByRole('link', { name: 'Ouvrir mon dossier à deux voix' });
    await expect(lien).toBeVisible();
    await lien.click();

    await expect(page.getByRole('heading', { name: 'Mon dossier, à deux voix' })).toBeVisible();
  });

  test('les trois objets sont assemblés sur une seule page', async ({ page }) => {
    await page.goto(`/portail/${JETON}/dossier`);

    // Ce que le patient a dit, ce que le praticien en a compris…
    await expect(page.getByText('sans avoir l’impression de n’avoir pas dormi')).toBeVisible();
    await expect(page.getByText('Un sommeil qui ne restaure pas')).toBeVisible();
    // …ce qui compte pour lui…
    await expect(page.getByText('la marche du dimanche avec ma fille')).toBeVisible();
    // …et la synthèse publiée.
    await expect(page.getByText('un sommeil qui se casse au milieu de la nuit')).toBeVisible();
  });

  test('aucun score, aucune bande, aucun décompte sur cet écran', async ({ page }) => {
    await page.goto(`/portail/${JETON}/dossier`);
    await expect(page.getByRole('heading', { name: 'Mon dossier, à deux voix' })).toBeVisible();

    const rendu = ((await page.locator('body').textContent()) ?? '').toLowerCase();
    for (const interdit of ['score', 'niveau', 'moyenne', 'taux', 'points', 'sur 10']) {
      expect(rendu, `« ${interdit} » n’a rien à faire sur cet écran`).not.toContain(interdit);
    }
  });

  test('l’état de départ ne dit rien du patient — jamais « non ratifié »', async ({ page }) => {
    await page.goto(`/portail/${JETON}/dossier`);
    await expect(page.getByText('ne vous êtes pas encore prononcé')).toBeVisible();

    const rendu = (await page.locator('body').textContent()) ?? '';
    expect(rendu).not.toContain('non ratifié');
    expect(rendu).not.toContain('refusé');
  });

  test('ratifier écrit une ligne, et l’écran le reflète', async ({ page }) => {
    await page.goto(`/portail/${JETON}/dossier`);
    await page.getByRole('button', { name: 'C’est bien ça' }).click();

    await expect(page.getByText('Vous avez répondu : c’est bien ça.')).toBeVisible();

    const lignes = await lireRatifications(PATIENT.idPatient);
    expect(lignes).toEqual([{ sens: 'ratifie', idObjectif }]);
  });

  test('CHANGER D’AVIS AJOUTE UNE LIGNE — rien n’est écrasé ni retiré', async ({ page }) => {
    await page.goto(`/portail/${JETON}/dossier`);
    // L'écran affiche l'état posé au cas précédent : la série est bien
    // séquentielle, et le second geste s'ajoute au premier.
    await expect(page.getByText('Vous avez répondu : c’est bien ça.')).toBeVisible();

    await page.getByRole('button', { name: 'Ce n’est pas exactement ça' }).click();
    await expect(page.getByText('Vous avez répondu : ce n’est pas exactement ça.')).toBeVisible();

    // DEUX lignes, dans l'ordre — pas une ligne corrigée. C'est l'invariant du
    // lot, et c'est le seul endroit où il se vérifie contre une vraie base.
    const lignes = await lireRatifications(PATIENT.idPatient);
    expect(lignes).toEqual([
      { sens: 'ratifie', idObjectif },
      { sens: 'conteste', idObjectif },
    ]);

    // Et aucun bouton pour retirer la réponse : il n'existe pas de verbe pour
    // cela, ni dans l'écran ni dans la route.
    const rendu = (await page.locator('body').textContent()) ?? '';
    expect(rendu).not.toContain('Annuler ma réponse');
    expect(rendu).not.toContain('Supprimer');
  });

  test('sans session portail, l’écran ne sert rien', async ({ browser }) => {
    const contexteAnonyme = await browser.newContext();
    const page = await contexteAnonyme.newPage();

    const reponse = await page.request.get('/api/portail/dossier');
    expect(reponse.status()).toBe(401);

    await contexteAnonyme.close();
  });
});

// ── OÙ J'EN SUIS : LE PARCOURS D'ÉTAPE (6.0-B, LOT-05, `D-111`) ──────────────
//
// Série SÉPARÉE, et pour une raison de fond : elle exige un T0 confirmé, que la
// série précédente n'a pas — et ne doit pas avoir, l'état « aucun cycle » étant
// celui qu'elle vérifie implicitement. Poser l'ancre dans le `beforeAll` commun
// aurait ouvert une fenêtre de jalon sous les tests de ratification.
test.describe.serial('Portail — où j’en suis, à cette étape', () => {
  let idObjectif = '';

  test.beforeAll(async () => {
    ({ idObjectif } = await provisionnerDossierDeuxVoix(PATIENT.idPatient));
    await provisionnerAccuseCadre(PATIENT.idPatient);
    // T0 confirmé il y a 21 jours : la fenêtre du J21 est ouverte MAINTENANT.
    await provisionAncreJalon(PATIENT.idPatient, 21);
    // La question ne se pose que sur un objectif dont le patient a dit qu'il
    // était le sien : on ratifie en base, le geste lui-même étant couvert par
    // la série précédente.
    await provisionnerRatification(PATIENT.idPatient, idObjectif);
  });

  test.afterAll(async () => {
    await cleanupAncreJalon();
    await nettoyerDossierDeuxVoix(PATIENT.idPatient);
  });

  test.beforeEach(async ({ context }) => {
    await context.addCookies([patientPortailSessionCookie(PATIENT.idPatient, PATIENT.email)]);
  });

  test('la question s’affiche, et l’échelle n’est pré-remplie par rien', async ({ page }) => {
    await page.goto(`/portail/${JETON}/dossier`);
    await expect(page.getByText('Où en êtes-vous par rapport à cet objectif ?')).toBeVisible();

    // Aucune valeur choisie d'avance : un chiffre pré-sélectionné se déposerait
    // dans le dossier sans que le patient l'ait voulu (`DC-24`).
    await expect(page.locator('[aria-pressed="true"]')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Retirer ma réponse à l’échelle' })).toHaveCount(
      0,
    );
  });

  test('ÉCRIRE SANS L’ÉCHELLE dépose `null`, jamais zéro', async ({ page }) => {
    await page.goto(`/portail/${JETON}/dossier`);
    await page
      .getByLabel('Où en êtes-vous par rapport à cet objectif ?')
      .fill('Je tiens trois soirs sur sept, et le week-end ça repart.');
    await page.getByRole('button', { name: 'Envoyer où j’en suis' }).click();

    await expect(page.getByText('Votre praticien lira où vous en êtes')).toBeVisible();
    // Le patient se relit, et aucune échelle n'apparaît sous son texte.
    await expect(page.getByText('Où vous en étiez (J21)')).toBeVisible();
    await expect(page.getByText('Sur l’échelle')).toHaveCount(0);

    const lignes = await lireReponsesJalon(PATIENT.idPatient);
    expect(lignes).toEqual([
      { jalon: 'J21', texte: 'Je tiens trois soirs sur sept, et le week-end ça repart.', eva: null },
    ]);
  });

  test('RÉPONDRE À NOUVEAU AJOUTE UNE LIGNE, et le zéro est une valeur', async ({ page }) => {
    await page.goto(`/portail/${JETON}/dossier`);
    await page.getByLabel('Où en êtes-vous par rapport à cet objectif ?').fill('En fait, rien n’a bougé.');
    await page.getByRole('button', { name: '0', exact: true }).click();
    await page.getByRole('button', { name: 'Envoyer où j’en suis' }).click();

    await expect(page.getByText('Sur l’échelle : 0')).toBeVisible();

    // DEUX lignes sur le MÊME jalon — aucune contrainte d'unicité, rien n'est
    // écrasé (`D-111` §5). Et le zéro est bien stocké comme un zéro.
    const lignes = await lireReponsesJalon(PATIENT.idPatient);
    expect(lignes).toHaveLength(2);
    expect(lignes[0]).toEqual({ jalon: 'J21', texte: 'En fait, rien n’a bougé.', eva: 0 });
  });

  test('UN JALON HORS FENÊTRE EST REFUSÉ, même posté directement', async ({ page }) => {
    // L'écran ne propose que le J21 ; la borne doit tenir sans lui.
    const reponse = await page.request.post('/api/portail/dossier', {
      data: {
        geste: 'reponse_jalon',
        idObjectif,
        jalon: 'J90',
        texte: 'Un texte parfaitement valide, à la mauvaise étape.',
      },
    });
    expect(reponse.status()).toBe(409);

    const lignes = await lireReponsesJalon(PATIENT.idPatient);
    expect(lignes).toHaveLength(2);
  });

  test('UNE EVA DÉCIMALE EST REFUSÉE — le cast INTEGER l’aurait arrondie', async ({ page }) => {
    const reponse = await page.request.post('/api/portail/dossier', {
      data: { geste: 'reponse_jalon', idObjectif, jalon: 'J21', texte: 'Entre deux.', eva: 5.5 },
    });
    expect(reponse.status()).toBe(400);
    expect((await reponse.json()).reason).toBe('eva_invalide');

    const lignes = await lireReponsesJalon(PATIENT.idPatient);
    expect(lignes).toHaveLength(2);
  });

  test('`T0` EST REFUSÉ — c’est l’ancre, pas une étape', async ({ page }) => {
    const reponse = await page.request.post('/api/portail/dossier', {
      data: { geste: 'reponse_jalon', idObjectif, jalon: 'T0', texte: 'Au tout début.' },
    });
    expect(reponse.status()).toBe(400);
    expect((await reponse.json()).reason).toBe('jalon_invalide');

    const lignes = await lireReponsesJalon(PATIENT.idPatient);
    expect(lignes).toHaveLength(2);
  });
});

// LA FERMETURE DU CLIENT VIT AU NIVEAU DU FICHIER, hors de tout `describe`
// (relevé en revue du LOT-05). Placée dans le dernier bloc, elle ne jouait pas
// quand un `--grep` ne retenait que la première série — le client restait
// ouvert et le process pendait. Ici, elle joue quelle que soit la sélection, et
// une seule fois.
test.afterAll(async () => {
  await closePrisma();
});
