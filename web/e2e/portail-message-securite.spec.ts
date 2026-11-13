// Message de sécurité ([[D-277]] §1) : sa venue dans la fenêtre ([[D-506]],
// refonte Lien PAT-4, Q1b), et la mesure du vrai composant qu'en demande la
// réserve Q11b. Sur un BDI (`Q_NEU_01`, item B7), au téléphone de 390 px émulé
// au zoom 200 % (fenêtre CSS de 195 × 422) et en confort 112,5 % (390 × 844),
// mouvement réduit compris ; sous la question puis au résumé ; et à l'entrée,
// sous la liste des signaux, au zoom 200 %. Les deux projets jouent tout :
// Desktop Chromium, iPhone 13 (WebKit).
//
// Ce que la réception de D-506 attend ici : le message placé par le plus
// petit défilement dans la part utile de la fenêtre (`bienPlace`), le focus
// là où le patient l'a laissé. Les mesures (hauteur du message, part visible,
// fenêtre, marges de défilement, en px CSS) sont consignées en annotation et
// dans la sortie : elles disent si le message dépasse la fenêtre, ce qui
// revient au responsable (D-506 §2). Le cas « déjà visible », le mouvement
// réduit du réglage patient, et les moments du mouvement (au choix et au
// résumé, jamais au retour sur la page ni à la reprise d'un brouillon :
// précision du 2026-11-13) sont épinglés en Vitest
// (`MessageReponseSuicide.test.tsx`).
//
// Patient fictif Michel Dogné (PAT_SEED_03). Une consultation par la route
// praticien et une assignation `Q_NEU_01` sans réponse, retirées par
// `resetPortailState` ; à l'entrée, le consentement et la fiche du parcours
// normal, comme `portail-parcours`. Aucune réponse de questionnaire n'est
// transmise, et l'anamnèse n'est pas validée.
import { test, expect, type Page } from '@playwright/test';
import { accuserPorteTrust, closePrisma, creerAssignationQuestionnaire, resetPortailState } from './helpers/db';
import { praticienSessionCookie, patientPortailSessionCookie } from './helpers/auth';

const PATIENT = { idPatient: 'PAT_SEED_03', email: 'michel.dogne@fictif.wellneuro.fr' };
const DEBUT_DU_MESSAGE = 'Vous venez d’indiquer des idées de mort ou de suicide.';

const REGLAGES = [
  { nom: 'téléphone 390 px, zoom 200 %', vue: { width: 195, height: 422 }, confort: false, mouvementReduit: false },
  { nom: 'téléphone 390 px, zoom 200 %, mouvement réduit', vue: { width: 195, height: 422 }, confort: false, mouvementReduit: true },
  { nom: 'téléphone 390 px, confort 112,5 %', vue: { width: 390, height: 844 }, confort: true, mouvementReduit: false },
  { nom: 'téléphone 390 px, confort 112,5 %, mouvement réduit', vue: { width: 390, height: 844 }, confort: true, mouvementReduit: true },
] as const;

type Mesure = {
  message: number; haut: number; visible: number; fenetre: number; largeur: number; policeRacine: string;
  /** `scroll-padding` du document : la part de la fenêtre qu'une barre fixe occupe. */
  margeHaut: number; margeBas: number;
  /** Défilement de la page, et ce qu'il en reste avant le bas du document. */
  defile: number; resteADefiler: number;
};

async function mesurer(page: Page): Promise<Mesure> {
  return page.evaluate((debut) => {
    const message = [...document.querySelectorAll<HTMLElement>('[role="alert"]')]
      .find(el => el.textContent?.includes(debut));
    if (!message) throw new Error('message absent');
    const { top, bottom, height } = message.getBoundingClientRect();
    const fenetre = window.innerHeight;
    const racine = document.documentElement;
    const style = getComputedStyle(racine);
    return {
      message: Math.round(height),
      haut: Math.round(top),
      visible: Math.round(Math.max(0, Math.min(bottom, fenetre) - Math.max(top, 0))),
      fenetre,
      largeur: window.innerWidth,
      policeRacine: style.fontSize,
      margeHaut: Math.round(parseFloat(style.scrollPaddingTop) || 0),
      margeBas: Math.round(parseFloat(style.scrollPaddingBottom) || 0),
      defile: Math.round(window.scrollY),
      resteADefiler: Math.round(racine.scrollHeight - fenetre - window.scrollY),
    };
  }, DEBUT_DU_MESSAGE);
}

/**
 * Le placement que D-506 attend de `scrollIntoView({ block: 'nearest' })`
 * dans la part utile de la fenêtre (fenêtre moins `scroll-padding`) : le
 * message entier s'il y tient, sinon son haut au haut de la part utile. Seule
 * exception : le bas du document atteint, la page ne peut pas défiler plus ;
 * le haut du message doit alors être dans la part utile. À 1 px près
 * (arrondis des positions).
 */
function bienPlace(m: Mesure): boolean {
  const partUtile = m.fenetre - m.margeHaut - m.margeBas;
  const hautDansLaPart = m.haut >= m.margeHaut - 1 && m.haut < m.fenetre - m.margeBas;
  if (m.resteADefiler <= 1 && hautDansLaPart) return true;
  if (m.message > partUtile) return Math.abs(m.haut - m.margeHaut) <= 1;
  return m.haut >= m.margeHaut - 1 && m.haut + m.message <= m.fenetre - m.margeBas + 1;
}

/**
 * Journal de diagnostic, joint au message d'échec : chaque défilement, fin de
 * défilement et redimensionnement du document, avec la position du message.
 * Il départage un défilement animé interrompu d'un décalage de mise en page
 * survenu après lui. Ouvert juste avant le geste qui fait paraître le message.
 */
async function ouvrirLeJournal(page: Page): Promise<void> {
  await page.evaluate((debut) => {
    const fenetre = window as unknown as { __journalD506?: unknown[]; __arretD506?: () => void };
    fenetre.__arretD506?.();
    const journal: unknown[] = [];
    fenetre.__journalD506 = journal;
    const t0 = performance.now();
    const noter = (evenement: string) => {
      const message = [...document.querySelectorAll<HTMLElement>('[role="alert"]')]
        .find(el => el.textContent?.includes(debut));
      journal.push([
        Math.round(performance.now() - t0), evenement, Math.round(window.scrollY),
        message ? Math.round(message.getBoundingClientRect().top) : null,
        document.documentElement.scrollHeight,
      ]);
    };
    const surDefilement = () => noter('defilement');
    const surFin = () => noter('fin');
    window.addEventListener('scroll', surDefilement, { passive: true });
    window.addEventListener('scrollend', surFin);
    const observateur = new ResizeObserver(() => noter('taille'));
    observateur.observe(document.body);
    noter('ouverture');
    fenetre.__arretD506 = () => {
      window.removeEventListener('scroll', surDefilement);
      window.removeEventListener('scrollend', surFin);
      observateur.disconnect();
    };
  }, DEBUT_DU_MESSAGE);
}

/**
 * La mesure n'est jugée qu'une fois le défilement terminé : dix relevés
 * identiques de suite, à 200 ms d'écart, soit 1,8 s sans mouvement. La
 * fenêtre dépasse le délai de la relance du composant (600 ms) et le temps
 * qu'un défilement met à atterrir en WebKit Linux (~560 ms constatés) : une
 * demande ignorée puis relancée se juge sur son résultat. Relevée
 * en cours de course, ou avant son départ, la position ne dirait rien du
 * résultat. Un défilement qui ne part pas dans ce délai, ou s'arrête court,
 * échoue : partout, sans tolérance (refus du responsable du 2026-11-13). Le
 * journal de défilement est consigné à chaque mesure, réussie ou non, pour
 * instruire un arrêt court.
 */
async function attendreLeMessagePlace(page: Page, libelle: string): Promise<Mesure> {
  let precedente = '';
  let identiques = 0;
  let stable: Mesure | null = null;
  const lireLeJournal = () => page.evaluate(() =>
    (window as unknown as { __journalD506?: unknown[][] }).__journalD506?.slice(0, 120) ?? null);
  try {
    await expect.poll(async () => {
      const m = await mesurer(page);
      const texte = JSON.stringify(m);
      identiques = texte === precedente ? identiques + 1 : 0;
      precedente = texte;
      if (identiques >= 9) stable = m;
      return stable !== null;
    }, { timeout: 12_000, intervals: [200] }).toBe(true);
  } catch (erreur) {
    // Position jamais stable : le journal est le seul témoin, il est consigné.
    console.log(`[journal D-506] ${libelle} — jamais stable — dernier relevé : ${precedente} ; journal : ${JSON.stringify(await lireLeJournal())}`);
    throw erreur;
  }
  const m = stable as unknown as Mesure;
  const constat = `placement du message : ${JSON.stringify(m)} ; journal [ms, événement, scrollY, haut du message, hauteur du document] : ${JSON.stringify(await lireLeJournal())}`;
  console.log(`[journal D-506] ${libelle} — bien placé : ${bienPlace(m)} — ${constat}`);
  expect(bienPlace(m), constat).toBe(true);
  return m;
}

test.describe.serial('Portail — message de sécurité dans la fenêtre ([[D-506]])', () => {
  let idAssignation = '';

  test.beforeAll(async () => {
    await resetPortailState(PATIENT.idPatient);
    await accuserPorteTrust(PATIENT.idPatient);
    idAssignation = await creerAssignationQuestionnaire(PATIENT.idPatient, PATIENT.email, 'Q_NEU_01', 'BDI');
  });

  test.afterAll(async () => {
    await resetPortailState(PATIENT.idPatient);
    await closePrisma();
  });

  test('une consultation ouverte par la route praticien', async ({ page, context }) => {
    await context.addCookies([await praticienSessionCookie()]);
    const res = await page.request.post('/api/praticien/consultations', { data: { idPatient: PATIENT.idPatient } });
    expect(res.ok()).toBe(true);
  });

  for (const reglage of REGLAGES) {
    test(`${reglage.nom} : sous la question puis au résumé, le message vient dans la fenêtre, le focus ne bouge pas`, async ({ page, context }, testInfo) => {
      await context.addCookies([patientPortailSessionCookie(PATIENT.idPatient, PATIENT.email)]);
      if (reglage.confort) {
        await page.addInitScript(() => {
          window.localStorage.setItem('wellneuro:portail:confort', JSON.stringify({ texteAgrandi: true, espacementRenforce: false }));
        });
      }
      if (reglage.mouvementReduit) await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.setViewportSize(reglage.vue);
      await page.goto(`/portail/${PATIENT.idPatient}/questionnaires/${idAssignation}`);

      const b7 = (valeur: number) => page.locator(`input[type="radio"][name="B7"][value="${valeur}"]`);
      const consentement = page.getByLabel(/ai lu ces informations/);
      await expect(consentement.or(b7(0))).toBeAttached();
      if (await consentement.count()) {
        await consentement.check();
        await page.getByRole('button', { name: 'Continuer vers le questionnaire' }).click();
      }

      // Les autres items d'abord, la réponse la plus légère : le message ne
      // dépend que de B7.
      for (let i = 1; i <= 13; i += 1) {
        if (i !== 7) await page.locator(`input[type="radio"][name="B${i}"][value="0"]`).check();
      }

      // Sous la question. WebKit ne donne pas toujours le focus à un bouton
      // radio cliqué : on compare le focus d'avant et d'après le défilement,
      // et on vérifie qu'il n'est jamais passé dans le message.
      const focus = () => page.evaluate((debut) => {
        const actif = document.activeElement;
        const dansLeMessage = !!actif?.closest('[role="alert"]')?.textContent?.includes(debut);
        return { balise: actif?.tagName, nom: (actif as HTMLInputElement | null)?.name ?? '', dansLeMessage };
      }, DEBUT_DU_MESSAGE);
      await ouvrirLeJournal(page);
      await b7(1).check();
      const focusAvant = await focus();
      const sousLaQuestion = await attendreLeMessagePlace(page, `${testInfo.project.name} — ${reglage.nom}, sous la question`);
      const focusApres = await focus();
      expect(focusApres).toEqual(focusAvant);
      expect(focusApres.dansLeMessage).toBe(false);

      // Au résumé : une nouvelle apparition.
      await ouvrirLeJournal(page);
      await page.getByRole('button', { name: 'Voir le résumé' }).click();
      await expect(page.getByRole('heading', { name: 'Vérifiez votre questionnaire' })).toBeFocused();
      const auResume = await attendreLeMessagePlace(page, `${testInfo.project.name} — ${reglage.nom}, au résumé`);
      // Le focus reste sur le titre du résumé, où l'écran le pose.
      await expect(page.getByRole('heading', { name: 'Vérifiez votre questionnaire' })).toBeFocused();

      const consigne = `${testInfo.project.name} — ${reglage.nom} — sous la question : ${JSON.stringify(sousLaQuestion)} ; au résumé : ${JSON.stringify(auResume)}`;
      testInfo.annotations.push({ type: 'mesure D-506', description: consigne });
      console.log(`[mesure D-506] ${consigne}`);
    });
  }

  // L'entrée du parcours : la case « Idées noires ou suicidaires » des
  // signaux, au téléphone au zoom 200 %. Le consentement et la fiche sont
  // ceux du parcours normal ; l'anamnèse n'est pas validée.
  test('entrée, téléphone 390 px, zoom 200 % : sous la liste des signaux, le message vient dans la fenêtre', async ({ page, context }, testInfo) => {
    await context.addCookies([patientPortailSessionCookie(PATIENT.idPatient, PATIENT.email)]);
    await page.setViewportSize({ width: 195, height: 422 });
    await page.goto(`/portail/${PATIENT.idPatient}`);

    await expect(page.getByRole('heading', { name: 'Votre consentement au suivi' })).toBeVisible();
    await page.getByLabel(/ai lu ces informations/i).check();
    await Promise.all([
      page.waitForResponse(res => res.url().includes('/api/portail/consentement') && res.status() === 200),
      page.getByRole('button', { name: 'Donner mon consentement' }).click(),
    ]);
    await expect(page.getByRole('heading', { name: 'Fiche de renseignements' })).toBeVisible();
    await page.locator('label:has-text("Situation familiale") + select').selectOption({ label: 'Marié·e / Pacsé·e' });
    await page.getByRole('button', { name: 'Suivant →' }).click();
    await page.locator('label:has-text("Profession") + input').fill('Retraité');
    await page.getByRole('button', { name: 'Suivant →' }).click();
    await page.getByLabel(/exactitude des informations fournies/i).check();
    await Promise.all([
      page.waitForResponse(res => res.url().includes('/api/portail/fiche') && res.status() === 200),
      page.getByRole('button', { name: 'Continuer vers votre situation' }).click(),
    ]);

    await expect(page.getByRole('heading', { name: 'Parler de votre situation' })).toBeVisible();
    await page.getByRole('button', { name: 'Suivant →' }).click();
    await page.locator('label:has-text("amène aujourd") + textarea').fill('Fatigue persistante depuis plusieurs mois.');
    await page.getByRole('button', { name: 'Suivant →' }).click();
    await page.getByRole('button', { name: 'Suivant →' }).click();

    // Section des signaux.
    const caseSignal = page.getByLabel(/Idées noires ou suicidaires/);
    await ouvrirLeJournal(page);
    await caseSignal.check();
    const auxSignaux = await attendreLeMessagePlace(page, `${testInfo.project.name} — entrée, sous la liste des signaux`);

    const consigne = `${testInfo.project.name} — entrée, téléphone 390 px, zoom 200 % — sous la liste des signaux : ${JSON.stringify(auxSignaux)}`;
    testInfo.annotations.push({ type: 'mesure D-506', description: consigne });
    console.log(`[mesure D-506] ${consigne}`);
  });
});
