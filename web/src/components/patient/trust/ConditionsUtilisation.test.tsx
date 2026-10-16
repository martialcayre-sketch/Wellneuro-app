// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AccueilConditions } from './ConditionsUtilisation';

// L'accueil des conditions d'utilisation ([[D-292]] §3) : le texte en vigueur
// et un bouton. L'accusé se pose au CLIC, par un POST — jamais à l'affichage,
// et aucune trace `presente` : un scanner de liens qui ouvre la page ne doit
// rien écrire.

function serveur(reponse: { status: number; body: Record<string, unknown> } = { status: 200, body: { ok: true } }) {
  const fetchMock = vi.fn(
    async () => ({ ok: reponse.status < 300, status: reponse.status, json: async () => reponse.body }) as Response,
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('AccueilConditions', () => {
  it('présente les cinq parties sans rien écrire, puis accuse les conditions au clic', async () => {
    const fetchMock = serveur();
    const onDone = vi.fn();
    render(<AccueilConditions onDone={onDone} />);
    expect(screen.getByText('Conditions d’utilisation de votre espace Wellneuro')).toBeTruthy();
    for (const partie of [
      'Le cadre de votre accompagnement',
      'Limites et sécurité médicale',
      'Vos données personnelles et leur confidentialité',
      'L’intelligence artificielle',
      'Quand ces conditions changent',
    ]) {
      expect(screen.getByRole('heading', { name: partie })).toBeTruthy();
    }
    expect(fetchMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'J’en ai pris connaissance' }));
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/portail/trust/lecture');
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual({ documentKey: 'conditions_utilisation', type: 'pris_connaissance' });
  });

  it('un refus de la route se dit, et l’accueil reste', async () => {
    serveur({ status: 400, body: { ok: false } });
    const onDone = vi.fn();
    render(<AccueilConditions onDone={onDone} />);
    fireEvent.click(screen.getByRole('button', { name: 'J’en ai pris connaissance' }));
    expect(await screen.findByText('Votre lecture n’a pas pu être enregistrée. Réessayez.')).toBeTruthy();
    expect(onDone).not.toHaveBeenCalled();
  });
});
