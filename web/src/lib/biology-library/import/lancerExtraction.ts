import { prisma } from '@/lib/prisma';
import { classeEtCode } from '@/lib/observability/classeEtCode';
import {
  extraireCompteRendu,
  MODELE_EXTRACTION,
  VERSION_PROCEDE_EXTRACTION,
  type MotifEchec,
} from './extraction';
import { resoudreLibelle } from './resolverLibellesV1';
import { cleVerrouCompteRendu, PEREMPTION_EN_COURS_MS } from './verrou';

// ORCHESTRATION D'UNE EXTRACTION (BIO-INGEST LOT-02, [[D-256]] A4/A5).
//
// TROIS TEMPS, ET C'EST VOULU :
// 1. l'import naît `en_cours`, avec le MODÈLE et la VERSION DU PROCÉDÉ, et il
//    est COMMITÉ AVANT l'appel : la trace existe même si le processus meurt
//    pendant l'appel (promesse de la v4 : « enregistrés à chaque fois ») ;
// 2. l'appel au fournisseur, HORS de toute transaction — on ne tient pas une
//    transaction Postgres ouverte pendant deux minutes d'appel réseau ;
// 3. UNE transaction interactive : les lignes, PUIS la terminaison. Jamais
//    d'écriture imbriquée Prisma, qui terminerait l'import avant ses lignes —
//    la base refuserait alors les lignes d'un import qui n'est plus en cours
//    (consigne de la revue de la migration ; la lettre voulait aussi l'import
//    dans cette transaction, son but est tenu : les lignes avant la fin).
//
// Un échec se consigne par la transition `en_cours` → `echec` avec son motif
// fermé, sans aucune ligne. Un import resté `en_cours` au-delà de la
// péremption (processus mort) est clos `delai_depasse` à la tentative
// suivante sur le même compte rendu.
//
// JOURNAUX : la classe et le code d'une erreur, jamais son message — il peut
// recopier un libellé ou une valeur lue.

export type IssueExtraction =
  | { ok: true; idImport: string; statut: 'extrait'; lignes: number }
  | { ok: true; idImport: string; statut: 'echec'; motif: MotifEchec }
  | { ok: false; reason: 'compte_rendu_introuvable' | 'extraction_en_cours' | 'server_error' };

export async function lancerExtraction(params: {
  idPatient: string;
  idCompteRendu: string;
  lancePar: string;
  maintenant?: Date;
}): Promise<IssueExtraction> {
  const { idPatient, idCompteRendu, lancePar } = params;
  const maintenant = params.maintenant ?? new Date();

  // TEMPS 1 — l'import en cours, commité avant l'appel.
  const ouverture = await prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${cleVerrouCompteRendu(idCompteRendu)}))`;
    const compteRendu = await tx.compteRenduBiologique.findFirst({
      where: { id: idCompteRendu, idPatient },
      select: { id: true, typeMime: true },
    });
    if (!compteRendu || compteRendu.typeMime !== 'application/pdf') {
      return { ok: false as const, reason: 'compte_rendu_introuvable' as const };
    }
    const enCours = await tx.importBiologique.findMany({
      where: { idCompteRendu, idPatient, statut: 'en_cours' },
      select: { id: true, lanceLe: true },
    });
    const limite = maintenant.getTime() - PEREMPTION_EN_COURS_MS;
    if (enCours.some(i => i.lanceLe.getTime() >= limite)) {
      return { ok: false as const, reason: 'extraction_en_cours' as const };
    }
    for (const perime of enCours) {
      await tx.importBiologique.update({
        where: { id: perime.id },
        data: { statut: 'echec', motifEchec: 'delai_depasse' },
      });
    }
    const cree = await tx.importBiologique.create({
      data: {
        idPatient,
        idCompteRendu,
        modele: MODELE_EXTRACTION,
        versionPrompt: VERSION_PROCEDE_EXTRACTION,
        lancePar,
      },
      select: { id: true },
    });
    return { ok: true as const, idImport: cree.id };
  });
  if (!ouverture.ok) return ouverture;
  const { idImport } = ouverture;

  const document = await prisma.compteRenduBiologique.findUnique({
    where: { id: idCompteRendu },
    select: { contenu: true },
  });

  // TEMPS 2 — l'appel, hors transaction.
  const resultat = document
    ? await extraireCompteRendu(Buffer.from(document.contenu))
    : ({ ok: false, motif: 'erreur_fournisseur' } as const);

  if (!resultat.ok) {
    try {
      await prisma.importBiologique.update({
        where: { id: idImport },
        data: { statut: 'echec', motifEchec: resultat.motif },
      });
    } catch (err) {
      console.error('[bio-ingest extraction] échec non consigné :', ...classeEtCode(err));
      return { ok: false, reason: 'server_error' };
    }
    return { ok: true, idImport, statut: 'echec', motif: resultat.motif };
  }

  // TEMPS 3 — les lignes, PUIS la terminaison, dans une seule transaction.
  try {
    await prisma.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${cleVerrouCompteRendu(idCompteRendu)}))`;
      if (resultat.lignes.length > 0) {
        await tx.ligneBiologiqueCandidate.createMany({
          data: resultat.lignes.map((ligne, i) => {
            // Le resolver signé, SEUL, propose l'analyte — `ambigu` n'en propose aucun.
            const resolution = resoudreLibelle(ligne.libelle);
            return {
              idPatient,
              idImport,
              rang: i + 1,
              page: ligne.page,
              libelleLu: ligne.libelle,
              valeurLue: ligne.valeur,
              uniteLue: ligne.unite,
              preleveLeLu: ligne.preleveLe,
              analytePropose: resolution.code,
              statutMapping: resolution.statut,
            };
          }),
        });
      }
      await tx.importBiologique.update({
        where: { id: idImport },
        data: { statut: 'extrait', laboratoireLu: resultat.laboratoire },
      });
    });
  } catch (err) {
    // La réponse a produit des lignes que la base refuse (une contrainte, une
    // FK) : l'import se clôt `reponse_invalide` plutôt que de rester en cours
    // et d'être daté plus tard d'un `delai_depasse` faux (revue, P2-3). Si
    // même cette clôture échoue, la péremption le rattrapera.
    console.error('[bio-ingest extraction] lignes non consignées :', ...classeEtCode(err));
    try {
      await prisma.importBiologique.update({
        where: { id: idImport },
        data: { statut: 'echec', motifEchec: 'reponse_invalide' },
      });
    } catch (errCloture) {
      console.error('[bio-ingest extraction] clôture impossible :', ...classeEtCode(errCloture));
    }
    return { ok: false, reason: 'server_error' };
  }
  return { ok: true, idImport, statut: 'extrait', lignes: resultat.lignes.length };
}
