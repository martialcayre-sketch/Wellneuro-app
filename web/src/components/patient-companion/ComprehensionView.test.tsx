// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

// La trace de lecture a son propre banc : ici, on vérifie QUAND elle est montée.
const { consigner } = vi.hoisted(() => ({ consigner: vi.fn(() => null) }));
vi.mock('@/components/patient/ConsignerLecturePortail', () => ({ ConsignerLecturePortail: consigner }));

import { ComprehensionView } from './ComprehensionView';
import { LONGUEUR_MAX_DESACCORD } from '@/lib/praticien/syntheseComprehension';
import { TITRE_LECTURE_DATEE } from '@/lib/portail/lectureDatee';

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
  consigner.mockClear();
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('ComprehensionView — la lecture datée (D-297)', () => {
  it('synthèse rendue : « Votre lecture est datée » en tête, puis la lecture consignée', async () => {
    chargementRendu(SYNTHESE);
    render(<ComprehensionView />);
    const avis = await screen.findByRole('region', { name: TITRE_LECTURE_DATEE });
    const texte = screen.getByText(SYNTHESE.texte);
    expect(avis.compareDocumentPosition(texte) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(consigner.mock.calls.map(appel => (appel as unknown[])[0])).toContainEqual({ espece: 'synthese' });
  });

  it('aucune synthèse publiée : ni avis, ni lecture consignée', async () => {
    chargementRendu(null);
    render(<ComprehensionView />);
    await screen.findByText(/n’a encore rien publié/);
    expect(screen.queryByRole('region', { name: TITRE_LECTURE_DATEE })).toBeNull();
    expect(consigner).not.toHaveBeenCalled();
  });

  it('page en erreur : ni avis, ni lecture consignée — rien n’a été lu', async () => {
    fetchMock.mockResolvedValueOnce(json({ ok: false, error: 'Indisponible.' }, false));
    render(<ComprehensionView />);
    await screen.findByText('Indisponible.');
    expect(screen.queryByRole('region', { name: TITRE_LECTURE_DATEE })).toBeNull();
    expect(consigner).not.toHaveBeenCalled();
  });
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

  // Audit UI du 2026-11-07, suites du n° 8 : l'envoi referme le formulaire, et
  // « Envoyer » disparaît avec lui. La région est là avant l'accusé, le focus
  // s'y pose quand il paraît — à chaque envoi.
  it('l’accusé paraît dans une région déjà présente, et le focus s’y pose', async () => {
    chargementRendu(SYNTHESE);
    render(<ComprehensionView />);
    await waitFor(() => expect(screen.getByText('Ce n’est pas exactement ça')).toBeTruthy());
    const region = screen.getByRole('status');
    expect(region.textContent).toBe('');

    for (let envoi = 0; envoi < 2; envoi += 1) {
      fireEvent.click(screen.getByText('Ce n’est pas exactement ça'));
      expect(region.textContent).toBe('');
      fetchMock.mockResolvedValueOnce(json({ ok: true, desaccord: { id: `DES_${envoi}` } }));
      chargementRendu(SYNTHESE, []);
      fireEvent.click(screen.getByText('Envoyer'));

      await waitFor(() => expect(region.textContent).toContain('C’est transmis'));
      expect(screen.getByRole('status')).toBe(region);
      expect(document.activeElement).toBe(region);
    }
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

// PAT-5 : T-33 au titre (Q4a), « Me reconnecter » sous un 401 dans un nouvel
// onglet (Q6a, [[D-488]] DOC-9), commandes masquées à l'impression (Q5a).
describe('ComprehensionView — PAT-5', () => {
  const refus = (status: number, error: string) => ({
    ok: false,
    status,
    json: async () => ({ ok: false, error }),
  });

  async function ouvrirEtEcrire(texte: string) {
    chargementRendu(SYNTHESE);
    render(<ComprehensionView />);
    await waitFor(() => expect(screen.getByText('Ce n’est pas exactement ça')).toBeTruthy());
    fireEvent.click(screen.getByText('Ce n’est pas exactement ça'));
    fireEvent.change(screen.getByLabelText('Ce qui ne correspond pas'), { target: { value: texte } });
  }

  it('titre T-33, à la première personne, en chargement, sur la page et en erreur', async () => {
    chargementRendu(SYNTHESE);
    render(<ComprehensionView />);
    expect(screen.getByRole('heading', { name: 'Ce que mon praticien a compris de moi' })).toBeTruthy();
    await screen.findByText(SYNTHESE.texte);
    expect(screen.getByRole('heading', { name: 'Ce que mon praticien a compris de moi' })).toBeTruthy();
    expect(document.body.textContent).not.toContain('Ce que votre praticien a compris de vous');
    cleanup();

    fetchMock.mockResolvedValueOnce(json({ ok: false, error: 'Indisponible.' }, false));
    render(<ComprehensionView />);
    await screen.findByText('Indisponible.');
    expect(screen.getByRole('heading', { name: 'Ce que mon praticien a compris de moi' })).toBeTruthy();
  });

  it('401 : « Me reconnecter » ouvre la connexion dans un NOUVEL onglet, le texte reste', async () => {
    await ouvrirEtEcrire('Ce que je voulais dire est autre.');
    fetchMock.mockResolvedValueOnce(refus(401, 'Session expirée. Reconnectez-vous.'));
    fireEvent.click(screen.getByText('Envoyer'));

    const lien = await screen.findByRole('link', { name: 'Me reconnecter' });
    expect(lien.getAttribute('href')).toBe('/portail/connexion');
    expect(lien.getAttribute('target')).toBe('_blank');
    expect(lien.getAttribute('rel')).toContain('noopener');
    expect((screen.getByLabelText('Ce qui ne correspond pas') as HTMLTextAreaElement).value).toBe(
      'Ce que je voulais dire est autre.',
    );
  });

  it('un autre refus ne propose pas de reconnexion', async () => {
    await ouvrirEtEcrire('Autre chose.');
    fetchMock.mockResolvedValueOnce(refus(400, 'Refusé.'));
    fireEvent.click(screen.getByText('Envoyer'));

    await screen.findByText('Refusé.');
    expect(screen.queryByRole('link', { name: 'Me reconnecter' })).toBeNull();
  });

  it('les commandes sont masquées à l’impression (Q5a)', async () => {
    chargementRendu(SYNTHESE);
    render(<ComprehensionView />);
    const ouvrir = await screen.findByText('Ce n’est pas exactement ça');
    expect(ouvrir.closest('button')?.className).toContain('print:hidden');
    fireEvent.click(ouvrir);
    expect(screen.getByText('Envoyer').closest('button')?.parentElement?.className).toContain('print:hidden');
  });
});
