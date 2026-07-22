import { prisma } from '@/lib/prisma';
import { getRagConfig } from '@/lib/rag/config';
import { CLAIM_INGEST_STATUT, type RagClaimInput } from '@/lib/rag/claims/validation';

export type RagIndexedClaim = {
  id: string;
  claimId: string;
  versionClaim: string;
  contentSha256: string;
  /** false si le claim (cette version) existait déjà : l'ingestion est additive. */
  inserted: boolean;
  sources: number;
};

function vectorLiteral(values: number[]): string {
  return `[${values.join(',')}]`;
}

/**
 * Insère des claims EN_ATTENTE_VALIDATION et leurs liens vers les chunks sources.
 *
 * L'ingestion est délibérément ADDITIVE et ne diffère volontairement du pattern
 * des chunks sur deux points :
 *   1. Aucune supersession/désactivation. Sur les chunks (verbatim), une nouvelle
 *      version désactive l'ancienne. Ici, désactiver automatiquement une version
 *      antérieure retirerait de la récupération un claim peut-être VALIDÉ par un
 *      praticien, sur simple arrivée d'un brouillon. La désactivation est un acte
 *      de curation, jamais un effet de bord d'un POST.
 *   2. Une version de claim est IMMUABLE une fois ingérée. Un ré-envoi
 *      rigoureusement identique (même texte, mêmes attributs cliniques, mêmes
 *      sources) est un no-op idempotent ; TOUTE divergence est refusée
 *      (VERSION_CONFLICT / CLAIM_IMMUABLE) avec pour consigne d'incrémenter
 *      version_claim. Une ré-ingestion ne peut donc ni réécrire le texte ou les
 *      attributs (prescriptif/typologie sont servis au patient), ni ajouter des
 *      sources, ni défaire une validation d'un claim peut-être déjà VALIDÉ. Le
 *      contrôle porte sur l'ENSEMBLE des sources, pas seulement les liens déjà
 *      présents : c'est ce qui ferme l'ajout silencieux de provenance non revue.
 */
export async function upsertRagClaims(
  claims: RagClaimInput[],
  embeddings: number[][],
): Promise<RagIndexedClaim[]> {
  if (claims.length !== embeddings.length) {
    throw new Error(`Claims/embeddings incohérents : ${claims.length}/${embeddings.length}.`);
  }
  const config = getRagConfig();

  return prisma.$transaction(async (tx) => {
    const indexed: RagIndexedClaim[] = [];

    for (let index = 0; index < claims.length; index += 1) {
      const claim = claims[index];
      const embedding = embeddings[index];
      const id = `${claim.claimId}@${claim.versionClaim}`;
      const embeddingText = vectorLiteral(embedding);
      const metadataJson = JSON.stringify(claim.metadata ?? {});

      const existing = await tx.$queryRaw<Array<{
        content_sha256: string;
        source_id: string;
        typologie_lecture: string;
        prescriptif: boolean;
        classe_autorite: string | null;
        niveau_preuve: string | null;
        modele_reviseur: string | null;
      }>>`
        SELECT content_sha256::text, source_id, typologie_lecture, prescriptif,
               classe_autorite, niveau_preuve, modele_reviseur
        FROM public.rag_corpus_claims
        WHERE claim_id = ${claim.claimId}
          AND version_claim = ${claim.versionClaim}
        LIMIT 1
      `;

      if (existing[0]) {
        // Version déjà ingérée : immuable. Identique → no-op ; toute divergence
        // (texte, attributs cliniques, ensemble de sources) → refus explicite.
        const prev = existing[0];
        if (prev.content_sha256 !== claim.contentSha256) {
          throw new Error(
            `VERSION_CONFLICT ${id} : cette version existe déjà avec un texte différent — incrémenter version_claim.`,
          );
        }
        const attributsDivergents =
          prev.source_id !== claim.sourceId ||
          prev.typologie_lecture !== claim.typologieLecture ||
          prev.prescriptif !== claim.prescriptif ||
          (prev.classe_autorite ?? null) !== (claim.classeAutorite ?? null) ||
          (prev.niveau_preuve ?? null) !== (claim.niveauPreuve ?? null) ||
          (prev.modele_reviseur ?? null) !== (claim.modeleReviseur ?? null);
        if (attributsDivergents) {
          throw new Error(
            `CLAIM_IMMUABLE ${id} : cette version existe déjà avec des attributs cliniques différents — incrémenter version_claim.`,
          );
        }
        const existingLinks = await tx.$queryRaw<Array<{ chunk_id: string; version_chunk: string }>>`
          SELECT chunk_id, version_chunk
          FROM public.rag_corpus_claim_sources
          WHERE claim_pk = ${id}
        `;
        const existingSet = new Set(existingLinks.map((link) => `${link.chunk_id}@${link.version_chunk}`));
        const incomingSet = new Set(claim.sources.map((source) => `${source.chunkId}@${source.versionChunk}`));
        const memesSources =
          existingSet.size === incomingSet.size &&
          [...incomingSet].every((key) => existingSet.has(key));
        if (!memesSources) {
          throw new Error(
            `CLAIM_IMMUABLE ${id} : cette version existe déjà avec un autre ensemble de sources — incrémenter version_claim.`,
          );
        }
        // Rigoureusement identique : rien à réécrire (idempotent).
        indexed.push({
          id,
          claimId: claim.claimId,
          versionClaim: claim.versionClaim,
          contentSha256: claim.contentSha256,
          inserted: false,
          sources: existingLinks.length,
        });
        continue;
      }

      // Claim neuf. Chaque chunk source doit exister AVANT d'insérer le lien (la
      // FK le garantit, mais un contrôle explicite donne un message métier et
      // pince l'empreinte du verbatim au moment du rattachement — colonne d'audit
      // qui révèle plus tard une dérive de la couche verbatim).
      const pins: Array<{ chunkId: string; versionChunk: string; sha: string }> = [];
      for (const source of claim.sources) {
        const chunkRow = await tx.$queryRaw<Array<{ content_sha256: string }>>`
          SELECT content_sha256::text
          FROM public.rag_corpus_chunks
          WHERE chunk_id = ${source.chunkId}
            AND version_chunk = ${source.versionChunk}
          LIMIT 1
        `;
        if (!chunkRow[0]) {
          throw new Error(
            `CHUNK_INTROUVABLE ${source.chunkId}@${source.versionChunk} : un claim ne peut citer un verbatim absent.`,
          );
        }
        pins.push({
          chunkId: source.chunkId,
          versionChunk: source.versionChunk,
          sha: chunkRow[0].content_sha256,
        });
      }

      await tx.$executeRaw`
        INSERT INTO public.rag_corpus_claims (
          id,
          claim_id,
          source_id,
          version_claim,
          texte_normalise,
          content_sha256,
          classe_autorite,
          niveau_preuve,
          typologie_lecture,
          prescriptif,
          modele_reviseur,
          statut,
          embedding_model,
          embedding_dimensions,
          embedding,
          patient_identifiable,
          compartment,
          metadata,
          active,
          indexed_at,
          superseded_at,
          created_at,
          updated_at
        ) VALUES (
          ${id},
          ${claim.claimId},
          ${claim.sourceId},
          ${claim.versionClaim},
          ${claim.texteNormalise},
          ${claim.contentSha256},
          ${claim.classeAutorite ?? null},
          ${claim.niveauPreuve ?? null},
          ${claim.typologieLecture},
          ${claim.prescriptif},
          ${claim.modeleReviseur ?? null},
          ${CLAIM_INGEST_STATUT},
          ${config.embeddingModel},
          ${config.embeddingDimensions},
          ${embeddingText}::extensions.vector,
          false,
          'ACTIF',
          ${metadataJson}::jsonb,
          true,
          now(),
          null,
          now(),
          now()
        )
        ON CONFLICT (claim_id, version_claim) DO NOTHING
      `;

      for (const pin of pins) {
        await tx.$executeRaw`
          INSERT INTO public.rag_corpus_claim_sources (
            claim_pk,
            chunk_id,
            version_chunk,
            source_content_sha256,
            created_at
          ) VALUES (
            ${id},
            ${pin.chunkId},
            ${pin.versionChunk},
            ${pin.sha},
            now()
          )
          ON CONFLICT (claim_pk, chunk_id, version_chunk) DO NOTHING
        `;
      }

      indexed.push({
        id,
        claimId: claim.claimId,
        versionClaim: claim.versionClaim,
        contentSha256: claim.contentSha256,
        inserted: true,
        sources: pins.length,
      });
    }

    return indexed;
  });
}

export async function getRagClaimsHealth() {
  const counts = await prisma.$queryRaw<Array<{
    total: bigint;
    active: bigint;
    en_attente: bigint;
    valide: bigint;
    rejete: bigint;
    sources: bigint;
  }>>`
    SELECT
      count(*) AS total,
      count(*) FILTER (WHERE active = true) AS active,
      count(*) FILTER (WHERE statut = 'EN_ATTENTE_VALIDATION') AS en_attente,
      count(*) FILTER (WHERE statut = 'VALIDE') AS valide,
      count(*) FILTER (WHERE statut = 'REJETE') AS rejete,
      count(DISTINCT source_id) AS sources
    FROM public.rag_corpus_claims
  `;
  const links = await prisma.$queryRaw<Array<{ total: bigint; orphelins: bigint }>>`
    SELECT
      (SELECT count(*) FROM public.rag_corpus_claim_sources) AS total,
      (SELECT count(*) FROM public.rag_corpus_claims c
        WHERE NOT EXISTS (
          SELECT 1 FROM public.rag_corpus_claim_sources s WHERE s.claim_pk = c.id
        )) AS orphelins
  `;
  // Signaux d'audit de la couche source (le versionnage épinglé A9/AC-2 est
  // VOULU : un claim reste adossé à la version qu'un praticien a validée, même
  // si le verbatim est supersédé depuis. Ces compteurs le rendent visible) :
  //  - empreintesDerivees : le contenu de la version citée a changé sous le lien
  //    (altération d'une version — ne devrait jamais arriver, VERSION_CONFLICT
  //    côté chunks l'empêche, d'où l'intérêt de le surveiller) ;
  //  - sourcesSupersedees : la version de chunk citée n'est plus active (une
  //    version plus récente existe) — dérive normale à surveiller, pas une faute.
  const drift = await prisma.$queryRaw<Array<{ derive: bigint; supersedees: bigint }>>`
    SELECT
      count(*) FILTER (
        WHERE s.source_content_sha256 IS NOT NULL
          AND s.source_content_sha256 <> k.content_sha256
      ) AS derive,
      count(*) FILTER (WHERE k.active = false) AS supersedees
    FROM public.rag_corpus_claim_sources s
    JOIN public.rag_corpus_chunks k
      ON k.chunk_id = s.chunk_id AND k.version_chunk = s.version_chunk
  `;

  const count = counts[0];
  const link = links[0];
  return {
    claims: {
      total: count ? Number(count.total) : 0,
      active: count ? Number(count.active) : 0,
      enAttenteValidation: count ? Number(count.en_attente) : 0,
      valide: count ? Number(count.valide) : 0,
      rejete: count ? Number(count.rejete) : 0,
      sources: count ? Number(count.sources) : 0,
    },
    liens: {
      total: link ? Number(link.total) : 0,
      claimsOrphelins: link ? Number(link.orphelins) : 0,
      empreintesDerivees: drift[0] ? Number(drift[0].derive) : 0,
      sourcesSupersedees: drift[0] ? Number(drift[0].supersedees) : 0,
    },
  };
}
