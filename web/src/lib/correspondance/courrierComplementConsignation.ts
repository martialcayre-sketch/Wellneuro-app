import type { prisma } from '@/lib/prisma';
import type { DonneesCorrespondance } from '@/lib/praticien/correspondanceMedecin';
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
  },
): Promise<ConsignationCourrierComplement> {
  const { idPatient } = entrees;
  return client.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM patients WHERE id_patient = ${idPatient} FOR UPDATE`;
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
