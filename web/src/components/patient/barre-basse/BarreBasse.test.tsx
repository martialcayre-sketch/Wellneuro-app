// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import { useEffect } from 'react';

/*
 * BARRE BASSE ([[D-444]]) : où elle paraît (§1), ses cases (§2, §3), la
 * réserve du pied d'urgence (§4), l'activation (§5) et la forme (§6). Elle
 * reprend la garde et les sondes du menu « Mon espace » : chaque `Lien*` est
 * remplacé par un double qui rapporte l'état configuré.
 */

const nav = vi.hoisted(() => ({ token: 'PAT_TEST' as string | undefined, pathname: '/portail/PAT_TEST/suivi' }));
vi.mock('next/navigation', () => ({
  useParams: () => (nav.token ? { token: nav.token } : {}),
  usePathname: () => nav.pathname,
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

const sondes = vi.hoisted(() => ({ ouvertes: new Set<string>() }));
function double(cle: string) {
  return function Double({ onSonde }: { onSonde?: (ouvert: boolean) => void }) {
    useEffect(() => {
      onSonde?.(sondes.ouvertes.has(cle));
    }, [onSonde]);
    return null;
  };
}
vi.mock('@/components/patient-companion/LienFichesRemises', () => ({ LienFichesRemises: double('fiches') }));
vi.mock('@/components/patient-companion/LienBibliotheque', () => ({ LienBibliotheque: double('bibliotheque') }));
vi.mock('@/components/patient-companion/LienCourrierMedecin', () => ({ LienCourrierMedecin: double('courrierMedecin') }));
vi.mock('@/components/patient-companion/LienCourrierComplement', () => ({ LienCourrierComplement: double('courrierComplement') }));
vi.mock('@/components/patient-companion/LienPourVotreMedecin', () => ({ LienPourVotreMedecin: double('pourVotreMedecin') }));
vi.mock('@/components/patient-companion/LienTransmissionCompteRendu', () => ({ LienTransmissionCompteRendu: double('compteRendu') }));
vi.mock('@/components/patient-companion/LienDepotDocuments', () => ({ LienDepotDocuments: double('depot') }));
vi.mock('@/components/physio-traitements/LienFicheRenseignements', () => ({ LienFicheRenseignements: double('renseignements') }));
vi.mock('@/components/patient-companion/LienMesEchanges', () => ({ LienMesEchanges: double('echanges') }));
vi.mock('@/components/patient-companion/LienDossierDeuxVoix', () => ({ LienDossierDeuxVoix: double('dossier') }));

import { BoutonMenuMonEspace, FournisseurMenuPortail } from '@/components/patient/menu/MenuMonEspace';
import { BarreBasse } from './BarreBasse';
import * as textes from './textesBarreBasse';

type Serveur = { trust?: Record<string, unknown> | null; assignations?: Record<string, unknown> | null };

function servir({ trust = { ok: true, avantDeCommencerRequis: false }, assignations = {} }: Serveur = {}) {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    const corps = url.startsWith('/api/portail/trust/etat')
      ? trust
      : url.startsWith('/api/portail/assignations')
        ? assignations && {
            ok: true,
            statutAge: 'majeur',
            dossierOuvert: true,
            parcours: { consultationStatut: null, bookletEnvoye: false, bilanConsultable: false },
            ...assignations,
          }
        : null;
    return corps ? { ok: true, status: 200, json: async () => corps } : { ok: false, status: 500, json: async () => ({}) };
  }));
}

async function rendre({ session = true }: { session?: boolean } = {}) {
  const resultat = render(
    <FournisseurMenuPortail sessionOuverte={session}>
      <header>
        <BoutonMenuMonEspace />
      </header>
      <main />
      <footer />
      <BarreBasse />
    </FournisseurMenuPortail>,
  );
  await act(async () => {
    await new Promise(r => setTimeout(r, 0));
  });
  return resultat;
}

const barre = () => screen.queryByRole('navigation', { name: 'Accès rapides' });
const libelles = () => within(barre()!).getAllByRole('link').map(l => l.textContent);
const courant = () => barre()!.querySelectorAll('[aria-current]');

beforeEach(() => {
  nav.token = 'PAT_TEST';
  nav.pathname = '/portail/PAT_TEST/suivi';
  sondes.ouvertes = new Set();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('§1 — où la barre paraît', () => {
  it('majeur, murs franchis, page de session : la barre paraît', async () => {
    servir();
    await rendre();
    await waitFor(() => expect(barre()).toBeTruthy());
  });

  it('majeur clos : la barre paraît (l’âge, pas la clôture)', async () => {
    servir({ assignations: { dossierOuvert: false } });
    await rendre();
    await waitFor(() => expect(barre()).toBeTruthy());
  });

  it('questionnaire en cours (`/questionnaires/<id>`) : pas de barre ni de réserve', async () => {
    nav.pathname = '/portail/PAT_TEST/questionnaires/ASG_1';
    servir();
    const { container } = await rendre();
    // Témoin : la garde est franchie (le bouton « Menu » paraît), la barre
    // manque pour le seul chemin.
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Menu' })).toBeTruthy());
    expect(barre()).toBeNull();
    expect(container.querySelector('[aria-hidden="true"]')).toBeNull();
  });

  for (const [cas, serveur] of [
    ['mineur', { assignations: { statutAge: 'mineur' } }],
    ['mineur clos', { assignations: { statutAge: 'mineur', dossierOuvert: false } }],
    ['« Avant de commencer » requis', { trust: { ok: true, avantDeCommencerRequis: true } }],
    ['date de naissance manquante', { assignations: { statutAge: 'date_manquante' } }],
    ['lecture du mur en échec', { trust: null }],
    ['lecture des assignations en échec', { assignations: null }],
  ] as const) {
    it(`${cas} : ni barre, ni réserve`, async () => {
      servir(serveur as Serveur);
      const { container } = await rendre();
      expect(barre()).toBeNull();
      expect(container.querySelector('[aria-hidden="true"]')).toBeNull();
    });
  }

  it('sans session : pas de barre', async () => {
    servir();
    await rendre({ session: false });
    expect(barre()).toBeNull();
  });

  it('écrans d’entrée (`/portail/{token}`) : pas de barre', async () => {
    nav.pathname = '/portail/PAT_TEST';
    servir();
    await rendre();
    expect(barre()).toBeNull();
  });
});

describe('§2 et §3 — les cases', () => {
  it('rien de remis : Accueil, Carnet, Suivi, vers leurs pages', async () => {
    servir();
    await rendre();
    await waitFor(() => expect(barre()).toBeTruthy());
    expect(libelles()).toEqual(['Accueil', 'Carnet', 'Suivi']);
    expect(within(barre()!).getAllByRole('link').map(l => l.getAttribute('href'))).toEqual([
      '/portail/PAT_TEST/questionnaires',
      '/portail/PAT_TEST/alimentation',
      '/portail/PAT_TEST/suivi',
    ]);
  });

  it('bibliothèque servie : quatrième case « Bibliothèque »', async () => {
    sondes.ouvertes = new Set(['bibliotheque']);
    servir();
    await rendre();
    await waitFor(() => expect(libelles()).toEqual(['Accueil', 'Carnet', 'Suivi', 'Bibliothèque']));
    expect(screen.getByRole('link', { name: 'Bibliothèque' }).getAttribute('href')).toBe('/portail/PAT_TEST/bibliotheque');
  });

  it('fiches servies : quatrième case « Fiches »', async () => {
    sondes.ouvertes = new Set(['fiches']);
    servir();
    await rendre();
    await waitFor(() => expect(libelles()).toEqual(['Accueil', 'Carnet', 'Suivi', 'Fiches']));
    expect(screen.getByRole('link', { name: 'Fiches' }).getAttribute('href')).toBe('/portail/PAT_TEST/fiches');
  });

  it('jamais les deux, et jamais une autre entrée servie', async () => {
    sondes.ouvertes = new Set(['bibliotheque', 'fiches', 'dossier', 'echanges', 'depot']);
    servir({ assignations: { parcours: { bilanConsultable: true } } });
    await rendre();
    await waitFor(() => expect(libelles()).toEqual(['Accueil', 'Carnet', 'Suivi', 'Bibliothèque']));
  });

  it('textes sans chiffre ([[D-333]] §1), aucune case « Menu » ni « Plus »', async () => {
    for (const texte of Object.values(textes)) expect(texte).not.toMatch(/\d/);
    sondes.ouvertes = new Set(['bibliotheque']);
    servir();
    await rendre();
    await waitFor(() => expect(libelles()).toHaveLength(4));
    expect(within(barre()!).queryByRole('button')).toBeNull();
  });
});

describe('§5 — activation', () => {
  for (const [chemin, attendu] of [
    ['questionnaires', 'Accueil'],
    ['protocole', 'Accueil'],
    ['alimentation', 'Carnet'],
    ['suivi', 'Suivi'],
    ['bibliotheque', 'Bibliothèque'],
    ['fiches', 'Bibliothèque'],
    ['fiches/REM_1', 'Bibliothèque'],
  ] as const) {
    it(`/${chemin} allume « ${attendu} », et elle seule`, async () => {
      nav.pathname = `/portail/PAT_TEST/${chemin}`;
      sondes.ouvertes = new Set(['bibliotheque']);
      servir();
      await rendre();
      await waitFor(() => expect(libelles()).toHaveLength(4));
      expect(courant()).toHaveLength(1);
      expect(courant()[0].getAttribute('aria-current')).toBe('page');
      expect(courant()[0].textContent).toBe(attendu);
    });
  }

  for (const chemin of ['bilan', 'dossier', 'informations', 'conditions']) {
    it(`/${chemin} n’allume aucune case`, async () => {
      nav.pathname = `/portail/PAT_TEST/${chemin}`;
      sondes.ouvertes = new Set(['dossier']);
      servir({ assignations: { parcours: { bilanConsultable: true } } });
      await rendre();
      await waitFor(() => expect(barre()).toBeTruthy());
      expect(courant()).toHaveLength(0);
    });
  }
});

describe('§4 et §6 — réserve, largeur, impression, cibles', () => {
  it('la réserve suit le pied dans le flux, à la hauteur de la barre plus la zone sûre', async () => {
    servir();
    const { container } = await rendre();
    await waitFor(() => expect(barre()).toBeTruthy());
    const reserve = container.querySelector('[aria-hidden="true"]')!;
    expect(reserve.previousElementSibling?.tagName).toBe('FOOTER');
    expect(reserve.className).toContain('h-[calc(4rem+1px+env(safe-area-inset-bottom))]');
    expect(reserve.className).toMatch(/\bmd:hidden\b/);
    expect(reserve.className).toMatch(/\bprint:hidden\b/);
    expect(within(barre()!).getByRole('list').className).toMatch(/\bh-16\b/);
  });

  it('fixée en bas, sous 768 px seulement, jamais imprimée, sous les superpositions', async () => {
    servir();
    await rendre();
    await waitFor(() => expect(barre()).toBeTruthy());
    const classe = barre()!.className;
    for (const attendu of ['fixed', 'bottom-0', 'md:hidden', 'print:hidden', 'z-30', 'pb-[env(safe-area-inset-bottom)]']) {
      expect(classe.split(/\s+/)).toContain(attendu);
    }
    expect(classe).not.toMatch(/--rail|rail-/);
  });

  it('cibles de 44 px en `rem`, sans `outline-none`', async () => {
    servir();
    await rendre();
    await waitFor(() => expect(barre()).toBeTruthy());
    for (const lien of within(barre()!).getAllByRole('link')) {
      expect(lien.className).toMatch(/\bmin-h-11\b/);
      expect(lien.className).not.toMatch(/outline-none/);
    }
  });
});
