// BANC DE L'ÉTIQUETAGE EN LOT CONTRE POSTGRESQL ([[D-325]]).
//
// POURQUOI CE FICHIER EXISTE. `etiqueterClaimsLot` écrit en SQL brut — un
// tableau `::text[]`, `jsonb_to_recordset`, un UPDATE ensembliste et un
// INSERT … SELECT au journal, sous `FOR UPDATE`. Les bancs Vitest de
// `revue.ts` ne jouent que des mocks : ils ne prouvent pas que la base
// ACCEPTE ce que l'écrivain écrit, ni que le verrou sérialise deux envois.
// La contre-revue du lot avait rejoué ce SQL à la main ; ce banc le rejoue à
// chaque CI, avec le VRAI écrivain (client Prisma et adaptateur `pg` de
// production) :
//   0. contre-épreuve : un acte `etiquetage` de deux claims est refusé — le
//      CHECK du journal est armé, le vert des gestes ci-dessous n'est pas un
//      vide ;
//   1. étiqueter deux claims validés : clés posées, statut et signature
//      intacts, un acte par claim, de la forme exigée par le CHECK ;
//   2. renvoyer la même liste : rien n'est réécrit ni journalisé
//      (`inchanges`, D-325 §3) ;
//   3. une liste dont une ligne change : seule elle est écrite et journalisée ;
//   4. un claim non validé ou introuvable dans la liste : refus nommé, rien
//      d'écrit pour les autres (tout ou rien, §2) ;
//   5. deux envois concurrents de la même liste : le second attend le verrou
//      du premier, puis ne réécrit rien — un seul acte au journal.
//
// ÉCRIT EN BASE ET COMMET : base NOMMÉE (`WN_ETIQUETAGE_LOT_BANC_BASE`) et
// LOCALE. Les claims de banc, leurs liens et leur passage sont effacés à la
// fin ; le journal est en ajout seul, ses actes de banc RESTENT (base jetable de T3 et du CI). Lancé par
// `node prisma/runWithAlias.js scripts/banc-etiquetage-lot-prisma.test.ts`
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
if (process.env.WN_ETIQUETAGE_LOT_BANC_BASE !== cible.pathname.slice(1)) {
  throw new Error(`REFUS : DATABASE_URL vise « ${cible.pathname.slice(1)} », WN_ETIQUETAGE_LOT_BANC_BASE ne l'annonce pas.`);
}

const RUN = randomBytes(4).toString('hex');
const PRATICIEN = 'praticien@wellneuro.fr';
// Un numéro de source hors du corpus réel (0001 à 0518 aujourd'hui), propre au run.
const NUMERO = String(9000 + (parseInt(RUN.slice(0, 4), 16) % 1000));
const SOURCE = `WN-SRC-${NUMERO}`;
const claimId = (n: number) => `WN-CL-${NUMERO}-${String(n).padStart(3, '0')}`;
const idLigne = (n: number) => `__banc_etq_${RUN}_${n}__`;

type Etat = { statut: string; besoins: unknown; rubrique: unknown; validateur: string | null; valide_at: Date | null };

async function etat(c: pg.Client, n: number): Promise<Etat> {
  const { rows } = await c.query<Etat>(
    `SELECT statut, metadata->'besoins' AS besoins, metadata->>'rubrique' AS rubrique, validateur, valide_at
       FROM public.rag_corpus_claims WHERE id = $1`,
    [idLigne(n)],
  );
  assert.equal(rows.length, 1, `claim de banc ${n} introuvable`);
  return rows[0];
}

async function actes(c: pg.Client): Promise<Array<{ source_id: string; validateur: string; element: Record<string, unknown> }>> {
  const { rows } = await c.query(
    `SELECT source_id, validateur, claims->0 AS element
       FROM public.rag_corpus_claim_decisions
      WHERE type_acte = 'etiquetage' AND claims->0->>'id' LIKE $1
      ORDER BY id`,
    [`__banc_etq_${RUN}_%`],
  );
  return rows;
}

/** Attend qu'une requête soit bloquée sur un verrou (session d'observation
 *  hors transaction : `pg_stat_activity` y est fraîche). */
async function attendreBlocage(c: pg.Client) {
  const limite = Date.now() + 10_000;
  while (Date.now() < limite) {
    const { rows } = await c.query(
      `SELECT count(*)::int AS n FROM pg_stat_activity
        WHERE datname = current_database() AND wait_event_type = 'Lock' AND query ILIKE '%FOR UPDATE%'`,
    );
    if (rows[0].n >= 1) return;
    await new Promise(r => setTimeout(r, 25));
  }
  assert.fail('un envoi devait attendre le verrou des claims : la course n’a pas eu lieu.');
}

const CHUNK = `WN-CH-${NUMERO}-001`;
const ID_CHUNK = `__banc_etq_${RUN}_chunk__`;

async function poserFixtures(c: pg.Client) {
  const vecteur = `[${Array(1536).fill('0').join(',')}]`;
  // Le vrai geste de signature exige un passage source cité (`sources_absentes`).
  await c.query(
    `INSERT INTO public.rag_corpus_chunks
       (id, batch_id, source_id, chunk_id, version_source, version_chunk,
        notebook, section, content, content_sha256,
        embedding_model, embedding_dimensions, embedding, indexation_autorisee)
     VALUES ($1, 'LOT_997_2026-10-19', $2, $3, 'v1.0', 'v1.0', '99', 'banc',
             'Verbatim de banc — étiquetage en lot.', repeat('0', 64), 'banc', 1536, $4::extensions.vector, true)`,
    [ID_CHUNK, SOURCE, CHUNK, vecteur],
  );
  for (const n of [1, 2, 3, 4]) {
    await c.query(
      `INSERT INTO public.rag_corpus_claims
         (id, claim_id, source_id, version_claim, texte_normalise, content_sha256,
          typologie_lecture, prescriptif, statut, embedding_model, embedding_dimensions, embedding)
       VALUES ($1, $2, $3, 'v1.0', $4, $5, 'déclaré', false, 'EN_ATTENTE_VALIDATION', 'banc', 1536, $6::extensions.vector)`,
      [idLigne(n), claimId(n), SOURCE, `claim de banc ${n}, non prescriptif`, randomBytes(32).toString('hex'), vecteur],
    );
    await c.query(
      `INSERT INTO public.rag_corpus_claim_sources (claim_pk, chunk_id, version_chunk) VALUES ($1, $2, 'v1.0')`,
      [idLigne(n), CHUNK],
    );
  }
}

async function main() {
  const { deciderClaim, etiqueterClaimsLot } = await import('@/lib/rag/claims/revue');
  const { prisma } = await import('@/lib/prisma');
  const c = new pg.Client({ connectionString: URL_BASE });
  const verrou = new pg.Client({ connectionString: URL_BASE });
  await c.connect();
  await verrou.connect();
  try {
    // 0. Contre-épreuve : le CHECK du journal refuse un acte de deux claims.
    const element = { id: idLigne(1), claimId: claimId(1), versionClaim: 'v1.0', besoins: [2], rubrique: 'options' };
    await assert.rejects(
      c.query(
        `INSERT INTO public.rag_corpus_claim_decisions (type_acte, validateur, source_id, claims)
         VALUES ('etiquetage', $1, $2, $3::jsonb)`,
        [PRATICIEN, SOURCE, JSON.stringify([element, element])],
      ),
      (err: { code?: string }) => err.code === '23514',
    );
    console.log('ok 0 — contre-épreuve : un acte d’étiquetage de deux claims est refusé par la base');

    // Claims 1 à 3 signés par le vrai geste ; le 4 reste en attente.
    await poserFixtures(c);
    for (const n of [1, 2, 3]) {
      const r = await deciderClaim({ id: idLigne(n), decision: 'VALIDE', statutAttendu: 'EN_ATTENTE_VALIDATION', validateur: PRATICIEN });
      assert.ok(r.ok, `signature du claim de banc ${n} : ${JSON.stringify(r)}`);
    }
    const signature1 = await etat(c, 1);

    // 1. Étiqueter deux claims.
    const r1 = await etiqueterClaimsLot({
      lignes: [
        { claimId: claimId(1), besoins: [2], rubrique: 'options' },
        { claimId: claimId(2), versionClaim: 'v1.0', besoins: [2, 4], rubrique: 'limites' },
      ],
      validateur: PRATICIEN,
    });
    assert.deepEqual(r1, { ok: true, n: 2, inchanges: 0 });
    const e1 = await etat(c, 1);
    assert.deepEqual([e1.statut, e1.besoins, e1.rubrique], ['VALIDE', [2], 'options']);
    assert.equal(e1.validateur, signature1.validateur);
    assert.equal(e1.valide_at?.getTime(), signature1.valide_at?.getTime(), 'la signature ne bouge pas');
    const e2 = await etat(c, 2);
    assert.deepEqual([e2.besoins, e2.rubrique], [[2, 4], 'limites']);
    const a1 = await actes(c);
    assert.equal(a1.length, 2);
    assert.ok(a1.every(a => a.source_id === SOURCE && a.validateur === PRATICIEN));
    assert.deepEqual(
      a1.map(a => [a.element.claimId, a.element.besoins, a.element.rubrique]),
      [[claimId(1), [2], 'options'], [claimId(2), [2, 4], 'limites']],
    );
    console.log('ok 1 — deux claims étiquetés : clés posées, signature intacte, un acte par claim');

    // 2. Renvoyer la même liste : rien d'écrit, rien de journalisé.
    const r2 = await etiqueterClaimsLot({
      lignes: [
        { claimId: claimId(1), besoins: [2], rubrique: 'options' },
        { claimId: claimId(2), besoins: [4, 2], rubrique: 'limites' },
      ],
      validateur: PRATICIEN,
    });
    assert.deepEqual(r2, { ok: true, n: 0, inchanges: 2 });
    assert.equal((await actes(c)).length, 2);
    console.log('ok 2 — la même liste renvoyée : aucun acte ajouté');

    // 3. Une seule ligne change : elle seule est écrite et journalisée.
    const r3 = await etiqueterClaimsLot({
      lignes: [
        { claimId: claimId(1), besoins: [2], rubrique: 'options' },
        { claimId: claimId(2), besoins: [2, 4], rubrique: 'precautions' },
      ],
      validateur: PRATICIEN,
    });
    assert.deepEqual(r3, { ok: true, n: 1, inchanges: 1 });
    assert.equal((await etat(c, 2)).rubrique, 'precautions');
    const a3 = await actes(c);
    assert.equal(a3.length, 3);
    assert.equal(a3[2].element.claimId, claimId(2));
    console.log('ok 3 — une ligne changée : elle seule est réécrite et journalisée');

    // 4. Un claim en attente et un introuvable : refus nommé, rien d'écrit.
    const r4 = await etiqueterClaimsLot({
      lignes: [
        { claimId: claimId(3), besoins: [2], rubrique: 'question' },
        { claimId: claimId(4), besoins: [2], rubrique: 'question' },
        { claimId: claimId(5), besoins: [2], rubrique: 'question' },
      ],
      validateur: PRATICIEN,
    });
    assert.deepEqual(r4, {
      ok: false,
      raison: 'claims_refuses',
      refus: [
        { claimId: claimId(4), raison: 'claim_non_valide' },
        { claimId: claimId(5), raison: 'claim_introuvable' },
      ],
    });
    assert.equal((await etat(c, 3)).rubrique, null, 'le claim valide de la liste refusée reste sans clé');
    assert.equal((await actes(c)).length, 3);
    console.log('ok 4 — liste refusée : chaque claim en cause nommé, rien d’écrit');

    // 5. Deux envois concurrents : le second attend, puis ne réécrit rien.
    await verrou.query('BEGIN');
    await verrou.query('SELECT id FROM public.rag_corpus_claims WHERE id = $1 FOR UPDATE', [idLigne(3)]);
    const liste = [{ claimId: claimId(3), besoins: [2], rubrique: 'question' as const }];
    const envois = [
      etiqueterClaimsLot({ lignes: liste, validateur: PRATICIEN }),
      etiqueterClaimsLot({ lignes: liste, validateur: PRATICIEN }),
    ];
    try {
      await attendreBlocage(c);
    } finally {
      await verrou.query('COMMIT');
    }
    const r5 = await Promise.all(envois);
    assert.deepEqual(
      r5.map(r => (r.ok ? [r.n, r.inchanges] : r.raison)).sort(),
      [[0, 1], [1, 0]],
    );
    const a5 = await actes(c);
    assert.equal(a5.filter(a => a.element.claimId === claimId(3)).length, 1, 'un seul acte pour deux envois');
    console.log('ok 5 — deux envois concurrents : le second attend le verrou, puis n’ajoute aucun acte');
  } finally {
    try {
      await verrou.query('ROLLBACK').catch(() => {});
      await c.query('DELETE FROM public.rag_corpus_claim_sources WHERE claim_pk LIKE $1', [`__banc_etq_${RUN}_%`]);
      await c.query('DELETE FROM public.rag_corpus_claims WHERE id LIKE $1', [`__banc_etq_${RUN}_%`]);
      await c.query('DELETE FROM public.rag_corpus_chunks WHERE id = $1', [ID_CHUNK]);
    } finally {
      await c.end();
      await verrou.end();
      await prisma.$disconnect();
    }
  }
}

main().catch(err => {
  console.error('ÉCHEC du banc de l’étiquetage en lot :', err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
