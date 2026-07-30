import { describe, expect, it } from 'vitest';
import { resumerAgendasEnCours, type AssignationSuivi, type NuitsSuivi } from './suivi';

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
  it('aucune nuit : jamais_commence, relançable, avec les jours depuis l’assignation', () => {
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

  it('dernière nuit = hier : nuit_du_jour_manquante, relançable', () => {
    const [l] = resume([ass()], [['ASS_1', { dates: ['2026-07-29'], derniereSaisie: null }]]);
    expect(l.etat).toBe('nuit_du_jour_manquante');
    expect(l.relancable).toBe(true);
    expect(l.joursDepuisDerniereNuit).toBe(1);
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
