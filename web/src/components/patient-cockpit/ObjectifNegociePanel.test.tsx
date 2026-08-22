// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ObjectifNegociePanel } from './ObjectifNegociePanel';

const fetchMock = vi.fn();

const json = (payload: unknown, ok = true) => ({ ok, json: async () => payload });

const ANCRAGE_VIDE = {
  consultationValidee: false,
  motifPrincipal: null,
  objectifPrioritaire: null,
  attentes: [],
};

const DOSSIER_VIDE = {
  ok: true,
  objectifs: [],
  trajectoires: [],
  ancrage: ANCRAGE_VIDE,
  ratifications: {},
};

const ligne = (partiel: Record<string, unknown> = {}) => ({
  id: 'OBJ_1',
  enoncePatient: 'Je voudrais dormir sans me réveiller à trois heures.',
  reformulationPraticien: null,
  priorite: null,
  nonTraiteMotif: null,
  nonTraiteDepuisLe: null,
  negocieLe: null,
  creeLe: '2026-08-20T09:00:00.000Z',
  supersedesObjectifId: null,
  ...partiel,
});

/** Route les appels comme le ferait le serveur, sans supposer leur ordre. */
function router(surcharges: { dossier?: unknown; dossierOk?: boolean; post?: unknown; postOk?: boolean } = {}) {
  return (url: string, options?: { method?: string }) => {
    if (options?.method === 'POST') {
      return Promise.resolve(json(surcharges.post ?? { ok: true, objectif: ligne() }, surcharges.postOk ?? true));
    }
    if (url.startsWith('/api/praticien/objectifs')) {
      return Promise.resolve(json(surcharges.dossier ?? DOSSIER_VIDE, surcharges.dossierOk ?? true));
    }
    return Promise.resolve(json({}, false));
  };
}

async function attendreLeDossier() {
  render(<ObjectifNegociePanel idPatient="PAT_SEED_03" />);
  await waitFor(() => expect(screen.getByText(/Ce que le patient a écrit à l’anamnèse/)).toBeTruthy());
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('ObjectifNegociePanel (Alliance 6.0-A LOT-02)', () => {
  it('ne tire le dossier qu’une fois : le GET journalise, une boucle gonflerait le journal', async () => {
    fetchMock.mockImplementation(router());
    await attendreLeDossier();
    // Laisse passer d'éventuels re-rendus avant de compter.
    await new Promise((resoudre) => setTimeout(resoudre, 20));
    const lectures = fetchMock.mock.calls.filter(([, options]) => options?.method !== 'POST');
    expect(lectures).toHaveLength(1);
  });

  // ── Trois absences, trois libellés distincts (DC-24) ──────────────────────

  it('sans consultation validée, le dit — et ne parle pas de champ vide', async () => {
    fetchMock.mockImplementation(router());
    await attendreLeDossier();
    expect(screen.getByText(/Aucune consultation validée dans ce dossier/)).toBeTruthy();
    expect(screen.queryByText(/Non renseigné à l’anamnèse/)).toBeNull();
  });

  it('avec une consultation validée, distingue le champ non renseigné', async () => {
    fetchMock.mockImplementation(
      router({
        dossier: {
          ...DOSSIER_VIDE,
          ancrage: {
            consultationValidee: true,
            motifPrincipal: 'Fatigue persistante depuis six mois.',
            objectifPrioritaire: null,
            attentes: [],
          },
        },
      }),
    );
    await attendreLeDossier();
    expect(screen.getByText('Fatigue persistante depuis six mois.')).toBeTruthy();
    expect(screen.getByText('Non renseigné à l’anamnèse.')).toBeTruthy();
    expect(screen.getByText('Non renseignées à l’anamnèse.')).toBeTruthy();
    expect(screen.queryByText(/Aucune consultation validée/)).toBeNull();
  });

  it('une erreur de lecture n’affiche JAMAIS une liste vide', async () => {
    fetchMock.mockImplementation(
      router({ dossier: { ok: false, reason: 'exception', error: 'Erreur technique.' }, dossierOk: false }),
    );
    render(<ObjectifNegociePanel idPatient="PAT_SEED_03" />);

    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    expect(screen.getByRole('alert').textContent).toMatch(/pas une absence d’objectif/);
    expect(screen.getByRole('button', { name: 'Réessayer' })).toBeTruthy();
    expect(screen.queryByText(/Aucun objectif négocié pour ce dossier/)).toBeNull();
    // Et l'absence d'ancrage n'est pas non plus affirmée.
    expect(screen.queryByText(/Aucune consultation validée/)).toBeNull();
  });

  // ── Le matériau d'ancrage ne pré-remplit rien ─────────────────────────────

  it('affiche le matériau d’anamnèse À CÔTÉ de la saisie, jamais dedans', async () => {
    fetchMock.mockImplementation(
      router({
        dossier: {
          ...DOSSIER_VIDE,
          ancrage: {
            consultationValidee: true,
            motifPrincipal: 'Fatigue persistante depuis six mois.',
            objectifPrioritaire: 'Retrouver de l’énergie le matin.',
            attentes: ['Améliorer le sommeil'],
          },
        },
      }),
    );
    await attendreLeDossier();

    expect(screen.getByText('Retrouver de l’énergie le matin.')).toBeTruthy();
    // Le champ de saisie est VIDE : pré-remplir attribuerait durablement au
    // patient, comme objectif négocié, une phrase dite à une autre question.
    const champ = screen.getByLabelText(/Ce que le patient demande/) as HTMLTextAreaElement;
    expect(champ.value).toBe('');
  });

  // ── La priorité ne s'ordonne pas ──────────────────────────────────────────

  it('la priorité est un champ texte libre — ni liste déroulante, ni badge ordonné', async () => {
    fetchMock.mockImplementation(router());
    await attendreLeDossier();
    const champ = screen.getByLabelText(/Priorité \(libellé libre\)/);
    expect(champ.tagName).toBe('INPUT');
    expect(champ.getAttribute('type')).toBe('text');
    expect(screen.queryByRole('combobox')).toBeNull();
  });

  // ── Trajectoire ───────────────────────────────────────────────────────────

  it('affiche la trajectoire complète : chaque révision, rien d’écrasé', async () => {
    fetchMock.mockImplementation(
      router({
        dossier: {
          ...DOSSIER_VIDE,
          objectifs: [ligne({ id: 'OBJ_2', supersedesObjectifId: 'OBJ_1' })],
          trajectoires: [
            {
              idObjectif: 'OBJ_2',
              lignes: [
                ligne({
                  id: 'OBJ_2',
                  supersedesObjectifId: 'OBJ_1',
                  reformulationPraticien: 'Sommeil fragmenté en seconde partie de nuit.',
                  creeLe: '2026-08-21T09:00:00.000Z',
                }),
                ligne({ id: 'OBJ_1', priorite: 'Premier plan' }),
              ],
            },
          ],
          ratifications: { OBJ_2: 'en_attente' },
        },
      }),
    );
    await attendreLeDossier();

    expect(screen.getByText(/Sommeil fragmenté en seconde partie de nuit/)).toBeTruthy();
    expect(screen.getByText('Versions antérieures (1)')).toBeTruthy();
    // La version supplantée reste lisible, avec ce qu'elle portait.
    expect(screen.getByText(/Priorité : Premier plan/)).toBeTruthy();
  });

  it('quand deux versions courantes coexistent, les affiche toutes et le dit', async () => {
    fetchMock.mockImplementation(
      router({
        dossier: {
          ...DOSSIER_VIDE,
          objectifs: [ligne({ id: 'OBJ_3' }), ligne({ id: 'OBJ_2' })],
          trajectoires: [
            { idObjectif: 'OBJ_3', lignes: [ligne({ id: 'OBJ_3', priorite: 'Version A' })] },
            { idObjectif: 'OBJ_2', lignes: [ligne({ id: 'OBJ_2', priorite: 'Version B' })] },
          ],
          ratifications: { OBJ_3: 'en_attente', OBJ_2: 'en_attente' },
        },
      }),
    );
    await attendreLeDossier();

    expect(screen.getByRole('status').textContent).toMatch(/2 versions courantes coexistent/);
    expect(screen.getByText(/Priorité : Version A/)).toBeTruthy();
    expect(screen.getByText(/Priorité : Version B/)).toBeTruthy();
  });

  // ── Ratification ──────────────────────────────────────────────────────────

  it('« en attente » se dit « pas encore proposé au patient », jamais « non ratifié »', async () => {
    fetchMock.mockImplementation(
      router({
        dossier: {
          ...DOSSIER_VIDE,
          objectifs: [ligne()],
          trajectoires: [{ idObjectif: 'OBJ_1', lignes: [ligne()] }],
          ratifications: { OBJ_1: 'en_attente' },
        },
      }),
    );
    await attendreLeDossier();

    expect(screen.getByText(/Aucune réponse du patient enregistrée/)).toBeTruthy();
    // Le geste patient n'existe pas avant le LOT-06 : « non ratifié »
    // porterait un jugement sur quelqu'un à qui rien n'a été demandé.
    expect(document.body.textContent).not.toContain('Non ratifié');
    expect(document.body.textContent).not.toContain('non ratifié');
  });

  it('rend les deux autres gestes tels que le serveur les donne', async () => {
    fetchMock.mockImplementation(
      router({
        dossier: {
          ...DOSSIER_VIDE,
          objectifs: [ligne()],
          trajectoires: [{ idObjectif: 'OBJ_1', lignes: [ligne()] }],
          ratifications: { OBJ_1: 'conteste' },
        },
      }),
    );
    await attendreLeDossier();
    expect(screen.getByText(/Contesté par le patient/)).toBeTruthy();
  });

  // ── Écriture ──────────────────────────────────────────────────────────────

  it('poste le contrat exact de la route, sans jamais transmettre de date d’enregistrement', async () => {
    fetchMock.mockImplementation(router());
    await attendreLeDossier();

    fireEvent.change(screen.getByLabelText(/Ce que le patient demande/), {
      target: { value: 'Je voudrais dormir sans me réveiller à trois heures.' },
    });
    fireEvent.change(screen.getByLabelText(/Votre reformulation/), {
      target: { value: 'Sommeil fragmenté en seconde partie de nuit.' },
    });
    fireEvent.change(screen.getByLabelText(/Priorité \(libellé libre\)/), {
      target: { value: 'Premier plan' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer l’objectif' }));

    await waitFor(() => {
      expect(fetchMock.mock.calls.find(([, options]) => options?.method === 'POST')).toBeTruthy();
    });
    const [url, options] = fetchMock.mock.calls.find(([, options]) => options?.method === 'POST')!;
    expect(url).toBe('/api/praticien/objectifs');
    const charge = JSON.parse(options.body as string);
    expect(charge.idPatient).toBe('PAT_SEED_03');
    expect(charge.enoncePatient).toBe('Je voudrais dormir sans me réveiller à trois heures.');
    expect(charge.priorite).toBe('Premier plan');
    expect(charge.supersedesObjectifId).toBeNull();
    // La date d'enregistrement est posée par la BASE.
    expect(Object.keys(charge)).not.toContain('creeLe');
  });

  it('une reformulation ne renvoie PAS l’énoncé : le serveur le recopie de la cible', async () => {
    fetchMock.mockImplementation(
      router({
        dossier: {
          ...DOSSIER_VIDE,
          objectifs: [ligne()],
          trajectoires: [{ idObjectif: 'OBJ_1', lignes: [ligne()] }],
          ratifications: { OBJ_1: 'en_attente' },
        },
      }),
    );
    await attendreLeDossier();

    fireEvent.click(screen.getByRole('button', { name: 'Reformuler cette version' }));
    expect(screen.queryByLabelText(/Ce que le patient demande/)).toBeNull();

    fireEvent.change(screen.getByLabelText(/Votre reformulation/), {
      target: { value: 'Sommeil fragmenté en seconde partie de nuit.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer la reformulation' }));

    await waitFor(() => {
      expect(fetchMock.mock.calls.find(([, options]) => options?.method === 'POST')).toBeTruthy();
    });
    const [, options] = fetchMock.mock.calls.find(([, options]) => options?.method === 'POST')!;
    const charge = JSON.parse(options.body as string);
    expect(charge.supersedesObjectifId).toBe('OBJ_1');
    expect(Object.keys(charge)).not.toContain('enoncePatient');
  });

  it('affiche tel quel le refus du serveur (le 400 « non traité incomplet » fait foi)', async () => {
    fetchMock.mockImplementation(
      router({
        post: {
          ok: false,
          reason: 'non_traite_incomplet',
          error:
            'Un « non traité pour l’instant » porte un motif ET une date : renseignez les deux, ou aucun.',
        },
        postOk: false,
      }),
    );
    await attendreLeDossier();

    fireEvent.change(screen.getByLabelText(/Ce que le patient demande/), { target: { value: 'Dormir mieux.' } });
    fireEvent.change(screen.getByLabelText(/Ce qui n’est pas traité/), {
      target: { value: 'La question digestive attendra.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer l’objectif' }));

    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/motif ET une date/));
  });

  it('affiche tel quel le refus d’un dossier clos (le 409 fait foi)', async () => {
    fetchMock.mockImplementation(
      router({
        post: {
          ok: false,
          reason: 'dossier_cloture',
          error:
            'Le suivi de ce dossier est clôturé : aucun questionnaire ne peut être assigné, aucun document de suivi envoyé. Rouvrez le suivi pour reprendre.',
        },
        postOk: false,
      }),
    );
    await attendreLeDossier();

    fireEvent.change(screen.getByLabelText(/Ce que le patient demande/), { target: { value: 'Dormir mieux.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer l’objectif' }));

    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/Rouvrez le suivi/));
  });
});
