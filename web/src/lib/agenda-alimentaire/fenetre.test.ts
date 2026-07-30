import { describe, expect, it } from 'vitest';
import { calculerFenetreAli, calculerFenetreAliDepuisDates } from './fenetre';
import { NB_JOURS_AGENDA_ALI, type JourRow } from './types';

function ligne(dateJour: string, over: Partial<JourRow> = {}): JourRow {
  return {
    id: `L_${dateJour}`,
    idPatient: 'PAT_TEST',
    idAssignation: 'ASS_1',
    dateJour,
    reponses: { aucunePrise: true },
    canal: 'portail',
    supersedesJourId: null,
    soumisLe: `${dateJour}T08:00:00.000Z`,
    ...over,
  };
}

describe('calculerFenetreAli — l’ancrage sur le premier jour saisi', () => {
  it('rend une fenêtre vide sans aucune saisie — la première l’amorcera', () => {
    const f = calculerFenetreAli([], '2026-07-30');
    expect(f.dateDebut).toBeNull();
    expect(f.emplacements).toEqual([]);
    expect(f.jourCourant).toBeNull();
    expect(f.cloturablePatient).toBe(false);
  });

  // Un démarrage tardif n'ampute pas le recueil : c'est la première saisie qui
  // ancre, pas la date d'assignation.
  it('ancre sur le premier jour saisi et déroule 21 emplacements', () => {
    const f = calculerFenetreAli([ligne('2026-07-20'), ligne('2026-07-22')], '2026-07-22');
    expect(f.dateDebut).toBe('2026-07-20');
    expect(f.emplacements).toHaveLength(NB_JOURS_AGENDA_ALI);
    expect(f.emplacements[0].dateJour).toBe('2026-07-20');
    expect(f.emplacements[20].dateJour).toBe('2026-08-09');
  });

  it('marque les emplacements renseignés, et laisse les trous visibles', () => {
    const f = calculerFenetreAli([ligne('2026-07-20'), ligne('2026-07-22')], '2026-07-22');
    expect(f.emplacements[0].renseignee).toBe(true);
    expect(f.emplacements[1].renseignee).toBe(false); // le trou du 21
    expect(f.emplacements[2].renseignee).toBe(true);
    expect(f.nbRenseignees).toBe(2);
  });

  it('situe aujourd’hui dans la fenêtre, et nulle part en dehors', () => {
    expect(calculerFenetreAli([ligne('2026-07-20')], '2026-07-20').jourCourant).toBe(1);
    expect(calculerFenetreAli([ligne('2026-07-20')], '2026-07-25').jourCourant).toBe(6);
    expect(calculerFenetreAli([ligne('2026-07-20')], '2026-08-10').jourCourant).toBeNull();
    expect(calculerFenetreAli([ligne('2026-07-20')], '2026-07-19').jourCourant).toBeNull();
  });
});

describe('cloturablePatient', () => {
  it('reste fermée avant le 21e jour', () => {
    expect(calculerFenetreAli([ligne('2026-07-20')], '2026-08-08').cloturablePatient).toBe(false);
  });

  it('s’ouvre le 21e jour et le reste au-delà', () => {
    expect(calculerFenetreAli([ligne('2026-07-20')], '2026-08-09').cloturablePatient).toBe(true);
    expect(calculerFenetreAli([ligne('2026-07-20')], '2026-09-01').cloturablePatient).toBe(true);
  });
});

describe('calculerFenetreAliDepuisDates', () => {
  // Une correction porte la même date que la ligne qu'elle supplante : passer
  // les dates brutes, sans résoudre les chaînes, donne donc la même fenêtre.
  it('déduplique les dates d’une chaîne de correction', () => {
    const f = calculerFenetreAliDepuisDates(['2026-07-20', '2026-07-20', '2026-07-21'], '2026-07-21');
    expect(f.nbRenseignees).toBe(2);
    expect(f.dateDebut).toBe('2026-07-20');
  });

  it('ancre sur la plus ancienne, quel que soit l’ordre reçu', () => {
    const f = calculerFenetreAliDepuisDates(['2026-07-25', '2026-07-20'], '2026-07-25');
    expect(f.dateDebut).toBe('2026-07-20');
  });
});
