import { canonicalSha256 } from './canonical';
import { VERSION_DECISION_CARD } from './types';
import type {
  ClinicalFindingProvenance,
  ClinicalReview,
  ClinicalSnapshot,
  DecisionCard,
  DecisionCounterfactual,
  DecisionPriorityCandidate,
  DecisionPrioritySelection,
  ValidatedClinicalRuleRef,
} from './types';

function nonEmpty(value: string, field: string): string {
  if (!value.trim()) throw new TypeError(`${field} est requis.`);
  return value;
}

function canonicalIso(value: string, field: string): string {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime()) || date.toISOString() !== value) {
    throw new TypeError(`${field} doit être une date ISO canonique valide.`);
  }
  return value;
}

function uniqueSorted<T extends string | number>(values: T[]): T[] {
  return [...new Set(values)].sort((left, right) => (
    typeof left === 'number' && typeof right === 'number'
      ? left - right
      : String(left) < String(right) ? -1 : String(left) > String(right) ? 1 : 0
  ));
}

function normalizeProvenance(
  snapshot: ClinicalSnapshot,
  provenance: ClinicalFindingProvenance
): ClinicalFindingProvenance {
  const responseIds = new Set(snapshot.sourceRefs.map(source => source.responseId));
  const needIds = new Set(snapshot.balanceAssessment.needs.map(need => need.needId));
  const objectCodes = new Set(snapshot.clinicalObjects.map(object => object.code));
  if (
    provenance.responseIds.some(id => !responseIds.has(id))
    || provenance.needIds.some(id => !needIds.has(id))
    || provenance.clinicalObjectCodes.some(code => !objectCodes.has(code))
  ) {
    throw new TypeError('La provenance de décision référence une source absente du ClinicalSnapshot.');
  }
  return {
    responseIds: uniqueSorted(provenance.responseIds),
    needIds: uniqueSorted(provenance.needIds),
    clinicalObjectCodes: uniqueSorted(provenance.clinicalObjectCodes),
  };
}

function validatedRules(review: ClinicalReview): Map<string, ValidatedClinicalRuleRef> {
  return new Map(review.rules
    .filter((rule): rule is ValidatedClinicalRuleRef => rule.lifecycle === 'clinically_validated')
    .map(rule => [rule.ruleId, rule]));
}

export function buildDecisionCard(input: {
  decisionCardId: string;
  createdAt: string;
  snapshot: ClinicalSnapshot;
  review: ClinicalReview;
  candidates?: DecisionPriorityCandidate[];
  proposedMainPriorityId?: string | null;
  selectedMainPriority?: DecisionPrioritySelection | null;
  counterfactuals?: DecisionCounterfactual[];
}): DecisionCard {
  nonEmpty(input.decisionCardId, 'decisionCardId');
  canonicalIso(input.createdAt, 'createdAt');
  if (
    input.review.snapshotId !== input.snapshot.snapshotId
    || input.review.snapshotInputHash !== input.snapshot.inputHash
  ) {
    throw new TypeError('La revue clinique ne correspond pas au ClinicalSnapshot fourni.');
  }

  const rules = validatedRules(input.review);
  const candidatesById = new Map<string, DecisionPriorityCandidate>();
  const ranks = new Set<number>();
  for (const candidate of input.candidates ?? []) {
    nonEmpty(candidate.candidateId, 'candidateId');
    nonEmpty(candidate.label, 'libellé de priorité');
    nonEmpty(candidate.rationale, 'justification de priorité');
    if (!Number.isSafeInteger(candidate.rank) || candidate.rank < 1) {
      throw new TypeError('Le rang d’une priorité doit être un entier positif.');
    }
    if (!['solide', 'probable', 'fragile', 'à_documenter'].includes(candidate.confidence)) {
      throw new TypeError('Statut qualitatif de priorité inconnu.');
    }
    if (candidate.origin !== 'engine') throw new TypeError('Un candidat de priorité doit provenir du moteur.');
    if (!rules.has(candidate.ruleId)) {
      const knownRule = input.review.rules.find(rule => rule.ruleId === candidate.ruleId);
      if (knownRule?.lifecycle === 'candidate') {
        throw new TypeError(`La règle candidate ${candidate.ruleId} ne peut proposer aucune priorité.`);
      }
      throw new TypeError(`Règle de priorité inconnue ou non validée : ${candidate.ruleId}.`);
    }
    if (candidatesById.has(candidate.candidateId)) throw new TypeError(`Candidat dupliqué : ${candidate.candidateId}.`);
    if (ranks.has(candidate.rank)) throw new TypeError(`Rang de priorité dupliqué : ${candidate.rank}.`);
    ranks.add(candidate.rank);
    candidatesById.set(candidate.candidateId, {
      ...candidate,
      provenance: normalizeProvenance(input.snapshot, candidate.provenance),
      limitations: uniqueSorted(candidate.limitations),
    });
  }
  const priorityCandidates = [...candidatesById.values()].sort((left, right) => left.rank - right.rank);
  const blocked = input.review.abstention.status !== 'not_required' || input.review.safetyFindings.length > 0;
  let proposedMainPriorityId = input.proposedMainPriorityId ?? null;
  if (proposedMainPriorityId !== null && !candidatesById.has(proposedMainPriorityId)) {
    throw new TypeError('La priorité proposée doit appartenir aux candidats classés.');
  }
  if (blocked || priorityCandidates.length === 0) proposedMainPriorityId = null;

  let selectedMainPriority = input.selectedMainPriority ?? null;
  if (selectedMainPriority !== null) {
    if (selectedMainPriority.selectedBy !== 'practitioner') {
      throw new TypeError('La priorité sélectionnée appartient au praticien.');
    }
    if (blocked) throw new TypeError('Une priorité ne peut être sélectionnée avant la levée des bloqueurs.');
    if (!candidatesById.has(selectedMainPriority.candidateId)) {
      throw new TypeError('La priorité sélectionnée doit appartenir aux candidats classés.');
    }
    canonicalIso(selectedMainPriority.selectedAt, 'selectedAt');
    nonEmpty(selectedMainPriority.rationale, 'justification de sélection');
    selectedMainPriority = { ...selectedMainPriority };
  }

  const counterfactualsById = new Map<string, DecisionCounterfactual>();
  for (const counterfactual of input.counterfactuals ?? []) {
    nonEmpty(counterfactual.counterfactualId, 'counterfactualId');
    nonEmpty(counterfactual.condition, 'condition contre-factuelle');
    nonEmpty(counterfactual.expectedImpact, 'impact contre-factuel');
    if (!candidatesById.has(counterfactual.candidateId)) {
      throw new TypeError('Un contre-factuel doit référencer un candidat classé.');
    }
    if (counterfactualsById.has(counterfactual.counterfactualId)) {
      throw new TypeError(`Contre-factuel dupliqué : ${counterfactual.counterfactualId}.`);
    }
    counterfactualsById.set(counterfactual.counterfactualId, {
      ...counterfactual,
      provenance: normalizeProvenance(input.snapshot, counterfactual.provenance),
      limitations: uniqueSorted(counterfactual.limitations),
    });
  }
  const counterfactuals = [...counterfactualsById.values()].sort((left, right) => (
    left.counterfactualId < right.counterfactualId ? -1 : left.counterfactualId > right.counterfactualId ? 1 : 0
  ));
  const limitations = uniqueSorted([
    ...input.review.limitations,
    ...(blocked ? ['Aucune priorité ne peut être proposée avant une évaluation explicite de l’abstention et la revue des bloqueurs.'] : []),
  ]);
  const withoutHash = {
    decisionCardId: input.decisionCardId,
    snapshotId: input.snapshot.snapshotId,
    snapshotInputHash: input.snapshot.inputHash,
    reviewId: input.review.reviewId,
    reviewInputHash: input.review.inputHash,
    createdAt: input.createdAt,
    version: VERSION_DECISION_CARD,
    status: 'draft' as const,
    priorityCandidates,
    proposedMainPriorityId,
    selectedMainPriority,
    counterfactuals,
    missingDataFindingIds: uniqueSorted(input.review.missingData.map(finding => finding.findingId)),
    discordanceFindingIds: uniqueSorted(input.review.discordances.map(finding => finding.findingId)),
    safetyFindingIds: uniqueSorted(input.review.safetyFindings.map(finding => finding.findingId)),
    abstention: input.review.abstention,
    limitations,
  };
  const { decisionCardId: _decisionCardId, ...hashInput } = withoutHash;
  return { ...withoutHash, inputHash: canonicalSha256(hashInput) };
}
