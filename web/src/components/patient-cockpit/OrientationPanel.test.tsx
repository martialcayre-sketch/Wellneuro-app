// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { OrientationPanel } from './OrientationPanel';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const json = (payload: unknown) => ({ ok: true, json: async () => payload });

function stubFetch(payloadOrientation: unknown, payloadAssignation?: unknown) {
  const appels: { url: string; init?: RequestInit }[] = [];
  const mock = vi.fn((url: string, init?: RequestInit) => {
    appels.push({ url, init });
    if (url.startsWith('/api/praticien/packs/assign')) {
      return Promise.resolve(json(payloadAssignation ?? { success: true, count: 4, packNom: 'Sommeil' }));
    }
    return Promise.resolve(json(payloadOrientation));
  });
  vi.stubGlobal('fetch', mock);
  return { mock, appels };
}

const RECOMMANDATION_PACK = {
  cible: { type: 'pack' as const, packId: 'pack_sommeil_chronobiologie' },
  idPackBase: 'PACK_SOMMEIL_CHRONO',
  priorite: 1,
  niveau: 'approfondissement' as const,
  objectifs: ['Caractériser la fragmentation du sommeil'],
  needIds: [3],
  dejaAssigne: false,
  dejaRepondu: false,
  motifs: [
    {
      regleId: 'R-SOM-01',
      conditions: ['PSQI au-dessus de son seuil publié'],
      claims: [{ claimId: 'WN-CLM-0001', versionClaim: 'v1.0' }],
    },
  ],
};

const RECOMMANDATION_QUESTIONNAIRE = {
  cible: { type: 'questionnaire' as const, questionnaireId: 'Q_STR_03' },
  priorite: 2,
  niveau: 'socle' as const,
  objectifs: [],
  needIds: [],
  dejaAssigne: false,
  dejaRepondu: null,
  motifs: [{ regleId: 'R-STR-02', conditions: ['Stress déclaré'], claims: [] }],
};

const ACTIF = {
  ok: true,
  actif: true,
  version: 'orientation-nnpp2-v1',
  sha256: 'abc123',
  recommandations: [RECOMMANDATION_PACK, RECOMMANDATION_QUESTIONNAIRE],
};

describe('OrientationPanel', () => {
  it('affiche le message serveur quand le verrou est fermé, sans alerte ni écran vide', async () => {
    stubFetch({
      ok: true,
      actif: false,
      version: 'orientation-nnpp2-v1',
      message: 'Orientation en cours de constitution — les règles NNPP2 ne sont pas encore validées.',
    });

    render(<OrientationPanel idPatient="PAT_SEED_03" />);

    expect(await screen.findByText(/en cours de constitution/i)).toBeTruthy();
    // Un verrou fermé n'est pas une panne : le signaler en alerte enverrait le
    // praticien chercher un incident qui n'existe pas.
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('rend une alerte et un bouton Réessayer sur échec de lecture', async () => {
    const { mock } = stubFetch({ ok: false, reason: 'exception', error: 'Impossible de lire.' });

    render(<OrientationPanel idPatient="PAT_SEED_03" />);

    expect(await screen.findByRole('alert')).toBeTruthy();
    const bouton = screen.getByRole('button', { name: /réessayer/i });
    expect(mock).toHaveBeenCalledTimes(1);
    fireEvent.click(bouton);
    expect(mock).toHaveBeenCalledTimes(2);
  });

  it('distingue l’échec de lecture de l’absence de recommandation', async () => {
    stubFetch({ ok: true, actif: true, version: 'v1', sha256: 'abc', recommandations: [] });

    render(<OrientationPanel idPatient="PAT_SEED_03" />);

    expect(await screen.findByText(/aucune exploration complémentaire/i)).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('rend les recommandations dans l’ordre servi, avec le sha256', async () => {
    stubFetch(ACTIF);

    render(<OrientationPanel idPatient="PAT_SEED_03" emailPatient="sophie@example.test" />);

    expect(await screen.findByText(/Sommeil et chronobiologie/i)).toBeTruthy();
    expect(screen.getByText(/abc123/)).toBeTruthy();

    // L'ordre est calculé (priorité, motifs, clé de cible) : le rendre autrement
    // détruirait une information que rien d'autre ne porte.
    const items = screen.getAllByRole('listitem').map(n => n.textContent ?? '');
    const rangPack = items.findIndex(t => t.includes('Sommeil et chronobiologie'));
    const rangQuestionnaire = items.findIndex(t => t.includes('R-STR-02'));
    expect(rangPack).toBeGreaterThanOrEqual(0);
    expect(rangPack).toBeLessThan(rangQuestionnaire);
  });

  it('présente une couverture inconnue comme inconnue, pas comme négative', async () => {
    stubFetch({ ...ACTIF, recommandations: [RECOMMANDATION_QUESTIONNAIRE] });

    render(<OrientationPanel idPatient="PAT_SEED_03" />);

    expect(await screen.findByText(/couverture inconnue/i)).toBeTruthy();
  });

  it('n’affiche aucun bouton d’assignation sans email patient', async () => {
    stubFetch(ACTIF);

    render(<OrientationPanel idPatient="PAT_SEED_03" />);

    await screen.findByText(/Sommeil et chronobiologie/i);
    expect(screen.queryByRole('button', { name: /assigner ce pack/i })).toBeNull();
  });

  it('n’affiche aucun bouton d’assignation pour un pack sans correspondance en base', async () => {
    const sansIdBase = { ...RECOMMANDATION_PACK, idPackBase: undefined };
    stubFetch({ ...ACTIF, recommandations: [sansIdBase] });

    render(<OrientationPanel idPatient="PAT_SEED_03" emailPatient="sophie@example.test" />);

    await screen.findByText(/Sommeil et chronobiologie/i);
    // Un bouton présent puis voué au `pack_not_found` est pire qu'un bouton absent.
    expect(screen.queryByRole('button', { name: /assigner ce pack/i })).toBeNull();
  });

  it('n’assigne rien par le seul affichage, et demande une confirmation avant d’envoyer', async () => {
    const { appels } = stubFetch(ACTIF);

    render(<OrientationPanel idPatient="PAT_SEED_03" emailPatient="sophie@example.test" />);

    await screen.findByText(/Sommeil et chronobiologie/i);
    expect(appels.some(a => a.url.includes('packs/assign'))).toBe(false);

    // Premier clic : la confirmation seule. Aucune requête — l'assignation
    // envoie un e-mail au patient, un geste sortant ne part pas sur un clic.
    fireEvent.click(screen.getByRole('button', { name: /assigner ce pack/i }));
    expect(appels.some(a => a.url.includes('packs/assign'))).toBe(false);
    expect(screen.getByText(/enverra un e-mail au patient/i)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /confirmer l’assignation/i }));
    expect(await screen.findByText(/assigné\(s\)/i)).toBeTruthy();

    const appel = appels.find(a => a.url.includes('packs/assign'));
    expect(appel?.init?.method).toBe('POST');
    // Le contrat serveur attend l'`id_pack` de la base et l'email, pas le slug
    // de doctrine ni l'identifiant patient.
    expect(JSON.parse(String(appel?.init?.body))).toEqual({
      idPack: 'PACK_SOMMEIL_CHRONO',
      emailPatient: 'sophie@example.test',
    });
  });

  it('annule la confirmation sans rien envoyer', async () => {
    const { appels } = stubFetch(ACTIF);

    render(<OrientationPanel idPatient="PAT_SEED_03" emailPatient="sophie@example.test" />);

    await screen.findByText(/Sommeil et chronobiologie/i);
    fireEvent.click(screen.getByRole('button', { name: /assigner ce pack/i }));
    fireEvent.click(screen.getByRole('button', { name: /annuler/i }));

    expect(appels.some(a => a.url.includes('packs/assign'))).toBe(false);
    expect(screen.getByRole('button', { name: /assigner ce pack/i })).toBeTruthy();
  });

  it('ne propose pas une seconde assignation après un succès', async () => {
    const { appels } = stubFetch(ACTIF);

    render(<OrientationPanel idPatient="PAT_SEED_03" emailPatient="sophie@example.test" />);

    await screen.findByText(/Sommeil et chronobiologie/i);
    fireEvent.click(screen.getByRole('button', { name: /assigner ce pack/i }));
    fireEvent.click(screen.getByRole('button', { name: /confirmer l’assignation/i }));
    await screen.findByText(/assigné\(s\)/i);

    // `packs/assign` ne déduplique pas : un second clic créerait des
    // assignations en double ET un second e-mail au patient.
    expect(screen.queryByRole('button', { name: /assigner ce pack/i })).toBeNull();
    expect(screen.getByText(/le patient a reçu son e-mail/i)).toBeTruthy();
    expect(appels.filter(a => a.url.includes('packs/assign'))).toHaveLength(1);
  });

  it('laisse réessayer après un échec d’assignation', async () => {
    stubFetch(ACTIF, { success: false, error: 'Portail révoqué.' });

    render(<OrientationPanel idPatient="PAT_SEED_03" emailPatient="sophie@example.test" />);

    await screen.findByText(/Sommeil et chronobiologie/i);
    fireEvent.click(screen.getByRole('button', { name: /assigner ce pack/i }));
    fireEvent.click(screen.getByRole('button', { name: /confirmer l’assignation/i }));
    await screen.findByText(/portail révoqué/i);

    // Un échec n'a envoyé aucun e-mail : le geste doit rester possible.
    expect(screen.getByRole('button', { name: /assigner ce pack/i })).toBeTruthy();
  });

  it('tombe en erreur plutôt que de jeter sur une charge ok:true malformée', async () => {
    stubFetch({ ok: true, actif: true, version: 'v1', sha256: 'abc' });

    render(<OrientationPanel idPatient="PAT_SEED_03" />);

    expect(await screen.findByRole('alert')).toBeTruthy();
  });

  it('rend l’échec d’assignation sans le confondre avec un succès', async () => {
    stubFetch(ACTIF, { success: false, error: 'Portail révoqué.' });

    render(<OrientationPanel idPatient="PAT_SEED_03" emailPatient="sophie@example.test" />);

    await screen.findByText(/Sommeil et chronobiologie/i);
    fireEvent.click(screen.getByRole('button', { name: /assigner ce pack/i }));
    fireEvent.click(screen.getByRole('button', { name: /confirmer l’assignation/i }));

    expect(await screen.findByText(/portail révoqué/i)).toBeTruthy();
  });
});
