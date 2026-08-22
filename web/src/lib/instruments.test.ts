import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma } = vi.hoisted(() => ({
  prisma: {
    cabinetInstrument: { findUnique: vi.fn(), findMany: vi.fn() },
  },
}));

vi.mock('@/lib/prisma', () => ({ prisma }));

import {
  LABEL_GRILLE_A_DEFINIR,
  TYPE_SCORING_SANS_INTERPRETATION,
  idsAssignablesPour,
  interditTouteBande,
  resolveDefinition,
  scoringParDefaut,
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

  // Les deux bancs qui suivent portent sur l'EXISTANT : ils étaient asserté
  // nulle part avant le LOT-05 Alliance 6.0-A, alors que ce sont les deux
  // frontières que le type de scoring « sans interprétation » (`D-088`) vient
  // longer. Ils sont posés d'abord, verts sur le code d'avant.
  it('refuse une grille VIDE sur un type interprété — la couverture n’est pas optionnelle', () => {
    const verdict = validerInstrumentCabinet({
      titre: 'Sommeil cabinet',
      definition: DEFINITION_VALIDE,
      scoring: { type: 'sum', interpretation: [] },
    });
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) {
      expect(verdict.erreurs.join(' ')).toContain('entre 1 et 6 bandes');
    }
  });

  it('refuse plus de 8 options — la frontière haute compte autant que la basse', () => {
    const neufOptions = Array.from({ length: 9 }, (_, i) => ({ v: i, l: `Niveau ${i}` }));
    const verdict = validerInstrumentCabinet({
      titre: 'Sommeil cabinet',
      definition: {
        sections: [
          {
            id: 'S1',
            questions: [{ id: 'Q1', texte: 'Je dors bien.', type: 'likert', options: neufOptions }],
          },
        ],
      },
      scoring: SCORING_VALIDE,
    });
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) {
      expect(verdict.erreurs.join(' ')).toContain('entre 2 et 8 options');
    }
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

// ── Famille « sans interprétation » (D-088) ────────────────────────────────
//
// La garde « tout instrument cabinet publié porte une grille complète et
// couvrante » est RELÂCHÉE pour cette famille, et pour elle seule. Elle est
// remplacée par son inverse, plus stricte : une bande — une seule, même
// « neutre », même « à définir » — est REFUSÉE. Un instrument de pilotage qui
// classerait poserait un seuil sans provenance (`DC-19`, `DC-20`), et un score
// n'est pas un diagnostic (`DC-27`).
//
// Le moteur, lui, n'a pas bougé d'une ligne : `sum_no_interpretation` existe
// dans `@/lib/questions` depuis le catalogue Drive et rend `interpretation:
// null`. Ce qui change ici est le VALIDATEUR.
const EVA_DEFINITION = {
  instructions: 'Placez le curseur là où vous vous situez aujourd’hui.',
  sections: [
    {
      id: 'S1',
      questions: [
        {
          id: 'EVA1',
          texte: 'Où en êtes-vous de votre fatigue aujourd’hui ?',
          type: 'number',
          min: 0,
          max: 10,
          unit: '/10',
        },
      ],
    },
  ],
};

describe('validerInstrumentCabinet — famille sans interprétation (D-088)', () => {
  it('accepte une EVA : item number borné, aucune grille, scoreMax = max déclaré', () => {
    const verdict = validerInstrumentCabinet({
      titre: 'EVA fatigue — cabinet',
      definition: EVA_DEFINITION,
      scoring: { type: TYPE_SCORING_SANS_INTERPRETATION },
    });
    expect(verdict).toEqual({ ok: true, nbQuestions: 1, scoreMax: 10 });
  });

  it('accepte une interpretation vide — absente ou [] valent pareil', () => {
    const verdict = validerInstrumentCabinet({
      titre: 'EVA fatigue — cabinet',
      definition: EVA_DEFINITION,
      scoring: { type: TYPE_SCORING_SANS_INTERPRETATION, interpretation: [] },
    });
    expect(verdict.ok).toBe(true);
  });

  // GARDE ANTI-SEUIL — le cœur du lot. Une bande parfaitement formée et
  // couvrante, qui passerait sur « sum », est refusée ici.
  it('REFUSE une bande, même unique, même couvrante', () => {
    const verdict = validerInstrumentCabinet({
      titre: 'EVA fatigue — cabinet',
      definition: EVA_DEFINITION,
      scoring: {
        type: TYPE_SCORING_SANS_INTERPRETATION,
        interpretation: [{ min: 0, max: 10, label: 'Repère', color: 'warning' }],
      },
    });
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) {
      expect(verdict.erreurs.join(' ')).toContain('aucune bande n’est admise');
    }
  });

  // La bande d'attente de l'import EST un libellé interprétatif de fait,
  // coloré `warning` : elle tombe sous la même garde.
  it('REFUSE la bande d’attente « Grille à définir » comme n’importe quelle autre', () => {
    const verdict = validerInstrumentCabinet({
      titre: 'EVA fatigue — cabinet',
      definition: EVA_DEFINITION,
      scoring: {
        type: TYPE_SCORING_SANS_INTERPRETATION,
        interpretation: [{ min: 0, max: 10, label: LABEL_GRILLE_A_DEFINIR, color: 'warning' }],
      },
    });
    expect(verdict.ok).toBe(false);
  });

  it('refuse reversed et threshold — cette famille ne pondère ni ne compte', () => {
    const verdict = validerInstrumentCabinet({
      titre: 'EVA fatigue — cabinet',
      definition: EVA_DEFINITION,
      scoring: { type: TYPE_SCORING_SANS_INTERPRETATION, reversed: ['EVA1'], threshold: 5 },
    });
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) {
      const tout = verdict.erreurs.join(' ');
      expect(tout).toContain('n’admet pas de questions inversées');
      expect(tout).toContain('n’admet pas de seuil');
    }
  });

  it('exige des bornes DÉCLARÉES sur l’item number — jamais devinées', () => {
    const verdict = validerInstrumentCabinet({
      titre: 'EVA fatigue — cabinet',
      definition: {
        sections: [
          {
            id: 'S1',
            questions: [{ id: 'EVA1', texte: 'Où en êtes-vous aujourd’hui ?', type: 'number' }],
          },
        ],
      },
      scoring: { type: TYPE_SCORING_SANS_INTERPRETATION },
    });
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) {
      expect(verdict.erreurs.join(' ')).toContain('bornes entières min et max');
    }
  });

  it('refuse un minimum ≥ maximum', () => {
    const verdict = validerInstrumentCabinet({
      titre: 'EVA fatigue — cabinet',
      definition: {
        sections: [
          {
            id: 'S1',
            questions: [
              {
                id: 'EVA1',
                texte: 'Où en êtes-vous aujourd’hui ?',
                type: 'number',
                min: 10,
                max: 10,
              },
            ],
          },
        ],
      },
      scoring: { type: TYPE_SCORING_SANS_INTERPRETATION },
    });
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) {
      expect(verdict.erreurs.join(' ')).toContain('strictement inférieur');
    }
  });

  it('somme les bornes déclarées de plusieurs items number', () => {
    const verdict = validerInstrumentCabinet({
      titre: 'EVA double — cabinet',
      definition: {
        sections: [
          {
            id: 'S1',
            questions: [
              { id: 'EVA1', texte: 'Fatigue aujourd’hui ?', type: 'number', min: 0, max: 10 },
              { id: 'EVA2', texte: 'Douleur aujourd’hui ?', type: 'number', min: 0, max: 10 },
            ],
          },
        ],
      },
      scoring: { type: TYPE_SCORING_SANS_INTERPRETATION },
    });
    expect(verdict).toEqual({ ok: true, nbQuestions: 2, scoreMax: 20 });
  });

  it('admet aussi des items likert — le moteur en sert déjà un (Q_MOD_02)', () => {
    const verdict = validerInstrumentCabinet({
      titre: 'Repère cabinet',
      definition: DEFINITION_VALIDE,
      scoring: { type: TYPE_SCORING_SANS_INTERPRETATION },
    });
    expect(verdict).toEqual({ ok: true, nbQuestions: 2, scoreMax: 4 });
  });

  // Les familles qui concluent n'ont RIEN gagné : un item number y reste
  // refusé, avec le message d'avant, au caractère près.
  it('un item number reste refusé sur « sum » — la relâche est réservée', () => {
    const verdict = validerInstrumentCabinet({
      titre: 'Sommeil cabinet',
      definition: EVA_DEFINITION,
      scoring: SCORING_VALIDE,
    });
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) {
      expect(verdict.erreurs.join(' ')).toContain('seul « likert » est admis');
    }
  });
});

// GARDE ANTI-BANDE-PAR-DÉFAUT (D-088) — le piège du lot. Trois sites posent
// une bande d'attente quand la grille manque ; aucun ne doit la poser sur la
// famille qui ne classe pas.
describe('scoringParDefaut — garde anti-bande-par-défaut', () => {
  const definitionLikert = {
    sections: [{ id: 'S1', questions: DEFINITION_VALIDE.sections[0].questions }],
  } as never;

  it('pose la bande d’attente sur les familles qui concluent (inchangé)', () => {
    const scoring = scoringParDefaut(definitionLikert);
    expect(scoring.type).toBe('sum');
    expect(scoring.interpretation).toEqual([
      { min: 0, max: 4, label: LABEL_GRILLE_A_DEFINIR, color: 'warning' },
    ]);
  });

  it('ne pose AUCUNE bande sur la famille sans interprétation', () => {
    const scoring = scoringParDefaut(definitionLikert, TYPE_SCORING_SANS_INTERPRETATION);
    expect(scoring.type).toBe(TYPE_SCORING_SANS_INTERPRETATION);
    expect(scoring.interpretation ?? []).toEqual([]);
    expect(JSON.stringify(scoring)).not.toContain(LABEL_GRILLE_A_DEFINIR);
    expect(JSON.stringify(scoring)).not.toContain('warning');
  });

  it('interditTouteBande ne nomme QUE cette famille', () => {
    expect(interditTouteBande({ type: TYPE_SCORING_SANS_INTERPRETATION })).toBe(true);
    expect(interditTouteBande({ type: 'sum' })).toBe(false);
    expect(interditTouteBande({ type: 'sum_reversed' })).toBe(false);
    expect(interditTouteBande({ type: 'count_threshold' })).toBe(false);
    expect(interditTouteBande(null)).toBe(false);
    expect(interditTouteBande(undefined)).toBe(false);
  });
});
