// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PatientFoodObservationPanel } from './PatientFoodObservationPanel';

// Protocole diffusé servi par `/api/portail/protocole` : depuis le lot 2, c'est
// lui — et lui seul — qui donne un épisode au carnet.
const PROTOCOLE_DIFFUSE = {
  ok: true,
  protocoleDiffuse: true,
  vue: {
    purpose: 'Rendre l’action alimentaire praticable les jours chargés.',
    actionPrincipale: {
      type: 'alimentation',
      title: 'Ajouter une source de protéines au petit-déjeuner',
      minimalPlan: 'Le faire trois fois cette semaine.',
    },
    cycleRef: 'abcdef0123456789',
    debutCycle: '2026-07-20T08:00:00.000Z',
  },
};

function mockRoutes(options: { protocole?: unknown; snapshots?: unknown[]; postJa?: () => Response } = {}) {
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.includes('/api/portail/ja/decision')) {
      return new Response(JSON.stringify({ ok: true, hasDecision: false, decision: null }), { status: 200 });
    }
    if (url.includes('/api/portail/protocole')) {
      return new Response(
        JSON.stringify(options.protocole ?? { ok: true, protocoleDiffuse: false, vue: null }),
        { status: 200 },
      );
    }
    if (url.includes('/api/portail/ja/observations')) {
      if ((init?.method ?? 'GET') === 'GET') {
        return new Response(
          JSON.stringify({ ok: true, snapshots: options.snapshots ?? [] }),
          { status: 200 },
        );
      }
      return options.postJa
        ? options.postJa()
        : new Response(
            JSON.stringify({
              ok: true,
              snapshot: { draftId: 'JA_DRAFT_NEW', createdAt: '2026-07-28T09:00:00.000Z' },
            }),
            { status: 201 },
          );
    }
    return new Response(JSON.stringify({ ok: false, error: 'Route test non mockée' }), { status: 404 });
  }));
}

// La saisie n'apparaît qu'une fois le cycle résolu (lot 2, item 5) : tous les
// cas de saisie attendent donc le formulaire.
async function rendrePret(idPatient: string | null = 'PAT_TEST') {
  const vue = render(<PatientFoodObservationPanel idPatient={idPatient} />);
  await screen.findByTestId('ja-patient-formulaire-trace');
  return vue;
}

describe('PatientFoodObservationPanel', () => {
  beforeEach(() => {
    mockRoutes();
  });

  afterEach(() => {
    cleanup();
    window.sessionStorage.clear();
    vi.unstubAllGlobals();
  });

  it('demande une friction pour une trace partielle/empêchee', async () => {
    await rendrePret();

    fireEvent.change(screen.getByTestId('ja-patient-issue'), {
      target: { value: 'partiel_empeche' },
    });
    fireEvent.click(screen.getByTestId('ja-patient-enregistrer-trace'));

    expect(screen.getByText(/précise la friction/i)).toBeTruthy();
  });

  // Lot 1 (audit du 2026-07-27, §2.1) : atteindre le budget hebdomadaire ne
  // prouve RIEN sur la couverture — trois traces du même lundi y suffisent.
  // Le panneau ne rend donc plus aucun verdict de suffisance au patient. Ce
  // test remplace celui qui exigeait l'inverse : il garde la correction.
  it('ne rend aucun verdict de suffisance quand le budget hebdomadaire est atteint', async () => {
    await rendrePret();

    fireEvent.change(screen.getByTestId('ja-patient-budget'), {
      target: { value: '2' },
    });
    fireEvent.click(screen.getByTestId('ja-patient-enregistrer-trace'));
    fireEvent.click(screen.getByTestId('ja-patient-enregistrer-trace'));

    expect(screen.queryByText('Rien à noter aujourd’hui, nous en savons assez.')).toBeNull();
    // La couverture reste servie : un comptage nu, sans qualification.
    expect(screen.getByTestId('ja-patient-couverture')).toBeTruthy();
  });

  it('ajoute une solution intra-épisode', async () => {
    await rendrePret();

    fireEvent.change(screen.getByTestId('ja-patient-solution-input'), {
      target: { value: 'Préparer la veille' },
    });
    fireEvent.click(screen.getByTestId('ja-patient-ajouter-solution'));

    expect(screen.getByText('• Préparer la veille')).toBeTruthy();
  });

  it('restaure le brouillon local après remount', async () => {
    const { unmount } = await rendrePret();

    fireEvent.change(screen.getByTestId('ja-patient-budget'), {
      target: { value: '2' },
    });
    fireEvent.click(screen.getByTestId('ja-patient-enregistrer-trace'));
    fireEvent.click(screen.getByTestId('ja-patient-enregistrer-trace'));
    fireEvent.change(screen.getByTestId('ja-patient-solution-input'), {
      target: { value: 'Batch cuisine dimanche' },
    });
    fireEvent.click(screen.getByTestId('ja-patient-ajouter-solution'));

    unmount();
    await rendrePret();

    expect(screen.getByText('Brouillon local restauré sur cet appareil.')).toBeTruthy();
    expect(screen.getByText('• Batch cuisine dimanche')).toBeTruthy();
  });

  // Préalable G4 : le brouillon suit la personne, pas le lien. Une clé portant
  // le jeton d'URL deviendrait introuvable au lien suivant — et écrirait un
  // secret d'accès dans le stockage du navigateur.
  it('nomme le brouillon d’après le patient, jamais d’après un jeton de lien', async () => {
    await rendrePret();

    fireEvent.click(screen.getByTestId('ja-patient-enregistrer-trace'));

    const cles = Object.keys(window.sessionStorage);
    expect(cles).toContain('wellneuro:ja5-02:patient:PAT_TEST');
    expect(cles.some(cle => cle.includes('TOK'))).toBe(false);
  });

  it('sans session, ne conserve rien et le dit plutôt que de le taire', async () => {
    await rendrePret(null);

    fireEvent.click(screen.getByTestId('ja-patient-enregistrer-trace'));

    expect(screen.getByText(/ne sera pas conservé sur cet appareil/)).toBeTruthy();
    expect(Object.keys(window.sessionStorage)).toEqual([]);
  });

  // Lot 2, item 5 — l'épisode vient du protocole diffusé, jamais d'un gabarit.
  it('sans protocole diffusé, n’affiche aucune action et ne propose pas de transmettre', async () => {
    await rendrePret();

    await screen.findByTestId('ja-patient-sans-cycle');
    expect(screen.queryByTestId('ja-patient-action-cycle')).toBeNull();
    expect(screen.queryByTestId('ja-patient-transmettre')).toBeNull();
    // Le petit-déjeuner protéiné du gabarit ne doit plus être servi à tous.
    expect(screen.queryByText(/Ajouter une source de protéines au petit-déjeuner/)).toBeNull();
    // La saisie reste ouverte : ces notes restent locales.
    fireEvent.click(screen.getByTestId('ja-patient-enregistrer-trace'));
    expect(screen.getByText(/· Je l’ai fait/i)).toBeTruthy();
  });

  it('affiche l’action décidée en consultation et sa période de 21 jours', async () => {
    mockRoutes({ protocole: PROTOCOLE_DIFFUSE });
    render(<PatientFoodObservationPanel idPatient="PAT_TEST" />);

    const carte = await screen.findByTestId('ja-patient-action-cycle');
    expect(carte.textContent).toMatch(/Ajouter une source de protéines au petit-déjeuner/);
    expect(carte.textContent).toMatch(/Le faire trois fois cette semaine/);
    expect(carte.textContent).toMatch(/2026-07-20/);
    expect(carte.textContent).toMatch(/2026-08-09/);
  });

  // Lot 2, item 4 — la transmission est un geste explicite du patient.
  it('transmet l’instantané et chaîne le suivant sur le précédent', async () => {
    mockRoutes({ protocole: PROTOCOLE_DIFFUSE });
    render(<PatientFoodObservationPanel idPatient="PAT_TEST" />);

    await screen.findByTestId('ja-patient-transmettre');
    fireEvent.click(screen.getByTestId('ja-patient-enregistrer-trace'));
    fireEvent.click(screen.getByTestId('ja-patient-transmettre'));

    await waitFor(() => {
      expect(vi.mocked(fetch).mock.calls.some(([url, init]) =>
        String(url).includes('/api/portail/ja/observations') && init?.method === 'POST')).toBe(true);
    });

    const premier = vi.mocked(fetch).mock.calls.find(([url, init]) =>
      String(url).includes('/api/portail/ja/observations') && init?.method === 'POST');
    const corps = JSON.parse(String(premier?.[1]?.body));
    expect(corps.episode.episodeId).toBe('ja_PAT_TEST_abcdef0123456789');
    expect(corps.episode.patientId).toBe('PAT_TEST');
    expect(corps.traces).toHaveLength(1);
    // Contrat serveur : le tableau est exigé, il part vide plutôt qu'absent.
    expect(corps.actionCareer).toEqual([]);
    expect(corps.supersedesDraftId).toBeUndefined();

    // La trace reste dans le brouillon local après transmission.
    expect(screen.getByText(/· Je l’ai fait/i)).toBeTruthy();

    fireEvent.click(screen.getByTestId('ja-patient-transmettre'));
    await waitFor(() => {
      const posts = vi.mocked(fetch).mock.calls.filter(([url, init]) =>
        String(url).includes('/api/portail/ja/observations') && init?.method === 'POST');
      expect(posts).toHaveLength(2);
      expect(JSON.parse(String(posts[1][1]?.body)).supersedesDraftId).toBe('JA_DRAFT_NEW');
    });
  });

  // On ne chaîne que sur ses propres transmissions : un instantané du praticien
  // n'est pas une version antérieure de celui du patient.
  it('ne chaîne pas sur un instantané rédigé par le praticien', async () => {
    mockRoutes({
      protocole: PROTOCOLE_DIFFUSE,
      snapshots: [
        { draftId: 'JA_DRAFT_PRAT', createdAt: '2026-07-27T09:00:00.000Z', actor: 'praticien' },
        { draftId: 'JA_DRAFT_PAT', createdAt: '2026-07-26T09:00:00.000Z', actor: 'patient' },
      ],
    });
    render(<PatientFoodObservationPanel idPatient="PAT_TEST" />);

    await screen.findByTestId('ja-patient-derniere-transmission');
    fireEvent.click(screen.getByTestId('ja-patient-transmettre'));

    await waitFor(() => {
      const post = vi.mocked(fetch).mock.calls.find(([url, init]) =>
        String(url).includes('/api/portail/ja/observations') && init?.method === 'POST');
      expect(JSON.parse(String(post?.[1]?.body)).supersedesDraftId).toBe('JA_DRAFT_PAT');
    });
  });

  // La saisie n'ouvre qu'une fois le cycle résolu, et un brouillon d'un cycle
  // précédent ne repart pas sous le cycle courant : le serveur refuserait
  // l'instantané, et la faisabilité JA disparaîtrait de la boussole praticien.
  it('ne transmet aucune trace relevant d’un autre épisode', async () => {
    window.sessionStorage.setItem('wellneuro:ja5-02:patient:PAT_TEST', JSON.stringify({
      budget: 3,
      traces: [{
        traceId: 't_ancien',
        episodeId: 'ja_PAT_TEST_cycle_precedent',
        localDate: '2026-06-01',
        occasionPresentee: true,
        faisable: true,
        issue: 'fait',
        frictionsVersion: 'frictions-v1',
      }],
      pauses: [],
      plans: [],
      solutions: [],
    }));
    mockRoutes({ protocole: PROTOCOLE_DIFFUSE });
    render(<PatientFoodObservationPanel idPatient="PAT_TEST" />);

    await screen.findByTestId('ja-patient-transmettre');
    fireEvent.click(screen.getByTestId('ja-patient-enregistrer-trace'));
    fireEvent.click(screen.getByTestId('ja-patient-transmettre'));

    await waitFor(() => {
      const post = vi.mocked(fetch).mock.calls.find(([url, init]) =>
        String(url).includes('/api/portail/ja/observations') && init?.method === 'POST');
      const corps = JSON.parse(String(post?.[1]?.body));
      expect(corps.traces).toHaveLength(1);
      expect(corps.traces[0].episodeId).toBe('ja_PAT_TEST_abcdef0123456789');
    });
    // La trace ancienne reste visible en local : elle n'est pas détruite.
    expect(screen.getByText(/2026-06-01/)).toBeTruthy();
  });

  it('n’ouvre pas la saisie avant que le cycle soit résolu', () => {
    mockRoutes({ protocole: PROTOCOLE_DIFFUSE });
    render(<PatientFoodObservationPanel idPatient="PAT_TEST" />);

    expect(screen.queryByTestId('ja-patient-enregistrer-trace')).toBeNull();
    expect(screen.getByText('Chargement de votre carnet…')).toBeTruthy();
  });

  it('rend l’échec de transmission en français sans perdre le brouillon', async () => {
    mockRoutes({
      protocole: PROTOCOLE_DIFFUSE,
      postJa: () => new Response(
        JSON.stringify({ ok: false, reason: 'invalid_payload', error: 'Corps de requête incomplet.' }),
        { status: 400 },
      ),
    });
    render(<PatientFoodObservationPanel idPatient="PAT_TEST" />);

    await screen.findByTestId('ja-patient-transmettre');
    fireEvent.click(screen.getByTestId('ja-patient-enregistrer-trace'));
    fireEvent.click(screen.getByTestId('ja-patient-transmettre'));

    expect(await screen.findByText('Corps de requête incomplet.')).toBeTruthy();
    expect(screen.getByText(/· Je l’ai fait/i)).toBeTruthy();
  });

  it('réinitialise le brouillon local', async () => {
    await rendrePret();

    fireEvent.click(screen.getByTestId('ja-patient-enregistrer-trace'));
    expect(screen.getByText(/· Je l’ai fait/i)).toBeTruthy();

    fireEvent.click(screen.getByTestId('ja-patient-reset-local'));
    expect(screen.queryByText('Brouillon local restauré sur cet appareil.')).toBeNull();
    expect(screen.getByText('Pas encore d’élément enregistré.')).toBeTruthy();
  });
});
