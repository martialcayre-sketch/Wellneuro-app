// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import { patientButtonClassName } from '@/components/patient/ui/PatientButton';
import {
  ENTREES_AUTRES_ESPACES,
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
 * FILET DE « AUTRES ESPACES » SUR LE HUB (lot L1 de l'audit « rails et menus »,
 * chapitre 11 ; EP-03, EP-04, EP-17, EP-20). Le rendu doit rester IDENTIQUE :
 * même `<nav aria-label="Autres espaces">`, même ligne plate, même classe sur
 * chaque lien, même ordre — celui de `ENTREES_AUTRES_ESPACES`.
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

function liensDe(nav: HTMLElement) {
  return within(nav)
    .queryAllByRole('link')
    .map(lien => [lien.textContent, lien.getAttribute('href')]);
}

function attendus(cles: CleEntree[]) {
  return ENTREES_AUTRES_ESPACES.filter(e => cles.includes(e.cle)).map(e => [e.libelle, hrefEntree('PAT_TEST', e)]);
}

const MAJEUR_BIBLIOTHEQUE: CleEntree[] = [
  'bilan',
  'bibliotheque',
  'courrierMedecin',
  'courrierComplement',
  'pourVotreMedecin',
  'compteRendu',
  'depot',
  'renseignements',
  'carnet',
  'suivi',
  'echanges',
  'dossier',
];

const MINEUR: CleEntree[] = [
  'bilan',
  'fiches',
  'courrierMedecin',
  'courrierComplement',
  'pourVotreMedecin',
  'compteRendu',
  'renseignements',
  'carnet',
  'suivi',
  'dossier',
];

const TITRE_MINEUR = 'Avant 18 ans, un parent donne d’abord son accord';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('« Autres espaces » — liste exacte et rendu inchangé', () => {
  it('sondes ouvertes : douze liens, dans l’ordre de la liste, classe ghost, nav flex-wrap', async () => {
    const fetchMock = monter({ age: 'majeur', dossierOuvert: true, bilanConsultable: true });
    const nav = await navApresSondes(fetchMock);
    await waitFor(() => expect(liensDe(nav)).toEqual(attendus(MAJEUR_BIBLIOTHEQUE)));
    expect(nav.getAttribute('aria-label')).toBe('Autres espaces');
    expect(nav.className).toBe('flex flex-wrap gap-3');
    for (const lien of within(nav).getAllByRole('link')) {
      expect(lien.tagName).toBe('A');
      expect(lien.className).toBe(patientButtonClassName('ghost'));
    }
    // Une seule landmark de ce nom, aucun titre visible ajouté.
    expect(screen.getAllByRole('navigation', { name: 'Autres espaces' })).toHaveLength(1);
    expect(within(nav).queryByRole('heading')).toBeNull();
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

  it('sondes fermées, bilan non consultable : carnet et suivi seuls', async () => {
    const fetchMock = monter({ age: 'majeur', dossierOuvert: true, bilanConsultable: false, sondesFermees: true });
    const nav = await navApresSondes(fetchMock);
    expect(liensDe(nav)).toEqual([
      ['Ouvrir Mon carnet alimentaire', '/portail/PAT_TEST/alimentation'],
      ['Ouvrir mes rendez-vous de suivi', '/portail/PAT_TEST/suivi'],
    ]);
  });

  it('les trois liens écrits dans le JSX : bilan sur `bilanConsultable` seul, carnet et suivi toujours', async () => {
    const fetchMock = monter({ age: 'majeur', dossierOuvert: true, bilanConsultable: true, sondesFermees: true });
    const nav = await navApresSondes(fetchMock);
    expect(liensDe(nav)).toEqual([
      ['Consulter mon bilan', '/portail/PAT_TEST/bilan'],
      ['Ouvrir Mon carnet alimentaire', '/portail/PAT_TEST/alimentation'],
      ['Ouvrir mes rendez-vous de suivi', '/portail/PAT_TEST/suivi'],
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
