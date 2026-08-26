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
    amendements: [],
    reponsesJalon: [],
    // PAR DÉFAUT, AUCUNE ÉTAPE OUVERTE : c'est l'état de la quasi-totalité des
    // dossiers, et la question d'étape ne doit apparaître que quand le SERVEUR
    // l'ouvre. Un défaut « ouverte » aurait fait passer au vert des cas qui ne
    // la mentionnent pas.
    jalonDu: { statut: 'aucune', motif: 'Aucune étape n’est ouverte.' },
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

  // ── « LE DIRE AUTREMENT » (Alliance 6.0-B, LOT-04, D-110) ────────────────

  describe('le troisième verbe', () => {
    const AMENDEMENT = {
      id: 'AME_1',
      idObjectif: 'OBJ_1',
      texte: 'Ce que je veux, c’est tenir debout jusqu’au dîner.',
      creeLe: '2026-08-25T12:00:00.000Z',
    };

    async function ouvrirLaSaisie() {
      fetchMock.mockResolvedValueOnce(json(assemblage()));
      render(<DossierDeuxVoixView token="TOK" />);
      await waitFor(() => expect(texteRendu()).toContain('Le dire autrement'));
      fireEvent.click(screen.getByText('Le dire autrement'));
      return screen.getByLabelText('Écrivez cet objectif avec vos mots') as HTMLTextAreaElement;
    }

    it('le bouton n’envoie rien : il ouvre une saisie, VIDE de toute suggestion', async () => {
      const zone = await ouvrirLaSaisie();
      // Jamais pré-remplie par l'énoncé courant : le patient écrirait alors sur
      // les mots d'un autre.
      expect(zone.value).toBe('');
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('la borne est affichée AVANT d’être atteinte, et le champ ne tronque pas', async () => {
      const zone = await ouvrirLaSaisie();
      expect(texteRendu()).toContain('/ 4000 caractères');
      // Pas de `maxLength` : couper en silence produirait une phrase que
      // personne n'a écrite. Le patient dépasse, il le voit, il raccourcit.
      expect(zone.getAttribute('maxlength')).toBeNull();

      fireEvent.change(zone, { target: { value: 'x'.repeat(4001) } });
      expect(texteRendu()).toContain('4001 / 4000');
      expect(screen.getByText('Envoyer ma version').closest('button')?.disabled).toBe(true);
    });

    it('poste le geste NOMMÉ, avec la version visée et le texte', async () => {
      const zone = await ouvrirLaSaisie();
      fireEvent.change(zone, { target: { value: AMENDEMENT.texte } });

      fetchMock.mockResolvedValueOnce(json({ ok: true, amendement: AMENDEMENT }));
      fetchMock.mockResolvedValueOnce(json(assemblage({ amendements: [AMENDEMENT] })));
      fireEvent.click(screen.getByText('Envoyer ma version'));

      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
      const corps = JSON.parse(fetchMock.mock.calls[1][1].body);
      expect(corps).toEqual({
        geste: 'amendement',
        idObjectif: 'OBJ_1',
        texte: AMENDEMENT.texte,
      });
      // Aucune date : le geste est posé maintenant, le serveur l'horodate.
      expect(corps).not.toHaveProperty('creeLe');
      expect(corps).not.toHaveProperty('exprimeLe');
    });

    it('rend au patient son texte à relire, et le dit sans jamais parler de refus', async () => {
      fetchMock.mockResolvedValueOnce(
        json(
          assemblage({
            amendements: [AMENDEMENT],
            objectifs: [{ ...OBJECTIF, etat: 'dit_autrement' }],
          }),
        ),
      );
      render(<DossierDeuxVoixView token="TOK" />);

      await waitFor(() => expect(texteRendu()).toContain('tenir debout jusqu’au dîner'));
      expect(texteRendu()).toContain('Vous avez écrit votre version de cet objectif.');
      const rendu = texteRendu().toLowerCase();
      expect(rendu).not.toContain('refus');
      expect(rendu).not.toContain('désaccord');
      expect(rendu).not.toContain('en retard');
    });

    it('un amendement porté sur une AUTRE version ne s’affiche pas SOUS celle-ci', async () => {
      fetchMock.mockResolvedValueOnce(
        json(assemblage({ amendements: [{ ...AMENDEMENT, idObjectif: 'OBJ_AILLEURS' }] })),
      );
      render(<DossierDeuxVoixView token="TOK" />);

      await waitFor(() => expect(texteRendu()).toContain('Ce sur quoi nous travaillons'));
      // Il n'est pas rattaché à la version courante — il ne répond pas à cette
      // formulation-là…
      const carte = screen.getByText(OBJECTIF.enoncePatient).closest('div')?.parentElement;
      expect(carte?.textContent ?? '').not.toContain('tenir debout jusqu’au dîner');
    });

    it('MAIS IL NE DISPARAÎT PAS : le patient relit ce qu’il a écrit avant la reformulation', async () => {
      // La route ne sert que les TÊTES : sans bloc dédié, la parole du patient
      // s'évanouissait au premier geste du praticien.
      fetchMock.mockResolvedValueOnce(
        json(assemblage({ amendements: [{ ...AMENDEMENT, idObjectif: 'OBJ_AILLEURS' }] })),
      );
      render(<DossierDeuxVoixView token="TOK" />);

      await waitFor(() => expect(texteRendu()).toContain('tenir debout jusqu’au dîner'));
      expect(texteRendu()).toContain('une formulation précédente de votre objectif');
      expect(texteRendu()).toContain('Rien ne s’efface');
    });

    it('un amendement de la version COURANTE ne se dédouble pas dans le bloc « avant »', async () => {
      fetchMock.mockResolvedValueOnce(json(assemblage({ amendements: [AMENDEMENT] })));
      render(<DossierDeuxVoixView token="TOK" />);

      await waitFor(() => expect(texteRendu()).toContain('tenir debout jusqu’au dîner'));
      expect(texteRendu()).not.toContain('une formulation précédente de votre objectif');
    });

    it('SUR UN REFUS, le texte reste à l’écran — il est irremplaçable', async () => {
      const zone = await ouvrirLaSaisie();
      fireEvent.change(zone, { target: { value: AMENDEMENT.texte } });

      fetchMock.mockResolvedValueOnce(
        json({ ok: false, error: 'Cette version de votre objectif a été reformulée depuis.' }, false),
      );
      fireEvent.click(screen.getByText('Envoyer ma version'));

      await waitFor(() => expect(texteRendu()).toContain('a été reformulée depuis'));
      expect(
        (screen.getByLabelText('Écrivez cet objectif avec vos mots') as HTMLTextAreaElement).value,
      ).toBe(AMENDEMENT.texte);
    });

    it('deux versions coexistantes : aucun des trois verbes n’est proposé (DC-30)', async () => {
      fetchMock.mockResolvedValueOnce(
        json(
          assemblage({
            ratifiable: false,
            objectifs: [OBJECTIF, { ...OBJECTIF, id: 'OBJ_2' }],
          }),
        ),
      );
      render(<DossierDeuxVoixView token="TOK" />);

      await waitFor(() => expect(texteRendu()).toContain('Deux versions de votre objectif coexistent'));
      expect(screen.queryByText('Le dire autrement')).toBeNull();
    });

    it('ne compte ni ne gradue le texte du patient', async () => {
      fetchMock.mockResolvedValueOnce(json(assemblage({ amendements: [AMENDEMENT] })));
      render(<DossierDeuxVoixView token="TOK" />);

      await waitFor(() => expect(texteRendu()).toContain('tenir debout jusqu’au dîner'));
      const rendu = texteRendu().toLowerCase();
      for (const interdit of ['score', 'niveau', 'moyenne', 'taux', '1 version', 'points']) {
        expect(rendu).not.toContain(interdit);
      }
    });
  });

  // ── LA RÉPONSE D'ÉTAPE (6.0-B, LOT-05) ─────────────────────────────────────

  describe('où j’en suis', () => {
    const OUVERTE = {
      statut: 'ouverte',
      jalon: 'J21',
      ouvertLe: '2026-08-20T09:00:00.000Z',
      fermeLe: '2026-09-05T09:00:00.000Z',
    };
    const RATIFIE = { ...OBJECTIF, etat: 'ratifie' };

    it('la question ne s’affiche QUE quand le serveur ouvre une étape', async () => {
      // Étape fermée : la question est ABSENTE, pas grisée. Un champ visible et
      // inerte ferait croire à une panne.
      fetchMock.mockResolvedValueOnce(json(assemblage({ objectifs: [RATIFIE] })));
      render(<DossierDeuxVoixView token="TOK" />);

      await waitFor(() => expect(texteRendu()).toContain('Ce que vous avez dit'));
      expect(screen.queryByText('Envoyer où j’en suis')).toBeNull();
    });

    it('étape ouverte sur un objectif ratifié : la question apparaît', async () => {
      fetchMock.mockResolvedValueOnce(
        json(assemblage({ objectifs: [RATIFIE], jalonDu: OUVERTE })),
      );
      render(<DossierDeuxVoixView token="TOK" />);

      await waitFor(() =>
        expect(texteRendu()).toContain('Où en êtes-vous par rapport à cet objectif ?'),
      );
    });

    it('SUR UN OBJECTIF SANS RÉPONSE, la question n’est PAS posée', async () => {
      // Demander « où en êtes-vous par rapport à votre objectif » à quelqu'un
      // qui n'a pas encore dit que c'était le sien pose la question à côté.
      fetchMock.mockResolvedValueOnce(json(assemblage({ jalonDu: OUVERTE })));
      render(<DossierDeuxVoixView token="TOK" />);

      await waitFor(() => expect(texteRendu()).toContain('Ce que vous avez dit'));
      expect(screen.queryByText('Envoyer où j’en suis')).toBeNull();
    });

    it('DEUX TÊTES : la question n’est pas posée non plus (DC-30)', async () => {
      fetchMock.mockResolvedValueOnce(
        json(
          assemblage({
            ratifiable: false,
            objectifs: [RATIFIE, { ...RATIFIE, id: 'OBJ_2' }],
            jalonDu: OUVERTE,
          }),
        ),
      );
      render(<DossierDeuxVoixView token="TOK" />);

      await waitFor(() => expect(texteRendu()).toContain('Deux versions'));
      expect(screen.queryByText('Envoyer où j’en suis')).toBeNull();
    });

    it('poste le geste NOMMÉ, le jalon SERVI, et `eva: null` quand rien n’est choisi', async () => {
      fetchMock.mockResolvedValueOnce(
        json(assemblage({ objectifs: [RATIFIE], jalonDu: OUVERTE })),
      );
      render(<DossierDeuxVoixView token="TOK" />);
      await waitFor(() => expect(texteRendu()).toContain('Où en êtes-vous'));

      fireEvent.change(screen.getByLabelText('Où en êtes-vous par rapport à cet objectif ?'), {
        target: { value: 'Trois soirs sur sept, je tiens.' },
      });
      fetchMock.mockResolvedValueOnce(json({ ok: true, reponseJalon: { id: 'REP_1' } }));
      fetchMock.mockResolvedValueOnce(
        json(assemblage({ objectifs: [RATIFIE], jalonDu: OUVERTE })),
      );
      fireEvent.click(screen.getByText('Envoyer où j’en suis'));

      await waitFor(() => expect(fetchMock.mock.calls.length).toBeGreaterThan(1));
      const envoi = JSON.parse(fetchMock.mock.calls[1][1].body);
      expect(envoi).toEqual({
        geste: 'reponse_jalon',
        idObjectif: 'OBJ_1',
        jalon: 'J21',
        texte: 'Trois soirs sur sept, je tiens.',
        // `null` EXPLICITE, jamais `0` ni champ omis.
        eva: null,
      });
      expect(envoi).not.toHaveProperty('idPatient');
      expect(envoi).not.toHaveProperty('creeLe');
    });

    it('L’ÉCHELLE N’EST PAS PRÉ-SÉLECTIONNÉE, et se retire après un clic', async () => {
      fetchMock.mockResolvedValueOnce(
        json(assemblage({ objectifs: [RATIFIE], jalonDu: OUVERTE })),
      );
      render(<DossierDeuxVoixView token="TOK" />);
      await waitFor(() => expect(texteRendu()).toContain('Où en êtes-vous'));

      // Aucun bouton pressé au départ : rien n'est déposé que le patient n'ait
      // choisi (`DC-24`).
      expect(document.querySelectorAll('[aria-pressed="true"]').length).toBe(0);
      expect(screen.queryByText('Retirer ma réponse à l’échelle')).toBeNull();

      fireEvent.click(screen.getByText('0'));
      expect(document.querySelectorAll('[aria-pressed="true"]').length).toBe(1);

      // ZÉRO EST UNE RÉPONSE : le bouton de retrait doit apparaître pour lui
      // comme pour les autres. Un test de vérité JavaScript l'aurait manqué.
      fireEvent.click(screen.getByText('Retirer ma réponse à l’échelle'));
      expect(document.querySelectorAll('[aria-pressed="true"]').length).toBe(0);
    });

    it('poste le zéro comme une valeur, pas comme une absence', async () => {
      fetchMock.mockResolvedValueOnce(
        json(assemblage({ objectifs: [RATIFIE], jalonDu: OUVERTE })),
      );
      render(<DossierDeuxVoixView token="TOK" />);
      await waitFor(() => expect(texteRendu()).toContain('Où en êtes-vous'));

      fireEvent.change(screen.getByLabelText('Où en êtes-vous par rapport à cet objectif ?'), {
        target: { value: 'Rien n’a bougé.' },
      });
      fireEvent.click(screen.getByText('0'));
      fetchMock.mockResolvedValueOnce(json({ ok: true, reponseJalon: { id: 'REP_1' } }));
      fetchMock.mockResolvedValueOnce(
        json(assemblage({ objectifs: [RATIFIE], jalonDu: OUVERTE })),
      );
      fireEvent.click(screen.getByText('Envoyer où j’en suis'));

      await waitFor(() => expect(fetchMock.mock.calls.length).toBeGreaterThan(1));
      expect(JSON.parse(fetchMock.mock.calls[1][1].body).eva).toBe(0);
    });

    it('SUR UN REFUS, le texte ET l’EVA restent à l’écran', async () => {
      fetchMock.mockResolvedValueOnce(
        json(assemblage({ objectifs: [RATIFIE], jalonDu: OUVERTE })),
      );
      render(<DossierDeuxVoixView token="TOK" />);
      await waitFor(() => expect(texteRendu()).toContain('Où en êtes-vous'));

      const champ = screen.getByLabelText(
        'Où en êtes-vous par rapport à cet objectif ?',
      ) as HTMLTextAreaElement;
      fireEvent.change(champ, { target: { value: 'Ce que j’ai mis dix minutes à écrire.' } });
      fireEvent.click(screen.getByText('7'));

      fetchMock.mockResolvedValueOnce(
        json({ ok: false, reason: 'jalon_ferme', error: 'Cette étape n’est pas ouverte.' }, false),
      );
      fireEvent.click(screen.getByText('Envoyer où j’en suis'));

      await waitFor(() => expect(texteRendu()).toContain('Cette étape n’est pas ouverte.'));
      expect(champ.value).toBe('Ce que j’ai mis dix minutes à écrire.');
      expect(document.querySelectorAll('[aria-pressed="true"]').length).toBe(1);
    });

    it('RELIT ce qui a été écrit, et affiche un zéro plutôt que de le taire', async () => {
      fetchMock.mockResolvedValueOnce(
        json(
          assemblage({
            objectifs: [RATIFIE],
            reponsesJalon: [
              {
                id: 'REP_1',
                idObjectif: 'OBJ_1',
                jalon: 'J21',
                texte: 'Je n’ai pas avancé, et ça me pèse.',
                eva: 0,
                creeLe: '2026-08-26T12:00:00.000Z',
              },
            ],
          }),
        ),
      );
      render(<DossierDeuxVoixView token="TOK" />);

      await waitFor(() => expect(texteRendu()).toContain('Je n’ai pas avancé'));
      expect(texteRendu()).toContain('Où vous en étiez (J21)');
      // Le zéro du patient est AFFICHÉ. `reponse.eva &&` l'aurait effacé.
      expect(texteRendu()).toContain('Sur l’échelle : 0');
    });

    it('une réponse sans EVA n’affiche AUCUNE échelle — ni zéro, ni tiret', async () => {
      fetchMock.mockResolvedValueOnce(
        json(
          assemblage({
            objectifs: [RATIFIE],
            reponsesJalon: [
              {
                id: 'REP_2',
                idObjectif: 'OBJ_1',
                jalon: 'J42',
                texte: 'Des mots, sans chiffre.',
                eva: null,
                creeLe: '2026-08-26T12:00:00.000Z',
              },
            ],
          }),
        ),
      );
      render(<DossierDeuxVoixView token="TOK" />);

      await waitFor(() => expect(texteRendu()).toContain('Des mots, sans chiffre.'));
      expect(texteRendu()).not.toContain('Sur l’échelle');
    });

    it('une réponse écrite sur une AUTRE version ne s’affiche pas sous celle-ci', async () => {
      fetchMock.mockResolvedValueOnce(
        json(
          assemblage({
            objectifs: [RATIFIE],
            reponsesJalon: [
              {
                id: 'REP_3',
                idObjectif: 'OBJ_AILLEURS',
                jalon: 'J21',
                texte: 'Un récit qui parle d’un autre texte.',
                eva: null,
                creeLe: '2026-08-26T12:00:00.000Z',
              },
            ],
          }),
        ),
      );
      render(<DossierDeuxVoixView token="TOK" />);

      await waitFor(() => expect(texteRendu()).toContain('Ce que vous avez dit'));
      expect(texteRendu()).not.toContain('Un récit qui parle d’un autre texte.');
    });

    it('ne reproche jamais un silence et ne gradue rien (DC-24, DC-19/DC-20)', async () => {
      fetchMock.mockResolvedValueOnce(
        json(assemblage({ objectifs: [RATIFIE], jalonDu: OUVERTE })),
      );
      render(<DossierDeuxVoixView token="TOK" />);

      await waitFor(() => expect(texteRendu()).toContain('Où en êtes-vous'));
      const rendu = texteRendu().toLowerCase();
      for (const interdit of [
        'score',
        'moyenne',
        'taux',
        'progression',
        'manqué',
        'retard',
        'aurait dû',
        'objectif atteint',
      ]) {
        expect(rendu).not.toContain(interdit);
      }
    });
  });
});
