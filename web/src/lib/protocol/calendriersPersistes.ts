import { prisma } from '@/lib/prisma';
import { lireAncresPersistees, type AncrePersistee } from './ancresPersistees';
import {
  calendriersParCycle,
  joursZeroParCycle,
  type AncreDeRattachement,
  type DiffusionHistorique,
} from './calendrierSuivi';

// LES CALENDRIERS DE SUIVI D'UN DOSSIER, LUS EN BASE ([[D-255]]).
//
// TOUTES les approbations de diffusion du patient, supplantées comprises,
// chacune jointe à la version qu'elle a diffusée et à l'épisode de cette
// version. Le calcul vit dans `calendrierSuivi.ts` ; ce module ne fait que lire.
//
// `avantOuA` borne la lecture à une date — le mode `asOf` du cockpit, comme
// `lireAncresPersistees` : une diffusion postérieure à la date lue ne fuit pas
// dans une lecture du passé.

// Ce que chaque lecture sélectionne d'une approbation : la ligne, sa version
// et l'épisode de celle-ci.
const SELECTION_APPROBATION = {
  id: true,
  idPatient: true,
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
} as const;

type ApprobationLue = Awaited<
  ReturnType<typeof prisma.protocolDiffusionApproval.findMany<{ select: typeof SELECTION_APPROBATION }>>
>[number];

function versDiffusions(approbations: readonly ApprobationLue[], idPatient: string): DiffusionHistorique[] {
  return approbations
    // Une version d'un autre dossier ne date pas celui-ci, quoi qu'en dise la
    // ligne d'approbation.
    .filter((approbation) => approbation.idPatient === idPatient && approbation.draft.idPatient === idPatient)
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
}

export async function lireCalendriersSuivi(
  idPatient: string,
  avantOuA?: Date | null,
  /**
   * Les ancres DÉJÀ lues par l'appelant, quand il en a : une route qui fonde
   * plusieurs verdicts sur une seule lecture des ancres ne doit pas en faire
   * une seconde ici (le POST du cockpit).
   */
  ancresDejaLues?: readonly AncrePersistee[],
): Promise<ReturnType<typeof calendriersParCycle>> {
  const [approbations, ancres] = await Promise.all([
    prisma.protocolDiffusionApproval.findMany({
      where: { idPatient, ...(avantOuA ? { approvedAt: { lte: avantOuA } } : {}) },
      select: SELECTION_APPROBATION,
    }),
    ancresDejaLues ?? lireAncresPersistees(idPatient, avantOuA),
  ]);
  return calendriersParCycle(versDiffusions(approbations, idPatient), ancres);
}

/**
 * Le jour 0 de chaque cycle, pour PLUSIEURS dossiers à la fois — le cabinet et
 * le Fil, qui construisent la trajectoire de tous les patients d'un praticien.
 *
 * Les épisodes sont ceux que l'appelant a DÉJÀ lus : seules les ancres y
 * servent (`calendriersParCycle` les trie et les filtre lui-même). Une seule
 * requête de plus, sur les approbations, quel que soit le nombre de dossiers.
 */
export async function lireJoursZeroParPatient(
  episodesParPatient: ReadonlyMap<string, readonly AncreDeRattachement[]>,
): Promise<Map<string, Map<string, Date>>> {
  const ids = [...episodesParPatient.keys()];
  const resultat = new Map<string, Map<string, Date>>();
  if (ids.length === 0) return resultat;
  const approbations = await prisma.protocolDiffusionApproval.findMany({
    where: { idPatient: { in: ids } },
    select: SELECTION_APPROBATION,
  });
  for (const idPatient of ids) {
    const { parCycle } = calendriersParCycle(
      versDiffusions(approbations, idPatient),
      episodesParPatient.get(idPatient) ?? [],
    );
    resultat.set(idPatient, joursZeroParCycle(parCycle));
  }
  return resultat;
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
  // BORNÉ À L'APPROBATION ACTIVE. Deux lectures séparées : sans borne, une
  // diffusion publiée entre elles (un pivot) donnerait son jour 0 au protocole
  // que la route sert encore. L'approbation active étant la plus récente, la
  // borne ne retire rien d'autre (revue de la PR #1265).
  const { parCycle, cycleParDiffusion } = await lireCalendriersSuivi(idPatient, diffuse.approvedAt);
  const cycleId = cycleParDiffusion.get(diffuse.approbationId);
  const calendrier = cycleId === undefined ? undefined : parCycle.get(cycleId);
  // La version servie doit appartenir au calendrier rendu : sinon celui-ci
  // n'est pas le sien (une diffusion de même instant l'aurait supplanté).
  if (!calendrier || !calendrier.versionIds.includes(diffuse.protocolDraftId)) {
    console.warn('[calendrierDuProtocoleDiffuse] calendrier introuvable pour la diffusion active : repli sur son approbation.');
    return { jourZero: diffuse.approvedAt, versionIds: [diffuse.protocolDraftId] };
  }
  return { jourZero: calendrier.jourZero, versionIds: calendrier.versionIds };
}
