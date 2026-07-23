import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { annoterSources, type NotebookSource } from '@/lib/rag/claims/notebooks';
import { listerSourcesEnRevue, type SourceEnRevue } from '@/lib/rag/claims/revue';

// Atelier corpus — vue d'ensemble PAR SOURCE, groupée par notebook.
//
// C'est l'écran d'entrée de la revue : quelles sources ont une file, combien
// part en voie rapide (déclaré/observé non prescriptifs) et combien reste en
// individuel, et si une revue de lot est déjà en cours. Le notebook vient du
// registre sanitaire (source_registry.json), la base ne le connaît pas.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export type SourceAtelier = SourceEnRevue & Omit<NotebookSource, 'sourceId'>;

export type CorpusSourcesApiResponse =
  | { ok: true; notebooks: Array<{ notebook: string; sources: SourceAtelier[] }> }
  | { ok: false; reason: string; error: string };

export async function GET(): Promise<NextResponse<CorpusSourcesApiResponse>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { ok: false as const, reason: 'unauthenticated', error: 'Authentification requise.' },
        { status: 401 },
      );
    }

    const sources = await listerSourcesEnRevue();
    const notices = new Map(
      annoterSources(sources.map((s) => s.sourceId)).map((n) => [n.sourceId, n]),
    );

    const parNotebook = new Map<string, SourceAtelier[]>();
    for (const source of sources) {
      const notice = notices.get(source.sourceId);
      const annotee: SourceAtelier = {
        ...source,
        titre: notice?.titre ?? source.sourceId,
        notebook: notice?.notebook ?? 'Hors registre',
      };
      const liste = parNotebook.get(annotee.notebook) ?? [];
      liste.push(annotee);
      parNotebook.set(annotee.notebook, liste);
    }

    return NextResponse.json({
      ok: true,
      notebooks: [...parNotebook.entries()]
        .map(([notebook, liste]) => ({ notebook, sources: liste }))
        .sort((a, b) => a.notebook.localeCompare(b.notebook, 'fr')),
    });
  } catch (err) {
    console.error(
      '[praticien/corpus/claims/sources GET]',
      err instanceof Error ? err.message : String(err),
    );
    return NextResponse.json(
      { ok: false as const, reason: 'exception', error: 'Erreur technique.' },
      { status: 500 },
    );
  }
}
