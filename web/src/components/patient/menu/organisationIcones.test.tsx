// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { useEffect } from 'react';

/*
 * ORGANISATION DU PRATICIEN AU PORTAIL ([[D-460]]) : icônes de « Mon espace » et
 * de la barre, intertitres, onglets de l'en-tête. Drapeau fermé, rien ne change.
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

import { BoutonMenuMonEspace, FournisseurMenuPortail } from './MenuMonEspace';
import { ICONES_MON_ESPACE } from './iconesMonEspace';
import { menuIconesOuvert } from './menuDrapeau';
import { ENTREES_AUTRES_ESPACES } from '@/components/patient/autres-espaces/entreesAutresEspaces';
import { BarreBasse } from '@/components/patient/barre-basse/BarreBasse';
import { VuesRapidesPortail } from '@/components/patient/barre-basse/VuesRapidesPortail';
import { CadreRailMonEspace } from '@/components/patient/rail/RailMonEspace';

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

async function rendre(icones: boolean) {
  render(
    <FournisseurMenuPortail sessionOuverte icones={icones}>
      <header>
        <BoutonMenuMonEspace railServi />
        <VuesRapidesPortail />
      </header>
      <CadreRailMonEspace>
        <main />
      </CadreRailMonEspace>
      <BarreBasse />
    </FournisseurMenuPortail>,
  );
  await act(async () => {
    await new Promise(r => setTimeout(r, 0));
  });
}

const rail = () => screen.getByRole('navigation', { name: 'Mon espace', hidden: true });
const acces = () => screen.queryAllByRole('navigation', { name: 'Accès rapides', hidden: true });
const onglets = () => acces().find(n => n.className.includes('lg:block'));
const barre = () => acces().find(n => n.className.includes('md:hidden'));

beforeEach(() => {
  nav.token = 'PAT_TEST';
  nav.pathname = '/portail/PAT_TEST/suivi';
  sondes.ouvertes = new Set(['dossier', 'bibliotheque']);
  servir();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('drapeau', () => {
  it('`WN_PORTAIL_MENU_ICONES` : la seule valeur exacte `true` ouvre', () => {
    expect(menuIconesOuvert('true')).toBe(true);
    for (const valeur of ['', 'false', 'TRUE', '1']) expect(menuIconesOuvert(valeur)).toBe(false);
  });

  it('fermé : ni icône, ni intertitre en capitales, ni onglets', async () => {
    await rendre(false);
    expect(rail().querySelectorAll('svg')).toHaveLength(0);
    expect(rail().querySelector('h3')?.className ?? '').not.toContain('uppercase');
    for (const libelle of rail().querySelectorAll('li a span')) expect(libelle.className).toBe('break-words');
    expect(barre()!.querySelectorAll('svg')).toHaveLength(0);
    expect(onglets()).toBeUndefined();
  });
});

describe('ouvert', () => {
  it('chaque entrée a son icône, et chaque icône un seul rayon', () => {
    for (const entree of ENTREES_AUTRES_ESPACES) expect(ICONES_MON_ESPACE[entree.cle]).toBeTruthy();
    const icones = Object.values(ICONES_MON_ESPACE);
    expect(new Set(icones).size).toBe(icones.length);
  });

  it('rail : une icône décorative par lien, jamais seule, intertitres en capitales', async () => {
    await rendre(true);
    const liens = within(rail()).getAllByRole('link', { hidden: true });
    expect(liens.length).toBeGreaterThan(2);
    for (const lien of liens) {
      expect(lien.querySelectorAll('svg')).toHaveLength(1);
      expect(lien.querySelector('svg')!.getAttribute('aria-hidden')).toBe('true');
      expect(lien.textContent!.trim().length).toBeGreaterThan(0);
    }
    expect(rail().querySelector('h3')!.className).toContain('uppercase');
  });

  it('[[D-333]] : ni chiffre ni pastille dans le rail, la barre et les onglets', async () => {
    await rendre(true);
    for (const zone of [rail(), barre()!, onglets()!]) expect(zone.textContent).not.toMatch(/\d/);
  });

  it('barre : icône et libellé dans chaque case ; onglets : mêmes libellés, mêmes cibles', async () => {
    await rendre(true);
    const cases = within(barre()!).getAllByRole('link', { hidden: true });
    for (const une of cases) expect(une.querySelectorAll('svg')).toHaveLength(1);
    const tabs = within(onglets()!).getAllByRole('link', { hidden: true });
    expect(tabs.map(t => t.textContent)).toEqual(cases.map(c => c.textContent));
    expect(tabs.map(t => t.getAttribute('href'))).toEqual(cases.map(c => c.getAttribute('href')));
    expect(tabs.filter(t => t.getAttribute('aria-current') === 'page').map(t => t.textContent)).toEqual(['Suivi']);
    for (const tab of tabs) expect(tab.className).toContain('min-h-11');
  });

  it('onglets : dès `lg` seulement, jamais imprimés', async () => {
    await rendre(true);
    expect(onglets()!.className).toContain('hidden lg:block');
    expect(onglets()!.className).toContain('print:hidden');
  });

  it('[[D-283]] §5 : dossier mineur, ni onglets ni barre ni rail', async () => {
    servir({ assignations: { statutAge: 'mineur' } });
    await rendre(true);
    expect(acces()).toHaveLength(0);
    expect(screen.queryByRole('navigation', { name: 'Mon espace', hidden: true })).toBeNull();
  });

  it('questionnaire en cours : pas d’onglets', async () => {
    nav.pathname = '/portail/PAT_TEST/questionnaires/ASG_1';
    await rendre(true);
    expect(onglets()).toBeUndefined();
  });
});

describe('panneau « Mon espace » (Q62 du 2026-11-08, [[D-460]] §4)', () => {
  async function ouvrirPanneau(icones: boolean) {
    await rendre(icones);
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
    return screen.getByRole('dialog').className.split(' ');
  }

  it('ouvert : à gauche, pleine largeur sous `md`, 18 rem au-delà', async () => {
    const classes = await ouvrirPanneau(true);
    expect(classes).toEqual(expect.arrayContaining(['left-0', 'border-r', 'w-full', 'md:max-w-[18rem]']));
    expect(classes).not.toContain('right-0');
    expect(classes).not.toContain('max-w-xl');
  });

  it('fermé : à droite, `max-w-xl`, comme avant', async () => {
    const classes = await ouvrirPanneau(false);
    expect(classes).toEqual(expect.arrayContaining(['right-0', 'border-l', 'w-full', 'max-w-xl']));
    expect(classes).not.toContain('left-0');
  });
});

describe('espacement des entrées sur deux lignes ([[D-460]] §5)', () => {
  const liensDuRail = () => [...rail().querySelectorAll('a')].map(lien => lien.className.split(' '));

  it('ouvert : chaque lien du rail et du panneau porte `py-1`, y compris l’entrée active', async () => {
    await rendre(true);
    expect(rail().querySelectorAll('[aria-current="page"]')).toHaveLength(1);
    for (const classes of liensDuRail()) expect(classes).toContain('py-1');
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
    const liens = [...screen.getByRole('dialog').querySelectorAll('a')];
    expect(liens.length).toBeGreaterThan(0);
    for (const lien of liens) expect(lien.className.split(' ')).toContain('py-1');
  });

  it('fermé : les classes d’avant, au rail et au panneau, entrée active comprise', async () => {
    await rendre(false);
    const classesDe = (racine: Element) => {
      const liens = [...racine.querySelectorAll('a')];
      return {
        actives: new Set(liens.filter(l => l.getAttribute('aria-current') === 'page').map(l => l.className)),
        autres: new Set(liens.filter(l => l.getAttribute('aria-current') !== 'page').map(l => l.className)),
      };
    };
    expect(classesDe(rail())).toEqual({
      actives: new Set(['flex min-h-11 items-center px-3 font-semibold text-foreground shadow-nav-active']),
      autres: new Set(['flex min-h-11 items-center px-3 text-primary underline-offset-4 hover:underline']),
    });
    fireEvent.click(screen.getByRole('button', { name: 'Menu' }));
    expect(classesDe(screen.getByRole('dialog'))).toEqual({
      actives: new Set(['flex min-h-11 items-center border-l-[3px] border-primary pl-3 font-semibold text-foreground']),
      autres: new Set(['flex min-h-11 items-center text-primary underline-offset-4 hover:underline']),
    });
  });
});
