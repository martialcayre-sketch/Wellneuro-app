import { describe, expect, it } from 'vitest';
import { buildPatientProtocolView } from './patientProtocolView';
import { buildProtocolDraft } from './protocolDraft';
import { canonicalSha256 } from './canonical';
import { assertProtocolDraftPlateStructure } from '@/lib/food-compass/refValidation';
import {
  assertRefAssietteDIndication,
  assertRefAssietteDObservation,
  estAssietteDIndication,
  getCurrentRecommendedPlateRef,
} from '@/lib/food-compass/plates';
import {
  VERSION_PROTOCOL_DRAFT,
  VERSION_PROTOCOL_DRAFT_V2,
  VERSION_PROTOCOL_DRAFT_V3,
  VERSION_PROTOCOL_DRAFT_V4,
} from './types';
import type {
  DecisionCard,
  ProtocolAction,
  ProtocolDiffusionApproval,
  ProtocolDraft,
} from './types';
import type { RecommendedPlateRef } from '@/lib/food-compass/types';

// L'ASSIETTE COMME UNITÉ D'ACTION ([[D-240]]) — matrice d'acceptation et de
// refus. Trois termes gardent l'écriture : le contrat V4, le type d'action
// `food`, et l'axe d'indication ; la relecture d'un payload persisté, elle,
// vérifie la structure et RIEN DE PLUS. Cette asymétrie est le sujet des deux
// derniers blocs, et c'est elle qu'une mutation casserait le plus discrètement.

const ASSIETTE_INDIQUEE = 'ASSIETTE_DOPAMINERGIQUE';
const REPERE_DE_REPAS = 'ASSIETTE_SOIR_LEGER';

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

/**
 * AUCUNE VERSION DEMANDÉE — et c'est un cas distinct, pas la même chose que
 * `build(actions, undefined)` : passer `undefined` déclenche le défaut du
 * paramètre, donc V4. Le moteur, lui, retombe sur V1 quand la clé est absente,
 * et c'est ce chemin-là qu'un écran empruntera s'il oublie de demander V4.
 */
function buildSansVersionDemandee(actions: ProtocolAction[]) {
  return buildProtocolDraft({
    protocolDraftId: 'protocol-1', decisionCard: card(), createdAt: '2026-01-02T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z', purpose: 'Raison fixture.',
    followUpCriterion: 'Critère observable fixture.', actions,
    therapeuticLoad: { level: 'moderate', source: 'practitioner', justification: null },
  });
}

function draftPersiste(overrides: Partial<ProtocolDraft> = {}): ProtocolDraft {
  return {
    protocolDraftId: 'protocol-1', decisionCardId: 'card-1', decisionCardInputHash: 'card-hash',
    selectedPriorityId: 'priority-1', createdAt: '2026-01-02T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z', version: VERSION_PROTOCOL_DRAFT_V4,
    status: 'draft', purpose: 'Raison fixture.', followUpCriterion: 'Critère observable fixture.',
    adviceSheetRef: null,
    actions: [action({ recommendedPlateRef: getCurrentRecommendedPlateRef(ASSIETTE_INDIQUEE) })],
    therapeuticLoad: { level: 'moderate', source: 'practitioner', justification: null },
    review: null, limitations: [], inputHash: 'protocol-hash', ...overrides,
  };
}

describe('L’axe d’une assiette décide ce qu’elle a le droit de porter', () => {
  it('les douze assiettes d’indication sont prescriptibles, les trois repères ne le sont pas', () => {
    expect(estAssietteDIndication(ASSIETTE_INDIQUEE)).toBe(true);
    expect(estAssietteDIndication('ASSIETTE_EPARGNE_DIGESTIVE')).toBe(true);
    expect(estAssietteDIndication(REPERE_DE_REPAS)).toBe(false);
    expect(estAssietteDIndication('ASSIETTE_PETIT_DEJEUNER_SIMPLE')).toBe(false);
    // Un code inconnu ne lève pas ici : il rend `false`. Le refus explicite
    // appartient à l'assertion, qui distingue « caduque » de « mauvais axe ».
    expect(estAssietteDIndication('ASSIETTE_QUI_N_EXISTE_PAS')).toBe(false);
  });

  it('le miroir tient dans LES DEUX SENS — et c’est tout l’objet de la paire', () => {
    const indication = getCurrentRecommendedPlateRef(ASSIETTE_INDIQUEE);
    const repere = getCurrentRecommendedPlateRef(REPERE_DE_REPAS);
    expect(assertRefAssietteDIndication(indication)).toEqual(indication);
    expect(assertRefAssietteDObservation(repere)).toEqual(repere);
    expect(() => assertRefAssietteDIndication(repere)).toThrow('ne se prescrit pas');
    expect(() => assertRefAssietteDObservation(indication)).toThrow('observation alimentaire');
  });

  it('une référence CADUQUE se dit caduque, jamais « du mauvais axe » — l’ordre compte', () => {
    const perimee = { ...getCurrentRecommendedPlateRef(REPERE_DE_REPAS), contentHash: 'perime' };
    // Le repère est du mauvais axe ET périmé : c'est la péremption qui doit
    // sortir, sans quoi le praticien corrigerait le mauvais problème.
    expect(() => assertRefAssietteDIndication(perimee)).toThrow('inconnue ou caduque');
  });

  it('elle RE-DÉRIVE au lieu de valider : une référence retouchée est refusée, et la copie rendue est celle du catalogue', () => {
    const officielle = getCurrentRecommendedPlateRef(ASSIETTE_INDIQUEE);
    expect(() => assertRefAssietteDIndication({ ...officielle, refHash: 'retouche' }))
      .toThrow('inconnue ou caduque');
    const rendue = assertRefAssietteDIndication({ ...officielle });
    expect(rendue).not.toBe(officielle);
    expect(rendue).toEqual(officielle);
  });
});

describe('L’écriture — trois portes, et aucune n’est facultative', () => {
  it('accepte une assiette d’indication sur une action `food` d’un payload V4', () => {
    const construit = build([action({ recommendedPlateRef: getCurrentRecommendedPlateRef(ASSIETTE_INDIQUEE) })]);
    expect(construit.actions[0].recommendedPlateRef)
      .toEqual(getCurrentRecommendedPlateRef(ASSIETTE_INDIQUEE));
  });

  it('refuse hors du contrat V4 — V1, V2 et V3 comprises', () => {
    const avecAssiette = action({
      recommendedPlateRef: getCurrentRecommendedPlateRef(ASSIETTE_INDIQUEE),
      interventionStatus: undefined,
    });
    for (const version of [VERSION_PROTOCOL_DRAFT, VERSION_PROTOCOL_DRAFT_V2, VERSION_PROTOCOL_DRAFT_V3]) {
      expect(() => build([avecAssiette], version)).toThrow('payload protocole V4 explicite');
    }
  });

  it('refuse quand AUCUN contrat n’est demandé — le moteur retombe en V1, et c’est le cas que l’écran atteindrait', () => {
    // C'est le défaut exact que la demande de contrat du constructeur ferme :
    // sans lui, une assiette posée sur un protocole sans suspension partait par
    // ce chemin-là.
    expect(() => buildSansVersionDemandee([action({
      recommendedPlateRef: getCurrentRecommendedPlateRef(ASSIETTE_INDIQUEE),
      interventionStatus: undefined,
    })])).toThrow('payload protocole V4 explicite');
  });

  it('refuse une action qui n’est pas alimentaire', () => {
    expect(() => build([action({
      type: 'chronobiology',
      recommendedPlateRef: getCurrentRecommendedPlateRef(ASSIETTE_INDIQUEE),
    })])).toThrow('action alimentaire');
  });

  it('refuse un repère de MOMENT DE REPAS — il n’est adossé à aucun protocole du corpus', () => {
    expect(() => build([action({
      recommendedPlateRef: getCurrentRecommendedPlateRef(REPERE_DE_REPAS),
    })])).toThrow('ne se prescrit pas');
  });

  it('refuse une référence dont le `contentHash` a été réécrit', () => {
    const retouchee = { ...getCurrentRecommendedPlateRef(ASSIETTE_INDIQUEE), contentHash: 'retouche' };
    expect(() => build([action({ recommendedPlateRef: retouchee })])).toThrow('inconnue ou caduque');
  });

  it('LE CHAMP N’EST PAS ABANDONNÉ EN SILENCE — c’est le piège de `normalizeActions`', () => {
    // `normalizeActions` RECONSTRUIT chaque action depuis une liste blanche :
    // un champ que la liste ignore disparaît sans erreur, donc sans entrer au
    // hachage ni au payload. Ce cas existe pour que le retrait de
    // `...normalizePlateRef(...)` rougisse ICI plutôt qu'en production.
    const construit = build([action({ recommendedPlateRef: getCurrentRecommendedPlateRef(ASSIETTE_INDIQUEE) })]);
    expect(Object.keys(construit.actions[0])).toContain('recommendedPlateRef');
    expect(JSON.stringify(construit)).toContain(ASSIETTE_INDIQUEE);
  });

  it('UNE ACTION SANS ASSIETTE GARDE EXACTEMENT SON EMPREINTE — aucun payload persisté ne se périme', () => {
    const sansClef = build([action()]);
    const clefIndefinie = build([action({ recommendedPlateRef: undefined })]);
    expect(sansClef.inputHash).toBe(clefIndefinie.inputHash);
    // Et l'empreinte reste celle que le contrat calculait avant ce lot : elle
    // se recalcule ici sur le draft privé de son identifiant, à l'identique.
    const { protocolDraftId: _id, inputHash: _hash, ...corps } = sansClef;
    expect(canonicalSha256(corps)).toBe(sansClef.inputHash);
    expect(Object.keys(sansClef.actions[0])).not.toContain('recommendedPlateRef');
  });

  it('une assiette CHANGE l’empreinte — attacher est un changement clinique, pas un no-op', () => {
    const sans = build([action()]);
    const avec = build([action({ recommendedPlateRef: getCurrentRecommendedPlateRef(ASSIETTE_INDIQUEE) })]);
    expect(avec.inputHash).not.toBe(sans.inputHash);
  });
});

describe('La relecture — stricte à l’entrée, CONSERVATRICE à la sortie', () => {
  it('relit un payload bien formé', () => {
    expect(() => assertProtocolDraftPlateStructure(draftPersiste())).not.toThrow();
  });

  it('EXIGE LE CONTRAT V4 — un payload V1, V2 ou V3 forgé ne fait pas passer une assiette', () => {
    // Constat de revue, et ma première rédaction avait étendu l'asymétrie à ce
    // qui ne la justifiait pas : le CATALOGUE est extérieur au payload et peut
    // dériver — le contrôler en lecture éteindrait un protocole légitime —, mais
    // la VERSION est dans le payload et dans son empreinte. La contrôler ne peut
    // éteindre personne, et son absence laissait passer ce que l'écriture refuse.
    for (const version of [VERSION_PROTOCOL_DRAFT, VERSION_PROTOCOL_DRAFT_V2, VERSION_PROTOCOL_DRAFT_V3]) {
      expect(() => assertProtocolDraftPlateStructure(draftPersiste({
        version,
        actions: [action({
          interventionStatus: undefined,
          recommendedPlateRef: getCurrentRecommendedPlateRef(ASSIETTE_INDIQUEE),
        })],
      }))).toThrow('payload protocole V4 explicite');
    }
  });

  it('relit sans broncher une action SANS assiette, quel que soit le contrat', () => {
    expect(() => assertProtocolDraftPlateStructure(draftPersiste({
      version: VERSION_PROTOCOL_DRAFT, actions: [action({ interventionStatus: undefined })],
    }))).not.toThrow();
  });

  it('refuse une assiette portée par une action qui n’est pas alimentaire', () => {
    expect(() => assertProtocolDraftPlateStructure(draftPersiste({
      actions: [action({
        type: 'hydration',
        recommendedPlateRef: getCurrentRecommendedPlateRef(ASSIETTE_INDIQUEE),
      })],
    }))).toThrow('action alimentaire');
  });

  it('refuse un contrat de référence inconnu et un champ vide', () => {
    const officielle = getCurrentRecommendedPlateRef(ASSIETTE_INDIQUEE);
    const mauvaises: RecommendedPlateRef[] = [
      { ...officielle, contractVersion: 'c5-recommended-plate-ref-v0' as RecommendedPlateRef['contractVersion'] },
      { ...officielle, plateCode: '   ' },
      { ...officielle, catalogVersion: '' },
      { ...officielle, contentHash: '' },
      { ...officielle, refHash: '  ' },
    ];
    for (const ref of mauvaises) {
      expect(() => assertProtocolDraftPlateStructure(draftPersiste({
        actions: [action({ recommendedPlateRef: ref })],
      }))).toThrow('Référence d’assiette de protocole invalide.');
    }
  });

  it('NE VÉRIFIE NI LA FRAÎCHEUR NI L’AXE — un protocole diffusé ne s’éteint pas parce que le catalogue a bougé', () => {
    // C'est le cas le plus important du fichier, et le seul qu'une « symétrie »
    // bien intentionnée casserait : brancher `assertRefAssietteDIndication` ici
    // ferait refuser, d'un coup, tout protocole dont l'assiette a changé de
    // libellé — et l'écran du patient s'éteindrait pour une raison qui ne le
    // concerne pas. La fraîcheur se vérifie À L'ÉCRITURE, et là seulement.
    const perimee = { ...getCurrentRecommendedPlateRef(ASSIETTE_INDIQUEE), contentHash: 'catalogue-deplace-depuis' };
    expect(() => assertProtocolDraftPlateStructure(draftPersiste({
      actions: [action({ recommendedPlateRef: perimee })],
    }))).not.toThrow();
    const autreAxe = getCurrentRecommendedPlateRef(REPERE_DE_REPAS);
    expect(() => assertProtocolDraftPlateStructure(draftPersiste({
      actions: [action({ recommendedPlateRef: autreAxe })],
    }))).not.toThrow();
  });
});

describe('Le patient ne reçoit PAS la référence d’assiette', () => {
  it('la vue patient n’en porte aucune trace — ni le champ, ni le code d’assiette', () => {
    const protocolDraft = build([action({
      recommendedPlateRef: getCurrentRecommendedPlateRef(ASSIETTE_INDIQUEE),
      title: 'Assiette dopaminergique',
    })], VERSION_PROTOCOL_DRAFT_V4);
    const relu: ProtocolDraft = {
      ...protocolDraft,
      status: 'practitioner_reviewed',
      review: {
        reviewedAt: '2026-01-03T00:00:00.000Z', reviewerRole: 'practitioner',
        confirmation: 'content_reviewed',
      },
    };
    const approval: ProtocolDiffusionApproval = {
      decisionCardInputHash: 'card-hash',
      protocolDraftInputHash: relu.inputHash,
      approvedAt: '2026-01-04T00:00:00.000Z',
      approvedBy: 'practitioner',
      confirmation: 'content_approved_for_diffusion',
    };
    const vue = buildPatientProtocolView({ decisionCard: card(), protocolDraft: relu, approval });
    const serialisee = JSON.stringify(vue);
    expect(serialisee).not.toContain('recommendedPlateRef');
    expect(serialisee).not.toContain(ASSIETTE_INDIQUEE);
    // Le TITRE, lui, passe — c'est ce que le praticien a écrit pour le patient,
    // et il reste relu par la garde de registre anxiogène côté route. Ce lot ne
    // sert donc au patient RIEN de neuf : le chemin patient est [[LOT-04]].
    expect(serialisee).toContain('Assiette dopaminergique');
  });
});
