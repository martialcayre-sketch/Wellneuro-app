import { describe, expect, it } from 'vitest';
import { agregerEquilibre, calculerCouvertureBesoin, clamp01 } from './score';
import { PLAFOND_FONDATION_CRITIQUE } from './constants';

// Scénarios portés depuis l'ancien score.check.ts (auto-vérification
// "zéro dépendance", supprimé au profit de ce fichier Vitest). Rationale
// et libellés français conservés à l'identique.

describe('clamp01', () => {
  it('borne une valeur négative à 0', () => {
    expect(clamp01(-0.5)).toBe(0);
  });

  it('borne une valeur supérieure à 1 à 1', () => {
    expect(clamp01(1.5)).toBe(1);
  });

  it("laisse inchangée une valeur déjà comprise entre 0 et 1", () => {
    expect(clamp01(0.42)).toBe(0.42);
  });
});

describe('agregerEquilibre', () => {
  it('score global sans aucune donnée doit être null, pas de plafond', () => {
    const vide = agregerEquilibre({});
    expect(vide.scoreGlobal).toBeNull();
    expect(vide.plafondApplique).toBe(false);
  });

  it('score global parfait (couverture 1.0 partout) doit être 100, pas de plafond', () => {
    const couverturesParfaites = Object.fromEntries(
      Array.from({ length: 12 }, (_, i) => [i + 1, 1])
    );
    const parfait = agregerEquilibre(couverturesParfaites);
    expect(parfait.scoreGlobal).toBe(100);
    expect(parfait.plafondApplique).toBe(false);
  });

  it(
    // "aucune moyenne ne masque une carence sévère" (MON_EQUILIBRE_CONTEXTE.md §2)
    'le plafond se déclenche sur une fondation critique effondrée (besoin 5) même si la moyenne brute serait haute',
    () => {
      const couverturesParfaites = Object.fromEntries(
        Array.from({ length: 12 }, (_, i) => [i + 1, 1])
      );
      const couverturesAvecEffondrement = { ...couverturesParfaites, 5: 0.1 };
      const effondre = agregerEquilibre(couverturesAvecEffondrement);

      expect(effondre.scoreGlobalAvantPlafond).not.toBeNull();
      expect(effondre.scoreGlobalAvantPlafond as number).toBeGreaterThan(PLAFOND_FONDATION_CRITIQUE);
      expect(effondre.plafondApplique).toBe(true);
      expect(effondre.scoreGlobal).toBe(PLAFOND_FONDATION_CRITIQUE);
      expect(effondre.fondationsCritiquesDeclenchees.some(f => f.besoin === 5)).toBe(true);
    }
  );
});

describe('calculerCouvertureBesoin', () => {
  it('besoin 3 (rythme alimentaire, aucune source mappée) reste non évaluable en v1 — jamais 0 par défaut', () => {
    const couvertureBesoin3 = calculerCouvertureBesoin(3, { Q_ALI_01: { MO1: '4' } });
    expect(couvertureBesoin3).toBeNull();
  });

  it('besoin 2 (Pichot Q_SOM_06, 10/32 inversé) doit donner une couverture de 0,6875', () => {
    const couvertureBesoin2 = calculerCouvertureBesoin(2, {
      Q_SOM_06: { P1: '2', P2: '2', P3: '1', P4: '1', P5: '1', P6: '1', P7: '1', P8: '1' },
    });
    expect(couvertureBesoin2).toBeCloseTo(0.6875, 6);
  });
});
