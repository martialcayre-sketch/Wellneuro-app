import { describe, expect, it } from 'vitest';
import {
  MIN_JOURNEES_PROFIL,
  MIN_TYPES_DISTINCTS_PROFIL,
  couvertureJournees,
  createJourneeRepere,
  estWeekEnd,
  joursObservables,
  typeJourneeParDefaut,
} from './journee';
import type { JourneeRepere, TypeJournee } from './types';

function journee(overrides: Partial<Parameters<typeof createJourneeRepere>[0]> = {}): JourneeRepere {
  return createJourneeRepere({
    journeeId: 'j1',
    episodeId: 'ja_PAT_cycle',
    localDate: '2026-07-28',
    typeJournee: 'travail_matin',
    nombrePrises: 3,
    momentsObserves: ['matin', 'midi'],
    contexte: 'domicile',
    ...overrides,
  });
}

describe('estWeekEnd — dérivation calendaire', () => {
  it('reconnaît samedi et dimanche, et eux seuls', () => {
    expect(estWeekEnd('2026-07-25')).toBe(true);  // samedi
    expect(estWeekEnd('2026-07-26')).toBe(true);  // dimanche
    expect(estWeekEnd('2026-07-27')).toBe(false); // lundi
    expect(estWeekEnd('2026-07-24')).toBe(false); // vendredi
  });

  it('refuse une date qui n’en est pas une', () => {
    expect(() => estWeekEnd('28/07/2026')).toThrow(TypeError);
  });

  it('ne propose qu’un défaut : le type déclaré prime', () => {
    expect(typeJourneeParDefaut('2026-07-25')).toBe('week_end');
    // Un samedi de poste reste une journée de travail — le patient est seul à
    // le savoir, et sa déclaration n'est pas corrigée par le calendrier.
    const samediTravaille = journee({ localDate: '2026-07-25', typeJournee: 'travail_matin' });
    expect(samediTravaille.typeJournee).toBe('travail_matin');
  });
});

describe('createJourneeRepere', () => {
  it('refuse « rien de particulier » assorti d’observations', () => {
    expect(() => journee({ rienDeParticulier: true })).toThrow(/deux réponses différentes/);
  });

  it('accepte « rien de particulier » seul — c’est une réponse, pas une absence', () => {
    const vide = createJourneeRepere({
      journeeId: 'j2',
      episodeId: 'ja_PAT_cycle',
      localDate: '2026-07-28',
      typeJournee: 'repos',
      rienDeParticulier: true,
    });
    expect(vide.rienDeParticulier).toBe(true);
    expect(vide.momentsObserves).toEqual([]);
    expect(vide.nombrePrises).toBeUndefined();
  });

  it('refuse un moment, un contexte ou un marqueur hors registre', () => {
    expect(() => journee({ momentsObserves: ['nuit'] })).toThrow(/Moment de prise inconnu/);
    expect(() => journee({ contexte: 'au bureau' })).toThrow(/Contexte inconnu/);
    expect(() => journee({ marqueursPresents: ['quinoa'] })).toThrow(/hors registre pilote/);
  });

  it('refuse un nombre de prises hors bornes', () => {
    expect(() => journee({ nombrePrises: 9 })).toThrow(/entier de 0 à 8/);
    expect(() => journee({ nombrePrises: -1 })).toThrow(/entier de 0 à 8/);
    expect(journee({ nombrePrises: 0 }).nombrePrises).toBe(0);
  });
});

describe('couvertureJournees — compte ET composition', () => {
  const troisJoursMemeType = (['2026-07-27', '2026-07-28', '2026-07-29'] as const)
    .map((d, i) => journee({ journeeId: `j${i}`, localDate: d, typeJournee: 'travail_matin' }));

  it('un COMPTE suffisant ne suffit pas', () => {
    const couverture = couvertureJournees(troisJoursMemeType);
    expect(couverture.compte).toBeGreaterThanOrEqual(MIN_JOURNEES_PROFIL);
    expect(couverture.typesCouverts).toHaveLength(1);
    expect(couverture.profilPossible).toBe(false);
  });

  it('une COMPOSITION suffisante ne suffit pas non plus', () => {
    const deuxTypes = [
      journee({ journeeId: 'a', localDate: '2026-07-27', typeJournee: 'travail_matin' }),
      journee({ journeeId: 'b', localDate: '2026-07-28', typeJournee: 'repos' }),
    ];
    const couverture = couvertureJournees(deuxTypes);
    expect(couverture.typesCouverts.length).toBeGreaterThanOrEqual(MIN_TYPES_DISTINCTS_PROFIL);
    expect(couverture.compte).toBeLessThan(MIN_JOURNEES_PROFIL);
    expect(couverture.profilPossible).toBe(false);
  });

  it('les deux ensemble ouvrent le profil', () => {
    const melange = [
      ...troisJoursMemeType,
      journee({ journeeId: 'd', localDate: '2026-07-30', typeJournee: 'repos' }),
    ];
    expect(couvertureJournees(melange).profilPossible).toBe(true);
  });

  it('deux descriptions du même jour ne comptent qu’une fois', () => {
    const doublon = [
      journee({ journeeId: 'a', localDate: '2026-07-28' }),
      journee({ journeeId: 'b', localDate: '2026-07-28' }),
    ];
    expect(couvertureJournees(doublon).compte).toBe(1);
  });

  it('rend les types absents, jamais un zéro déguisé', () => {
    const couverture = couvertureJournees([]);
    expect(couverture.compte).toBe(0);
    expect(couverture.typesCouverts).toEqual([]);
    expect(couverture.typesAbsents).toHaveLength(4);
    expect(couverture.profilPossible).toBe(false);
  });
});

describe('joursObservables', () => {
  it('s’arrête à aujourd’hui — un jour à venir n’est pas un jour sans trace', () => {
    const jours = joursObservables('2026-07-27', '2026-08-16', '2026-07-29');
    expect(jours).toEqual(['2026-07-27', '2026-07-28', '2026-07-29']);
  });

  it('s’arrête à la fin de fenêtre quand elle est passée', () => {
    expect(joursObservables('2026-07-27', '2026-07-28', '2026-09-01')).toHaveLength(2);
  });

  it('rend une liste vide avant le début de la fenêtre', () => {
    expect(joursObservables('2026-08-01', '2026-08-21', '2026-07-28')).toEqual([]);
  });
});

// Le domaine ne doit pas se mettre à qualifier : les quatre types restent des
// faits déclarés, sans hiérarchie ni valeur.
describe('types de journée', () => {
  it('n’ordonne ni ne note les types', () => {
    const types: TypeJournee[] = ['travail_matin', 'travail_apres_midi', 'repos', 'week_end'];
    types.forEach(t => expect(journee({ typeJournee: t }).typeJournee).toBe(t));
  });
});
