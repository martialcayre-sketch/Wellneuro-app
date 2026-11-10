// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProtocolCheckinForm } from './ProtocolCheckinForm';

// UNE LECTURE EN ÉCHEC N'EST PAS UNE ATTENTE (étape 1 de la refonte Lien,
// constat C2, 2026-11-11) : une coupure réseau ou un refus du serveur
// prenaient la phrase « Votre suivi commencera… », sans reprise possible.

const ATTENTE = /Votre suivi commencera/;

function fetchSuivi(...reponses: Array<() => Promise<unknown>>) {
  let i = 0;
  global.fetch = vi.fn(() => reponses[Math.min(i++, reponses.length - 1)]()) as unknown as typeof fetch;
}
const json = (corps: unknown) => () => Promise.resolve({ json: () => Promise.resolve(corps) } as Response);

afterEach(cleanup);

describe('ProtocolCheckinForm — chargement', () => {
  it('sans protocole diffusé, la phrase d’attente', async () => {
    fetchSuivi(json({ ok: true, protocoleDiffuse: false, pointEtapeOuvert: null, points: [] }));
    render(<ProtocolCheckinForm />);
    expect(await screen.findByText(ATTENTE)).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('une coupure réseau est une erreur, avec reprise', async () => {
    fetchSuivi(
      () => Promise.reject(new Error('offline')),
      json({ ok: true, protocoleDiffuse: false, pointEtapeOuvert: null, points: [] }),
    );
    render(<ProtocolCheckinForm />);
    expect((await screen.findByRole('alert')).textContent).toContain('Erreur réseau. Réessayez.');
    expect(screen.queryByText(ATTENTE)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Réessayer' }));
    expect(await screen.findByText(ATTENTE)).toBeTruthy();
  });

  it('un refus du serveur montre son message, pas la phrase d’attente', async () => {
    fetchSuivi(json({ ok: false, reason: 'exception', error: 'Erreur technique.' }));
    render(<ProtocolCheckinForm />);
    expect((await screen.findByRole('alert')).textContent).toContain('Erreur technique.');
    expect(screen.queryByText(ATTENTE)).toBeNull();
  });
});
