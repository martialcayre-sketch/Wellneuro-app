// Gate G4 — lien magique d'accès patient (IDP LOT-01).
//
// Ce spec vérifie l'entrée par lien magique (24 h, usage unique). Depuis le
// LOT-04, c'est — avec Google — l'un des deux seuls chemins d'entrée : le jeton
// permanent a été retiré, l'accès repose désormais sur le cookie de session.
//
// Le drapeau `WN_G4_LIEN_MAGIQUE` est allumé par `playwright.config.ts` pour le
// serveur de test uniquement ; il reste absent de Vercel.
import { test, expect } from '@playwright/test';
import { praticienSessionCookie } from './helpers/auth';

const PATIENT = { idPatient: 'PAT_SEED_03', email: 'michel.dogne@fictif.wellneuro.fr' };

test('lien magique : ouvre une fois, refuse au second passage', async ({ page, context }) => {
  await context.addCookies([await praticienSessionCookie()]);

  const emission = await page.request.post('/api/praticien/token', {
    data: { idPatient: PATIENT.idPatient, action: 'lien_magique' },
  });
  expect(emission.ok()).toBe(true);
  const lien = (await emission.json()).lien as string;
  expect(lien).toContain('/portail/lien/');

  // Première ouverture : la session s'ouvre et le patient atterrit dans son
  // espace, sans repasser par le gate e-mail — le lien reçu dans la boîte vaut
  // preuve de contrôle de la boîte.
  await page.goto(lien);
  await expect(page).toHaveURL(/\/portail\/(?!lien\/)/);
  await expect(page).not.toHaveURL(/\/portail\/lien\/indisponible/);

  // Second passage sur le MÊME lien : refusé. On l'isole dans un nouvel onglet
  // du même contexte pour éviter toute course avec un redirect client résiduel.
  const secondPassage = await context.newPage();
  await secondPassage.goto(lien);
  await expect(secondPassage).toHaveURL(/\/portail\/lien\/indisponible/);
  await expect(secondPassage.getByRole('heading', { name: 'Votre lien n’est plus valable' })).toBeVisible();
  await secondPassage.close();
});

test('lien inconnu : même écran, même message qu’un lien déjà consommé', async ({ page }) => {
  await page.goto('/portail/lien/jeton-qui-na-jamais-existe');
  await expect(page).toHaveURL(/\/portail\/lien\/indisponible/);
  await expect(page.getByRole('heading', { name: 'Votre lien n’est plus valable' })).toBeVisible();
  // Rien n'indique si le jeton a existé, expiré ou été consommé.
  await expect(page.getByText(/expir|déjà utilisé|inconnu/i)).toHaveCount(0);
});

test('la redemande répond la même chose sur une adresse connue et une inconnue', async ({ page }) => {
  await page.goto('/portail/lien/indisponible');

  const chronometrer = async (email: string) => {
    const debut = Date.now();
    const reponse = await page.request.post('/api/portail/lien/demande', { data: { email } });
    return { reponse, dureeMs: Date.now() - debut };
  };

  // Préchauffage, non chronométré. La route quantifie sa durée par paliers de
  // 500 ms au-dessus d'un plancher de 1500 ms : deux réponses ne peuvent donc
  // différer que d'un multiple de 500 ms, et la garde ci-dessous en tolère un
  // seul. Or le chronomètre part d'ICI, côté client, alors que le plancher ne
  // couvre que le handler — sous `next dev` (T2 `--fast`), la PREMIÈRE requête
  // vers cette route la compile à la demande et la fait sauter un palier de
  // plus, uniquement parce qu'elle est appelée en premier. L'écart mesuré
  // dirait alors « oracle d'énumération » là où il n'y a qu'une compilation.
  // Une adresse inconnue suffit : elle traverse le même chemin (compilation,
  // pool Prisma, plafond par origine réseau) sans toucher au plafond horaire
  // du patient, qui n'admet que trois demandes.
  await chronometrer('prechauffage@example.test');

  const connue = await chronometrer(PATIENT.email);
  const inconnue = await chronometrer('personne@example.test');

  expect(inconnue.reponse.status()).toBe(connue.reponse.status());
  expect(await inconnue.reponse.text()).toBe(await connue.reponse.text());

  // La durée aussi doit se taire : l'adresse connue déclenche une écriture et un
  // envoi, l'inconnue ne déclenche rien. Sans plancher, l'écart se mesure d'ici.
  for (const { dureeMs } of [connue, inconnue]) {
    expect(dureeMs).toBeGreaterThanOrEqual(1400);
  }
  // Sous charge CI, la gigue observée dépasse parfois 500 ms sans signaler une
  // fuite d'énumération ; la garde reste stricte sur un ordre de grandeur sub-s.
  expect(Math.abs(connue.dureeMs - inconnue.dureeMs)).toBeLessThan(800);
});
