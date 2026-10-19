// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { DocumentsDeposesPanel } from './DocumentsDeposesPanel';

// L'encart praticien de la collecte ([[D-330]]) : muet tant que la surface
// patient est fermée et que rien n'a été déposé ; sinon chaque document, son
// historique daté, et des gestes dont le retrait se confirme.

const DOC = {
  id: 'doc_1',
  typeMime: 'application/pdf',
  categorieProposee: 'autre',
  categorieCourante: 'courrier',
  classements: [{ categorie: 'courrier', classeLe: '2026-10-09T09:00:00.000Z' }],
  deposeLe: '2026-10-08T08:00:00.000Z',
  consulteLe: '2026-10-09T08:00:00.000Z',
  retireLe: null,
  motifRetrait: null,
};

function repondre(liste: unknown, geste: unknown = { ok: true }) {
  const espion = vi.fn(async (_url: string, init?: RequestInit) =>
    new Response(JSON.stringify(init?.method === 'POST' ? geste : liste), { status: 200 }),
  );
  vi.stubGlobal('fetch', espion);
  return espion;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('DocumentsDeposesPanel', () => {
  it('surface fermée et aucun dépôt : rien n’est rendu', async () => {
    const espion = repondre({ ok: true, ouvert: false, documents: [] });
    const { container } = render(<DocumentsDeposesPanel idPatient="PAT_SOPHIE" />);
    await waitFor(() => expect(espion).toHaveBeenCalled());
    await act(async () => {
      await Promise.resolve();
    });
    expect(container.textContent).toBe('');
  });

  it('surface ouverte, aucun dépôt : le dit', async () => {
    repondre({ ok: true, ouvert: true, documents: [] });
    render(<DocumentsDeposesPanel idPatient="PAT_SOPHIE" />);
    expect(await screen.findByText('Aucun document déposé par ce patient.')).toBeTruthy();
  });

  it('un document : catégorie courante, dates, historique, lien d’ouverture sans nom de fichier', async () => {
    repondre({ ok: true, ouvert: false, documents: [DOC] });
    render(<DocumentsDeposesPanel idPatient="PAT_SOPHIE" />);
    expect(await screen.findByText('Déposé le 08/10/2026')).toBeTruthy();
    expect(screen.getByText('Ouvert le 09/10/2026')).toBeTruthy();
    expect(screen.getByText('Proposée par le patient : Autre')).toBeTruthy();
    expect(screen.getByText('Corrigée le 09/10/2026 : Courrier')).toBeTruthy();
    const lien = screen.getByRole('link', { name: 'Ouvrir le document' });
    expect(lien.getAttribute('href')).toBe('/api/praticien/documents-deposes/contenu?idPatient=PAT_SOPHIE&idDocument=doc_1');
    expect(lien.getAttribute('rel')).toContain('noreferrer');
  });

  it('retrait : motif requis, puis confirmation, puis le geste', async () => {
    const espion = repondre({ ok: true, ouvert: true, documents: [DOC] });
    render(<DocumentsDeposesPanel idPatient="PAT_SOPHIE" />);
    const retirer = await screen.findByRole('button', { name: 'Retirer le document' });
    expect((retirer as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByLabelText('Demande de droit'));
    fireEvent.click(screen.getByRole('button', { name: 'Retirer le document' }));
    expect(espion.mock.calls.some(c => c[1]?.method === 'POST')).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer le retrait' }));
    await waitFor(() => expect(espion.mock.calls.some(c => c[1]?.method === 'POST')).toBe(true));
    const post = espion.mock.calls.find(c => c[1]?.method === 'POST');
    expect(JSON.parse(String(post?.[1]?.body))).toEqual({
      idPatient: 'PAT_SOPHIE',
      idDocument: 'doc_1',
      geste: 'retirer',
      motif: 'demande_droit',
    });
  });

  it('un document retiré : la ligne reste, datée et motivée, sans geste', async () => {
    repondre({ ok: true, ouvert: true, documents: [{ ...DOC, retireLe: '2026-10-10T08:00:00.000Z', motifRetrait: 'depot_par_erreur' }] });
    render(<DocumentsDeposesPanel idPatient="PAT_SOPHIE" />);
    expect(await screen.findByText('Retiré le 10/10/2026 — Déposé par erreur')).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Ouvrir le document' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Retirer le document' })).toBeNull();
  });

  it('une lecture en échec ne se rend pas comme une liste vide', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ ok: false }), { status: 500 })));
    render(<DocumentsDeposesPanel idPatient="PAT_SOPHIE" />);
    expect(await screen.findByText('Les documents déposés n’ont pas pu être lus.')).toBeTruthy();
  });
});
