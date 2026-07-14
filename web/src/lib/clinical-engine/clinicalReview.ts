import { canonicalJson, canonicalSha256 } from './canonical';
import { VERSION_CLINICAL_REVIEW } from './types';
import type {
  AbstentionAssessment,
  ClinicalFindingProvenance,
  ClinicalReview,
  ClinicalRuleRef,
  ClinicalSnapshot,
  DiscordanceFinding,
  MissingDataFinding,
  SafetyFinding,
  ValidatedClinicalRuleRef,
} from './types';

type AuthoredFindings = {
  missingData?: MissingDataFinding[];
  discordances?: DiscordanceFinding[];
  safetyFindings?: SafetyFinding[];
  abstention?: AbstentionAssessment;
};

const STRUCTURAL_IMPACT = 'Cette absence peut limiter la préparation de la décision et doit être documentée par le praticien.';

function canonicalIso(value: string, field: string): string {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime()) || date.toISOString() !== value) {
    throw new TypeError(`${field} doit être une date ISO canonique valide.`);
  }
  return value;
}

function nonEmpty(value: string, field: string): string {
  if (!value.trim()) throw new TypeError(`${field} est requis.`);
  return value;
}

function uniqueSorted<T extends string | number>(values: T[]): T[] {
  return [...new Set(values)].sort((left, right) => (
    typeof left === 'number' && typeof right === 'number'
      ? left - right
      : String(left) < String(right) ? -1 : String(left) > String(right) ? 1 : 0
  ));
}

function normalizeProvenance(provenance: ClinicalFindingProvenance): ClinicalFindingProvenance {
  return {
    responseIds: uniqueSorted(provenance.responseIds),
    needIds: uniqueSorted(provenance.needIds),
    clinicalObjectCodes: uniqueSorted(provenance.clinicalObjectCodes),
  };
}

function validateProvenance(snapshot: ClinicalSnapshot, provenance: ClinicalFindingProvenance): void {
  const responseIds = new Set(snapshot.sourceRefs.map(source => source.responseId));
  const needIds = new Set(snapshot.balanceAssessment.needs.map(need => need.needId));
  const objectCodes = new Set(snapshot.clinicalObjects.map(object => object.code));
  const unknownResponses = provenance.responseIds.filter(id => !responseIds.has(id));
  const unknownNeeds = provenance.needIds.filter(id => !needIds.has(id));
  const unknownObjects = provenance.clinicalObjectCodes.filter(code => !objectCodes.has(code));
  if (unknownResponses.length || unknownNeeds.length || unknownObjects.length) {
    throw new TypeError('La provenance d’un constat référence une source absente du ClinicalSnapshot.');
  }
}

function normalizeRules(rules: ClinicalRuleRef[]): ClinicalRuleRef[] {
  const byId = new Map<string, ClinicalRuleRef>();
  for (const rule of rules) {
    nonEmpty(rule.ruleId, 'ruleId');
    nonEmpty(rule.version, 'version de règle');
    if (rule.lifecycle !== 'candidate' && rule.lifecycle !== 'clinically_validated') {
      throw new TypeError('Cycle de vie de règle inconnu.');
    }
    if (rule.lifecycle === 'clinically_validated') {
      if (rule.validation.validatorRole !== 'practitioner') throw new TypeError('Une règle clinique doit être validée par un praticien.');
      canonicalIso(rule.validation.validatedAt, 'validatedAt');
      nonEmpty(rule.validation.sourceReference, 'sourceReference');
    }
    const existing = byId.get(rule.ruleId);
    if (existing && canonicalJson(existing) !== canonicalJson(rule)) {
      throw new TypeError(`Définitions contradictoires pour la règle ${rule.ruleId}.`);
    }
    byId.set(rule.ruleId, rule);
  }
  return [...byId.values()].sort((a, b) => a.ruleId < b.ruleId ? -1 : a.ruleId > b.ruleId ? 1 : 0);
}

function validatedRule(ruleId: string | null, rules: Map<string, ClinicalRuleRef>): ValidatedClinicalRuleRef | null {
  if (ruleId === null) return null;
  const rule = rules.get(ruleId);
  if (!rule) throw new TypeError(`Règle inconnue : ${ruleId}.`);
  if (rule.lifecycle !== 'clinically_validated') {
    throw new TypeError(`La règle candidate ${ruleId} ne peut produire aucun constat.`);
  }
  return rule;
}

function normalizeFindings<T extends MissingDataFinding | DiscordanceFinding | SafetyFinding>(
  findings: T[],
  expectedKind: T['kind'],
  snapshot: ClinicalSnapshot,
  rules: Map<string, ClinicalRuleRef>
): T[] {
  const byId = new Map<string, T>();
  for (const finding of findings) {
    nonEmpty(finding.findingId, 'findingId');
    if (finding.kind !== expectedKind) throw new TypeError(`Type de constat inattendu : ${finding.kind}.`);
    if (!['solide', 'probable', 'fragile', 'à_documenter'].includes(finding.confidence)) {
      throw new TypeError('Statut qualitatif inconnu.');
    }
    validateProvenance(snapshot, finding.provenance);
    if (finding.kind !== 'missing_data' && finding.ruleId === null) {
      throw new TypeError('Une discordance ou un constat de sécurité exige une règle cliniquement validée.');
    }
    if (finding.kind !== 'missing_data' || finding.ruleId !== null) validatedRule(finding.ruleId, rules);
    if (finding.kind === 'missing_data') {
      if (![null, 'critical_for_decision', 'useful_not_urgent', 'optional'].includes(finding.priority)) {
        throw new TypeError('Priorité de donnée manquante inconnue.');
      }
      nonEmpty(finding.uncertaintyExplanation, 'explication de l’incertitude');
      nonEmpty(finding.potentialDecisionImpact, 'impact décisionnel potentiel');
      if (finding.ruleId === null && (finding.confidence !== 'à_documenter' || finding.priority !== null)) {
        throw new TypeError('Un manque sans règle validée reste à_documenter sans priorité clinique.');
      }
    }
    if (finding.kind === 'safety' && finding.disposition !== 'requires_practitioner_review') {
      throw new TypeError('Un constat de sécurité exige une revue praticien.');
    }
    if (finding.kind === 'discordance' && (finding.audience !== 'practitioner_only' || finding.interpretation !== 'point_to_explore')) {
      throw new TypeError('Une discordance reste praticien-only et constitue un point à explorer.');
    }
    if (finding.kind === 'discordance') {
      nonEmpty(finding.signal, 'signal discordant');
      nonEmpty(finding.questionToExplore, 'question à explorer');
      nonEmpty(finding.possibleProtocolImpact, 'impact possible sur le protocole');
    }
    if (finding.kind === 'safety') nonEmpty(finding.rationale, 'justification de sécurité');
    const normalized = {
      ...finding,
      provenance: normalizeProvenance(finding.provenance),
      limitations: uniqueSorted(finding.limitations),
    } as T;
    const existing = byId.get(finding.findingId);
    if (existing && canonicalJson(existing) !== canonicalJson(normalized)) {
      throw new TypeError(`Constats contradictoires pour ${finding.findingId}.`);
    }
    byId.set(finding.findingId, normalized);
  }
  return [...byId.values()].sort((a, b) => a.findingId < b.findingId ? -1 : a.findingId > b.findingId ? 1 : 0);
}

function structuralMissingData(snapshot: ClinicalSnapshot): MissingDataFinding[] {
  const findings: MissingDataFinding[] = [];
  for (const response of snapshot.questionnaireFindings) {
    if (response.evaluability === 'not_calculable') {
      findings.push({
        findingId: `response:${response.responseId}:not_calculable`, kind: 'missing_data',
        confidence: 'à_documenter', priority: null, ruleId: null,
        uncertaintyExplanation: 'La réponse ne contient pas de données brutes complètes et exploitables.',
        potentialDecisionImpact: STRUCTURAL_IMPACT,
        provenance: { responseIds: [response.responseId], needIds: [], clinicalObjectCodes: [] },
        limitations: ['Aucune criticité clinique n’est attribuée automatiquement.'],
      });
    }
    if (response.scoreVersion === null) {
      findings.push({
        findingId: `response:${response.responseId}:score_version_unknown`, kind: 'missing_data',
        confidence: 'à_documenter', priority: null, ruleId: null,
        uncertaintyExplanation: 'La version de scoring de la réponse est inconnue.',
        potentialDecisionImpact: STRUCTURAL_IMPACT,
        provenance: { responseIds: [response.responseId], needIds: [], clinicalObjectCodes: [] },
        limitations: ['Aucune criticité clinique n’est attribuée automatiquement.'],
      });
    }
  }
  for (const responseId of snapshot.completeness.staleSources) {
    findings.push({
      findingId: `response:${responseId}:stale`, kind: 'missing_data',
      confidence: 'à_documenter', priority: null, ruleId: null,
      uncertaintyExplanation: 'La source est signalée comme obsolète.',
      potentialDecisionImpact: STRUCTURAL_IMPACT,
      provenance: { responseIds: [responseId], needIds: [], clinicalObjectCodes: [] },
      limitations: ['La fraîcheur est déclarée par l’appelant ; aucun seuil temporel clinique n’est appliqué.'],
    });
  }
  for (const need of snapshot.balanceAssessment.needs) {
    if (need.evaluability === 'not_measured') {
      findings.push({
        findingId: `need:${need.needId}:not_measured`, kind: 'missing_data',
        confidence: 'à_documenter', priority: null, ruleId: null,
        uncertaintyExplanation: 'Ce besoin ne dispose d’aucune mesure exploitable dans le snapshot.',
        potentialDecisionImpact: STRUCTURAL_IMPACT,
        provenance: { responseIds: [], needIds: [need.needId], clinicalObjectCodes: [] },
        limitations: ['Aucune criticité clinique n’est attribuée automatiquement.'],
      });
    }
  }
  return findings;
}

export function buildClinicalReview(input: {
  reviewId: string;
  createdAt: string;
  snapshot: ClinicalSnapshot;
  rules?: ClinicalRuleRef[];
  findings?: AuthoredFindings;
}): ClinicalReview {
  nonEmpty(input.reviewId, 'reviewId');
  canonicalIso(input.createdAt, 'createdAt');
  const rules = normalizeRules(input.rules ?? []);
  const ruleMap = new Map(rules.map(rule => [rule.ruleId, rule]));
  const authored = input.findings ?? {};
  const missingData = normalizeFindings(
    [...structuralMissingData(input.snapshot), ...(authored.missingData ?? [])], 'missing_data', input.snapshot, ruleMap
  );
  const discordances = normalizeFindings(authored.discordances ?? [], 'discordance', input.snapshot, ruleMap);
  const safetyFindings = normalizeFindings(authored.safetyFindings ?? [], 'safety', input.snapshot, ruleMap);
  const validatedRuleIds = new Set(rules.filter(rule => rule.lifecycle === 'clinically_validated').map(rule => rule.ruleId));
  let abstention: AbstentionAssessment = authored.abstention ?? {
    status: 'not_evaluated', ruleIds: [], limitations: [validatedRuleIds.size === 0
      ? 'Aucune règle d’abstention cliniquement validée n’est fournie.'
      : 'Aucune évaluation d’abstention n’est fournie.'],
  };
  if (!['not_evaluated', 'not_required', 'required'].includes(abstention.status)) {
    throw new TypeError('Statut d’abstention inconnu.');
  }
  if (validatedRuleIds.size === 0) {
    abstention = { status: 'not_evaluated', ruleIds: [], limitations: uniqueSorted([
      ...abstention.limitations,
      'Aucune règle d’abstention cliniquement validée n’est fournie.',
    ]) };
  } else if (abstention.status !== 'not_evaluated') {
    if (abstention.ruleIds.length === 0) throw new TypeError('Une abstention évaluée exige au moins une règle validée.');
    for (const ruleId of abstention.ruleIds) {
      if (!validatedRuleIds.has(ruleId)) throw new TypeError(`Règle d’abstention non validée : ${ruleId}.`);
    }
  }
  const candidateLimitations = rules
    .filter(rule => rule.lifecycle === 'candidate')
    .map(rule => `Règle candidate inactive : ${rule.ruleId}.`);
  const limitations = uniqueSorted(candidateLimitations);
  const normalizedAbstention: AbstentionAssessment = abstention.status === 'not_evaluated'
    ? { status: 'not_evaluated', ruleIds: [], limitations: uniqueSorted(abstention.limitations) }
    : { ...abstention, ruleIds: uniqueSorted(abstention.ruleIds), limitations: uniqueSorted(abstention.limitations) };
  const reviewWithoutHash = {
    reviewId: input.reviewId,
    snapshotId: input.snapshot.snapshotId,
    snapshotInputHash: input.snapshot.inputHash,
    createdAt: input.createdAt,
    version: VERSION_CLINICAL_REVIEW,
    rules,
    missingData,
    discordances,
    safetyFindings,
    abstention: normalizedAbstention,
    limitations,
  };
  const { reviewId: _reviewId, ...hashInput } = reviewWithoutHash;
  return { ...reviewWithoutHash, inputHash: canonicalSha256(hashInput) };
}
