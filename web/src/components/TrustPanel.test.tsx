// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TrustPanel } from './TrustPanel';

// D-295 §3 — une demande de droit porte un champ « Réponse envoyée » ; le
// refus du serveur (« Traité » sans réponse) s'affiche au lieu d'être ignoré.

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

const DEMANDE = {
  kind: 'demande_droit', id: 'd1', idPatient: 'p1', patient: 'Sophie Nicola',
  resume: "Demande d'exercice de droit — acces", detail: '', statutTraitement: 'en_cours',
  soumisLe: '2026-10-14T08:00:00.000Z', examineLe: null, reponse: null,
};
const INCIDENT = {
  kind: 'incident_confidentialite', id: 'i1', idPatient: 'p2', patient: 'Michel Dogné',
  resume: 'Incident de confidentialité — autre', detail: 'Description', statutTraitement: 'recu',
  soumisLe: '2026-10-13T08:00:00.000Z', examineLe: null,
};
const REFUS = 'Une réponse écrite est requise avant de passer une demande de droit à « Traité ».';

let corpsPatch: Record<string, unknown> | null = null;

beforeEach(() => {
  corpsPatch = null;
  global.fetch = vi.fn((_url: string | URL | Request, init?: RequestInit) => {
    if (init?.method === 'PATCH') {
      corpsPatch = JSON.parse(String(init.body));
      const accepte = Boolean(String(corpsPatch?.reponse ?? '').trim()) || corpsPatch?.statutTraitement !== 'traite';
      return Promise.resolve({
        ok: accepte,
        json: () => Promise.resolve(accepte ? { ok: true } : { ok: false, error: REFUS }),
      } as Response);
    }
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ ok: true, signalements: [DEMANDE, INCIDENT], nonTraites: 2 }),
    } as Response);
  }) as unknown as typeof fetch;
});
afterEach(cleanup);

describe('TrustPanel — réponse à une demande de droit (D-295 §3)', () => {
  it('le champ de réponse ne paraît que sur la demande de droit', async () => {
    render(<TrustPanel />);
    await screen.findByText(/Demande d'exercice de droit/);
    expect(screen.getAllByLabelText(/Réponse envoyée au patient/)).toHaveLength(1);
  });

  it('affiche le refus du serveur quand « Traité » est choisi sans réponse', async () => {
    render(<TrustPanel />);
    await screen.findByText(/Demande d'exercice de droit/);
    fireEvent.change(screen.getAllByLabelText('Statut de traitement')[0], { target: { value: 'traite' } });
    expect((await screen.findByRole('alert')).textContent).toBe(REFUS);
    expect(corpsPatch).toMatchObject({ kind: 'demande_droit', statutTraitement: 'traite' });
    expect(corpsPatch).not.toHaveProperty('reponse');
  });

  it("ne renvoie pas la réponse chargée quand elle n'a pas été modifiée ici", async () => {
    const dejaRepondue = { ...DEMANDE, reponse: 'Réponse enregistrée ailleurs.' };
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation((_url: string | URL | Request, init?: RequestInit) => {
      if (init?.method === 'PATCH') {
        corpsPatch = JSON.parse(String(init.body));
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true }) } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ ok: true, signalements: [dejaRepondue], nonTraites: 1 }),
      } as Response);
    });
    render(<TrustPanel />);
    expect(((await screen.findByLabelText(/Réponse envoyée au patient/)) as HTMLTextAreaElement).value)
      .toBe('Réponse enregistrée ailleurs.');
    fireEvent.change(screen.getByLabelText('Statut de traitement'), { target: { value: 'traite' } });
    await waitFor(() => expect(corpsPatch).toMatchObject({ statutTraitement: 'traite' }));
    expect(corpsPatch).not.toHaveProperty('reponse');
  });

  it('envoie la réponse saisie avec le changement de statut', async () => {
    render(<TrustPanel />);
    await screen.findByText(/Demande d'exercice de droit/);
    fireEvent.change(screen.getByLabelText(/Réponse envoyée au patient/), { target: { value: 'Export envoyé.' } });
    fireEvent.change(screen.getAllByLabelText('Statut de traitement')[0], { target: { value: 'traite' } });
    await waitFor(() => expect(corpsPatch).toMatchObject({ statutTraitement: 'traite', reponse: 'Export envoyé.' }));
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it("n'envoie pas de réponse pour un autre signalement", async () => {
    render(<TrustPanel />);
    await screen.findByText(/Incident de confidentialité/);
    fireEvent.change(screen.getAllByLabelText('Statut de traitement')[1], { target: { value: 'en_cours' } });
    await waitFor(() => expect(corpsPatch).toMatchObject({ kind: 'incident_confidentialite' }));
    expect(corpsPatch).not.toHaveProperty('reponse');
  });
});
