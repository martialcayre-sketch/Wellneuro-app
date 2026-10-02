// Purge à l'échéance des comptes rendus biologiques déposés ([[D-258]]).
// Lancé chaque heure par le cron Scalingo (`web/cron.json`) :
//   npm run bio:purge-echeance
// Rend 1 si un compte rendu a été refusé par la base — le journal du
// conteneur le montre ; le suivant le retentera.
import { prisma } from '@/lib/prisma';
import { classeEtCode } from '@/lib/observability/classeEtCode';
import { purgerAEcheance } from '@/lib/biology-library/import/purge';

async function main() {
  const bilan = await purgerAEcheance();
  console.log(`[bio-ingest purge échéance] ${JSON.stringify(bilan)}`);
  if (bilan.echecs > 0) process.exitCode = 1;
}

main()
  .catch(err => {
    console.error('[bio-ingest purge échéance] arrêt :', ...classeEtCode(err));
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
