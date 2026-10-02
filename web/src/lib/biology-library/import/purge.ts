import { prisma } from '@/lib/prisma';
import { classeEtCode } from '@/lib/observability/classeEtCode';
import { cleVerrouCompteRendu, PEREMPTION_EN_COURS_MS } from './verrou';

// PURGE À L'ÉCHÉANCE (BIO-INGEST LOT-02, [[D-258]]) : le document déposé est
// effacé au plus tard 30 jours après son dépôt, décidé ou non. Lancée CHAQUE
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
// - un import encore frais diffère la purge au passage suivant ;
// - `contenu: { not: null }` : un document purgé entre-temps n'est pas retouché.
//
// JOURNAUX : des compteurs, jamais un identifiant ni un message d'erreur.

export type BilanEcheance = {
  candidats: number;
  purges: number;
  importsClos: number;
  differes: number;
  echecs: number;
};

type Issue = { purge: boolean; differe: boolean; importsClos: number };

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
    if ((await tx.importBiologique.count({ where: { idCompteRendu, statut: 'en_cours' } })) > 0) {
      return { purge: false, differe: true, importsClos };
    }
    const { count } = await tx.compteRenduBiologique.updateMany({
      where: { id: idCompteRendu, contenu: { not: null } },
      data: { contenu: null, motifPurge: 'echeance' },
    });
    return { purge: count === 1, differe: false, importsClos };
  }, { timeout: 20_000 });
}

export async function purgerAEcheance(): Promise<BilanEcheance> {
  const candidats = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM comptes_rendus_biologiques
    WHERE contenu IS NOT NULL
      AND depose_le <= (clock_timestamp() AT TIME ZONE 'UTC') - interval '30 days'
    ORDER BY depose_le`;
  const bilan: BilanEcheance = { candidats: candidats.length, purges: 0, importsClos: 0, differes: 0, echecs: 0 };
  for (const { id } of candidats) {
    try {
      const issue = await purgerUn(id);
      bilan.importsClos += issue.importsClos;
      if (issue.purge) bilan.purges += 1;
      if (issue.differe) bilan.differes += 1;
    } catch (err) {
      bilan.echecs += 1;
      console.error('[bio-ingest purge échéance] refus :', ...classeEtCode(err));
    }
  }
  return bilan;
}
