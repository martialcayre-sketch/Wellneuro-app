// Consultation copilote — pré-vol T-10 min (SP-COP LOT-01). L'entrée de rail
// était réservée dans la maquette 5.0 sans écran derrière ; ce test vérifie
// qu'elle en a un, et que cet écran reste strictement en lecture.
// Patient fictif Sophie Nicola (PAT_SEED_01, déjà seedé).
import { test, expect } from '@playwright/test';
import { praticienSessionCookie } from './helpers/auth';

const PATIENT_ID = 'PAT_SEED_01';

test.describe('Consultation copilote — pré-vol', () => {
  test('le rail mène à la sélection de patient, puis au pré-vol', async ({ page, context, viewport }) => {
    // Le rail latéral est masqué sous 1024 px (la navigation passe alors par la
    // barre basse, dont le périmètre à quatre entrées n'est pas touché ici).
    test.skip((viewport?.width ?? 0) < 1024, 'Rail latéral masqué sur ce viewport.');

    await context.addCookies([await praticienSessionCookie()]);
    await page.goto('/dashboard');

    // L'entrée de rail existe et n'est plus un lien mort.
    const entree = page.getByRole('link', { name: 'Consultation copilote' }).first();
    await expect(entree).toBeVisible();
    await entree.click();

    await expect(page.getByRole('heading', { name: 'Consultation copilote' })).toBeVisible();
    const lienPatient = page.getByRole('link', { name: /Sophie Nicola/ });
    await expect(lienPatient).toBeVisible();
    expect((await lienPatient.boundingBox())?.height).toBeGreaterThanOrEqual(44);
    await lienPatient.click();

    // Pré-vol chargé : les deux sections existent, et l'état vide est explicite
    // plutôt que muet.
    await expect(page.getByRole('heading', { name: 'Ce qui a changé' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Questions suggérées' })).toBeVisible();
    await expect(page.getByText(/Aucune consultation validée à ce jour/)).toBeVisible();
  });

  test('le pré-vol est en lecture seule et ne duplique pas les discordances', async ({ page, context }) => {
    await context.addCookies([await praticienSessionCookie()]);

    const requetesMutantes: string[] = [];
    page.on('request', (requete) => {
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(requete.method())) {
        requetesMutantes.push(`${requete.method()} ${requete.url()}`);
      }
    });

    await page.goto(`/dashboard/copilote?idPatient=${PATIENT_ID}`);
    await expect(page.getByRole('heading', { name: 'Ce qui a changé' })).toBeVisible();

    // Aucune écriture : la vue prépare la consultation, elle ne la conduit pas.
    expect(requetesMutantes).toEqual([]);

    // Les discordances restent lues au poste de pilotage — pas de seconde copie
    // qui pourrait diverger. Assertion attachée à la section du pré-vol : la
    // minute d'après porte un lien de même libellé vers la même destination.
    await expect(
      page
        .getByRole('region', { name: /Discordances et objets cliniques/ })
        .getByRole('link', { name: /Ouvrir le poste de pilotage/ }),
    ).toBeVisible();

    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
    ).toBe(true);
  });
});

test.describe('Consultation copilote — la minute d’après (SP-COP LOT-02)', () => {
  test('montre l’état de la chaîne de diffusion sans jamais l’enclencher', async ({ page, context }) => {
    await context.addCookies([await praticienSessionCookie()]);

    const requetesMutantes: string[] = [];
    page.on('request', (requete) => {
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(requete.method())) {
        requetesMutantes.push(`${requete.method()} ${requete.url()}`);
      }
    });

    await page.goto(`/dashboard/copilote?idPatient=${PATIENT_ID}`);

    const panneau = page.locator('#panneau-cloture');
    await expect(panneau.getByRole('heading', { name: 'La minute d’après' })).toBeVisible();

    // Les trois étapes de la chaîne « Relu → Validé pour diffusion → Envoyé »
    // sont toujours rendues, quel que soit l'avancement — jamais masquées.
    await expect(panneau.getByText('Protocole relu')).toBeVisible();
    await expect(panneau.getByText('Validé pour diffusion')).toBeVisible();
    await expect(panneau.getByText('Document validé praticien')).toBeVisible();

    // L'écran énonce lui-même qu'il n'envoie rien.
    await expect(panneau.getByText(/n’envoie rien/)).toBeVisible();

    // Et il tient parole : lire la clôture n'écrit jamais.
    expect(requetesMutantes).toEqual([]);
  });
});

test.describe('Lecture d’un état passé (SP-TT)', () => {
  test('propose des repères datés et bande la lecture comme passée', async ({ page, context }) => {
    await context.addCookies([await praticienSessionCookie()]);

    const requetesMutantes: string[] = [];
    page.on('request', (requete) => {
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(requete.method())) {
        requetesMutantes.push(`${requete.method()} ${requete.url()}`);
      }
    });

    await page.goto(`/dashboard/copilote?idPatient=${PATIENT_ID}`);

    const section = page.getByRole('region', { name: /Lire l’état de la fiche à une date passée/ });
    await expect(section).toBeVisible();

    // Les repères sont bornés aux événements réels du patient : ce sont des
    // boutons, pas un sélecteur de date libre.
    const repere = section.getByRole('button').first();
    expect((await repere.boundingBox())?.height).toBeGreaterThanOrEqual(44);
    await repere.click();

    // Bandeau non ambigu : on ne doit jamais confondre ce qu'on lit avec l'actuel.
    await expect(page.getByText(/ce n’est pas l’état actuel du patient/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Revenir au présent' })).toBeVisible();

    await page.getByRole('button', { name: 'Revenir au présent' }).click();
    await expect(page.getByText(/ce n’est pas l’état actuel du patient/)).toHaveCount(0);

    // Lire le passé n'écrit jamais.
    expect(requetesMutantes).toEqual([]);
  });
});

// P34 (PRA-5 PR 2 ; D-481 complément DOC-15, Q1 à Q3 ; T-15) : h1, contexte
// repliable dès 1 024 px, escamoté d'office de 1 024 à 1 279 px, tout empilé
// et sans commande dessous. Patient fictif Sophie Nicola (PAT_SEED_01).
test.describe('Consultation copilote — panneau de contexte (P34)', () => {
  test('h1, puis le contexte se replie et se rouvre, le focus suivant la commande', async ({
    page,
    context,
    viewport,
  }) => {
    test.skip((viewport?.width ?? 0) < 1280, 'Contexte affiché d’office à partir de 1 280 px.');
    await context.addCookies([await praticienSessionCookie()]);
    await page.goto(`/dashboard/copilote?idPatient=${PATIENT_ID}`);

    await expect(page.getByRole('heading', { level: 1, name: 'Consultation copilote' })).toBeVisible();
    const panneau = page.locator('#panneau-cloture');
    await expect(panneau).toBeVisible();

    const masquer = page.getByRole('button', { name: 'Masquer le contexte' });
    expect((await masquer.boundingBox())?.height).toBeGreaterThanOrEqual(44);
    await masquer.click();
    await expect(panneau).toBeHidden();
    const afficher = page.getByRole('button', { name: 'Afficher le contexte' });
    await expect(afficher).toBeFocused();

    await afficher.click();
    await expect(panneau).toBeVisible();
    await expect(masquer).toBeFocused();
  });

  test('de 1 024 à 1 279 px, le contexte est escamoté d’office', async ({ page, context, viewport }) => {
    test.skip((viewport?.width ?? 0) < 1024, 'Sous 1 024 px, tout s’empile.');
    await context.addCookies([await praticienSessionCookie()]);
    await page.setViewportSize({ width: 1100, height: 800 });
    await page.goto(`/dashboard/copilote?idPatient=${PATIENT_ID}`);

    await expect(page.getByRole('heading', { name: 'Ce qui a changé' })).toBeVisible();
    await expect(page.locator('#panneau-cloture')).toBeHidden();
    await expect(page.getByRole('button', { name: 'Afficher le contexte' })).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
    ).toBe(true);
  });

  test('sous 1 024 px, tout s’empile, sans commande de repli', async ({ page, context, viewport }) => {
    test.skip((viewport?.width ?? 0) >= 1024, 'Au bureau, le contexte a sa colonne.');
    await context.addCookies([await praticienSessionCookie()]);
    await page.goto(`/dashboard/copilote?idPatient=${PATIENT_ID}`);

    await expect(page.locator('#panneau-cloture').getByRole('heading', { name: 'La minute d’après' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Masquer le contexte' })).toBeHidden();
    await expect(page.getByRole('button', { name: 'Afficher le contexte' })).toBeHidden();
  });
});
