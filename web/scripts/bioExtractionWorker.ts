// Processus de fond de la file des lectures de comptes rendus biologiques
// ([[D-282]], G3, lot 3) :
//   npm run bio:worker-extraction
// Au `Procfile` depuis le lot 4 (`scale worker:1`, constaté le 2026-10-13) ;
// seul lecteur depuis le lot 5, qui retire `after()` de la route.
//
// LA BOUCLE vit dans `boucleFileExtraction.ts` (balayage des fantômes chaque
// minute, signal de vie après un balayage réussi, attente de 2 s sur file
// vide), sortie du script pour être jouée par un banc (2026-11-03). Ce script
// la branche sur la base, l'horloge et les signaux d'arrêt.
//
// LE SIGNAL DE VIE (lot 4, P2-2) : `WN_BIO_WORKER_SIGNAL_URL`. Une lecture en
// cours retarde le balayage suivant jusqu'à la réservation (6 min) : la
// surveillance tolère donc 6 min de silence.
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
import { boucleFileExtraction } from '@/lib/biology-library/import/boucleFileExtraction';
import { reconcilierFantomes, traiterProchainTravail } from '@/lib/biology-library/import/fileExtraction';

let arret = false;
for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.on(signal, () => {
    arret = true;
  });
}

boucleFileExtraction({
  estArrete: () => arret,
  maintenant: () => Date.now(),
  attendre: ms => new Promise(resolve => setTimeout(resolve, ms)),
  reconcilier: () => reconcilierFantomes(),
  signaler: () => signalerVie(process.env.WN_BIO_WORKER_SIGNAL_URL),
  traiter: () => traiterProchainTravail(),
})
  .catch(err => {
    console.error('[bio-ingest file] arrêt :', ...classeEtCode(err));
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
