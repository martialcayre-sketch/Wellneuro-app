// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { EtiquetageLotPanel } from './EtiquetageLotPanel';

const fetchMock = vi.fn();

function ouvrirEtColler(texte: string) {
  fireEvent.click(screen.getByRole('button', { name: 'Étiqueter une liste' }));
  fireEvent.change(screen.getByLabelText('Liste à étiqueter'), { target: { value: texte } });
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

describe('EtiquetageLotPanel — coller, relire, confirmer', () => {
  it('montre l’aperçu, demande confirmation, puis envoie les codes de rubrique', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ ok: true, n: 2 }) });
    const onConclu = vi.fn();
    render(<EtiquetageLotPanel onConclu={onConclu} />);
    ouvrirEtColler('WN-CL-0001-001 ; 2 ; Options\nWN-CL-0001-002 ; 2 ; Surveillance et arrêt');

    expect(screen.getByText('2 claims lus')).toBeTruthy();
    expect(screen.getByText('Surveillance et arrêt')).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Étiqueter ces 2 claims' }));
    expect(fetchMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer l’étiquetage' }));

    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('2 claims étiquetés.'));
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/praticien/corpus/claims/etiquetage-lot');
    expect(JSON.parse(options.body)).toEqual({
      lignes: [
        { claimId: 'WN-CL-0001-001', besoins: [2], rubrique: 'options' },
        { claimId: 'WN-CL-0001-002', besoins: [2], rubrique: 'surveillance_arret' },
      ],
    });
    expect(onConclu).toHaveBeenCalledTimes(1);
  });

  it('une ligne à corriger bloque l’envoi', () => {
    render(<EtiquetageLotPanel />);
    ouvrirEtColler('WN-CL-0001-001 ; 2 ; Options\nWN-CL-0001-002 ; 2 ; adressage');
    expect(screen.getByRole('alert').textContent).toContain('Ligne 2');
    expect(screen.queryByRole('button', { name: /^Étiqueter ce/ })).toBeNull();
  });

  it('une réponse illisible mène au message d’erreur technique', async () => {
    fetchMock.mockResolvedValue({ ok: false, json: async () => { throw new SyntaxError('html'); } });
    render(<EtiquetageLotPanel />);
    ouvrirEtColler('WN-CL-0001-001 ; 2 ; Options');
    fireEvent.click(screen.getByRole('button', { name: 'Étiqueter ce claim' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer l’étiquetage' }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Erreur technique'));
  });

  it('la confirmation reçoit le focus', () => {
    render(<EtiquetageLotPanel />);
    ouvrirEtColler('WN-CL-0001-001 ; 2 ; Options');
    fireEvent.click(screen.getByRole('button', { name: 'Étiqueter ce claim' }));
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Confirmer l’étiquetage' }));
  });

  it('un refus de la base nomme les claims en cause', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({
        ok: false,
        reason: 'claims_refuses',
        error: 'Des claims ne peuvent pas être étiquetés : rien n’a été écrit.',
        refus: [{ claimId: 'WN-CL-0001-001', raison: 'claim_non_valide' }],
      }),
    });
    render(<EtiquetageLotPanel />);
    ouvrirEtColler('WN-CL-0001-001 ; 2 ; Options');
    fireEvent.click(screen.getByRole('button', { name: 'Étiqueter ce claim' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmer l’étiquetage' }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('WN-CL-0001-001 : pas validé'));
  });
});
