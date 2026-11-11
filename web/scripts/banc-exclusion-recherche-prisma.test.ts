// BANC DE L'EXCLUSION DE LA RECHERCHE CONTRE POSTGRESQL ([[D-490]]).
//
// POURQUOI CE FICHIER EXISTE. `exclureDeLaRecherche` et
// `exclureDeLaRechercheLot` écrivent en SQL brut — `FOR UPDATE`, un UPDATE de
// la colonne `exclu_recherche` et un INSERT au journal dont le CHECK de forme
// (`rag_claim_decisions_exclusion_recherche_complete`) est exigeant. Les bancs
// Vitest de `revue.ts` ne jouent que des mocks : ils ne prouvent pas que la
// base ACCEPTE ce que l'écrivain écrit, ni que la marque produit l'effet promis
// sur les deux chemins qu'elle sépare. Ce banc le rejoue avec le VRAI écrivain
// (client Prisma et adaptateur `pg` de production) :
//   0. contre-épreuve : un acte `exclusion_recherche` de deux claims, puis un
//      acte au motif d'espaces insécables, sont refusés — le CHECK est armé ;
//   1. le geste individuel exclut un claim validé : marque posée, statut et
//      signature intacts, un acte de la forme exigée, motif compris ;
//   2. le geste en lot exclut un second claim et ne rejournalise pas le
//      premier (`inchanges`) ;
//   3. une liste qui contient un claim en attente : refus nommé, rien
//      d'écrit pour les autres (tout ou rien) ;
//   4. LA SÉPARATION (D-490 §2) : les claims exclus ne remontent plus par
//      `servirRayonCorpus` — le vrai chemin des rayons, jusqu'à
//      `match_wellneuro_rag_claims` —, leur jumeau non exclu remonte, et
//      `claimsValidesAuCorpus` les tient toujours pour valides ;
//   5. rétablir fait revenir le claim dans la recherche.
//
// Deux substitutions, et elles seules : l'appel d'embeddings (`fetch`) rend un
// vecteur fixe, et la configuration RAG est factice — l'adresse d'OpenAI est
// remplacée par une adresse invalide, aucune clé réelle n'est lue ni envoyée.
// La source est prise au registre, dans le notebook du rayon micronutrition et
// hors quarantaine : le filtre par notebook est celui de la production.
//
// ÉCRIT EN BASE ET COMMET : base NOMMÉE (`WN_EXCLUSION_RECHERCHE_BANC_BASE`)
// et LOCALE. Les claims de banc, leurs liens et leur passage sont effacés à la
// fin ; le journal est en ajout seul, ses actes de banc RESTENT (base jetable
// de T3 et du CI). Lancé par
// `node prisma/runWithAlias.js scripts/banc-exclusion-recherche-prisma.test.ts`
// (alias `@/`), après les contrats SQL, en CI comme en T3.

import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import pg from 'pg';

const URL_BASE = process.env.DATABASE_URL;
if (!URL_BASE) throw new Error('DATABASE_URL est requise.');
const cible = new URL(URL_BASE);
if (cible.hostname !== '127.0.0.1' && cible.hostname !== 'localhost') {
  throw new Error(`REFUS : DATABASE_URL vise l'hôte « ${cible.hostname} », le banc n'écrit que sur une base locale.`);
}
if (process.env.WN_EXCLUSION_RECHERCHE_BANC_BASE !== cible.pathname.slice(1)) {
  throw new Error(`REFUS : DATABASE_URL vise « ${cible.pathname.slice(1)} », WN_EXCLUSION_RECHERCHE_BANC_BASE ne l'annonce pas.`);
}

// Configuration RAG FACTICE, posée avant tout import de `@/lib/rag` : aucune
// clé réelle (celle de `.env.local`, si elle existe, est écrasée), et une
// adresse qui ne mène nulle part si la substitution de `fetch` manquait.
const FAUSSE_CONFIG = {
  RAG_PGVECTOR_ENABLED: 'true',
  RAG_INTERNAL_SECRET: 'banc'.repeat(8),
  OPENAI_API_KEY: 'banc',
  OPENAI_BASE_URL: 'http://banc.invalid',
  RAG_EMBEDDING_DIMENSIONS: '1536',
};
Object.assign(process.env, FAUSSE_CONFIG);

const DIMENSIONS = 1536;
const VECTEUR = Array.from({ length: DIMENSIONS }, (_, i) => (i === 0 ? 1 : 0));
const LITTERAL = `[${VECTEUR.join(',')}]`;
const fetchReel = globalThis.fetch;
let appelsEmbeddings = 0;
globalThis.fetch = (async (url: string | URL | Request) => {
  const adresse = typeof url === 'string' ? url : url instanceof URL ? url.href : url.url;
  if (adresse !== 'http://banc.invalid/embeddings') {
    throw new Error(`REFUS : appel réseau inattendu vers « ${adresse} ».`);
  }
  appelsEmbeddings += 1;
  return new Response(JSON.stringify({ data: [{ index: 0, embedding: VECTEUR }] }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}) as typeof fetch;

const RUN = randomBytes(4).toString('hex');
const PRATICIEN = 'praticien@wellneuro.fr';
const idLigne = (n: number) => `__banc_exr_${RUN}_${n}__`;
const ID_CHUNK = `__banc_exr_${RUN}_chunk__`;

type Etat = { statut: string; exclu_recherche: boolean; validateur: string | null; valide_at: Date | null };

async function etat(c: pg.Client, n: number): Promise<Etat> {
  const { rows } = await c.query<Etat>(
    `SELECT statut, exclu_recherche, validateur, valide_at FROM public.rag_corpus_claims WHERE id = $1`,
    [idLigne(n)],
  );
  assert.equal(rows.length, 1, `claim de banc ${n} introuvable`);
  return rows[0];
}

async function actes(
  c: pg.Client,
): Promise<Array<{ source_id: string; validateur: string; motif: string; element: Record<string, unknown> }>> {
  const { rows } = await c.query(
    `SELECT source_id, validateur, motif, claims->0 AS element
       FROM public.rag_corpus_claim_decisions
      WHERE type_acte = 'exclusion_recherche' AND claims->0->>'id' LIKE $1
      ORDER BY id`,
    [`__banc_exr_${RUN}_%`],
  );
  return rows;
}

async function main() {
  const { deciderClaim, exclureDeLaRecherche, exclureDeLaRechercheLot } = await import('@/lib/rag/claims/revue');
  const { claimsValidesAuCorpus } = await import('@/lib/rag/claims/validite');
  const { servirRayonCorpus, RAYON_MICRONUTRITION, RAYON_VERS_NOTEBOOK } = await import(
    '@/lib/supplement-library/rayonCorpus'
  );
  const { sourcesDuNotebook, sansSourcesEnQuarantaine } = await import('@/lib/rag/claims/notebooks');
  const { prisma } = await import('@/lib/prisma');

  // Une source réelle du rayon : sans elle, le rayon ne demanderait rien à la
  // base et le vide du point 4 ne prouverait rien.
  const SOURCE = sansSourcesEnQuarantaine(sourcesDuNotebook(RAYON_VERS_NOTEBOOK[RAYON_MICRONUTRITION]))[0];
  assert.ok(SOURCE, 'le notebook du rayon micronutrition n’a aucune source hors quarantaine au registre');
  const NUMERO = SOURCE.slice('WN-SRC-'.length);
  // Des numéros de claim et de passage hors des lots rédigés, propres au run.
  const BASE = 900 + (parseInt(RUN.slice(0, 2), 16) % 90);
  const claimId = (n: number) => `WN-CL-${NUMERO}-${String(BASE + n).padStart(3, '0')}`;
  const CHUNK = `WN-CH-${NUMERO}-${String(BASE).padStart(3, '0')}`;

  const c = new pg.Client({ connectionString: URL_BASE });
  await c.connect();
  try {
    const { rows: deja } = await c.query(
      `SELECT count(*)::int AS n FROM public.rag_corpus_claims WHERE claim_id = ANY($1::text[])`,
      [[1, 2, 3, 4].map(claimId)],
    );
    assert.equal(deja[0].n, 0, 'des claims de ces numéros existent déjà dans cette base : banc refusé');

    // 0. Contre-épreuves : le CHECK de forme est armé.
    const element = { id: idLigne(1), claimId: claimId(1), versionClaim: 'v1.0', sens: 'exclure' };
    await assert.rejects(
      c.query(
        `INSERT INTO public.rag_corpus_claim_decisions (type_acte, motif, validateur, source_id, claims)
         VALUES ('exclusion_recherche', 'motif', $1, $2, $3::jsonb)`,
        [PRATICIEN, SOURCE, JSON.stringify([element, element])],
      ),
      (err: { code?: string }) => err.code === '23514',
    );
    await assert.rejects(
      c.query(
        `INSERT INTO public.rag_corpus_claim_decisions (type_acte, motif, validateur, source_id, claims)
         VALUES ('exclusion_recherche', E'\\u00A0\\u202F', $1, $2, $3::jsonb)`,
        [PRATICIEN, SOURCE, JSON.stringify([element])],
      ),
      (err: { code?: string }) => err.code === '23514',
    );
    console.log('ok 0 — contre-épreuve : un acte de deux claims, puis un motif de blancs, sont refusés par la base');

    // Fixtures : un passage source, quatre claims au même vecteur que la
    // requête ; 1 à 3 signés par le vrai geste, le 4 reste en attente.
    await c.query(
      `INSERT INTO public.rag_corpus_chunks
         (id, batch_id, source_id, chunk_id, version_source, version_chunk,
          notebook, section, content, content_sha256,
          embedding_model, embedding_dimensions, embedding, indexation_autorisee)
       VALUES ($1, 'LOT_996_2026-11-11', $2, $3, 'v1.0', 'v1.0', '99', 'banc',
               'Verbatim de banc — exclusion de la recherche.', repeat('0', 64), 'banc', 1536, $4::extensions.vector, true)`,
      [ID_CHUNK, SOURCE, CHUNK, LITTERAL],
    );
    for (const n of [1, 2, 3, 4]) {
      await c.query(
        `INSERT INTO public.rag_corpus_claims
           (id, claim_id, source_id, version_claim, texte_normalise, content_sha256,
            typologie_lecture, prescriptif, statut, embedding_model, embedding_dimensions, embedding)
         VALUES ($1, $2, $3, 'v1.0', $4, $5, 'déclaré', false, 'EN_ATTENTE_VALIDATION', 'banc', 1536, $6::extensions.vector)`,
        [idLigne(n), claimId(n), SOURCE, `claim de banc ${n}`, randomBytes(32).toString('hex'), LITTERAL],
      );
      await c.query(
        `INSERT INTO public.rag_corpus_claim_sources (claim_pk, chunk_id, version_chunk) VALUES ($1, $2, 'v1.0')`,
        [idLigne(n), CHUNK],
      );
    }
    for (const n of [1, 2, 3]) {
      const r = await deciderClaim({ id: idLigne(n), decision: 'VALIDE', statutAttendu: 'EN_ATTENTE_VALIDATION', validateur: PRATICIEN });
      assert.ok(r.ok, `signature du claim de banc ${n} : ${JSON.stringify(r)}`);
    }
    const signature1 = await etat(c, 1);

    const servis = async () => {
      const resultat = await servirRayonCorpus({ rayon: RAYON_MICRONUTRITION, requete: 'banc', matchCount: 50, minSimilarity: 0.99 });
      assert.equal(resultat.disponible, true, `rayon indisponible : ${JSON.stringify(resultat)}`);
      return new Set(resultat.claims.map((claim) => claim.claimId));
    };
    const avant = await servis();
    assert.ok([1, 2, 3].every((n) => avant.has(claimId(n))), 'avant tout acte, les trois claims validés remontent');
    assert.ok(!avant.has(claimId(4)), 'un claim en attente ne remonte jamais');

    // 1. Le geste individuel.
    const r1 = await exclureDeLaRecherche({ id: idLigne(1), sens: 'exclure', motif: 'dossier de banc, hors parcours', validateur: PRATICIEN });
    assert.deepEqual(r1, { ok: true, claim: { id: idLigne(1), excluRecherche: true }, inchange: false });
    const e1 = await etat(c, 1);
    assert.deepEqual([e1.statut, e1.exclu_recherche, e1.validateur], ['VALIDE', true, signature1.validateur]);
    assert.equal(e1.valide_at?.getTime(), signature1.valide_at?.getTime(), 'la signature ne bouge pas');
    const a1 = await actes(c);
    assert.equal(a1.length, 1);
    assert.deepEqual(
      [a1[0].source_id, a1[0].validateur, a1[0].motif, a1[0].element],
      [SOURCE, PRATICIEN, 'dossier de banc, hors parcours', { id: idLigne(1), claimId: claimId(1), versionClaim: 'v1.0', sens: 'exclure' }],
    );
    console.log('ok 1 — geste individuel : marque posée, signature intacte, un acte de la forme exigée');

    // 2. Le geste en lot : le 2 est exclu, le 1 l'était déjà.
    const r2 = await exclureDeLaRechercheLot({
      sens: 'exclure',
      validateur: PRATICIEN,
      lignes: [
        { claimId: claimId(1), motif: 'dossier de banc' },
        { claimId: claimId(2), versionClaim: 'v1.0', motif: 'dossier de banc, rang 2' },
      ],
    });
    assert.deepEqual(r2, { ok: true, n: 1, inchanges: 1 });
    assert.equal((await etat(c, 2)).exclu_recherche, true);
    const a2 = await actes(c);
    assert.equal(a2.length, 2, 'le claim déjà exclu n’est pas rejournalisé');
    assert.deepEqual([a2[1].element.claimId, a2[1].motif], [claimId(2), 'dossier de banc, rang 2']);
    console.log('ok 2 — geste en lot : un acte par claim écrit, aucun pour le claim déjà exclu');

    // 3. Tout ou rien : un claim en attente dans la liste, rien n'est écrit.
    const r3 = await exclureDeLaRechercheLot({
      sens: 'exclure',
      validateur: PRATICIEN,
      lignes: [
        { claimId: claimId(3), motif: 'dossier de banc' },
        { claimId: claimId(4), motif: 'dossier de banc' },
      ],
    });
    assert.deepEqual(r3, { ok: false, raison: 'claims_refuses', refus: [{ claimId: claimId(4), raison: 'claim_non_valide' }] });
    assert.equal((await etat(c, 3)).exclu_recherche, false, 'le claim valide de la liste refusée n’est pas exclu');
    assert.equal((await actes(c)).length, 2);
    console.log('ok 3 — liste refusée : le claim en cause nommé, rien d’écrit');

    // 4. La séparation : hors de la recherche, toujours valide.
    const apres = await servis();
    assert.ok(!apres.has(claimId(1)) && !apres.has(claimId(2)), 'un claim exclu ne remonte plus par les rayons');
    assert.ok(apres.has(claimId(3)), 'son jumeau non exclu remonte (contrôle positif)');
    const valides = await claimsValidesAuCorpus([1, 2].map((n) => ({ claimId: claimId(n), versionClaim: 'v1.0' })));
    assert.equal(valides.size, 2, 'un claim exclu reste valide pour ce qui le cite');
    assert.ok(appelsEmbeddings >= 2, 'la recherche est bien passée par le calcul d’embeddings substitué');
    console.log('ok 4 — exclu : absent de servirRayonCorpus, présent pour claimsValidesAuCorpus ; le jumeau remonte');

    // 5. Rétablir fait revenir le claim.
    const r5 = await exclureDeLaRecherche({ id: idLigne(1), sens: 'retablir', motif: 'relecture de banc', validateur: PRATICIEN });
    assert.deepEqual(r5, { ok: true, claim: { id: idLigne(1), excluRecherche: false }, inchange: false });
    const retour = await servis();
    assert.ok(retour.has(claimId(1)) && !retour.has(claimId(2)), 'le claim rétabli remonte, l’autre reste exclu');
    const a5 = await actes(c);
    assert.deepEqual([a5.length, a5[2].element.sens], [3, 'retablir']);
    console.log('ok 5 — rétabli : le claim remonte de nouveau, l’acte porte le sens « retablir »');
  } finally {
    try {
      await c.query('DELETE FROM public.rag_corpus_claim_sources WHERE claim_pk LIKE $1', [`__banc_exr_${RUN}_%`]);
      await c.query('DELETE FROM public.rag_corpus_claims WHERE id LIKE $1', [`__banc_exr_${RUN}_%`]);
      await c.query('DELETE FROM public.rag_corpus_chunks WHERE id = $1', [ID_CHUNK]);
    } finally {
      await c.end();
      await prisma.$disconnect();
      globalThis.fetch = fetchReel;
    }
  }
}

main().catch((err) => {
  console.error('ÉCHEC du banc de l’exclusion de la recherche :', err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
