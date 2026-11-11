// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ExclusionRechercheLotPanel } from './ExclusionRechercheLotPanel';

const fetchMock = vi.fn();

function ouvrirEtColler(texte: string) {
  fireEvent.click(screen.getByRole('button', { name: 'Traiter une liste' }));
  fireEvent.change(screen.getByLabelText('Liste à traiter'), { target: { value: texte } });
  fireEvent.click(screen.getByRole('button', { name: 'Vérifier la liste' }));
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('ExclusionRechercheLotPanel — coller, relire, confirmer ([[D-490]])', () => {
  it('montre l’aperçu, demande confirmation, puis envoie le sens et les motifs', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ ok: true, n: 1, inchanges: 1 }) });
    const onConclu = vi.fn();
    render(<ExclusionRechercheLotPanel onConclu={onConclu} />);
    ouvrirEtColler('WN-CL-0001-001 ; dossier A\nWN-CL-0001-002@v1.0 ; dossier B ; rang 2');

    expect(screen.getByText('2 claims lus')).toBeTruthy();
    expect(screen.getByText('dossier B ; rang 2')).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Exclure ces 2 claims' }));
    expect(fetchMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer l’exclusion' }));

    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toBe(
        '1 claim exclu de la recherche. 1 l’était déjà : laissé tel quel, sans nouvel acte.',
      ),
    );
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/praticien/corpus/claims/exclusion-recherche-lot');
    expect(JSON.parse(options.body)).toEqual({
      sens: 'exclure',
      lignes: [
        { claimId: 'WN-CL-0001-001', motif: 'dossier A' },
        { claimId: 'WN-CL-0001-002', versionClaim: 'v1.0', motif: 'dossier B ; rang 2' },
      ],
    });
    expect(onConclu).toHaveBeenCalledTimes(1);
  });

  it('rétablit quand ce sens est choisi', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ ok: true, n: 2, inchanges: 0 }) });
    render(<ExclusionRechercheLotPanel />);
    fireEvent.click(screen.getByRole('button', { name: 'Traiter une liste' }));
    fireEvent.click(screen.getByLabelText('Rétablir dans la recherche'));
    fireEvent.change(screen.getByLabelText('Liste à traiter'), {
      target: { value: 'WN-CL-0001-001 ; a\nWN-CL-0001-002 ; b' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Vérifier la liste' }));
    fireEvent.click(screen.getByRole('button', { name: 'Rétablir ces 2 claims' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer le rétablissement' }));
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('2 claims rétablis dans la recherche.'));
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).sens).toBe('retablir');
  });

  it('une ligne sans motif bloque l’envoi', () => {
    render(<ExclusionRechercheLotPanel />);
    ouvrirEtColler('WN-CL-0001-001 ; dossier A\nWN-CL-0001-002 ;  ');
    expect(screen.getByRole('alert').textContent).toContain('Ligne 2');
    expect(screen.queryByRole('button', { name: /^Exclure ce/ })).toBeNull();
  });

  it('la confirmation reçoit le focus', () => {
    render(<ExclusionRechercheLotPanel />);
    ouvrirEtColler('WN-CL-0001-001 ; dossier A');
    fireEvent.click(screen.getByRole('button', { name: 'Exclure ce claim' }));
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Confirmer l’exclusion' }));
  });

  it('un refus de la base nomme les claims en cause', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({
        ok: false,
        reason: 'claims_refuses',
        error: 'Des claims ne peuvent pas recevoir ce geste : rien n’a été écrit.',
        refus: [{ claimId: 'WN-CL-0001-001', raison: 'claim_non_valide' }],
      }),
    });
    render(<ExclusionRechercheLotPanel />);
    ouvrirEtColler('WN-CL-0001-001 ; dossier A');
    fireEvent.click(screen.getByRole('button', { name: 'Exclure ce claim' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer l’exclusion' }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('WN-CL-0001-001 : pas validé'));
  });

  it('une réponse illisible annonce un résultat inconnu, pas un échec, et fait relire la file', async () => {
    fetchMock.mockResolvedValue({ ok: false, json: async () => { throw new SyntaxError('html'); } });
    const onConclu = vi.fn();
    render(<ExclusionRechercheLotPanel onConclu={onConclu} />);
    ouvrirEtColler('WN-CL-0001-001 ; dossier A');
    fireEvent.click(screen.getByRole('button', { name: 'Exclure ce claim' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer l’exclusion' }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Résultat inconnu'));
    // Le lot a pu être écrit : la file est relue, l'aperçu reste affiché.
    expect(onConclu).toHaveBeenCalledTimes(1);
    expect(screen.getByText('1 claim lu')).toBeTruthy();
  });
});
