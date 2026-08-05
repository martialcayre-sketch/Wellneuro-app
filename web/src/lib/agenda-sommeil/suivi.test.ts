import { describe, expect, it } from 'vitest';
import {
  evaluerRelanceDepuisNuits,
  resumerAgendasEnCours,
  type AssignationSuivi,
  type NuitsSuivi,
} from './suivi';

const AUJOURDHUI = '2026-07-30';

function ass(over: Partial<AssignationSuivi> = {}): AssignationSuivi {
  return {
    idAssignation: 'ASS_1',
    idPatient: 'PAT_1',
    titre: 'Agenda du sommeil — 21 nuits',
    dateAssignation: '2026-07-29T08:00:00.000Z',
    dateAssignationJour: '2026-07-29',
    ...over,
  };
}

function resume(assignations: AssignationSuivi[], nuits: [string, NuitsSuivi][] = []) {
  return resumerAgendasEnCours({
    assignations,
    nuitsParAssignation: new Map(nuits),
    noms: new Map([
      ['PAT_1', 'Sophie Nicola'],
      ['PAT_2', 'Jennifer Martin'],
      ['PAT_3', 'Michel Dogné'],
    ]),
    aujourdHui: AUJOURDHUI,
  });
}

describe('resumerAgendasEnCours — les cinq états', () => {
  it('aucune nuit : jamais_commence, relançable passé le délai de grâce', () => {
    const [l] = resume([
      ass({ dateAssignation: '2026-07-26T10:00:00.000Z', dateAssignationJour: '2026-07-26' }),
    ]);
    expect(l.etat).toBe('jamais_commence');
    expect(l.relancable).toBe(true);
    expect(l.nbRenseignees).toBe(0);
    expect(l.dateDebut).toBeNull();
    expect(l.derniereNuitNotee).toBeNull();
    expect(l.joursDepuisDerniereNuit).toBeNull();
    expect(l.joursDepuisAssignation).toBe(4);
  });

  it.each([
    ['le jour même', '2026-07-30', 0, false],
    ['le lendemain', '2026-07-29', 1, false],
    ['le surlendemain', '2026-07-28', 2, true],
  ])(
    'jamais commencé, assigné %s : relançable = %s à J+%d',
    (_libelle, jourAssignation, ecart, attendu) => {
      // La borne exacte du délai de grâce. Sans ce banc, passer le seuil de 2 à
      // 3 jours resterait vert : le test « assigné il y a 4 jours » ne dit rien
      // de l'endroit où la règle bascule.
      const [l] = resume([
        ass({
          dateAssignation: `${jourAssignation}T10:00:00.000Z`,
          dateAssignationJour: jourAssignation,
        }),
      ]);
      expect(l.etat).toBe('jamais_commence');
      expect(l.joursDepuisAssignation).toBe(ecart);
      expect(l.relancable).toBe(attendu);
    },
  );

  it('dernière nuit = aujourd’hui : a_jour, non relançable', () => {
    const [l] = resume(
      [ass()],
      [['ASS_1', { dates: ['2026-07-29', '2026-07-30'], derniereSaisie: null }]],
    );
    expect(l.etat).toBe('a_jour');
    expect(l.relancable).toBe(false);
    expect(l.nbRenseignees).toBe(2);
    expect(l.jourCourant).toBe(2);
  });

  it('dernière nuit = hier : nuit_du_jour_manquante, PAS relançable', () => {
    // LE cas qui a motivé le seuil du 2026-07-31. `estDateSaisissable` accepte
    // la nuit du jour ET celle de la veille : ce patient a jusqu'à demain matin
    // pour noter cette nuit-ci, il n'a rien oublié. L'état reste affiché — le
    // praticien a besoin du fait — mais il n'ouvre plus la relance. Avant, le
    // bouton apparaissait dès 00 h 05 sur un patient parfaitement à jour.
    const [l] = resume([ass()], [['ASS_1', { dates: ['2026-07-29'], derniereSaisie: null }]]);
    expect(l.etat).toBe('nuit_du_jour_manquante');
    expect(l.relancable).toBe(false);
    expect(l.joursDepuisDerniereNuit).toBe(1);
  });

  it.each([
    ['hier', '2026-07-29', 'nuit_du_jour_manquante', false],
    ['avant-hier', '2026-07-28', 'silencieux', true],
  ])(
    'borne du seuil : dernière nuit %s → %s, relançable = %s',
    (_libelle, derniereNuit, etatAttendu, relancable) => {
      // LA borne que ce lot existe pour poser : « deux nuits manquantes, pas
      // une ». Sans ce banc, élargir la branche de `deriverEtat` d'un jour
      // ferait glisser le seuil de 2 à 3 nuits en restant VERT — le test
      // `silencieux` le plus proche est à J-4, il ne dit rien de l'endroit où
      // la règle bascule.
      const [l] = resume([ass()], [['ASS_1', { dates: [derniereNuit], derniereSaisie: null }]]);
      expect(l.etat).toBe(etatAttendu);
      expect(l.relancable).toBe(relancable);
    },
  );

  it('des trous ANTÉRIEURS ne rouvrent pas la relance si la nuit d’hier est notée', () => {
    // Arbitrage explicite du 2026-07-31 : seule la série en cours compte. Ce
    // patient a cinq nuits manquantes dans sa fenêtre mais a noté hier — il est
    // tenu pour actif. Le mauvais remplisseur régulier reste donc invisible
    // ici : manque assumé, verrouillé pour qu'il reste un choix relisible.
    const [l] = resume(
      [ass({ dateAssignationJour: '2026-07-22' })],
      [['ASS_1', { dates: ['2026-07-23', '2026-07-29'], derniereSaisie: null }]],
    );
    expect(l.etat).toBe('nuit_du_jour_manquante');
    expect(l.nbRenseignees).toBe(2);
    expect(l.jourCourant).toBe(8);
    expect(l.relancable).toBe(false);
  });

  it('dernière nuit avant-hier : silencieux, avec l’écart en jours', () => {
    const [l] = resume(
      [ass()],
      [['ASS_1', { dates: ['2026-07-24', '2026-07-26'], derniereSaisie: null }]],
    );
    expect(l.etat).toBe('silencieux');
    expect(l.relancable).toBe(true);
    expect(l.joursDepuisDerniereNuit).toBe(4);
    expect(l.dateDebut).toBe('2026-07-24');
  });

  it('fenêtre écoulée : a_transmettre, JAMAIS relançable', () => {
    // Première nuit le 2026-07-08 → jour 21 le 2026-07-28, aujourd'hui = J23.
    const [l] = resume([ass()], [['ASS_1', { dates: ['2026-07-08'], derniereSaisie: null }]]);
    expect(l.etat).toBe('a_transmettre');
    expect(l.relancable).toBe(false);
    expect(l.jourCourant).toBeNull();
  });

  it('fenêtre écoulée ET nuit du jour notée : a_transmettre gagne (ordre des branches)', () => {
    // La saisie n'est pas bornée à la fenêtre (`estDateSaisissable` ne
    // connaît que J/J-1) : un patient peut encore noter au jour 25. Le geste
    // attendu reste la clôture — l'état hors fenêtre prime sur « à jour ».
    const [l] = resume(
      [ass()],
      [['ASS_1', { dates: ['2026-07-08', '2026-07-30'], derniereSaisie: null }]],
    );
    expect(l.etat).toBe('a_transmettre');
    expect(l.relancable).toBe(false);
  });

  it('borne exacte : jour 21 encore dans la fenêtre, jour 22 hors fenêtre', () => {
    // Ancre 2026-07-10 → 2026-07-30 est le jour 21.
    const [j21] = resume([ass()], [['ASS_1', { dates: ['2026-07-10'], derniereSaisie: null }]]);
    expect(j21.jourCourant).toBe(21);
    expect(j21.etat).toBe('silencieux');
    // Ancre 2026-07-09 → 2026-07-30 est le jour 22.
    const [j22] = resume([ass()], [['ASS_1', { dates: ['2026-07-09'], derniereSaisie: null }]]);
    expect(j22.etat).toBe('a_transmettre');
  });
});

describe('resumerAgendasEnCours — pièges de données réelles', () => {
  it('une correction chaînée ne compte qu’une nuit : 3 dates brutes → 2 distinctes', () => {
    // Cas présent en production : 3 lignes pour 2 nuits (une correction porte
    // la même dateNuit que la ligne supplantée).
    const [l] = resume(
      [ass()],
      [['ASS_1', { dates: ['2026-07-29', '2026-07-29', '2026-07-30'], derniereSaisie: null }]],
    );
    expect(l.nbRenseignees).toBe(2);
    expect(l.etat).toBe('a_jour');
  });

  it('deux agendas ouverts du même patient : deux lignes, clés par assignation', () => {
    const lignes = resume(
      [
        ass({ idAssignation: 'ASS_A', dateAssignation: '2026-07-26T10:00:00.000Z' }),
        ass({ idAssignation: 'ASS_B' }),
      ],
      [['ASS_B', { dates: ['2026-07-30'], derniereSaisie: null }]],
    );
    expect(lignes).toHaveLength(2);
    expect(lignes.map((l) => l.idAssignation).sort()).toEqual(['ASS_A', 'ASS_B']);
    // Les nuits de B ne déteignent pas sur A.
    expect(lignes.find((l) => l.idAssignation === 'ASS_A')?.etat).toBe('jamais_commence');
    expect(lignes.find((l) => l.idAssignation === 'ASS_B')?.etat).toBe('a_jour');
  });

  it('patient inconnu de la carte des noms : ligne conservée, nom vide', () => {
    const [l] = resume([ass({ idPatient: 'PAT_INCONNU' })]);
    expect(l.patient).toBe('');
    expect(l.etat).toBe('jamais_commence');
  });

  it('assignation nocturne : le jour Paris fait foi, pas le jour UTC', () => {
    // Assignée le 30/07 à 00 h 30 heure de Paris = 29/07 22 h 30 UTC. Le jour
    // Paris (fourni par la route via dateJourParis) donne 0 jour d'écart —
    // un slice de l'ISO en donnerait 1 le jour même de l'assignation.
    const [l] = resume([
      ass({ dateAssignation: '2026-07-29T22:30:00.000Z', dateAssignationJour: '2026-07-30' }),
    ]);
    expect(l.joursDepuisAssignation).toBe(0);
  });
});

describe('resumerAgendasEnCours — tri', () => {
  it('ordonne : à transmettre, silencieux (plus ancien d’abord), jamais commencé, nuit manquante, à jour', () => {
    const lignes = resume(
      [
        ass({ idAssignation: 'A_JOUR', idPatient: 'PAT_1' }),
        ass({ idAssignation: 'SILENCE_COURT', idPatient: 'PAT_2' }),
        ass({ idAssignation: 'SILENCE_LONG', idPatient: 'PAT_3' }),
        ass({
          idAssignation: 'JAMAIS',
          idPatient: 'PAT_1',
          dateAssignation: '2026-07-20T08:00:00.000Z',
          dateAssignationJour: '2026-07-20',
        }),
        ass({ idAssignation: 'TRANSMETTRE', idPatient: 'PAT_2' }),
        ass({ idAssignation: 'HIER', idPatient: 'PAT_3' }),
      ],
      [
        ['A_JOUR', { dates: ['2026-07-30'], derniereSaisie: null }],
        ['SILENCE_COURT', { dates: ['2026-07-27'], derniereSaisie: null }],
        ['SILENCE_LONG', { dates: ['2026-07-20'], derniereSaisie: null }],
        ['TRANSMETTRE', { dates: ['2026-07-01'], derniereSaisie: null }],
        ['HIER', { dates: ['2026-07-29'], derniereSaisie: null }],
      ],
    );
    expect(lignes.map((l) => l.idAssignation)).toEqual([
      'TRANSMETTRE',
      'SILENCE_LONG',
      'SILENCE_COURT',
      'JAMAIS',
      'HIER',
      'A_JOUR',
    ]);
  });
});

// Le point d'entrée de la route d'envoi. Le panneau passe par
// `resumerAgendasEnCours` ; la route, elle, ne dispose que des lignes brutes
// d'un `findMany` — c'est le chemin éprouvé ici.
describe('evaluerRelanceDepuisNuits — le prédicat servi à la route', () => {
  const AUJ = { aujourdHui: AUJOURDHUI, dateAssignationJour: '2026-07-22' };

  it('trie les dates avant de lire la dernière nuit', () => {
    // `agendaSommeilNuit.findMany` n'a AUCUN `orderBy` : Postgres rend un ordre
    // arbitraire. Sans le tri, `dates[dates.length - 1]` désignerait une nuit
    // quelconque — ici le 24, qui rendrait `silencieux` (donc relançable) alors
    // que la dernière nuit réelle est celle d'hier.
    expect(
      evaluerRelanceDepuisNuits({ ...AUJ, dates: ['2026-07-26', '2026-07-29', '2026-07-24'] }),
    ).toEqual({ etat: 'nuit_du_jour_manquante', relancable: false });
  });

  it('reste relançable sur un silence, dates désordonnées', () => {
    expect(
      evaluerRelanceDepuisNuits({ ...AUJ, dates: ['2026-07-27', '2026-07-23', '2026-07-25'] }),
    ).toEqual({ etat: 'silencieux', relancable: true });
  });

  it('rend l’état avec le verdict — la route en tire deux messages distincts', () => {
    expect(
      evaluerRelanceDepuisNuits({
        aujourdHui: AUJOURDHUI,
        dateAssignationJour: AUJOURDHUI,
        dates: [],
      }),
    ).toEqual({ etat: 'jamais_commence', relancable: false });
  });
});

// Garde de vocabulaire : la vue sert des faits datés, jamais un score de
// décrochage ni le vocabulaire trois états de SP-MET (différé du registre).
describe('suivi — frontière SP-MET', () => {
  it('le module ne produit ni score ni vocabulaire de la Météo', async () => {
    const fs = await import('node:fs');
    const source = fs.readFileSync(new URL('./suivi.ts', import.meta.url), 'utf8');
    for (const interdit of ["'reguliere'", "'fragile'", "'interrompue'", 'pourcentage', 'score:']) {
      expect(source).not.toContain(interdit);
    }
  });
});
