// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { DossierDeuxVoixView } from './DossierDeuxVoixView';

const fetchMock = vi.fn();

const json = (payload: unknown, ok = true) => ({ ok, json: async () => payload });

const OBJECTIF = {
  id: 'OBJ_1',
  enoncePatient: 'Je voudrais me réveiller sans avoir l’impression de n’avoir pas dormi.',
  reformulationPraticien: 'Un sommeil qui ne restaure pas, plutôt qu’une difficulté à s’endormir.',
  priorite: 'Le sommeil d’abord',
  negocieLe: '2026-08-20T09:00:00.000Z',
  creeLe: '2026-08-20T09:00:00.000Z',
  etat: 'en_attente',
};

const SYNTHESE = {
  id: 'SYN_1',
  texte: 'Vous venez pour un sommeil qui se casse au milieu de la nuit.',
  redigeeLe: null,
  publieeLe: '2026-08-20T10:00:00.000Z',
};

const ENTREE = {
  id: 'ENT_1',
  texte: 'Pouvoir reprendre la marche du dimanche avec ma fille.',
  saisiLe: null,
  creeLe: '2026-08-21T08:00:00.000Z',
};

function assemblage(partiel: Record<string, unknown> = {}) {
  return {
    ok: true,
    objectifs: [OBJECTIF],
    ratifiable: true,
    ceQuiCompte: [ENTREE],
    comprehension: { synthese: SYNTHESE, desaccords: [] },
    ...partiel,
  };
}

/** Le texte rendu, à plat : les libellés sont coupés par les balises, et
 *  `getByText` échouerait sur une phrase répartie sur deux nœuds. */
const texteRendu = () => document.body.textContent ?? '';

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('DossierDeuxVoixView', () => {
  it('assemble les trois objets', async () => {
    fetchMock.mockResolvedValueOnce(json(assemblage()));
    render(<DossierDeuxVoixView token="TOK" />);

    await waitFor(() => expect(texteRendu()).toContain('Ce sur quoi nous travaillons'));
    expect(texteRendu()).toContain('sans avoir l’impression de n’avoir pas dormi');
    expect(texteRendu()).toContain('Un sommeil qui ne restaure pas');
    expect(texteRendu()).toContain('la marche du dimanche');
    expect(texteRendu()).toContain('un sommeil qui se casse au milieu de la nuit');
  });

  it('dit qu’il n’y a pas encore de réponse, jamais « non ratifié »', async () => {
    fetchMock.mockResolvedValueOnce(json(assemblage()));
    render(<DossierDeuxVoixView token="TOK" />);

    await waitFor(() => expect(texteRendu()).toContain('ne vous êtes pas encore prononcé'));
    expect(texteRendu()).not.toContain('non ratifié');
    expect(texteRendu()).not.toContain('refusé');
  });

  it('prévient que la réponse ne s’efface pas AVANT de la proposer', async () => {
    fetchMock.mockResolvedValueOnce(json(assemblage()));
    render(<DossierDeuxVoixView token="TOK" />);

    await waitFor(() => expect(texteRendu()).toContain('ne s’efface pas'));
    expect(texteRendu()).toContain('C’est bien ça');
    expect(texteRendu()).toContain('Ce n’est pas exactement ça');
  });

  it('envoie la ratification sans identifiant patient ni date', async () => {
    fetchMock.mockResolvedValueOnce(json(assemblage()));
    render(<DossierDeuxVoixView token="TOK" />);
    await waitFor(() => expect(texteRendu()).toContain('C’est bien ça'));

    fetchMock.mockResolvedValueOnce(json({ ok: true, ratification: { id: 'RAT_1' } }));
    fetchMock.mockResolvedValueOnce(json(assemblage({ objectifs: [{ ...OBJECTIF, etat: 'ratifie' }] })));
    fireEvent.click(screen.getByText('C’est bien ça'));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    const corps = JSON.parse(fetchMock.mock.calls[1][1].body as string);
    expect(corps).toEqual({ idObjectif: 'OBJ_1', sens: 'ratifie' });
  });

  it('relit le dossier après la réponse et affiche le nouvel état', async () => {
    fetchMock.mockResolvedValueOnce(json(assemblage()));
    render(<DossierDeuxVoixView token="TOK" />);
    await waitFor(() => expect(texteRendu()).toContain('C’est bien ça'));

    fetchMock.mockResolvedValueOnce(json({ ok: true, ratification: { id: 'RAT_1' } }));
    fetchMock.mockResolvedValueOnce(
      json(assemblage({ objectifs: [{ ...OBJECTIF, etat: 'conteste' }] })),
    );
    fireEvent.click(screen.getByText('Ce n’est pas exactement ça'));

    await waitFor(() => expect(texteRendu()).toContain('ce n’est pas exactement ça.'));
    expect(texteRendu()).toContain('C’est transmis');
  });

  it('DEUX TÊTES : montre les deux, ne propose RIEN, et ne diagnostique pas la cause', async () => {
    fetchMock.mockResolvedValueOnce(
      json(
        assemblage({
          objectifs: [OBJECTIF, { ...OBJECTIF, id: 'OBJ_2', enoncePatient: 'Une autre version.' }],
          ratifiable: false,
        }),
      ),
    );
    render(<DossierDeuxVoixView token="TOK" />);

    await waitFor(() => expect(texteRendu()).toContain('Deux versions de votre objectif'));
    expect(texteRendu()).toContain('Une autre version.');
    // Aucun bouton de réponse : ratifier « la plus récente » trancherait en
    // silence ce que `DC-30` demande de signaler.
    expect(screen.queryByText('C’est bien ça')).toBeNull();
    // Et l'écran n'affirme pas POURQUOI il y en a deux : il ne le sait pas.
    expect(texteRendu()).not.toContain('en parallèle');
    expect(texteRendu()).not.toContain('erreur');
  });

  it('un bloc fermé par drapeau est ABSENT, pas vide', async () => {
    fetchMock.mockResolvedValueOnce(json(assemblage({ ceQuiCompte: null, comprehension: null })));
    render(<DossierDeuxVoixView token="TOK" />);

    await waitFor(() => expect(texteRendu()).toContain('Ce sur quoi nous travaillons'));
    // Ni le titre, ni un message d'attente, ni un « pas encore ouvert ».
    expect(texteRendu()).not.toContain('Ce qui compte pour moi');
    expect(texteRendu()).not.toContain('Ce que mon praticien a compris de moi');
    expect(texteRendu()).not.toContain('pas encore ouvert');
  });

  it('un bloc OUVERT et vide dit une absence, jamais un « rien à signaler »', async () => {
    fetchMock.mockResolvedValueOnce(
      json(assemblage({ ceQuiCompte: [], comprehension: { synthese: null, desaccords: [] } })),
    );
    render(<DossierDeuxVoixView token="TOK" />);

    await waitFor(() => expect(texteRendu()).toContain('Ce qui compte pour moi'));
    expect(texteRendu()).toContain('Vous n’avez encore rien déposé ici');
    expect(texteRendu()).toContain('n’a encore rien publié ici');
    expect(texteRendu()).not.toContain('rien à signaler');
  });

  it('un dossier entièrement vide ne propose aucune réponse', async () => {
    fetchMock.mockResolvedValueOnce(json(assemblage({ objectifs: [], ratifiable: false })));
    render(<DossierDeuxVoixView token="TOK" />);

    await waitFor(() => expect(texteRendu()).toContain('Aucun objectif n’a encore été écrit'));
    expect(screen.queryByText('C’est bien ça')).toBeNull();
  });

  it('N’AFFICHE AUCUNE DATE quand le patient n’en a déclaré aucune', async () => {
    // `saisiLe: null` = le patient n'a pas dit à quand cela se rapporte.
    // Combler par `creeLe` lui ferait lire, en tête de sa propre parole, une
    // date qu'il n'a jamais donnée (`DC-24`).
    fetchMock.mockResolvedValueOnce(json(assemblage()));
    render(<DossierDeuxVoixView token="TOK" />);

    await waitFor(() => expect(texteRendu()).toContain('la marche du dimanche'));
    expect(texteRendu()).not.toContain('Concerne le');
    expect(texteRendu()).not.toContain('21 août');
  });

  it('affiche la date DÉCLARÉE quand il y en a une, sous son propre libellé', async () => {
    fetchMock.mockResolvedValueOnce(
      json(assemblage({ ceQuiCompte: [{ ...ENTREE, saisiLe: '2026-08-19T00:00:00.000Z' }] })),
    );
    render(<DossierDeuxVoixView token="TOK" />);

    await waitFor(() => expect(texteRendu()).toContain('Concerne le 19 août 2026'));
  });

  it('ne dit pas « Écrit le » sur une date de PUBLICATION', async () => {
    // `redigeeLe: null` : le praticien n'a pas déclaré quand il a écrit. On dit
    // ce qu'on a — la publication — sous son vrai nom.
    fetchMock.mockResolvedValueOnce(json(assemblage()));
    render(<DossierDeuxVoixView token="TOK" />);

    await waitFor(() => expect(texteRendu()).toContain('un sommeil qui se casse'));
    expect(texteRendu()).not.toContain('Écrit le');
    expect(texteRendu()).toContain('Publié le 20 août 2026');
  });

  it('affiche le désaccord DÉJÀ déposé sur la version servie', async () => {
    fetchMock.mockResolvedValueOnce(
      json(
        assemblage({
          comprehension: {
            synthese: SYNTHESE,
            desaccords: [
              {
                id: 'DES_1',
                idSynthese: 'SYN_1',
                texte: 'Ce n’est pas le milieu de la nuit, c’est le petit matin.',
                exprimeLe: null,
                creeLe: '2026-08-21T09:00:00.000Z',
              },
            ],
          },
        }),
      ),
    );
    render(<DossierDeuxVoixView token="TOK" />);

    await waitFor(() => expect(texteRendu()).toContain('Vous avez répondu à ce texte'));
    expect(texteRendu()).toContain('c’est le petit matin');
  });

  it('n’accroche PAS sous ce texte un désaccord visant une autre version', async () => {
    fetchMock.mockResolvedValueOnce(
      json(
        assemblage({
          comprehension: {
            synthese: SYNTHESE,
            desaccords: [
              {
                id: 'DES_0',
                idSynthese: 'SYN_ANCIENNE',
                texte: 'Une contestation d’une version antérieure.',
                exprimeLe: null,
                creeLe: '2026-08-18T09:00:00.000Z',
              },
            ],
          },
        }),
      ),
    );
    render(<DossierDeuxVoixView token="TOK" />);

    await waitFor(() => expect(texteRendu()).toContain('un sommeil qui se casse'));
    expect(texteRendu()).not.toContain('version antérieure');
    expect(texteRendu()).not.toContain('Vous avez répondu à ce texte');
  });

  it('retire le message de succès avant un nouvel envoi — jamais deux messages à la fois', async () => {
    fetchMock.mockResolvedValueOnce(json(assemblage()));
    render(<DossierDeuxVoixView token="TOK" />);
    await waitFor(() => expect(texteRendu()).toContain('C’est bien ça'));

    fetchMock.mockResolvedValueOnce(json({ ok: true, ratification: { id: 'RAT_1' } }));
    fetchMock.mockResolvedValueOnce(json(assemblage()));
    fireEvent.click(screen.getByText('C’est bien ça'));
    await waitFor(() => expect(texteRendu()).toContain('C’est transmis'));

    fetchMock.mockResolvedValueOnce(json({ ok: false, error: 'Refus du serveur.' }, false));
    fireEvent.click(screen.getByText('Ce n’est pas exactement ça'));

    await waitFor(() => expect(texteRendu()).toContain('Refus du serveur.'));
    expect(texteRendu()).not.toContain('C’est transmis');
  });

  it('n’affiche AUCUN décompte ni aucune mesure', async () => {
    fetchMock.mockResolvedValueOnce(json(assemblage()));
    render(<DossierDeuxVoixView token="TOK" />);

    await waitFor(() => expect(texteRendu()).toContain('Ce sur quoi nous travaillons'));
    const rendu = texteRendu().toLowerCase();
    for (const interdit of ['score', 'niveau', 'moyenne', 'taux', 'sur 5', 'points']) {
      expect(rendu).not.toContain(interdit);
    }
  });

  it('une erreur de la route s’affiche sans masquer l’écran', async () => {
    fetchMock.mockResolvedValueOnce(json({ ok: false, error: 'Cet espace n’est pas encore ouvert.' }, false));
    render(<DossierDeuxVoixView token="TOK" />);

    await waitFor(() => expect(texteRendu()).toContain('n’est pas encore ouvert'));
  });

  it('un refus de la ratification s’affiche tel quel', async () => {
    fetchMock.mockResolvedValueOnce(json(assemblage()));
    render(<DossierDeuxVoixView token="TOK" />);
    await waitFor(() => expect(texteRendu()).toContain('C’est bien ça'));

    fetchMock.mockResolvedValueOnce(
      json({ ok: false, error: 'Cette version de votre objectif a été reformulée depuis.' }, false),
    );
    fireEvent.click(screen.getByText('C’est bien ça'));

    await waitFor(() => expect(texteRendu()).toContain('a été reformulée depuis'));
  });
});
