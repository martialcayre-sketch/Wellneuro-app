// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useEffect } from 'react';

/*
 * RAIL LATÉRAL ([[D-447]]) : où il paraît et ce qu'il fait du bouton « Menu »
 * (§1, amendement de [[D-442]] §1), sa liste (§2), l'activation (§3), le
 * comportement (§4), la forme et les jetons (§5), le cadre à deux colonnes
 * (§6). Il reprend la garde et les sondes du menu : chaque `Lien*` est remplacé
 * par un double qui rapporte l'état configuré. La largeur réelle (`lg`, la
 * colonne, le pied) relève de l'E2E `portail-rail-lateral.spec.ts`.
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
import { CadreRailMonEspace } from './RailMonEspace';
import { railLateralOuvert } from './railDrapeau';
import { railSurLeChemin } from './cheminRail';

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

/** Compte les montages du contenu de la page : le cadre ne doit jamais le remonter. */
const montages = vi.hoisted(() => ({ n: 0 }));
function Page() {
  useEffect(() => {
    montages.n += 1;
  }, []);
  return <p>contenu</p>;
}

async function rendre({ session = true, railServi = true }: { session?: boolean; railServi?: boolean } = {}) {
  const resultat = render(
    <FournisseurMenuPortail sessionOuverte={session}>
      <header>
        <BoutonMenuMonEspace railServi={railServi} />
      </header>
      <CadreRailMonEspace>
        <main>
          <Page />
        </main>
      </CadreRailMonEspace>
      <footer />
    </FournisseurMenuPortail>,
  );
  await act(async () => {
    await new Promise(r => setTimeout(r, 0));
  });
  return resultat;
}

/** Le rail est la seule `nav` « Mon espace » hors du panneau. */
const rail = () => screen.queryByRole('navigation', { name: 'Mon espace' });
const bouton = () => screen.queryByRole('button', { name: 'Menu' });
const courant = () => rail()!.querySelectorAll('[aria-current]');

type Ecouteur = () => void;
function largeur(initiale: boolean) {
  const ecouteurs = new Set<Ecouteur>();
  const requete = {
    matches: initiale,
    addEventListener: (_: string, f: Ecouteur) => ecouteurs.add(f),
    removeEventListener: (_: string, f: Ecouteur) => ecouteurs.delete(f),
  };
  vi.stubGlobal('matchMedia', vi.fn(() => requete));
  return {
    passer(matches: boolean) {
      requete.matches = matches;
      act(() => ecouteurs.forEach(f => f()));
    },
  };
}

beforeEach(() => {
  nav.token = 'PAT_TEST';
  nav.pathname = '/portail/PAT_TEST/suivi';
  sondes.ouvertes = new Set();
  montages.n = 0;
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('drapeau et chemin', () => {
  it('`WN_PORTAIL_RAIL_LATERAL` : la seule valeur exacte `true` ouvre', () => {
    expect(railLateralOuvert('true')).toBe(true);
    for (const valeur of [undefined, '', 'false', '1', 'TRUE', ' true']) expect(railLateralOuvert(valeur)).toBe(false);
  });

  it('le questionnaire en cours n’a pas de rail ; le hub et les autres pages l’ont', () => {
    expect(railSurLeChemin('/portail/T/questionnaires/ASG_1', 'T')).toBe(false);
    expect(railSurLeChemin('/portail/T/questionnaires', 'T')).toBe(true);
    expect(railSurLeChemin('/portail/T/suivi', 'T')).toBe(true);
    expect(railSurLeChemin('/portail/T/fiches/REM_1', 'T')).toBe(true);
  });
});

describe('§1 — où le rail paraît, et le bouton « Menu »', () => {
  it('majeur, murs franchis, page de session : le rail paraît, le bouton s’efface dès `lg`', async () => {
    servir();
    await rendre();
    await waitFor(() => expect(rail()).toBeTruthy());
    expect(bouton()!.className.split(/\s+/)).toContain('lg:hidden');
  });

  it('majeur clos : le rail paraît (l’âge, pas la clôture)', async () => {
    servir({ assignations: { dossierOuvert: false } });
    await rendre();
    await waitFor(() => expect(rail()).toBeTruthy());
  });

  it('questionnaire en cours : pas de rail, le bouton reste à toute largeur', async () => {
    nav.pathname = '/portail/PAT_TEST/questionnaires/ASG_1';
    servir();
    await rendre();
    await waitFor(() => expect(bouton()).toBeTruthy());
    expect(rail()).toBeNull();
    expect(bouton()!.className).not.toMatch(/\blg:hidden\b/);
  });

  it('rail non servi (drapeau fermé) : le bouton reste à toute largeur', async () => {
    servir();
    await rendre({ railServi: false });
    await waitFor(() => expect(bouton()).toBeTruthy());
    expect(bouton()!.className).not.toMatch(/\blg:hidden\b/);
  });

  for (const [cas, serveur] of [
    ['mineur', { assignations: { statutAge: 'mineur' } }],
    ['mineur clos', { assignations: { statutAge: 'mineur', dossierOuvert: false } }],
    ['« Avant de commencer » requis', { trust: { ok: true, avantDeCommencerRequis: true } }],
    ['date de naissance manquante', { assignations: { statutAge: 'date_manquante' } }],
    ['lecture du mur en échec', { trust: null }],
    ['lecture des assignations en échec', { assignations: null }],
  ] as const) {
    it(`${cas} : ni rail, ni bouton`, async () => {
      servir(serveur as Serveur);
      await rendre();
      expect(rail()).toBeNull();
      expect(bouton()).toBeNull();
    });
  }

  it('sans session : pas de rail', async () => {
    servir();
    await rendre({ session: false });
    expect(rail()).toBeNull();
  });

  it('écrans d’entrée (`/portail/{token}`) : pas de rail', async () => {
    nav.pathname = '/portail/PAT_TEST';
    servir();
    await rendre();
    expect(rail()).toBeNull();
  });
});

describe('§2 et §3 — la liste et l’activation', () => {
  it('la liste du panneau : « Mon parcours » puis les groupes servis, dans le même ordre', async () => {
    sondes.ouvertes = new Set(['bibliotheque', 'renseignements', 'dossier', 'echanges']);
    servir({ assignations: { parcours: { bilanConsultable: true } } });
    nav.pathname = '/portail/PAT_TEST/questionnaires/ASG_1';
    // Le panneau, servi sur le questionnaire en cours, donne la référence.
    const { unmount } = await rendre();
    fireEvent.click(await screen.findByRole('button', { name: 'Menu' }));
    const panneau = await screen.findByRole('dialog', { name: 'Mon espace' });
    await waitFor(() => expect(within(panneau).getAllByRole('link').length).toBeGreaterThan(6));
    const attendu = within(panneau).getAllByRole('link').map(l => [l.textContent, l.getAttribute('href')]);
    unmount();

    nav.pathname = '/portail/PAT_TEST/suivi';
    await rendre();
    await waitFor(() => expect(rail()).toBeTruthy());
    await waitFor(() => expect(within(rail()!).getAllByRole('link')).toHaveLength(attendu.length));
    expect(within(rail()!).getAllByRole('link').map(l => [l.textContent, l.getAttribute('href')])).toEqual(attendu);
    expect(within(rail()!).getAllByRole('link')[0].textContent).toBe('Mon parcours');
    for (const groupe of ['Au jour le jour', 'Ce que j’ai reçu', 'Ce que je transmets', 'Avec mon praticien']) {
      expect(within(rail()!).getByRole('list', { name: groupe })).toBeTruthy();
    }
  });

  for (const [chemin, attendu] of [
    ['questionnaires', 'Mon parcours'],
    ['protocole', 'Mon parcours'],
    ['suivi', 'Ouvrir mes rendez-vous de suivi'],
    ['alimentation', 'Ouvrir Mon carnet alimentaire'],
    ['fiches/REM_1', 'Ma bibliothèque'],
    ['ce-qui-compte', 'Ouvrir mon dossier à deux voix'],
  ] as const) {
    it(`/${chemin} allume « ${attendu} », et elle seule, d’un filet \`nav-active\``, async () => {
      nav.pathname = `/portail/PAT_TEST/${chemin}`;
      sondes.ouvertes = new Set(['bibliotheque', 'dossier']);
      servir();
      await rendre();
      await waitFor(() => expect(within(rail()!).queryByRole('link', { name: attendu })).toBeTruthy());
      expect(courant()).toHaveLength(1);
      expect(courant()[0].getAttribute('aria-current')).toBe('page');
      expect(courant()[0].textContent).toBe(attendu);
      expect(courant()[0].className.split(/\s+/)).toContain('shadow-nav-active');
    });
  }

  for (const chemin of ['informations', 'conditions']) {
    it(`/${chemin} n’allume rien`, async () => {
      nav.pathname = `/portail/PAT_TEST/${chemin}`;
      servir();
      await rendre();
      await waitFor(() => expect(rail()).toBeTruthy());
      expect(courant()).toHaveLength(0);
    });
  }

  it('intertitres aux `id` propres au rail : le panneau ouvert ne les double pas', async () => {
    servir();
    await rendre();
    await waitFor(() => expect(rail()).toBeTruthy());
    const ids = [...rail()!.querySelectorAll('h3')].map(h => h.id);
    expect(ids.length).toBeGreaterThan(0);
    for (const id of ids) expect(id).toMatch(/^rail-mon-espace-/);
  });
});

describe('§4 — comportement', () => {
  it('au seuil de 1 024 px, un panneau ouvert se ferme', async () => {
    const ecran = largeur(false);
    servir();
    await rendre();
    fireEvent.click(await screen.findByRole('button', { name: 'Menu' }));
    expect(await screen.findByRole('dialog', { name: 'Mon espace' })).toBeTruthy();
    ecran.passer(true);
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('sur le questionnaire en cours, le seuil ne ferme rien', async () => {
    nav.pathname = '/portail/PAT_TEST/questionnaires/ASG_1';
    const ecran = largeur(false);
    servir();
    await rendre();
    fireEvent.click(await screen.findByRole('button', { name: 'Menu' }));
    expect(await screen.findByRole('dialog', { name: 'Mon espace' })).toBeTruthy();
    ecran.passer(true);
    expect(screen.queryByRole('dialog', { name: 'Mon espace' })).toBeTruthy();
  });

  it('toujours déplié : aucun bouton dans le rail, rien écrit sur l’appareil', async () => {
    const ecrire = vi.spyOn(Storage.prototype, 'setItem');
    servir();
    await rendre();
    await waitFor(() => expect(rail()).toBeTruthy());
    expect(within(rail()!).queryByRole('button')).toBeNull();
    expect(ecrire).not.toHaveBeenCalled();
    ecrire.mockRestore();
  });
});

describe('§5 et §6 — forme, jetons, cadre', () => {
  it('dès `lg` seulement, collé en haut et jamais fixé, jamais imprimé, rien du rail praticien', async () => {
    servir();
    await rendre();
    await waitFor(() => expect(rail()).toBeTruthy());
    const classes = rail()!.className.split(/\s+/);
    for (const attendu of ['hidden', 'lg:block', 'w-nav-rail', 'lg:sticky', 'bg-surface', 'border-border', 'print:hidden']) {
      expect(classes).toContain(attendu);
    }
    expect(classes).not.toContain('fixed');
    expect(rail()!.outerHTML).not.toMatch(/\bbg-rail|rail-focus|--rail|data-theme="praticien"/);
    expect(rail()!.closest('[data-theme="praticien"]')).toBeNull();
  });

  it('cibles de 44 px en `rem`, libellés passés à la ligne, sans `outline-none` ni troncature', async () => {
    sondes.ouvertes = new Set(['compteRendu']);
    servir();
    await rendre();
    await waitFor(() => expect(within(rail()!).getAllByRole('link').length).toBeGreaterThan(3));
    for (const lien of within(rail()!).getAllByRole('link')) {
      expect(lien.className).toMatch(/\bmin-h-11\b/);
      expect(lien.className).not.toMatch(/outline-none|truncate/);
    }
  });

  it('deux colonnes dès `lg` (`gap-6`, `px-6`), le rail avant le `main`', async () => {
    servir();
    const { container } = await rendre();
    await waitFor(() => expect(rail()).toBeTruthy());
    const cadre = container.querySelector('main')!.parentElement!;
    for (const attendu of ['lg:flex-row', 'lg:gap-6', 'lg:px-6']) expect(cadre.className.split(/\s+/)).toContain(attendu);
    expect(cadre.firstElementChild).toBe(rail());
  });

  it('sans rail, le cadre n’a aucune classe de colonne', async () => {
    nav.pathname = '/portail/PAT_TEST/questionnaires/ASG_1';
    servir();
    const { container } = await rendre();
    await waitFor(() => expect(bouton()).toBeTruthy());
    expect(container.querySelector('main')!.parentElement!.className).toBe('flex flex-1 flex-col');
  });

  it('la garde lue, le contenu de la page n’est pas remonté', async () => {
    servir();
    await rendre();
    await waitFor(() => expect(rail()).toBeTruthy());
    expect(montages.n).toBe(1);
  });

  it('jetons du thème patient : `nav-rail` en `rem`, `nav-active` en forêt, hors du thème praticien', () => {
    const css = readFileSync(join(__dirname, '../../../app/globals.css'), 'utf8');
    const patient = css.slice(css.indexOf(":root,\n[data-theme='patient'] {"), css.indexOf("[data-theme='praticien'] {"));
    expect(patient).toContain('--nav-rail: 15.75rem;');
    expect(patient).toContain('--shadow-nav-active: inset 3px 0 0 var(--color-primary);');
    expect(css.match(/--nav-rail:/g)).toHaveLength(1);
    expect(css.match(/--shadow-nav-active:/g)).toHaveLength(1);
  });
});
