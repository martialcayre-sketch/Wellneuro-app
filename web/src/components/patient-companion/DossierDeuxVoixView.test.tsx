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
  accordHerite: '2026-08-20T09:00:00.000Z',
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
    // `F2` : les gestes de ratification, servis avec LEUR version. Vides par
    // défaut — un dossier sans geste ancien n'affiche pas le bloc.
    ratifications: [],
    amendements: [],
    // Vides par défaut, même motif que les ratifications : un dossier sans
    // demande n'affiche aucun rappel de demande.
    demandesCorrection: [],
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

  // ── `D-167` — sa parole lui est rendue comme sienne ────────────────────────

  it('DIT que l’énoncé est son propre texte, avec sa date, quand il est cité mot pour mot', async () => {
    fetchMock.mockResolvedValueOnce(
      json(assemblage({
        objectifs: [{ ...OBJECTIF, origineEnonce: { forme: 'depot', date: '2026-09-10T08:56:00.000Z' } }],
      })),
    );
    render(<DossierDeuxVoixView token="TOK" />);

    await waitFor(() => expect(texteRendu()).toContain('Ce que vous avez écrit le'));
    expect(texteRendu()).toContain('repris mot pour mot');
  });

  it('SANS provenance, garde la formulation neutre — jamais « votre praticien a noté »', async () => {
    // Une provenance absente couvre DEUX cas indiscernables : le praticien a
    // rédigé, ou l'objectif précède la constatation de provenance. Affirmer
    // l'un des deux dirait au patient un fait qu'on n'a pas (`DC-24`).
    fetchMock.mockResolvedValueOnce(
      json(assemblage({ objectifs: [{ ...OBJECTIF, origineEnonce: null }] })),
    );
    render(<DossierDeuxVoixView token="TOK" />);

    await waitFor(() => expect(texteRendu()).toContain('Ce que vous avez dit'));
    expect(texteRendu()).not.toContain('mot pour mot');
    expect(texteRendu()).not.toContain('praticien a noté');
  });

  it('un champ ABSENT se lit comme absent — pas comme une origine', async () => {
    // `undefined !== null` est VRAI : avec une comparaison stricte, une réponse
    // plus ancienne ferait planter l'écran du patient.
    fetchMock.mockResolvedValueOnce(json(assemblage()));
    render(<DossierDeuxVoixView token="TOK" />);

    await waitFor(() => expect(texteRendu()).toContain('Ce que vous avez dit'));
  });

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

  // ── LE BLOC QUI SE FERME, ET LE QUATRIÈME VERBE (2026-09-11) ──────────────

  describe('après « c’est bien ça », le bloc se ferme', () => {
    const BOUTON_DEMANDE = 'Demander une correction à mon praticien';
    const etatDe = (etat: string) => ({ ...OBJECTIF, etat });

    it('LES TROIS VERBES DISPARAISSENT — c’est le défaut mesuré sur PAT006', async () => {
      // Deux ratifications identiques à dix secondes d'écart : le patient
      // voyait encore « C'est bien ça » sous sa propre réponse.
      fetchMock.mockResolvedValueOnce(json(assemblage({ objectifs: [etatDe('ratifie')] })));
      render(<DossierDeuxVoixView token="TOK" />);

      await waitFor(() => expect(texteRendu()).toContain('Vous avez répondu'));
      expect(screen.queryByRole('button', { name: 'C’est bien ça' })).toBeNull();
      expect(screen.queryByRole('button', { name: 'Ce n’est pas exactement ça' })).toBeNull();
      expect(screen.queryByRole('button', { name: 'Le dire autrement' })).toBeNull();
    });

    it('LE QUATRIÈME VERBE PREND LEUR PLACE — le patient n’est pas enfermé dans sa réponse', async () => {
      fetchMock.mockResolvedValueOnce(json(assemblage({ objectifs: [etatDe('ratifie')] })));
      render(<DossierDeuxVoixView token="TOK" />);

      await waitFor(() => expect(screen.getByRole('button', { name: BOUTON_DEMANDE })).toBeTruthy());
    });

    it('APRÈS « CE N’EST PAS EXACTEMENT ÇA », LE BLOC RESTE OUVERT — arbitrage du responsable', async () => {
      // Contester appelle déjà une suite du praticien : le patient doit pouvoir
      // se raviser d'un clic, sans passer par une demande de correction.
      fetchMock.mockResolvedValueOnce(json(assemblage({ objectifs: [etatDe('conteste')] })));
      render(<DossierDeuxVoixView token="TOK" />);

      await waitFor(() => expect(screen.getByRole('button', { name: 'C’est bien ça' })).toBeTruthy());
      expect(screen.queryByRole('button', { name: BOUTON_DEMANDE })).toBeNull();
    });

    it('APRÈS « LE DIRE AUTREMENT », LE BLOC RESTE OUVERT AUSSI', async () => {
      fetchMock.mockResolvedValueOnce(json(assemblage({ objectifs: [etatDe('dit_autrement')] })));
      render(<DossierDeuxVoixView token="TOK" />);

      await waitFor(() => expect(screen.getByRole('button', { name: 'C’est bien ça' })).toBeTruthy());
      expect(screen.queryByRole('button', { name: BOUTON_DEMANDE })).toBeNull();
    });

    it('SANS RÉPONSE, les trois verbes sont là et le quatrième ABSENT', async () => {
      fetchMock.mockResolvedValueOnce(json(assemblage({ objectifs: [etatDe('en_attente')] })));
      render(<DossierDeuxVoixView token="TOK" />);

      await waitFor(() => expect(screen.getByRole('button', { name: 'C’est bien ça' })).toBeTruthy());
      expect(screen.queryByRole('button', { name: BOUTON_DEMANDE })).toBeNull();
    });
  });

  describe('le quatrième verbe — « demander une correction »', () => {
    const BOUTON_DEMANDE = 'Demander une correction à mon praticien';
    const RATIFIE = { ...OBJECTIF, etat: 'ratifie' };

    async function ouvrirLaSaisie() {
      fetchMock.mockResolvedValueOnce(json(assemblage({ objectifs: [RATIFIE] })));
      render(<DossierDeuxVoixView token="TOK" />);
      await waitFor(() => expect(screen.getByRole('button', { name: BOUTON_DEMANDE })).toBeTruthy());
      fireEvent.click(screen.getByRole('button', { name: BOUTON_DEMANDE }));
      await waitFor(() =>
        expect(screen.getByLabelText('Qu’est-ce qui ne vous va pas dans cet objectif ?')).toBeTruthy(),
      );
    }

    it('LA SAISIE N’EST JAMAIS PRÉ-REMPLIE — on ne souffle pas au patient ce qui ne va pas', async () => {
      await ouvrirLaSaisie();
      const champ = screen.getByLabelText(
        'Qu’est-ce qui ne vous va pas dans cet objectif ?',
      ) as HTMLTextAreaElement;
      expect(champ.value).toBe('');
    });

    it('LE FACULTATIF EST DIT, ET LE BOUTON RESTE ACTIF SUR UN CHAMP VIDE', async () => {
      // C'est le seul des quatre gestes dans ce cas. Un bouton désactivé
      // contredirait la phrase juste au-dessus et rendrait le « facultatif »
      // mensonger.
      await ouvrirLaSaisie();
      expect(texteRendu()).toContain('sans rien écrire');
      const envoyer = screen.getByRole('button', { name: 'Envoyer ma demande' }) as HTMLButtonElement;
      expect(envoyer.disabled).toBe(false);
    });

    it('poste le geste NOMMÉ, sans identifiant patient ni date', async () => {
      await ouvrirLaSaisie();
      fetchMock.mockResolvedValueOnce(json({ ok: true, demandeCorrection: { id: 'DEM_1' } }));
      fetchMock.mockResolvedValueOnce(json(assemblage({ objectifs: [RATIFIE] })));
      fireEvent.change(screen.getByLabelText('Qu’est-ce qui ne vous va pas dans cet objectif ?'), {
        target: { value: 'Ce n’est pas le sommeil, c’est la fatigue.' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Envoyer ma demande' }));

      await waitFor(() => expect(fetchMock.mock.calls.length).toBeGreaterThan(1));
      const envoi = fetchMock.mock.calls.find(
        (appel) => (appel[1] as { method?: string } | undefined)?.method === 'POST',
      );
      const corps = JSON.parse(String((envoi as [string, { body?: string }])[1].body));
      expect(corps).toEqual({
        geste: 'demande_correction',
        idObjectif: OBJECTIF.id,
        texte: 'Ce n’est pas le sommeil, c’est la fatigue.',
      });
    });

    it('ENVOIE MÊME VIDE — et c’est le serveur qui replie le blanc sur `null`', async () => {
      await ouvrirLaSaisie();
      fetchMock.mockResolvedValueOnce(json({ ok: true, demandeCorrection: { id: 'DEM_1' } }));
      fetchMock.mockResolvedValueOnce(json(assemblage({ objectifs: [RATIFIE] })));
      fireEvent.click(screen.getByRole('button', { name: 'Envoyer ma demande' }));

      await waitFor(() => expect(fetchMock.mock.calls.length).toBeGreaterThan(1));
      const envoi = fetchMock.mock.calls.find(
        (appel) => (appel[1] as { method?: string } | undefined)?.method === 'POST',
      );
      const corps = JSON.parse(String((envoi as [string, { body?: string }])[1].body));
      expect(corps.texte).toBe('');
      expect(corps.geste).toBe('demande_correction');
    });

    it('L’ACCUSÉ N’EST PAS CELUI DES TROIS AUTRES — ce geste attend une suite', async () => {
      await ouvrirLaSaisie();
      fetchMock.mockResolvedValueOnce(json({ ok: true, demandeCorrection: { id: 'DEM_1' } }));
      fetchMock.mockResolvedValueOnce(json(assemblage({ objectifs: [RATIFIE] })));
      fireEvent.click(screen.getByRole('button', { name: 'Envoyer ma demande' }));

      await waitFor(() => expect(texteRendu()).toContain('Votre demande est transmise'));
      // SONDE DISTINCTIVE : « reprendra cet objectif avec vous » figure DÉJÀ
      // dans le bloc fermé, en permanence. La sonder aurait laissé passer un
      // accusé recopié d'un autre geste — une mutation l'a montré.
      expect(texteRendu()).not.toContain('tel que vous l’avez indiqué');
    });

    it('SUR UN REFUS, le texte reste à l’écran — personne d’autre ne peut le réécrire', async () => {
      await ouvrirLaSaisie();
      fetchMock.mockResolvedValueOnce(
        json({ ok: false, reason: 'texte_trop_long', error: 'Votre texte dépasse 4000 caractères.' }, false),
      );
      fireEvent.change(screen.getByLabelText('Qu’est-ce qui ne vous va pas dans cet objectif ?'), {
        target: { value: 'mes mots à moi' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Envoyer ma demande' }));

      await waitFor(() => expect(texteRendu()).toContain('Votre texte dépasse'));
      const champ = screen.getByLabelText(
        'Qu’est-ce qui ne vous va pas dans cet objectif ?',
      ) as HTMLTextAreaElement;
      expect(champ.value).toBe('mes mots à moi');
    });

    it('RELIT une demande déjà posée, avec sa date', async () => {
      fetchMock.mockResolvedValueOnce(
        json(
          assemblage({
            objectifs: [RATIFIE],
            demandesCorrection: [
              {
                id: 'DEM_1',
                idObjectif: OBJECTIF.id,
                texte: 'Ce n’est pas le sommeil.',
                creeLe: '2026-09-11T18:20:00.000Z',
              },
            ],
          }),
        ),
      );
      render(<DossierDeuxVoixView token="TOK" />);

      await waitFor(() => expect(texteRendu()).toContain('Vous avez demandé une correction'));
      expect(texteRendu()).toContain('11 septembre 2026');
      expect(texteRendu()).toContain('Ce n’est pas le sommeil.');
    });

    it('UNE DEMANDE SANS TEXTE N’INVENTE AUCUNE PHRASE — le geste est dit, et c’est tout', async () => {
      fetchMock.mockResolvedValueOnce(
        json(
          assemblage({
            objectifs: [RATIFIE],
            demandesCorrection: [
              { id: 'DEM_1', idObjectif: OBJECTIF.id, texte: null, creeLe: '2026-09-11T18:20:00.000Z' },
            ],
          }),
        ),
      );
      render(<DossierDeuxVoixView token="TOK" />);

      await waitFor(() => expect(texteRendu()).toContain('Vous avez demandé une correction'));
      for (const interdit of ['null', 'undefined', 'Aucun texte']) {
        expect(texteRendu()).not.toContain(interdit);
      }
    });

    it('une demande portée sur une AUTRE version ne s’affiche pas sous celle-ci', async () => {
      fetchMock.mockResolvedValueOnce(
        json(
          assemblage({
            objectifs: [RATIFIE],
            demandesCorrection: [
              {
                id: 'DEM_0',
                idObjectif: 'OBJ_AILLEURS',
                texte: 'sur une version d’avant',
                creeLe: '2026-09-01T10:00:00.000Z',
              },
            ],
          }),
        ),
      );
      render(<DossierDeuxVoixView token="TOK" />);

      await waitFor(() => expect(texteRendu()).toContain('Vous avez répondu'));
      expect(texteRendu()).not.toContain('sur une version d’avant');
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

      // PAS SOUS CETTE VERSION — mais il n'a pas disparu pour autant : il est
      // rendu à part, sous son propre libellé. Ce cas ASSERTAIT LA DISPARITION
      // (relevé en revue du LOT-05) : il verrouillait le défaut qu'il aurait dû
      // interdire. Le voisinage compte, pas seulement la présence.
      const rendu = texteRendu();
      const positionTexte = rendu.indexOf('Un récit qui parle d’un autre texte.');
      expect(positionTexte).toBeGreaterThan(-1);
      expect(rendu.indexOf('sur une formulation précédente')).toBeLessThan(positionTexte);
    });

    it('MAIS IL NE DISPARAÎT PAS : le patient relit son récit après une reformulation', async () => {
      // Le scénario complet : le patient ratifie `v1`, raconte où il en est,
      // le praticien reformule en `v2`. La route ne sert que les TÊTES — donc
      // `v1` n'est plus à l'écran. Ce que le patient a écrit doit rester
      // lisible : le praticien, lui, continue de le voir au cockpit.
      fetchMock.mockResolvedValueOnce(
        json(
          assemblage({
            objectifs: [{ ...RATIFIE, id: 'OBJ_2', enoncePatient: 'La version reformulée.' }],
            reponsesJalon: [
              {
                id: 'REP_4',
                idObjectif: 'OBJ_1',
                jalon: 'J21',
                texte: 'Ce que j’avais mis dix minutes à écrire.',
                eva: 7,
                creeLe: '2026-08-26T12:00:00.000Z',
              },
            ],
          }),
        ),
      );
      render(<DossierDeuxVoixView token="TOK" />);

      await waitFor(() => expect(texteRendu()).toContain('Ce que j’avais mis dix minutes à écrire.'));
      expect(texteRendu()).toContain('sur une formulation précédente');
      // SANS le jalon ni l'EVA sur ce bloc : rattacher « J21 » à un texte qui
      // n'est plus à l'écran demanderait au patient de reconstituer par rapport
      // à quoi il se situait.
      expect(texteRendu()).not.toContain('Où vous en étiez (J21)');
    });

    it('HORS FENÊTRE, le motif du serveur est DIT — pas un écran vide', async () => {
      // `jalonObjectifDu` écrit vouloir empêcher exactement cela : « un écran
      // qui n'affiche simplement rien laisse croire à une panne ». Le motif
      // traversait l'API sans être rendu (relevé en revue).
      fetchMock.mockResolvedValueOnce(
        json(
          assemblage({
            objectifs: [RATIFIE],
            jalonDu: {
              statut: 'aucune',
              motif: 'Aucune étape n’est ouverte aujourd’hui. La prochaine le sera à sa date.',
            },
          }),
        ),
      );
      render(<DossierDeuxVoixView token="TOK" />);

      await waitFor(() =>
        expect(texteRendu()).toContain('Aucune étape n’est ouverte aujourd’hui'),
      );
      // Et toujours pas de champ de saisie : dire pourquoi n'ouvre rien.
      expect(screen.queryByText('Envoyer où j’en suis')).toBeNull();
    });

    it('le motif n’est pas servi à qui n’a pas encore répondu à son objectif', async () => {
      // Mêmes conditions d'invitation que la question : annoncer une étape à
      // venir à quelqu'un à qui l'on n'a pas encore demandé si l'objectif était
      // le sien parlerait d'un calendrier avant de parler de l'objectif.
      fetchMock.mockResolvedValueOnce(
        json(
          assemblage({
            jalonDu: { statut: 'aucune', motif: 'Les étapes de ce suivi sont derrière vous.' },
          }),
        ),
      );
      render(<DossierDeuxVoixView token="TOK" />);

      await waitFor(() => expect(texteRendu()).toContain('Ce que vous avez dit'));
      expect(texteRendu()).not.toContain('Les étapes de ce suivi sont derrière vous.');
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

  it('F2 — UN GESTE POSÉ SUR UNE VERSION REFORMULÉE DEPUIS reste lisible, à sa place', async () => {
    // Un clic n'est pas un texte : il ne laissait AUCUNE trace à l'écran, là où
    // un amendement en laissait une. Le patient contestait, lisait « C'est
    // transmis », et retrouvait au rechargement « vous ne vous êtes pas encore
    // prononcé » — son geste avait été accepté ET rendu invisible.
    fetchMock.mockResolvedValueOnce(json(assemblage({
      objectifs: [{ ...OBJECTIF, id: 'OBJ_2', etat: 'en_attente' }],
      ratifications: [
        { id: 'RAT_1', idObjectif: 'OBJ_1', sens: 'conteste', creeLe: '2026-09-01T10:00:00.000Z' },
      ],
    })));
    render(<DossierDeuxVoixView token="TOK" />);

    await waitFor(() =>
      expect(texteRendu()).toContain('Vous vous étiez prononcé sur une formulation précédente'));
    // LES MOTS DE L'ÉCRAN, pas la valeur de la base : le patient a cliqué
    // « pas exactement ça », il n'a jamais vu « conteste ».
    expect(texteRendu()).toContain('pas exactement ça');
    expect(texteRendu()).not.toContain('conteste');
  });

  it('F2 — SANS TRANSFERT : l’état de la version courante ne bouge pas', async () => {
    // Reporter un ancien geste sur une formulation reformulée depuis ferait
    // ratifier au patient des mots qu'il n'a pas lus.
    fetchMock.mockResolvedValueOnce(json(assemblage({
      objectifs: [{ ...OBJECTIF, id: 'OBJ_2', etat: 'en_attente' }],
      ratifications: [
        { id: 'RAT_1', idObjectif: 'OBJ_1', sens: 'ratifie', creeLe: '2026-09-01T10:00:00.000Z' },
      ],
    })));
    render(<DossierDeuxVoixView token="TOK" />);

    await waitFor(() =>
      expect(texteRendu()).toContain('Vous vous étiez prononcé sur une formulation précédente'));
    expect(texteRendu()).not.toContain('C’est bien ça, je m’y retrouve');
  });

  it('un geste sur la version COURANTE ne s’affiche pas dans le bloc des anciens', async () => {
    fetchMock.mockResolvedValueOnce(json(assemblage({
      ratifications: [
        { id: 'RAT_1', idObjectif: OBJECTIF.id, sens: 'ratifie', creeLe: '2026-09-01T10:00:00.000Z' },
      ],
    })));
    render(<DossierDeuxVoixView token="TOK" />);

    await waitFor(() => expect(texteRendu()).toContain('Ce sur quoi nous travaillons'));
    expect(texteRendu()).not.toContain('Vous vous étiez prononcé sur une formulation précédente');
  });

});

// ── LA SECONDE VOIX, REMONTÉE SOUS L'ÉNONCÉ ─────────────────────────────────
describe('DossierDeuxVoixView — la seconde voix', () => {
  const attendre = async (payload: unknown) => {
    fetchMock.mockResolvedValueOnce(json(payload));
    render(<DossierDeuxVoixView token="jeton" />);
    await waitFor(() => expect(texteRendu()).toContain('Ce que votre praticien a compris de vous'));
  };

  it('la compréhension publiée est rendue DANS la carte de l’objectif', async () => {
    // La page s'appelle « dossier à deux voix » : depuis le retrait du champ de
    // reformulation, la seconde n'y était plus.
    await attendre(assemblage({ objectifs: [{ ...OBJECTIF, reformulationPraticien: null }] }));
    expect(texteRendu()).toContain('Vous venez pour un sommeil qui se casse au milieu de la nuit.');
  });

  it('C’EST UN DÉPLACEMENT, PAS UNE COPIE — le texte n’apparaît qu’UNE fois', async () => {
    await attendre(assemblage({ objectifs: [{ ...OBJECTIF, reformulationPraticien: null }] }));
    const occurrences = texteRendu().split(SYNTHESE.texte).length - 1;
    expect(occurrences).toBe(1);
    expect(texteRendu()).toContain('Ce texte est repris plus haut, sous votre objectif.');
  });

  it('SANS OBJECTIF, la section basse rend le texte comme avant', async () => {
    fetchMock.mockResolvedValueOnce(json(assemblage({ objectifs: [] })));
    render(<DossierDeuxVoixView token="jeton" />);
    await waitFor(() => expect(texteRendu()).toContain(SYNTHESE.texte));
    expect(texteRendu()).not.toContain('Ce texte est repris plus haut');
  });

  it('SANS COMPRÉHENSION PUBLIÉE, rien ne remonte — et aucun titre orphelin', async () => {
    fetchMock.mockResolvedValueOnce(
      json(assemblage({ comprehension: { synthese: null, desaccords: [] } })),
    );
    render(<DossierDeuxVoixView token="jeton" />);
    await waitFor(() => expect(texteRendu()).toContain('Je voudrais me réveiller'));
    expect(texteRendu()).not.toContain('Ce que votre praticien a compris de vous ·');
    expect(texteRendu()).not.toContain('Ce texte est repris plus haut');
  });

  it('la date remontée dit son VRAI nom — publié, et non écrit', async () => {
    // « Écrit le » sur une date de PUBLICATION attribuerait au praticien une
    // déclaration qu'il n'a pas faite. `redigeeLe` est null ici.
    await attendre(assemblage({ objectifs: [{ ...OBJECTIF, reformulationPraticien: null }] }));
    expect(texteRendu()).toContain('publié le 20 août 2026');
    expect(texteRendu()).not.toContain('écrit le 20 août 2026');
  });

  it('UNE SEULE FOIS, et non sous chaque version concurrente', async () => {
    // Il n'y a qu'une compréhension publiée par dossier, alors qu'il peut y
    // avoir deux têtes : la rendre sous chacune la ferait dire qu'elle répond
    // à chacune.
    await attendre(
      assemblage({
        objectifs: [
          { ...OBJECTIF, reformulationPraticien: null },
          { ...OBJECTIF, id: 'OBJ_2', reformulationPraticien: null },
        ],
      }),
    );
    const occurrences = texteRendu().split(SYNTHESE.texte).length - 1;
    expect(occurrences).toBe(1);
  });
});
