import { prisma } from '@/lib/prisma';
import { lireAncresPersistees } from './ancresPersistees';
import { calendriersParCycle, type DiffusionHistorique } from './calendrierSuivi';

// LES CALENDRIERS DE SUIVI D'UN DOSSIER, LUS EN BASE ([[D-255]]).
//
// TOUTES les approbations de diffusion du patient, supplantées comprises,
// chacune jointe à la version qu'elle a diffusée et à l'épisode de cette
// version. Le calcul vit dans `calendrierSuivi.ts` ; ce module ne fait que lire.
//
// `avantOuA` borne la lecture à une date — le mode `asOf` du cockpit, comme
// `lireAncresPersistees` : une diffusion postérieure à la date lue ne fuit pas
// dans une lecture du passé.

export async function lireCalendriersSuivi(
  idPatient: string,
  avantOuA?: Date | null,
): Promise<ReturnType<typeof calendriersParCycle>> {
  const [approbations, ancres] = await Promise.all([
    prisma.protocolDiffusionApproval.findMany({
      where: { idPatient, ...(avantOuA ? { approvedAt: { lte: avantOuA } } : {}) },
      select: {
        id: true,
        approvedAt: true,
        createdAt: true,
        approvedBy: true,
        confirmation: true,
        decisionCardInputHash: true,
        protocolDraftInputHash: true,
        protocolDraftId: true,
        draft: {
          select: {
            idPatient: true,
            inputHash: true,
            decisionCardInputHash: true,
            status: true,
            reviewedAt: true,
            selectedPriorityId: true,
            episode: { select: { id: true, milestone: true, cycleId: true } },
          },
        },
      },
    }),
    lireAncresPersistees(idPatient, avantOuA),
  ]);

  const diffusions: DiffusionHistorique[] = approbations
    // Une version d'un autre dossier ne date pas celui-ci, quoi qu'en dise la
    // ligne d'approbation.
    .filter((approbation) => approbation.draft.idPatient === idPatient)
    .map((approbation) => ({
      approbationId: approbation.id,
      approuveLe: approbation.approvedAt,
      creeLe: approbation.createdAt,
      approuvePar: approbation.approvedBy,
      confirmation: approbation.confirmation,
      decisionCardInputHash: approbation.decisionCardInputHash,
      protocolDraftInputHash: approbation.protocolDraftInputHash,
      version: {
        id: approbation.protocolDraftId,
        inputHash: approbation.draft.inputHash,
        decisionCardInputHash: approbation.draft.decisionCardInputHash,
        status: approbation.draft.status,
        reviewedAt: approbation.draft.reviewedAt,
        selectedPriorityId: approbation.draft.selectedPriorityId,
        episode: approbation.draft.episode,
      },
    }));

  return calendriersParCycle(diffusions, ancres);
}

/**
 * Le calendrier du protocole diffusé ACTIF : le jour 0 de son cycle, et les
 * versions diffusées depuis. C'est ce que lisent les routes du portail.
 *
 * REPLI : si le calendrier ne se résout pas — une approbation active qu'aucun
 * cycle ne reçoit, ce que la production ne porte pas (constat du 2026-09-30,
 * [[D-255]] §4) —, la route compte depuis l'approbation active et sa seule
 * version, c'est-à-dire exactement comme avant. Le repli est journalisé : il
 * ne doit pas passer pour la règle.
 */
export async function calendrierDuProtocoleDiffuse(
  idPatient: string,
  diffuse: { approbationId: string; approvedAt: Date; protocolDraftId: string },
): Promise<{ jourZero: Date; versionIds: string[] }> {
  const { parCycle, cycleParDiffusion } = await lireCalendriersSuivi(idPatient);
  const cycleId = cycleParDiffusion.get(diffuse.approbationId);
  const calendrier = cycleId === undefined ? undefined : parCycle.get(cycleId);
  if (!calendrier) {
    console.warn('[calendrierDuProtocoleDiffuse] calendrier introuvable pour la diffusion active : repli sur son approbation.');
    return { jourZero: diffuse.approvedAt, versionIds: [diffuse.protocolDraftId] };
  }
  return { jourZero: calendrier.jourZero, versionIds: calendrier.versionIds };
}
