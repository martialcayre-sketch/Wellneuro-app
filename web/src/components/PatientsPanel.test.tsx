// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PatientsPanel } from './PatientsPanel';

// Surface d'émission du lien magique (gate G4). Le panneau porte quatre actions
// sur l'accès patient, dont trois concernent le jeton PERMANENT. La quatrième
// est d'une autre nature — 24 h, une seule ouverture — et n'existe que drapeau
// allumé : c'est elle qui décide de ce qui part réellement à un patient.

// Seuls les trois patients fictifs du dépôt peuvent apparaître ici.
const PATIENT = {
  idPatient: 'PAT_SEED_03',
  prenom: 'Michel',
  nom: 'Dogné',
  email: 'michel.dogne@fictif.wellneuro.fr',
  telephone: '',
  actif: 'OUI',
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

/** Le panneau charge plusieurs catalogues au montage ; on les rend vides. */
function stubFetch(surToken?: (body: unknown) => unknown) {
  const appels: { url: string; method?: string; body?: unknown }[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, options?: { method?: string; body?: string }) => {
      const body = options?.body ? JSON.parse(options.body) : undefined;
      appels.push({ url: String(url), method: options?.method, body });
      if (String(url).startsWith('/api/praticien/token')) {
        return { ok: true, json: async () => surToken?.(body) ?? { success: true } } as unknown as Response;
      }
      return {
        ok: true,
        json: async () => ({ patients: [PATIENT], questionnaires: [], packs: [], categories: [] }),
      } as unknown as Response;
    }),
  );
  return appels;
}

/**
 * Le champ « patient » de la consultation est le pivot des actions d'accès.
 * Plusieurs formulaires du panneau portent un select « Patient * » : on cible
 * celui du formulaire qui contient le bouton, jamais le premier venu.
 */
function selectionnerPatient() {
  const formulaire = screen.getByText(/usage unique/i).closest('form') as HTMLFormElement;
  const select = within(formulaire).getByDisplayValue('Patient *');
  fireEvent.change(select, { target: { value: PATIENT.idPatient } });
}

describe('PatientsPanel — émission d’un lien à usage unique (G4)', () => {
  beforeEach(() => vi.clearAllMocks());

  // Le drapeau éteint doit rendre l'action inatteignable, pas seulement grisée :
  // c'est ce qui garantit qu'un merge n'active rien.
  it('drapeau éteint : le bouton n’existe pas', async () => {
    stubFetch();
    render(<PatientsPanel />);
    await waitFor(() => expect(screen.getByText('Renvoyer le lien')).toBeTruthy());
    expect(screen.queryByText(/usage unique/i)).toBeNull();
  });

  it('drapeau allumé : le bouton apparaît, à côté des actions du lien permanent', async () => {
    stubFetch();
    render(<PatientsPanel lienMagiqueActif />);
    await waitFor(() => expect(screen.getByText(/usage unique/i)).toBeTruthy());
    // Les trois actions historiques restent : la coexistence est visible à l'écran.
    expect(screen.getByText('Renvoyer le lien')).toBeTruthy();
    expect(screen.getByText('Copier le lien')).toBeTruthy();
    expect(screen.getByText('Révoquer l’accès')).toBeTruthy();
  });

  // Le libellé porte la différence de nature. Confondre les deux liens, c'est
  // promettre un accès permanent là où il expire en 24 h.
  it('le libellé annonce la durée et l’usage unique', async () => {
    stubFetch();
    render(<PatientsPanel lienMagiqueActif />);
    const bouton = await screen.findByText(/usage unique/i);
    expect(bouton.textContent).toMatch(/24\s*h/);
  });

  it('sans patient sélectionné, rien n’est envoyé', async () => {
    const appels = stubFetch();
    render(<PatientsPanel lienMagiqueActif />);
    fireEvent.click(await screen.findByText(/usage unique/i));
    await waitFor(() => expect(screen.getByText('Sélectionnez un patient.')).toBeTruthy());
    expect(appels.some(a => a.url.startsWith('/api/praticien/token'))).toBe(false);
  });

  it('l’action postée est `lien_magique`, jamais celle du lien permanent', async () => {
    const appels = stubFetch();
    render(<PatientsPanel lienMagiqueActif />);
    await waitFor(() => screen.getByText(/usage unique/i));
    selectionnerPatient();
    fireEvent.click(screen.getByText(/usage unique/i));

    await waitFor(() => {
      const token = appels.filter(a => a.url === '/api/praticien/token');
      expect(token.length).toBe(1);
      expect(token[0].body).toMatchObject({ action: 'lien_magique', idPatient: 'PAT_SEED_03' });
    });
  });

  // Un échec silencieux ferait croire au praticien qu'un lien est parti, et le
  // patient attendrait un e-mail qui n'arrive jamais.
  it('un échec serveur est dit, et ne se présente pas comme un envoi', async () => {
    stubFetch(() => ({ success: false, reason: 'portal_revoked', error: 'Accès portail révoqué.' }));
    render(<PatientsPanel lienMagiqueActif />);
    await waitFor(() => screen.getByText(/usage unique/i));
    selectionnerPatient();
    fireEvent.click(screen.getByText(/usage unique/i));

    await waitFor(() => expect(screen.getByText(/révoqué/i)).toBeTruthy());
    expect(screen.queryByText(/valable 24 h/i)).toBeNull();
  });
});
