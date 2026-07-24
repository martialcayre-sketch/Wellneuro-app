import { NextResponse } from 'next/server';
import { isAuthorizedSupplementsRequest } from '@/lib/supplement-library/auth';
import { getSupplementLibraryConfig } from '@/lib/supplement-library/config';
import { ingestSupplementFiches } from '@/lib/supplement-library/ingest';
import { parseSupplementIngestPayload } from '@/lib/supplement-library/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Voie d'ingestion interne du catalogue de compléments (C4A). Même patron que
// /api/internal/rag/ingest : secret partagé, validation stricte, écriture en
// BROUILLONS uniquement. Aucune donnée patient ; aucune activation clinique.
export async function POST(req: Request) {
  try {
    getSupplementLibraryConfig();
  } catch (error) {
    // Fail-closed : avant authentification, aucun détail sur la cause exacte.
    console.error('Ingestion compléments : configuration invalide —', error);
    return NextResponse.json(
      { error: "Voie d'ingestion des compléments non configurée." },
      { status: 503 },
    );
  }

  if (!isAuthorizedSupplementsRequest(req)) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON invalide.' }, { status: 400 });
  }

  let payload;
  try {
    payload = parseSupplementIngestPayload(rawBody);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Payload d'ingestion invalide.";
    return NextResponse.json({ error: message }, { status: 422 });
  }

  try {
    const bilan = await ingestSupplementFiches(payload.fiches);
    return NextResponse.json({
      ok: bilan.ok,
      statut: 'IMPORTE_BROUILLONS',
      resume: bilan.resume,
      resultats: bilan.resultats,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Échec d'ingestion du catalogue.";
    console.error('Ingestion compléments : écriture échouée —', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
