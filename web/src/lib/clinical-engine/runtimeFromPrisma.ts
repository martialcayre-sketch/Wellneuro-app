import { JOURS_JALON } from '../equilibre/constants';
import type { JalonMomentum } from '../equilibre/types';
import { proposeAssessmentEpisode } from './assessmentEpisode';
import { canonicalSha256 } from './canonical';
import type {
  PatientContext,
  ProposedAssessmentEpisode,
  QuestionnaireResponseInput,
} from './types';

const JOUR_MS = 24 * 60 * 60 * 1000;

export const JALONS_RUNTIME = ['T0', 'J21', 'J42', 'J90'] as const satisfies readonly JalonMomentum[];

export type RuntimePatientRow = {
  idPatient: string;
  createdAt: Date;
};

export type RuntimeResponseRow = {
  idReponse: string;
  idQuestionnaire: string;
  dateReponse: Date;
  scoresJson: unknown;
};

export type RuntimeConsultationRow = {
  anamnese: unknown;
} | null;

export type RuntimeInputs = {
  patient: RuntimePatientRow;
  responses: QuestionnaireResponseInput[];
  patientContext: PatientContext;
};

export type RuntimeEpisodeProposal = {
  proposal: ProposedAssessmentEpisode;
  proposalHash: string;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function optionalText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value
    .filter((item): item is string => typeof item === 'string')
    .map(item => item.trim())
    .filter(Boolean))].sort();
}

export function isRuntimeMilestone(value: unknown): value is JalonMomentum {
  return typeof value === 'string' && (JALONS_RUNTIME as readonly string[]).includes(value);
}

export function adaptRuntimeInputs(
  patient: RuntimePatientRow,
  responseRows: RuntimeResponseRow[],
  consultation: RuntimeConsultationRow,
): RuntimeInputs {
  const responses = responseRows
    .map((row): QuestionnaireResponseInput => ({
      responseId: row.idReponse,
      questionnaireId: row.idQuestionnaire,
      observedAt: row.dateReponse.toISOString(),
      scoresJson: row.scoresJson,
      // Le schéma actuel ne stocke aucune version de scoring fiable.
      scoreVersion: null,
    }))
    .sort((left, right) => (
      left.observedAt.localeCompare(right.observedAt)
      || left.responseId.localeCompare(right.responseId)
    ));

  const anamnese = asRecord(consultation?.anamnese);
  const patientContext: PatientContext = {
    mainReason: optionalText(anamnese.motif_principal),
    priorityGoal: optionalText(anamnese.objectif_prioritaire),
    expectations: stringList(anamnese.attentes),
    // Aucun champ canonique de contraintes n'existe dans l'anamnèse actuelle.
    constraints: [],
  };

  return { patient, responses, patientContext };
}

export function proposeRuntimeEpisode(inputs: RuntimeInputs, milestone: JalonMomentum): RuntimeEpisodeProposal {
  // Sans réponse, aucun T0 clinique n'existe encore. La date de création du
  // dossier sert uniquement à stabiliser l'enveloppe vide ; elle ne devient
  // ni une mesure ni une conclusion clinique.
  const t0 = inputs.responses[0]?.observedAt ?? inputs.patient.createdAt.toISOString();
  const targetAt = new Date(new Date(t0).getTime() + JOURS_JALON[milestone] * JOUR_MS).toISOString();
  const proposal = proposeAssessmentEpisode({
    assessmentEpisodeId: `runtime-episode-${inputs.patient.idPatient}-${milestone}`,
    patientId: inputs.patient.idPatient,
    milestone,
    targetAt,
    responses: inputs.responses,
  });
  const proposalHash = canonicalSha256({
    patientId: inputs.patient.idPatient,
    milestone,
    targetAt,
    responses: inputs.responses,
    patientContext: inputs.patientContext,
    inWindowResponseIds: proposal.inWindowResponseIds,
    outOfWindowResponseIds: proposal.outOfWindowResponseIds,
  });
  return { proposal, proposalHash };
}
