// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PatientFoodCompassProtocolSection } from './PatientFoodCompassProtocolSection';
import { PatientFoodCompassSummary } from './PatientFoodCompassSummary';
import { PatientFoodCompassZoom } from './PatientFoodCompassZoom';
import { TEXTE_PAUSE_AVIS_RENDU, TEXTE_PAUSE_ELEMENT } from '@/lib/trust/pauseEffetIndesirable';

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

// EN PAUSE, JAMAIS MASQUÉE ([[D-281]] §2, arbitrage du 2026-10-16) : la lecture
// reste servie, marquée avec le texte signé de l'élément.
describe('Boussole d’un aliment en pause', () => {
  it('le résumé garde la lecture et la marque', () => {
    render(<PatientFoodCompassSummary token="TOK" items={[view]} enPause={[{ foodRef: '26034', texte: 'element' }]} />);
    expect(screen.getByText('Sardine')).toBeTruthy();
    expect(screen.getByText('En pause')).toBeTruthy();
    expect(screen.getByText(TEXTE_PAUSE_ELEMENT)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Comprendre cette lecture' })).toBeTruthy();
  });

  it('sans pause, aucune marque', () => {
    render(<PatientFoodCompassSummary token="TOK" items={[view]} enPause={[{ foodRef: '11111', texte: 'element' }]} />);
    expect(screen.queryByText('En pause')).toBeNull();
  });

  it('la page alimentation reprend la marque servie par le protocole', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true, protocoleDiffuse: true, vue: { boussoles: [view] },
        boussolesEnPause: [{ foodRef: '26034', texte: 'avis_rendu' }],
      }),
    }));
    render(<PatientFoodCompassProtocolSection token="TOK" />);
    expect(await screen.findByText(TEXTE_PAUSE_AVIS_RENDU)).toBeTruthy();
  });

  it('le zoom garde la lecture et la marque', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true, json: async () => ({ ok: true, view, pause: 'element' }),
    }));
    render(<PatientFoodCompassZoom foodRef="26034" />);
    expect(await screen.findByRole('heading', { name: 'Sardine' })).toBeTruthy();
    expect(screen.getByText('En pause')).toBeTruthy();
    expect(screen.getByText(TEXTE_PAUSE_ELEMENT)).toBeTruthy();
    expect(screen.getByText('Pourquoi cette lecture ?')).toBeTruthy();
  });
});
