import { rejouerCarteDecision, type MotifRefusRejeu, type RejeuCarteDecision } from '@/lib/clinical-engine/rejeuCarteDecision';
import type { PatientProtocolView, ProtocolDiffusionApproval, ProtocolDraft } from '@/lib/clinical-engine/types';
import { vuePatientOuRefus } from '@/lib/protocol/servirAuPatient';

// « SERVI AU PATIENT », COMPOSÉ À UN SEUL ENDROIT ([[D-200]]).
//
// Les deux marches — la carte rejouée, puis le contrat patient — étaient
// enchaînées à la main par trois appelants : la route du portail, le miroir
// praticien de la diffusion et la désignation d'un élément au signalement
// (`programmeDiffuse`). Une marche ajoutée à l'un aurait fait diverger la liste
// de la désignation, le constat du praticien et l'écran du patient. Les trois
// appellent donc CECI.
//
// Module serveur : le rejeu lit le dossier. `servirAuPatient.ts` reste pur et
// ne juge que la dernière marche.

export type RefusServi =
  | { ok: false; marche: 'carte'; motif: MotifRefusRejeu }
  | { ok: false; marche: 'contrat'; detail: string };

export type ServiAuPatient = { ok: true; vue: PatientProtocolView } | RefusServi;

type EntreeRejeu = Parameters<typeof rejouerCarteDecision>[0];

/**
 * Le portail sert-il ce protocole approuvé à ce patient ?
 *
 * La lecture du brouillon reste à l'appelant : un payload illisible n'a pas la
 * même issue partout (409 au portail, « non servi » au miroir, rien à désigner
 * au signalement). `rejouer` ne sert qu'à mémoïser un rejeu déjà fait pour la
 * même carte ; il ne change pas la question posée.
 */
export async function servirAuPatient(input: {
  idPatient: string;
  decisionCardId: string;
  assessmentEpisodeId: string | null;
  protocolDraft: ProtocolDraft;
  approval: ProtocolDiffusionApproval;
  rejouer?: (rejeu: EntreeRejeu) => Promise<RejeuCarteDecision>;
}): Promise<ServiAuPatient> {
  const rejeu = await (input.rejouer ?? rejouerCarteDecision)({
    idPatient: input.idPatient,
    decisionCardId: input.decisionCardId,
    assessmentEpisodeId: input.assessmentEpisodeId,
    decisionCardInputHash: input.approval.decisionCardInputHash,
  });
  if (!rejeu.ok) return { ok: false, marche: 'carte', motif: rejeu.motif };

  const service = vuePatientOuRefus({
    decisionCard: rejeu.decisionCard,
    protocolDraft: input.protocolDraft,
    approval: input.approval,
    // AUCUNE LIMITATION PATIENT AUJOURD'HUI, et c'est une absence, pas un
    // vide : celles de la carte sont écrites POUR LE PRATICIEN (« aucune
    // priorité ne peut être proposée avant… »). Les traduire serait fabriquer
    // du texte patient ; les recopier serait lui servir un raisonnement
    // interne. Dette nommée au dossier de campagne.
    patientLimitations: [],
  });
  return service.ok ? service : { ok: false, marche: 'contrat', detail: service.detail };
}
