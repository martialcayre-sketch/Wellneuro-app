// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DeclarationsPatient } from './DeclarationsPatient';

// [[D-335]] §3 (BP-13) — les lignes REMPLACENT les groupes de texte libre de
// l'anamnèse : une lecture en échec ne laisse pas la partie vide en silence.
// Elle le dit, offre « Réessayer », et le signale à la fiche englobante, qui
// ne se valide pas sans elle (revue CodeRabbit, P1).

const LUES = {
  ok: true,
  ouvert: true,
  saisieOuverte: true,
  donnees: { criteres: [], traitements: [] },
  aujourdhui: '2026-10-22',
};

const reponse = (corps: unknown, ok = true) => ({ ok, json: async () => corps }) as Response;

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('DeclarationsPatient — lecture en échec', () => {
  it('dit l’échec, le signale à la fiche, et le lève quand la relecture aboutit', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('réseau'))
      .mockResolvedValueOnce(reponse(LUES));
    vi.stubGlobal('fetch', fetchMock);
    const onLectureEchouee = vi.fn();

    render(<DeclarationsPatient parties="traitements" onLectureEchouee={onLectureEchouee} />);

    expect((await screen.findByRole('alert')).textContent).toContain('n’a pas pu être chargée');
    expect(onLectureEchouee).toHaveBeenLastCalledWith(true);

    fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }));
    await waitFor(() => expect(onLectureEchouee).toHaveBeenLastCalledWith(false));
    expect(screen.queryByText(/n’a pas pu être chargée/)).toBeNull();
  });

  it('une réponse refusée est un échec, pas une partie vide', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reponse({ ok: false, error: 'x' }, false)));
    const onLectureEchouee = vi.fn();

    render(<DeclarationsPatient parties="sexe" onLectureEchouee={onLectureEchouee} />);

    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(onLectureEchouee).toHaveBeenLastCalledWith(true);
  });

  it('une relecture en échec APRÈS une écriture se dit aussi, au-dessus des données conservées', async () => {
    const ligne = {
      id: 't1',
      acte: 'pose',
      source: 'patient',
      acteLe: '2026-10-20T10:00:00.000Z',
      nature: 'medicament',
      nom: 'Traitement A',
      dose: null,
      moment: null,
      motif: null,
      debut: '2024-05-01',
      debutPrecision: 'mois',
      fin: null,
      finPrecision: null,
      prescritParTiers: 'inconnu',
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(reponse({ ...LUES, donnees: { criteres: [], traitements: [ligne] } }))
      .mockResolvedValueOnce(reponse({ ok: true }))
      .mockRejectedValueOnce(new Error('réseau'));
    vi.stubGlobal('fetch', fetchMock);
    const onLectureEchouee = vi.fn();

    render(<DeclarationsPatient parties="traitements" onLectureEchouee={onLectureEchouee} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Supprimer cette ligne' }));

    expect((await screen.findByRole('alert')).textContent).toContain('n’a pas pu être chargée');
    expect(screen.getByRole('button', { name: 'Réessayer' })).toBeTruthy();
    expect(onLectureEchouee).toHaveBeenLastCalledWith(true);
  });

  it('démontée, elle ne bloque plus la fiche', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('réseau')));
    const onLectureEchouee = vi.fn();

    const { unmount } = render(<DeclarationsPatient parties="sexe" onLectureEchouee={onLectureEchouee} />);
    await waitFor(() => expect(onLectureEchouee).toHaveBeenLastCalledWith(true));
    unmount();
    expect(onLectureEchouee).toHaveBeenLastCalledWith(false);
  });
});
