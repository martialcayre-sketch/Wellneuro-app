// L'ÉCRITURE D'UNE LIGNE ([[D-335]] §2-§5, BP-13), dans UNE transaction
// interactive, en READ COMMITTED — l'isolement par défaut de la base, que ce
// module ne relève jamais : une transaction SERIALIZABLE face à une READ
// COMMITTED pourrait laisser deux têtes sur un fil (revue `wn-reviewer` de la
// migration), et REPEATABLE READ est refusé par le trigger.
//
// LA BASE FAIT FOI. Ses triggers refusent : autre praticien, pose qui ne
// désigne pas la tête, retrait d'autre chose que la tête, retrait par le
// patient d'une ligne du praticien. La route le DIT avant, sous les MÊMES
// verrous (le dossier, puis le critère ou les traitements du dossier), pour
// que le refus rendu soit nommé et non une 500.
//
// UNE LIGNE PAR GESTE. Le statut menstruel se lit contre le sexe déclaré en
// vigueur (règle de la route, [[D-335]] §2) : sa pose prend AUSSI le verrou
// du sexe déclaré, AVANT le sien — l'ordre fixe des critères, qui ne laisse
// aucune écriture croisée s'interbloquer.

import type { Prisma } from '@/generated/prisma';
import type { DemandePhysio, DemandeTraitement } from './demande';
import { estTete, teteUnique } from './fils';
import { SEXES_OUVRANT_LE_STATUT, type Critere } from './liste';

/** Une issue de transaction : le refus nommé. */
export class RefusLigne extends Error {
  constructor(readonly raison: string) {
    super(raison);
  }
}

/** L'auteur d'une ligne : la main, et l'e-mail de session pour le praticien. */
export type Auteur = { source: 'patient' } | { source: 'praticien'; email: string };

async function verrouillerDossier(tx: Prisma.TransactionClient, idPatient: string) {
  await tx.$executeRaw`SELECT 1 FROM public.patients WHERE id_patient = ${idPatient} FOR KEY SHARE`;
}

async function verrouillerCritere(tx: Prisma.TransactionClient, idPatient: string, critere: Critere) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(335, hashtext(${idPatient} || '|physio|' || ${critere}))`;
}

/** Le verrou des traitements du dossier — celui du trigger et des pièces de constat. */
export async function verrouillerTraitements(tx: Prisma.TransactionClient, idPatient: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(335, hashtext(${idPatient} || '|traitement'))`;
}

async function lignesDuCritere(tx: Prisma.TransactionClient, idPatient: string, critere: Critere) {
  const lignes = await tx.donneePhysiologique.findMany({
    where: { idPatient, critere },
    select: { id: true, ordre: true, acte: true, idLigneRemplacee: true, source: true, reponse: true },
  });
  return lignes.map(l => ({ ...l, ordre: l.ordre.toString(), acte: l.acte === 'retrait' ? 'retrait' as const : 'pose' as const }));
}

/** Écrit la ligne, ou lève `RefusLigne`. */
export async function ecrirePhysio(
  tx: Prisma.TransactionClient,
  idPatient: string,
  demande: DemandePhysio,
  auteur: Auteur,
): Promise<{ id: string }> {
  await verrouillerDossier(tx, idPatient);
  const posantLeStatut = demande.acte === 'pose' && demande.critere === 'statut_menstruel';
  if (posantLeStatut) await verrouillerCritere(tx, idPatient, 'sexe_declare');
  await verrouillerCritere(tx, idPatient, demande.critere);

  const tete = teteUnique(await lignesDuCritere(tx, idPatient, demande.critere));
  const praticienEmail = auteur.source === 'praticien' ? auteur.email : null;

  if (demande.acte === 'retrait') {
    if (tete === null || demande.remplace !== tete.id) throw new RefusLigne('tete_changee');
    if (auteur.source === 'patient' && tete.source !== 'patient') throw new RefusLigne('retrait_reserve');
    return tx.donneePhysiologique.create({
      data: { idPatient, acte: 'retrait', critere: demande.critere, idLigneRemplacee: tete.id, source: auteur.source, praticienEmail },
      select: { id: true },
    });
  }

  if (demande.remplace !== (tete?.id ?? null)) throw new RefusLigne('tete_changee');
  if (posantLeStatut) {
    const sexe = teteUnique(await lignesDuCritere(tx, idPatient, 'sexe_declare'));
    if (sexe === null || !SEXES_OUVRANT_LE_STATUT.includes(sexe.reponse ?? '')) throw new RefusLigne('statut_sans_sexe');
  }
  return tx.donneePhysiologique.create({
    data: {
      idPatient,
      acte: 'pose',
      critere: demande.critere,
      reponse: demande.reponse,
      mesure: demande.mesure,
      mesureLe: demande.mesureLe ? new Date(`${demande.mesureLe}T00:00:00Z`) : null,
      source: auteur.source,
      idLigneRemplacee: tete?.id ?? null,
      praticienEmail,
    },
    select: { id: true },
  });
}

const enDate = (premierJour: string | null) => (premierJour ? new Date(`${premierJour}T00:00:00Z`) : null);

/** Écrit la ligne, ou lève `RefusLigne`. */
export async function ecrireTraitement(
  tx: Prisma.TransactionClient,
  idPatient: string,
  demande: DemandeTraitement,
  auteur: Auteur,
): Promise<{ id: string }> {
  await verrouillerDossier(tx, idPatient);
  await verrouillerTraitements(tx, idPatient);
  const praticienEmail = auteur.source === 'praticien' ? auteur.email : null;

  if (demande.remplace !== null) {
    // La cible et son éventuel successeur, lus SOUS le verrou : la tête se lit
    // comme le trigger la lira.
    const lignes = await tx.traitementEnCours.findMany({
      where: { idPatient, OR: [{ id: demande.remplace }, { idLigneRemplacee: demande.remplace }] },
      select: { id: true, ordre: true, acte: true, idLigneRemplacee: true, source: true },
    });
    const lues = lignes.map(l => ({ ...l, ordre: l.ordre.toString(), acte: l.acte === 'retrait' ? 'retrait' as const : 'pose' as const }));
    const cible = lues.find(l => l.id === demande.remplace);
    if (!cible) throw new RefusLigne('ligne_inconnue');
    if (!estTete(cible, lues)) throw new RefusLigne('tete_changee');
    if (demande.acte === 'retrait' && auteur.source === 'patient' && cible.source !== 'patient') {
      throw new RefusLigne('retrait_reserve');
    }
  }

  if (demande.acte === 'retrait') {
    return tx.traitementEnCours.create({
      data: { idPatient, acte: 'retrait', idLigneRemplacee: demande.remplace, source: auteur.source, praticienEmail },
      select: { id: true },
    });
  }
  return tx.traitementEnCours.create({
    data: {
      idPatient,
      acte: 'pose',
      nature: demande.nature,
      nom: demande.nom,
      dose: demande.dose,
      moment: demande.moment,
      motif: demande.motif,
      debut: enDate(demande.debut.premierJour),
      debutPrecision: demande.debut.precision,
      fin: enDate(demande.fin?.premierJour ?? null),
      finPrecision: demande.fin?.precision ?? null,
      prescritParTiers: demande.prescritParTiers,
      source: auteur.source,
      idLigneRemplacee: demande.remplace,
      praticienEmail,
    },
    select: { id: true },
  });
}
