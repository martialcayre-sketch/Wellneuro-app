// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import { ComptesCabinetPanel, LIBELLES_ETAPES } from './ComptesCabinetPanel';
import type { ComptesCabinet, LigneComptes } from '@/lib/praticien/comptesCabinet';

// Le panneau importe les TYPES du chargeur, jamais le chargeur : l'agrégat se
// reconstruit ici à la main, comme la route le sert.

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const ORDRE_ETAPES = [
  'patient', 'donnees', 'comprehension', 'decision', 'actions', 'suivi', 'reevaluation', 'rien_n_attend', 'indetermine',
] as const;
const ORDRE_PROTOCOLE = ['sans_protocole', 'cycle_en_cours', 'fin_de_cycle', 'indetermine'] as const;

function comptes(lignes: LigneComptes[], masque: boolean): ComptesCabinet {
  const compter = <K extends string>(ordre: readonly K[], valeurs: K[]) =>
    ordre.map(cle => ({ cle, compte: masque ? ('masqué' as const) : valeurs.filter(v => v === cle).length }));
  return {
    prochaineEtape: { effectif: lignes.length, repartitionMasquee: masque, lignes: compter(ORDRE_ETAPES, lignes.map(l => l.etape)) },
    protocole: { effectif: lignes.length, repartitionMasquee: masque, lignes: compter(ORDRE_PROTOCOLE, lignes.map(l => l.protocole)) },
  };
}

function stub(reponse: Promise<unknown>) {
  const fetchMock = vi.fn(() => reponse);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const ok = (payload: unknown) => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(payload) });

describe('ComptesCabinetPanel (D-385)', () => {
  it('attend en le disant, puis ne lit qu’une route : celle des comptes', async () => {
    const fetchMock = stub(new Promise(() => {}));
    render(<ComptesCabinetPanel />);
    expect(screen.getByRole('status').textContent).toBe(
      'Comptage des dossiers en cours… Cela peut prendre quelques secondes.',
    );
    expect(fetchMock.mock.calls.map(c => String((c as unknown[])[0]))).toEqual(['/api/praticien/comptes-cabinet']);
  });

  it('trois dossiers : l’effectif s’affiche, chaque tableau dit pourquoi sa répartition est masquée', async () => {
    stub(ok({ ok: true, comptes: comptes(Array.from({ length: 3 }, () => ({ etape: 'decision', protocole: 'sans_protocole' })), true) }));
    render(<ComptesCabinetPanel />);
    await waitFor(() => expect(screen.getAllByText('Effectif : 3 dossiers')).toHaveLength(2));
    expect(screen.getAllByText('Répartition masquée (moins de cinq dossiers sur au moins une ligne).')).toHaveLength(2);
    const etape = screen.getByRole('table', { name: 'Prochaine étape' });
    const protocole = screen.getByRole('table', { name: 'Protocole' });
    expect(within(etape).getAllByText('masqué')).toHaveLength(9);
    expect(within(protocole).getAllByText('masqué')).toHaveLength(4);
    // Aucun chiffre de répartition ne passe : seul l'effectif porte un nombre.
    expect(within(etape).queryByText(/^\d+$/)).toBeNull();
  });

  it('répartition affichée : libellés validés, zéros compris, et la note sur « Indéterminé »', async () => {
    const lignes: LigneComptes[] = [
      ...Array.from({ length: 5 }, () => ({ etape: 'decision', protocole: 'sans_protocole' }) as const),
      ...Array.from({ length: 6 }, () => ({ etape: 'rien_n_attend', protocole: 'fin_de_cycle' }) as const),
    ];
    stub(ok({ ok: true, comptes: comptes(lignes, false) }));
    render(<ComptesCabinetPanel />);
    await waitFor(() => expect(screen.getAllByText('Effectif : 11 dossiers')).toHaveLength(2));
    expect(screen.queryByText(/Répartition masquée/)).toBeNull();
    expect(screen.getByText('Même calcul que « Prochaine étape » sur la fiche patient.')).toBeTruthy();
    const etape = screen.getByRole('table', { name: 'Prochaine étape' });
    const ligne = (table: HTMLElement, libelle: string) =>
      within(table).getByRole('rowheader', { name: libelle }).closest('tr')!.textContent;
    expect(ligne(etape, 'Décision 21 j')).toBe('Décision 21 j5');
    expect(ligne(etape, 'Rien n’attend')).toBe('Rien n’attend6');
    expect(ligne(etape, 'Patient')).toBe('Patient0');
    const protocole = screen.getByRole('table', { name: 'Protocole' });
    expect(ligne(protocole, 'Sans protocole diffusé')).toBe('Sans protocole diffusé5');
    expect(ligne(protocole, 'Protocole diffusé, cycle en cours')).toBe('Protocole diffusé, cycle en cours0');
    expect(ligne(protocole, 'À la fin de leur cycle')).toBe('À la fin de leur cycle6');
    expect(
      screen.getByText('Indéterminé : l’état du dossier n’a pas pu être établi. Il n’est compté nulle part ailleurs.'),
    ).toBeTruthy();
  });

  it('un seul dossier : « 1 dossier » au singulier', async () => {
    stub(ok({ ok: true, comptes: comptes([{ etape: 'patient', protocole: 'sans_protocole' }], true) }));
    render(<ComptesCabinetPanel />);
    await waitFor(() => expect(screen.getAllByText('Effectif : 1 dossier')).toHaveLength(2));
  });

  it('une erreur ne se déguise jamais en cabinet vide', async () => {
    stub(ok({ ok: false, reason: 'exception', error: 'Erreur technique.' }));
    render(<ComptesCabinetPanel />);
    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toBe(
        'Les comptes n’ont pas pu être établis (erreur technique ou session expirée). Aucun compte n’est affiché.',
      ),
    );
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('cabinet vide : le dire, sans tableau', async () => {
    stub(ok({ ok: true, comptes: comptes([], false) }));
    render(<ComptesCabinetPanel />);
    await waitFor(() => expect(screen.getByText('Aucun dossier dans le cabinet pour l’instant.')).toBeTruthy());
    expect(screen.queryByRole('table')).toBeNull();
  });

  // UN SEUL JEU DE LIBELLÉS DE PHASE : ceux du rail de la fiche. Le panneau ne
  // peut pas importer le composant de la fiche ; ce banc lit sa source.
  it('les sept libellés de phase sont ceux du rail de la fiche', () => {
    const fiche = readFileSync(path.resolve(__dirname, '../FichePatientPanel.tsx'), 'utf8');
    const rail = [...fiche.matchAll(/\{ id: '(\w+)', libelle: '([^']+)', runtime:/g)].map(([, id, libelle]) => [id, libelle]);
    expect(rail).toHaveLength(7);
    for (const [id, libelle] of rail) expect(LIBELLES_ETAPES[id as keyof typeof LIBELLES_ETAPES]).toBe(libelle);
  });
});
