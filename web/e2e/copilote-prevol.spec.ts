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
