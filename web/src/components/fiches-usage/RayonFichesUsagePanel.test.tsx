// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { RayonFichesUsage } from '@/lib/fiches-usage/lecture';
import { RayonFichesUsagePanel } from './RayonFichesUsagePanel';

// Identifiants et libellés synthétiques : aucun texte réel au dépôt (D-251 §4).
const LE = '2026-10-16T02:00:00.000Z';
const SHA = 'c'.repeat(64);

function rayon(signee: boolean): RayonFichesUsage {
  return {
    structure: { signee, empreinte: 'd'.repeat(64), fiches: 1, termes: 1 },
    fiches: [
      {
        ficheId: 'FU_BANC_A',
        declaree: true,
        population: 'POP_BANC',
        rubriquesAttendues: ['question', 'limites'],
        reference: null,
        versions: [
          { id: 'versionbanc0001', numero: 1, creeLe: LE, etat: { etat: 'retiree', rubriques: ['question'] } },
          { id: 'versionbanc0002', numero: 2, creeLe: LE, etat: { etat: 'a_valider', validees: 1, attendues: 2 } },
        ],
      },
      { ficheId: 'FU_BANC_HORS', declaree: false, population: null, rubriquesAttendues: [], reference: null, versions: [] },
    ],
    termes: [
      {
        termeId: 'HYP_BANC',
        nature: 'hypothese',
        declare: true,
        libelles: [
          { id: 'libellebanc001', numero: 1, libelle: 'Libellé synthétique.', libelleSha256: SHA, creeLe: LE, etat: { etat: 'a_valider' }, dernierActe: null, actes: [] },
        ],
      },
    ],
  };
}

function reponse(corps: unknown, status = 200) {
  return { ok: status < 400, status, json: async () => corps } as Response;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('RayonFichesUsagePanel (D-314 §3)', () => {
  it('structure non signée : le dit, montre les fiches hors structure, et n’offre aucune validation de libellé', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reponse({ ok: true, rayon: rayon(false) })));
    render(<RayonFichesUsagePanel />);
    expect(await screen.findByText(/n’est pas encore signée/)).toBeTruthy();
    const a = within(screen.getByTestId('fiche-usage-FU_BANC_A'));
    expect(a.getByText('v2 · À valider · 1/2 rubriques')).toBeTruthy();
    expect(a.getByRole('button', { name: 'Relire la v2' })).toBeTruthy();
    expect(within(screen.getByTestId('fiche-usage-FU_BANC_HORS')).getByText(/Non déclarée/)).toBeTruthy();
    const terme = within(screen.getByTestId('terme-HYP_BANC'));
    expect(terme.queryByRole('button', { name: 'Valider' })).toBeNull();
  });

  it('structure signée : valider un libellé poste son identifiant, son empreinte, son jeton et la déclaration', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(reponse({ ok: true, rayon: rayon(true) }))
      .mockResolvedValueOnce(reponse({ ok: true, acte: {}, etat: { etat: 'validee' } }))
      .mockResolvedValueOnce(reponse({ ok: true, rayon: rayon(true) }));
    vi.stubGlobal('fetch', fetchMock);
    render(<RayonFichesUsagePanel />);
    const terme = within(await screen.findByTestId('terme-HYP_BANC'));
    fireEvent.click(terme.getByRole('checkbox'));
    fireEvent.click(terme.getByRole('button', { name: 'Valider' }));
    fireEvent.click(terme.getByRole('button', { name: 'Confirmer la validation' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    const [url, init] = fetchMock.mock.calls[1];
    expect(url).toBe('/api/praticien/fiches-usage/libelles/actes');
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({
      idLibelle: 'libellebanc001',
      acte: 'validee',
      empreinteVue: SHA,
      dernierActeVu: null,
      relectureIntegrale: true,
    });
    expect(await screen.findByText('Libellé validé.')).toBeTruthy();
  });

  it('un échec de chargement se dit et se rejoue', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(reponse({ ok: false, reason: 'exception', error: 'Erreur technique.' }, 500))
      .mockResolvedValueOnce(reponse({ ok: true, rayon: rayon(false) }));
    vi.stubGlobal('fetch', fetchMock);
    render(<RayonFichesUsagePanel />);
    expect((await screen.findByRole('alert')).textContent).toContain('Erreur technique.');
    fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }));
    expect(await screen.findByTestId('fiche-usage-FU_BANC_A')).toBeTruthy();
  });
});
