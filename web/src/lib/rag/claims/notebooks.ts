import registre from '../../../../../docs/claude/corpus/source_registry.json';

// Vue « notebooks » du registre sanitaire des sources
// (docs/claude/corpus/source_registry.json — source de vérité unique,
// importée STATIQUEMENT : le JSON est bundlé à la compilation, donc présent
// dans le déploiement Vercel dont le répertoire racine est web/).
//
// Le notebook (primaryNotebook) est l'unité d'organisation pédagogique du
// corpus : c'est par lui que le praticien filtre la file de revue et la
// validation par lot, et par lui que la bibliothèque NotebookLM est nourrie.

type NoticeRegistre = {
  sourceId?: string;
  title?: string;
  primaryNotebook?: string;
};

const NOTICES: ReadonlyArray<NoticeRegistre> = registre as NoticeRegistre[];

const PAR_SOURCE = new Map<string, { titre: string; notebook: string }>();
for (const notice of NOTICES) {
  if (!notice.sourceId) continue;
  PAR_SOURCE.set(notice.sourceId, {
    titre: notice.title || notice.sourceId,
    notebook: notice.primaryNotebook || 'Hors notebook',
  });
}

export type NotebookSource = { sourceId: string; titre: string; notebook: string };

/** Titre + notebook d'une source, ou null si absente du registre. */
export function noticeDeSource(sourceId: string): NotebookSource | null {
  const notice = PAR_SOURCE.get(sourceId);
  return notice ? { sourceId, titre: notice.titre, notebook: notice.notebook } : null;
}

/** Les sourceIds d'un notebook (registre entier — l'appelant croise avec la base). */
export function sourcesDuNotebook(notebook: string): string[] {
  const ids: string[] = [];
  for (const [sourceId, notice] of PAR_SOURCE) {
    if (notice.notebook === notebook) ids.push(sourceId);
  }
  return ids.sort();
}

/** Annote des sourceIds avec titre et notebook (inconnues du registre incluses, marquées). */
export function annoterSources(sourceIds: string[]): NotebookSource[] {
  return sourceIds.map(
    (sourceId) =>
      noticeDeSource(sourceId) ?? { sourceId, titre: sourceId, notebook: 'Hors registre' },
  );
}
