import { prisma } from '@/lib/prisma';
import { RAG_EMBEDDING_DIMENSIONS } from '@/lib/rag/config';
import { CLAIM_INGEST_STATUT } from '@/lib/rag/claims/validation';

export type RagClaimCheck = {
  id: string;
  inserted: boolean;
  present: boolean;
  statutOk: boolean;
  active: boolean;
  embeddingOk: boolean;
  liens: number;
  hashOk: boolean;
  ok: boolean;
};

/**
 * Contrôle post-ingestion des claims.
 *
 * Un claim FRAÎCHEMENT INSÉRÉ (inserted=true) doit être exactement dans l'état
 * d'ingestion : actif, EN_ATTENTE_VALIDATION, vectorisé à la bonne dimension,
 * avec ≥1 lien source et l'empreinte annoncée. Il ne remonte PAS encore par
 * match_wellneuro_rag_claims (barrière VALIDE) : la vérification est structurelle.
 *
 * Un claim DÉJÀ PRÉSENT (inserted=false) est, par construction de upsertRagClaims,
 * rigoureusement identique à ce qui est en base (sinon l'ingestion aurait été
 * refusée). Son statut a pu passer à VALIDE/REJETE par un acte de validation
 * distinct : on n'exige donc PAS EN_ATTENTE_VALIDATION pour lui — seulement son
 * intégrité (présent, vectorisé, lié, hash concordant). Sans quoi un replay
 * idempotent d'un lot dont un claim a été validé entre-temps échouerait à tort.
 */
export async function verifyRagClaimsBatch(
  expected: Array<{ id: string; contentSha256: string; inserted: boolean }>,
): Promise<{ ok: boolean; checked: number; checks: RagClaimCheck[] }> {
  const ids = expected.map((claim) => claim.id);
  const expectedById = new Map(expected.map((claim) => [claim.id, claim]));

  const rows = await prisma.$queryRaw<Array<{
    id: string;
    content_sha256: string;
    statut: string;
    active: boolean;
    dims: number | null;
    liens: bigint;
  }>>`
    SELECT
      c.id,
      c.content_sha256::text AS content_sha256,
      c.statut,
      c.active,
      extensions.vector_dims(c.embedding) AS dims,
      (SELECT count(*) FROM public.rag_corpus_claim_sources s WHERE s.claim_pk = c.id) AS liens
    FROM public.rag_corpus_claims AS c
    WHERE c.id = ANY(${ids}::text[])
    ORDER BY c.id
  `;

  const byId = new Map(rows.map((row) => [row.id, row]));
  const checks: RagClaimCheck[] = ids.map((id) => {
    const want = expectedById.get(id)!;
    const row = byId.get(id);
    if (!row) {
      return {
        id,
        inserted: want.inserted,
        present: false,
        statutOk: false,
        active: false,
        embeddingOk: false,
        liens: 0,
        hashOk: false,
        ok: false,
      };
    }
    const liens = Number(row.liens);
    // Un claim fraîchement inséré doit être EN_ATTENTE_VALIDATION et actif ; un
    // claim préexistant peut avoir été validé/rejeté depuis — seule son intégrité
    // compte.
    const statutOk = want.inserted ? row.statut === CLAIM_INGEST_STATUT : true;
    const active = want.inserted ? row.active : true;
    const embeddingOk = Number(row.dims) === RAG_EMBEDDING_DIMENSIONS;
    const hashOk = row.content_sha256 === want.contentSha256;
    const ok = statutOk && active && embeddingOk && liens >= 1 && hashOk;
    return {
      id,
      inserted: want.inserted,
      present: true,
      statutOk,
      active: row.active,
      embeddingOk,
      liens,
      hashOk,
      ok,
    };
  });

  return {
    // Complétude : tous les ids attendus doivent être présents et conformes ; un
    // id manquant apparaît via present=false → ok=false.
    ok: expected.length > 0 && checks.every((check) => check.ok),
    checked: checks.length,
    checks,
  };
}
