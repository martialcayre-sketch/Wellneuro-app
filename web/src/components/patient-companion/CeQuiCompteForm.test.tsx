// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CeQuiCompteForm } from './CeQuiCompteForm';

const fetchMock = vi.fn();

const json = (payload: unknown, ok = true) => ({ ok, json: async () => payload });

const TEXTE = 'Ce qui compte pour moi, c’est de tenir debout jusqu’au soir.';

function champTexte(): HTMLTextAreaElement {
  return screen.getByLabelText('Ce que je veux dire') as HTMLTextAreaElement;
}

function ecrire(valeur: string): void {
  fireEvent.change(champTexte(), { target: { value: valeur } });
}

function envoyer(): void {
  fireEvent.click(screen.getByText('Envoyer'));
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('CeQuiCompteForm — dépôt', () => {
  it('poste le texte sans AUCUN identifiant côté client (cookie implicite)', async () => {
    fetchMock.mockResolvedValue(json({ ok: true, entree: { id: 'ENT_1' } }, true));
    render(<CeQuiCompteForm />);
    ecrire(TEXTE);
    envoyer();

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [url, options] = fetchMock.mock.calls[0] as [string, { method: string; body: string }];
    expect(url).toBe('/api/portail/ce-qui-compte');
    expect(options.method).toBe('POST');
    const corps = JSON.parse(options.body) as Record<string, unknown>;
    // L'identité vient de la session : rien d'identifiant ne part d'ici.
    expect(Object.keys(corps).sort()).toEqual(['saisiLe', 'texte']);
    expect(corps.texte).toBe(TEXTE);
    expect(corps.saisiLe).toBeNull();
  });

  it('transmet la date déclarée quand elle est saisie', async () => {
    fetchMock.mockResolvedValue(json({ ok: true, entree: { id: 'ENT_1' } }, true));
    render(<CeQuiCompteForm />);
    ecrire(TEXTE);
    fireEvent.change(screen.getByLabelText('Date à laquelle cela vous concerne'), {
      target: { value: '2026-08-20' },
    });
    envoyer();

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const corps = JSON.parse((fetchMock.mock.calls[0][1] as { body: string }).body) as { saisiLe: string };
    expect(corps.saisiLe).toBe('2026-08-20');
  });

  it('succès : accusé de dépôt, et le champ repart vide', async () => {
    fetchMock.mockResolvedValue(json({ ok: true, entree: { id: 'ENT_1' } }, true));
    render(<CeQuiCompteForm />);
    ecrire(TEXTE);
    envoyer();

    await waitFor(() => expect(screen.getByText(/C’est enregistré/)).toBeTruthy());
    expect(champTexte().value).toBe('');
  });

  it('n’affiche aucun retour sur le CONTENU — ni note, ni catégorie, ni résumé', async () => {
    fetchMock.mockResolvedValue(json({ ok: true, entree: { id: 'ENT_1' } }, true));
    const { container } = render(<CeQuiCompteForm />);
    ecrire(TEXTE);
    envoyer();

    await waitFor(() => expect(screen.getByText(/C’est enregistré/)).toBeTruthy());
    expect(container.textContent).not.toMatch(/score|niveau|catégorie|tendance|moyenne|résumé/i);
  });
});

describe('CeQuiCompteForm — la parole n’est jamais perdue', () => {
  it('ERREUR SERVEUR (401) : le message s’affiche et LE TEXTE EST CONSERVÉ', async () => {
    fetchMock.mockResolvedValue(
      json({ ok: false, reason: 'unauthenticated', error: 'Session expirée. Reconnectez-vous.' }, false),
    );
    render(<CeQuiCompteForm />);
    ecrire(TEXTE);
    envoyer();

    await waitFor(() => expect(screen.getByText('Session expirée. Reconnectez-vous.')).toBeTruthy());
    // La session dure 12 h : un 401 peut tomber sur un texte tout juste
    // rédigé. Ce n'est pas une suite de clics à refaire, c'est une parole.
    expect(champTexte().value).toBe(TEXTE);
  });

  it('ERREUR RÉSEAU : même verdict, le texte reste à l’écran', async () => {
    fetchMock.mockRejectedValue(new Error('réseau'));
    render(<CeQuiCompteForm />);
    ecrire(TEXTE);
    envoyer();

    await waitFor(() => expect(screen.getByText(/Erreur réseau/)).toBeTruthy());
    expect(champTexte().value).toBe(TEXTE);
  });

  it('refus de longueur : le texte est conservé, JAMAIS tronqué par l’écran', async () => {
    fetchMock.mockResolvedValue(
      json({ ok: false, reason: 'texte_trop_long', error: 'Ce texte est trop long.' }, false),
    );
    render(<CeQuiCompteForm />);
    const long = 'a'.repeat(3999);
    ecrire(long);
    envoyer();

    await waitFor(() => expect(screen.getByText('Ce texte est trop long.')).toBeTruthy());
    expect(champTexte().value).toBe(long);
    expect(champTexte().value).toHaveLength(3999);
  });

  it('champ vide : l’envoi est désactivé, aucun appel réseau', () => {
    render(<CeQuiCompteForm />);
    expect((screen.getByText('Envoyer') as HTMLButtonElement).disabled).toBe(true);
    ecrire('    ');
    expect((screen.getByText('Envoyer') as HTMLButtonElement).disabled).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
