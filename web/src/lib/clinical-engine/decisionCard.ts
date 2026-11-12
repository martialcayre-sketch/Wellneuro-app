import { canonicalSha256 } from './canonical';
import {
  LIBELLE_PRIORITE_LIBRE_MAX,
  estBesoinsVisesCanoniques,
  estDomainePrioriteLibre,
  estIdentifiantPrioriteLibre,
  normaliserLibellePrioriteLibre,
} from './prioriteLibre';
import { identifiantPrioriteLibre } from './prioriteLibreServeur';
import { VERSION_DECISION_CARD } from './types';
import type {
  ClinicalFindingProvenance,
  ClinicalReview,
  ClinicalSnapshot,
  DecisionCard,
  DecisionCounterfactual,
  DecisionPriorityCandidate,
  DecisionPrioritySelection,
  PrioriteNonProposee,
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
  /** [[D-495]] §4 — priorités écartées avant le classement faute de claim admissible. */
  prioritesNonProposees?: PrioriteNonProposee[];
  /** [[D-495]] §3 — la validité des sources de la table n'a pas pu être vérifiée. */
  validitePrioritesNonVerifiee?: boolean;
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
    if (estIdentifiantPrioriteLibre(selectedMainPriority.candidateId)) {
      // LA PRIORITÉ POSÉE PAR LE PRATICIEN ([[D-279]]) n'est pas un candidat :
      // elle ne se vérifie pas contre le classement, mais contre elle-même —
      // domaine de la liste fermée, libellé normalisé non vide, identifiant
      // qui en dérive. Seul un constat de sécurité la refuse (§2) : ni
      // l'absence de candidat, ni l'abstention pour recueil incomplet.
      if (input.review.safetyFindings.length > 0) {
        throw new TypeError('Une priorité ne peut être posée avant la revue des constats de sécurité.');
      }
      const libre = selectedMainPriority.libre;
      if (!libre || !estDomainePrioriteLibre(libre.domaine)) {
        throw new TypeError('Une priorité posée par le praticien exige un domaine de la liste fermée.');
      }
      if (libre.libelle !== normaliserLibellePrioriteLibre(libre.libelle)
        || libre.libelle === ''
        || libre.libelle.length > LIBELLE_PRIORITE_LIBRE_MAX) {
        throw new TypeError('Le libellé d’une priorité posée par le praticien est vide, trop long ou non normalisé.');
      }
      // LES BESOINS VISÉS ([[D-338]] §3) : clé absente ou forme canonique —
      // jamais `[]`, qui ferait dériver l'empreinte d'une carte déjà ancrée.
      if (libre.besoinsVises !== undefined && !estBesoinsVisesCanoniques(libre.besoinsVises)) {
        throw new TypeError('Les besoins visés d’une priorité posée sont vides, hors des douze besoins ou non rangés.');
      }
      if (selectedMainPriority.candidateId !== identifiantPrioriteLibre(libre)) {
        throw new TypeError('L’identifiant de la priorité posée ne correspond pas à son domaine et à son libellé.');
      }
    } else {
      if (selectedMainPriority.libre !== undefined) {
        throw new TypeError('Un candidat du moteur ne porte pas de libellé libre.');
      }
      if (blocked) throw new TypeError('Une priorité ne peut être sélectionnée avant la levée des bloqueurs.');
      if (!candidatesById.has(selectedMainPriority.candidateId)) {
        throw new TypeError('La priorité sélectionnée doit appartenir aux candidats classés.');
      }
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
  const prioritesNonProposees = normaliserPrioritesNonProposees(
    input.prioritesNonProposees ?? [],
    candidatesById,
  );
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
    // Les constats ADRESSÉS ([[D-257]]) : portés, jamais bloquants. Absent
    // quand vide, pour que l'empreinte des cartes sans adressage ne bouge pas.
    ...((input.review.safetyFindingsAdresses?.length ?? 0) > 0
      ? { safetyFindingAdresseIds: uniqueSorted(input.review.safetyFindingsAdresses!.map(finding => finding.findingId)) }
      : {}),
    // [[D-495]] : MÊME GARDE D'EMPREINTE. Absents quand vides, pour que
    // l'empreinte d'une carte ordinaire — tous les claims admissibles — ne
    // bouge pas, et qu'aucun protocole diffusé ne s'interrompe au déploiement.
    ...(prioritesNonProposees.length > 0 ? { prioritesNonProposees } : {}),
    ...(input.validitePrioritesNonVerifiee ? { validitePrioritesNonVerifiee: true as const } : {}),
    abstention: input.review.abstention,
    limitations,
  };
  const { decisionCardId: _decisionCardId, ...hashInput } = withoutHash;
  return { ...withoutHash, inputHash: canonicalSha256(hashInput) };
}

/**
 * Les priorités non proposées ([[D-495]] §4), validées puis triées par règle :
 * l'ordre entre dans l'empreinte, il ne doit dépendre que du contenu. Une
 * règle à la fois candidate et non proposée serait une incohérence du
 * producteur, pas un cas clinique : elle fait jeter la carte.
 */
function normaliserPrioritesNonProposees(
  entrees: PrioriteNonProposee[],
  candidatesById: Map<string, DecisionPriorityCandidate>,
): PrioriteNonProposee[] {
  const reglesCandidates = new Set([...candidatesById.values()].map(candidate => candidate.ruleId));
  const vues = new Set<string>();
  const normalisees = entrees.map(entree => {
    nonEmpty(entree.ruleId, 'règle de priorité non proposée');
    nonEmpty(entree.label, 'libellé de priorité non proposée');
    if (entree.claims.length === 0) {
      throw new TypeError('Une priorité non proposée doit nommer au moins un claim non admissible.');
    }
    for (const claim of entree.claims) {
      nonEmpty(claim.claimId, 'claim de priorité non proposée');
      nonEmpty(claim.versionClaim, 'version de claim de priorité non proposée');
    }
    if (vues.has(entree.ruleId) || reglesCandidates.has(entree.ruleId)) {
      throw new TypeError('Une règle de priorité ne peut être à la fois candidate et non proposée.');
    }
    vues.add(entree.ruleId);
    return {
      ruleId: entree.ruleId,
      label: entree.label,
      claims: entree.claims.map(claim => ({ claimId: claim.claimId, versionClaim: claim.versionClaim })),
    };
  });
  return normalisees.sort((a, b) => (a.ruleId < b.ruleId ? -1 : a.ruleId > b.ruleId ? 1 : 0));
}
