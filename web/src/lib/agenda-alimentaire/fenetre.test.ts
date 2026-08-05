import { describe, expect, it } from 'vitest';
import { calculerFenetreAli, calculerFenetreAliDepuisDates, estAvantFinFenetreAli } from './fenetre';
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

/**
 * ── L'ANCRE NE DOIT PAS GLISSER QUAND UNE JOURNÉE PASSE EN QUARANTAINE ──────
 * `listJours` écarte des `jours` toute ligne dont le JSONB n'est pas relisible,
 * mais rend sa DATE (`datesIllisibles`) : la quarantaine porte sur le JSONB,
 * jamais sur la colonne `date_jour`. Sans l'union, la journée la plus ancienne
 * mise en quarantaine sortait du calcul et l'ancre — donc la borne des 21 jours
 * — avançait d'autant.
 */
describe('ancre stable — l’option `datesIllisibles`', () => {
  it('appelée avec `{}`, rend exactement ce que rend l’appel sans option', () => {
    const sans = calculerFenetreAliDepuisDates(['2026-07-20', '2026-07-22'], '2026-07-22');
    const avec = calculerFenetreAliDepuisDates(['2026-07-20', '2026-07-22'], '2026-07-22', {});
    expect(avec).toEqual(sans);
  });

  it('ancre sur la date en quarantaine, sans la compter comme renseignée', () => {
    const f = calculerFenetreAliDepuisDates(['2026-07-21'], '2026-07-21', {
      datesIllisibles: ['2026-07-20'],
    });
    expect(f.dateDebut).toBe('2026-07-20');
    expect(f.emplacements[0]).toMatchObject({ renseignee: false, illisible: true });
    expect(f.emplacements[1]).toMatchObject({ renseignee: true, illisible: false });
    // L'union sert à l'ANCRE, jamais au compte : compter une journée qu'on ne
    // sait pas relire ferait franchir les seuils d'exploitabilité sur du vide.
    expect(f.nbRenseignees).toBe(1);
  });

  it('les deux drapeaux NE SONT PAS exclusifs : append-only, une date porte les deux', () => {
    // Une tête de chaîne relue ET une ligne en quarantaine sur la même date :
    // l'écran doit pouvoir dire « notée, mais toute nouvelle écriture sera
    // refusée ». Un enum remplaçant `renseignee` aurait forcé à mentir.
    const f = calculerFenetreAliDepuisDates(['2026-07-20'], '2026-07-20', {
      datesIllisibles: ['2026-07-20'],
    });
    expect(f.emplacements[0]).toMatchObject({ renseignee: true, illisible: true });
    expect(f.nbRenseignees).toBe(1);
  });

  it('un agenda ENTIÈREMENT en quarantaine garde une fenêtre, et zéro journée renseignée', () => {
    const f = calculerFenetreAliDepuisDates([], '2026-07-21', {
      datesIllisibles: ['2026-07-20'],
    });
    expect(f.dateDebut).toBe('2026-07-20');
    expect(f.emplacements).toHaveLength(NB_JOURS_AGENDA_ALI);
    expect(f.nbRenseignees).toBe(0);
  });

  it('une date illisible POSTÉRIEURE n’avance pas l’ancre et ne crée pas de 22e emplacement', () => {
    const f = calculerFenetreAliDepuisDates(['2026-07-20'], '2026-07-25', {
      // La seconde est à J+26 de l'ancre : hors des 21 emplacements.
      datesIllisibles: ['2026-07-25', '2026-08-15'],
    });
    expect(f.dateDebut).toBe('2026-07-20');
    expect(f.emplacements).toHaveLength(NB_JOURS_AGENDA_ALI);
    expect(f.emplacements[5]).toMatchObject({ dateJour: '2026-07-25', illisible: true });
    expect(f.emplacements.some(e => e.dateJour === '2026-08-15')).toBe(false);
  });

  it('filtre les dates aberrantes de l’union : une ligne illisible ne dicte pas n’importe quelle ancre', () => {
    // `dateDebut` sort d'un tri LEXICOGRAPHIQUE : une chaîne hors format venue
    // d'une ligne qu'on ne sait pas relire reculerait l'ancre sans limite, et
    // toute écriture serait ensuite refusée hors fenêtre.
    const f = calculerFenetreAliDepuisDates([], '2026-07-21', {
      datesIllisibles: ['pouet', '2026-07-20'],
    });
    expect(f.dateDebut).toBe('2026-07-20');
    expect(f.emplacements).toHaveLength(NB_JOURS_AGENDA_ALI);
  });

  it('`jourCourant` et `cloturablePatient` se calculent sur l’ancre STABLE', () => {
    // 2026-07-20 en quarantaine, 2026-07-21 relue, on est au 21e jour de l'ancre
    // stable. L'ancre GLISSANTE disait `false` — le patient se voyait refuser la
    // clôture d'un recueil pourtant arrivé à son terme.
    const stable = calculerFenetreAliDepuisDates(['2026-07-21'], '2026-08-09', {
      datesIllisibles: ['2026-07-20'],
    });
    expect(stable.jourCourant).toBe(21);
    expect(stable.cloturablePatient).toBe(true);

    const glissante = calculerFenetreAliDepuisDates(['2026-07-21'], '2026-08-09');
    expect(glissante.cloturablePatient).toBe(false);
  });

  it('`calculerFenetreAli` transmet l’option à la variante « depuis dates »', () => {
    const f = calculerFenetreAli([ligne('2026-07-21')], '2026-07-21', {
      datesIllisibles: ['2026-07-20'],
    });
    expect(f).toEqual(
      calculerFenetreAliDepuisDates(['2026-07-21'], '2026-07-21', {
        datesIllisibles: ['2026-07-20'],
      }),
    );
    expect(f.dateDebut).toBe('2026-07-20');
  });
});

describe('estAvantFinFenetreAli', () => {
  it('accepte tout quand l’agenda est vide : le premier POST pose l’ancre', () => {
    expect(estAvantFinFenetreAli('2026-07-20', null)).toBe(true);
    expect(estAvantFinFenetreAli('2030-01-01', null)).toBe(true);
  });

  it('borne SUPÉRIEURE inclusive, sur 21 jours', () => {
    const debut = '2026-07-20';
    expect(estAvantFinFenetreAli('2026-07-20', debut)).toBe(true); // J1
    expect(estAvantFinFenetreAli('2026-08-09', debut)).toBe(true); // J21 = debut + 20
    expect(estAvantFinFenetreAli('2026-08-10', debut)).toBe(false); // debut + 21
  });

  // ── AUCUNE BORNE INFÉRIEURE, ET C'EST LE CORRECTIF ─────────────────────────
  // Le prédicat bornait des DEUX côtés. Effet, sur un agenda qui démarre :
  // l'écran ouvre sur aujourd'hui, le patient note, l'ancre vaut J — et noter la
  // veille était alors refusé par « votre recueil couvre déjà ses 21 jours »,
  // alors qu'il en couvrait UNE. D-018 motive la borne par « une 22ᵉ case
  // n'existe jamais » : c'est la FIN de fenêtre qui est en jeu, jamais son début.
  it('accepte une date ANTÉRIEURE à l’ancre : elle la fera reculer', () => {
    const debut = '2026-07-20';
    expect(estAvantFinFenetreAli('2026-07-19', debut)).toBe(true); // debut − 1
  });

  // Le recul est BORNÉ par l'amont, pas par ce prédicat : `estDateSaisissable`
  // ne laisse écrire qu'aujourd'hui ou la veille, donc l'ancre ne recule que
  // d'un jour et seulement au démarrage. Le prédicat, lui, ne prétend rien sur
  // le passé lointain — et ne doit pas : ce serait une seconde borne à tenir
  // d'accord avec la première.
  it('ne rejoue PAS la borne J / J−1 : ce n’est pas son rôle', () => {
    expect(estAvantFinFenetreAli('1900-01-01', '2026-07-20')).toBe(true);
  });
});

describe('calculerFenetreAliDepuisDates — l’ancre RECULE sur une date antérieure', () => {
  // Le pendant du prédicat : accepter la veille ne sert à rien si l'ancre ne
  // bouge pas. `dateDebut` sort du `min` de l'union — écrire la veille rend au
  // patient le premier jour de son recueil, au lieu de lui en coûter un.
  it('noter la veille juste après aujourd’hui recule dateDebut d’un jour', () => {
    const avant = calculerFenetreAliDepuisDates(['2026-07-20'], '2026-07-20');
    expect(avant.dateDebut).toBe('2026-07-20');
    expect(avant.emplacements[20].dateJour).toBe('2026-08-09');

    const apres = calculerFenetreAliDepuisDates(['2026-07-20', '2026-07-19'], '2026-07-20');
    expect(apres.dateDebut).toBe('2026-07-19');
    // La fenêtre ENTIÈRE recule d'un jour : 21 emplacements, jamais 22.
    expect(apres.emplacements).toHaveLength(NB_JOURS_AGENDA_ALI);
    expect(apres.emplacements[20].dateJour).toBe('2026-08-08');
    expect(apres.nbRenseignees).toBe(2);
  });
});
