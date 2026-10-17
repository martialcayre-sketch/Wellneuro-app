import { prisma } from '@/lib/prisma';
import { classeEtCode } from '@/lib/observability/classeEtCode';
import { cleVerrouCompteRendu, PEREMPTION_EN_COURS_MS } from './verrou';

// PURGE À L'ÉCHÉANCE (BIO-INGEST LOT-02, [[D-258]]) : le document déposé est
// effacé au plus tard 30 jours après son dépôt, décidé ou non. Depuis F44
// ([[D-283]] §2, §10 c), la même échéance efface aussi ce que la lecture a
// produit sans entrer au dossier — voir `effacerNonValide`. Lancée CHAQUE
// HEURE par le cron Scalingo (`web/cron.json`, conteneur ponctuel) : ni route
// exposée, ni secret partagé. Horaire plutôt que nocturne : la v12 promet « au
// plus tard 30 jours », qu'un passage par nuit dépasserait d'un jour (revue).
// La purge à la dernière décision, elle, vit dans `decisions.ts`.
//
// LA BASE JUGE ([[D-258]], trigger `comptes_rendus_biologiques_avant_purge`) :
// le motif `echeance` exige un dépôt d'au moins 30 jours et aucune extraction
// en cours. Ce module ne fait qu'établir ces conditions avant de tenter, pour
// qu'un refus reste l'exception (revue de la migration) :
//
// - les CANDIDATS sont choisis par l'horloge de la base, celle du trigger ;
// - UNE TRANSACTION PAR COMPTE RENDU, sous le verrou consultatif que prennent
//   l'extraction, les décisions et le retrait : un refus n'emporte que le sien ;
// - un import resté `en_cours` au-delà de la péremption (conteneur mort pendant
//   `after()`) bloquerait la purge pour toujours : il est d'abord clos
//   `echec`/`delai_depasse`, la transition que la base admet (revue, P1) ;
// - un import encore frais, ou un travail de la file en attente ou en cours
//   ([[D-282]]), diffère TOUTE la purge au passage suivant : rien ne s'efface
//   sous un travail en cours (arbitrage F44 du 2026-10-17, cas 4) ;
// - `contenu: { not: null }` : un document purgé entre-temps n'est pas retouché.
//
// JOURNAUX : des compteurs, jamais un identifiant ni un message d'erreur.

export type BilanEcheance = {
  candidats: number;
  purges: number;
  importsClos: number;
  differes: number;
  lignesEffacees: number;
  importsEffaces: number;
  echecs: number;
};

type ClientEffacement = Pick<
  typeof prisma,
  'ligneBiologiqueCandidate' | 'importBiologique' | 'travailExtractionBiologique'
>;

/**
 * CE QUE [[D-283]] §2 NE GARDE PAS, pour un compte rendu : les lignes écartées
 * ou jamais décidées, puis chaque extraction qui ne porte plus aucune ligne
 * validée. Arbitrages F44 du 2026-10-17 :
 *
 * - une ligne VALIDÉE reste, avec son extraction (modèle, version, laboratoire
 *   lu) et ses actes de lecture : elle prouve un résultat entré au dossier (A5) ;
 * - une extraction sans ligne validée part entière — ses travaux terminés de
 *   la file avec elle (ils la désignent, FK RESTRICT). Elle ne porte aucun acte
 *   de lecture : la base n'en admet que sur une extraction qui a une ligne
 *   validée. S'il en restait un, sa FK ferait échouer la transaction entière,
 *   sans résidu ;
 * - le compte rendu lui-même reste : sa date de dépôt et son empreinte sont la
 *   trace du dépôt, et un même document redéposé reste un doublon (cas 1).
 *
 * À appeler dans la transaction, SOUS le verrou du compte rendu, une fois
 * établi qu'aucune extraction ni aucun travail n'est ouvert : l'échéance
 * ci-dessous, et l'écart d'un document transmis (`ecart.ts`, cas 3).
 */
export async function effacerNonValide(
  tx: ClientEffacement,
  idCompteRendu: string,
): Promise<{ lignes: number; imports: number }> {
  const { count: lignes } = await tx.ligneBiologiqueCandidate.deleteMany({
    where: { statut: { not: 'validee' }, import: { idCompteRendu } },
  });
  // Les lignes non validées parties, une extraction sans ligne est une
  // extraction sans ligne validée.
  const vides = await tx.importBiologique.findMany({
    where: { idCompteRendu, lignes: { none: {} } },
    select: { id: true },
  });
  if (vides.length === 0) return { lignes, imports: 0 };
  const ids = vides.map(i => i.id);
  await tx.travailExtractionBiologique.deleteMany({ where: { idImportCourant: { in: ids } } });
  const { count: imports } = await tx.importBiologique.deleteMany({ where: { id: { in: ids } } });
  return { lignes, imports };
}

type Issue = { purge: boolean; differe: boolean; importsClos: number; lignes: number; imports: number };

async function purgerUn(idCompteRendu: string): Promise<Issue> {
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${cleVerrouCompteRendu(idCompteRendu)}))`;
    const perimes = await tx.$queryRaw<{ id: string }[]>`
      SELECT id FROM imports_biologiques
      WHERE id_compte_rendu = ${idCompteRendu}
        AND statut = 'en_cours'
        AND lance_le < (clock_timestamp() AT TIME ZONE 'UTC') - ${`${PEREMPTION_EN_COURS_MS} milliseconds`}::interval`;
    let importsClos = 0;
    if (perimes.length > 0) {
      ({ count: importsClos } = await tx.importBiologique.updateMany({
        where: { id: { in: perimes.map(p => p.id) }, statut: 'en_cours' },
        data: { statut: 'echec', motifEchec: 'delai_depasse' },
      }));
    }
    const differe = { purge: false, differe: true, importsClos, lignes: 0, imports: 0 };
    if ((await tx.importBiologique.count({ where: { idCompteRendu, statut: 'en_cours' } })) > 0) return differe;
    const travauxOuverts = await tx.travailExtractionBiologique.count({
      where: { idCompteRendu, statut: { in: ['en_attente', 'en_cours'] } },
    });
    if (travauxOuverts > 0) return differe;
    const { count } = await tx.compteRenduBiologique.updateMany({
      where: { id: idCompteRendu, contenu: { not: null } },
      data: { contenu: null, motifPurge: 'echeance' },
    });
    const efface = await effacerNonValide(tx, idCompteRendu);
    return { purge: count === 1, differe: false, importsClos, lignes: efface.lignes, imports: efface.imports };
  }, { timeout: 20_000 });
}

// LES CANDIDATS : un dépôt d'au moins 30 jours dont le document reste, OU qui
// garde quelque chose à effacer — une ligne non validée, une extraction sans
// ligne validée. Le second cas couvre le document déjà purgé à la dernière
// décision ([[D-258]] §1) : ses lignes écartées partent à l'échéance.
export async function purgerAEcheance(): Promise<BilanEcheance> {
  const candidats = await prisma.$queryRaw<{ id: string }[]>`
    SELECT c.id FROM comptes_rendus_biologiques c
    WHERE c.depose_le <= (clock_timestamp() AT TIME ZONE 'UTC') - interval '30 days'
      AND (
        c.contenu IS NOT NULL
        OR EXISTS (
          SELECT 1 FROM imports_biologiques i
          WHERE i.id_compte_rendu = c.id
            AND (
              EXISTS (SELECT 1 FROM lignes_biologiques_candidates l WHERE l.id_import = i.id AND l.statut <> 'validee')
              OR NOT EXISTS (SELECT 1 FROM lignes_biologiques_candidates l WHERE l.id_import = i.id AND l.statut = 'validee')
            )
        )
      )
    ORDER BY c.depose_le`;
  const bilan: BilanEcheance = {
    candidats: candidats.length,
    purges: 0,
    importsClos: 0,
    differes: 0,
    lignesEffacees: 0,
    importsEffaces: 0,
    echecs: 0,
  };
  for (const { id } of candidats) {
    try {
      const issue = await purgerUn(id);
      bilan.importsClos += issue.importsClos;
      bilan.lignesEffacees += issue.lignes;
      bilan.importsEffaces += issue.imports;
      if (issue.purge) bilan.purges += 1;
      if (issue.differe) bilan.differes += 1;
    } catch (err) {
      bilan.echecs += 1;
      console.error('[bio-ingest purge échéance] refus :', ...classeEtCode(err));
    }
  }
  return bilan;
}
