// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { DocumentsRemisPanel } from './DocumentsRemisPanel';

// L'encart « Documents remis » ([[D-297]] §5) : « Lu le … », « Lu, date non
// enregistrée » ou RIEN — jamais « non lu », jamais un compte.

function repondre(status: number, corps: unknown) {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(corps), { status })));
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const doc = (partiel: Record<string, unknown>) => ({
  espece: 'bilan',
  idObjet: 'env',
  libelle: 'Bilan',
  remisLe: '2026-10-01T08:00:00.000Z',
  lu: false,
  luLe: null,
  ...partiel,
});

describe('DocumentsRemisPanel', () => {
  it('rend la lecture de chaque version, et rien pour une version non ouverte', async () => {
    repondre(200, {
      ok: true,
      documents: [
        doc({ idObjet: 'a', libelle: 'Protocole', espece: 'protocole', lu: true, luLe: '2026-10-18' }),
        doc({ idObjet: 'b', libelle: 'Courrier pour le médecin', espece: 'lettre_adressage', lu: true, luLe: null }),
        doc({ idObjet: 'c', libelle: 'Bilan', lu: false }),
      ],
    });
    render(<DocumentsRemisPanel idPatient="PAT_TEST" />);

    expect(await screen.findByText('Lu le 18/10/2026')).toBeTruthy();
    expect(screen.getByText('Lu, date non enregistrée')).toBeTruthy();
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(items[2].textContent).toBe('BilanRemis le 01/10/2026');
    expect(document.body.textContent).not.toMatch(/non lu|pas lu|jamais ouvert|\d+ document/i);
  });

  it('appelle la route du dossier', async () => {
    repondre(200, { ok: true, documents: [] });
    render(<DocumentsRemisPanel idPatient="PAT_TEST" />);
    await screen.findByText('Aucun document remis à ce patient.');
    expect(fetch).toHaveBeenCalledWith('/api/praticien/documents-remis?idPatient=PAT_TEST');
  });

  it('une lecture en échec ne se rend jamais comme une liste vide', async () => {
    repondre(500, { ok: false, reason: 'exception', error: 'x' });
    render(<DocumentsRemisPanel idPatient="PAT_TEST" />);
    expect((await screen.findByRole('alert')).textContent).toContain('n’ont pas pu être lus');
    expect(screen.queryByText('Aucun document remis à ce patient.')).toBeNull();
  });
});
