import { describe, expect, it } from 'vitest';

import {
  C4_DECISION_AVANT_BIOLOGIE_VERSION,
  deciderIntentionAvantBiologie,
  deciderIntentionsAvantBiologie,
} from './decisionAvantBiologie';
import type { ContexteDecision, OrigineDeclencheur } from './decisionAvantBiologie';
import { C4B_RESOLUTION_VERSION } from './types';
import type {
  AlerteSecuriteJointe,
  RegleResolue,
  ResolutionIntentions,
  SeuilFonctionnelSource,
} from './types';

// Ce que cette matrice défend (`D-056`) : sur la production d'aujourd'hui —
// catalogue de décision vide — la règle REFUSE, avec un motif distinct de
// « pas d'obstacle constaté ». Les conditions négatives de la spec ne passent
// pas par vacuité.

const TABLEAU_CLINIQUE_COMPLET: readonly OrigineDeclencheur[] = [
  'besoin_degrade', 'plainte', 'anamnese',
];

function regle(overrides: Partial<RegleResolue> = {}): RegleResolue {
  return {
    regleId: 'rule-omega3-01',
    versionRegle: 1,
    typeRegle: 'apport_fonctionnel',
    ingredient: { id: 'ing-omega3', code: 'OMEGA3', nomFr: 'Oméga-3' },
    formePreferee: null,
    doseCibleBasse: 500,
    doseCibleHaute: 1000,
    gradePreuve: 'modere',
    justification: 'Justification fixture.',
    conditionSupplementaire: null,
    source: { id: 'src-1', citation: 'Source fixture 2024.', lienUrl: null },
    creeLe: '2026-01-01T00:00:00.000Z',
    validePar: 'praticien-1',
    valideLe: '2026-01-02T00:00:00.000Z',
    regleValidee: true,
    ...overrides,
  };
}

function seuil(overrides: Partial<SeuilFonctionnelSource> = {}): SeuilFonctionnelSource {
  return {
    id: 'seuil-1',
    ingredientId: 'ing-omega3',
    seuilDoseBasse: 250,
    seuilDoseHaute: 3000,
    unite: 'mg',
    basculeRisque: false,
    safetyAlertId: null,
    gradePreuveScientifique: 'modere',
    categorieFonctionnelle: { id: 'cat-1', code: 'INFLAMMATION', labelFr: 'Inflammation' },
    safetyAlert: null,
    sourceReference: { id: 'src-1', citation: 'Source fixture 2024.', lienUrl: null },
    ...overrides,
  };
}

function contexte(overrides: Partial<ContexteDecision> = {}): ContexteDecision {
  return {
    regle: regle(),
    catalogueAlertesPublie: true,
    alertesActives: [],
    seuilsActifs: [seuil()],
    claimsValides: true,
    declencheur: TABLEAU_CLINIQUE_COMPLET,
    ...overrides,
  };
}

describe('Compléments avant biologie — ce qui fait naître une intention', () => {
  it('rend une intention active sur une règle validée inconditionnelle', () => {
    const verdict = deciderIntentionAvantBiologie(contexte());
    expect(verdict).toMatchObject({
      verdict: 'intention',
      statut: 'active',
      contractVersion: C4_DECISION_AVANT_BIOLOGIE_VERSION,
      regleId: 'rule-omega3-01',
    });
  });

  it('rend une intention conditionnelle quand la règle porte une condition biologique', () => {
    const verdict = deciderIntentionAvantBiologie(contexte({
      regle: regle({
        regleId: 'rule-fer-01',
        ingredient: { id: 'ing-fer', code: 'FER', nomFr: 'Fer' },
        conditionSupplementaire: { type: 'biologie', cible: 'ferritine' },
      }),
      seuilsActifs: [seuil({ ingredientId: 'ing-fer' })],
    }));
    expect(verdict).toMatchObject({
      verdict: 'intention',
      statut: 'conditionnelle_biologie',
      waitFor: { type: 'biologie', cible: 'ferritine' },
    });
  });

  it('conserve l’échéance canonique portée par la condition', () => {
    const verdict = deciderIntentionAvantBiologie(contexte({
      regle: regle({
        conditionSupplementaire: {
          type: 'biologie', cible: 'ferritine', echeance: '2026-03-01T00:00:00.000Z',
        },
      }),
    }));
    expect(verdict).toMatchObject({
      statut: 'conditionnelle_biologie',
      waitFor: { type: 'biologie', cible: 'ferritine', echeance: '2026-03-01T00:00:00.000Z' },
    });
  });
});

describe('Compléments avant biologie — l’absence d’information ne vaut jamais autorisation', () => {
  it('refuse quand le catalogue d’alertes n’est pas publié', () => {
    const verdict = deciderIntentionAvantBiologie(contexte({ catalogueAlertesPublie: false }));
    expect(verdict).toMatchObject({ verdict: 'refus', cause: 'catalogue_alertes_non_publie' });
    expect((verdict as { motif: string }).motif).toContain('absence d’examen');
  });

  it('refuse quand aucun seuil fonctionnel n’est publié pour l’ingrédient', () => {
    const verdict = deciderIntentionAvantBiologie(contexte({ seuilsActifs: [] }));
    expect(verdict).toMatchObject({ verdict: 'refus', cause: 'aucun_seuil_publie' });
    expect((verdict as { motif: string }).motif).toContain('n’est comparable à rien');
  });

  it('refuse sur une alerte de sécurité active', () => {
    const alerte: AlerteSecuriteJointe = {
      id: 'alerte-1', code: 'ANTICOAG', messageFr: 'Interaction anticoagulants.', niveauAlerte: 'rouge',
    };
    expect(deciderIntentionAvantBiologie(contexte({ alertesActives: [alerte] })))
      .toMatchObject({ verdict: 'refus', cause: 'alerte_securite_active' });
  });

  it('refuse une dose cible au-dessus du seuil haut publié', () => {
    const verdict = deciderIntentionAvantBiologie(contexte({
      regle: regle({ doseCibleBasse: 4000, doseCibleHaute: 5000 }),
    }));
    expect(verdict).toMatchObject({ verdict: 'refus', cause: 'seuil_depasse' });
  });

  it('refuse une condition supplémentaire illisible plutôt que de la lire comme absente', () => {
    const verdict = deciderIntentionAvantBiologie(contexte({
      regle: regle({ conditionSupplementaire: { type: 'biologie', cible: '   ' } }),
    }));
    expect(verdict).toMatchObject({ verdict: 'refus', cause: 'condition_illisible' });
  });

  it('refuse une règle non validée — barrière D-003', () => {
    expect(deciderIntentionAvantBiologie(contexte({ regle: regle({ regleValidee: false }) })))
      .toMatchObject({ verdict: 'refus', cause: 'regle_non_validee' });
    expect(deciderIntentionAvantBiologie(contexte({ regle: regle({ validePar: null }) })))
      .toMatchObject({ verdict: 'refus', cause: 'regle_non_validee' });
  });

  it('refuse une règle sans source citée', () => {
    expect(deciderIntentionAvantBiologie(contexte({
      regle: regle({ source: { id: 'src-1', citation: '  ', lienUrl: null } }),
    }))).toMatchObject({ verdict: 'refus', cause: 'source_absente' });
  });

  it('refuse des claims non valides au corpus', () => {
    expect(deciderIntentionAvantBiologie(contexte({ claimsValides: false })))
      .toMatchObject({ verdict: 'refus', cause: 'claims_non_valides' });
  });
});

describe('Compléments avant biologie — un score DNST ne déclenche rien', () => {
  // Test négatif exigé par la spec (Lot E, critère 1). Tyrosine et mélatonine
  // sont nommées parce que ce sont les deux cas où la tentation de descendre
  // d'un axe DNST vers un complément est la plus forte.
  const depuisDnst = (nomFr: string, id: string) => deciderIntentionAvantBiologie(contexte({
    regle: regle({ regleId: `rule-${id}`, ingredient: { id, code: id.toUpperCase(), nomFr } }),
    seuilsActifs: [seuil({ ingredientId: id })],
    declencheur: ['score_dnst'],
  }));

  it('tyrosine est improposable depuis un axe DNST seul', () => {
    const verdict = depuisDnst('Tyrosine', 'ing-tyrosine');
    expect(verdict).toMatchObject({ verdict: 'refus', cause: 'declencheur_insuffisant' });
    expect((verdict as { motif: string }).motif).toContain('n’est pas un déclencheur recevable');
  });

  it('mélatonine est improposable depuis un axe DNST seul', () => {
    expect(depuisDnst('Mélatonine', 'ing-melatonine'))
      .toMatchObject({ verdict: 'refus', cause: 'declencheur_insuffisant' });
  });

  it('un axe DNST ajouté à un tableau incomplet ne le complète pas', () => {
    const verdict = deciderIntentionAvantBiologie(contexte({
      declencheur: ['besoin_degrade', 'plainte', 'score_dnst'],
    }));
    expect(verdict).toMatchObject({ verdict: 'refus', cause: 'declencheur_insuffisant' });
    expect((verdict as { motif: string }).motif).toContain('anamnese');
  });

  it('un axe DNST au-dessus d’un tableau complet ne gêne pas', () => {
    expect(deciderIntentionAvantBiologie(contexte({
      declencheur: [...TABLEAU_CLINIQUE_COMPLET, 'score_dnst'],
    }))).toMatchObject({ verdict: 'intention' });
  });
});

describe('Compléments avant biologie — catalogue de décision vide', () => {
  const resolutionVide: ResolutionIntentions = {
    contractVersion: C4B_RESOLUTION_VERSION,
    intentions: [{
      intention: { id: 'int-1', code: 'SOMMEIL', labelFr: 'Sommeil', categorie: 'fonctionnel' },
      regles: [],
    }],
    codesInconnus: [],
    aucunScoreAgrege: true,
  };

  const catalogue = {
    catalogueAlertesPublie: false,
    alertesParIngredient: new Map(),
    seuilsParIngredient: new Map(),
    claimsValidesParRegle: new Map(),
    declencheur: TABLEAU_CLINIQUE_COMPLET,
  };

  it('refuse explicitement plutôt que de rendre une liste vide', () => {
    const verdicts = deciderIntentionsAvantBiologie(resolutionVide, catalogue);
    expect(verdicts).toHaveLength(1);
    expect(verdicts[0]).toMatchObject({ verdict: 'refus', cause: 'catalogue_decision_vide' });
    expect((verdicts[0] as { motif: string }).motif).toContain('ce n’est pas un feu vert');
  });

  it('refuse aussi quand la seule règle atteignant un ingrédient n’est pas validée', () => {
    const verdicts = deciderIntentionsAvantBiologie({
      ...resolutionVide,
      intentions: [{
        intention: { id: 'int-1', code: 'SOMMEIL', labelFr: 'Sommeil', categorie: 'fonctionnel' },
        regles: [regle({ regleValidee: false })],
      }],
    }, catalogue);
    expect(verdicts).toEqual([expect.objectContaining({ cause: 'catalogue_decision_vide' })]);
  });
});
