// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useEffect } from 'react';

/*
 * MENU « MON ESPACE » ([[D-442]]) : quand le bouton paraît (§1), ce qu'il
 * ouvre (§2, §3), comment il se ferme (§4), le mot-symbole (§5), et les sondes
 * partagées avec le hub. Chaque `Lien*` est remplacé par un double qui rapporte
 * l'état configuré et compte ses montages.
 */

const nav = vi.hoisted(() => ({ token: 'PAT_TEST' as string | undefined, pathname: '/portail/PAT_TEST/suivi' }));
vi.mock('next/navigation', () => ({
  useParams: () => (nav.token ? { token: nav.token } : {}),
  usePathname: () => nav.pathname,
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

const sondes = vi.hoisted(() => ({ ouvertes: new Set<string>(), montages: {} as Record<string, number> }));
function double(cle: string) {
  return function Double({ onSonde }: { onSonde?: (ouvert: boolean) => void }) {
    useEffect(() => {
      sondes.montages[cle] = (sondes.montages[cle] ?? 0) + 1;
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

import { BoutonMenuMonEspace, FournisseurMenuPortail, MotSymbole } from './MenuMonEspace';
import { NavAutresEspaces } from '@/components/patient/autres-espaces/NavAutresEspaces';

type Serveur = { trust?: Record<string, unknown> | null; assignations?: Record<string, unknown> | null };
let appels: string[] = [];

function servir({ trust = { ok: true, avantDeCommencerRequis: false }, assignations = {} }: Serveur = {}) {
  appels = [];
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    appels.push(url);
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

async function rendre({ session = true, hub = false, rail = false }: { session?: boolean; hub?: boolean; rail?: boolean } = {}) {
  const resultat = render(
    <FournisseurMenuPortail sessionOuverte={session} rail={rail}>
      <header>
        <MotSymbole />
        <BoutonMenuMonEspace />
      </header>
      <main>{hub && <NavAutresEspaces token="PAT_TEST" bilanConsultable={false} />}</main>
    </FournisseurMenuPortail>,
  );
  await act(async () => {
    await new Promise(r => setTimeout(r, 0));
  });
  return resultat;
}

const bouton = () => screen.queryByRole('button', { name: 'Menu' });
const motSymbole = () => screen.getByText('Wellneuro');

beforeEach(() => {
  nav.token = 'PAT_TEST';
  nav.pathname = '/portail/PAT_TEST/suivi';
  sondes.ouvertes = new Set(['renseignements', 'dossier', 'echanges']);
  sondes.montages = {};
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('§1 — quand le bouton « Menu » paraît', () => {
  it('majeur, murs franchis, page de session : le bouton paraît, le mot-symbole mène au hub', async () => {
    servir();
    await rendre();
    await waitFor(() => expect(bouton()).toBeTruthy());
    expect(motSymbole().closest('a')?.getAttribute('href')).toBe('/portail/PAT_TEST/questionnaires');
  });

  it('majeur clos : le bouton paraît (l’âge, pas la clôture)', async () => {
    servir({ assignations: { dossierOuvert: false } });
    await rendre();
    await waitFor(() => expect(bouton()).toBeTruthy());
  });

  for (const [cas, serveur] of [
    ['mineur', { assignations: { statutAge: 'mineur' } }],
    ['mineur clos', { assignations: { statutAge: 'mineur', dossierOuvert: false } }],
  ] as const) {
    it(`${cas} : pas de bouton ([[D-283]] §5), le mot-symbole mène au hub`, async () => {
      servir(serveur);
      await rendre();
      await waitFor(() => expect(motSymbole().closest('a')).toBeTruthy());
      expect(bouton()).toBeNull();
    });
  }

  for (const [cas, serveur] of [
    ['« Avant de commencer » requis', { trust: { ok: true, avantDeCommencerRequis: true } }],
    ['date de naissance manquante', { assignations: { statutAge: 'date_manquante' } }],
    ['âge absent de la réponse', { assignations: { statutAge: undefined } }],
    ['clé du mur absente', { trust: { ok: true } }],
    ['lecture du mur en échec', { trust: null }],
    ['lecture des assignations en échec', { assignations: null }],
  ] as const) {
    it(`${cas} : ni bouton, ni lien d’accueil`, async () => {
      servir(serveur as Serveur);
      await rendre();
      expect(bouton()).toBeNull();
      expect(motSymbole().closest('a')).toBeNull();
    });
  }

  it('sans session : rien n’est lu, pas de bouton', async () => {
    servir();
    await rendre({ session: false });
    expect(bouton()).toBeNull();
    expect(appels).toEqual([]);
  });

  it('écrans d’entrée (`/portail/{token}`) : rien n’est lu, mot-symbole sans lien', async () => {
    nav.pathname = '/portail/PAT_TEST';
    servir();
    await rendre();
    expect(bouton()).toBeNull();
    expect(motSymbole().closest('a')).toBeNull();
    expect(appels).toEqual([]);
  });
});

describe('§5 — mot-symbole sur les pages sans jeton', () => {
  it('`lien/indisponible` : vers la connexion', async () => {
    nav.token = undefined;
    nav.pathname = '/portail/lien/indisponible';
    servir();
    await rendre({ session: false });
    expect(motSymbole().closest('a')?.getAttribute('href')).toBe('/portail/connexion');
    expect(bouton()).toBeNull();
  });

  it('la connexion elle-même : sans lien', async () => {
    nav.token = undefined;
    nav.pathname = '/portail/connexion';
    servir();
    await rendre({ session: false });
    expect(motSymbole().closest('a')).toBeNull();
  });
});

describe('§2 à §4 — le panneau « Mon espace »', () => {
  async function ouvrir() {
    servir({ assignations: { parcours: { bilanConsultable: true } } });
    const resultat = await rendre();
    await waitFor(() => expect(bouton()).toBeTruthy());
    fireEvent.click(bouton()!);
    const panneau = await screen.findByRole('dialog', { name: 'Mon espace' });
    return { panneau, resultat };
  }

  it('titre, nav nommée, « Mon parcours » puis les groupes servis dans l’ordre de [[D-423]] §2', async () => {
    const { panneau } = await ouvrir();
    const navigation = within(panneau).getByRole('navigation', { name: 'Mon espace' });
    const liens = within(navigation).getAllByRole('link').map(l => l.textContent);
    expect(liens).toEqual([
      'Mon parcours',
      'Ouvrir mes rendez-vous de suivi',
      'Ouvrir mon carnet alimentaire',
      'Consulter mon bilan',
      'Ma fiche de renseignements',
      'Ouvrir mon dossier à deux voix',
      'Ouvrir mes échanges',
    ]);
    expect(within(navigation).getAllByRole('heading').map(h => h.textContent)).toEqual([
      'Au jour le jour',
      'Ce que j’ai reçu',
      'Ce que je transmets',
      'Avec mon praticien',
    ]);
    expect(within(panneau).getByRole('button', { name: 'Fermer Mon espace' })).toBeTruthy();
  });

  it('un seul `aria-current="page"`, sur l’entrée du chemin', async () => {
    const { panneau } = await ouvrir();
    const courants = panneau.querySelectorAll('[aria-current]');
    expect(courants).toHaveLength(1);
    expect(courants[0].getAttribute('aria-current')).toBe('page');
    expect(courants[0].textContent).toBe('Ouvrir mes rendez-vous de suivi');
  });

  it('cibles de 44 px en `rem` sur chaque lien', async () => {
    const { panneau } = await ouvrir();
    for (const lien of within(panneau).getAllByRole('link')) {
      expect(lien.className).toMatch(/\bmin-h-11\b/);
    }
  });

  it('se ferme au changement de page, et seulement là', async () => {
    const { resultat } = await ouvrir();
    const memeArbre = () => (
      <FournisseurMenuPortail sessionOuverte>
        <header>
          <MotSymbole />
          <BoutonMenuMonEspace />
        </header>
        <main />
      </FournisseurMenuPortail>
    );
    // Témoin : un nouveau rendu sur le même chemin laisse le panneau ouvert.
    resultat.rerender(memeArbre());
    await act(async () => {
      await new Promise(r => setTimeout(r, 0));
    });
    expect(screen.queryByRole('dialog')).toBeTruthy();
    nav.pathname = '/portail/PAT_TEST/bilan';
    resultat.rerender(memeArbre());
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('se ferme avant l’impression', async () => {
    await ouvrir();
    act(() => {
      window.dispatchEvent(new Event('beforeprint'));
    });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('se ferme par Échap, et le focus revient au bouton', async () => {
    await ouvrir();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(document.activeElement).toBe(bouton());
  });
});

describe('§2 — sondes partagées avec le hub', () => {
  it('sur le hub : chaque sonde est montée une fois, et le hub lit les mêmes réponses', async () => {
    nav.pathname = '/portail/PAT_TEST/questionnaires';
    servir();
    await rendre({ hub: true });
    await waitFor(() => expect(bouton()).toBeTruthy());
    for (const cle of ['fiches', 'bibliotheque', 'renseignements', 'dossier', 'echanges']) {
      expect(sondes.montages[cle], cle).toBe(1);
    }
    // Parité hub / menu : même source, mêmes entrées, même ordre.
    const hub = within(screen.getByRole('navigation', { name: 'Autres espaces' }))
      .getAllByRole('link')
      .map(l => l.textContent);
    fireEvent.click(bouton()!);
    const menu = within(await screen.findByRole('navigation', { name: 'Mon espace' }))
      .getAllByRole('link')
      .map(l => l.textContent);
    expect(menu).toEqual(hub);
  });

  it('sous-page d’un mineur : aucune sonde montée par le menu', async () => {
    servir({ assignations: { statutAge: 'mineur' } });
    await rendre();
    await waitFor(() => expect(motSymbole().closest('a')).toBeTruthy());
    expect(sondes.montages).toEqual({});
  });
});

describe('[[D-483]] §2 — « Autres espaces » sur le hub, rail servi', () => {
  const autres = () => screen.getByRole('navigation', { name: 'Autres espaces' });

  it('rail servi, dossier majeur : non rendu dès 1 024 px (`lg:hidden`), rendu au-dessous', async () => {
    nav.pathname = '/portail/PAT_TEST/questionnaires';
    servir();
    await rendre({ hub: true, rail: true });
    await waitFor(() => expect(autres().className.split(/\s+/)).toContain('lg:hidden'));
    expect(autres().className.split(/\s+/)).not.toContain('hidden');
  });

  it('rail servi, garde en lecture : déjà retiré dès 1 024 px, sans saut à l’arrivée de la garde', async () => {
    nav.pathname = '/portail/PAT_TEST/questionnaires';
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));
    await rendre({ hub: true, rail: true });
    expect(autres().className.split(/\s+/)).toContain('lg:hidden');
  });

  for (const [cas, serveur, rail] of [
    ['drapeau du rail fermé', {}, false],
    ['dossier mineur (la garde du rail refuse)', { assignations: { statutAge: 'mineur' } }, true],
    ['lecture des murs en échec', { trust: null }, true],
  ] as const) {
    it(`${cas} : « Autres espaces » reste à toute largeur`, async () => {
      nav.pathname = '/portail/PAT_TEST/questionnaires';
      servir(serveur as Serveur);
      await rendre({ hub: true, rail });
      await waitFor(() => expect(autres()).toBeTruthy());
      await act(async () => {
        await new Promise(r => setTimeout(r, 0));
      });
      expect(autres().className).not.toMatch(/\blg:hidden\b/);
    });
  }
});
