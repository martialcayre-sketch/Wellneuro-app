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
 * (§6) ; ses trois états et ses commandes ([[D-482]], lot PAT-1 de la refonte
 * Lien). Il reprend la garde et les sondes du menu : chaque `Lien*` est remplacé
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

function Portail({ session = true, railServi = true }: { session?: boolean; railServi?: boolean }) {
  return (
    <FournisseurMenuPortail sessionOuverte={session} rail={railServi}>
      <header>
        <BoutonMenuMonEspace railServi={railServi} />
      </header>
      <CadreRailMonEspace>
        <main id="contenu" tabIndex={-1}>
          <Page />
        </main>
      </CadreRailMonEspace>
      <footer />
    </FournisseurMenuPortail>
  );
}

async function rendre({ session = true, railServi = true }: { session?: boolean; railServi?: boolean } = {}) {
  const resultat = render(<Portail session={session} railServi={railServi} />);
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
  vi.unstubAllEnvs();
});

describe('drapeau et chemin', () => {
  it('`WN_PORTAIL_RAIL_LATERAL` : la seule valeur exacte `true` ouvre', () => {
    // `undefined` prend la valeur par défaut, l'environnement : il est isolé.
    vi.stubEnv('WN_PORTAIL_RAIL_LATERAL', '');
    expect(railLateralOuvert()).toBe(false);
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
    ['suivi', 'Ouvrir mon point de suivi'],
    ['alimentation', 'Ouvrir mon carnet alimentaire'],
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
    largeur(false);
    servir();
    await rendre();
    await waitFor(() => expect(rail()).toBeTruthy());
    const ids = [...rail()!.querySelectorAll('h3')].map(h => h.id);
    expect(ids.length).toBeGreaterThan(0);
    for (const id of ids) expect(id).toMatch(/^rail-mon-espace-/);
    // Sous `lg`, le rail reste dans le DOM pendant que le panneau est ouvert.
    fireEvent.click(await screen.findByRole('button', { name: 'Menu' }));
    await screen.findByRole('dialog', { name: 'Mon espace' });
    const tous = [...document.querySelectorAll('[id]')].map(e => e.id);
    expect(new Set(tous).size).toBe(tous.length);
  });
});

describe('§4 — comportement', () => {
  it('au seuil de 1 024 px, un panneau ouvert se ferme, et le focus passe à l’entrée active du rail', async () => {
    const ecran = largeur(false);
    servir();
    await rendre();
    fireEvent.click(await screen.findByRole('button', { name: 'Menu' }));
    expect(await screen.findByRole('dialog', { name: 'Mon espace' })).toBeTruthy();
    ecran.passer(true);
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(courant()[0]));
    expect(document.activeElement?.textContent).toBe('Ouvrir mon point de suivi');
  });

  it('au seuil, sans entrée active dans le rail, le focus passe à sa première entrée', async () => {
    nav.pathname = '/portail/PAT_TEST/informations';
    const ecran = largeur(false);
    servir();
    await rendre();
    fireEvent.click(await screen.findByRole('button', { name: 'Menu' }));
    expect(await screen.findByRole('dialog', { name: 'Mon espace' })).toBeTruthy();
    ecran.passer(true);
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(within(rail()!).getAllByRole('link')[0]));
  });

  it('fermé sous le seuil (Échap), le focus revient au bouton', async () => {
    largeur(false);
    servir();
    await rendre();
    fireEvent.click(await screen.findByRole('button', { name: 'Menu' }));
    const panneau = await screen.findByRole('dialog', { name: 'Mon espace' });
    fireEvent.keyDown(panneau, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(bouton()));
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

});

describe('trois états ([[D-482]]) : déplié, réduit, escamoté', () => {
  const commande = (nom: string) => within(rail()!).queryByRole('button', { name: nom });
  /** Escamoté, deux boutons « Menu » coexistent dans le DOM : le déclencheur du panneau (effacé dès `lg`) et celui qui rouvre le rail (dès `lg` seulement). */
  const rouvrir = () => document.getElementById('bouton-rouvrir-mon-espace');
  const declencheur = () => screen.getAllByRole('button', { name: 'Menu' }).find(b => b.id !== 'bouton-rouvrir-mon-espace')!;

  it('au chargement, déplié : `nav-rail`, deux commandes en pied de rail (T-21, T-23)', async () => {
    servir();
    await rendre();
    await waitFor(() => expect(rail()).toBeTruthy());
    expect(rail()!.className.split(/\s+/)).toContain('w-nav-rail');
    expect(within(rail()!).getAllByRole('button').map(b => b.textContent)).toEqual(['Réduire le menu', 'Masquer le menu']);
    // Les commandes ferment le rail : après la liste, dans la même `nav`.
    const commandes = within(rail()!).getAllByRole('button');
    for (const une of commandes) {
      expect(une.getAttribute('type')).toBe('button');
      expect(une.className).toMatch(/\bmin-h-11\b/);
      expect(une.className).not.toMatch(/outline-none|truncate/);
    }
    expect(rouvrir()).toBeNull();
  });

  it('réduit : `rail-patient-compact`, mêmes libellés, jamais un rail d’icônes ; « Agrandir le menu » (T-22) le rend déplié', async () => {
    sondes.ouvertes = new Set(['bibliotheque', 'dossier', 'compteRendu']);
    servir();
    await rendre();
    await waitFor(() => expect(within(rail()!).getAllByRole('link').length).toBeGreaterThan(4));
    const libelles = within(rail()!).getAllByRole('link').map(l => l.textContent);
    const reduire = commande('Réduire le menu')!;
    reduire.focus();
    fireEvent.click(reduire);
    const classes = rail()!.className.split(/\s+/);
    expect(classes).toContain('w-nav-rail-compact');
    expect(classes).not.toContain('w-nav-rail');
    expect(within(rail()!).getAllByRole('link').map(l => l.textContent)).toEqual(libelles);
    for (const lien of within(rail()!).getAllByRole('link')) {
      expect(lien.className).toMatch(/\bmin-h-11\b/);
      expect(lien.className).not.toMatch(/truncate|sr-only/);
    }
    for (const libelle of rail()!.querySelectorAll('li a span')) expect(libelle.className).toContain('break-words');
    // Même bouton, autre texte : le focus reste où il était.
    expect(commande('Agrandir le menu')).toBe(reduire);
    expect(document.activeElement).toBe(reduire);
    fireEvent.click(commande('Agrandir le menu')!);
    expect(rail()!.className.split(/\s+/)).toContain('w-nav-rail');
    expect(commande('Réduire le menu')).toBeTruthy();
  });

  it('escamoté (T-23) : hors de la page et de l’arbre ; la colonne reprend sa place ; le focus passe au bouton « Menu »', async () => {
    servir();
    const { container } = await rendre();
    await waitFor(() => expect(rail()).toBeTruthy());
    const masquer = commande('Masquer le menu')!;
    masquer.focus();
    fireEvent.click(masquer);
    expect(screen.queryByRole('navigation', { name: 'Mon espace', hidden: true })).toBeNull();
    expect(screen.queryByTestId('reserve-rail')).toBeNull();
    expect(container.querySelector('main')!.parentElement!.className).toBe('flex flex-1 flex-col');
    // Un seul déclencheur par largeur ([[D-444]] §2) : le panneau sous `lg`,
    // le rail dès `lg`.
    expect(rouvrir()).toBeTruthy();
    expect(rouvrir()!.textContent).toBe('Menu');
    expect(rouvrir()!.className.split(/\s+/)).toEqual(expect.arrayContaining(['hidden', 'lg:inline-flex', 'print:hidden']));
    expect(declencheur().className.split(/\s+/)).toContain('lg:hidden');
    expect(document.activeElement).toBe(rouvrir());
  });

  it('rail escamoté, « Menu » le rouvre déplié, le focus sur son entrée active, et s’efface', async () => {
    servir();
    await rendre();
    await waitFor(() => expect(rail()).toBeTruthy());
    fireEvent.click(commande('Réduire le menu')!);
    fireEvent.click(commande('Masquer le menu')!);
    fireEvent.click(rouvrir()!);
    expect(rail()).toBeTruthy();
    expect(rail()!.className.split(/\s+/)).toContain('w-nav-rail');
    expect(rouvrir()).toBeNull();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(courant()[0]);
    expect(document.activeElement?.textContent).toBe('Ouvrir mon point de suivi');
  });

  it('rail escamoté, sous `lg`, le bouton « Menu » ouvre toujours le panneau', async () => {
    largeur(false);
    servir();
    await rendre();
    await waitFor(() => expect(rail()).toBeTruthy());
    fireEvent.click(commande('Masquer le menu')!);
    fireEvent.click(declencheur());
    expect(await screen.findByRole('dialog', { name: 'Mon espace' })).toBeTruthy();
  });

  it('rail escamoté, un panneau fermé au seuil rend le focus au bouton qui rouvre le rail', async () => {
    const ecran = largeur(false);
    servir();
    await rendre();
    await waitFor(() => expect(rail()).toBeTruthy());
    fireEvent.click(commande('Masquer le menu')!);
    fireEvent.click(declencheur());
    await screen.findByRole('dialog', { name: 'Mon espace' });
    ecran.passer(true);
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(rouvrir()));
  });

  it('l’état survit à la navigation entre pages, pas au rechargement ; rien n’est écrit sur l’appareil', async () => {
    const ecrire = vi.spyOn(Storage.prototype, 'setItem');
    servir();
    const { rerender, unmount } = await rendre();
    await waitFor(() => expect(rail()).toBeTruthy());
    fireEvent.click(commande('Réduire le menu')!);
    nav.pathname = '/portail/PAT_TEST/alimentation';
    rerender(<Portail />);
    await waitFor(() => expect(courant()[0]?.textContent).toBe('Ouvrir mon carnet alimentaire'));
    expect(rail()!.className.split(/\s+/)).toContain('w-nav-rail-compact');
    fireEvent.click(commande('Masquer le menu')!);
    nav.pathname = '/portail/PAT_TEST/suivi';
    rerender(<Portail />);
    expect(rail()).toBeNull();
    expect(rouvrir()).toBeTruthy();
    unmount();
    // Rechargement : un layout neuf, le rail déplié.
    await rendre();
    await waitFor(() => expect(rail()).toBeTruthy());
    expect(rail()!.className.split(/\s+/)).toContain('w-nav-rail');
    expect(ecrire).not.toHaveBeenCalled();
    ecrire.mockRestore();
  });

  it('sur le questionnaire en cours, rail escamoté ou non, un seul bouton « Menu », celui du panneau', async () => {
    servir();
    const { rerender } = await rendre();
    await waitFor(() => expect(rail()).toBeTruthy());
    fireEvent.click(commande('Masquer le menu')!);
    nav.pathname = '/portail/PAT_TEST/questionnaires/ASG_1';
    rerender(<Portail />);
    expect(screen.getAllByRole('button', { name: 'Menu' })).toHaveLength(1);
    expect(rouvrir()).toBeNull();
    expect(bouton()!.className).not.toMatch(/\blg:hidden\b/);
  });

  it('[[D-333]] : ni chiffre ni pastille dans le rail ni ses commandes', async () => {
    sondes.ouvertes = new Set(['bibliotheque', 'dossier', 'echanges']);
    servir();
    await rendre();
    await waitFor(() => expect(within(rail()!).getAllByRole('link').length).toBeGreaterThan(3));
    expect(rail()!.textContent).not.toMatch(/\d/);
    fireEvent.click(commande('Réduire le menu')!);
    expect(rail()!.textContent).not.toMatch(/\d/);
  });
});

describe('§5 et §6 — forme, jetons, cadre', () => {
  it('dès `lg` seulement, collé en haut et jamais fixé, jamais imprimé ; fond sauge du thème patient, rien du rail praticien', async () => {
    servir();
    await rendre();
    await waitFor(() => expect(rail()).toBeTruthy());
    const classes = rail()!.className.split(/\s+/);
    // Fond sauge (`rail-background` patient, A5-R3, [[D-447]] §5 amendé par
    // [[D-482]]) : `bg-rail` lit le jeton du thème patient, toujours clair.
    for (const attendu of ['hidden', 'lg:block', 'w-nav-rail', 'lg:sticky', 'bg-rail', 'border-rail-border', 'text-rail-foreground', 'print:hidden']) {
      expect(classes).toContain(attendu);
    }
    expect(classes).not.toContain('fixed');
    // Ni thème praticien, ni aplat `rail-primary` (l'entrée active du rail nuit).
    expect(rail()!.outerHTML).not.toMatch(/data-theme="praticien"|\bbg-rail-primary\b|\bdark:/);
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

  it('garde en lecture : la place du rail est réservée, vide, puis le rail la prend sans saut', async () => {
    let repondre: (reponse: unknown) => void = () => {};
    const enAttente = new Promise(resolve => {
      repondre = resolve;
    });
    vi.stubGlobal('fetch', vi.fn(() => enAttente));
    const { container } = await rendre();
    const cadre = container.querySelector('main')!.parentElement!;
    expect(screen.getByTestId('reserve-rail').getAttribute('aria-hidden')).toBe('true');
    expect(screen.getByTestId('reserve-rail').className).toContain('w-nav-rail');
    expect(cadre.className).toContain('lg:flex-row');
    expect(rail()).toBeNull();
    await act(async () => {
      repondre({ ok: false, status: 500, json: async () => ({}) });
      await new Promise(r => setTimeout(r, 0));
    });
    // Fail-closed : sans réponse exploitable, ni réserve, ni rail, ni colonne.
    expect(screen.queryByTestId('reserve-rail')).toBeNull();
    expect(cadre.className).toBe('flex flex-1 flex-col');
  });

  it('garde lue, dossier mineur : la réserve disparaît, sans rail', async () => {
    servir({ assignations: { statutAge: 'mineur' } });
    await rendre();
    await waitFor(() => expect(screen.queryByTestId('reserve-rail')).toBeNull());
    expect(rail()).toBeNull();
  });

  it('questionnaire en cours : aucune réserve, même en lecture', async () => {
    nav.pathname = '/portail/PAT_TEST/questionnaires/ASG_1';
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));
    await rendre();
    expect(screen.queryByTestId('reserve-rail')).toBeNull();
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
    expect(patient).toContain('--rail-patient-compact: 13rem;');
    expect(patient).toContain('--rail-background: var(--lien-sage);');
    expect(patient).toContain('--shadow-nav-active: inset 3px 0 0 var(--color-primary);');
    expect(css.match(/--nav-rail:/g)).toHaveLength(1);
    expect(css.match(/--shadow-nav-active:/g)).toHaveLength(1);
  });
});
