import { JOURS_JALON } from '../equilibre/constants';
import type { JalonMomentum } from '../equilibre/types';
import { proposeAssessmentEpisode } from './assessmentEpisode';
import { canonicalSha256 } from './canonical';
import { lireEtatPopulation, type EtatPopulation } from '../consultation/etatPopulation';
import { signauxDeclares } from './safetyFindings';
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
  /**
   * Les signaux d'alerte déclarés, bruts — entrée du producteur de constats de
   * sécurité ([[D-099]], LOT-04).
   *
   * LU ICI, ET PAS AILLEURS, parce qu'ici est le seul endroit que le cockpit et
   * `verifierChaineC1` traversent tous les deux : leur JSDoc respective dit
   * qu'une lecture divergente ferait 409 sur une carte honnête, et un signal
   * de sécurité lu d'un côté seulement produirait exactement cela.
   */
  signauxAlerte: string[];
  /**
   * L'état de population déclaré par le patient ([[D-101]], LOT-05).
   *
   * LU ICI POUR LA MÊME RAISON QUE `signauxAlerte`, et elle vaut d'être répétée
   * plutôt que déduite : le cockpit et `verifierChaineC1` traversent tous deux
   * cette fonction, et eux seuls. Un état lu d'un côté seulement ferait
   * diverger la gate de population, donc l'ordre des candidats, donc l'empreinte
   * de la carte — c'est-à-dire un 409 sur une carte honnête.
   *
   * JAMAIS OPTIONNEL, ET JAMAIS PARTIEL : `lireEtatPopulation` rend toujours
   * les sept critères, `inconnu` compris. Un état absent du type laisserait un
   * appelant construire la chaîne sans lui, et « je n'ai pas regardé »
   * redeviendrait « rien à signaler » (`DC-24`).
   */
  etatPopulation: EtatPopulation;
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

  return {
    patient,
    responses,
    patientContext,
    signauxAlerte: signauxDeclares(anamnese),
    etatPopulation: lireEtatPopulation(anamnese),
  };
}

export function proposeRuntimeEpisode(
  inputs: RuntimeInputs,
  milestone: JalonMomentum,
  /**
   * Ancre du cycle courant : `confirmedAt` du T0 confirmé le plus récent —
   * LA MÊME ancre que la trajectoire (LOT-08, A8-1) et que `resoudreJalonDu`.
   * Sans elle, la fenêtre d'un J21 se calculait depuis la première réponse du
   * dossier : dès que la confirmation du T0 suivait cette réponse de plus de
   * 16 jours, le jalon proposé à l'écran et l'épisode construit ici étaient
   * DISJOINTS (revue LOT-07, B2). L'appelant la fournit pour tout jalon
   * post-T0 quand un T0 confirmé existe ; `null` = repli historique.
   */
  ancreT0: string | null = null,
): RuntimeEpisodeProposal {
  // Sans réponse, aucun T0 clinique n'existe encore. La date de création du
  // dossier sert uniquement à stabiliser l'enveloppe vide ; elle ne devient
  // ni une mesure ni une conclusion clinique.
  const t0 = ancreT0 ?? inputs.responses[0]?.observedAt ?? inputs.patient.createdAt.toISOString();
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
