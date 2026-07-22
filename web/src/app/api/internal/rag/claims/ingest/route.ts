import { NextResponse } from 'next/server';
import { isAuthorizedRagRequest } from '@/lib/rag/auth';
import { getRagConfig } from '@/lib/rag/config';
import { createEmbeddings } from '@/lib/rag/embeddings';
import { upsertRagClaims } from '@/lib/rag/claims/store';
import { verifyRagClaimsBatch } from '@/lib/rag/claims/verification';
import { embeddingTextForClaim, parseRagClaimsIngestPayload } from '@/lib/rag/claims/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    getRagConfig();
  } catch (error) {
    // Avant authentification, aucun détail sur la cause exacte.
    console.error('RAG claims ingest : configuration invalide —', error);
    return NextResponse.json({ error: 'RAG de production non configuré.' }, { status: 503 });
  }

  if (!isAuthorizedRagRequest(req)) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON invalide.' }, { status: 400 });
  }

  // Le parsing du contrat isole toutes les fautes de payload : toute erreur ici
  // est un 422 client, sans dépendre du libellé exact du message (couplage
  // fragile qui reclassait par erreur certains rejets, ex. « donnée patient
  // identifiable », en 500).
  let payload;
  try {
    payload = parseRagClaimsIngestPayload(rawBody);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Payload de claims invalide.';
    return NextResponse.json({ error: message }, { status: 422 });
  }

  try {
    // L'embedding porte sur l'affirmation normalisée ; le hash d'intégrité est
    // déjà revérifié dans parseRagClaimsIngestPayload.
    const embeddings = await createEmbeddings(
      payload.claims.map((claim) => embeddingTextForClaim(claim.texteNormalise)),
    );
    const indexed = await upsertRagClaims(payload.claims, embeddings);
    const verification = await verifyRagClaimsBatch(
      indexed.map((claim) => ({
        id: claim.id,
        contentSha256: claim.contentSha256,
        inserted: claim.inserted,
      })),
    );

    if (!verification.ok) {
      return NextResponse.json(
        {
          error: 'RAG_CLAIMS_VERIFICATION_FAILED',
          indexedCount: indexed.length,
          verification,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      // Les claims entrent EN_ATTENTE_VALIDATION : indexés mais NON remontables
      // tant qu'un praticien ne les a pas validés (D-003).
      status: 'INDEXE_RAG_CLAIMS_EN_ATTENTE_VALIDATION',
      indexedCount: indexed.length,
      verification,
      claims: indexed,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Échec d’ingestion des claims RAG.';
    // Conflits métier détectés au stockage (rejet client) → 422 ; le reste
    // (embeddings, base) → 500.
    const status = /VERSION_CONFLICT|CHUNK_INTROUVABLE|CLAIM_IMMUABLE/.test(message) ? 422 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
