// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import {
  ENTREES_AUTRES_ESPACES,
  GROUPES_AUTRES_ESPACES,
  hrefEntree,
  type CleEntree,
} from '@/components/patient/autres-espaces/entreesAutresEspaces';

const { routeur } = vi.hoisted(() => ({ routeur: { replace: vi.fn(), push: vi.fn() } }));
vi.mock('next/navigation', () => ({
  useParams: () => ({ token: 'PAT_TEST' }),
  useRouter: () => routeur,
}));

import QuestionnairesHubPage from './page';

/*
 * « AUTRES ESPACES » SUR LE HUB, RANGÉS EN GROUPES (lot L2 de l'audit « rails
 * et menus », chapitre 11 ; [[D-423]] §2 à §6 ; filet posé par L1 : EP-03,
 * EP-04, EP-17, EP-20). Même `<nav aria-label="Autres espaces">`, l'ancre
 * « Mon parcours », puis les groupes servis, dans l'ordre de
 * `ENTREES_AUTRES_ESPACES`.
 *
 * Les réponses des sondes par état sont celles des routes (lues le 2026-11-03,
 * sous `web/src/app/api/portail/`) : bibliotheque/route.ts:40-41,
 * documents/route.ts:70-72 et echanges/route.ts:36-38 refusent le non-majeur
 * (409) ; fiches-assiette/route.ts:57-63 sert `bibliotheque` selon
 * `bibliothequeServie` (drapeau ET majeur) ; les autres sondes ne lisent pas
 * l'âge. AUCUNE NE LIT LE DOSSIER CLOS : un dossier clos suit son âge, le hub
 * ne force que l'écran (statut servi `majeur`, page.tsx:275).
 */

type Age = 'majeur' | 'mineur';

function reponsesSondes(age: Age, options: { bibliothequeDrapeau: boolean; fermees?: boolean }) {
  const majeur = age === 'majeur';
  const ferme = { status: 404, corps: { ok: false, reason: 'desactive', error: 'x' } };
  const horsMajeur = { status: 409, corps: { ok: false, reason: 'hors_majeur', error: 'x' } };
  const oui = (corps: Record<string, unknown>) => ({ status: 200, corps: { ok: true, ...corps } });
  const sondes: Record<string, { status: number; corps: unknown }> = {
    '/api/portail/fiches-assiette': oui({
      ouvert: true,
      fichesRemises: true,
      bibliotheque: options.bibliothequeDrapeau && majeur,
    }),
    '/api/portail/bibliotheque': !options.bibliothequeDrapeau
      ? ferme
      : majeur
        ? oui({ ouvert: true, fichesRemises: true })
        : horsMajeur,
    '/api/portail/lettre-adressage': oui({ ouvert: true, lettreRemise: true }),
    '/api/portail/courrier-complement': oui({ ouvert: true, courrierRemis: true }),
    '/api/portail/document-medecin': oui({ ouvert: true, disponible: true }),
    '/api/portail/comptes-rendus': oui({}),
    '/api/portail/documents': majeur ? oui({ ouvert: true }) : horsMajeur,
    '/api/portail/physio-traitements': oui({ ouvert: true }),
    '/api/portail/echanges': majeur ? oui({ ouvert: true }) : horsMajeur,
    '/api/portail/dossier': oui({ ouvert: true }),
  };
  if (options.fermees) for (const url of Object.keys(sondes)) sondes[url] = ferme;
  return sondes;
}

const URLS_SONDES = Object.keys(reponsesSondes('majeur', { bibliothequeDrapeau: true }));

function monter(session: {
  age: Age;
  dossierOuvert: boolean;
  bilanConsultable: boolean;
  bibliothequeDrapeau?: boolean;
  sondesFermees?: boolean;
  avantDeCommencerRequis?: boolean;
  statutAge?: string;
  protocoleDiffuse?: boolean;
}) {
  const sondes = reponsesSondes(session.age, {
    bibliothequeDrapeau: session.bibliothequeDrapeau ?? true,
    fermees: session.sondesFermees,
  });
  const fetchMock = vi.fn(async (url: string) => {
    const chemin = new URL(url, 'http://localhost').pathname;
    if (chemin === '/api/portail/assignations') {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          patient: { idPatient: 'PAT_TEST', prenom: 'Sophie', nom: 'Nicola' },
          assignations: [],
          agendas: [],
          agendasAlimentaires: [],
          derniereReponseLe: null,
          parcours: { consultationStatut: null, bookletEnvoye: false, bilanConsultable: session.bilanConsultable },
          statutAge: session.statutAge ?? session.age,
          dossierOuvert: session.dossierOuvert,
        }),
      };
    }
    if (chemin === '/api/portail/protocole') {
      return { ok: true, status: 200, json: async () => ({ ok: true, protocoleDiffuse: session.protocoleDiffuse === true, finDeCycle: false }) };
    }
    if (chemin === '/api/portail/trust/etat') {
      return { ok: true, status: 200, json: async () => ({ ok: true, avantDeCommencerRequis: session.avantDeCommencerRequis === true }) };
    }
    const sonde = sondes[chemin];
    if (sonde) return { ok: sonde.status < 300, status: sonde.status, json: async () => sonde.corps };
    return { ok: true, status: 200, json: async () => ({ ok: false, error: 'indisponible' }) };
  });
  vi.stubGlobal('fetch', fetchMock);
  render(<QuestionnairesHubPage />);
  return fetchMock;
}

/** Attend que les dix sondes aient répondu et que le rendu soit stable. */
async function navApresSondes(fetchMock: ReturnType<typeof vi.fn>) {
  const nav = await screen.findByRole('navigation', { name: 'Autres espaces' });
  await waitFor(() => {
    const appelees = new Set(fetchMock.mock.calls.map(([url]) => new URL(String(url), 'http://localhost').pathname));
    for (const url of URLS_SONDES) expect(appelees.has(url)).toBe(true);
  });
  // Deux tours de micro-tâches : chaque sonde lit son corps puis pose son état.
  await new Promise(resoudre => setTimeout(resoudre, 0));
  return nav;
}

/** Les entrées des groupes, à plat, ancre « Mon parcours » exclue. */
function liensDe(nav: HTMLElement) {
  return within(nav)
    .queryAllByRole('link')
    .filter(lien => lien.getAttribute('aria-current') !== 'page')
    .map(lien => [lien.textContent, lien.getAttribute('href')]);
}

/** Chaque groupe rendu : son étiquette, puis ses liens. */
function groupesDe(nav: HTMLElement) {
  return within(nav)
    .queryAllByRole('list')
    .map(liste => [
      liste.getAttribute('aria-labelledby') ? document.getElementById(liste.getAttribute('aria-labelledby')!)?.textContent : null,
      within(liste)
        .queryAllByRole('link')
        .map(lien => lien.textContent),
    ]);
}

function attendus(cles: CleEntree[]) {
  return ENTREES_AUTRES_ESPACES.filter(e => cles.includes(e.cle)).map(e => [e.libelle, hrefEntree('PAT_TEST', e)]);
}

const MAJEUR_BIBLIOTHEQUE: CleEntree[] = [
  'suivi',
  'carnet',
  'bilan',
  'bibliotheque',
  'courrierMedecin',
  'courrierComplement',
  'pourVotreMedecin',
  'renseignements',
  'compteRendu',
  'depot',
  'dossier',
  'echanges',
];

const MINEUR: CleEntree[] = [
  'suivi',
  'carnet',
  'bilan',
  'fiches',
  'courrierMedecin',
  'courrierComplement',
  'pourVotreMedecin',
  'renseignements',
  'compteRendu',
  'dossier',
];

const TITRE_MINEUR = 'Avant 18 ans, un parent donne d’abord son accord';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('« Autres espaces » — groupes et ordre exacts (D-423 §2)', () => {
  it('sondes ouvertes : quatre groupes, entrées dans l’ordre écrit, sur le modèle de SidebarRail', async () => {
    const fetchMock = monter({ age: 'majeur', dossierOuvert: true, bilanConsultable: true });
    const nav = await navApresSondes(fetchMock);
    await waitFor(() => expect(liensDe(nav)).toEqual(attendus(MAJEUR_BIBLIOTHEQUE)));
    expect(groupesDe(nav)).toEqual([
      ['Au jour le jour', ['Ouvrir mes rendez-vous de suivi', 'Ouvrir Mon carnet alimentaire']],
      [
        'Ce que j’ai reçu',
        ['Consulter mon bilan', 'Ma bibliothèque', 'Courrier pour votre médecin', 'Courrier à remettre à votre médecin', 'Pour votre médecin'],
      ],
      ['Ce que je transmets', ['Ma fiche de renseignements', 'Transmettre un compte rendu d’analyses', 'Déposer un document']],
      ['Avec mon praticien', ['Ouvrir mon dossier à deux voix', 'Ouvrir mes échanges']],
    ]);
    // Étiquettes de groupe : des titres visibles, dans l'ordre de la décision.
    expect(within(nav).getAllByRole('heading', { level: 2 }).map(h => h.textContent)).toEqual(
      GROUPES_AUTRES_ESPACES.map(g => g.libelle),
    );
  });

  it('l’ancre « Mon parcours » ouvre la nav, vers le hub, seul élément actif (§4)', async () => {
    const fetchMock = monter({ age: 'majeur', dossierOuvert: true, bilanConsultable: true });
    const nav = await navApresSondes(fetchMock);
    await waitFor(() => expect(liensDe(nav)).toHaveLength(12));
    const liens = within(nav).getAllByRole('link');
    expect(liens[0].textContent).toBe('Mon parcours');
    expect(liens[0].getAttribute('href')).toBe('/portail/PAT_TEST/questionnaires');
    expect(liens.filter(l => l.getAttribute('aria-current') === 'page')).toEqual([liens[0]]);
    // « Mon parcours » reste UN SEUL titre : l'ancre est un lien, pas un titre.
    expect(screen.getAllByRole('heading', { name: /^Mon parcours$/ })).toHaveLength(1);
    expect(within(nav).queryByRole('heading', { name: 'Mon parcours' })).toBeNull();
  });

  it('chaque lien une seule fois, une seule landmark de ce nom', async () => {
    const fetchMock = monter({ age: 'majeur', dossierOuvert: true, bilanConsultable: true });
    const nav = await navApresSondes(fetchMock);
    await waitFor(() => expect(liensDe(nav)).toHaveLength(12));
    const hrefs = within(nav).getAllByRole('link').map(l => l.getAttribute('href'));
    expect(new Set(hrefs).size).toBe(hrefs.length);
    expect(screen.getAllByRole('navigation', { name: 'Autres espaces' })).toHaveLength(1);
    // Hors de la nav, aucun Lien* ne rend plus le sien (`sondeSeule`).
    for (const { libelle } of ENTREES_AUTRES_ESPACES) {
      expect(screen.queryAllByRole('link', { name: libelle }).filter(l => !nav.contains(l))).toEqual([]);
    }
  });

  it('liens de liste, cible de 44 px en rem, aucun bouton ghost, rien du rail praticien', async () => {
    const fetchMock = monter({ age: 'majeur', dossierOuvert: true, bilanConsultable: true });
    const nav = await navApresSondes(fetchMock);
    await waitFor(() => expect(liensDe(nav)).toHaveLength(12));
    for (const lien of within(nav).getAllByRole('link')) {
      expect(lien.tagName).toBe('A');
      // jsdom ne mesure rien : on épingle la règle de rendu. `min-h-11` vaut
      // 2,75 rem, soit 44 px à 100 % et davantage au confort 112,5 %.
      expect(lien.className.split(' ')).toContain('min-h-11');
      expect(lien.className).not.toMatch(/\bmin-h-12\b|\bpx-\[22px\]/);
    }
    for (const lien of within(nav).getAllByRole('link').filter(l => l.getAttribute('aria-current') !== 'page')) {
      expect(lien.closest('li')).not.toBeNull();
    }
    expect(nav.outerHTML).not.toMatch(/\bbg-rail|rail-|data-theme="praticien"/);
    expect(nav.closest('[data-theme="praticien"]')).toBeNull();
    // Aucun repli dans la nav (§2).
    expect(nav.querySelector('details')).toBeNull();
  });

  it('chaque sonde n’est appelée qu’une fois (la remontée d’état ne relance rien)', async () => {
    const fetchMock = monter({ age: 'majeur', dossierOuvert: true, bilanConsultable: true });
    const nav = await navApresSondes(fetchMock);
    await waitFor(() => expect(liensDe(nav)).toHaveLength(12));
    for (const url of URLS_SONDES) {
      const appels = fetchMock.mock.calls.filter(([u]) => new URL(String(u), 'http://localhost').pathname === url);
      expect([url, appels.length]).toEqual([url, 1]);
    }
  });

  it('sondes fermées, bilan non consultable : « Au jour le jour » seul, aucune autre étiquette', async () => {
    const fetchMock = monter({ age: 'majeur', dossierOuvert: true, bilanConsultable: false, sondesFermees: true });
    const nav = await navApresSondes(fetchMock);
    expect(groupesDe(nav)).toEqual([['Au jour le jour', ['Ouvrir mes rendez-vous de suivi', 'Ouvrir Mon carnet alimentaire']]]);
    for (const libelle of ['Ce que j’ai reçu', 'Ce que je transmets', 'Avec mon praticien']) {
      expect(screen.queryByText(libelle)).toBeNull();
    }
  });

  it('sondes fermées, bilan consultable : « Ce que j’ai reçu » porte le bilan seul', async () => {
    const fetchMock = monter({ age: 'majeur', dossierOuvert: true, bilanConsultable: true, sondesFermees: true });
    const nav = await navApresSondes(fetchMock);
    expect(groupesDe(nav)).toEqual([
      ['Au jour le jour', ['Ouvrir mes rendez-vous de suivi', 'Ouvrir Mon carnet alimentaire']],
      ['Ce que j’ai reçu', ['Consulter mon bilan']],
    ]);
  });
});

describe('« Autres espaces » — exclusion fiches / bibliothèque (D-360 §2)', () => {
  it('bibliothèque servie : « Ma bibliothèque », jamais les fiches', async () => {
    const fetchMock = monter({ age: 'majeur', dossierOuvert: true, bilanConsultable: false });
    const nav = await navApresSondes(fetchMock);
    await waitFor(() => expect(within(nav).queryByRole('link', { name: 'Ma bibliothèque' })).not.toBeNull());
    expect(within(nav).queryByRole('link', { name: 'Fiches remises par mon praticien' })).toBeNull();
  });

  it('drapeau de la bibliothèque fermé : les fiches, jamais la bibliothèque', async () => {
    const fetchMock = monter({ age: 'majeur', dossierOuvert: true, bilanConsultable: false, bibliothequeDrapeau: false });
    const nav = await navApresSondes(fetchMock);
    await waitFor(() => expect(within(nav).queryByRole('link', { name: 'Fiches remises par mon praticien' })).not.toBeNull());
    expect(within(nav).queryByRole('link', { name: 'Ma bibliothèque' })).toBeNull();
  });
});

describe('« Autres espaces » — matrice majeur, mineur, dossier clos (EP-20)', () => {
  it.each([
    ['majeur, dossier ouvert', { age: 'majeur' as const, dossierOuvert: true }, MAJEUR_BIBLIOTHEQUE, false],
    ['mineur, dossier ouvert', { age: 'mineur' as const, dossierOuvert: true }, MINEUR, true],
    ['dossier clos, majeur', { age: 'majeur' as const, dossierOuvert: false }, MAJEUR_BIBLIOTHEQUE, false],
    // Les sondes ne lisent pas le dossier clos : un mineur clos garde les
    // liens d'un mineur, sans l'écran des mineurs.
    ['dossier clos, mineur', { age: 'mineur' as const, dossierOuvert: false }, MINEUR, false],
  ])('%s', async (_cas, etat, cles, ecranMineur) => {
    const fetchMock = monter({ ...etat, bilanConsultable: true });
    const nav = await navApresSondes(fetchMock);
    await waitFor(() => expect(liensDe(nav)).toEqual(attendus(cles)));
    expect(screen.queryByText(TITRE_MINEUR) !== null).toBe(ecranMineur);
    // Un groupe rendu a toujours au moins un lien.
    for (const [, liens] of groupesDe(nav)) expect((liens as string[]).length).toBeGreaterThan(0);
  });
});

describe('« Mon accompagnement » — déplié d’office quand un protocole est servi (D-423 §3, Q19)', () => {
  const blocAccompagnement = () => screen.getByText('Mon accompagnement', { selector: 'summary' }).closest('details')!;

  it('protocole servi : déplié', async () => {
    const fetchMock = monter({ age: 'majeur', dossierOuvert: true, bilanConsultable: false, protocoleDiffuse: true });
    await navApresSondes(fetchMock);
    await waitFor(() => expect(blocAccompagnement().open).toBe(true));
  });

  it('sans protocole servi : replié', async () => {
    const fetchMock = monter({ age: 'majeur', dossierOuvert: true, bilanConsultable: false, protocoleDiffuse: false });
    await navApresSondes(fetchMock);
    await waitFor(() =>
      expect(fetchMock.mock.calls.some(([u]) => new URL(String(u), 'http://localhost').pathname === '/api/portail/protocole')).toBe(true),
    );
    await new Promise(resoudre => setTimeout(resoudre, 0));
    expect(blocAccompagnement().open).toBe(false);
  });
});

describe('« Autres espaces » — absente derrière les murs d’entrée', () => {
  it('« Avant de commencer » requis : aucune nav', async () => {
    monter({ age: 'majeur', dossierOuvert: true, bilanConsultable: true, avantDeCommencerRequis: true });
    await waitFor(() => expect(screen.queryByText('Chargement de vos questionnaires…')).toBeNull());
    await new Promise(resoudre => setTimeout(resoudre, 0));
    expect(screen.queryByRole('navigation', { name: 'Autres espaces' })).toBeNull();
  });

  it('date de naissance manquante : aucune nav', async () => {
    monter({ age: 'majeur', dossierOuvert: true, bilanConsultable: true, statutAge: 'date_manquante' });
    await waitFor(() => expect(screen.queryByText('Chargement de vos questionnaires…')).toBeNull());
    expect(screen.queryByRole('navigation', { name: 'Autres espaces' })).toBeNull();
  });
});
