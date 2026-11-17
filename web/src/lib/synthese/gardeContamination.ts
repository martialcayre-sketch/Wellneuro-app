// LA GARDE DES SORTIES — [[D-513]] §5. Une synthèse suspecte est bloquée avant
// diffusion : sa validation et chacune des quatre sorties (document au médecin
// et son impression, téléchargement au portail, export du dossier, appel de
// priorité) passent par ici. Chaque blocage écrit une ligne de journal
// `SYNTHESE_IA.BIOLOGIE_HORS_CHAMPS` : la synthèse, la sortie, puis le champ et
// le code de chaque forme — jamais le texte.

import { EVENT_CODES } from '@/lib/observability/eventCodes';
import { deploymentEnv, releaseSha } from '@/lib/observability/deploymentEnv';
import { logger } from '@/lib/observability/logger';
import { finalizeLogContext } from '@/lib/observability/requestContext';
import type { LogContext, RequestContext } from '@/lib/observability/types';
import { motifAffiche, verdictContamination } from '@/lib/synthese/contaminationBiologie';

export type SortieGardee =
  | 'validation'
  | 'document_medecin'
  | 'impression_medecin'
  | 'export_dossier'
  | 'priorite_objectif';

function contexte(requestContext: RequestContext | undefined, sortie: SortieGardee): LogContext {
  if (requestContext) return finalizeLogContext(requestContext, { retryable: false });
  return {
    environment: deploymentEnv(),
    release: releaseSha(),
    runtime: process.env.NEXT_RUNTIME ?? 'nodejs',
    route: `interne:${sortie}`,
    retryable: false,
  };
}

/**
 * Le motif à afficher si la synthèse est suspecte (et le blocage est journalisé),
 * `null` sinon. Rejouée à chaque appel : aucun état n'est écrit en base.
 */
export function motifBlocageContamination(args: {
  idSynthese: string;
  syntheseJson: unknown;
  donneesEntree: unknown;
  /** Le statut de la synthèse : il décide de l'issue dite (corriger, ou en générer une nouvelle). */
  statut: string;
  sortie: SortieGardee;
  requestContext?: RequestContext;
}): string | null {
  const verdict = verdictContamination(args.syntheseJson, args.donneesEntree);
  if (!verdict.suspecte) return null;
  const formes = verdict.motif === 'schema_anterieur'
    ? 'schema_anterieur'
    : verdict.releves.map((r) => `${r.champ}:${r.code}`).join(', ');
  logger.warn({
    event: EVENT_CODES.SYNTHESE_BIOLOGIE_HORS_CHAMPS,
    domain: 'SYNTHESE_IA',
    message: `${args.idSynthese} bloquée (${args.sortie}) : ${formes}`,
    context: contexte(args.requestContext, args.sortie),
  });
  return motifAffiche(verdict, args.statut);
}
