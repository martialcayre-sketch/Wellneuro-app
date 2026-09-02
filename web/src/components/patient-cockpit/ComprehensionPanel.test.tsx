// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ComprehensionPanel } from './ComprehensionPanel';

const fetchMock = vi.fn();

const json = (payload: unknown, ok = true) => ({ ok, json: async () => payload });

const version = (partiel: Record<string, unknown> = {}) => ({
  id: 'SYN_1',
  texte: 'Vous venez pour un sommeil qui se casse au milieu de la nuit.',
  redigeeLe: null,
  publieeLe: null,
  creeLe: '2026-08-20T09:00:00.000Z',
  supersedesSyntheseId: null,
  ...partiel,
});

function dossier(partiel: Record<string, unknown> = {}) {
  const syntheses = (partiel.syntheses as unknown[]) ?? [];
  return {
    ok: true,
    syntheses,
    trajectoires: syntheses.map((s) => ({
      idSynthese: (s as { id: string }).id,
      lignes: [s],
    })),
    desaccords: [],
    surfacePatientOuverte: true,
    ...partiel,
  };
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('ComprehensionPanel', () => {
  it('DIT LA VÉRITÉ quand la surface patient est fermée, et empêche de publier', async () => {
    fetchMock.mockResolvedValueOnce(json(dossier({ surfacePatientOuverte: false })));
    render(<ComprehensionPanel idPatient="PAT_TEST" />);

    await waitFor(() => expect(screen.getByText(/surface patient n’est pas ouverte/)).toBeTruthy());
    expect((screen.getByText('Publier au patient') as HTMLButtonElement).disabled).toBe(true);
    // Le brouillon, lui, reste possible : préparer n'est pas remettre.
    expect(screen.getByText('Enregistrer en brouillon')).toBeTruthy();
  });

  it('distingue un BROUILLON d’une version publiée, sans ambiguïté', async () => {
    fetchMock.mockResolvedValueOnce(json(dossier({ syntheses: [version()] })));
    render(<ComprehensionPanel idPatient="PAT_TEST" />);

    await waitFor(() =>
      expect(screen.getByText(/Brouillon — le patient ne la voit pas/)).toBeTruthy(),
    );
  });

  it('SIGNALE une course au lieu de la départager en silence', async () => {
    fetchMock.mockResolvedValueOnce(
      json(
        dossier({
          syntheses: [
            version({ id: 'SYN_2', supersedesSyntheseId: 'SYN_0' }),
            version({ id: 'SYN_3', supersedesSyntheseId: 'SYN_0' }),
          ],
        }),
      ),
    );
    render(<ComprehensionPanel idPatient="PAT_TEST" />);

    await waitFor(() =>
      expect(document.body.textContent).toContain('Plusieurs versions courantes coexistent'),
    );
    expect(document.body.textContent).toContain('Aucune n’a été écartée');
    // Le message ne DIAGNOSTIQUE pas la cause : deux têtes peuvent venir d'une
    // course comme d'une version écrite indépendamment. Affirmer « révisées en
    // parallèle » alarmerait sur un incident inexistant (revue LOT-04, M1).
    expect(document.body.textContent).toContain('indépendamment');
    expect(document.body.textContent).toContain('que la plus récente publiée');
    // Et il n'AFFIRME plus une cause qu'il ne connaît pas.
    expect(document.body.textContent).not.toContain('elles ont été révisées en parallèle');
  });

  it('nomme l’état d’un désaccord sans jamais dire « ignoré » ni « non traité »', async () => {
    fetchMock.mockResolvedValueOnce(
      json(
        dossier({
          syntheses: [version({ publieeLe: '2026-08-20T09:00:00.000Z' })],
          desaccords: [
            {
              id: 'DES_1',
              idSynthese: 'SYN_1',
              texte: 'Pas exactement.',
              exprimeLe: null,
              creeLe: '2026-08-21T09:00:00.000Z',
              etat: 'en_attente',
            },
          ],
        }),
      ),
    );
    render(<ComprehensionPanel idPatient="PAT_TEST" />);

    // Le libellé partage sa ligne avec la date : on lit le texte rendu, pas un
    // nœud isolé.
    await waitFor(() => expect(document.body.textContent).toContain('Pas encore de réponse'));
    expect(document.body.textContent).not.toMatch(/ignoré|non traité|résolu|clos/i);
    // Et le panneau rappelle qu'il n'existe pas de geste de fermeture.
    expect(screen.getByText(/ne se ferme pas et ne s’efface pas/)).toBeTruthy();
  });

  it('rend le refus de registre comme une QUESTION, avec un second geste distinct', async () => {
    fetchMock.mockResolvedValueOnce(json(dossier()));
    render(<ComprehensionPanel idPatient="PAT_TEST" />);
    await waitFor(() => expect(screen.getByText('Publier au patient')).toBeTruthy());

    fireEvent.change(screen.getByLabelText('Ce que j’ai compris'), {
      target: { value: 'Votre situation est grave.' },
    });

    fetchMock.mockResolvedValueOnce(
      json(
        { ok: false, reason: 'REGISTRE_ANXIOGENE', error: 'Cette synthèse emploie « grave ».' },
        false,
      ),
    );
    fireEvent.click(screen.getByText('Publier au patient'));

    await waitFor(() => expect(screen.getByText(/emploie « grave »/)).toBeTruthy());
    // Le second geste n'existe QUE si la route a posé la question — et il est
    // distinct du premier : confirmer le registre ne se fait pas d'un clic qui
    // voudrait dire aussi « publier ».
    const confirmer = screen.getByText('Publier tel quel');
    expect(confirmer).toBeTruthy();

    fetchMock.mockResolvedValueOnce(json({ ok: true, synthese: version() }));
    fetchMock.mockResolvedValueOnce(json(dossier()));
    fireEvent.click(confirmer);

    await waitFor(() => {
      const publication = fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST');
      expect(JSON.parse(publication[1][1].body)).toMatchObject({
        publier: true,
        confirmerRegistre: true,
      });
    });
  });

  it('n’offre le second geste que sur question du registre', async () => {
    fetchMock.mockResolvedValueOnce(json(dossier()));
    render(<ComprehensionPanel idPatient="PAT_TEST" />);
    await waitFor(() => expect(screen.getByText('Publier au patient')).toBeTruthy());

    fireEvent.change(screen.getByLabelText('Ce que j’ai compris'), {
      target: { value: 'Un texte neutre.' },
    });
    fetchMock.mockResolvedValueOnce(json({ ok: false, reason: 'invalid', error: 'Refus.' }, false));
    fireEvent.click(screen.getByText('Publier au patient'));

    await waitFor(() => expect(screen.getByText('Refus.')).toBeTruthy());
    expect(screen.queryByText('Publier tel quel')).toBeNull();
  });

  it('le formulaire cède la place dès qu’une version existe, et se rouvre sur un geste', async () => {
    fetchMock.mockResolvedValueOnce(json(dossier({ syntheses: [version()] })));
    render(<ComprehensionPanel idPatient="PAT_TEST" />);

    await waitFor(() => expect(screen.getByText(/sommeil qui se casse/)).toBeTruthy());
    // Une version existe : la saisie n'est plus la première chose visible.
    expect(screen.queryByLabelText('Ce que j’ai compris')).toBeNull();

    fireEvent.click(screen.getByText('Écrire une nouvelle version'));
    expect(screen.getByLabelText('Ce que j’ai compris')).toBeTruthy();

    fireEvent.click(screen.getByText('Annuler'));
    expect(screen.queryByLabelText('Ce que j’ai compris')).toBeNull();
  });

  it('« Réviser cette version » rouvre le formulaire pré-rempli', async () => {
    fetchMock.mockResolvedValueOnce(json(dossier({ syntheses: [version()] })));
    render(<ComprehensionPanel idPatient="PAT_TEST" />);

    await waitFor(() => expect(screen.getByText('Réviser cette version')).toBeTruthy());
    fireEvent.click(screen.getByText('Réviser cette version'));
    const champ = screen.getByLabelText('Ce que j’ai compris') as HTMLTextAreaElement;
    expect(champ.value).toContain('sommeil qui se casse');
  });

  it('n’affiche AUCUN décompte de désaccords', async () => {
    fetchMock.mockResolvedValueOnce(
      json(
        dossier({
          syntheses: [version({ publieeLe: '2026-08-20T09:00:00.000Z' })],
          desaccords: [
            { id: 'D1', idSynthese: 'SYN_1', texte: 'a', exprimeLe: null, creeLe: '2026-08-21T09:00:00.000Z', etat: 'en_attente' },
            { id: 'D2', idSynthese: 'SYN_1', texte: 'b', exprimeLe: null, creeLe: '2026-08-22T09:00:00.000Z', etat: 'en_attente' },
          ],
        }),
      ),
    );
    render(<ComprehensionPanel idPatient="PAT_TEST" />);

    await waitFor(() => expect(screen.getByText('a')).toBeTruthy());
    expect(document.body.textContent).not.toMatch(/2 désaccords|taux|%/i);
  });
});
