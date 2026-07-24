import { describe, expect, it } from 'vitest';
import {
  aUneMaterialisationComplements,
  CHECKIN_CATALOGUE_BASE_VERSION,
  CHECKIN_CATALOGUE_VERSION,
  CHECKIN_QUESTIONS,
  ensureReponses,
  optionLibelle,
  QUESTION_OBSERVANCE_COMPLEMENTS,
  QUESTION_OBSERVANCE_COMPLEMENTS_MOTIF,
  resolveCheckinQuestions,
} from './checkinDomain';

const base = {
  adhesion: 'plupart_des_jours',
  tolerance: 'bien',
  energie: 'stable',
  sommeil: 'stable',
} as const;

describe('catalogue gelé préservé + versionnage additif (C4 LOT-05)', () => {
  it('le catalogue de base reste gelé : exactement 4 questions, ids inchangés', () => {
    expect(CHECKIN_QUESTIONS).toHaveLength(4);
    expect(CHECKIN_QUESTIONS.map((q) => q.id)).toEqual(['adhesion', 'tolerance', 'energie', 'sommeil']);
  });

  it('deux versions de catalogue distinctes, la base et l’extension', () => {
    expect(CHECKIN_CATALOGUE_BASE_VERSION).toBe('checkin-catalogue-v1');
    expect(CHECKIN_CATALOGUE_VERSION).toBe('checkin-catalogue-v2-observance-complements');
    expect(CHECKIN_CATALOGUE_VERSION).not.toBe(CHECKIN_CATALOGUE_BASE_VERSION);
  });
});

describe('resolveCheckinQuestions — question conditionnelle et versionnée', () => {
  it('sans matérialisation → question absente, catalogue strictement égal à la base gelée', () => {
    const questions = resolveCheckinQuestions({ materialisationComplements: false });
    expect(questions).toHaveLength(4);
    expect(questions.map((q) => q.id)).toEqual(['adhesion', 'tolerance', 'energie', 'sommeil']);
    expect(questions.some((q) => q.id === 'observance_complements')).toBe(false);
  });

  it('avec matérialisation → la question d’observance (+ motif) s’ajoute, à la fin', () => {
    const questions = resolveCheckinQuestions({ materialisationComplements: true });
    expect(questions).toHaveLength(6);
    expect(questions.map((q) => q.id)).toEqual([
      'adhesion',
      'tolerance',
      'energie',
      'sommeil',
      'observance_complements',
      'observance_complements_motif',
    ]);
  });

  it('le tableau gelé CHECKIN_QUESTIONS n’est jamais muté par la résolution', () => {
    resolveCheckinQuestions({ materialisationComplements: true });
    expect(CHECKIN_QUESTIONS).toHaveLength(4);
  });
});

describe('aUneMaterialisationComplements — condition d’apparition', () => {
  const ref = {
    ingredientId: 'ING_MAGNESIUM',
    ruleId: 'RULE_1',
    ruleVersion: 1,
    justification: 'sommeil fragmenté, forme bisglycinate',
  };

  it('aucune action → false', () => {
    expect(aUneMaterialisationComplements([])).toBe(false);
  });

  it('supplement_exploration SANS référence catalogue (intention seule) → false', () => {
    expect(aUneMaterialisationComplements([{ type: 'supplement_exploration' }])).toBe(false);
  });

  it('supplement_exploration AVEC référence catalogue (matérialisation) → true', () => {
    expect(
      aUneMaterialisationComplements([{ type: 'supplement_exploration', supplementCatalogRef: ref }]),
    ).toBe(true);
  });

  it('une référence sur un type non-compléments ne matérialise rien', () => {
    expect(aUneMaterialisationComplements([{ type: 'food', supplementCatalogRef: ref }])).toBe(false);
  });
});

describe('options fermées, non culpabilisantes (calquées sur adhesion)', () => {
  it('observance : 4 options fermées, verbatim attendu', () => {
    expect(QUESTION_OBSERVANCE_COMPLEMENTS.options.map((o) => o.valeur)).toEqual([
      'pas_encore_commence',
      'quelques_prises',
      'plupart_des_jours',
      'tous_les_jours',
    ]);
    expect(QUESTION_OBSERVANCE_COMPLEMENTS.options.map((o) => o.libelle)).toEqual([
      'Pas encore commencé',
      'Quelques prises',
      'La plupart des jours',
      'Tous les jours',
    ]);
  });

  it('motif facultatif : 4 options fermées', () => {
    expect(QUESTION_OBSERVANCE_COMPLEMENTS_MOTIF.options.map((o) => o.valeur)).toEqual([
      'oubli',
      'gene_digestive',
      'doute',
      'autre',
    ]);
  });

  it('optionLibelle résout les libellés de l’extension C4', () => {
    expect(optionLibelle('observance_complements', 'quelques_prises')).toBe('Quelques prises');
    expect(optionLibelle('observance_complements_motif', 'gene_digestive')).toBe('Gêne digestive');
    expect(optionLibelle('observance_complements', 'valeur_inconnue')).toBeNull();
  });
});

describe('ensureReponses — additif et facultatif, jamais destructif du contrat de base', () => {
  it('4 réponses de base seules → aucune clé d’observance ajoutée', () => {
    const parsed = ensureReponses({ ...base });
    expect(parsed).toEqual(base);
    expect('observance_complements' in parsed).toBe(false);
  });

  it('observance valide → portée telle quelle', () => {
    const parsed = ensureReponses({ ...base, observance_complements: 'quelques_prises' });
    expect(parsed.observance_complements).toBe('quelques_prises');
  });

  it('observance + motif valides → les deux portés', () => {
    const parsed = ensureReponses({
      ...base,
      observance_complements: 'tous_les_jours',
      observance_complements_motif: 'oubli',
    });
    expect(parsed.observance_complements).toBe('tous_les_jours');
    expect(parsed.observance_complements_motif).toBe('oubli');
  });

  it('observance hors options → rejet (jamais silencieusement acceptée)', () => {
    expect(() => ensureReponses({ ...base, observance_complements: 'un_peu' })).toThrow(TypeError);
  });

  it('motif hors options → rejet', () => {
    expect(() =>
      ensureReponses({ ...base, observance_complements: 'tous_les_jours', observance_complements_motif: 'flemme' }),
    ).toThrow(TypeError);
  });

  it('une réponse de base manquante reste rejetée, même si l’observance est fournie', () => {
    const { sommeil: _omis, ...partiel } = base;
    expect(() => ensureReponses({ ...partiel, observance_complements: 'tous_les_jours' })).toThrow(TypeError);
  });
});
