import { prisma } from '@/lib/prisma';

// Poste de revue des claims (Atelier corpus v1, D-004). C'est ici — et
// seulement ici — que vit la signature praticien D-003 : l'ingestion force
// EN_ATTENTE_VALIDATION (validation.ts), la récupération patient n'expose que
// VALIDE (match_wellneuro_rag_claims), et cette lib porte l'acte humain qui
// fait passer de l'un à l'autre.
//
// La lecture de revue lit la table directement : elle est réservée au
// praticien authentifié (routes /api/praticien/corpus/*) et n'est PAS une voie
// de récupération — la seule voie patient reste match_wellneuro_rag_claims.

export const CLAIM_STATUTS = ['EN_ATTENTE_VALIDATION', 'VALIDE', 'REJETE'] as const;
export type ClaimStatut = (typeof CLAIM_STATUTS)[number];

const STATUTS = new Set<string>(CLAIM_STATUTS);

export function estClaimStatut(value: string): value is ClaimStatut {
  return STATUTS.has(value);
}

/**
 * Machine à états fermée de la revue. Trois transitions praticien :
 *  - EN_ATTENTE_VALIDATION → VALIDE   (signature : validateur + valide_at)
 *  - EN_ATTENTE_VALIDATION → REJETE   (décision attribuée, sans date de validation)
 *  - VALIDE | REJETE → EN_ATTENTE_VALIDATION (annulation : efface la signature)
 * Tout le reste est refusé. Un claim ne se supprime ni ne s'édite ici : une
 * correction de texte passe par une NOUVELLE version ingérée (immuabilité).
 */
const TRANSITIONS: Record<ClaimStatut, readonly ClaimStatut[]> = {
  EN_ATTENTE_VALIDATION: ['VALIDE', 'REJETE'],
  VALIDE: ['EN_ATTENTE_VALIDATION'],
  REJETE: ['EN_ATTENTE_VALIDATION'],
};

export function transitionAutorisee(depuis: ClaimStatut, vers: ClaimStatut): boolean {
  return TRANSITIONS[depuis].includes(vers);
}

export type SourceCiteeRevue = {
  chunkId: string;
  versionChunk: string;
  section: string;
  extrait: string;
  tronque: boolean;
  /** Le contenu de la version citée a changé depuis le rattachement (anomalie). */
  shaDerive: boolean;
  /** La version citée n'est plus active : un verbatim plus récent existe (dérive normale, visible). */
  supersedee: boolean;
};

export type ClaimEnRevue = {
  id: string;
  claimId: string;
  versionClaim: string;
  sourceId: string;
  texteNormalise: string;
  classeAutorite: string | null;
  niveauPreuve: string | null;
  typologieLecture: string;
  prescriptif: boolean;
  modeleReviseur: string | null;
  statut: ClaimStatut;
  validateur: string | null;
  valideAt: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  sources: SourceCiteeRevue[];
};

export type ListeClaimsRevue = {
  claims: ClaimEnRevue[];
  /** Nombre total de claims pour le filtre courant (pagination). */
  total: number;
};

const EXTRAIT_MAX = 700;
const LIMIT_MAX = 100;

export type ListerClaimsRevueOptions = {
  statut: ClaimStatut;
  sourceId?: string;
  limit?: number;
  offset?: number;
};

/**
 * Liste de revue : les claims d'un statut (filtre source optionnel), chacun
 * avec ses verbatims cités — extrait, section, et drapeaux de dérive de la
 * couche source. L'ordre est stable (source, claim, version) pour que la file
 * de revue ne « saute » pas entre deux décisions.
 */
export async function listerClaimsRevue(options: ListerClaimsRevueOptions): Promise<ListeClaimsRevue> {
  const statut = options.statut;
  const sourceId = options.sourceId ?? null;
  const limit = Math.max(1, Math.min(options.limit ?? 50, LIMIT_MAX));
  const offset = Math.max(0, options.offset ?? 0);

  const [countRows, rows] = await Promise.all([
    prisma.$queryRaw<Array<{ total: bigint }>>`
      SELECT count(*) AS total
      FROM public.rag_corpus_claims c
      WHERE c.statut = ${statut}
        AND c.active = true
        AND (${sourceId}::text IS NULL OR c.source_id = ${sourceId})
    `,
    prisma.$queryRaw<Array<{
      id: string;
      claim_id: string;
      version_claim: string;
      source_id: string;
      texte_normalise: string;
      classe_autorite: string | null;
      niveau_preuve: string | null;
      typologie_lecture: string;
      prescriptif: boolean;
      modele_reviseur: string | null;
      statut: string;
      validateur: string | null;
      valide_at: Date | null;
      metadata: unknown;
      created_at: Date;
    }>>`
      SELECT
        c.id,
        c.claim_id,
        c.version_claim,
        c.source_id,
        c.texte_normalise,
        c.classe_autorite,
        c.niveau_preuve,
        c.typologie_lecture,
        c.prescriptif,
        c.modele_reviseur,
        c.statut,
        c.validateur,
        c.valide_at,
        c.metadata,
        c.created_at
      FROM public.rag_corpus_claims c
      WHERE c.statut = ${statut}
        AND c.active = true
        AND (${sourceId}::text IS NULL OR c.source_id = ${sourceId})
      ORDER BY c.source_id, c.claim_id, c.version_claim
      LIMIT ${limit} OFFSET ${offset}
    `,
  ]);

  const ids = rows.map((row) => row.id);
  const liens = ids.length
    ? await prisma.$queryRaw<Array<{
        claim_pk: string;
        chunk_id: string;
        version_chunk: string;
        section: string;
        extrait: string;
        longueur: number;
        sha_derive: boolean;
        supersedee: boolean;
      }>>`
        SELECT
          s.claim_pk,
          s.chunk_id,
          s.version_chunk,
          k.section,
          left(k.content, ${EXTRAIT_MAX}) AS extrait,
          length(k.content) AS longueur,
          (s.source_content_sha256 IS NOT NULL
            AND s.source_content_sha256 <> k.content_sha256) AS sha_derive,
          (k.active = false) AS supersedee
        FROM public.rag_corpus_claim_sources s
        JOIN public.rag_corpus_chunks k
          ON k.chunk_id = s.chunk_id AND k.version_chunk = s.version_chunk
        WHERE s.claim_pk = ANY(${ids}::text[])
        ORDER BY s.claim_pk, s.chunk_id, s.version_chunk
      `
    : [];

  const sourcesParClaim = new Map<string, SourceCiteeRevue[]>();
  for (const lien of liens) {
    const liste = sourcesParClaim.get(lien.claim_pk) ?? [];
    liste.push({
      chunkId: lien.chunk_id,
      versionChunk: lien.version_chunk,
      section: lien.section,
      extrait: lien.extrait,
      tronque: Number(lien.longueur) > EXTRAIT_MAX,
      shaDerive: lien.sha_derive,
      supersedee: lien.supersedee,
    });
    sourcesParClaim.set(lien.claim_pk, liste);
  }

  return {
    total: countRows[0] ? Number(countRows[0].total) : 0,
    claims: rows.map((row) => ({
      id: row.id,
      claimId: row.claim_id,
      versionClaim: row.version_claim,
      sourceId: row.source_id,
      texteNormalise: row.texte_normalise,
      classeAutorite: row.classe_autorite,
      niveauPreuve: row.niveau_preuve,
      typologieLecture: row.typologie_lecture,
      prescriptif: row.prescriptif,
      modeleReviseur: row.modele_reviseur,
      statut: estClaimStatut(row.statut) ? row.statut : 'EN_ATTENTE_VALIDATION',
      validateur: row.validateur,
      valideAt: row.valide_at ? row.valide_at.toISOString() : null,
      metadata:
        row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
          ? (row.metadata as Record<string, unknown>)
          : {},
      createdAt: row.created_at.toISOString(),
      sources: sourcesParClaim.get(row.id) ?? [],
    })),
  };
}

/**
 * Compteurs des onglets de revue, avec LE MÊME périmètre que la liste
 * (active = true) : la santé d'ingestion (getRagClaimsHealth) compte tout,
 * y compris d'éventuels claims désactivés — une tuile qui divergerait de la
 * liste sous elle rendrait la file illisible.
 */
export async function compterClaimsRevue(): Promise<Record<ClaimStatut, number>> {
  const rows = await prisma.$queryRaw<Array<{
    en_attente: bigint;
    valide: bigint;
    rejete: bigint;
  }>>`
    SELECT
      count(*) FILTER (WHERE statut = 'EN_ATTENTE_VALIDATION') AS en_attente,
      count(*) FILTER (WHERE statut = 'VALIDE') AS valide,
      count(*) FILTER (WHERE statut = 'REJETE') AS rejete
    FROM public.rag_corpus_claims
    WHERE active = true
  `;
  const row = rows[0];
  return {
    EN_ATTENTE_VALIDATION: row ? Number(row.en_attente) : 0,
    VALIDE: row ? Number(row.valide) : 0,
    REJETE: row ? Number(row.rejete) : 0,
  };
}

export type DecisionClaimResultat =
  | {
      ok: true;
      claim: { id: string; statut: ClaimStatut; validateur: string | null; valideAt: string | null };
    }
  | {
      ok: false;
      raison:
        | 'transition_invalide'
        | 'claim_introuvable'
        | 'etat_divergent'
        | 'sources_absentes'
        | 'source_derivee';
    };

/**
 * Applique une décision praticien sur un claim. La garde de concurrence est le
 * WHERE statut = attendu : si l'état a bougé sous le praticien (autre onglet,
 * replay), aucune ligne n'est touchée et l'appel répond etat_divergent — jamais
 * d'écrasement silencieux d'une décision par une autre.
 *
 * Signature D-003 :
 *  - VALIDE : validateur (e-mail praticien en session) + valide_at posé par la
 *    base — la contrainte rag_corpus_claims_valide_signe l'exige aussi.
 *  - REJETE : décision attribuée (validateur) mais sans valide_at — un rejet
 *    n'est pas une validation ; updated_at date l'acte.
 *  - retour EN_ATTENTE_VALIDATION : la signature est effacée des deux côtés.
 */
export async function deciderClaim(params: {
  id: string;
  decision: ClaimStatut;
  statutAttendu: ClaimStatut;
  validateur: string;
}): Promise<DecisionClaimResultat> {
  const { id, decision, statutAttendu, validateur } = params;

  if (!transitionAutorisee(statutAttendu, decision)) {
    return { ok: false, raison: 'transition_invalide' };
  }

  // Garde d'intégrité AVANT de signer VALIDE. Deux refus :
  //  - sources_absentes : un claim sans verbatim cité ne serait de toute façon
  //    jamais servi (prédicat EXISTS de match_wellneuro_rag_claims) — le
  //    signer fabriquerait une validation morte, on refuse au bord ;
  //  - source_derivee : le contenu d'une version citée a changé sous le lien
  //    (anomalie que VERSION_CONFLICT côté chunks est censé rendre
  //    impossible). Le praticien signerait un texte adossé à un verbatim qui
  //    n'est plus celui du rattachement — refus tant que la dérive n'est pas
  //    instruite. La supersession normale (version plus récente active), elle,
  //    ne bloque pas : le claim reste adossé à la version qu'il cite (AC-2).
  // Pas de course avec l'UPDATE : l'ensemble des liens d'une version est
  // immuable (CLAIM_IMMUABLE) et le contenu d'une version de chunk aussi.
  if (decision === 'VALIDE') {
    const integrite = await prisma.$queryRaw<Array<{ liens: bigint; derives: bigint }>>`
      SELECT
        count(*) AS liens,
        count(*) FILTER (
          WHERE s.source_content_sha256 IS NOT NULL
            AND s.source_content_sha256 <> k.content_sha256
        ) AS derives
      FROM public.rag_corpus_claim_sources s
      JOIN public.rag_corpus_chunks k
        ON k.chunk_id = s.chunk_id AND k.version_chunk = s.version_chunk
      WHERE s.claim_pk = ${id}
    `;
    const liens = integrite[0] ? Number(integrite[0].liens) : 0;
    const derives = integrite[0] ? Number(integrite[0].derives) : 0;
    if (liens === 0) return { ok: false, raison: 'sources_absentes' };
    if (derives > 0) return { ok: false, raison: 'source_derivee' };
  }

  const lignes = await prisma.$queryRaw<Array<{
    id: string;
    statut: string;
    validateur: string | null;
    valide_at: Date | null;
  }>>`
    UPDATE public.rag_corpus_claims
    SET
      statut = ${decision},
      validateur = CASE WHEN ${decision} IN ('VALIDE', 'REJETE') THEN ${validateur} ELSE NULL END,
      valide_at = CASE WHEN ${decision} = 'VALIDE' THEN now() ELSE NULL END,
      updated_at = now()
    WHERE id = ${id}
      AND statut = ${statutAttendu}
      AND active = true
    RETURNING id, statut, validateur, valide_at
  `;

  const ligne = lignes[0];
  if (!ligne) {
    const existe = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM public.rag_corpus_claims WHERE id = ${id} AND active = true LIMIT 1
    `;
    return { ok: false, raison: existe[0] ? 'etat_divergent' : 'claim_introuvable' };
  }

  return {
    ok: true,
    claim: {
      id: ligne.id,
      statut: estClaimStatut(ligne.statut) ? ligne.statut : 'EN_ATTENTE_VALIDATION',
      validateur: ligne.validateur,
      valideAt: ligne.valide_at ? ligne.valide_at.toISOString() : null,
    },
  };
}
