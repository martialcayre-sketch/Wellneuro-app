// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { PatientPreview } from './PatientPreview';

// Dette t07b : l'aperçu montre aussi « Mon équilibre » (accueil et détail), lus
// par la route miroir praticien — jamais par la route patient, que le cockpit
// ne peut pas ouvrir, ni par `api/praticien/equilibre`, qui sert les niveaux
// de preuve.
const EQUILIBRE = {
  indiceGlobal: 60,
  momentum: null,
  trajectoire: [],
  besoins: [{ id: 1, libellePatient: 'Sommeil', strate: 'CORPS', couverture: 60 }],
};

function stubFetch() {
  const fetchMock = vi.fn((url: string) => Promise.resolve({
    ok: true,
    json: () => Promise.resolve(url.includes('/reponses')
      ? { ok: true, titre: 'Sommeil', dateReponse: '2026-07-01T00:00:00.000Z', statutReponses: 'verrouille' }
      : EQUILIBRE),
  }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('PatientPreview — « Mon équilibre » dans l’aperçu (t07b)', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('consultation → accueil → détail, par la route miroir praticien', async () => {
    const fetchMock = stubFetch();
    render(<PatientPreview patientId="PAT_1" assignationId="ASS_1" />);
    fireEvent.click(screen.getByRole('button', { name: /Voir ce que recevra le patient/ }));

    fireEvent.click(await screen.findByRole('button', { name: 'Voir Mon équilibre' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Voir le détail de mes 12 besoins' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));

    const urls = fetchMock.mock.calls.map(([url]) => url);
    expect(urls).toEqual([
      '/api/praticien/apercu-patient/reponses?id=ASS_1',
      '/api/praticien/apercu-patient/equilibre?id=ASS_1',
      '/api/praticien/apercu-patient/equilibre?id=ASS_1',
    ]);
    expect(urls.some(url => url.startsWith('/api/patient/'))).toBe(false);
  });

  it('l’aperçu reste en lecture seule : aucune demande de modification offerte', async () => {
    stubFetch();
    render(<PatientPreview patientId="PAT_1" assignationId="ASS_1" />);
    fireEvent.click(screen.getByRole('button', { name: /Voir ce que recevra le patient/ }));
    await screen.findByText('Aperçu praticien — vue identique à celle du patient.');
    expect(screen.queryByText(/Précisez ce que vous souhaitez corriger/)).toBeNull();
  });
});
