// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PatientFoodCompassProtocolSection } from './PatientFoodCompassProtocolSection';
import { PatientFoodCompassSummary } from './PatientFoodCompassSummary';
import { PatientFoodCompassZoom } from './PatientFoodCompassZoom';

const view = {
  foodRef: '26034', foodLabel: 'Sardine',
  qualitativeSummary: 'Cet aliment fait partie de l’action relue avec votre praticien.',
  reasons: ['Cette lecture est reliée à la priorité choisie pour votre protocole.'],
  sourceLabel: 'Table Ciqual, Anses',
  limitations: ['Cette lecture accompagne votre protocole et ne remplace pas vos échanges.'],
  alternative: null,
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('Jardin patient C5', () => {
  it('affiche un résumé qualitatif avec un zoom profond, sans score', () => {
    render(<PatientFoodCompassSummary token="TOK" items={[view]} />);
    expect(screen.getByRole('heading', { name: 'Ma Boussole alimentaire' })).toBeTruthy();
    const link = screen.getByRole('link', { name: 'Comprendre cette lecture' });
    expect(link.getAttribute('href')).toBe('/portail/TOK/alimentation/boussole/26034');
    expect(document.body.textContent).not.toMatch(/score|classement|\/\s*100|%/i);
  });

  it('charge le même résumé depuis le protocole actif sur la page alimentation', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, protocoleDiffuse: true, vue: { boussoles: [view] } }),
    }));
    render(<PatientFoodCompassProtocolSection token="TOK" />);
    expect(await screen.findByText('Sardine')).toBeTruthy();
  });

  it('efface la lecture précédente quand le suivi patient change', async () => {
    const pending = new Promise(() => undefined);
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, protocoleDiffuse: true, vue: { boussoles: [view] } }),
      })
      .mockReturnValueOnce(pending);
    vi.stubGlobal('fetch', fetchMock);
    const rendered = render(<PatientFoodCompassProtocolSection token="TOK_A" />);
    expect(await screen.findByText('Sardine')).toBeTruthy();

    rendered.rerender(<PatientFoodCompassProtocolSection token="TOK_B" />);
    await waitFor(() => expect(screen.queryByText('Sardine')).toBeNull());
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('affiche les raisons, limites et source dans le zoom sans valeur intrinsèque', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true, view }) }));
    render(<PatientFoodCompassZoom foodRef="26034" />);
    expect(await screen.findByRole('heading', { name: 'Sardine' })).toBeTruthy();
    expect(screen.getByText('Pourquoi cette lecture ?')).toBeTruthy();
    expect(screen.getByText('À garder en tête')).toBeTruthy();
    expect(screen.getByText(/Table Ciqual, Anses/)).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/score|classement|\/\s*100|%/i);
  });

  it('ne révèle aucun détail quand la route répond 404', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false, json: async () => ({ ok: false, reason: 'not_found' }),
    }));
    render(<PatientFoodCompassZoom foodRef="99999" />);
    expect(await screen.findByText(/n’est pas disponible/)).toBeTruthy();
    expect(screen.queryByText('Sardine')).toBeNull();
  });
});
