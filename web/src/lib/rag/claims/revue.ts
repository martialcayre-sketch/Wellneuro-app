import { randomInt } from 'node:crypto';
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
        | 'source_derivee'
        | 'motif_requis';
    };

/**
 * Élément consigné dans `claims` du journal des décisions. SEULE source de
 * vérité de cette forme : l'audit GIN (`claims @> …`) est aveugle à toute
 * dérive de casing — le test de contrat verrouille ces clés exactes.
 */
export function elementJournalClaim(
  claim: { id: string; claimId: string; versionClaim: string },
  statutAvant: ClaimStatut,
  statutApres: ClaimStatut,
): {
  id: string;
  claimId: string;
  versionClaim: string;
  statutAvant: ClaimStatut;
  statutApres: ClaimStatut;
} {
  return {
    id: claim.id,
    claimId: claim.claimId,
    versionClaim: claim.versionClaim,
    statutAvant,
    statutApres,
  };
}

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
  /** Motif praticien — obligatoire pour un REJET (dette v1, journal à l'appui). */
  motif?: string;
}): Promise<DecisionClaimResultat> {
  const { id, decision, statutAttendu, validateur } = params;
  const motif = params.motif?.trim() || null;

  if (!transitionAutorisee(statutAttendu, decision)) {
    return { ok: false, raison: 'transition_invalide' };
  }
  if (decision === 'REJETE' && !motif) {
    return { ok: false, raison: 'motif_requis' };
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

  // UPDATE du claim et ligne de journal dans UNE MÊME transaction (dette
  // écrite en tête de la migration du journal) : un statut qui change sans
  // trace, ou une trace sans changement, seraient tous deux des mensonges
  // d'audit. Un échec de l'un annule l'autre.
  return prisma.$transaction(async (tx) => {
    const lignes = await tx.$queryRaw<Array<{
      id: string;
      claim_id: string;
      version_claim: string;
      source_id: string;
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
      RETURNING id, claim_id, version_claim, source_id, statut, validateur, valide_at
    `;

    const ligne = lignes[0];
    if (!ligne) {
      const existe = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM public.rag_corpus_claims WHERE id = ${id} AND active = true LIMIT 1
      `;
      return { ok: false as const, raison: existe[0] ? ('etat_divergent' as const) : ('claim_introuvable' as const) };
    }

    const element = elementJournalClaim(
      { id: ligne.id, claimId: ligne.claim_id, versionClaim: ligne.version_claim },
      statutAttendu,
      decision,
    );
    await tx.$executeRaw`
      INSERT INTO public.rag_corpus_claim_decisions
        (type_acte, decision, motif, validateur, source_id, claims)
      VALUES
        ('decision_individuelle', ${decision}, ${motif}, ${validateur}, ${ligne.source_id},
         ${JSON.stringify([element])}::jsonb)
    `;

    return {
      ok: true as const,
      claim: {
        id: ligne.id,
        statut: estClaimStatut(ligne.statut) ? ligne.statut : ('EN_ATTENTE_VALIDATION' as ClaimStatut),
        validateur: ligne.validateur,
        valideAt: ligne.valide_at ? ligne.valide_at.toISOString() : null,
      },
    };
  });
}

// ---------------------------------------------------------------------------
// Voie rapide — validation par lot avec échantillonnage
// (procédure « validation à deux vitesses » actée le 2026-07-23,
// docs/claude/corpus/VALIDATION_CLAIMS_DEUX_VITESSES.md).
//
// L'éligibilité est une ALLOWLIST : claims 'déclaré' ou 'observé', NON
// prescriptifs, et rien d'autre — 'interprété' ET 'vécu' relèvent de la voie
// lente (une typologie nouvelle ou oubliée tombe du côté prudent). Garde ici,
// redondée par le trigger d'insertion du journal (migration de suivi
// 20260723120000). L'unicité d'issue d'un tirage est portée par l'index
// unique partiel de la même migration — la vérification applicative n'est
// qu'un confort d'UX, la base est l'arbitre sous concurrence.
// ---------------------------------------------------------------------------

/** 30 % (min. 5) pendant le rodage, 20 % (min. 5) ensuite si zéro défaut. */
export const ECHANTILLON_TAUX_RODAGE = 0.3;
export const ECHANTILLON_TAUX_RELACHE = 0.2;
export const ECHANTILLON_MIN = 5;
export const SOURCES_RODAGE = 10;

export type VerdictEchantillon = {
  id: string;
  verdict: 'conforme' | 'non_conforme';
  note?: string;
};

export type QuestionRestitution = {
  question: string;
  reponse: string;
  claimsCites: string[];
  verdict: 'conforme' | 'non_conforme';
};

/**
 * PRNG déterministe (mulberry32) : un tirage est REJOUABLE depuis son seed
 * journalisé — quiconque relit le journal peut reconstituer l'échantillon.
 */
function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Indices échantillonnés parmi n éléments : Fisher-Yates seedé, puis tri —
 * déterministe à seed égal, jamais choisi par le praticien (anti-biais).
 */
export function tirerIndicesEchantillon(n: number, taille: number, seed: number): number[] {
  const indices = Array.from({ length: n }, (_, i) => i);
  const alea = mulberry32(seed);
  for (let i = n - 1; i > 0; i -= 1) {
    const j = Math.floor(alea() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices.slice(0, Math.min(taille, n)).sort((a, b) => a - b);
}

/** Taille d'échantillon : max(taux × n, 5), bornée au lot. */
export function tailleEchantillon(n: number, taux: number): number {
  return Math.min(n, Math.max(ECHANTILLON_MIN, Math.ceil(n * taux)));
}

export type TirageEchantillonResultat =
  | {
      ok: true;
      tirageId: number;
      seed: number;
      taux: number;
      lot: number;
      tires: string[];
    }
  | { ok: false; raison: 'aucun_claim_voie_rapide' }
  | { ok: false; raison: 'tirage_ouvert'; tirageId: number };

/**
 * Tire l'échantillon d'une source et le JOURNALISE (type tirage_echantillon),
 * avec la LISTE COMPLÈTE des éligibles : le lot signé plus tard devra être
 * EXACTEMENT celui-là (un lot élargi entre tirage et signature contiendrait
 * des claims jamais échantillonnables — refusé à la signature).
 *
 * Un seul tirage ouvert par source : re-tirer tant que le précédent n'a pas
 * son issue serait du « tirage shopping » — refus, l'issue d'abord.
 *
 * Le taux est dégressif : 30 % pendant le rodage (moins de SOURCES_RODAGE
 * sources signées par lot), puis 20 % — mais tout défaut constaté (une
 * bascule_individuelle au journal) fige la prudence à 30 %.
 */
export async function tirerEchantillon(params: {
  sourceId: string;
  validateur: string;
}): Promise<TirageEchantillonResultat> {
  const { sourceId, validateur } = params;

  const ouverts = await prisma.$queryRaw<Array<{ id: bigint }>>`
    SELECT t.id
    FROM public.rag_corpus_claim_decisions t
    WHERE t.type_acte = 'tirage_echantillon'
      AND t.source_id = ${sourceId}
      AND NOT EXISTS (
        SELECT 1 FROM public.rag_corpus_claim_decisions i
        WHERE i.tirage_id = t.id
          AND i.type_acte IN ('decision_lot', 'bascule_individuelle')
      )
    ORDER BY t.id DESC
    LIMIT 1
  `;
  if (ouverts[0]) return { ok: false, raison: 'tirage_ouvert', tirageId: Number(ouverts[0].id) };

  // Périmètre de la voie rapide — MÊME prédicat que le chargement du lot dans
  // deciderLot : allowlist déclaré/observé, non prescriptif, en attente, actif.
  const eligibles = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT c.id
    FROM public.rag_corpus_claims c
    WHERE c.source_id = ${sourceId}
      AND c.statut = 'EN_ATTENTE_VALIDATION'
      AND c.active = true
      AND c.prescriptif = false
      AND c.typologie_lecture IN ('déclaré', 'observé')
    ORDER BY c.claim_id, c.version_claim
  `;
  if (eligibles.length === 0) return { ok: false, raison: 'aucun_claim_voie_rapide' };

  const cadence = await prisma.$queryRaw<Array<{ signees: bigint; bascules: bigint }>>`
    SELECT
      count(DISTINCT source_id) FILTER (WHERE type_acte = 'decision_lot') AS signees,
      count(*) FILTER (WHERE type_acte = 'bascule_individuelle') AS bascules
    FROM public.rag_corpus_claim_decisions
  `;
  const signees = cadence[0] ? Number(cadence[0].signees) : 0;
  const bascules = cadence[0] ? Number(cadence[0].bascules) : 0;
  const taux =
    signees < SOURCES_RODAGE || bascules > 0 ? ECHANTILLON_TAUX_RODAGE : ECHANTILLON_TAUX_RELACHE;

  const seed = randomInt(0, 0xffffffff);
  const idsEligibles = eligibles.map((e) => e.id);
  const taille = tailleEchantillon(idsEligibles.length, taux);
  const tires = tirerIndicesEchantillon(idsEligibles.length, taille, seed).map(
    (i) => idsEligibles[i],
  );

  const inseres = await prisma.$queryRaw<Array<{ id: bigint }>>`
    INSERT INTO public.rag_corpus_claim_decisions
      (type_acte, validateur, source_id, echantillon)
    VALUES
      ('tirage_echantillon', ${validateur}, ${sourceId},
       ${JSON.stringify({
         seed,
         taux,
         taille: tires.length,
         lot: idsEligibles.length,
         eligibles: idsEligibles,
         tires,
       })}::jsonb)
    RETURNING id
  `;

  return {
    ok: true,
    tirageId: Number(inseres[0].id),
    seed,
    taux,
    lot: idsEligibles.length,
    tires,
  };
}

export type DecisionLotResultat =
  | { ok: true; valides: number }
  | {
      ok: false;
      raison:
        | 'tirage_introuvable'
        | 'tirage_deja_conclu'
        | 'payload_invalide'
        | 'echantillon_non_conforme'
        | 'questionnaire_non_conforme'
        | 'questionnaire_couverture'
        | 'etat_divergent'
        | 'sources_absentes'
        | 'source_derivee';
    };

type TirageJournalise = { id: number; tires: string[]; eligibles: string[] };

/** Bornes de sanitation : le journal est append-only, donc impurgeable — on
 *  n'y consigne jamais un payload client non borné ni des clés inconnues. */
const VERDICTS_MAX = 500;
const QUESTIONS_MAX = 100;
const TEXTE_COURT_MAX = 4000;

function chaineBornee(valeur: unknown, max: number): string | null {
  if (typeof valeur !== 'string') return null;
  const nette = valeur.trim();
  if (nette === '' || nette.length > max) return null;
  return nette;
}

/** Ne garde que les clés connues, refuse tout élément malformé (null → refus). */
export function sanitiserVerdicts(valeur: unknown): VerdictEchantillon[] | null {
  if (!Array.isArray(valeur) || valeur.length === 0 || valeur.length > VERDICTS_MAX) return null;
  const verdicts: VerdictEchantillon[] = [];
  for (const brut of valeur) {
    if (!brut || typeof brut !== 'object' || Array.isArray(brut)) return null;
    const element = brut as Record<string, unknown>;
    const id = chaineBornee(element.id, TEXTE_COURT_MAX);
    const verdict = element.verdict;
    if (!id || (verdict !== 'conforme' && verdict !== 'non_conforme')) return null;
    // Une note fournie mais malformée (vide, hors borne) est REFUSÉE, jamais
    // supprimée en silence : la note du praticien appartient au journal.
    if (element.note === undefined) {
      verdicts.push({ id, verdict });
    } else {
      const note = chaineBornee(element.note, TEXTE_COURT_MAX);
      if (!note) return null;
      verdicts.push({ id, verdict, note });
    }
  }
  return verdicts;
}

/** Même politique pour le questionnaire de restitution. */
export function sanitiserQuestionnaire(
  valeur: unknown,
): { questions: QuestionRestitution[] } | null {
  if (!valeur || typeof valeur !== 'object' || Array.isArray(valeur)) return null;
  const questionsBrutes = (valeur as Record<string, unknown>).questions;
  if (!Array.isArray(questionsBrutes) || questionsBrutes.length === 0 || questionsBrutes.length > QUESTIONS_MAX) {
    return null;
  }
  const questions: QuestionRestitution[] = [];
  for (const brut of questionsBrutes) {
    if (!brut || typeof brut !== 'object' || Array.isArray(brut)) return null;
    const element = brut as Record<string, unknown>;
    const question = chaineBornee(element.question, TEXTE_COURT_MAX);
    const reponse = chaineBornee(element.reponse, TEXTE_COURT_MAX);
    const verdict = element.verdict;
    const citesBruts = element.claimsCites;
    if (!question || !reponse || (verdict !== 'conforme' && verdict !== 'non_conforme')) return null;
    if (!Array.isArray(citesBruts) || citesBruts.length === 0) return null;
    const claimsCites: string[] = [];
    for (const cite of citesBruts) {
      const id = chaineBornee(cite, TEXTE_COURT_MAX);
      if (!id) return null;
      claimsCites.push(id);
    }
    questions.push({ question, reponse, claimsCites, verdict });
  }
  return { questions };
}

/**
 * Charge un tirage journalisé et vérifie qu'aucune issue (signature ou
 * bascule) ne l'a déjà conclu. Confort d'UX seulement : sous concurrence,
 * l'arbitre est l'index unique rag_claim_decisions_issue_unique — l'INSERT
 * d'une seconde issue échoue en base (23505 → tirage_deja_conclu).
 */
async function chargerTirageOuvert(
  tirageId: number,
  sourceId: string,
): Promise<TirageJournalise | 'tirage_introuvable' | 'tirage_deja_conclu'> {
  const tirages = await prisma.$queryRaw<Array<{ id: bigint; echantillon: unknown }>>`
    SELECT id, echantillon
    FROM public.rag_corpus_claim_decisions
    WHERE id = ${tirageId}
      AND type_acte = 'tirage_echantillon'
      AND source_id = ${sourceId}
    LIMIT 1
  `;
  const tirage = tirages[0];
  if (!tirage) return 'tirage_introuvable';

  const issues = await prisma.$queryRaw<Array<{ n: bigint }>>`
    SELECT count(*) AS n
    FROM public.rag_corpus_claim_decisions
    WHERE tirage_id = ${tirageId}
      AND type_acte IN ('decision_lot', 'bascule_individuelle')
  `;
  if (issues[0] && Number(issues[0].n) > 0) return 'tirage_deja_conclu';

  const echantillon = tirage.echantillon as { tires?: unknown; eligibles?: unknown };
  const enListe = (valeur: unknown): string[] =>
    Array.isArray(valeur) ? valeur.filter((t): t is string => typeof t === 'string') : [];
  return {
    id: Number(tirage.id),
    tires: enListe(echantillon?.tires),
    eligibles: enListe(echantillon?.eligibles),
  };
}

/** Une violation de l'index unique d'issue (23505) = tirage conclu ailleurs. */
function estViolationIssueUnique(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return (
    error.message.includes('23505') || error.message.includes('rag_claim_decisions_issue_unique')
  );
}

/**
 * Signature de lot (voie rapide) : après un tirage dont TOUS les verdicts
 * d'échantillon sont « conforme » et un questionnaire de restitution
 * intégralement conforme ET couvrant chaque chunk actif de la source, les
 * claims éligibles — EXACTEMENT ceux journalisés au tirage — passent VALIDE.
 * Chaque claim porte la signature praticien (validateur + valide_at) ;
 * l'acte et ses preuves partent dans LA MÊME transaction que les UPDATE.
 */
export async function deciderLot(params: {
  sourceId: string;
  tirageId: number;
  verdicts: unknown;
  questionnaire: unknown;
  validateur: string;
}): Promise<DecisionLotResultat> {
  const { sourceId, tirageId, validateur } = params;

  const verdicts = sanitiserVerdicts(params.verdicts);
  const questionnaire = sanitiserQuestionnaire(params.questionnaire);
  if (!verdicts || !questionnaire) return { ok: false, raison: 'payload_invalide' };

  const tirage = await chargerTirageOuvert(tirageId, sourceId);
  if (tirage === 'tirage_introuvable' || tirage === 'tirage_deja_conclu') {
    return { ok: false, raison: tirage };
  }

  // L'échantillon signé est EXACTEMENT l'échantillon tiré : chaque claim tiré
  // porte un verdict, tous « conforme ». Un seul défaut → basculerLot, pas de
  // signature partielle.
  const verdictParId = new Map(verdicts.map((v) => [v.id, v.verdict]));
  const couvreTout =
    tirage.tires.length > 0 &&
    tirage.tires.every((id) => verdictParId.get(id) === 'conforme') &&
    verdicts.length === tirage.tires.length &&
    verdicts.every((v) => tirage.tires.includes(v.id));
  if (!couvreTout) return { ok: false, raison: 'echantillon_non_conforme' };

  if (!questionnaire.questions.every((q) => q.verdict === 'conforme')) {
    return { ok: false, raison: 'questionnaire_non_conforme' };
  }

  // Le lot au moment de la signature — même prédicat que le tirage, et
  // ÉGALITÉ EXACTE avec les éligibles journalisés au tirage : un lot rétréci
  // (décision individuelle entre-temps) OU élargi (nouvelle ingestion) rend
  // le tirage caduc — un claim jamais échantillonnable ne se signe pas.
  const lot = await prisma.$queryRaw<Array<{ id: string; claim_id: string; version_claim: string }>>`
    SELECT c.id, c.claim_id, c.version_claim
    FROM public.rag_corpus_claims c
    WHERE c.source_id = ${sourceId}
      AND c.statut = 'EN_ATTENTE_VALIDATION'
      AND c.active = true
      AND c.prescriptif = false
      AND c.typologie_lecture IN ('déclaré', 'observé')
    ORDER BY c.claim_id, c.version_claim
  `;
  const idsLot = new Set(lot.map((c) => c.id));
  const memeLot =
    tirage.eligibles.length === lot.length && tirage.eligibles.every((id) => idsLot.has(id));
  if (!memeLot) return { ok: false, raison: 'etat_divergent' };

  // Garde d'intégrité de CHAQUE claim du lot — mêmes refus que la validation
  // individuelle : un claim sans verbatim ou adossé à un verbatim modifié ne
  // se signe pas, individuellement comme par lot.
  const ids = lot.map((c) => c.id);
  const integrite = await prisma.$queryRaw<Array<{ claim_pk: string; liens: bigint; derives: bigint }>>`
    SELECT
      c.id AS claim_pk,
      count(s.claim_pk) AS liens,
      count(*) FILTER (
        WHERE s.source_content_sha256 IS NOT NULL
          AND s.source_content_sha256 <> k.content_sha256
      ) AS derives
    FROM public.rag_corpus_claims c
    LEFT JOIN public.rag_corpus_claim_sources s ON s.claim_pk = c.id
    LEFT JOIN public.rag_corpus_chunks k
      ON k.chunk_id = s.chunk_id AND k.version_chunk = s.version_chunk
    WHERE c.id = ANY(${ids}::text[])
    GROUP BY c.id
  `;
  if (integrite.some((ligne) => Number(ligne.liens) === 0)) {
    return { ok: false, raison: 'sources_absentes' };
  }
  if (integrite.some((ligne) => Number(ligne.derives) > 0)) {
    return { ok: false, raison: 'source_derivee' };
  }

  // Couverture actée de la procédure (« questionnaire généré depuis les
  // claims ») : chaque chunk ATTEIGNABLE de la source — c'est-à-dire cité par
  // au moins un claim — est touché par au moins une question, via les claims
  // cités dont on remonte les chunks. Un chunk sans aucun claim (drafting
  // exclu, 28 % au pilote) n'est atteignable par aucune question : l'exiger
  // rendrait la voie rapide insignable pour ces sources. Une question qui
  // cite un claim inconnu de la source n'apporte aucune couverture.
  const citesUniques = [...new Set(questionnaire.questions.flatMap((q) => q.claimsCites))];
  const couverture = await prisma.$queryRaw<Array<{ manquants: bigint }>>`
    SELECT count(*) AS manquants
    FROM public.rag_corpus_chunks k
    WHERE k.source_id = ${sourceId}
      AND k.active = true
      AND EXISTS (
        SELECT 1
        FROM public.rag_corpus_claim_sources s0
        JOIN public.rag_corpus_claims c0 ON c0.id = s0.claim_pk
        WHERE s0.chunk_id = k.chunk_id
          AND c0.source_id = ${sourceId}
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.rag_corpus_claim_sources s
        JOIN public.rag_corpus_claims c ON c.id = s.claim_pk
        WHERE s.chunk_id = k.chunk_id
          AND c.source_id = ${sourceId}
          AND c.claim_id = ANY(${citesUniques}::text[])
      )
  `;
  if (couverture[0] && Number(couverture[0].manquants) > 0) {
    return { ok: false, raison: 'questionnaire_couverture' };
  }

  const elements = lot.map((c) =>
    elementJournalClaim(
      { id: c.id, claimId: c.claim_id, versionClaim: c.version_claim },
      'EN_ATTENTE_VALIDATION',
      'VALIDE',
    ),
  );

  try {
    return await prisma.$transaction(async (tx) => {
      const lignes = await tx.$queryRaw<Array<{ id: string }>>`
        UPDATE public.rag_corpus_claims
        SET
          statut = 'VALIDE',
          validateur = ${validateur},
          valide_at = now(),
          updated_at = now()
        WHERE id = ANY(${ids}::text[])
          AND statut = 'EN_ATTENTE_VALIDATION'
          AND active = true
          AND prescriptif = false
          AND typologie_lecture IN ('déclaré', 'observé')
        RETURNING id
      `;
      // Garde de concurrence : si le lot a bougé entre lecture et signature,
      // on annule TOUT — jamais de lot signé à moitié.
      if (lignes.length !== ids.length) {
        throw new Error('LOT_ETAT_DIVERGENT');
      }

      // L'INSERT porte l'unicité d'issue : une seconde issue sur ce tirage
      // viole l'index unique et annule AUSSI les UPDATE ci-dessus.
      await tx.$executeRaw`
        INSERT INTO public.rag_corpus_claim_decisions
          (type_acte, decision, validateur, source_id, tirage_id, claims, echantillon, questionnaire)
        VALUES
          ('decision_lot', 'VALIDE', ${validateur}, ${sourceId}, ${tirageId},
           ${JSON.stringify(elements)}::jsonb,
           ${JSON.stringify({ tirageId, tires: tirage.tires, eligibles: tirage.eligibles, verdicts })}::jsonb,
           ${JSON.stringify(questionnaire)}::jsonb)
      `;

      return { ok: true as const, valides: lignes.length };
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'LOT_ETAT_DIVERGENT') {
      return { ok: false, raison: 'etat_divergent' };
    }
    if (estViolationIssueUnique(error)) {
      return { ok: false, raison: 'tirage_deja_conclu' };
    }
    throw error;
  }
}

export type BasculeLotResultat =
  | { ok: true }
  | {
      ok: false;
      raison: 'tirage_introuvable' | 'tirage_deja_conclu' | 'motif_requis' | 'payload_invalide';
    };

/**
 * Bascule d'une source en revue individuelle : un défaut constaté sur
 * l'échantillon (ou au questionnaire) disqualifie la voie rapide pour TOUTE
 * la source — aucun statut ne change, l'acte et son motif sont journalisés,
 * et le tirage est conclu. L'unicité d'issue est portée par l'index unique
 * (une course avec une signature de lot laisse UNE issue, jamais deux).
 */
export async function basculerLot(params: {
  sourceId: string;
  tirageId: number;
  motif: string;
  validateur: string;
  verdicts?: unknown;
  questionnaire?: unknown;
}): Promise<BasculeLotResultat> {
  const { sourceId, tirageId, validateur } = params;
  const motif = params.motif?.trim();
  if (!motif || motif.length > TEXTE_COURT_MAX) return { ok: false, raison: 'motif_requis' };

  // Pièces facultatives — mais si elles sont fournies, elles sont saines.
  let verdicts: VerdictEchantillon[] = [];
  if (params.verdicts !== undefined) {
    const nets = sanitiserVerdicts(params.verdicts);
    if (!nets) return { ok: false, raison: 'payload_invalide' };
    verdicts = nets;
  }
  let questionnaire: { questions: QuestionRestitution[] } | null = null;
  if (params.questionnaire !== undefined) {
    questionnaire = sanitiserQuestionnaire(params.questionnaire);
    if (!questionnaire) return { ok: false, raison: 'payload_invalide' };
  }

  const tirage = await chargerTirageOuvert(tirageId, sourceId);
  if (tirage === 'tirage_introuvable' || tirage === 'tirage_deja_conclu') {
    return { ok: false, raison: tirage };
  }

  try {
    await prisma.$executeRaw`
      INSERT INTO public.rag_corpus_claim_decisions
        (type_acte, motif, validateur, source_id, tirage_id, echantillon, questionnaire)
      VALUES
        ('bascule_individuelle', ${motif}, ${validateur}, ${sourceId}, ${tirageId},
         ${JSON.stringify({ tirageId, tires: tirage.tires, eligibles: tirage.eligibles, verdicts })}::jsonb,
         ${questionnaire ? JSON.stringify(questionnaire) : null}::jsonb)
    `;
  } catch (error) {
    if (estViolationIssueUnique(error)) {
      return { ok: false, raison: 'tirage_deja_conclu' };
    }
    throw error;
  }

  return { ok: true };
}
