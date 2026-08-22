// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ComprehensionView } from './ComprehensionView';
import { LONGUEUR_MAX_DESACCORD } from '@/lib/praticien/syntheseComprehension';

const fetchMock = vi.fn();

const json = (payload: unknown, ok = true) => ({ ok, json: async () => payload });

const SYNTHESE = {
  id: 'SYN_1',
  texte: 'Vous venez pour un sommeil qui se casse au milieu de la nuit.',
  redigeeLe: null,
  publieeLe: '2026-08-20T09:00:00.000Z',
};

function chargementRendu(synthese: unknown, desaccords: unknown[] = []) {
  fetchMock.mockResolvedValueOnce(json({ ok: true, synthese, desaccords }));
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('ComprehensionView', () => {
  it('dit l’ABSENCE comme une absence, jamais comme « rien à signaler »', async () => {
    chargementRendu(null);
    render(<ComprehensionView />);

    await waitFor(() => expect(screen.getByText(/n’a encore rien publié/)).toBeTruthy());
    // Le patient ne doit pas pouvoir contester ce qui n'existe pas.
    expect(screen.queryByText('Ce n’est pas exactement ça')).toBeNull();
    // Et surtout : aucune formule qui ferait passer un silence pour un constat.
    expect(document.body.textContent).not.toMatch(/rien à signaler|tout va bien|aucun problème/i);
  });

  it('rend le texte du praticien TEL QUEL, retours à la ligne compris', async () => {
    chargementRendu({ ...SYNTHESE, texte: 'Première ligne.\nSeconde ligne.' });
    render(<ComprehensionView />);

    await waitFor(() => expect(screen.getByText(/Première ligne/)).toBeTruthy());
    const paragraphe = screen.getByText(/Première ligne/);
    expect(paragraphe.className).toContain('whitespace-pre-wrap');
    expect(paragraphe.textContent).toBe('Première ligne.\nSeconde ligne.');
  });

  it('AVERTIT que le message ne s’efface pas AVANT de l’envoyer', async () => {
    chargementRendu(SYNTHESE);
    render(<ComprehensionView />);

    await waitFor(() => expect(screen.getByText('Ce n’est pas exactement ça')).toBeTruthy());
    fireEvent.click(screen.getByText('Ce n’est pas exactement ça'));

    // La contrepartie honnête d'un objet indestructible : le dire avant.
    expect(screen.getByText(/ne s’efface pas/)).toBeTruthy();
  });

  it('accepte un envoi SANS texte — le geste seul suffit', async () => {
    chargementRendu(SYNTHESE);
    render(<ComprehensionView />);
    await waitFor(() => expect(screen.getByText('Ce n’est pas exactement ça')).toBeTruthy());
    fireEvent.click(screen.getByText('Ce n’est pas exactement ça'));

    fetchMock.mockResolvedValueOnce(json({ ok: true, desaccord: { id: 'DES_1' } }));
    chargementRendu(SYNTHESE, []);
    fireEvent.click(screen.getByText('Envoyer'));

    await waitFor(() => {
      const envoi = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST');
      expect(envoi).toBeTruthy();
      expect(JSON.parse(envoi![1].body)).toEqual({ idSynthese: 'SYN_1', texte: null });
    });
  });

  it('n’envoie AUCUN identifiant patient : la session le dit', async () => {
    chargementRendu(SYNTHESE);
    render(<ComprehensionView />);
    await waitFor(() => expect(screen.getByText('Ce n’est pas exactement ça')).toBeTruthy());
    fireEvent.click(screen.getByText('Ce n’est pas exactement ça'));

    fetchMock.mockResolvedValueOnce(json({ ok: true, desaccord: { id: 'DES_1' } }));
    chargementRendu(SYNTHESE, []);
    fireEvent.click(screen.getByText('Envoyer'));

    await waitFor(() => {
      const envoi = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST');
      expect(Object.keys(JSON.parse(envoi![1].body))).not.toContain('idPatient');
    });
  });

  it('ne coupe RIEN : pas de `maxLength`, un compteur qui informe', async () => {
    chargementRendu(SYNTHESE);
    render(<ComprehensionView />);
    await waitFor(() => expect(screen.getByText('Ce n’est pas exactement ça')).toBeTruthy());
    fireEvent.click(screen.getByText('Ce n’est pas exactement ça'));

    const champ = screen.getByLabelText('Ce qui ne correspond pas') as HTMLTextAreaElement;
    // `maxLength` ferait couper le navigateur en silence — le contre-patron.
    expect(champ.getAttribute('maxLength')).toBeNull();

    fireEvent.change(champ, { target: { value: 'a'.repeat(LONGUEUR_MAX_DESACCORD + 1) } });
    expect(champ.value).toHaveLength(LONGUEUR_MAX_DESACCORD + 1);
    expect(screen.getByText(/au-delà de la limite/)).toBeTruthy();
  });

  it('CONSERVE le texte quand l’envoi échoue — c’est une parole, pas des clics', async () => {
    chargementRendu(SYNTHESE);
    render(<ComprehensionView />);
    await waitFor(() => expect(screen.getByText('Ce n’est pas exactement ça')).toBeTruthy());
    fireEvent.click(screen.getByText('Ce n’est pas exactement ça'));

    const champ = screen.getByLabelText('Ce qui ne correspond pas') as HTMLTextAreaElement;
    fireEvent.change(champ, { target: { value: 'Ce que je voulais dire est autre.' } });

    fetchMock.mockResolvedValueOnce(json({ ok: false, error: 'Session expirée.' }, false));
    fireEvent.click(screen.getByText('Envoyer'));

    await waitFor(() => expect(screen.getByText('Session expirée.')).toBeTruthy());
    expect(
      (screen.getByLabelText('Ce qui ne correspond pas') as HTMLTextAreaElement).value,
    ).toBe('Ce que je voulais dire est autre.');
  });

  it('n’affiche ni décompte, ni état, ni note sur les messages déjà envoyés', async () => {
    chargementRendu(SYNTHESE, [
      {
        id: 'DES_1',
        idSynthese: 'SYN_1',
        texte: 'Pas exactement.',
        exprimeLe: null,
        creeLe: '2026-08-21T09:00:00.000Z',
      },
      {
        id: 'DES_2',
        idSynthese: 'SYN_1',
        texte: null,
        exprimeLe: null,
        creeLe: '2026-08-22T09:00:00.000Z',
      },
    ]);
    render(<ComprehensionView />);

    await waitFor(() => expect(screen.getByText('Pas exactement.')).toBeTruthy());
    // Ni « 2 désaccords », ni « en attente », ni pourcentage : la liste dit ce
    // qui a été dit, elle ne le juge pas.
    expect(document.body.textContent).not.toMatch(/2 (désaccords|messages)|en attente|%/i);
    // Un message sans texte se dit comme tel, jamais comme un vide.
    expect(screen.getByText(/sans ajouter de texte/)).toBeTruthy();
  });

  it('n’offre AUCUN retrait : ni annuler un envoi, ni supprimer', async () => {
    chargementRendu(SYNTHESE, [
      {
        id: 'DES_1',
        idSynthese: 'SYN_1',
        texte: 'Pas exactement.',
        exprimeLe: null,
        creeLe: '2026-08-21T09:00:00.000Z',
      },
    ]);
    render(<ComprehensionView />);

    await waitFor(() => expect(screen.getByText('Pas exactement.')).toBeTruthy());
    for (const interdit of ['Supprimer', 'Retirer', 'Modifier']) {
      expect(screen.queryByText(interdit)).toBeNull();
    }
  });
});
