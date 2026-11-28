// Ornement des états vides réels du portail praticien (lot PRA-2 décor ;
// [[D-481]] §1 bis, question 20261128-0838-d : Q1 A, germe `nutrition-sprout`
// de 160 px centré au-dessus de la phrase ; Q2, les six vides du corps).
// Réception du lot, écran par écran :
// - vide réel : un seul germe, hors de l'accessibilité, dans sa zone, absent
//   à l'impression ; à 195 px, ni défilement horizontal ni débordement ;
// - échec de lecture et liste pleine : aucun germe.
// Les vides et les échecs s'obtiennent en remplaçant la réponse de l'API dans
// le navigateur, jamais en écrivant en base. Les règles de la primitive sont
// épinglées en Vitest (`components/ui/LienDecor.test.tsx`), la pose aussi
// (bancs des six composants).
//
// Dossiers de fixture seulement (Sophie Nicola, Jennifer Martin, Michel Dogné).
// Lecture seule.
import { test, expect, type Page, type Route } from '@playwright/test';
import { PRATICIEN_EMAIL, praticienSessionCookie } from './helpers/auth';

const ORNEMENT = '[data-lien-decor="etat-vide"]';

type Corps = Record<string, unknown>;

type Ecran = {
  nom: string;
  route: string;
  api: RegExp;
  /** Réponse réelle rendue vide. */
  vider: (reel: Corps) => Corps;
  /** Réponse d'échec, telle que la route la rend. */
  echec: { status: number; corps: Corps };
  /** Réponse pleine ; absente : la réponse réelle des fixtures, déjà pleine. */
  plein?: () => Corps;
  phraseVide: RegExp;
  /** La phrase de l'échec, déjà écrite par l'écran. */
  phraseEchec: RegExp;
  /** Ce que l'écran plein montre à coup sûr. */
  signePlein: (page: Page) => ReturnType<Page['getByText']>;
};

const demain = () => new Date(Date.now() + 24 * 3600 * 1000).toISOString();

const ECRANS: Ecran[] = [
  {
    nom: 'Fil du jour',
    route: '/dashboard',
    api: /\/api\/praticien\/fil$/,
    vider: (reel) => ({ ...reel, cartes: [], lues: [], lecturesBiologieIndisponibles: false, signauxSecuriteIndisponibles: false }),
    echec: { status: 200, corps: { cartes: [], unavailable: true } },
    plein: () => ({
      cartes: [
        {
          type: 'assignation_en_retard',
          idPatient: 'PAT_SEED_01',
          patient: 'Sophie Nicola',
          titre: 'Questionnaire en retard',
          pourquoi: 'Échéance dépassée depuis 2 jours',
          date: new Date().toISOString(),
          href: '/dashboard/patients/PAT_SEED_01',
          actionLabel: 'Ouvrir la fiche',
          cle: 'assignation_en_retard:ASG_E2E',
        },
      ],
      lues: [],
    }),
    phraseVide: /Rien n.appelle votre attention pour le moment/,
    phraseEchec: /Le Fil est momentanément indisponible/,
    signePlein: (page) => page.getByText('Échéance dépassée depuis 2 jours'),
  },
  {
    nom: 'Patients',
    route: '/dashboard/patients',
    api: /\/api\/praticien\/patients\?/,
    vider: (reel) => ({ ...reel, patients: [], pagination: { page: 1, pageSize: 10, total: 0, totalPages: 0 } }),
    echec: { status: 200, corps: { patients: [], assignations: [], unavailable: true, reason: 'exception' } },
    phraseVide: /^Aucun patient\.$/,
    phraseEchec: /Une erreur inattendue est survenue/,
    signePlein: (page) => page.locator('main').getByText('Sophie Nicola').first(),
  },
  {
    nom: 'Agenda',
    route: '/dashboard/agenda',
    api: /\/api\/praticien\/rendez-vous$/,
    vider: () => ({ ok: true, rendezVous: [] }),
    echec: { status: 500, corps: { ok: false, error: 'exception' } },
    plein: () => ({
      ok: true,
      rendezVous: [{ id: 'RDV_E2E', idPatient: 'PAT_SEED_01', patient: 'Sophie Nicola', dateHeure: demain(), motif: 'Suivi J14' }],
    }),
    phraseVide: /Aucun rendez-vous planifié pour les 7 prochains jours/,
    phraseEchec: /La liste des rendez-vous est momentanément indisponible/,
    signePlein: (page) => page.getByText('Suivi J14'),
  },
  {
    nom: 'Fiches-trajectoires',
    route: '/dashboard/trajectoires',
    api: /\/api\/praticien\/trajectoires$/,
    vider: (reel) => ({ ...reel, lignes: [] }),
    echec: { status: 200, corps: { ok: false, reason: 'exception' } },
    phraseVide: /Aucun patient dans le cabinet pour l.instant/,
    phraseEchec: /n.ont pas pu être lues/,
    signePlein: (page) => page.getByRole('link', { name: /Sophie Nicola/ }),
  },
  {
    nom: 'Comptes du cabinet',
    route: '/dashboard/cabinet',
    api: /\/api\/praticien\/comptes-cabinet$/,
    vider: (reel) => {
      const comptes = reel.comptes as { prochaineEtape: Corps };
      return { ...reel, comptes: { ...comptes, prochaineEtape: { ...comptes.prochaineEtape, effectif: 0 } } };
    },
    echec: { status: 200, corps: { ok: false, reason: 'exception' } },
    phraseVide: /Aucun dossier dans le cabinet pour l.instant/,
    phraseEchec: /n.ont pas pu être établis/,
    signePlein: (page) => page.getByRole('table', { name: 'Prochaine étape' }),
  },
  {
    nom: 'Confiance et droits',
    route: '/dashboard/droits',
    api: /\/api\/praticien\/trust$/,
    vider: (reel) => ({ ...reel, ok: true, signalements: [], nonTraites: 0 }),
    echec: { status: 200, corps: { ok: false, error: 'Erreur réseau. Rechargez la page.' } },
    plein: () => ({
      ok: true,
      nonTraites: 1,
      signalements: [
        {
          kind: 'incident_confidentialite',
          id: 'INC_E2E',
          idPatient: 'PAT_SEED_03',
          patient: 'Michel Dogné',
          resume: 'Incident de confidentialité — autre',
          detail: 'Description',
          statutTraitement: 'recu',
          soumisLe: new Date().toISOString(),
          examineLe: null,
        },
      ],
    }),
    phraseVide: /Aucun signalement ni demande pour le moment/,
    phraseEchec: /Erreur réseau\. Rechargez la page/,
    signePlein: (page) => page.getByText('Incident de confidentialité — autre').first(),
  },
];

async function connecter(page: Page) {
  await page.context().addCookies([await praticienSessionCookie(PRATICIEN_EMAIL)]);
}

/** Remplace la réponse de l'API de l'écran (GET seulement) ; `null` : la réponse réelle. */
async function intercepter(page: Page, e: Ecran, remplacer: ((reel: Corps) => { status?: number; corps: Corps }) | null) {
  await page.route(e.api, async (route: Route) => {
    if (route.request().method() !== 'GET' || remplacer === null) return route.continue();
    const reponse = await route.fetch();
    const { status, corps } = remplacer((await reponse.json()) as Corps);
    await route.fulfill({ response: reponse, status: status ?? reponse.status(), json: corps });
  });
}

/** La phrase du vide, dans l'élément qui la porte (le germe est son voisin ou son enfant). */
function phrase(page: Page, e: Ecran) {
  return page.locator('main').getByText(e.phraseVide).first();
}

for (const e of ECRANS) {
  test.describe(`${e.nom} — ornement d’état vide (PRA-2 décor)`, () => {
    test('vide réel : un germe, hors accessibilité, absent à l’impression, contenu à 195 px', async ({ page }) => {
      await connecter(page);
      await intercepter(page, e, (reel) => ({ status: 200, corps: e.vider(reel) }));
      await page.goto(e.route);
      await expect(phrase(page, e)).toBeVisible({ timeout: 60_000 });

      const ornement = page.locator(ORNEMENT);
      await expect(ornement).toHaveCount(1);
      await expect(ornement).toBeVisible();
      await expect(ornement).toHaveAttribute('aria-hidden', 'true');
      await expect(ornement).toHaveAttribute('data-element', 'nutrition-sprout');
      // Au-dessus de la phrase, dans la même zone. La phrase se mesure par son
      // nœud texte : il partage parfois son élément avec le germe.
      const position = await page.evaluate(
        ({ selecteur, source, drapeaux }) => {
          const motif = new RegExp(source, drapeaux);
          const o = document.querySelector(selecteur) as HTMLElement;
          const parcours = document.createTreeWalker(document.querySelector('main')!, NodeFilter.SHOW_TEXT);
          let texte: Node | null = null;
          while (parcours.nextNode()) {
            if (motif.test((parcours.currentNode.textContent ?? '').trim())) {
              texte = parcours.currentNode;
              break;
            }
          }
          const plage = document.createRange();
          plage.selectNodeContents(texte!);
          const zone = o.closest('section, td, [data-testid="fil-du-jour"], div.rounded-xl') as HTMLElement;
          return {
            basOrnement: o.getBoundingClientRect().bottom,
            hautPhrase: plage.getBoundingClientRect().top,
            largeur: o.getBoundingClientRect().width,
            memeZone: zone.contains(texte!),
          };
        },
        { selecteur: ORNEMENT, source: e.phraseVide.source, drapeaux: e.phraseVide.flags },
      );
      expect(position.basOrnement).toBeLessThanOrEqual(position.hautPhrase + 1);
      expect(position.largeur).toBeLessThanOrEqual(161);
      expect(position.memeZone).toBe(true);

      await page.emulateMedia({ media: 'print' });
      await expect(ornement).toBeHidden();
      await page.emulateMedia({ media: 'screen' });

      await page.setViewportSize({ width: 195, height: 700 });
      await expect(ornement).toBeVisible();
      const mesure = await page.evaluate((selecteur) => {
        const o = document.querySelector(selecteur) as HTMLElement;
        const r = o.getBoundingClientRect();
        const p = o.parentElement!.getBoundingClientRect();
        return {
          defile: document.documentElement.scrollWidth > window.innerWidth,
          deborde: r.left < p.left - 0.5 || r.right > p.right + 0.5,
          largeur: r.width,
        };
      }, ORNEMENT);
      expect(mesure.defile).toBe(false);
      expect(mesure.deborde).toBe(false);
      expect(mesure.largeur).toBeGreaterThan(0);
    });

    test('échec de lecture et liste pleine : aucun germe', async ({ page }) => {
      await connecter(page);
      await intercepter(page, e, () => e.echec);
      await page.goto(e.route);
      await expect(page.locator('main').getByText(e.phraseEchec).first()).toBeVisible({ timeout: 60_000 });
      await expect(phrase(page, e)).toHaveCount(0);
      await expect(page.locator(ORNEMENT)).toHaveCount(0);

      await page.unroute(e.api);
      await intercepter(page, e, e.plein ? () => ({ status: 200, corps: e.plein!() }) : null);
      await page.goto(e.route);
      await expect(e.signePlein(page)).toBeVisible({ timeout: 60_000 });
      await expect(page.locator(ORNEMENT)).toHaveCount(0);
    });
  });
}
