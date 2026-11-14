// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

// Routeur STABLE : `charger` en dépend ; un objet neuf à chaque rendu relancerait
// la lecture sans fin.
const { routeur } = vi.hoisted(() => ({ routeur: { replace: vi.fn() } }));
vi.mock('next/navigation', () => ({ useRouter: () => routeur }));

import { DepotDocuments } from './DepotDocuments';
import { EN_TETE_DOSSIER_PAGE, MESSAGE_AUTRE_DOSSIER } from '@/lib/portail/dossierPage';

// U33 sous la garde du dossier de la page ([[D-481]] DOC-12, Q10 a) : le dépôt
// porte le segment de la page ; refusé en 409, T-51 paraît SOUS le bouton, la
// liste n'est pas relue (elle serait celle de l'autre compte) et le fichier
// choisi reste.

const PRET = { ok: true, documents: [], dossierOuvert: true, statutAge: 'majeur', plafond: null };

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('DepotDocuments — garde du dossier de la page', () => {
  it('409 : T-51 sous le bouton, segment envoyé, aucune relecture', async () => {
    const appels: { url: string; init?: RequestInit }[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        appels.push({ url, init });
        return init?.method === 'POST'
          ? new Response(JSON.stringify({ ok: false, reason: 'autre_dossier', error: MESSAGE_AUTRE_DOSSIER }), { status: 409 })
          : new Response(JSON.stringify(PRET), { status: 200 });
      }),
    );
    render(<DepotDocuments token="PAT_SEED_01" />);
    fireEvent.click(await screen.findByLabelText('Liste de traitements ou de compléments'));
    const fichier = new File(['%PDF-1.7'], 'document.pdf', { type: 'application/pdf' });
    fireEvent.change(screen.getByLabelText(/Le document : un PDF/), { target: { files: [fichier] } });
    fireEvent.click(screen.getByRole('button', { name: 'Déposer le document' }));

    const refus = await screen.findByText(MESSAGE_AUTRE_DOSSIER);
    const bouton = screen.getByRole('button', { name: 'Déposer le document' });
    expect(bouton.compareDocumentPosition(refus) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    const post = appels.find(a => a.init?.method === 'POST')!;
    expect((post.init!.headers as Record<string, string>)[EN_TETE_DOSSIER_PAGE]).toBe('PAT_SEED_01');
    // Un seul GET : celui du chargement ; aucune relecture après le refus.
    expect(appels.filter(a => a.init?.method !== 'POST')).toHaveLength(1);
    // Le fichier reste choisi : le bouton n'est pas revenu à l'état désactivé.
    expect((bouton as HTMLButtonElement).disabled).toBe(false);
  });
});
