// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DeclarationsPatient } from './DeclarationsPatient';

// Prototype PAT-6, [[D-481]] complément DOC-11 : Q4 a (401 de lecture sur la
// page seule), Q5 a (l'erreur au geste, sans doublon), Q6 a (l'état confirmé
// et relu, annoncé sans texte neuf), Q7 a (mentions datées en lettres).
// Patients fictifs : aucune identité dans ces données.

const LIGNE = {
  id: 'l1',
  acte: 'pose' as const,
  source: 'patient' as const,
  acteLe: '2026-11-04T10:00:00Z',
  nature: 'complement',
  nom: 'Magnésium',
  dose: '300 mg',
  moment: 'le soir',
  motif: null,
  debut: '2026-03-01',
  debutPrecision: 'mois',
  fin: null,
  finPrecision: null,
  prescritParTiers: 'non',
};

const lues = (traitements: unknown[] = []) => ({
  ok: true,
  ouvert: true,
  saisieOuverte: true,
  donnees: { criteres: [], traitements },
  aujourdhui: '2026-11-14',
});

const reponse = (corps: unknown, status = 200) =>
  ({ ok: status >= 200 && status < 300, status, json: async () => corps }) as Response;

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('DeclarationsPatient — Q7 a, mentions en lettres', () => {
  it('écrit la date de la mention en lettres, à l’heure de Paris', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reponse(lues([LIGNE]))));
    render(<DeclarationsPatient parties="traitements" />);
    expect(await screen.findByText('Ajouté par vous le 4 novembre 2026')).toBeTruthy();
    expect(screen.queryByText(/04\/11\/2026/)).toBeNull();
  });
});

describe('DeclarationsPatient — Q4 a, lecture refusée en 401', () => {
  it('sur la page de la fiche, renvoie à l’entrée sans afficher d’échec de lecture', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reponse({ ok: false, error: 'Session expirée. Reconnectez-vous.' }, 401)));
    const onSessionExpiree = vi.fn();
    render(<DeclarationsPatient parties="tout" onSessionExpiree={onSessionExpiree} />);
    await waitFor(() => expect(onSessionExpiree).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('une erreur réseau n’est pas une session expirée : la phrase et « Réessayer » restent', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('réseau')));
    const onSessionExpiree = vi.fn();
    render(<DeclarationsPatient parties="tout" onSessionExpiree={onSessionExpiree} />);
    expect((await screen.findByRole('alert')).textContent).toContain('n’a pas pu être chargée');
    expect(screen.getByRole('button', { name: 'Réessayer' })).toBeTruthy();
    expect(onSessionExpiree).not.toHaveBeenCalled();
  });

  it('une lecture indisponible (503) n’est pas une session expirée', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reponse({ ok: false }, 503)));
    const onSessionExpiree = vi.fn();
    render(<DeclarationsPatient parties="tout" onSessionExpiree={onSessionExpiree} />);
    expect((await screen.findByRole('alert')).textContent).toContain('n’a pas pu être chargée');
    expect(onSessionExpiree).not.toHaveBeenCalled();
  });

  it('dans la fiche de l’entrée (sans renvoi), un 401 de lecture garde l’alerte d’avant', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reponse({ ok: false }, 401)));
    render(<DeclarationsPatient parties="traitements" />);
    expect((await screen.findByRole('alert')).textContent).toContain('n’a pas pu être chargée');
  });
});

describe('DeclarationsPatient — Q5 a et Q6 a, après un enregistrement', () => {
  const ouvrirAjout = async () => {
    fireEvent.click(await screen.findByRole('button', { name: '+ Ajouter un complément' }));
    fireEvent.change(screen.getAllByLabelText('Nom').at(-1)!, { target: { value: 'Magnésium' } });
  };
  const formulaire = () => screen.getAllByRole('group').find(g => within(g).queryByLabelText('Nom'))!;

  it('l’erreur paraît dans le formulaire du geste, une seule fois, et la saisie reste', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(reponse(lues()))
      .mockResolvedValueOnce(reponse({ ok: false, error: 'Votre demande n’a pas pu être enregistrée.' }, 400))
      .mockResolvedValueOnce(reponse(lues()));
    vi.stubGlobal('fetch', fetchMock);
    render(<DeclarationsPatient parties="tout" />);
    await ouvrirAjout();
    fireEvent.click(within(formulaire()).getByRole('button', { name: 'Enregistrer' }));

    const alerte = await within(formulaire()).findByRole('alert');
    expect(alerte.textContent).toBe('Votre demande n’a pas pu être enregistrée.');
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect((within(formulaire()).getByLabelText('Nom') as HTMLInputElement).value).toBe('Magnésium');
  });

  it('annonce la ligne neuve et sa mention, une fois le serveur d’accord ET la page relue', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(reponse(lues()))
      .mockResolvedValueOnce(reponse({ ok: true }))
      .mockResolvedValueOnce(reponse(lues([LIGNE])));
    vi.stubGlobal('fetch', fetchMock);
    render(<DeclarationsPatient parties="tout" />);
    await ouvrirAjout();
    expect(screen.getByRole('status').textContent).toBe('');
    fireEvent.click(within(formulaire()).getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toBe(
        'Magnésium — 300 mg — le soir — Ajouté par vous le 4 novembre 2026',
      ),
    );
    // Le même état, à l'œil : la ligne et sa mention.
    expect(screen.getByText('Ajouté par vous le 4 novembre 2026')).toBeTruthy();
  });

  it('n’annonce rien quand la relecture échoue après un enregistrement accepté', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(reponse(lues()))
      .mockResolvedValueOnce(reponse({ ok: true }))
      .mockRejectedValueOnce(new Error('réseau'));
    vi.stubGlobal('fetch', fetchMock);
    render(<DeclarationsPatient parties="tout" />);
    await ouvrirAjout();
    fireEvent.click(within(formulaire()).getByRole('button', { name: 'Enregistrer' }));

    expect((await screen.findByRole('alert')).textContent).toContain('n’a pas pu être chargée');
    expect(screen.getByRole('status').textContent).toBe('');
  });

  it('sur la page de la fiche, un enregistrement refusé en 401 garde la saisie et ne relit pas', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(reponse(lues()))
      .mockResolvedValueOnce(reponse({ ok: false, error: 'Session expirée. Reconnectez-vous.' }, 401));
    vi.stubGlobal('fetch', fetchMock);
    const onSessionExpiree = vi.fn();
    render(<DeclarationsPatient parties="tout" onSessionExpiree={onSessionExpiree} />);
    await ouvrirAjout();
    fireEvent.click(within(formulaire()).getByRole('button', { name: 'Enregistrer' }));

    expect((await within(formulaire()).findByRole('alert')).textContent).toBe('Session expirée. Reconnectez-vous.');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(onSessionExpiree).not.toHaveBeenCalled();
    expect((within(formulaire()).getByLabelText('Nom') as HTMLInputElement).value).toBe('Magnésium');
  });

  it('l’erreur d’un retrait paraît sur sa ligne, pas en tête', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(reponse(lues([LIGNE])))
      .mockResolvedValueOnce(reponse({ ok: false, error: 'Votre demande n’a pas pu être enregistrée.' }, 400))
      .mockResolvedValueOnce(reponse(lues([LIGNE])));
    vi.stubGlobal('fetch', fetchMock);
    render(<DeclarationsPatient parties="traitements" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Supprimer cette ligne' }));

    const alerte = await screen.findByRole('alert');
    const ligne = screen.getByText('Magnésium — 300 mg — le soir').parentElement!;
    expect(ligne.contains(alerte)).toBe(true);
    expect(screen.getAllByRole('alert')).toHaveLength(1);
  });
});
