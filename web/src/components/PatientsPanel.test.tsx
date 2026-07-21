// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PatientsPanel } from './PatientsPanel';

// Deux choses se jouent dans ce panneau.
//
// La première est la surface d'émission du lien magique (gate G4) : quatre
// actions portent l'accès patient, dont trois concernent le jeton PERMANENT.
// La quatrième est d'une autre nature — 24 h, une seule ouverture — et
// n'existe que drapeau allumé.
//
// La seconde est le cycle de vie du dossier (IDP2, LOT-01b) : clôture de suivi
// et effacement réel. Ces actions ont quitté la carte du haut pour le menu
// « Gérer le dossier » de chaque ligne — d'où le passage par `ouvrirMenu()`.
//
// Seuls les patients fictifs du dépôt peuvent apparaître ici.

const PATIENT = {
  idPatient: 'PAT_SEED_03',
  prenom: 'Michel',
  nom: 'Dogné',
  email: 'michel.dogne@fictif.wellneuro.fr',
  telephone: '',
  actif: 'OUI',
  suiviClotureLe: null as string | null,
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

/**
 * Le panneau charge plusieurs catalogues au montage ; on les rend vides.
 * `patient` permet de faire varier l'état du dossier affiché dans le tableau.
 */
function stubFetch(options?: {
  surToken?: (body: unknown) => unknown;
  surCycleDeVie?: (body: unknown) => unknown;
  patient?: typeof PATIENT;
}) {
  const appels: { url: string; method?: string; body?: unknown }[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: { method?: string; body?: string }) => {
      const body = init?.body ? JSON.parse(init.body) : undefined;
      appels.push({ url: String(url), method: init?.method, body });
      if (String(url).startsWith('/api/praticien/patients/cycle-de-vie')) {
        return {
          ok: true,
          json: async () => options?.surCycleDeVie?.(body) ?? { success: true, action: 'cloture' },
        } as unknown as Response;
      }
      if (String(url).startsWith('/api/praticien/token')) {
        return {
          ok: true,
          json: async () => options?.surToken?.(body) ?? { success: true },
        } as unknown as Response;
      }
      return {
        ok: true,
        json: async () => ({
          patients: [options?.patient ?? PATIENT],
          questionnaires: [],
          packs: [],
          categories: [],
          success: true,
        }),
      } as unknown as Response;
    }),
  );
  return appels;
}

/** Les actions sur un dossier vivent dans le menu de sa ligne. */
async function ouvrirMenu() {
  const declencheur = await screen.findByRole('button', { name: /gérer le dossier/i });
  fireEvent.click(declencheur);
  return declencheur;
}

const item = (motif: RegExp) => screen.getByRole('menuitem', { name: motif });

describe('PatientsPanel — émission d’un lien à usage unique (G4)', () => {
  beforeEach(() => vi.clearAllMocks());

  // Le drapeau éteint doit rendre l'action inatteignable, pas seulement grisée :
  // c'est ce qui garantit qu'un merge n'active rien.
  it('drapeau éteint : l’item n’existe pas', async () => {
    stubFetch();
    render(<PatientsPanel />);
    await ouvrirMenu();
    expect(item(/renvoyer le lien/i)).toBeTruthy();
    expect(screen.queryByRole('menuitem', { name: /usage unique/i })).toBeNull();
  });

  it('drapeau allumé : l’item apparaît, à côté des actions du lien permanent', async () => {
    stubFetch();
    render(<PatientsPanel lienMagiqueActif />);
    await ouvrirMenu();
    // Les trois actions historiques restent : la coexistence est visible.
    expect(item(/usage unique/i)).toBeTruthy();
    expect(item(/renvoyer le lien/i)).toBeTruthy();
    expect(item(/copier le lien/i)).toBeTruthy();
    expect(item(/révoquer l’accès/i)).toBeTruthy();
  });

  // Le libellé porte la différence de nature. Confondre les deux liens, c'est
  // promettre un accès permanent là où il expire en 24 h.
  it('le libellé annonce la durée et l’usage unique', async () => {
    stubFetch();
    render(<PatientsPanel lienMagiqueActif />);
    await ouvrirMenu();
    expect(item(/usage unique/i).textContent).toMatch(/24\s*h/);
  });

  it('l’action postée est `lien_magique`, jamais celle du lien permanent', async () => {
    const appels = stubFetch();
    render(<PatientsPanel lienMagiqueActif />);
    await ouvrirMenu();
    fireEvent.click(item(/usage unique/i));

    await waitFor(() => {
      const token = appels.filter(a => a.url === '/api/praticien/token');
      expect(token.length).toBe(1);
      expect(token[0].body).toMatchObject({ action: 'lien_magique', idPatient: 'PAT_SEED_03' });
    });
  });

  // Un échec silencieux ferait croire au praticien qu'un lien est parti, et le
  // patient attendrait un e-mail qui n'arrive jamais.
  it('un échec serveur est dit, et ne se présente pas comme un envoi', async () => {
    stubFetch({ surToken: () => ({ success: false, reason: 'portal_revoked', error: 'Accès portail révoqué.' }) });
    render(<PatientsPanel lienMagiqueActif />);
    await ouvrirMenu();
    fireEvent.click(item(/usage unique/i));

    await waitFor(() => expect(screen.getByText(/révoqué/i)).toBeTruthy());
    expect(screen.queryByText(/valable 24 h/i)).toBeNull();
  });
});

describe('PatientsPanel — cycle de vie du dossier (LOT-01b)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('groupe les deux fins de parcours et nomme l’effacement pour ce qu’il est', async () => {
    stubFetch();
    render(<PatientsPanel />);
    await ouvrirMenu();
    expect(item(/clôturer le suivi/i)).toBeTruthy();
    expect(item(/effacer définitivement/i)).toBeTruthy();
    // « Supprimer » désignait une désactivation : le mot a disparu de l'écran.
    expect(screen.queryByText(/^Supprimer$/)).toBeNull();
  });

  it('la clôture passe par une confirmation avant tout appel', async () => {
    const appels = stubFetch();
    render(<PatientsPanel />);
    await ouvrirMenu();
    fireEvent.click(item(/clôturer le suivi/i));

    // Le dialogue nomme le dossier, et rien n'est encore parti.
    await screen.findByRole('heading', { name: /michel dogné/i });
    expect(appels.some(a => a.url.includes('cycle-de-vie'))).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: /^clôturer le suivi$/i }));
    await waitFor(() => {
      const appel = appels.find(a => a.url.includes('cycle-de-vie'));
      expect(appel?.body).toMatchObject({ idPatient: 'PAT_SEED_03', action: 'cloture' });
    });
  });

  // Le serveur exige `confirmation: 'EFFACER'`. L'écran ne doit pas inventer
  // un second contrat, il doit refléter celui-là.
  it('l’effacement poste la confirmation exacte attendue par la route', async () => {
    const appels = stubFetch({ surCycleDeVie: () => ({ success: true, action: 'effacement', lignesSupprimees: 7 }) });
    render(<PatientsPanel />);
    await ouvrirMenu();
    fireEvent.click(item(/effacer définitivement/i));

    const champ = await screen.findByLabelText(/saisissez/i);
    fireEvent.change(champ, { target: { value: 'EFFACER' } });
    fireEvent.click(screen.getByRole('button', { name: /^effacer définitivement$/i }));

    await waitFor(() => {
      const appel = appels.find(a => a.url.includes('cycle-de-vie'));
      expect(appel?.body).toMatchObject({
        idPatient: 'PAT_SEED_03',
        action: 'effacement',
        confirmation: 'EFFACER',
      });
    });
  });

  it('sans le mot saisi, aucun effacement n’est posté', async () => {
    const appels = stubFetch();
    render(<PatientsPanel />);
    await ouvrirMenu();
    fireEvent.click(item(/effacer définitivement/i));

    await screen.findByLabelText(/saisissez/i);
    fireEvent.click(screen.getByRole('button', { name: /^effacer définitivement$/i }));

    await waitFor(() => expect(screen.getByLabelText(/saisissez/i)).toBeTruthy());
    expect(appels.some(a => a.url.includes('cycle-de-vie'))).toBe(false);
  });

  it('un dossier clos propose la reprise, pas une seconde clôture', async () => {
    stubFetch({ patient: { ...PATIENT, suiviClotureLe: '2026-07-21T10:00:00.000Z' } });
    render(<PatientsPanel />);
    await ouvrirMenu();
    expect(item(/rouvrir le suivi/i)).toBeTruthy();
    expect(screen.queryByRole('menuitem', { name: /clôturer le suivi/i })).toBeNull();
  });

  it('un dossier clos est signalé par un libellé, pas par une nuance de gris', async () => {
    stubFetch({ patient: { ...PATIENT, suiviClotureLe: '2026-07-21T10:00:00.000Z' } });
    render(<PatientsPanel />);
    await waitFor(() => expect(screen.getByText('Suivi clôturé')).toBeTruthy());
  });

  // La clôture interdit les envois, pas la lecture : le patient garde ses
  // archives, donc lui renvoyer son lien reste légitime.
  it('un dossier clos conserve ses actions d’accès au portail', async () => {
    stubFetch({ patient: { ...PATIENT, suiviClotureLe: '2026-07-21T10:00:00.000Z' } });
    render(<PatientsPanel />);
    await ouvrirMenu();
    expect((item(/renvoyer le lien/i) as HTMLButtonElement).disabled).toBe(false);
  });

  it('un dossier inactif propose la réactivation, et l’envoie par PATCH', async () => {
    const appels = stubFetch({ patient: { ...PATIENT, actif: 'NON' } });
    render(<PatientsPanel />);
    await ouvrirMenu();
    fireEvent.click(item(/réactiver le dossier/i));

    await waitFor(() => {
      const patch = appels.find(a => a.method === 'PATCH');
      expect(patch?.body).toMatchObject({ idPatient: 'PAT_SEED_03', actif: 'OUI' });
    });
  });

  it('rend lisible un refus serveur sur dossier clos', async () => {
    stubFetch({
      surCycleDeVie: () => ({ success: false, reason: 'dossier_cloture', error: 'Dossier clos.' }),
    });
    render(<PatientsPanel />);
    await ouvrirMenu();
    fireEvent.click(item(/clôturer le suivi/i));
    fireEvent.click(await screen.findByRole('button', { name: /^clôturer le suivi$/i }));

    await waitFor(() => expect(screen.getByText(/suivi de ce dossier est clôturé/i)).toBeTruthy());
  });
});
