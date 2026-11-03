// La BOUCLE du processus de fond de la file des lectures ([[D-282]], G3),
// sortie de `scripts/bioExtractionWorker.ts` pour être jouée par un banc
// (arbitrage du responsable du 2026-11-03). Le script ne fait plus que la
// brancher sur la base, l'horloge et les signaux d'arrêt.
//
// UNE BOUCLE, UN TRAVAIL À LA FOIS. Chaque tour réclame le plus ancien travail
// réclamable, le lit, le termine ; la file vide, il attend 2 s. Toutes les
// minutes, il balaie les FANTÔMES (§5.4).
//
// LE SIGNAL DE VIE (lot 4, P2-2) : après chaque balayage RÉUSSI seulement.
//
// L'ARRÊT : la boucle ne réclame plus rien et rend la main après le tour en
// cours, sans attendre.
//
// JOURNAUX : l'issue de chaque tour et des compteurs, jamais un identifiant.
import { classeEtCode } from '@/lib/observability/classeEtCode';
import type { IssueTraitement } from './fileExtraction';

export const ATTENTE_FILE_VIDE_MS = 2_000;
export const INTERVALLE_FANTOMES_MS = 60_000;

export type DependancesBoucle = {
  estArrete: () => boolean;
  maintenant: () => number;
  attendre: (ms: number) => Promise<void>;
  reconcilier: () => Promise<number>;
  signaler: () => Promise<unknown>;
  traiter: () => Promise<IssueTraitement>;
  journal?: Pick<Console, 'log' | 'error'>;
};

export async function boucleFileExtraction(d: DependancesBoucle): Promise<void> {
  const journal = d.journal ?? console;
  journal.log('[bio-ingest file] démarré');
  // Le premier tour balaie : aucun balayage n'a encore eu lieu.
  let dernierBalayage = Number.NEGATIVE_INFINITY;
  while (!d.estArrete()) {
    if (d.maintenant() - dernierBalayage >= INTERVALLE_FANTOMES_MS) {
      dernierBalayage = d.maintenant();
      try {
        const clos = await d.reconcilier();
        if (clos > 0) journal.log(`[bio-ingest file] fantômes clos : ${clos}`);
        await d.signaler();
      } catch (err) {
        journal.error('[bio-ingest file] balayage des fantômes :', ...classeEtCode(err));
      }
    }
    let vide = true;
    try {
      const issue = await d.traiter();
      vide = issue.issue === 'vide';
      if (!vide) journal.log(`[bio-ingest file] ${JSON.stringify(issue)}`);
    } catch (err) {
      journal.error('[bio-ingest file] tour interrompu :', ...classeEtCode(err));
    }
    if (vide && !d.estArrete()) await d.attendre(ATTENTE_FILE_VIDE_MS);
  }
  journal.log('[bio-ingest file] arrêté');
}
