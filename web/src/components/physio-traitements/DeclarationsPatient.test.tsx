// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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

afterEach(() => vi.unstubAllGlobals());

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

  it('démontée, elle ne bloque plus la fiche', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('réseau')));
    const onLectureEchouee = vi.fn();

    const { unmount } = render(<DeclarationsPatient parties="sexe" onLectureEchouee={onLectureEchouee} />);
    await waitFor(() => expect(onLectureEchouee).toHaveBeenLastCalledWith(true));
    unmount();
    expect(onLectureEchouee).toHaveBeenLastCalledWith(false);
  });
});
