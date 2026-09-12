import { describe, expect, it } from 'vitest';
import {
  construireJournalDossier,
  instantLePlusRecent,
  journalPorteDuNeuf,
  libelleDateJournal,
  type EvenementJournal,
  type SourcesJournal,
} from './journalDossier';

// Bancs du JOURNAL DU PORTAIL PATIENT (campagne « vie du portail patient »,
// LOT-01, 2026-09-12).
//
// Ce que ces bancs défendent, et qui n'est pas évident : le journal DÉRIVE, il
// ne coche rien. Deux fautes le rendraient faux sans qu'aucun écran ne le
// montre — laisser passer un brouillon de praticien pour un texte publié, et
// laisser une surface fermée par drapeau produire des lignes. La seconde est la
// plus grave : le journal deviendrait la porte dérobée du portail.

const ENTREE = new Date('2026-06-01T08:00:00.000Z');

function sources(partiel: Partial<SourcesJournal> = {}): SourcesJournal {
  return {
    entreeLe: ENTREE,
    assignations: [],
    bilansTransmis: [],
    synthesesPubliees: null,
    objectifs: null,
    ratifications: null,
    amendements: null,
    demandesCorrection: null,
    reponsesJalon: null,
    entreesCeQuiCompte: null,
    ...partiel,
  };
}

const especes = (s: Partial<SourcesJournal>) => construireJournalDossier(sources(s)).map(e => e.espece);

describe('un dossier neuf — le journal n’est jamais vide', () => {
  it('L’ENTRÉE DANS L’ACCOMPAGNEMENT EST ELLE-MÊME UNE LIGNE (arbitrage 4)', () => {
    // Sans elle, il faudrait écrire un état vide — c'est-à-dire inventer une
    // phrase d'accueil de plus. L'entrée dans le dossier EST un fait du
    // dossier : elle est en base, datée, vraie.
    const journal = construireJournalDossier(sources());
    expect(journal).toHaveLength(1);
    expect(journal[0]).toMatchObject({
      espece: 'entree_accompagnement',
      voix: 'dossier',
      libelle: 'Vous êtes entré dans votre accompagnement.',
      date: '2026-06-01T08:00:00.000Z',
    });
  });

  it('elle est la ligne la plus ANCIENNE, donc la dernière d’une liste anti-chronologique', () => {
    const journal = construireJournalDossier(
      sources({
        assignations: [
          {
            idAssignation: 'ASG_1',
            titre: 'Sommeil',
            dateAssignation: new Date('2026-06-10T09:00:00.000Z'),
            statutReponses: 'a_completer',
            dateDerniereModification: null,
          },
        ],
      }),
    );
    expect(journal.map(e => e.espece)).toEqual(['questionnaire_propose', 'entree_accompagnement']);
  });
});

describe('les drapeaux des surfaces ne se lèvent pas dans le journal', () => {
  it('UNE SURFACE FERMÉE (null) NE PRODUIT AUCUNE LIGNE — jamais une porte dérobée', () => {
    // `null` dit « cette surface n'existe pas pour ce patient ». Si le journal
    // dérivait quand même, il annoncerait une synthèse de compréhension à un
    // patient dont l'écran est clos — un texte du praticien atteignant un
    // patient sans qu'aucune décision l'ait ouvert.
    expect(
      especes({
        synthesesPubliees: null,
        objectifs: null,
        ratifications: null,
        amendements: null,
        demandesCorrection: null,
        reponsesJalon: null,
        entreesCeQuiCompte: null,
      }),
    ).toEqual(['entree_accompagnement']);
  });

  it('une surface OUVERTE MAIS VIDE ([]) ne produit rien non plus, et ce n’est pas la même chose', () => {
    // `[]` dit « la surface existe, il ne s'y est rien passé » (`DC-24`). Le
    // résultat visible est le même ; l'encodage, lui, distingue — et c'est ce
    // qui permettra un jour de dire pourquoi une ligne manque.
    expect(especes({ entreesCeQuiCompte: [], synthesesPubliees: [] })).toEqual(['entree_accompagnement']);
  });
});

describe('ce qui a été REMIS au patient — la voix du praticien', () => {
  it('un questionnaire proposé entre au journal, avec son titre', () => {
    const journal = construireJournalDossier(
      sources({
        assignations: [
          {
            idAssignation: 'ASG_1',
            titre: 'Sommeil',
            dateAssignation: new Date('2026-06-10T09:00:00.000Z'),
            statutReponses: 'non_rempli',
            dateDerniereModification: null,
          },
        ],
      }),
    );
    expect(journal[0]).toMatchObject({
      espece: 'questionnaire_propose',
      voix: 'praticien',
      libelle: 'Un questionnaire vous a été proposé : « Sommeil ».',
    });
  });

  it('une SYNTHÈSE PUBLIÉE est un geste du praticien, datée de sa PUBLICATION', () => {
    const journal = construireJournalDossier(
      sources({ synthesesPubliees: [{ id: 'SYN_1', publieeLe: new Date('2026-07-03T14:00:00.000Z') }] }),
    );
    expect(journal[0]).toMatchObject({
      espece: 'synthese_publiee',
      voix: 'praticien',
      libelle: 'Votre praticien a publié ce qu’il a compris de vous.',
      date: '2026-07-03T14:00:00.000Z',
    });
  });

  it('un bilan TRANSMIS entre au journal — la règle de visibilité est celle de la route', () => {
    const journal = construireJournalDossier(
      sources({ bilansTransmis: [{ id: 'ENV_1', envoyeLe: new Date('2026-07-05T10:00:00.000Z') }] }),
    );
    expect(journal[0]).toMatchObject({ espece: 'bilan_transmis', voix: 'praticien' });
  });

  it('UNE PREMIÈRE VERSION N’EST PAS UNE REFORMULATION', () => {
    // Dire « reformulé » d'une première proposition serait faux du dossier, et
    // le patient le saurait : il n'a rien lu avant.
    const journal = construireJournalDossier(
      sources({
        objectifs: [
          { id: 'OBJ_1', creeLe: new Date('2026-06-20T10:00:00.000Z'), supersedesObjectifId: null },
          { id: 'OBJ_2', creeLe: new Date('2026-06-25T10:00:00.000Z'), supersedesObjectifId: 'OBJ_1' },
        ],
      }),
    );
    expect(journal.map(e => e.espece)).toEqual([
      'objectif_reformule',
      'objectif_propose',
      'entree_accompagnement',
    ]);
    expect(journal[0].libelle).toBe('Votre praticien a reformulé votre objectif.');
    expect(journal[1].libelle).toBe('Votre praticien vous a proposé un objectif.');
  });
});

describe('ce que le patient a fait — sa propre voix', () => {
  it('un questionnaire n’est TRANSMIS qu’une fois VERROUILLÉ', () => {
    // Les quatre autres états disent autre chose : deux qu'il reste à faire,
    // deux qu'il a été rouvert. Compter un questionnaire rouvert comme transmis
    // dirait au patient qu'il a fini une chose qu'on lui a rendue.
    for (const statut of ['non_rempli', 'a_completer', 'modification_demandee', 'deverrouille']) {
      const rendu = especes({
        assignations: [
          {
            idAssignation: 'ASG_1',
            titre: 'Sommeil',
            dateAssignation: new Date('2026-06-10T09:00:00.000Z'),
            statutReponses: statut,
            dateDerniereModification: new Date('2026-06-12T09:00:00.000Z'),
          },
        ],
      });
      expect(rendu, statut).not.toContain('questionnaire_transmis');
    }

    const verrouille = construireJournalDossier(
      sources({
        assignations: [
          {
            idAssignation: 'ASG_1',
            titre: 'Sommeil',
            dateAssignation: new Date('2026-06-10T09:00:00.000Z'),
            statutReponses: 'verrouille',
            dateDerniereModification: new Date('2026-06-12T09:00:00.000Z'),
          },
        ],
      }),
    );
    expect(verrouille[0]).toMatchObject({
      espece: 'questionnaire_transmis',
      voix: 'patient',
      libelle: 'Vous avez transmis vos réponses : « Sommeil ».',
      date: '2026-06-12T09:00:00.000Z',
    });
  });

  it('un questionnaire verrouillé SANS DATE de modification n’entre pas — un fait sans date n’est pas un fait', () => {
    const rendu = especes({
      assignations: [
        {
          idAssignation: 'ASG_1',
          titre: 'Sommeil',
          dateAssignation: new Date('2026-06-10T09:00:00.000Z'),
          statutReponses: 'verrouille',
          dateDerniereModification: null,
        },
      ],
    });
    expect(rendu).toEqual(['questionnaire_propose', 'entree_accompagnement']);
  });

  it('LES MOTS DE L’ÉCRAN DU PATIENT, jamais ceux de la base', () => {
    // Il a cliqué « c'est bien ça » ; il n'a jamais vu « ratifie ».
    const journal = construireJournalDossier(
      sources({
        ratifications: [
          { id: 'R1', sens: 'ratifie', creeLe: new Date('2026-07-01T10:00:00.000Z') },
          { id: 'R2', sens: 'conteste', creeLe: new Date('2026-07-02T10:00:00.000Z') },
        ],
      }),
    );
    expect(journal[1].libelle).toBe('Vous avez répondu que c’était bien ça.');
    expect(journal[0].libelle).toBe('Vous avez répondu que ce n’était pas exactement ça.');
    // Sur les LIBELLÉS seuls : `espece` est un champ machine, que rien
    // n'affiche — c'est le texte servi au patient qui doit rester le sien.
    expect(journal.map(e => e.libelle).join(' ')).not.toMatch(/ratifie|conteste/);
  });

  it('les quatre autres gestes du patient portent sa voix', () => {
    const journal = construireJournalDossier(
      sources({
        amendements: [{ id: 'A1', creeLe: new Date('2026-07-03T10:00:00.000Z') }],
        demandesCorrection: [{ id: 'D1', creeLe: new Date('2026-07-04T10:00:00.000Z') }],
        entreesCeQuiCompte: [{ id: 'E1', creeLe: new Date('2026-07-05T10:00:00.000Z') }],
        reponsesJalon: [{ id: 'J1', jalon: 'J21', creeLe: new Date('2026-07-06T10:00:00.000Z') }],
      }),
    );
    expect(journal.filter(e => e.voix === 'patient').map(e => e.espece)).toEqual([
      'etape_dite',
      'ce_qui_compte_depose',
      'correction_demandee',
      'objectif_dit_autrement',
    ]);
    expect(journal[0].libelle).toBe('Vous avez dit où vous en étiez, à l’étape J21.');
  });

  it('un jalon vide ne produit pas une phrase bancale', () => {
    const journal = construireJournalDossier(
      sources({ reponsesJalon: [{ id: 'J1', jalon: '  ', creeLe: new Date('2026-07-06T10:00:00.000Z') }] }),
    );
    expect(journal[0].libelle).toBe('Vous avez dit où vous en étiez, à une étape.');
  });
});

describe('ordre, clés et discipline du journal', () => {
  it('du plus RÉCENT au plus ancien', () => {
    const journal = construireJournalDossier(
      sources({
        entreesCeQuiCompte: [
          { id: 'E1', creeLe: new Date('2026-07-01T10:00:00.000Z') },
          { id: 'E2', creeLe: new Date('2026-08-01T10:00:00.000Z') },
        ],
      }),
    );
    expect(journal.map(e => e.cle)).toEqual([
      'ce_qui_compte_depose:E2',
      'ce_qui_compte_depose:E1',
      'entree_accompagnement',
    ]);
  });

  it('À DATE ÉGALE L’ORDRE EST STABLE, et ne dépend pas de l’ordre d’arrivée', () => {
    // Deux gestes de la même seconde ne doivent pas changer de place d'un
    // chargement à l'autre : un journal qui se réordonne tout seul se lit comme
    // un journal qui a changé.
    const lignes = [
      { id: 'E2', creeLe: new Date('2026-07-01T10:00:00.000Z') },
      { id: 'E1', creeLe: new Date('2026-07-01T10:00:00.000Z') },
    ];
    const endroit = construireJournalDossier(sources({ entreesCeQuiCompte: lignes })).map(e => e.cle);
    const envers = construireJournalDossier(sources({ entreesCeQuiCompte: [...lignes].reverse() })).map(e => e.cle);
    expect(endroit).toEqual(envers);
    expect(endroit[0]).toBe('ce_qui_compte_depose:E1');
  });

  it('toutes les clés sont uniques, y compris entre espèces', () => {
    const journal = construireJournalDossier(
      sources({
        assignations: [
          {
            idAssignation: 'X1',
            titre: 'Sommeil',
            dateAssignation: new Date('2026-06-10T09:00:00.000Z'),
            statutReponses: 'verrouille',
            dateDerniereModification: new Date('2026-06-12T09:00:00.000Z'),
          },
        ],
        objectifs: [{ id: 'X1', creeLe: new Date('2026-06-20T10:00:00.000Z'), supersedesObjectifId: null }],
        entreesCeQuiCompte: [{ id: 'X1', creeLe: new Date('2026-07-05T10:00:00.000Z') }],
      }),
    );
    expect(new Set(journal.map(e => e.cle)).size).toBe(journal.length);
  });

  it('CHAQUE CLÉ PORTE SON ESPÈCE — sans quoi deux tables aux identifiants voisins se percuteraient', () => {
    // La clé est « l'espèce et la ligne d'origine », et c'est ce qui la rend
    // unique : les identifiants viennent de tables différentes, rien ne garantit
    // qu'ils ne se ressemblent pas. Elle sert aussi de départage à date égale —
    // une clé nue rendrait cet ordre dépendant de la table d'où elle sort.
    const journal = construireJournalDossier(
      sources({
        assignations: [
          {
            idAssignation: 'X1',
            titre: 'Sommeil',
            dateAssignation: new Date('2026-06-10T09:00:00.000Z'),
            statutReponses: 'verrouille',
            dateDerniereModification: new Date('2026-06-12T09:00:00.000Z'),
          },
        ],
        objectifs: [{ id: 'X1', creeLe: new Date('2026-06-20T10:00:00.000Z'), supersedesObjectifId: null }],
        ratifications: [{ id: 'X1', sens: 'ratifie', creeLe: new Date('2026-06-21T10:00:00.000Z') }],
        amendements: [{ id: 'X1', creeLe: new Date('2026-06-22T10:00:00.000Z') }],
        demandesCorrection: [{ id: 'X1', creeLe: new Date('2026-06-23T10:00:00.000Z') }],
        entreesCeQuiCompte: [{ id: 'X1', creeLe: new Date('2026-07-05T10:00:00.000Z') }],
        reponsesJalon: [{ id: 'X1', jalon: 'J21', creeLe: new Date('2026-07-06T10:00:00.000Z') }],
        bilansTransmis: [{ id: 'X1', envoyeLe: new Date('2026-07-07T10:00:00.000Z') }],
        synthesesPubliees: [{ id: 'X1', publieeLe: new Date('2026-07-08T10:00:00.000Z') }],
      }),
    );
    for (const evenement of journal) {
      expect(
        evenement.cle === evenement.espece || evenement.cle.startsWith(`${evenement.espece}:`),
        `${evenement.cle} doit porter l’espèce ${evenement.espece}`,
      ).toBe(true);
    }
    expect(new Set(journal.map(e => e.cle)).size).toBe(journal.length);
  });

  it('AUCUN DÉCOMPTE, AUCUN SCORE ne sort de la dérivation', () => {
    // « 3 questionnaires transmis » ferait d'actes distincts un volume, et le
    // nombre de fois qu'un patient a rempli quelque chose n'est pas une mesure
    // de lui (`DC-19`/`DC-20`).
    const journal = construireJournalDossier(
      sources({
        entreesCeQuiCompte: [
          { id: 'E1', creeLe: new Date('2026-07-01T10:00:00.000Z') },
          { id: 'E2', creeLe: new Date('2026-07-02T10:00:00.000Z') },
          { id: 'E3', creeLe: new Date('2026-07-03T10:00:00.000Z') },
        ],
      }),
    );
    for (const evenement of journal) {
      expect(Object.keys(evenement).sort()).toEqual(['cle', 'date', 'espece', 'libelle', 'voix']);
      expect(evenement.libelle).not.toMatch(/[0-9]/);
    }
  });

  it('une date INVALIDE n’entre pas au journal — elle ne se devine pas', () => {
    const journal = construireJournalDossier(
      sources({ entreesCeQuiCompte: [{ id: 'E1', creeLe: new Date('pas une date') }] }),
    );
    expect(journal.map(e => e.espece)).toEqual(['entree_accompagnement']);
  });
});

// ── LE REPÈRE DE FRAÎCHEUR (LOT-02) ────────────────────────────────────────
//
// Une seule question commande l'affichage : « y a-t-il du neuf ? ». Se tromper
// d'un côté rouvre le journal à chaque chargement et « du neuf » ne veut plus
// rien dire ; se tromper de l'autre le tient fermé sur des faits que le patient
// n'a jamais vus.

const evenement = (date: string, cle = date): EvenementJournal => ({
  cle,
  espece: 'ce_qui_compte_depose',
  voix: 'patient',
  libelle: 'Vous avez dit ce qui compte pour vous.',
  date,
});

describe('instantLePlusRecent', () => {
  it('rend la date du fait le plus récent, quel que soit l’ordre', () => {
    const lignes = [
      evenement('2026-07-01T10:00:00.000Z'),
      evenement('2026-08-01T10:00:00.000Z'),
      evenement('2026-06-01T10:00:00.000Z'),
    ];
    expect(instantLePlusRecent(lignes)).toBe('2026-08-01T10:00:00.000Z');
    expect(instantLePlusRecent([...lignes].reverse())).toBe('2026-08-01T10:00:00.000Z');
  });

  it('rend null sur un journal vide — le cas ne se produit pas, il est traité quand même', () => {
    expect(instantLePlusRecent([])).toBeNull();
  });

  it('sur le journal RÉEL d’un dossier neuf, c’est la date d’entrée', () => {
    const journal = construireJournalDossier(sources());
    expect(instantLePlusRecent(journal)).toBe(ENTREE.toISOString());
  });
});

describe('journalPorteDuNeuf — la seule question qui commande l’affichage', () => {
  it('SANS REPÈRE, TOUT EST NEUF — un patient qui n’a jamais déplié n’a jamais vu', () => {
    // C'est aussi ce qui fait qu'un dossier qui vient de s'ouvrir MONTRE sa
    // première ligne au lieu de la cacher.
    expect(journalPorteDuNeuf([evenement('2026-07-01T10:00:00.000Z')], null)).toBe(true);
    expect(journalPorteDuNeuf(construireJournalDossier(sources()), null)).toBe(true);
  });

  it('un journal vide sans repère ne porte rien — on n’ouvre pas sur du vide', () => {
    expect(journalPorteDuNeuf([], null)).toBe(false);
  });

  it('un fait POSTÉRIEUR au repère est du neuf', () => {
    expect(
      journalPorteDuNeuf(
        [evenement('2026-07-02T10:00:00.000Z')],
        new Date('2026-07-01T10:00:00.000Z'),
      ),
    ).toBe(true);
  });

  it('LA BORNE EST STRICTE — un fait daté EXACTEMENT du repère a été vu', () => {
    // Un `>=` rouvrirait le journal à chaque chargement sur le dernier fait
    // déjà lu, et « du neuf » cesserait de vouloir dire quelque chose.
    expect(
      journalPorteDuNeuf(
        [evenement('2026-07-01T10:00:00.000Z')],
        new Date('2026-07-01T10:00:00.000Z'),
      ),
    ).toBe(false);
  });

  it('un fait ANTÉRIEUR au repère n’est pas du neuf', () => {
    expect(
      journalPorteDuNeuf(
        [evenement('2026-06-01T10:00:00.000Z')],
        new Date('2026-07-01T10:00:00.000Z'),
      ),
    ).toBe(false);
  });

  it('il suffit d’UN fait postérieur au milieu d’anciens', () => {
    expect(
      journalPorteDuNeuf(
        [
          evenement('2026-06-01T10:00:00.000Z'),
          evenement('2026-07-05T10:00:00.000Z'),
          evenement('2026-06-15T10:00:00.000Z'),
        ],
        new Date('2026-07-01T10:00:00.000Z'),
      ),
    ).toBe(true);
  });
});

describe('libelleDateJournal — la date telle que le patient la lit', () => {
  it('écrit le jour, le mois en toutes lettres et l’ANNÉE', () => {
    // Le journal enjambe les années (aucune borne, arbitrage 2) : « 12
    // septembre » seul deviendrait ambigu au premier janvier.
    expect(libelleDateJournal('2026-09-12T10:00:00.000Z')).toBe('12 septembre 2026');
  });

  it('LE JOUR EST CELUI DE PARIS, pas celui d’UTC', () => {
    // 22:30Z le 12 = 00:30 à Paris le 13. Daté en UTC, le journal dirait au
    // patient qu'il a transmis « hier » alors qu'il venait de le faire.
    expect(libelleDateJournal('2026-09-12T22:30:00.000Z')).toBe('13 septembre 2026');
    // Et la borne d'en face : 21:30Z = 23:30 à Paris, encore le 12.
    expect(libelleDateJournal('2026-09-12T21:30:00.000Z')).toBe('12 septembre 2026');
  });

  it('une date illisible rend une chaîne vide, jamais « Invalid Date »', () => {
    expect(libelleDateJournal('pas une date')).toBe('');
  });
});
