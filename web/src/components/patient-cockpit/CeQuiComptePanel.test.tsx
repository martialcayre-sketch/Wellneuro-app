// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { CeQuiComptePanel } from './CeQuiComptePanel';

const fetchMock = vi.fn();

const json = (payload: unknown, ok = true) => ({ ok, json: async () => payload });

const CREE_LE = '2026-08-22T09:00:00.000Z';

/** Libellé d'absence — il ne doit JAMAIS paraître hors de l'état « chargée ». */
const LIBELLE_ABSENCE = /Aucun dépôt à ce jour/;

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('CeQuiComptePanel — G1 « silence ≠ réponse »', () => {
  it('liste vide : le silence est NOMMÉ comme tel, sans role="alert"', async () => {
    fetchMock.mockResolvedValue(json({ ok: true, entrees: [] }));
    render(<CeQuiComptePanel idPatient="PAT_TEST" />);
    await waitFor(() => expect(screen.getByText(LIBELLE_ABSENCE)).toBeTruthy());
    // Un dossier sans dépôt n'est pas une anomalie : rien ne doit alerter.
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('ERREUR DE LECTURE : role="alert" présent, libellé d’absence ABSENT', async () => {
    fetchMock.mockResolvedValue(json({ ok: false, reason: 'exception', error: 'Erreur technique.' }, false));
    render(<CeQuiComptePanel idPatient="PAT_TEST" />);
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    // LE CŒUR DE G1 : un échec de lecture ne doit jamais être présenté comme
    // « aucun dépôt » — ce serait affirmer un silence qu'on n'a pas constaté.
    expect(screen.queryByText(LIBELLE_ABSENCE)).toBeNull();
    expect(screen.getByText('Erreur technique.')).toBeTruthy();
  });

  it('erreur réseau : même verdict, jamais un fil vide', async () => {
    fetchMock.mockRejectedValue(new Error('réseau'));
    render(<CeQuiComptePanel idPatient="PAT_TEST" />);
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    expect(screen.queryByText(LIBELLE_ABSENCE)).toBeNull();
  });

  it('chargement : troisième rendu distinct — ni absence, ni alerte', async () => {
    // Promesse jamais résolue : on observe l'état intermédiaire.
    fetchMock.mockReturnValue(new Promise(() => {}));
    render(<CeQuiComptePanel idPatient="PAT_TEST" />);
    expect(screen.getByRole('status')).toBeTruthy();
    expect(screen.queryByText(LIBELLE_ABSENCE)).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });
});

describe('CeQuiComptePanel — G5 deux dates, G2 anti-agrégat', () => {
  it('affiche les deux dates, et « aucune date indiquée » quand saisiLe est null', async () => {
    fetchMock.mockResolvedValue(
      json({
        ok: true,
        entrees: [
          { id: 'ENT_1', texte: 'Tenir debout jusqu’au soir.', creeLe: CREE_LE, saisiLe: '2026-08-20T00:00:00.000Z' },
          { id: 'ENT_2', texte: 'Sans date déclarée.', creeLe: CREE_LE, saisiLe: null },
        ],
      }),
    );
    render(<CeQuiComptePanel idPatient="PAT_TEST" />);
    await waitFor(() => expect(screen.getByText('Tenir debout jusqu’au soir.')).toBeTruthy());

    // Deux dates sur la ligne qui en déclare une.
    expect(screen.getByText(/Déposé le 22\/08\/2026 · concerne le 20\/08\/2026/)).toBeTruthy();
    // G5 : `saisiLe` absente reste ABSENTE. Un `saisiLe ?? creeLe` afficherait
    // « concerne le 22/08/2026 » — une déclaration que le patient n'a pas faite.
    expect(screen.getByText(/Déposé le 22\/08\/2026 · aucune date indiquée/)).toBeTruthy();
    expect(screen.queryByText(/concerne le 22\/08\/2026/)).toBeNull();
  });

  it('n’affiche AUCUN décompte des dépôts', async () => {
    fetchMock.mockResolvedValue(
      json({
        ok: true,
        entrees: [
          { id: 'ENT_1', texte: 'Une parole.', creeLe: CREE_LE, saisiLe: null },
          { id: 'ENT_2', texte: 'Une autre.', creeLe: CREE_LE, saisiLe: null },
          { id: 'ENT_3', texte: 'Une troisième.', creeLe: CREE_LE, saisiLe: null },
        ],
      }),
    );
    const { container } = render(<CeQuiComptePanel idPatient="PAT_TEST" />);
    await waitFor(() => expect(screen.getByText('Une parole.')).toBeTruthy());
    // Ni « 3 dépôts », ni « (3) », ni total : compter des paroles, c'est déjà
    // les agréger (`DC-27`).
    expect(container.textContent).not.toMatch(/\b3\b/);
    expect(container.textContent).not.toMatch(/dépôts?\s*\(/i);
  });

  it('rend le texte patient tel quel, sans troncature ni résumé', async () => {
    const long = 'Je '.repeat(200).trim();
    fetchMock.mockResolvedValue(
      json({ ok: true, entrees: [{ id: 'ENT_1', texte: long, creeLe: CREE_LE, saisiLe: null }] }),
    );
    render(<CeQuiComptePanel idPatient="PAT_TEST" />);
    await waitFor(() => expect(screen.getByText(long)).toBeTruthy());
  });
});
