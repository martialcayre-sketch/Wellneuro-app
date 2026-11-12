// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TrustPanel } from './TrustPanel';

// D-295 §3 — une demande de droit porte un champ « Réponse envoyée » ; le
// refus du serveur (« Traité » sans réponse) s'affiche au lieu d'être ignoré.

vi.mock('next/link', () => ({
  default: ({ children, href, id, 'aria-current': courant }: {
    children: React.ReactNode; href: string; id?: string; 'aria-current'?: 'true';
  }) => <a href={href} id={id} aria-current={courant}>{children}</a>,
}));

// Le dépôt choisi vit dans l'adresse (`?depot=`, PRA-2b) : le test le pose.
let depot: string | null = null;
vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard/droits',
  useSearchParams: () => new URLSearchParams(depot ? `depot=${depot}` : ''),
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
  depot = null;
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
    await screen.findAllByText(/Demande d'exercice de droit/);
    expect(screen.getAllByLabelText(/Réponse envoyée au patient/)).toHaveLength(1);
  });

  it('affiche le refus du serveur quand « Traité » est choisi sans réponse', async () => {
    render(<TrustPanel />);
    await screen.findAllByText(/Demande d'exercice de droit/);
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
    await screen.findAllByText(/Demande d'exercice de droit/);
    fireEvent.change(screen.getByLabelText(/Réponse envoyée au patient/), { target: { value: 'Export envoyé.' } });
    fireEvent.change(screen.getAllByLabelText('Statut de traitement')[0], { target: { value: 'traite' } });
    await waitFor(() => expect(corpsPatch).toMatchObject({ statutTraitement: 'traite', reponse: 'Export envoyé.' }));
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it("n'envoie pas de réponse pour un autre signalement", async () => {
    depot = 'i1';
    render(<TrustPanel />);
    await screen.findByText('Description');
    fireEvent.change(screen.getByLabelText('Statut de traitement'), { target: { value: 'en_cours' } });
    await waitFor(() => expect(corpsPatch).toMatchObject({ kind: 'incident_confidentialite' }));
    expect(corpsPatch).not.toHaveProperty('reponse');
  });
});

// PRA-2b ([[D-481]] Q10 b) : file compacte et détail du dépôt choisi.
const EFFET = {
  kind: 'effet_indesirable', id: 'e1', idPatient: 'p3', patient: 'Jennifer Martin',
  resume: 'Effet indésirable — troubles digestifs', detail: '', statutTraitement: 'recu',
  soumisLe: '2026-10-15T08:00:00.000Z', examineLe: null,
  validation: {
    rattachement: 'element', elementDesigne: { actionId: 'a1', title: 'Magnésium le soir' },
    elements: [{ actionId: 'a1', title: 'Magnésium le soir' }], avisSansElement: false,
    verdicts: [], verdictCourantId: null,
  },
};

describe('TrustPanel — file compacte et détail (PRA-2b, Q10 b)', () => {
  beforeEach(() => {
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ ok: true, signalements: [EFFET, DEMANDE, INCIDENT], nonTraites: 3, pauseServie: true }),
      } as Response),
    );
  });

  it('chaque dépôt a sa ligne dans la file, qui mène à `?depot=` sur la même route', async () => {
    render(<TrustPanel />);
    const ligne = (await screen.findByText('Michel Dogné')).closest('a');
    expect(ligne?.getAttribute('href')).toBe('/dashboard/droits?depot=i1');
    expect(document.getElementById('depot-e1')?.getAttribute('href')).toBe('/dashboard/droits?depot=e1');
    expect(document.getElementById('depot-d1')).toBeTruthy();
  });

  it('la file dit l’attente d’un avis ; le détail porte l’avis déplié', async () => {
    render(<TrustPanel />);
    await screen.findByText('Michel Dogné');
    // Une fois dans la file, une fois en tête de l'avis du premier dépôt.
    expect(screen.getAllByText('En attente de votre avis.')).toHaveLength(2);
    const avis = screen.getByRole('region', { name: 'Avis sur l’implication' });
    expect(avis.closest('details')).toBeNull();
  });

  it('le dépôt de l’adresse est montré, avec « Retour à la file » vers la file', async () => {
    depot = 'd1';
    render(<TrustPanel />);
    expect(await screen.findByLabelText(/Réponse envoyée au patient/)).toBeTruthy();
    expect(screen.queryByRole('region', { name: 'Avis sur l’implication' })).toBeNull();
    expect(screen.getByRole('link', { name: 'Retour à la file' }).getAttribute('href')).toBe('/dashboard/droits');
    expect(document.getElementById('depot-d1')?.getAttribute('aria-current')).toBe('true');
  });

  it('quitter un détail garde le brouillon d’avis et n’enregistre rien', async () => {
    depot = 'e1';
    const { rerender } = render(<TrustPanel />);
    fireEvent.click(await screen.findByLabelText('Non impliqué'));
    depot = 'd1';
    rerender(<TrustPanel />);
    await screen.findByLabelText(/Réponse envoyée au patient/);
    depot = 'e1';
    rerender(<TrustPanel />);
    expect((await screen.findByLabelText<HTMLInputElement>('Non impliqué')).checked).toBe(true);
    const appels = (global.fetch as ReturnType<typeof vi.fn>).mock.calls;
    expect(appels.some(([, init]) => (init as RequestInit | undefined)?.method)).toBe(false);
  });

  it('quitter un détail garde aussi la réponse d’une demande de droit', async () => {
    depot = 'd1';
    const { rerender } = render(<TrustPanel />);
    fireEvent.change(await screen.findByLabelText(/Réponse envoyée au patient/), { target: { value: 'Brouillon.' } });
    depot = 'i1';
    rerender(<TrustPanel />);
    await screen.findByText('Description');
    depot = 'd1';
    rerender(<TrustPanel />);
    expect(((await screen.findByLabelText(/Réponse envoyée au patient/)) as HTMLTextAreaElement).value).toBe('Brouillon.');
  });
});
