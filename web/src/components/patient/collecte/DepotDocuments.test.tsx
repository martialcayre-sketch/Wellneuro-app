// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const { replace, routeur } = vi.hoisted(() => {
  const replace = vi.fn();
  return { replace, routeur: { replace } };
});
vi.mock('next/navigation', () => ({ useRouter: () => routeur }));

import { DepotDocuments } from './DepotDocuments';
import { BLOCS_COLLECTE_G11 } from './textesDepot';

// L'écran de dépôt ([[D-330]]) : l'encart d'urgence du dépôt est là quoi
// qu'il arrive ([[D-293]] §3), le texte de collecte de G-11 suit, et le dépôt
// envoie la catégorie et le fichier — rien d'autre.

const PHRASE_ENCART =
  'Vos documents sont transmis à votre praticien, mais il ne les lit pas en temps réel : n’attendez pas sa réponse.';

const PRET = {
  ok: true,
  documents: [
    { deposeLe: '2026-10-08T08:00:00.000Z', categorie: 'courrier', retireLe: null },
    { deposeLe: '2026-10-07T08:00:00.000Z', categorie: 'autre', retireLe: '2026-10-09T08:00:00.000Z' },
  ],
  dossierOuvert: true,
  statutAge: 'majeur',
  plafond: null,
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  replace.mockReset();
});

describe('DepotDocuments', () => {
  it('l’encart d’urgence du dépôt et le texte de G-11 sont rendus dès le chargement', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => undefined)));
    render(<DepotDocuments token="TOK" />);
    expect(screen.getByRole('note', { name: 'Besoin d’aide maintenant ?' })).toBeTruthy();
    expect(screen.getByText(PHRASE_ENCART)).toBeTruthy();
    for (const bloc of BLOCS_COLLECTE_G11) expect(screen.getByText(bloc.texte)).toBeTruthy();
  });

  it('une panne de la route laisse l’encart en place', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ ok: false, error: 'Erreur technique.' }), { status: 500 })));
    render(<DepotDocuments token="TOK" />);
    await screen.findByText('Erreur technique.');
    expect(screen.getByText(PHRASE_ENCART)).toBeTruthy();
  });

  it('liste ses dépôts : date, catégorie proposée, retrait', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(PRET), { status: 200 })));
    render(<DepotDocuments token="TOK" />);
    expect(await screen.findByText('Déposé le 8 octobre 2026 — Courrier')).toBeTruthy();
    expect(screen.getByText('Déposé le 7 octobre 2026 — Autre · retiré le 9 octobre 2026')).toBeTruthy();
  });

  it('dépose la catégorie choisie et le fichier', async () => {
    const appels: { url: string; init?: RequestInit }[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        appels.push({ url, init });
        return init?.method === 'POST'
          ? new Response(JSON.stringify({ ok: true }), { status: 201 })
          : new Response(JSON.stringify(PRET), { status: 200 });
      }),
    );
    render(<DepotDocuments token="TOK" />);
    fireEvent.click(await screen.findByLabelText('Liste de traitements ou de compléments'));
    const fichier = new File(['%PDF-1.7'], 'document.pdf', { type: 'application/pdf' });
    fireEvent.change(screen.getByLabelText(/Le document : un PDF/), { target: { files: [fichier] } });
    fireEvent.click(screen.getByRole('button', { name: 'Déposer le document' }));
    await screen.findByText('Votre document est déposé dans votre dossier.');
    const post = appels.find(a => a.init?.method === 'POST');
    const corps = post?.init?.body as FormData;
    expect(post?.url).toBe('/api/portail/documents');
    expect(corps.get('categorie')).toBe('traitements_complements');
    expect(corps.get('fichier')).toBeInstanceOf(File);
    expect([...corps.keys()].sort()).toEqual(['categorie', 'fichier']);
    // Le nom du fichier choisi ne part pas sur le réseau.
    expect((corps.get('fichier') as File).name).toBe('document');
  });

  it('sans catégorie : rien n’est envoyé', async () => {
    const espion = vi.fn(async () => new Response(JSON.stringify(PRET), { status: 200 }));
    vi.stubGlobal('fetch', espion);
    render(<DepotDocuments token="TOK" />);
    await screen.findByText(/Déposé le 8 octobre/);
    const fichier = new File(['%PDF-1.7'], 'document.pdf', { type: 'application/pdf' });
    fireEvent.change(screen.getByLabelText(/Le document : un PDF/), { target: { files: [fichier] } });
    fireEvent.click(screen.getByRole('button', { name: 'Déposer le document' }));
    await screen.findByText('Indiquez ce que contient le document.');
    expect(espion.mock.calls.every(c => (c as unknown[])[1] === undefined || ((c as unknown[])[1] as RequestInit).method !== 'POST')).toBe(true);
  });

  it.each([
    [{ dossierOuvert: false }, 'Votre suivi est clôturé : vous ne pouvez plus déposer de document.'],
    [{ plafond: 'plafond_non_consultes' }, 'Vous ne pouvez pas déposer d’autre document pour le moment. Réessayez plus tard.'],
    [{ statutAge: 'mineur' }, /Votre praticien reprendra contact avec vous/],
  ])('dépôt fermé (%o) : le formulaire n’est pas rendu', async (etat, message) => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ ...PRET, ...etat }), { status: 200 })));
    render(<DepotDocuments token="TOK" />);
    expect(await screen.findByText(message)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Déposer le document' })).toBeNull();
  });

  it('date de naissance manquante : l’écran de la date, et l’encart d’urgence reste', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ ...PRET, statutAge: 'date_manquante' }), { status: 200 })));
    render(<DepotDocuments token="TOK" />);
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Déposer le document' })).toBeNull());
    await waitFor(() => expect(screen.queryByText('Chargement…')).toBeNull());
    expect(screen.getByRole('note', { name: 'Besoin d’aide maintenant ?' })).toBeTruthy();
    expect(screen.getByText(PHRASE_ENCART)).toBeTruthy();
  });

  it('401 : retour au portail', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 401 })));
    render(<DepotDocuments token="TOK" />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/portail/TOK'));
  });
});
