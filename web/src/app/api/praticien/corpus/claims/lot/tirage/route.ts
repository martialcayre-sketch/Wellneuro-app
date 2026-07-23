import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { emailPraticien } from '@/lib/praticien/appartenance';
import { tirageOuvertDeSource, type TirageOuvert } from '@/lib/rag/claims/recherche';
import { tirerEchantillon } from '@/lib/rag/claims/revue';

// Voie rapide de l'Atelier corpus — TIRAGE d'échantillon d'une source.
//
// Le serveur tire, jamais le praticien (anti-biais) : seed aléatoire, PRNG
// déterministe, échantillon rejouable depuis le journal. Le tirage est
// journalisé (rag_corpus_claim_decisions, type tirage_echantillon) avant
// d'être montré — un tirage défavorable ne s'efface pas en re-tirant, chaque
// tentative laisse sa trace. Périmètre : claims déclarés/observés non
// prescriptifs seulement (la voie lente ne passe jamais par ici).

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SOURCE_RE = /^WN-SRC-\d{4}$/;

export type CorpusLotTirageApiResponse =
  | { ok: true; tirageId: number; seed: number; taux: number; lot: number; tires: string[] }
  | { ok: false; reason: string; error: string; tirageOuvert?: number };

function echec(reason: string, error: string, status: number, tirageOuvert?: number) {
  return NextResponse.json<CorpusLotTirageApiResponse>(
    tirageOuvert === undefined
      ? { ok: false, reason, error }
      : { ok: false, reason, error, tirageOuvert },
    { status },
  );
}

export type CorpusLotTirageOuvertApiResponse =
  | { ok: true; tirage: TirageOuvert | null }
  | { ok: false; reason: string; error: string };

// GET /api/praticien/corpus/claims/lot/tirage?sourceId=… — le tirage OUVERT
// de la source s'il existe (reprise d'une revue interrompue, sans re-tirer).
export async function GET(req: Request): Promise<NextResponse<CorpusLotTirageOuvertApiResponse>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { ok: false as const, reason: 'unauthenticated', error: 'Authentification requise.' },
        { status: 401 },
      );
    }
    if (!emailPraticien(session)) {
      return NextResponse.json(
        { ok: false as const, reason: 'unauthenticated', error: 'Session praticien sans e-mail.' },
        { status: 401 },
      );
    }

    const sourceId = (new URL(req.url).searchParams.get('sourceId') ?? '').trim();
    if (!SOURCE_RE.test(sourceId)) {
      return NextResponse.json(
        { ok: false as const, reason: 'source_invalide', error: 'Identifiant de source invalide.' },
        { status: 400 },
      );
    }

    const tirage = await tirageOuvertDeSource(sourceId);
    return NextResponse.json({ ok: true as const, tirage });
  } catch (err) {
    console.error(
      '[praticien/corpus/claims/lot/tirage GET]',
      err instanceof Error ? err.message : String(err),
    );
    return NextResponse.json(
      { ok: false as const, reason: 'exception', error: 'Erreur technique.' },
      { status: 500 },
    );
  }
}

// POST /api/praticien/corpus/claims/lot/tirage — { sourceId }
export async function POST(req: Request): Promise<NextResponse<CorpusLotTirageApiResponse>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return echec('unauthenticated', 'Authentification requise.', 401);
    const validateur = emailPraticien(session);
    if (!validateur) return echec('unauthenticated', 'Session praticien sans e-mail.', 401);

    let body: { sourceId?: string };
    try {
      body = (await req.json()) as { sourceId?: string };
    } catch {
      return echec('invalid', 'Corps de requête illisible.', 400);
    }

    const sourceId = (body.sourceId ?? '').trim();
    if (!SOURCE_RE.test(sourceId)) {
      return echec('source_invalide', 'Identifiant de source invalide.', 400);
    }

    const resultat = await tirerEchantillon({ sourceId, validateur });
    if (!resultat.ok) {
      if (resultat.raison === 'tirage_ouvert') {
        return echec(
          resultat.raison,
          'Un tirage est déjà ouvert pour cette source — concluez-le (signature ou bascule) avant d’en tirer un autre.',
          409,
          resultat.tirageId,
        );
      }
      return echec(
        resultat.raison,
        'Aucun claim éligible à la voie rapide pour cette source (rien en attente, ou uniquement des claims de voie lente).',
        409,
      );
    }

    return NextResponse.json({
      ok: true,
      tirageId: resultat.tirageId,
      seed: resultat.seed,
      taux: resultat.taux,
      lot: resultat.lot,
      tires: resultat.tires,
    });
  } catch (err) {
    console.error(
      '[praticien/corpus/claims/lot/tirage POST]',
      err instanceof Error ? err.message : String(err),
    );
    return echec('exception', 'Erreur technique.', 500);
  }
}
