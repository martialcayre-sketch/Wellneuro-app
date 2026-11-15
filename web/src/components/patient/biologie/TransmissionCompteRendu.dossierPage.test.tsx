// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

// Routeur STABLE : `charger` en dépend.
const { routeur } = vi.hoisted(() => ({ routeur: { replace: vi.fn() } }));
vi.mock('next/navigation', () => ({ useRouter: () => routeur }));

import { TransmissionCompteRendu } from './TransmissionCompteRendu';
import { EN_TETE_DOSSIER_PAGE, MESSAGE_AUTRE_DOSSIER } from '@/lib/portail/dossierPage';

// U34 sous la garde du dossier de la page ([[D-481]] DOC-12, Q10 a) : l'envoi
// porte le segment de la page ; refusé en 409, T-51 paraît SOUS le bouton et la
// liste n'est pas relue (elle serait celle de l'autre compte).

const PRET = { ok: true, documents: [], accuseRequis: false, dossierOuvert: true, plafond: null };

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('TransmissionCompteRendu — garde du dossier de la page', () => {
  it('409 : T-51 sous le bouton, segment envoyé, aucune relecture', async () => {
    const appels: { url: string; init?: RequestInit }[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        appels.push({ url, init });
        const corps =
          init?.method === 'POST' ? { ok: false, reason: 'autre_dossier', error: MESSAGE_AUTRE_DOSSIER } : PRET;
        const status = init?.method === 'POST' ? 409 : 200;
        return { ok: status < 300, status, json: async () => corps } as Response;
      }),
    );
    const { container } = render(<TransmissionCompteRendu token="PAT_SEED_02" />);
    const bouton = (await screen.findByRole('button', { name: 'Envoyer à mon praticien' })) as HTMLButtonElement;
    const champ = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(champ, { target: { files: [new File(['%PDF-1.7'], 'cr.pdf', { type: 'application/pdf' })] } });
    fireEvent.click(bouton);

    const refus = await screen.findByText(MESSAGE_AUTRE_DOSSIER);
    expect(bouton.compareDocumentPosition(refus) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const post = appels.find(a => a.init?.method === 'POST')!;
    expect((post.init!.headers as Record<string, string>)[EN_TETE_DOSSIER_PAGE]).toBe('PAT_SEED_02');
    expect(appels.filter(a => a.init?.method !== 'POST')).toHaveLength(1);
    // Le fichier reste choisi.
    expect(bouton.disabled).toBe(false);
  });

  it('accusé de lecture refusé en 409 : T-51 à la place du texte fixe, segment envoyé, aucune relecture ([[D-488]] DOC-14)', async () => {
    const appels: { url: string; init?: RequestInit }[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        appels.push({ url, init });
        if (init?.method === 'POST') {
          return { ok: false, status: 409, json: async () => ({ ok: false, reason: 'autre_dossier', error: MESSAGE_AUTRE_DOSSIER }) } as Response;
        }
        return { ok: true, status: 200, json: async () => ({ ...PRET, accuseRequis: true, documentAccuse: 'usage_ia' }) } as Response;
      }),
    );
    render(<TransmissionCompteRendu token="PAT_SEED_02" />);
    fireEvent.click(await screen.findByRole('button', { name: 'J’en ai pris connaissance' }));

    expect(await screen.findByText(MESSAGE_AUTRE_DOSSIER)).toBeTruthy();
    expect(screen.queryByText('Votre lecture n’a pas pu être enregistrée. Réessayez.')).toBeNull();
    const post = appels.find(a => a.init?.method === 'POST')!;
    expect(post.url).toBe('/api/portail/trust/lecture');
    expect((post.init!.headers as Record<string, string>)[EN_TETE_DOSSIER_PAGE]).toBe('PAT_SEED_02');
    expect(appels.filter(a => a.init?.method !== 'POST')).toHaveLength(1);
  });
});
