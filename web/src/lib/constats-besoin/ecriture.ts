// L'ÉCRITURE D'UN GESTE DE CONSTAT SUR UN BESOIN ([[D-347]] §2, t40), dans UNE
// transaction interactive, sans transaction imbriquée : le constat et ses
// pièces partagent la transaction que la base relève (`transaction_pose`).
//
// LA BASE FAIT FOI. Ses triggers refusent : autre praticien, besoin hors de
// 2, 6, 7 et 11, pose qui ne désigne pas la tête, retrait d'autre chose que la
// tête, pièce d'un autre dossier, ligne corrigée ou annulée, passation exclue.
// La route le DIT avant, sous les MÊMES verrous (le dossier, le besoin, puis
// la clé de chaque ligne citée), pour que le refus rendu soit nommé et non une
// 500. Patron : `bio-parcours/constats/ecriture.ts` ([[D-331]]).
//
// L'ORDRE DES VERROUS EST FIXE, celui du trigger : `FOR KEY SHARE` sur le
// dossier, le verrou consultatif du besoin (espace 347), puis les pièces de
// biologie dans l'ordre de leur clé (analyte, date de prélèvement,
// identifiant), puis les passations dans l'ordre de leur identifiant.

import type { Prisma } from '@/generated/prisma';
import { annulationParLigne, correctionsParLigne } from '@/lib/biology-library/filCorrection';
import { annulationsActives, verrouillerCleDuResultat } from '@/lib/biology-library/annulations';
import { VALIDITES_RETENUES } from '@/lib/bio-parcours/constats/aRelire';
import type { DemandeConstatBesoin } from './demande';

/** Une issue de transaction : le refus nommé. */
export class RefusConstatBesoin extends Error {
  constructor(readonly raison: string) {
    super(raison);
  }
}

/** Les verrous du trigger, dans son ordre : le dossier, puis le besoin. */
async function verrouillerBesoin(tx: Prisma.TransactionClient, idPatient: string, besoin: number) {
  await tx.$executeRaw`SELECT 1 FROM public.patients WHERE id_patient = ${idPatient} FOR KEY SHARE`;
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(347, hashtext(${idPatient} || '|' || ${String(besoin)}))`;
}

/** La tête du besoin, lue sous son verrou : la dernière pose, si aucun retrait ne la suit. */
async function lireTete(tx: Prisma.TransactionClient, idPatient: string, besoin: number) {
  const dernier = await tx.constatBesoinPraticien.findFirst({
    where: { idPatient, besoin },
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
  if (visees.length !== ids.length) throw new RefusConstatBesoin('piece_inconnue');
  const triees = [...visees].sort((a, b) =>
    a.analyteCode < b.analyteCode ? -1 : a.analyteCode > b.analyteCode ? 1
      : a.preleveLe.getTime() - b.preleveLe.getTime() || (a.id < b.id ? -1 : 1));
  for (const ligne of triees) {
    if (!(await verrouillerCleDuResultat(tx, idPatient, ligne.id))) throw new RefusConstatBesoin('piece_inconnue');
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
    if (corrigees.has(ligne.id)) throw new RefusConstatBesoin('piece_corrigee');
    if (annulees.has(ligne.id)) throw new RefusConstatBesoin('piece_annulee');
  }
  return triees.map(l => l.id);
}

async function verifierPiecesReponse(tx: Prisma.TransactionClient, idPatient: string, ids: readonly string[]) {
  if (ids.length === 0) return [];
  const reponses = await tx.questionnaireReponse.findMany({
    where: { idPatient, id: { in: [...ids] } },
    select: { id: true, statutValidite: true },
  });
  if (reponses.length !== ids.length) throw new RefusConstatBesoin('piece_inconnue');
  if (reponses.some(r => !VALIDITES_RETENUES.includes(r.statutValidite))) throw new RefusConstatBesoin('passation_exclue');
  return [...ids].sort();
}

/** Écrit le geste, ou lève `RefusConstatBesoin`. L'auteur est l'e-mail de session. */
export async function ecrireConstatBesoin(
  tx: Prisma.TransactionClient,
  idPatient: string,
  demande: DemandeConstatBesoin,
  praticienEmail: string,
): Promise<{ id: string }> {
  await verrouillerBesoin(tx, idPatient, demande.besoin);
  const tete = await lireTete(tx, idPatient, demande.besoin);

  if (demande.acte === 'retrait') {
    if (tete === null || demande.remplace !== tete) throw new RefusConstatBesoin('tete_changee');
    return tx.constatBesoinPraticien.create({
      data: { idPatient, acte: 'retrait', besoin: demande.besoin, idConstatRemplace: tete, praticienEmail },
      select: { id: true },
    });
  }

  if (demande.remplace !== tete) throw new RefusConstatBesoin('tete_changee');
  const resultats = await verifierPiecesResultat(tx, idPatient, demande.pieces.filter(p => p.type === 'resultat').map(p => p.id));
  const reponses = await verifierPiecesReponse(tx, idPatient, demande.pieces.filter(p => p.type === 'reponse').map(p => p.id));

  const constat = await tx.constatBesoinPraticien.create({
    data: {
      idPatient,
      acte: 'pose',
      besoin: demande.besoin,
      verdict: demande.verdict,
      motif: demande.motif,
      note: demande.note,
      aRevoirLe: demande.aRevoirLe ? new Date(`${demande.aRevoirLe}T00:00:00Z`) : null,
      idConstatRemplace: tete,
      praticienEmail,
    },
    select: { id: true },
  });
  // Dans l'ordre des verrous : les lignes par clé, puis les passations.
  const pieces = [
    ...resultats.map(idResultat => ({ idConstat: constat.id, idPatient, idResultat })),
    ...reponses.map(idQuestionnaireReponse => ({ idConstat: constat.id, idPatient, idQuestionnaireReponse })),
  ];
  if (pieces.length > 0) await tx.pieceConstatBesoinPraticien.createMany({ data: pieces });
  return constat;
}
