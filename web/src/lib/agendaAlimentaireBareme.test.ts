import { describe, expect, it } from 'vitest';
import { computeScoreFromDef } from './questions';

// Squelette du barème d'agenda alimentaire (LOT-02, campagne chaîne
// alimentaire). AUCUN seuil clinique n'est câblé en production : le scorer ship
// avec zéro axe et refuse de coter (« barème non calibré »). Ce banc éprouve la
// STRUCTURE et ses invariants sur des définitions FORGÉES — les nombres ci-
// dessous sont des fixtures de test, pas le barème clinique (qui est la décision
// gatée LOT-02, posée après observation de la distribution réelle des 21 jours).
//
// Invariants gardés, calqués sur le jumeau sommeil : refus sous couverture avec
// motif, plancher PAR AXE, axe non couvert = `null` renormalisé (JAMAIS 0),
// drapeaux cliniques JAMAIS des points.

function scorer(scoring: Record<string, unknown>, answers: Record<string, string>) {
  return computeScoreFromDef({ sections: [], scoring: { type: 'agenda_alimentaire', ...scoring } }, answers) as any;
}

// Axe de test : jeûne médian, borné 600→840 (fixture, PAS un seuil clinique).
const AXE_JEUNE = { id: 'JEUNE', label: 'Jeûne', source: 'AGA_JEUNE_MEDIAN', sens: 'normal', bornes: { bas: 600, haut: 840 } };
const AXE_PROT = { id: 'PROT', label: 'Protéines matin', source: 'AGA_FREQ_PROTEINES_MATIN_SEM', sens: 'normal', bornes: { bas: 0, haut: 7 } };

describe('barème agenda alimentaire — refus, avant toute cotation', () => {
  it('aucun axe déclaré → « barème non calibré », jamais un total inventé', () => {
    const r = scorer({}, { AGA_NB_JOURS: '10' });
    expect(r.scored).toBe(false);
    expect(r.total).toBeUndefined();
    expect(r.note).toContain('non calibré');
    expect(r.nbJours).toBe(10);
  });

  it('sous la couverture minimale (config) → refus nommé, jamais une cotation partielle', () => {
    const r = scorer({ axes: [AXE_JEUNE], minJours: 7 }, { AGA_NB_JOURS: '3', AGA_JEUNE_MEDIAN: '720' });
    expect(r.scored).toBe(false);
    expect(r.note).toContain('Moins de 7 journées');
  });

  it('aucune journée exploitable (AGA_NB_JOURS absent) → refus, nbJours 0', () => {
    const r = scorer({ axes: [AXE_JEUNE], minJours: 7 }, { AGA_JEUNE_MEDIAN: '720' });
    expect(r.scored).toBe(false);
    expect(r.note).toContain('Aucune journée exploitable');
    expect(r.nbJours).toBe(0);
  });

  it('sans plancher de couverture en config, le recueil couvert est coté (pas de plancher inventé)', () => {
    const r = scorer({ axes: [AXE_JEUNE] }, { AGA_NB_JOURS: '2', AGA_JEUNE_MEDIAN: '720' });
    expect(r.scored).toBe(true); // aucun `minJours` déclaré → aucun refus de couverture
  });
});

describe('barème agenda alimentaire — cotation et renormalisation', () => {
  it('cote un axe couvert : ratio depuis ses bornes, ×100', () => {
    // (720 − 600) / (840 − 600) = 0,5 → 50.
    const r = scorer({ axes: [AXE_JEUNE], minJours: 7 }, { AGA_NB_JOURS: '10', AGA_JEUNE_MEDIAN: '720' });
    expect(r.scored).toBe(true);
    expect(r.total).toBe(50);
    expect(r.subScores).toEqual([{ id: 'JEUNE', label: 'Jeûne', total: 50, max: 100 }]);
    expect(r.nbAxesCouverts).toBe(1);
  });

  it('un axe dont la source manque vaut null et SORT du total — jamais dilué par un 0', () => {
    // JEUNE = 0,5 ; PROT source absente → null. Total = 50 (JEUNE seul),
    // PAS 25 (moyenne avec un 0). C'est la parade « null jamais 0 ».
    const r = scorer({ axes: [AXE_JEUNE, AXE_PROT], minJours: 7 }, { AGA_NB_JOURS: '10', AGA_JEUNE_MEDIAN: '720' });
    expect(r.total).toBe(50);
    expect(r.subScores.find((s: any) => s.id === 'PROT').total).toBeNull();
    expect(r.nbAxesCouverts).toBe(1);
  });

  it('plancher PAR AXE : un axe trop peu soutenu est non couvert → null renormalisé', () => {
    // minJoursAxe = 7. JEUNE couvert (paires 9 ≥ 7), PROT non couvert
    // (jours protéines connus 3 < 7). Total = JEUNE seul (50), pas une moyenne.
    const r = scorer(
      {
        minJours: 7,
        minJoursAxe: 7,
        axes: [
          { ...AXE_JEUNE, couvertureSource: 'AGA_NB_PAIRES_JEUNE' },
          { ...AXE_PROT, couvertureSource: 'AGA_NB_JOURS_PROTEINES_CONNU' },
        ],
      },
      { AGA_NB_JOURS: '10', AGA_JEUNE_MEDIAN: '720', AGA_FREQ_PROTEINES_MATIN_SEM: '6', AGA_NB_PAIRES_JEUNE: '9', AGA_NB_JOURS_PROTEINES_CONNU: '3' },
    );
    expect(r.total).toBe(50);
    expect(r.subScores.find((s: any) => s.id === 'PROT').total).toBeNull();
  });

  it('moyenne PONDÉRÉE : les poids d’axe sont respectés', () => {
    // JEUNE ratio 1 poids 3, PROT ratio 0 poids 1 → (1·3 + 0·1)/4 = 0,75 → 75.
    const r = scorer(
      {
        minJours: 7,
        axes: [
          { ...AXE_JEUNE, poids: 3 },
          { ...AXE_PROT, poids: 1 },
        ],
      },
      { AGA_NB_JOURS: '10', AGA_JEUNE_MEDIAN: '840', AGA_FREQ_PROTEINES_MATIN_SEM: '0' },
    );
    expect(r.total).toBe(75);
  });

  it('sens « inverse » : plus bas vaut mieux (0 défavorable observé est un vrai 0, pas un null)', () => {
    const axeInverse = { id: 'UT', label: 'Ultra-transformés', source: 'AGA_FREQ_ULTRA_TRANSFORMES_SEM', sens: 'inverse', bornes: { bas: 0, haut: 7 } };
    const defavorable = scorer({ axes: [axeInverse], minJours: 7 }, { AGA_NB_JOURS: '10', AGA_FREQ_ULTRA_TRANSFORMES_SEM: '7' });
    expect(defavorable.total).toBe(0); // observé au pire → 0, mais SCORÉ (mesuré), pas null
    expect(defavorable.scored).toBe(true);
    const favorable = scorer({ axes: [axeInverse], minJours: 7 }, { AGA_NB_JOURS: '10', AGA_FREQ_ULTRA_TRANSFORMES_SEM: '0' });
    expect(favorable.total).toBe(100);
  });

  it('en deçà de minAxesCouverts → refus « trop incomplètes », jamais un total sur un seul axe', () => {
    const r = scorer(
      { minJours: 7, minAxesCouverts: 2, axes: [AXE_JEUNE, AXE_PROT] },
      { AGA_NB_JOURS: '10', AGA_JEUNE_MEDIAN: '720' }, // PROT absent → 1 couvert < 2
    );
    expect(r.scored).toBe(false);
    expect(r.note).toContain('trop incomplètes');
  });
});

describe('barème agenda alimentaire — drapeaux JAMAIS des points', () => {
  const DRAPEAU = { source: 'AGA_FREQ_SOIR_COPIEUX_SEM', comparateur: '>=', seuil: 4, message: 'Soir copieux fréquent — à explorer.' };

  it('un drapeau déclenché apparaît, sans déplacer le total d’un point', () => {
    const answers = { AGA_NB_JOURS: '10', AGA_JEUNE_MEDIAN: '720', AGA_FREQ_SOIR_COPIEUX_SEM: '5' };
    const avec = scorer({ axes: [AXE_JEUNE], minJours: 7, drapeaux: [DRAPEAU] }, answers);
    const sans = scorer({ axes: [AXE_JEUNE], minJours: 7 }, answers);
    expect(avec.drapeaux).toEqual(['Soir copieux fréquent — à explorer.']);
    // Le total est IDENTIQUE avec et sans le drapeau : il alerte, il ne cote pas.
    expect(avec.total).toBe(sans.total);
    expect(avec.total).toBe(50);
  });

  it('drapeau sous son seuil → pas de message', () => {
    const r = scorer(
      { axes: [AXE_JEUNE], minJours: 7, drapeaux: [DRAPEAU] },
      { AGA_NB_JOURS: '10', AGA_JEUNE_MEDIAN: '720', AGA_FREQ_SOIR_COPIEUX_SEM: '2' },
    );
    expect(r.drapeaux).toEqual([]);
  });

  it('drapeau dont la source manque → ignoré, jamais un déclenchement sur une absence', () => {
    const r = scorer(
      { axes: [AXE_JEUNE], minJours: 7, drapeaux: [DRAPEAU] },
      { AGA_NB_JOURS: '10', AGA_JEUNE_MEDIAN: '720' },
    );
    expect(r.drapeaux).toEqual([]);
  });
});
