// L'ÉCRITURE d'une décision de parcours ([[D-343]] §2-§7, BP-15), dans UNE
// transaction interactive, en READ COMMITTED — l'isolement par défaut de la
// base, que ce module ne relève jamais : le trigger refuse tout autre niveau
// (arbitrage du 2026-10-22).
//
// LA BASE FAIT FOI. Son trigger refuse : autre praticien, version d'un autre
// dossier, révision qui ne désigne pas la tête de sa version, ligne visée qui
// n'est pas une tête de la version, remplacement hors de la famille ou de
// l'action. La route le DIT avant, sous les MÊMES verrous (le dossier, puis
// les décisions du dossier), pour que le refus rendu soit nommé et non une
// 500. Ce que la base ne voit pas, la route le tient ici : l'action appartient
// au contenu de la version ; mise en œuvre et révision visent une version
// diffusée (§7) ; un instantané du carnet alimentaire n'est pas une version.
//
// RIEN N'EST ÉCRIT DANS LES VERSIONS (§9) : ni `protocol_drafts`, ni les
// approbations, ni les check-ins — une seule création, sur
// `decision_parcours` (banc `jourZeroEtEmpreintes.test.ts`).

import type { Prisma } from '@/generated/prisma';
import { JA_FOOD_OBSERVATION_CONTRACT_VERSION } from '@/lib/food-observation/contract';
import { accepteNouvelEnvoi, RAISON_DOSSIER_CLOS } from '@/lib/patient/cycleDeVie';
import { lireVersionsDiffusees } from '@/lib/protocol/calendriersPersistes';
import type { Demande } from './demande';
import { estTete } from '@/lib/physio-traitements/fils';
import { actionsDeLaVersion } from './lecture';
import { famille, NATURES_MISE_EN_OEUVRE, type Nature } from './liste';

/** Une issue de transaction : le refus nommé. */
export class RefusDecision extends Error {
  constructor(readonly raison: string) {
    super(raison);
  }
}

/** Le verrou du dossier, puis celui des décisions du dossier : l'ordre du trigger. */
async function verrouiller(tx: Prisma.TransactionClient, idPatient: string) {
  await tx.$executeRaw`SELECT 1 FROM public.patients WHERE id_patient = ${idPatient} FOR KEY SHARE`;
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(343, hashtext(${idPatient} || '|decision_parcours'))`;
}

async function versionDuDossier(tx: Prisma.TransactionClient, idPatient: string, id: string) {
  const version = await tx.protocolDraft.findFirst({
    where: { id, idPatient },
    select: { id: true, payload: true, inputHash: true, contractVersion: true },
  });
  return version && version.contractVersion !== JA_FOOD_OBSERVATION_CONTRACT_VERSION ? version : null;
}

/** Écrit la ligne, ou lève `RefusDecision`. */
export async function ecrireDecision(
  tx: Prisma.TransactionClient,
  idPatient: string,
  demande: Demande,
  praticienEmail: string,
): Promise<{ id: string }> {
  await verrouiller(tx, idPatient);

  // La clôture se relit SOUS le verrou : lue par la route avant la
  // transaction, elle a pu être posée entre-temps, et le trigger ne la voit
  // pas (revue CodeRabbit de #1650, P1).
  const dossier = await tx.patient.findUnique({ where: { idPatient }, select: { actif: true, suiviClotureLe: true } });
  if (!dossier || !accepteNouvelEnvoi(dossier)) throw new RefusDecision(RAISON_DOSSIER_CLOS);

  const version = await versionDuDossier(tx, idPatient, demande.idVersion);
  if (version === null) throw new RefusDecision('version_inconnue');

  const lignes = (
    await tx.decisionParcours.findMany({
      where: { idPatient, idVersion: demande.idVersion },
      select: { id: true, ordre: true, acte: true, idLigneRemplacee: true, nature: true, idAction: true },
    })
  ).map(l => ({ ...l, ordre: l.ordre.toString(), acte: l.acte === 'retrait' ? 'retrait' as const : 'pose' as const }));

  // La ligne visée : une tête de CETTE version.
  const cible = demande.remplace === null ? undefined : lignes.find(l => l.id === demande.remplace);
  if (demande.remplace !== null) {
    if (cible === undefined) throw new RefusDecision('ligne_inconnue');
    if (!estTete(cible, lignes)) throw new RefusDecision('tete_changee');
  }

  if (demande.acte === 'retrait') {
    return tx.decisionParcours.create({
      data: { idPatient, acte: 'retrait', idVersion: demande.idVersion, idLigneRemplacee: demande.remplace, praticienEmail },
      select: { id: true },
    });
  }

  // L'action appartient au contenu de la version (§2).
  if (demande.idAction !== null) {
    const actions = actionsDeLaVersion(version.payload, version.inputHash);
    if (actions === null) throw new RefusDecision('version_illisible');
    if (!actions.some(a => a.actionId === demande.idAction)) throw new RefusDecision('action_inconnue');
  }

  // Mise en œuvre et révision : une version diffusée (§7).
  if (demande.nature === 'revision' || NATURES_MISE_EN_OEUVRE.includes(demande.nature)) {
    const diffusees = await lireVersionsDiffusees(tx, idPatient);
    if (!diffusees.has(demande.idVersion)) throw new RefusDecision('version_non_diffusee');
  }

  // La version suivante, du même dossier (§6).
  if (demande.idVersionSuivante !== null && (await versionDuDossier(tx, idPatient, demande.idVersionSuivante)) === null) {
    throw new RefusDecision('version_suivante_inconnue');
  }

  if (demande.nature === 'revision') {
    // Un seul fil de révision par version : la révision nouvelle désigne la
    // tête de révision, ou rien s'il n'y en a pas.
    const tete = lignes
      .filter(l => l.acte === 'pose' && l.nature === 'revision' && estTete(l, lignes))
      .sort((a, b) => (BigInt(a.ordre) < BigInt(b.ordre) ? -1 : 1))
      .at(-1);
    if (demande.remplace !== (tete?.id ?? null)) throw new RefusDecision('tete_changee');
  } else if (cible !== undefined) {
    // Une correction garde l'action et la famille (§3).
    if (cible.idAction !== demande.idAction || cible.nature === null || famille(cible.nature as Nature) !== famille(demande.nature)) {
      throw new RefusDecision('remplacement_hors_famille');
    }
  }

  return tx.decisionParcours.create({
    data: {
      idPatient,
      acte: 'pose',
      idVersion: demande.idVersion,
      idAction: demande.idAction,
      nature: demande.nature,
      issue: demande.issue,
      motif: demande.motif,
      note: demande.note,
      evenementLe: demande.evenementLe ? new Date(`${demande.evenementLe}T00:00:00Z`) : null,
      evenementInconnu: demande.evenementInconnu,
      source: demande.source,
      idVersionSuivante: demande.idVersionSuivante,
      idLigneRemplacee: demande.remplace,
      praticienEmail,
    },
    select: { id: true },
  });
}
