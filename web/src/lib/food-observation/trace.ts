import { FRICTIONS, isFrictionCode, LONGUEUR_MAX_MOT_LIBRE } from './frictionRegistry';
import { MESSAGE_SILENCE_UTILE } from './labels';
import { VERSION_REGISTRE_FRICTIONS } from './types';
import type { PatientPauseEvent, TraceIssue, TrialTrace } from './types';
import { localDate, nonEmpty } from './validation';

const ISSUES: TraceIssue[] = ['fait', 'adapte', 'partiel_empeche', 'oublie_non_note'];

/**
 * Crée une trace d'essai — boucle courte : l'occasion s'est-elle présentée ?
 * était-ce faisable ? qu'est-ce qui a compté ?
 *
 * L'issue porte quatre valeurs (amendement terrain n° 1) : l'adaptation et
 * l'oubli sont des données, pas des échecs. La friction est un choix fermé du
 * registre v1 ; le mot libre est court et toujours optionnel.
 */
export function createTrialTrace(input: {
  traceId: string;
  episodeId: string;
  localDate: string;
  occasionPresentee: boolean;
  faisable: boolean | null;
  issue: TraceIssue;
  frictionCode?: string;
  motLibre?: string;
}): TrialTrace {
  nonEmpty(input.traceId, 'traceId');
  nonEmpty(input.episodeId, 'episodeId');
  localDate(input.localDate, 'localDate');
  if (!ISSUES.includes(input.issue)) {
    throw new TypeError(`Issue de trace inconnue : ${String(input.issue)}.`);
  }
  if (input.frictionCode !== undefined && !isFrictionCode(input.frictionCode)) {
    throw new TypeError(`Friction inconnue au registre v1 : ${input.frictionCode}.`);
  }
  if (input.issue === 'partiel_empeche' && input.frictionCode === undefined) {
    throw new TypeError(
      'Une trace « en partie / empêché·e » précise la friction (choix fermé du registre).'
    );
  }
  if (input.motLibre !== undefined && input.motLibre.length > LONGUEUR_MAX_MOT_LIBRE) {
    throw new TypeError(
      `Le mot libre est court : ${LONGUEUR_MAX_MOT_LIBRE} caractères au maximum.`
    );
  }
  return {
    traceId: input.traceId,
    episodeId: input.episodeId,
    localDate: input.localDate,
    occasionPresentee: input.occasionPresentee,
    faisable: input.occasionPresentee ? input.faisable : null,
    issue: input.issue,
    frictionCode: input.frictionCode !== undefined && isFrictionCode(input.frictionCode)
      ? input.frictionCode
      : undefined,
    motLibre: input.motLibre?.trim() || undefined,
    frictionsVersion: VERSION_REGISTRE_FRICTIONS,
  };
}

/**
 * Déclaration patient « je n'ai pas pu cette semaine » — un événement
 * volontaire, distinct de l'absence simple de trace (qui reste un état
 * neutre). Motif optionnel, catégories fermées du registre de frictions.
 */
export function declarePatientPause(input: {
  eventId: string;
  episodeId: string;
  semaineDu: string;
  motifCode?: string;
}): PatientPauseEvent {
  nonEmpty(input.eventId, 'eventId');
  nonEmpty(input.episodeId, 'episodeId');
  localDate(input.semaineDu, 'semaineDu');
  if (input.motifCode !== undefined && !isFrictionCode(input.motifCode)) {
    throw new TypeError(`Motif inconnu au registre v1 : ${input.motifCode}.`);
  }
  return {
    eventId: input.eventId,
    episodeId: input.episodeId,
    semaineDu: input.semaineDu,
    motifCode: input.motifCode !== undefined && isFrictionCode(input.motifCode)
      ? input.motifCode
      : undefined,
  };
}

/** Libellé patient d'une friction du registre v1. */
export function frictionLabel(code: string): string {
  if (!isFrictionCode(code)) {
    throw new TypeError(`Friction inconnue au registre v1 : ${code}.`);
  }
  return FRICTIONS[code];
}

/**
 * Silence utile explicite côté patient : quand le budget de la semaine est
 * couvert, l'instrument sait dire qu'on en sait assez.
 */
export function buildSilenceUtileMessage(): string {
  return MESSAGE_SILENCE_UTILE;
}
