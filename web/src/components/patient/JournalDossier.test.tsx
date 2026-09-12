// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { JournalDossier } from './JournalDossier';

// Bancs de l'écran « Ce qui s'est passé dans votre dossier » (LOT-03).
//
// Trois choses se jouent ici, et deux ne se voient pas à l'œil nu : le bloc
// d'AVANT doit reprendre sa place tant que le drapeau est éteint, et le repère
// ne doit avancer QUE lorsque le journal a été montré déplié. La troisième est
// visible mais facile à perdre : aucun décompte dans le titre.

const fetchMock = vi.fn();

const evenement = (partiel: Record<string, unknown> = {}) => ({
  cle: 'ce_qui_compte_depose:E1',
  espece: 'ce_qui_compte_depose',
  voix: 'patient',
  libelle: 'Vous avez dit ce qui compte pour vous.',
  date: '2026-09-12T10:00:00.000Z',
  ...partiel,
});

function stubJournal(payload: unknown, status = 200) {
  fetchMock.mockImplementation(async (_url: string, options?: { method?: string }) => {
    if (options?.method === 'POST') return { ok: true, json: async () => ({ ok: true }) } as unknown as Response;
    return { ok: status === 200, json: async () => payload } as unknown as Response;
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('JournalDossier — ce que l’écran montre', () => {
  it('rend les événements du serveur, datés en français', async () => {
    stubJournal({ ok: true, evenements: [evenement()], vuJusqua: null, duNeuf: true });
    render(<JournalDossier />);
    await waitFor(() => expect(screen.getByTestId('journal-dossier')).toBeTruthy());
    expect(screen.getByText(/Vous avez dit ce qui compte pour vous/)).toBeTruthy();
    expect(screen.getByText('12 septembre 2026')).toBeTruthy();
  });

  it('LE JOUR EST CELUI DE PARIS — 23h30 heure de Paris n’est pas la veille', async () => {
    // 2026-09-12T21:30Z = 23:30 à Paris le 12. Daté en UTC, le journal dirait
    // au patient qu'il a transmis « hier » alors qu'il vient de le faire.
    stubJournal({
      ok: true,
      evenements: [evenement({ date: '2026-09-12T22:30:00.000Z' })],
      vuJusqua: null,
      duNeuf: true,
    });
    render(<JournalDossier />);
    // 00:30 à Paris le 13 : c'est le 13 qui doit s'afficher, pas le 12.
    await waitFor(() => expect(screen.getByText('13 septembre 2026')).toBeTruthy());
  });

  it('AUCUN DÉCOMPTE DANS LE TITRE — contrairement au bloc qu’il remplace', async () => {
    stubJournal({
      ok: true,
      evenements: [evenement({ cle: 'a' }), evenement({ cle: 'b' }), evenement({ cle: 'c' })],
      vuJusqua: null,
      duNeuf: true,
    });
    render(<JournalDossier />);
    const titre = await screen.findByText(/Ce qui s.est passé dans votre dossier/);
    expect(titre.textContent).not.toMatch(/[0-9]/);
  });

  it('DÉPLIÉ s’il y a du neuf, REPLIÉ sinon', async () => {
    stubJournal({ ok: true, evenements: [evenement()], vuJusqua: null, duNeuf: true });
    const { unmount } = render(<JournalDossier />);
    await waitFor(() =>
      expect((screen.getByTestId('journal-dossier') as HTMLDetailsElement).open).toBe(true),
    );
    unmount();
    cleanup();

    stubJournal({
      ok: true,
      evenements: [evenement()],
      vuJusqua: '2026-12-31T10:00:00.000Z',
      duNeuf: false,
    });
    render(<JournalDossier />);
    await waitFor(() =>
      expect((screen.getByTestId('journal-dossier') as HTMLDetailsElement).open).toBe(false),
    );
  });
});

describe('JournalDossier — le filet du bloc d’avant', () => {
  it('DRAPEAU ÉTEINT : « Depuis votre dernière visite » reprend sa place', async () => {
    // Retirer l'ancien bloc avant la mise en service enlèverait au patient le
    // peu qu'il a.
    stubJournal({ ok: false, reason: 'ferme', error: 'Cette page n’est pas disponible.' }, 503);
    render(<JournalDossier fallback={<p>Depuis votre dernière visite</p>} />);
    await waitFor(() => expect(screen.getByText('Depuis votre dernière visite')).toBeTruthy());
    expect(screen.queryByTestId('journal-dossier')).toBeNull();
  });

  it('un échec réseau rend aussi le filet, sans rien annoncer', async () => {
    fetchMock.mockRejectedValue(new Error('réseau'));
    render(<JournalDossier fallback={<p>Depuis votre dernière visite</p>} />);
    await waitFor(() => expect(screen.getByText('Depuis votre dernière visite')).toBeTruthy());
  });

  it('EN VOL, ON N’AFFIRME RIEN — ni le journal, ni le bloc d’avant', async () => {
    // Montrer le repli pour le remplacer une seconde plus tard ferait sauter la
    // page sous les yeux du patient.
    fetchMock.mockImplementation(() => new Promise(() => {}));
    const { container } = render(<JournalDossier fallback={<p>Depuis votre dernière visite</p>} />);
    expect(container.innerHTML).toBe('');
  });
});

describe('JournalDossier — le repère de fraîcheur', () => {
  it('un journal DÉPLIÉ signale qu’il a été vu', async () => {
    // Le signal passe par `onToggle`, chemin unique : la spécification HTML
    // fait naître un `toggle` chaque fois que l'attribut `open` est posé — y
    // compris par React au premier rendu. Un effet de montage l'aurait doublé
    // sans rien ajouter, et aucune mutation n'aurait pu le tuer.
    stubJournal({ ok: true, evenements: [evenement()], vuJusqua: null, duNeuf: true });
    render(<JournalDossier />);
    await waitFor(() => expect(screen.getByTestId('journal-dossier')).toBeTruthy());
    expect(fetchMock.mock.calls.filter(a => a[1]?.method === 'POST')).toHaveLength(1);
  });

  it('UN JOURNAL REPLIÉ NE SIGNALE RIEN — il n’a pas été lu', async () => {
    // Avancer le repère au chargement le viderait de son sens : le patient
    // n'aurait rien lu et le portail dirait qu'il a tout vu.
    stubJournal({
      ok: true,
      evenements: [evenement()],
      vuJusqua: '2026-12-31T10:00:00.000Z',
      duNeuf: false,
    });
    render(<JournalDossier />);
    await waitFor(() => expect(screen.getByTestId('journal-dossier')).toBeTruthy());
    expect(fetchMock.mock.calls.filter(a => a[1]?.method === 'POST')).toHaveLength(0);
  });

  it('UNE SEULE FOIS PAR MONTAGE — replier puis redéplier n’est pas une seconde lecture', async () => {
    stubJournal({ ok: true, evenements: [evenement()], vuJusqua: null, duNeuf: true });
    render(<JournalDossier />);
    const bloc = (await screen.findByTestId('journal-dossier')) as HTMLDetailsElement;
    await waitFor(() =>
      expect(fetchMock.mock.calls.filter(a => a[1]?.method === 'POST')).toHaveLength(1),
    );
    bloc.open = false;
    bloc.dispatchEvent(new Event('toggle', { bubbles: true }));
    bloc.open = true;
    bloc.dispatchEvent(new Event('toggle', { bubbles: true }));
    expect(fetchMock.mock.calls.filter(a => a[1]?.method === 'POST')).toHaveLength(1);
  });

  it('DRAPEAU ÉTEINT : aucun repère n’est avancé', async () => {
    stubJournal({ ok: false, reason: 'ferme', error: 'fermé' }, 503);
    render(<JournalDossier fallback={<p>filet</p>} />);
    await waitFor(() => expect(screen.getByText('filet')).toBeTruthy());
    expect(fetchMock.mock.calls.filter(a => a[1]?.method === 'POST')).toHaveLength(0);
  });
});
