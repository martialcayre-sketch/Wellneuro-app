// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FileEnvoiAside } from './FileEnvoiAside';

// L'aside rend la file de la Bibliothèque visible ET validable depuis
// l'accueil : le clic « Envoyer » EST la validation (D-030 inchangée). Elle
// n'édite rien — la composition reste dans la Bibliothèque, liée en pied.

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const json = (payload: unknown, ok = true) => ({ ok, json: async () => payload });

const BROUILLON_SOPHIE = {
  idBrouillon: 'ENV_1',
  idPatient: 'PAT_SEED_01',
  prenom: 'Sophie',
  nom: 'Nicola',
  emailPatient: 'sophie@example.test',
  items: [
    { id: 'Q_SOM_01', titre: 'Index de qualité du sommeil de Pittsburgh' },
    { id: 'CAB_001', titre: 'Instrument du cabinet', indisponible: true },
  ],
  dateLimite: null,
  notes: null,
};

/** GET file-envoi servi par appel (relecture après envoi), POST envoyer stubé. */
function stubFetch(
  fileParAppel: Array<{ payload: unknown; ok?: boolean }>,
  payloadEnvoi: unknown = { success: true, count: 2 },
) {
  const appels: { url: string; init?: RequestInit }[] = [];
  let lectures = 0;
  const mock = vi.fn((url: string, init?: RequestInit) => {
    appels.push({ url, init });
    if (url.startsWith('/api/praticien/file-envoi/envoyer')) {
      return Promise.resolve(json(payloadEnvoi));
    }
    const index = Math.min(lectures++, fileParAppel.length - 1);
    return Promise.resolve(json(fileParAppel[index].payload, fileParAppel[index].ok ?? true));
  });
  vi.stubGlobal('fetch', mock);
  return { appels };
}

describe('FileEnvoiAside', () => {
  beforeEach(() => vi.clearAllMocks());

  it('liste le brouillon du patient avec ses items, le badge Indisponible et le bouton compté', async () => {
    stubFetch([{ payload: { brouillons: [BROUILLON_SOPHIE] } }]);

    render(<FileEnvoiAside />);

    expect(await screen.findByText('Sophie Nicola')).toBeTruthy();
    expect(screen.getByText(/Pittsburgh/)).toBeTruthy();
    expect(screen.getByText('Indisponible')).toBeTruthy();
    expect(screen.getByRole('button', { name: /envoyer \(2\) — un seul mail/i })).toBeTruthy();
    expect(screen.getByText(/rien ne part sans votre validation/i)).toBeTruthy();
    // Le nom mène au patient, le pied à la Bibliothèque (où la file s'édite).
    expect(screen.getByRole('link', { name: 'Sophie Nicola' }).getAttribute('href')).toBe(
      '/dashboard/patients/PAT_SEED_01',
    );
    expect(
      screen.getByRole('link', { name: /gérer la file dans la bibliothèque/i }).getAttribute('href'),
    ).toBe('/dashboard/bibliotheque');
  });

  it('dit que la file est vide quand elle l’est vraiment', async () => {
    stubFetch([{ payload: { brouillons: [] } }]);

    render(<FileEnvoiAside />);

    expect(await screen.findByText(/la file est vide/i)).toBeTruthy();
  });

  it('une file illisible est dite indisponible, jamais présentée comme vide', async () => {
    stubFetch([{ payload: { brouillons: [], unavailable: true, reason: 'exception' }, ok: false }]);

    render(<FileEnvoiAside />);

    expect(await screen.findByText(/momentanément indisponible/i)).toBeTruthy();
    expect(screen.queryByText(/la file est vide/i)).toBeNull();
  });

  it('envoie le brouillon au clic, dit le compte et relit la file', async () => {
    const { appels } = stubFetch([
      { payload: { brouillons: [BROUILLON_SOPHIE] } },
      { payload: { brouillons: [] } },
    ]);

    render(<FileEnvoiAside />);

    fireEvent.click(await screen.findByRole('button', { name: /envoyer \(2\)/i }));

    expect(
      await screen.findByText(/Sophie Nicola : 2 questionnaires envoyés — un seul mail\./),
    ).toBeTruthy();
    // Le contrat serveur : l'identifiant du brouillon, rien d'autre.
    const envois = appels.filter(a => a.url.startsWith('/api/praticien/file-envoi/envoyer'));
    expect(envois).toHaveLength(1);
    expect(JSON.parse(String(envois[0]?.init?.body))).toEqual({ idBrouillon: 'ENV_1' });
    // La relecture a vidé la file : la carte disparaît.
    expect(await screen.findByText(/la file est vide/i)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /envoyer \(/i })).toBeNull();
  });

  it('reprend la phrase de la route sur refus, et garde la carte pour réessayer', async () => {
    stubFetch(
      [{ payload: { brouillons: [BROUILLON_SOPHIE] } }],
      { success: false, reason: 'dossier_cloture', error: 'Dossier clos.' },
    );

    render(<FileEnvoiAside />);

    fireEvent.click(await screen.findByRole('button', { name: /envoyer \(2\)/i }));

    expect(await screen.findByText('Envoi impossible : Dossier clos.')).toBeTruthy();
    // L'échec n'a pas consommé le brouillon : le geste reste possible.
    expect(await screen.findByRole('button', { name: /envoyer \(2\)/i })).toBeTruthy();
  });

  it('garde l’état connu quand la relecture après envoi échoue', async () => {
    stubFetch([
      { payload: { brouillons: [BROUILLON_SOPHIE] } },
      { payload: { brouillons: [], unavailable: true, reason: 'exception' }, ok: false },
    ]);

    render(<FileEnvoiAside />);

    fireEvent.click(await screen.findByRole('button', { name: /envoyer \(2\)/i }));

    await screen.findByText(/2 questionnaires envoyés/);
    // La relecture a échoué : on ne fabrique ni une file vide ni une panne —
    // l'état connu reste affiché.
    expect(screen.queryByText(/momentanément indisponible/i)).toBeNull();
    expect(screen.queryByText(/la file est vide/i)).toBeNull();
  });
});
