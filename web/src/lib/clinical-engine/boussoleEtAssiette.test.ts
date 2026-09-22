import { describe, expect, it } from 'vitest';
import { buildProtocolDraft } from './protocolDraft';
import { assertProtocolDraftC5Structure } from '@/lib/food-compass/refValidation';
import { getCurrentRecommendedPlateRef } from '@/lib/food-compass/plates';
import {
  VERSION_PROTOCOL_DRAFT,
  VERSION_PROTOCOL_DRAFT_V2,
  VERSION_PROTOCOL_DRAFT_V3,
  VERSION_PROTOCOL_DRAFT_V4,
} from './types';
import type { DecisionCard, ProtocolAction, ProtocolDraft } from './types';
import { canonicalSha256 } from './canonical';
import {
  C5_ACTION_REF_VERSION,
  C5_AXIS_CODE,
  C5_DATASET_VERSION,
  C5_MAPPING_VERSION,
  C5_SCORE_VERSION,
} from '@/lib/food-compass/types';
import type { FoodCompassActionRef } from '@/lib/food-compass/types';

// LA BOUSSOLE ET L'ASSIETTE CESSENT DE S'EXCLURE ([[D-243]]).
//
// CE QUE CE BANC GARDE, ET L'ORDRE COMPTE : (1) qu'un protocole V4 puisse porter
// les DEUX références, (2) que la Boussole ne disparaisse pas en silence dans la
// liste blanche de `normalizeActions`, (3) que V1 et V3 gardent leur refus mot
// pour mot, et (4) qu'aucune empreinte déjà persistée ne bouge.
//
// CE QUI N'EST PAS TESTÉ ICI, dit plutôt que sous-entendu. La re-dérivation de
// la référence contre les données CIQUAL vit dans la route et demande une base.
// Le chemin PATIENT — que la vue accepte désormais un V4 — est gardé dans
// `food-compass/foodCompass.test.ts`, où vivent les fixtures de profil et de
// lecture contextuelle qu'il exige. Ce banc éprouve le CONTRAT DU MOTEUR, pas
// le chemin d'écriture entier ni la voie patient.

function card(): DecisionCard {
  return {
    decisionCardId: 'card-1', snapshotId: 'snapshot-1', snapshotInputHash: 'snapshot-hash',
    reviewId: 'review-1', reviewInputHash: 'review-hash', createdAt: '2026-01-01T00:00:00.000Z',
    version: 'c1-decision-card-v1', status: 'draft',
    priorityCandidates: [{
      candidateId: 'priority-1', origin: 'engine', label: 'Priorité fixture', rank: 1,
      confidence: 'à_documenter', ruleId: 'RULE_FIXTURE', rationale: 'Fixture technique.',
      provenance: { responseIds: [], needIds: [], clinicalObjectCodes: [] },
      limitationsRegleSignee: [], limitationsPerimetreClassement: [], limitations: [],
    }],
    proposedMainPriorityId: 'priority-1',
    selectedMainPriority: {
      candidateId: 'priority-1', selectedAt: '2026-01-01T00:00:00.000Z',
      selectedBy: 'practitioner', rationale: 'Choix fixture.',
    },
    counterfactuals: [], missingDataFindingIds: [], discordanceFindingIds: [], safetyFindingIds: [],
    abstention: { status: 'not_required', ruleIds: ['RULE_FIXTURE'], limitations: [] },
    limitations: [], inputHash: 'card-hash',
  };
}

/**
 * RÉFÉRENCE C5 DE FIXTURE, CONSTRUITE AU LIEU D'ÊTRE STUBÉE.
 *
 * La relecture ne se contente pas de la version : `assertFoodCompassActionRef`
 * recalcule le `refHash` sur tous les autres champs. Un stub à deux clés passe
 * la construction et tombe à la relecture — c'est d'ailleurs ce que ce banc a
 * fait à sa première écriture, et la fixture est donc CALCULÉE ici, avec les
 * constantes de contrat réelles.
 */
function refAliment(sourceProtocolDraftId = 'protocol-1'): FoodCompassActionRef {
  const sansHash = {
    contractVersion: C5_ACTION_REF_VERSION,
    foodRef: 'ciqual-2025-v1:26034',
    axisCode: C5_AXIS_CODE,
    datasetVersion: C5_DATASET_VERSION,
    mappingVersion: C5_MAPPING_VERSION,
    scoreVersion: C5_SCORE_VERSION,
    selectedPriorityId: 'priority-1',
    sourceProtocolDraftId,
    sourceProtocolInputHash: 'hash-source-fixture',
    intrinsicProfileHash: 'profil-fixture',
    contextualReadingHash: 'lecture-fixture',
    sourceHash: 'source-fixture',
  };
  return { ...sansHash, refHash: canonicalSha256(sansHash) } as FoodCompassActionRef;
}

const REF_ALIMENT = refAliment();

function action(overrides: Partial<ProtocolAction> = {}): ProtocolAction {
  return {
    actionId: 'action-1', type: 'food', title: 'Action alimentaire fixture',
    idealPlan: 'Plan idéal fixture.', minimalPlan: 'Plan minimal fixture.',
    rescuePlan: 'Plan secours fixture.', limitations: [],
    interventionStatus: 'active', ...overrides,
  };
}

function build(actions: ProtocolAction[], version: ProtocolDraft['version'] = VERSION_PROTOCOL_DRAFT_V4) {
  return buildProtocolDraft({
    protocolDraftId: 'protocol-1', decisionCard: card(), createdAt: '2026-01-02T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z', purpose: 'Raison fixture.',
    followUpCriterion: 'Critère observable fixture.', actions,
    therapeuticLoad: { level: 'moderate', source: 'practitioner', justification: null },
    version,
  });
}

describe('Un protocole V4 peut porter l’assiette ET la Boussole', () => {
  it('les deux références coexistent sur la même action, et SURVIVENT à la construction', () => {
    // LE PIÈGE QUE CE CAS FERME : `normalizeActions` RECONSTRUIT chaque action
    // depuis une liste blanche. Un champ qu'elle ignore n'est ni refusé ni
    // persisté — il disparaît. Le cas ne vérifie donc pas seulement que la
    // construction passe, mais que la clé EST LÀ ensuite.
    const construit = build([action({
      foodCompassRef: REF_ALIMENT,
      recommendedPlateRef: getCurrentRecommendedPlateRef('ASSIETTE_DOPAMINERGIQUE'),
    })]);
    expect(Object.keys(construit.actions[0])).toContain('foodCompassRef');
    expect(Object.keys(construit.actions[0])).toContain('recommendedPlateRef');
    expect(construit.actions[0].foodCompassRef).toEqual(REF_ALIMENT);
  });

  it('une Boussole SEULE reste acceptée en V4 — l’assiette n’est exigée nulle part', () => {
    // L'exclusivité était UNILATÉRALE : V2 exige au moins une référence C5,
    // V4 n'exige aucune assiette. Seule la moitié qui bloquait tombe.
    const construit = build([action({ foodCompassRef: REF_ALIMENT })]);
    expect(construit.actions[0].foodCompassRef).toEqual(REF_ALIMENT);
    expect(Object.keys(construit.actions[0])).not.toContain('recommendedPlateRef');
  });

  it('V1 et V3 gardent leur refus, MOT POUR MOT', () => {
    const avecBoussole = action({ foodCompassRef: REF_ALIMENT, interventionStatus: undefined });
    for (const version of [VERSION_PROTOCOL_DRAFT, VERSION_PROTOCOL_DRAFT_V3]) {
      expect(() => build([avecBoussole], version)).toThrow('payload protocole V4 explicite');
    }
  });

  it('UNE ACTION NON ALIMENTAIRE NE PORTE PAS DE BOUSSOLE — refusée à l’ÉCRITURE', () => {
    // CONSTAT DE REVUE, ET C'EST L'ASYMÉTRIE QUE CE LOT EXISTE POUR FERMER,
    // REJOUÉE D'UN CRAN. Ma première rédaction ouvrait V4 sans contrôler le type
    // d'action. `assertProtocolDraftC5Structure` refuse pourtant une référence
    // C5 portée par une action non alimentaire — mais à la RELECTURE. On
    // pouvait donc PERSISTER une version que plus personne ne savait relire.
    //
    // Un refus à l'écriture est un message au praticien ; un refus à la
    // relecture est un protocole mort. Les deux autres chemins portaient déjà
    // ce terme : c'était le seul des trois à ne pas l'avoir.
    const hydratationAvecBoussole = action({ type: 'hydration', foodCompassRef: REF_ALIMENT });
    expect(() => build([hydratationAvecBoussole])).toThrow('exige une action alimentaire');

    // ET LE REFUS DE L'ÉCRITURE DIT LA MÊME CHOSE QUE CELUI DE LA RELECTURE —
    // sans quoi les deux gardes se contrediraient sur le même fait.
    const relu: ProtocolDraft = {
      ...build([action({ foodCompassRef: REF_ALIMENT })]),
    };
    relu.actions = [{ ...relu.actions[0], type: 'hydration' }];
    expect(() => assertProtocolDraftC5Structure(relu)).toThrow('exige une action alimentaire');
  });

  it('AUCUNE EMPREINTE NE BOUGE pour une action qui ne porte pas de Boussole', () => {
    const sansClef = build([action()]);
    const clefIndefinie = build([action({ foodCompassRef: undefined })]);
    expect(sansClef.inputHash).toBe(clefIndefinie.inputHash);
    expect(Object.keys(sansClef.actions[0])).not.toContain('foodCompassRef');
  });
});

describe('La relecture accepte ce que l’écriture produit désormais', () => {
  function draftPersiste(overrides: Partial<ProtocolDraft> = {}): ProtocolDraft {
    return {
      ...build([action({ foodCompassRef: REF_ALIMENT })]),
      ...overrides,
    };
  }

  it('un payload V4 porteur d’une Boussole passe la structure C5', () => {
    // Elle l'acceptait DÉJÀ — elle ne nomme que V1 et V2. Ce lot aligne
    // l'écriture sur ce que la lecture tolérait ; il n'élargit pas la lecture,
    // et ce cas l'épingle pour qu'une révision ne « resserre » pas les deux
    // d'un coup en croyant corriger une asymétrie.
    expect(() => assertProtocolDraftC5Structure(draftPersiste())).not.toThrow();
  });

  it('un payload V2 SANS aucune référence reste refusé', () => {
    const sansRef = { ...draftPersiste({ version: VERSION_PROTOCOL_DRAFT_V2 }), actions: [action()] };
    expect(() => assertProtocolDraftC5Structure(sansRef))
      .toThrow('Structure C5 incompatible avec la version du protocole.');
  });

  it('une Boussole sur une action qui n’est pas alimentaire reste refusée, en V4 comme ailleurs', () => {
    const mauvaisType = draftPersiste({
      actions: [action({ type: 'hydration', foodCompassRef: REF_ALIMENT })],
    });
    expect(() => assertProtocolDraftC5Structure(mauvaisType)).toThrow('action alimentaire');
  });
});
