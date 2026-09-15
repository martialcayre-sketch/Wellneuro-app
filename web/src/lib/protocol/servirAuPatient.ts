import { buildPatientProtocolView } from '@/lib/clinical-engine/patientProtocolView';
import type {
  DecisionCard,
  PatientProtocolView,
  ProtocolDiffusionApproval,
  ProtocolDraft,
} from '@/lib/clinical-engine/types';

// LA MÊME QUESTION, POSÉE À UN SEUL ENDROIT : « le portail peut-il servir ce
// protocole à ce patient ? »
//
// POURQUOI CE MODULE EXISTE. Le portail répondait `indisponible: true` sur DEUX
// branches — le rejeu de la carte échoue, ou le contrat patient REFUSE — tandis
// que le miroir praticien ne regardait que la première (`servieAuPatient =
// rejeu.ok`). Un protocole que le contrat refuse éteignait donc l'écran du
// patient pendant que son praticien lisait « Validé pour diffusion ».
//
// Recopier la seconde branche dans le miroir aurait fabriqué une deuxième
// description de la même règle, qui aurait dérivé : c'est le défaut que
// [[D-191]] a fermé sur la vue patient, et il n'est pas question de le rouvrir
// sur le constat qui la surveille. Les deux chemins appellent donc CECI.
//
// Constaté par la contre-revue adverse du 2026-09-16 ([[D-200]]).

export type RefusServicePatient = 'contrat_refuse';

export type ServiceAuPatient =
  | { ok: true; vue: PatientProtocolView }
  | { ok: false; motif: RefusServicePatient; detail: string };

/**
 * Le contrat patient accepte-t-il ce protocole ?
 *
 * Le rejeu de la carte est FAIT PAR L'APPELANT — il lit le dossier et n'a pas
 * sa place ici. Cette fonction ne juge que la dernière marche : `D-054`
 * arbitrage 6, un statut d'intervention inconnu, une action hors liste patient
 * ou une incohérence relue font REFUSER le contrat, et ce refus est un fait à
 * dire des deux côtés, pas une exception à rattraper en silence.
 */
export function vuePatientOuRefus(input: {
  decisionCard: DecisionCard;
  protocolDraft: ProtocolDraft;
  approval: ProtocolDiffusionApproval;
  patientLimitations?: string[];
}): ServiceAuPatient {
  try {
    return { ok: true, vue: buildPatientProtocolView(input) };
  } catch (erreur) {
    return {
      ok: false,
      motif: 'contrat_refuse',
      detail: erreur instanceof Error ? erreur.message : String(erreur),
    };
  }
}
