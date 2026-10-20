// L'ÉCRITURE D'UN GESTE DE CONSTAT ([[D-331]] §2, BP-11), dans UNE transaction
// interactive, sans transaction imbriquée : le constat et ses pièces partagent
// la transaction que la base relève (`transaction_pose`).
//
// LA BASE FAIT FOI. Ses triggers refusent : autre praticien, pose qui ne
// désigne pas la tête, retrait d'autre chose que la tête, pièce d'un autre
// dossier, ligne corrigée ou annulée, passation exclue, `confirmee` ou
// `non_retenue` sans pièce. La route le DIT avant, sous les MÊMES verrous
// (le dossier, l'hypothèse, puis la clé de chaque ligne citée), pour que le
// refus rendu soit nommé et non une 500.
//
// L'ORDRE DES VERROUS EST FIXE (revue `wn-reviewer` de la migration) : les
// pièces de biologie sont prises dans l'ordre de leur clé (analyte, date de
// prélèvement, identifiant), et les passations dans l'ordre de leur
// identifiant. Deux poses qui citent les mêmes lignes ne se croisent pas.

import type { Prisma } from '@/generated/prisma';
import { annulationParLigne, correctionsParLigne } from '@/lib/biology-library/filCorrection';
import { annulationsActives, verrouillerCleDuResultat } from '@/lib/biology-library/annulations';
import { VALIDITES_RETENUES } from './aRelire';
import type { DemandeConstat } from './demande';
import type { StructureDuParcours } from './structure';

/** Une issue de transaction : le refus nommé. */
export class RefusConstat extends Error {
  constructor(readonly raison: string) {
    super(raison);
  }
}

/** Les verrous du trigger, dans son ordre : le dossier, puis l'hypothèse. */
async function verrouillerHypothese(tx: Prisma.TransactionClient, idPatient: string, hypotheseCode: string) {
  await tx.$executeRaw`SELECT 1 FROM public.patients WHERE id_patient = ${idPatient} FOR KEY SHARE`;
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(331, hashtext(${idPatient} || '|' || ${hypotheseCode}))`;
}

/** La tête de l'hypothèse, lue sous son verrou : la dernière pose, si aucun retrait ne la suit. */
async function lireTete(tx: Prisma.TransactionClient, idPatient: string, hypotheseCode: string) {
  const dernier = await tx.constatPraticien.findFirst({
    where: { idPatient, hypotheseCode },
    orderBy: { ordre: 'desc' },
    select: { id: true, acte: true },
  });
  return dernier && dernier.acte === 'pose' ? dernier.id : null;
}

async function verifierPiecesResultat(tx: Prisma.TransactionClient, idPatient: string, ids: readonly string[]) {
  if (ids.length === 0) return [];
  const visees = await tx.resultatBiologique.findMany({
    where: { idPatient, id: { in: [...ids] } },
    select: { id: true, analyteCode: true, preleveLe: true },
  });
  if (visees.length !== ids.length) throw new RefusConstat('piece_inconnue');
  const triees = [...visees].sort((a, b) =>
    a.analyteCode < b.analyteCode ? -1 : a.analyteCode > b.analyteCode ? 1
      : a.preleveLe.getTime() - b.preleveLe.getTime() || (a.id < b.id ? -1 : 1));
  for (const ligne of triees) {
    if (!(await verrouillerCleDuResultat(tx, idPatient, ligne.id))) throw new RefusConstat('piece_inconnue');
  }
  // Les fils des lignes citées, lus SOUS les verrous : la tête et
  // l'annulation se lisent comme la fiche les montre.
  const fils = await tx.resultatBiologique.findMany({
    where: {
      idPatient,
      OR: triees.map(l => ({ analyteCode: l.analyteCode, preleveLe: l.preleveLe })),
    },
    select: { id: true, supersedesResultatId: true, saisiLe: true },
  });
  const maillons = fils.map(l => ({ id: l.id, supersedesResultatId: l.supersedesResultatId, saisiLe: l.saisiLe.toISOString() }));
  const corrigees = correctionsParLigne(maillons);
  const annulees = annulationParLigne(maillons, await annulationsActives(tx, idPatient, fils.map(l => l.id)));
  for (const ligne of triees) {
    if (corrigees.has(ligne.id)) throw new RefusConstat('piece_corrigee');
    if (annulees.has(ligne.id)) throw new RefusConstat('piece_annulee');
  }
  return triees.map(l => l.id);
}

async function verifierPiecesReponse(tx: Prisma.TransactionClient, idPatient: string, ids: readonly string[]) {
  if (ids.length === 0) return [];
  const reponses = await tx.questionnaireReponse.findMany({
    where: { idPatient, id: { in: [...ids] } },
    select: { id: true, statutValidite: true },
  });
  if (reponses.length !== ids.length) throw new RefusConstat('piece_inconnue');
  if (reponses.some(r => !VALIDITES_RETENUES.includes(r.statutValidite))) throw new RefusConstat('passation_exclue');
  return [...ids].sort();
}

/** Écrit le geste, ou lève `RefusConstat`. L'auteur est l'e-mail de session. */
export async function ecrireConstat(
  tx: Prisma.TransactionClient,
  idPatient: string,
  demande: DemandeConstat,
  structure: StructureDuParcours,
  praticienEmail: string,
): Promise<{ id: string }> {
  await verrouillerHypothese(tx, idPatient, demande.hypotheseCode);
  const tete = await lireTete(tx, idPatient, demande.hypotheseCode);

  if (demande.acte === 'retrait') {
    if (tete === null || demande.remplace !== tete) throw new RefusConstat('tete_changee');
    return tx.constatPraticien.create({
      data: { idPatient, acte: 'retrait', hypotheseCode: demande.hypotheseCode, idConstatRemplace: tete, praticienEmail },
      select: { id: true },
    });
  }

  if (demande.remplace !== tete) throw new RefusConstat('tete_changee');
  const resultats = await verifierPiecesResultat(tx, idPatient, demande.pieces.filter(p => p.type === 'resultat').map(p => p.id));
  const reponses = await verifierPiecesReponse(tx, idPatient, demande.pieces.filter(p => p.type === 'reponse').map(p => p.id));

  const constat = await tx.constatPraticien.create({
    data: {
      idPatient,
      acte: 'pose',
      hypotheseCode: demande.hypotheseCode,
      verdict: demande.verdict,
      motif: demande.motif,
      note: demande.note,
      aRevoirLe: demande.aRevoirLe ? new Date(`${demande.aRevoirLe}T00:00:00Z`) : null,
      idConstatRemplace: tete,
      structureSha256: structure.empreinte,
      praticienEmail,
    },
    select: { id: true },
  });
  // Dans l'ordre des verrous : les lignes par clé, puis les passations.
  const pieces = [
    ...resultats.map(idResultat => ({ idConstat: constat.id, idPatient, idResultat })),
    ...reponses.map(idQuestionnaireReponse => ({ idConstat: constat.id, idPatient, idQuestionnaireReponse })),
  ];
  if (pieces.length > 0) await tx.pieceConstatPraticien.createMany({ data: pieces });
  return constat;
}
