// Purge à l'échéance des comptes rendus biologiques déposés ([[D-258]]),
// puis des travaux de la file terminés depuis 30 jours ([[D-282]] §5.3),
// puis des traces échues — journal des accès, connexions Google, tentatives
// de lien — sans attendre une écriture ([[D-451]], Q1).
// Lancé chaque heure par le cron Scalingo (`web/cron.json`) :
//   npm run bio:purge-echeance
// Rend 1 si un compte rendu a été refusé par la base, ou si la purge des
// travaux ou d'une table de traces a échoué — le journal du conteneur le
// montre ; le suivant le retentera.
import { prisma } from '@/lib/prisma';
import { classeEtCode } from '@/lib/observability/classeEtCode';
import { purgerAEcheance } from '@/lib/biology-library/import/purge';
import { purgerTravauxTermines } from '@/lib/biology-library/import/fileExtraction';
import { purgerTracesEchues } from '@/lib/conservation/purgeTraces';

async function main() {
  try {
    const bilan = await purgerAEcheance();
    console.log(`[bio-ingest purge échéance] ${JSON.stringify(bilan)}`);
    if (bilan.echecs > 0) process.exitCode = 1;
  } catch (err) {
    console.error('[bio-ingest purge échéance] arrêt :', ...classeEtCode(err));
    process.exitCode = 1;
  }
  try {
    console.log(`[bio-ingest purge échéance] ${JSON.stringify({ travauxPurges: await purgerTravauxTermines() })}`);
  } catch (err) {
    console.error('[bio-ingest purge échéance] travaux de la file :', ...classeEtCode(err));
    process.exitCode = 1;
  }
  // Après la biologie, et indépendante d'elle : une panne plus haut ne la saute pas.
  const traces = await purgerTracesEchues();
  console.log(`[purge traces] ${JSON.stringify(traces)}`);
  if (traces.echecs > 0) process.exitCode = 1;
}

main()
  .catch(err => {
    console.error('[bio-ingest purge échéance] arrêt :', ...classeEtCode(err));
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
