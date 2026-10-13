// Processus de fond de la file des lectures de comptes rendus biologiques
// ([[D-282]], G3, lot 3) :
//   npm run bio:worker-extraction
// Au `Procfile` depuis le lot 4 (`scale worker:1`, constaté le 2026-10-13) ;
// seul lecteur depuis le lot 5, qui retire `after()` de la route.
//
// UNE BOUCLE, UN TRAVAIL À LA FOIS. Chaque tour réclame le plus ancien travail
// réclamable, le lit, le termine ; la file vide, il attend 2 s. Toutes les
// minutes, il balaie les FANTÔMES (§5.4) : les imports laissés `en_cours` par
// un processus mort sont clos sans attendre un geste.
//
// LE SIGNAL DE VIE (lot 4, P2-2) : après chaque balayage RÉUSSI — la boucle
// tourne ET la base répond —, un appel à `WN_BIO_WORKER_SIGNAL_URL`. Une
// lecture en cours retarde le balayage suivant jusqu'à la réservation
// (6 min) : la surveillance tolère donc 6 min de silence.
//
// L'ARRÊT. Un déploiement envoie SIGTERM : la boucle ne réclame plus rien et
// rend la main après le tour en cours. Si le conteneur est tué pendant une
// lecture, la réservation du travail expirera et le suivant le reprendra une
// fois — c'est le cas NOMINAL de la reprise (§5.1).
//
// JOURNAUX : l'issue de chaque tour et des compteurs, jamais un identifiant.
import { prisma } from '@/lib/prisma';
import { classeEtCode } from '@/lib/observability/classeEtCode';
import { signalerVie } from '@/lib/observability/signalDeVie';
import { reconcilierFantomes, traiterProchainTravail } from '@/lib/biology-library/import/fileExtraction';

const ATTENTE_FILE_VIDE_MS = 2_000;
const INTERVALLE_FANTOMES_MS = 60_000;

let arret = false;
for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.on(signal, () => {
    arret = true;
  });
}

const attendre = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  console.log('[bio-ingest file] démarré');
  let dernierBalayage = 0;
  while (!arret) {
    if (Date.now() - dernierBalayage >= INTERVALLE_FANTOMES_MS) {
      dernierBalayage = Date.now();
      try {
        const clos = await reconcilierFantomes();
        if (clos > 0) console.log(`[bio-ingest file] fantômes clos : ${clos}`);
        await signalerVie(process.env.WN_BIO_WORKER_SIGNAL_URL);
      } catch (err) {
        console.error('[bio-ingest file] balayage des fantômes :', ...classeEtCode(err));
      }
    }
    let vide = true;
    try {
      const issue = await traiterProchainTravail();
      vide = issue.issue === 'vide';
      if (!vide) console.log(`[bio-ingest file] ${JSON.stringify(issue)}`);
    } catch (err) {
      console.error('[bio-ingest file] tour interrompu :', ...classeEtCode(err));
    }
    if (vide && !arret) await attendre(ATTENTE_FILE_VIDE_MS);
  }
  console.log('[bio-ingest file] arrêté');
}

main()
  .catch(err => {
    console.error('[bio-ingest file] arrêt :', ...classeEtCode(err));
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
