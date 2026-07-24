import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma } = vi.hoisted(() => ({
  prisma: { ingredientFunctionalThreshold: { findMany: vi.fn() } },
}));
vi.mock('@/lib/prisma', () => ({ prisma }));

import {
  detecterCumulSubstance,
  detecterDepassementsSeuils,
  evaluerSentinelle,
} from './sentinelle';
import type {
  RegleResolue,
  ResolutionIntentions,
  SeuilFonctionnelSource,
} from './types';

const magnesium = { id: 'ing_mag', code: 'magnesium', nomFr: 'Magnésium' };

function regleResolue(overrides: Partial<RegleResolue> = {}): RegleResolue {
  return {
    regleId: 'regle_mag_sommeil',
    versionRegle: 1,
    typeRegle: 'recommande',
    ingredient: magnesium,
    formePreferee: null,
    doseCibleBasse: 110,
    doseCibleHaute: 310,
    gradePreuve: 'modere',
    justification: 'Justification sourcée.',
    conditionSupplementaire: null,
    source: { id: 'src_1', citation: 'Revue Micronutrition, 2024', lienUrl: null },
    creeLe: '2026-07-01T00:00:00.000Z',
    validePar: null,
    valideLe: null,
    ...overrides,
  };
}

function resolution(
  intentions: Array<{ code: string; labelFr: string; regles: RegleResolue[] }>,
): ResolutionIntentions {
  return {
    contractVersion: 'c4b-resolution-v1',
    intentions: intentions.map((entree, index) => ({
      intention: {
        id: `tag_${index}`, code: entree.code, labelFr: entree.labelFr, categorie: 'test',
      },
      regles: entree.regles,
    })),
    codesInconnus: [],
    aucunScoreAgrege: true,
  };
}

// Doses 110–310 et 220 : les sommes possibles (330, 530) et le double (440)
// serviraient de traceurs d'un calcul automatique interdit.
function resolutionCumul(): ResolutionIntentions {
  return resolution([
    { code: 'sommeil_fragmente', labelFr: 'Sommeil fragmenté', regles: [regleResolue()] },
    {
      code: 'stress_chronique',
      labelFr: 'Stress chronique',
      regles: [regleResolue({
        regleId: 'regle_mag_stress', doseCibleBasse: 220, doseCibleHaute: 220,
      })],
    },
  ]);
}

function seuil(overrides: Partial<SeuilFonctionnelSource> = {}): SeuilFonctionnelSource {
  return {
    id: 'seuil_mag_neuro',
    ingredientId: 'ing_mag',
    seuilDoseBasse: null,
    seuilDoseHaute: 250,
    unite: 'mg/j',
    basculeRisque: false,
    safetyAlertId: null,
    gradePreuveScientifique: 'fort',
    categorieFonctionnelle: { id: 'cat_neuro', code: 'neuromodulation', labelFr: 'Neuromodulation' },
    safetyAlert: null,
    sourceReference: { id: 'src_seuil', citation: 'Référence seuils, 2025', lienUrl: null },
    ...overrides,
  };
}

const alerteRenale = {
  id: 'alerte_renale',
  code: 'insuffisance_renale',
  messageFr: 'Prudence en cas d\'insuffisance rénale.',
  niveauAlerte: 'rouge',
};

describe('detecterCumulSubstance', () => {
  it('signale un même ingrédient atteint par plusieurs intentions, sans somme ni maximum', () => {
    const candidats = detecterCumulSubstance(resolutionCumul());
    expect(candidats).toHaveLength(1);
    const [candidat] = candidats;
    expect(candidat).toMatchObject({
      typeFlag: 'cumul_substance',
      statutPropose: 'ouvert',
      niveauAlerte: 'orange',
      ingredientsConcernes: ['magnesium'],
      seuil: null,
      alerteSecurite: null,
    });
    expect(candidat.dosesEnPresence).toHaveLength(2);
    expect(candidat.dosesEnPresence.map(dose => dose.intentionCode))
      .toEqual(['sommeil_fragmente', 'stress_chronique']);
    const serialise = JSON.stringify(candidat);
    // Les doses en présence sont exposées telles quelles…
    expect(serialise).toContain('110');
    expect(serialise).toContain('310');
    expect(serialise).toContain('220');
    // …et aucune somme, maximum ou champ agrégé n'apparaît (décision actée n°9).
    expect(serialise).not.toMatch(/330|440|530/);
    expect(serialise).not.toMatch(/"(somme|total|maximum|doseCumulee|doseRetenue)"/i);
    expect(candidat.message).toMatch(/le praticien arbitre/i);
  });

  it('signale aussi deux règles d\'une même intention visant le même ingrédient', () => {
    const candidats = detecterCumulSubstance(resolution([
      {
        code: 'sommeil_fragmente',
        labelFr: 'Sommeil fragmenté',
        regles: [
          regleResolue(),
          regleResolue({ regleId: 'regle_mag_bis', typeRegle: 'complement' }),
        ],
      },
    ]));
    expect(candidats).toHaveLength(1);
    expect(candidats[0].dosesEnPresence).toHaveLength(2);
  });

  it('ne signale rien quand chaque ingrédient n\'est atteint qu\'une fois', () => {
    expect(detecterCumulSubstance(resolution([
      { code: 'sommeil_fragmente', labelFr: 'Sommeil fragmenté', regles: [regleResolue()] },
    ]))).toEqual([]);
  });
});

describe('detecterDepassementsSeuils', () => {
  it('signale un dépassement individuel du seuil haut, sans bascule : niveau orange, pas d\'alerte', () => {
    const candidats = detecterDepassementsSeuils(resolutionCumul(), [seuil()]);
    expect(candidats).toHaveLength(1);
    const [candidat] = candidats;
    expect(candidat).toMatchObject({
      typeFlag: 'depassement_seuil',
      niveauAlerte: 'orange',
      alerteSecurite: null,
    });
    // Seule la règle à 310 dépasse 250 — celle à 220 n'est pas concernée :
    // comparaison règle par règle, jamais de cumul calculé.
    expect(candidat.dosesEnPresence).toHaveLength(1);
    expect(candidat.dosesEnPresence[0].regleId).toBe('regle_mag_sommeil');
    expect(candidat.seuil).toMatchObject({ seuilDoseHaute: 250, unite: 'mg/j', gradePreuve: 'fort' });
  });

  it('joint l\'alerte de sécurité via la bascule de risque, sans copie locale du niveau', () => {
    const candidats = detecterDepassementsSeuils(resolutionCumul(), [
      seuil({ basculeRisque: true, safetyAlertId: 'alerte_renale', safetyAlert: alerteRenale }),
    ]);
    expect(candidats).toHaveLength(1);
    const [candidat] = candidats;
    // Le niveau vient de l'alerte jointe (décision actée n°6)…
    expect(candidat.niveauAlerte).toBe('rouge');
    expect(candidat.alerteSecurite).toEqual(alerteRenale);
    expect(candidat.seuil?.safetyAlertId).toBe('alerte_renale');
    // …et le seuil exposé ne porte aucun niveau recopié.
    expect(Object.keys(candidat.seuil ?? {})).not.toContain('niveauAlerte');
    expect(candidat.suggestionAction).toMatch(/médecin traitant/);
  });

  it('reste silencieuse sans dépassement, sans seuil haut ou sans occurrence', () => {
    expect(detecterDepassementsSeuils(resolutionCumul(), [seuil({ seuilDoseHaute: 400 })]))
      .toEqual([]);
    expect(detecterDepassementsSeuils(resolutionCumul(), [seuil({ seuilDoseHaute: null })]))
      .toEqual([]);
    expect(detecterDepassementsSeuils(resolutionCumul(), [seuil({ ingredientId: 'ing_autre' })]))
      .toEqual([]);
  });
});

describe('evaluerSentinelle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.WN_C4_ENABLED = 'true';
    prisma.ingredientFunctionalThreshold.findMany.mockResolvedValue([]);
  });

  it('refuse toute évaluation quand le drapeau C4 est désactivé (fail-closed)', async () => {
    delete process.env.WN_C4_ENABLED;
    await expect(evaluerSentinelle(resolutionCumul())).rejects.toThrow(/WN_C4_ENABLED/);
    expect(prisma.ingredientFunctionalThreshold.findMany).not.toHaveBeenCalled();
  });

  it('ne requête rien pour une résolution sans règle', async () => {
    expect(await evaluerSentinelle(resolution([]))).toEqual([]);
    expect(prisma.ingredientFunctionalThreshold.findMany).not.toHaveBeenCalled();
  });

  it('ne lit que les seuils actifs des ingrédients en présence et produit des candidats, sans écrire', async () => {
    prisma.ingredientFunctionalThreshold.findMany.mockResolvedValue([seuil()]);
    const candidats = await evaluerSentinelle(resolutionCumul());
    expect(prisma.ingredientFunctionalThreshold.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { ingredientId: { in: ['ing_mag'] }, actif: true } }),
    );
    expect(candidats.map(candidat => candidat.typeFlag))
      .toEqual(['cumul_substance', 'depassement_seuil']);
  });
});
