import { prisma } from '@/lib/prisma';
import { cleVerrouCompteRendu, PEREMPTION_EN_COURS_MS } from './verrou';

// « ÉCARTER CE DOCUMENT » ([[D-269]] §3, BIO-INGEST LOT-04) — le geste du
// praticien sur un compte rendu TRANSMIS PAR LE PATIENT : illisible, ou pas un
// compte rendu de ce patient. Motif fermé, aucun texte libre. L'écart PURGE le
// contenu aussitôt (motif `ecarte`, [[D-258]]) ; l'empreinte reste, si bien
// qu'un doublon reste refusé. Irréversible.
//
// TROISIÈME AUTEUR de modification du compte rendu, admis nommément par
// `staging.guard.test.ts` (après la dernière décision et l'échéance).
//
// LA BASE JUGE (trigger `comptes_rendus_biologiques_avant_purge`, migration
// `bio_ingest_transmission_patient_v1`) : origine `patient`, aucune ligne
// validée, aucune extraction en cours, auteur et motif présents ; elle date
// l'écart et la purge. Ce module établit ces conditions AVANT de tenter, pour
// qu'un refus se dise en clair plutôt qu'en erreur technique, et sous le verrou
// du compte rendu que prennent l'extraction, les décisions et le retrait.
//
// Un import resté `en_cours` au-delà de la péremption (conteneur mort)
// bloquerait l'écart pour toujours : il est clos `echec`/`delai_depasse`
// d'abord, comme le fait la purge à l'échéance (`purge.ts`).

export const MOTIFS_ECART_DOCUMENT = ['illisible', 'document_non_conforme'] as const;
export type MotifEcartDocument = (typeof MOTIFS_ECART_DOCUMENT)[number];

export function estMotifEcartDocument(valeur: unknown): valeur is MotifEcartDocument {
  return typeof valeur === 'string' && (MOTIFS_ECART_DOCUMENT as readonly string[]).includes(valeur);
}

export type IssueEcart =
  | { ok: true }
  | {
      ok: false;
      reason:
        | 'compte_rendu_introuvable'
        | 'origine_praticien'
        | 'deja_efface'
        | 'ligne_validee'
        | 'extraction_en_cours';
    };

export const MESSAGES_ECART: Record<string, string> = {
  compte_rendu_introuvable: 'Ce compte rendu est introuvable dans ce dossier.',
  origine_praticien: 'Seul un document transmis par le patient s’écarte ; votre propre dépôt se retire.',
  deja_efface: 'Ce document est déjà effacé : il n’y a plus rien à écarter.',
  ligne_validee: 'Une ligne de ce compte rendu a déjà été validée : il ne s’écarte plus.',
  extraction_en_cours: 'Une extraction est en cours sur ce compte rendu : réessayez dans quelques minutes.',
};

export async function ecarterCompteRendu(params: {
  idPatient: string;
  idCompteRendu: string;
  motif: MotifEcartDocument;
  ecartePar: string;
  maintenant?: Date;
}): Promise<IssueEcart> {
  const { idPatient, idCompteRendu } = params;
  const maintenant = params.maintenant ?? new Date();
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${cleVerrouCompteRendu(idCompteRendu)}))`;
    const compteRendu = await tx.compteRenduBiologique.findFirst({
      where: { id: idCompteRendu, idPatient },
      select: { origine: true, purgeLe: true },
    });
    if (!compteRendu) return { ok: false as const, reason: 'compte_rendu_introuvable' as const };
    if (compteRendu.origine !== 'patient') return { ok: false as const, reason: 'origine_praticien' as const };
    if (compteRendu.purgeLe !== null) return { ok: false as const, reason: 'deja_efface' as const };

    const validees = await tx.ligneBiologiqueCandidate.count({
      where: { idPatient, statut: 'validee', import: { idCompteRendu } },
    });
    if (validees > 0) return { ok: false as const, reason: 'ligne_validee' as const };

    const limite = new Date(maintenant.getTime() - PEREMPTION_EN_COURS_MS);
    const enCours = await tx.importBiologique.count({
      where: { idCompteRendu, idPatient, statut: 'en_cours', lanceLe: { gte: limite } },
    });
    if (enCours > 0) return { ok: false as const, reason: 'extraction_en_cours' as const };
    await tx.importBiologique.updateMany({
      where: { idCompteRendu, idPatient, statut: 'en_cours', lanceLe: { lt: limite } },
      data: { statut: 'echec', motifEchec: 'delai_depasse' },
    });

    // `contenu: { not: null }` : un document purgé entre-temps n'est pas retouché.
    const { count } = await tx.compteRenduBiologique.updateMany({
      where: { id: idCompteRendu, idPatient, contenu: { not: null } },
      data: { contenu: null, motifPurge: 'ecarte', ecartePar: params.ecartePar, motifEcart: params.motif },
    });
    if (count !== 1) return { ok: false as const, reason: 'deja_efface' as const };
    return { ok: true as const };
  }, { timeout: 20_000 });
}
