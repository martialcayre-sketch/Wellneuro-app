import { describe, expect, it } from 'vitest';
import { buildProtocolDraft } from '@/lib/clinical-engine/protocolDraft';
import {
  VERSION_PROTOCOL_DRAFT_V4,
  type DecisionCard,
  type ProtocolAction,
} from '@/lib/clinical-engine/types';
import { isApprovalStale, resolveActiveApproval } from '@/lib/protocol/diffusion';
import { resolveActiveVersion } from '@/lib/protocol/versioning';
import { arbitragesSansRevision } from '@/lib/fil/biologieArbitree';
import { cartesBiologieArbitree } from '@/lib/fil/cartes';
import { preparerArbitrage } from './arbitrage';
import { appliquerArbitrages, refusResolutionSansArbitrage, type ArbitrageLie } from './revision';

// Scénario bout-en-bout du Lot G (critère 1), au niveau domaine : intention
// fer `conditionnelle_biologie` → arbitrage `infirme` → carte de Fil →
// version révisée sans le fer actif, motif « après bilan » → l'approbation
// devient caduque (re-approbation obligatoire) → re-approuvée, le portail est
// à jour → la carte s'éteint. Chaque maillon est le module de production,
// jamais une copie de test.

function carte(): DecisionCard {
  return {
    decisionCardId: 'dc-boucle',
    snapshotId: 'snap-1',
    snapshotInputHash: 'snap-hash',
    reviewId: 'rev-1',
    reviewInputHash: 'rev-hash',
    createdAt: '2026-08-01T00:00:00.000Z',
    version: 'c1-decision-card-v1',
    status: 'draft',
    priorityCandidates: [{
      candidateId: 'p1',
      origin: 'engine',
      label: 'Priorité digestive',
      rank: 1,
      confidence: 'à_documenter',
      ruleId: 'R',
      rationale: 'Fixture.',
      provenance: { responseIds: [], needIds: [], clinicalObjectCodes: [] },
      limitations: [],
    }],
    proposedMainPriorityId: 'p1',
    selectedMainPriority: {
      candidateId: 'p1',
      selectedAt: '2026-08-01T00:00:00.000Z',
      selectedBy: 'practitioner',
      rationale: 'Fixture.',
    },
    counterfactuals: [],
    missingDataFindingIds: [],
    discordanceFindingIds: [],
    safetyFindingIds: [],
    abstention: { status: 'not_required', ruleIds: ['R'], limitations: [] },
    limitations: [],
    inputHash: 'dc-hash',
  };
}

const ACTION_FER: ProtocolAction = {
  actionId: 'act-fer',
  type: 'biological_exploration',
  title: 'Explorer le statut martial avant supplémentation',
  idealPlan: 'i',
  minimalPlan: 'm',
  rescuePlan: 'r',
  limitations: [],
  interventionStatus: 'conditionnelle_biologie',
  waitFor: { type: 'biologie', cible: 'ferritine' },
};

function version(actions: ProtocolAction[], updatedAt: string) {
  return buildProtocolDraft({
    protocolDraftId: 'proto_dc-boucle',
    decisionCard: carte(),
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt,
    purpose: 'Confort digestif',
    followUpCriterion: 'Ballonnements en baisse à J21',
    actions,
    therapeuticLoad: { level: 'moderate', source: 'practitioner', justification: null },
    review: {
      reviewedAt: updatedAt,
      reviewerRole: 'practitioner',
      confirmation: 'content_reviewed',
    },
    version: VERSION_PROTOCOL_DRAFT_V4,
  });
}

describe('boucle de révision biologie (Lot G, critère 1)', () => {
  it('déroule la chaîne complète : arbitrage → carte → révision → re-approbation → carte éteinte', () => {
    // 1. Version active avec une intention fer en attente de biologie.
    const v1 = version([ACTION_FER], '2026-08-02T00:00:00.000Z');
    const ligneV1 = {
      id: `proto_dc-boucle#${v1.inputHash}`,
      inputHash: v1.inputHash,
      supersedesDraftId: null,
      createdAt: new Date('2026-08-02T00:00:00.000Z'),
    };

    // 2. Approbation de diffusion ancrée sur la V1 : le portail sert V1.
    const approbationV1 = {
      id: 'appr-1',
      protocolDraftInputHash: v1.inputHash,
      supersedesApprovalId: null,
      createdAt: new Date('2026-08-03T00:00:00.000Z'),
    };
    expect(isApprovalStale(approbationV1, v1.inputHash)).toBe(false);

    // 3. Le bilan revient hors outil : arbitrage `infirme`, note obligatoire.
    const sansNote = preparerArbitrage({
      intentionId: 'act-fer',
      verdict: 'infirme',
      actions: v1.actions,
    });
    expect(sansNote).toEqual({ ok: false, raison: 'note_obligatoire_pour_infirme' });
    const preparation = preparerArbitrage({
      intentionId: 'act-fer',
      verdict: 'infirme',
      noteCourte: 'Ferritine documentée normale au bilan du 12/08.',
      actions: v1.actions,
    });
    expect(preparation.ok).toBe(true);
    if (!preparation.ok) return;
    const arbitrage: ArbitrageLie = {
      ...preparation.donnees,
      arbitreLe: '2026-08-15T09:00:00.000Z',
    };

    // 4. Arbitrage présent, révision absente : la carte de Fil s'allume.
    const arbitrageRow = {
      idPatient: 'PAT_TEST',
      protocolDraftId: ligneV1.id,
      intentionId: 'act-fer',
      verdict: 'infirme',
      arbitreLe: new Date(arbitrage.arbitreLe),
    };
    const enAttente = arbitragesSansRevision([arbitrageRow], [ligneV1]);
    const cartes = cartesBiologieArbitree(enAttente, new Map([['PAT_TEST', 'Michel Dogné']]));
    expect(cartes).toHaveLength(1);
    expect(cartes[0].titre).toBe('Biologie arbitrée — protocole à réviser');

    // 5. Résoudre SANS arbitrage lié est impossible (critère 2) — et la
    //    résolution proposée doit suivre le verdict.
    const resolutionPirate = v1.actions.map(a =>
      a.actionId === 'act-fer'
        ? { ...a, interventionStatus: 'active' as const, waitFor: undefined }
        : a);
    expect(refusResolutionSansArbitrage({
      actionsActives: v1.actions,
      actionsSoumises: resolutionPirate,
      arbitrages: [],
    })).toContain('exige un arbitrage biologique lié');
    expect(refusResolutionSansArbitrage({
      actionsActives: v1.actions,
      actionsSoumises: resolutionPirate,
      arbitrages: [arbitrage],
    })).toContain('ne peut être que « non indiquée actuellement »');

    // 6. La révision applique le verdict : fer conservé, non indiqué, motivé.
    const actionsRevisees = appliquerArbitrages(v1.actions, [arbitrage]);
    expect(refusResolutionSansArbitrage({
      actionsActives: v1.actions,
      actionsSoumises: actionsRevisees,
      arbitrages: [arbitrage],
    })).toBeNull();
    const v2 = version(actionsRevisees, '2026-08-15T10:00:00.000Z');
    const fer = v2.actions.find(a => a.actionId === 'act-fer');
    expect(fer?.interventionStatus).toBe('non_indiquee_actuellement');
    expect(fer?.waitFor).toBeUndefined();
    expect(fer?.limitations.join(' ')).toContain('après bilan biologique');
    expect(fer?.limitations.join(' ')).toContain('Ferritine documentée normale');

    // 7. La V2 supplante la V1 et rend l'approbation caduque : re-revue faite
    //    (la version est relue), re-approbation OBLIGATOIRE — entre-temps le
    //    portail sert la version qu'ancre l'approbation courante, la V1.
    const ligneV2 = {
      id: `proto_dc-boucle#${v2.inputHash}`,
      inputHash: v2.inputHash,
      supersedesDraftId: ligneV1.id,
      createdAt: new Date('2026-08-15T10:00:00.000Z'),
    };
    expect(v2.inputHash).not.toBe(v1.inputHash);
    expect(resolveActiveVersion([ligneV1, ligneV2])?.id).toBe(ligneV2.id);
    expect(isApprovalStale(approbationV1, v2.inputHash)).toBe(true);

    // 8. Re-approbation ancrée sur la V2 : le portail est à jour.
    const approbationV2 = {
      id: 'appr-2',
      protocolDraftInputHash: v2.inputHash,
      supersedesApprovalId: 'appr-1',
      createdAt: new Date('2026-08-15T11:00:00.000Z'),
    };
    const approbationActive = resolveActiveApproval([approbationV1, approbationV2]);
    expect(approbationActive?.id).toBe('appr-2');
    expect(isApprovalStale(approbationActive, v2.inputHash)).toBe(false);

    // 9. Révision présente : la carte s'éteint d'elle-même, sans nettoyage.
    expect(arbitragesSansRevision([arbitrageRow], [ligneV1, ligneV2])).toEqual([]);

    // 10. L'historique se relit sans trou : intention → arbitrage (note) →
    //     version révisée qui porte le motif — chaque maillon est persisté.
    expect(v1.actions[0].interventionStatus).toBe('conditionnelle_biologie');
    expect(arbitrage.noteCourte).toBe('Ferritine documentée normale au bilan du 12/08.');
    expect(ligneV2.supersedesDraftId).toBe(ligneV1.id);
  });
});
