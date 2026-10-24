import type { prisma } from '@/lib/prisma';
import type { DonneesCorrespondance } from '@/lib/praticien/correspondanceMedecin';
import { MOTIF_DATE_REQUISE, MOTIF_MINEUR } from '@/lib/clinical/gardeComplementCible';
import { statutAge } from '@/lib/patient/gardeAge';
import { refusPartage, verdictPartageMedecin } from '@/lib/trust/consentementPartage';

// LE COURRIER COMPLÉMENT ET SA LISTE, OU RIEN — [[D-345]] §5, J3-12h lot 3
// (obligation reçue de la revue du lot 2). Une seule transaction consigne la
// correspondance et sa ligne de `courriers_complement_listes` : un courrier
// sans liste ne se remettrait jamais, une liste refusée par la base (élément
// hors format, désordre, courrier d'un autre dossier) annule le courrier.
// Le banc `courrierComplement.pg.test.ts` le constate sur une vraie base.
//
// L'ACCORD EST RELU SOUS VERROU, juste avant l'insertion (patron du courrier
// biologie) : le verrou de ligne du patient est celui que prend l'écrivain du
// consentement — un retrait et une consignation ne s'entrelacent pas.
//
// L'ÂGE AUSSI (revue Codex de #1691, P1-1) : la garde de la route a lu la date
// de naissance AVANT le verrou. Une correction concurrente qui rend le dossier
// mineur, ou qui efface la date, se relit ici, sous le même verrou, et refuse
// avant toute insertion ([[D-345]] §3 : le mineur est refusé).

export type ConsignationCourrierComplement =
  | { ok: true; idCorrespondance: string }
  | { ok: false; raison: string; message: string };

export async function consignerCourrierComplement(
  client: typeof prisma,
  entrees: {
    idPatient: string;
    donnees: DonneesCorrespondance;
    ancrage: { sha256: string; version: string };
    liste: { elements: readonly string[]; sha256: string };
    /** L'instant de la garde de la route : l'âge relu se juge au même instant. */
    maintenantMs: number;
  },
): Promise<ConsignationCourrierComplement> {
  const { idPatient } = entrees;
  return client.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM patients WHERE id_patient = ${idPatient} FOR UPDATE`;
    const patient = await tx.patient.findUnique({ where: { idPatient }, select: { dateNaissance: true } });
    const age = statutAge(patient?.dateNaissance, entrees.maintenantMs);
    if (age === 'mineur') return { ok: false as const, raison: 'garde_mineur', message: MOTIF_MINEUR };
    if (age !== 'majeur') return { ok: false as const, raison: 'garde_date_requise', message: MOTIF_DATE_REQUISE };
    const choixRelu = await tx.trustChoiceEvent.findMany({
      where: { idPatient, finalite: 'partage_medecin_traitant' },
      select: { finalite: true, statut: true, enregistreLe: true },
    });
    const verdict = verdictPartageMedecin(choixRelu);
    if (verdict.bloquant) {
      const refus = refusPartage(verdict);
      return { ok: false as const, raison: refus.raison, message: refus.message };
    }
    const cree = await tx.correspondanceMedecin.create({
      data: { ...entrees.donnees, ancrageSha256: entrees.ancrage.sha256, ancrageVersion: entrees.ancrage.version },
      select: { id: true },
    });
    await tx.courrierComplementListe.create({
      data: {
        idCorrespondance: cree.id,
        idPatient,
        complements: [...entrees.liste.elements],
        complementsSha256: entrees.liste.sha256,
      },
    });
    return { ok: true as const, idCorrespondance: cree.id };
  });
}
