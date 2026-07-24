import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma } = vi.hoisted(() => ({
  prisma: {
    cabinetInstrument: { findUnique: vi.fn(), findMany: vi.fn() },
  },
}));

vi.mock('@/lib/prisma', () => ({ prisma }));

import {
  idsAssignablesPour,
  resolveDefinition,
  validerInstrumentCabinet,
} from './instruments';

const DEFINITION_VALIDE = {
  instructions: 'Répondez spontanément.',
  sections: [
    {
      id: 'S1',
      questions: [
        {
          id: 'Q1',
          texte: 'Je dors bien.',
          type: 'likert',
          options: [
            { v: 0, l: 'Jamais' },
            { v: 1, l: 'Parfois' },
            { v: 2, l: 'Souvent' },
          ],
        },
        {
          id: 'Q2',
          texte: 'Je me réveille reposé(e).',
          type: 'likert',
          options: [
            { v: 0, l: 'Jamais' },
            { v: 1, l: 'Parfois' },
            { v: 2, l: 'Souvent' },
          ],
        },
      ],
    },
  ],
};

const SCORING_VALIDE = {
  type: 'sum',
  interpretation: [
    { min: 0, max: 2, label: 'Faible', color: 'success' },
    { min: 3, max: 4, label: 'Modéré', color: 'warning' },
  ],
};

const ROW_CABINET = {
  idInstrument: 'CAB_TEST_1',
  praticienEmail: 'Praticien@wellneuro.fr',
  titre: 'Sommeil cabinet',
  categorie: 'Cabinet',
  description: null,
  definitionJson: DEFINITION_VALIDE,
  scoringJson: { ...SCORING_VALIDE, maxTotal: 4 },
  statutRelecture: 'brouillon',
  actif: true,
};

describe('resolveDefinition', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('catalogue : passthrough sans lecture base, cabinet: false', async () => {
    const def = await resolveDefinition('Q_STR_02');
    expect(def).not.toBeNull();
    expect(def?.titre).toContain('PSS-10');
    expect(def?.cabinet).toBe(false);
    expect(def?.sections.length).toBeGreaterThan(0);
    expect(prisma.cabinetInstrument.findUnique).not.toHaveBeenCalled();
  });

  it('catalogue : id inconnu → null', async () => {
    expect(await resolveDefinition('Q_INCONNU')).toBeNull();
  });

  it('CAB non publié : null par défaut — le chemin patient ne le sert jamais', async () => {
    prisma.cabinetInstrument.findUnique.mockResolvedValue(ROW_CABINET);
    expect(await resolveDefinition('CAB_TEST_1')).toBeNull();
  });

  it('CAB non publié : servi au praticien propriétaire avec inclureNonPublies', async () => {
    prisma.cabinetInstrument.findUnique.mockResolvedValue(ROW_CABINET);
    const def = await resolveDefinition('CAB_TEST_1', {
      praticienEmail: 'praticien@wellneuro.fr', // casse différente : insensitive
      inclureNonPublies: true,
    });
    expect(def).not.toBeNull();
    expect(def?.cabinet).toBe(true);
    expect(def?.titre).toBe('Sommeil cabinet');
    expect(def?.sections[0]?.questions).toHaveLength(2);
  });

  it('CAB non publié : refusé à un autre praticien même avec inclureNonPublies', async () => {
    prisma.cabinetInstrument.findUnique.mockResolvedValue(ROW_CABINET);
    const def = await resolveDefinition('CAB_TEST_1', {
      praticienEmail: 'autre@wellneuro.fr',
      inclureNonPublies: true,
    });
    expect(def).toBeNull();
  });

  it('CAB publié : servi sans options (chemin patient)', async () => {
    prisma.cabinetInstrument.findUnique.mockResolvedValue({
      ...ROW_CABINET,
      statutRelecture: 'valide',
    });
    const def = await resolveDefinition('CAB_TEST_1');
    expect(def?.cabinet).toBe(true);
    expect(def?.scoring).toMatchObject({ type: 'sum', maxTotal: 4 });
  });

  it('CAB désactivé : null même publié', async () => {
    prisma.cabinetInstrument.findUnique.mockResolvedValue({
      ...ROW_CABINET,
      statutRelecture: 'valide',
      actif: false,
    });
    expect(await resolveDefinition('CAB_TEST_1')).toBeNull();
  });

  it('IDOR : un CAB publié n’est PAS servi à un autre praticien', async () => {
    prisma.cabinetInstrument.findUnique.mockResolvedValue({
      ...ROW_CABINET,
      statutRelecture: 'valide',
    });
    const def = await resolveDefinition('CAB_TEST_1', {
      praticienEmail: 'autre@wellneuro.fr',
      inclureNonPublies: true,
    });
    expect(def).toBeNull();
    // Le propriétaire, lui, y accède.
    const defProprietaire = await resolveDefinition('CAB_TEST_1', {
      praticienEmail: 'praticien@wellneuro.fr',
    });
    expect(defProprietaire?.cabinet).toBe(true);
  });

  it('pourPassation : l’assignation fait autorité — servi même dépublié ET désactivé', async () => {
    prisma.cabinetInstrument.findUnique.mockResolvedValue({
      ...ROW_CABINET,
      statutRelecture: 'brouillon',
      actif: false,
    });
    const def = await resolveDefinition('CAB_TEST_1', { pourPassation: true });
    expect(def?.cabinet).toBe(true);
    expect(def?.sections[0]?.questions).toHaveLength(2);
  });

  it('pourPassation : null si la ligne n’existe pas', async () => {
    prisma.cabinetInstrument.findUnique.mockResolvedValue(null);
    expect(await resolveDefinition('CAB_ABSENT', { pourPassation: true })).toBeNull();
  });
});

describe('idsAssignablesPour', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('catalogue ∪ CAB publiés du praticien', async () => {
    prisma.cabinetInstrument.findMany.mockResolvedValue([{ idInstrument: 'CAB_TEST_1' }]);
    const ids = await idsAssignablesPour('praticien@wellneuro.fr');
    expect(ids.has('Q_STR_02')).toBe(true);
    expect(ids.has('CAB_TEST_1')).toBe(true);
    const where = prisma.cabinetInstrument.findMany.mock.calls[0][0].where;
    expect(where.statutRelecture).toBe('valide');
    expect(where.actif).toBe(true);
  });
});

describe('validerInstrumentCabinet', () => {
  it('accepte un instrument complet et rend nbQuestions/scoreMax', () => {
    const verdict = validerInstrumentCabinet({
      titre: 'Sommeil cabinet',
      definition: DEFINITION_VALIDE,
      scoring: SCORING_VALIDE,
    });
    expect(verdict).toEqual({ ok: true, nbQuestions: 2, scoreMax: 4 });
  });

  it('refuse un type de scoring hors sum/sum_reversed/count_threshold', () => {
    const verdict = validerInstrumentCabinet({
      titre: 'Sommeil cabinet',
      definition: DEFINITION_VALIDE,
      scoring: { ...SCORING_VALIDE, type: 'psqi' },
    });
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) {
      expect(verdict.erreurs.join(' ')).toContain('Type de scoring non pris en charge');
    }
  });

  it('refuse des bandes non contiguës', () => {
    const verdict = validerInstrumentCabinet({
      titre: 'Sommeil cabinet',
      definition: DEFINITION_VALIDE,
      scoring: {
        type: 'sum',
        interpretation: [
          { min: 0, max: 1, label: 'Faible', color: 'success' },
          { min: 3, max: 4, label: 'Modéré', color: 'warning' }, // trou : 2 sans bande
        ],
      },
    });
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) {
      expect(verdict.erreurs.join(' ')).toContain('contiguës');
    }
  });

  it('refuse des bandes ne couvrant pas tout l’intervalle possible', () => {
    const verdict = validerInstrumentCabinet({
      titre: 'Sommeil cabinet',
      definition: DEFINITION_VALIDE,
      scoring: {
        type: 'sum',
        interpretation: [{ min: 0, max: 3, label: 'Faible', color: 'success' }], // max possible : 4
      },
    });
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) {
      expect(verdict.erreurs.join(' ')).toContain('score maximal (4)');
    }
  });

  it('sum_reversed : refuse une question inversée inconnue', () => {
    const verdict = validerInstrumentCabinet({
      titre: 'Sommeil cabinet',
      definition: DEFINITION_VALIDE,
      scoring: { ...SCORING_VALIDE, type: 'sum_reversed', reversed: ['Q9'] },
    });
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) {
      expect(verdict.erreurs.join(' ')).toContain('Question inversée inconnue');
    }
  });

  it('count_threshold : exige un seuil entier et couvre 0..nbQuestions', () => {
    const sansSeuil = validerInstrumentCabinet({
      titre: 'Sommeil cabinet',
      definition: DEFINITION_VALIDE,
      scoring: {
        type: 'count_threshold',
        interpretation: [{ min: 0, max: 2, label: 'Repère', color: 'warning' }],
      },
    });
    expect(sansSeuil.ok).toBe(false);
    const avecSeuil = validerInstrumentCabinet({
      titre: 'Sommeil cabinet',
      definition: DEFINITION_VALIDE,
      scoring: {
        type: 'count_threshold',
        threshold: 2,
        interpretation: [{ min: 0, max: 2, label: 'Repère', color: 'warning' }],
      },
    });
    expect(avecSeuil).toEqual({ ok: true, nbQuestions: 2, scoreMax: 2 });
  });

  it('refuse titre trop court, question sans texte, options insuffisantes', () => {
    const verdict = validerInstrumentCabinet({
      titre: 'AB',
      definition: {
        sections: [
          {
            id: 'S1',
            questions: [{ id: 'Q1', texte: 'OK', type: 'likert', options: [{ v: 0, l: 'Non' }] }],
          },
        ],
      },
      scoring: SCORING_VALIDE,
    });
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) {
      const tout = verdict.erreurs.join(' ');
      expect(tout).toContain('titre');
      expect(tout).toContain('entre 3 et 300');
      expect(tout).toContain('entre 2 et 8 options');
    }
  });
});
