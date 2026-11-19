// BANC DE LA MIGRATION 20261119170000_rag_retire_recherche_doublon_wn_src_0546_v1
// ([[D-490]], question 20261119-1311-b).
//
// POURQUOI CE FICHIER EXISTE. La migration retire de la recherche les claims et
// les passages de WN-SRC-0546, doublon de WN-SRC-0564. Sur la base vide du CI
// elle ne touche aucune ligne : seule elle-même, rejouée sur des lignes de
// même numéro, prouve ce qu'elle fait. Ce banc lit le fichier SQL de la
// migration, le joue DANS UNE TRANSACTION QU'IL ANNULE, sur des fixtures qui
// portent les deux vrais identifiants de source, et vérifie :
//   1. les claims VALIDE de 0546 sont exclus de la recherche, leur statut,
//      leur signataire et leur date de signature intacts ; un claim EN ATTENTE
//      de 0546 n'est pas touché ;
//   2. chacun a son acte `exclusion_recherche` au journal (un claim, sens
//      `exclure`, motif), au nom de son signataire ;
//   3. les passages de 0546 sont inactifs, aucune ligne supprimée ; WN-SRC-0564
//      (claims et passages) n'est pas touché ;
//   4. `match_wellneuro_rag_claims` ne rend plus que le claim de 0564 ;
//   5. rejouée, la migration n'ajoute aucun acte (idempotence) ;
//   6. garde : si 0564 n'a plus ni claim visible ni passage actif, la
//      migration REFUSE et rien n'est modifié.
// Tout est annulé à la fin : aucune ligne ne reste (le seul résidu possible est
// l'avancement d'une séquence d'identifiants). Base LOCALE exigée, et base
// vide de ces deux sources.
//
// Lancé par `node prisma/runWithAlias.js scripts/banc-retire-doublon-0546-prisma.test.ts`
// depuis web/, après `prisma migrate deploy`, en CI comme en T3.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const URL_BASE = process.env.DATABASE_URL;
if (!URL_BASE) throw new Error('DATABASE_URL est requise.');
const cible = new URL(URL_BASE);
if (cible.hostname !== '127.0.0.1' && cible.hostname !== 'localhost') {
  throw new Error(`REFUS : DATABASE_URL vise l'hôte « ${cible.hostname} », le banc n'écrit que sur une base locale.`);
}
if (process.env.WN_RETIRE_DOUBLON_0546_BANC_BASE !== cible.pathname.slice(1)) {
  throw new Error(
    `REFUS : DATABASE_URL vise « ${cible.pathname.slice(1)} », WN_RETIRE_DOUBLON_0546_BANC_BASE ne l'annonce pas.`,
  );
}

const MIGRATION = readFileSync(
  path.join(process.cwd(), 'prisma/migrations/20261119170000_rag_retire_recherche_doublon_wn_src_0546_v1/migration.sql'),
  'utf8',
);

const VECTEUR = `[1,${'0,'.repeat(1534)}0]`;
const PRATICIEN = 'praticien@wellneuro.fr';

async function main() {
  const c = new pg.Client({ connectionString: URL_BASE });
  await c.connect();
  try {
    const { rows: deja } = await c.query(
      `SELECT (SELECT count(*) FROM public.rag_corpus_claims WHERE source_id IN ('WN-SRC-0546','WN-SRC-0564'))::int
            + (SELECT count(*) FROM public.rag_corpus_chunks WHERE source_id IN ('WN-SRC-0546','WN-SRC-0564'))::int AS n`,
    );
    assert.equal(deja[0].n, 0, 'des lignes de WN-SRC-0546 ou 0564 existent dans cette base : banc refusé');

    await c.query('BEGIN');

    const chunk = (id: string, source: string, numero: string) =>
      c.query(
        `INSERT INTO public.rag_corpus_chunks
           (id, batch_id, source_id, chunk_id, version_source, version_chunk,
            notebook, section, content, content_sha256,
            embedding_model, embedding_dimensions, embedding, indexation_autorisee)
         VALUES ($1, 'LOT_997_2026-11-19', $2, $3, 'v1.0', 'v1.0', '99', 'banc',
                 'Verbatim de banc — doublon.', repeat('0', 64), 'banc', 1536, $4::extensions.vector, true)`,
        [id, source, numero, VECTEUR],
      );
    let sel = 0;
    const claim = async (id: string, claimId: string, source: string, statut: string, numero: string) => {
      sel += 1;
      const valide = statut === 'VALIDE';
      await c.query(
        `INSERT INTO public.rag_corpus_claims
           (id, claim_id, source_id, version_claim, texte_normalise, content_sha256,
            typologie_lecture, prescriptif, statut, validateur, valide_at,
            embedding_model, embedding_dimensions, embedding)
         VALUES ($1, $2, $3, 'v1.0', $4, repeat($5, 64), 'déclaré', false, $6, $7, $8,
                 'banc', 1536, $9::extensions.vector)`,
        [
          id,
          claimId,
          source,
          `claim de banc ${id}`,
          String(sel),
          statut,
          valide ? PRATICIEN : null,
          valide ? new Date('2026-10-21T20:59:51Z') : null,
          VECTEUR,
        ],
      );
      await c.query(
        `INSERT INTO public.rag_corpus_claim_sources (claim_pk, chunk_id, version_chunk) VALUES ($1, $2, 'v1.0')`,
        [id, numero],
      );
    };

    await chunk('__b0546_c1__', 'WN-SRC-0546', 'WN-CH-0546-001');
    await chunk('__b0546_c2__', 'WN-SRC-0546', 'WN-CH-0546-002');
    await chunk('__b0564_c1__', 'WN-SRC-0564', 'WN-CH-0564-001');
    await claim('__b0546_a__', 'WN-CL-0546-001', 'WN-SRC-0546', 'VALIDE', 'WN-CH-0546-001');
    await claim('__b0546_b__', 'WN-CL-0546-002', 'WN-SRC-0546', 'VALIDE', 'WN-CH-0546-002');
    await claim('__b0546_c__', 'WN-CL-0546-003', 'WN-SRC-0546', 'EN_ATTENTE_VALIDATION', 'WN-CH-0546-002');
    await claim('__b0564_a__', 'WN-CL-0564-001', 'WN-SRC-0564', 'VALIDE', 'WN-CH-0564-001');

    const requeteClaims = `SELECT claim_id FROM public.match_wellneuro_rag_claims($1::extensions.vector, 50, 0.1, ARRAY['WN-SRC-0546','WN-SRC-0564'], NULL) ORDER BY claim_id`;
    const rechercheAvant = await c.query(requeteClaims, [VECTEUR]);
    assert.deepEqual(
      rechercheAvant.rows.map((r: { claim_id: string }) => r.claim_id),
      ['WN-CL-0546-001', 'WN-CL-0546-002', 'WN-CL-0564-001'],
      'contrôle positif : avant la migration, les trois claims validés remontent',
    );

    // --- La migration, telle qu'écrite.
    await c.query(MIGRATION);
    console.log('ok 0 — la migration s’exécute sur des lignes réelles');

    // 1. Claims.
    const { rows: claims } = await c.query(
      `SELECT claim_id, statut, validateur, valide_at, exclu_recherche, active
         FROM public.rag_corpus_claims ORDER BY claim_id`,
    );
    const parId = new Map<string, Record<string, unknown>>(
      claims.map((r: Record<string, unknown>) => [r.claim_id as string, r]),
    );
    for (const id of ['WN-CL-0546-001', 'WN-CL-0546-002']) {
      const r = parId.get(id) as Record<string, unknown>;
      assert.equal(r.exclu_recherche, true, `${id} doit être exclu de la recherche`);
      assert.equal(r.statut, 'VALIDE', `${id} reste VALIDE`);
      assert.equal(r.validateur, PRATICIEN, `${id} garde son signataire`);
      assert.equal((r.valide_at as Date).toISOString(), '2026-10-21T20:59:51.000Z', `${id} garde sa date de signature`);
      assert.equal(r.active, true, `${id} reste actif (exclu, non supprimé)`);
    }
    const attente = parId.get('WN-CL-0546-003') as Record<string, unknown>;
    assert.equal(attente.exclu_recherche, false, 'le claim en attente de 0546 n’est pas touché');
    assert.equal(attente.statut, 'EN_ATTENTE_VALIDATION');
    const publie = parId.get('WN-CL-0564-001') as Record<string, unknown>;
    assert.equal(publie.exclu_recherche, false, 'le claim de 0564 n’est pas touché');
    console.log('ok 1 — claims VALIDE de 0546 exclus, statut, signataire et date intacts ; attente et 0564 intacts');

    // 2. Journal.
    const { rows: actes } = await c.query(
      `SELECT source_id, validateur, motif, claims FROM public.rag_corpus_claim_decisions
        WHERE type_acte = 'exclusion_recherche' AND source_id = 'WN-SRC-0546' ORDER BY id`,
    );
    assert.equal(actes.length, 2, 'un acte par claim exclu');
    assert.deepEqual(
      actes.map((a: { claims: Array<{ claimId: string }> }) => a.claims[0].claimId).sort(),
      ['WN-CL-0546-001', 'WN-CL-0546-002'],
    );
    for (const a of actes as Array<{ validateur: string; motif: string; claims: Array<Record<string, string>> }>) {
      assert.equal(a.validateur, PRATICIEN, 'acte au nom du signataire du claim');
      assert.ok(a.motif.includes('WN-SRC-0564') && a.motif.includes('20261119-1311-b'), 'motif : provenance nommée');
      assert.equal(a.claims.length, 1);
      assert.equal(a.claims[0].sens, 'exclure');
      assert.equal(a.claims[0].versionClaim, 'v1.0');
    }
    console.log('ok 2 — un acte exclusion_recherche par claim, sens exclure, motif, au nom du signataire');

    // 3. Passages.
    const { rows: passages } = await c.query(
      `SELECT chunk_id, active FROM public.rag_corpus_chunks ORDER BY chunk_id`,
    );
    assert.deepEqual(
      passages.map((p: { chunk_id: string; active: boolean }) => [p.chunk_id, p.active]),
      [
        ['WN-CH-0546-001', false],
        ['WN-CH-0546-002', false],
        ['WN-CH-0564-001', true],
      ],
      'passages de 0546 inactifs, aucun supprimé, 0564 actif',
    );
    const { rows: liens } = await c.query(`SELECT count(*)::int AS n FROM public.rag_corpus_claim_sources`);
    assert.equal(liens[0].n, 4, 'les liens claim-passage sont conservés');
    console.log('ok 3 — passages de 0546 inactifs, rien supprimé, liens conservés, 0564 intact');

    // 4. Recherche.
    const rechercheApres = await c.query(requeteClaims, [VECTEUR]);
    assert.deepEqual(
      rechercheApres.rows.map((r: { claim_id: string }) => r.claim_id),
      ['WN-CL-0564-001'],
      'seul le claim de la version publiée remonte',
    );
    const passagesRecherche = await c.query(
      `SELECT chunk_id FROM public.match_wellneuro_rag_chunks($1::extensions.vector, 50, 0.1) ORDER BY chunk_id`,
      [VECTEUR],
    );
    assert.ok(
      passagesRecherche.rows.every((r: { chunk_id: string }) => !r.chunk_id.startsWith('WN-CH-0546-')),
      'aucun passage de 0546 ne remonte',
    );
    assert.ok(
      passagesRecherche.rows.some((r: { chunk_id: string }) => r.chunk_id === 'WN-CH-0564-001'),
      'le passage de 0564 remonte toujours',
    );
    console.log('ok 4 — la recherche ne rend plus que la version publiée (claims et passages)');

    // 5. Idempotence.
    await c.query(MIGRATION);
    const { rows: apresRejeu } = await c.query(
      `SELECT count(*)::int AS n FROM public.rag_corpus_claim_decisions
        WHERE type_acte = 'exclusion_recherche' AND source_id = 'WN-SRC-0546'`,
    );
    assert.equal(apresRejeu[0].n, 2, 'rejouée, la migration n’ajoute aucun acte');
    console.log('ok 5 — rejouée, aucun nouvel acte');

    // 6. Garde : 0564 sans passage actif => refus, rien d'écrit. On remet 0546
    //    en état visible pour que la migration ait quelque chose à faire.
    await c.query(
      `UPDATE public.rag_corpus_claims SET exclu_recherche = false, updated_at = now() WHERE source_id = 'WN-SRC-0546'`,
    );
    await c.query(`UPDATE public.rag_corpus_chunks SET active = true WHERE source_id = 'WN-SRC-0546'`);
    await c.query(`UPDATE public.rag_corpus_chunks SET active = false WHERE source_id = 'WN-SRC-0564'`);
    await c.query('SAVEPOINT garde');
    await assert.rejects(
      c.query(MIGRATION),
      (err: { message?: string }) => /WN-SRC-0564 n'a pas de claim visible en recherche ou pas de passage visible/.test(err.message ?? ''),
      'la garde doit refuser quand la version publiée est introuvable en recherche',
    );
    await c.query('ROLLBACK TO SAVEPOINT garde');
    const { rows: intacts } = await c.query(
      `SELECT count(*) FILTER (WHERE exclu_recherche)::int AS exclus FROM public.rag_corpus_claims WHERE source_id = 'WN-SRC-0546'`,
    );
    assert.equal(intacts[0].exclus, 0, 'garde déclenchée : aucun claim de 0546 n’est exclu');
    console.log('ok 6 — garde : passage de 0564 inactif, le manuscrit n’est pas retiré');

    // 7. Garde, prédicat de visibilité complet : le passage de 0564 est actif,
    //    mais son seul claim n'est adossé à aucun passage — la recherche ne le
    //    rendrait pas (EXISTS du lien) : la garde doit refuser quand même.
    await c.query(`UPDATE public.rag_corpus_chunks SET active = true WHERE source_id = 'WN-SRC-0564'`);
    await c.query(`DELETE FROM public.rag_corpus_claim_sources WHERE claim_pk = '__b0564_a__'`);
    await c.query('SAVEPOINT garde2');
    await assert.rejects(
      c.query(MIGRATION),
      (err: { message?: string }) => /WN-SRC-0564 n'a pas de claim visible en recherche ou pas de passage visible/.test(err.message ?? ''),
      'la garde doit refuser quand le seul claim de 0564 ne serait pas rendu par la recherche',
    );
    await c.query('ROLLBACK TO SAVEPOINT garde2');
    console.log('ok 7 — garde : un claim de 0564 non adossé à un passage ne compte pas comme visible');
  } finally {
    await c.query('ROLLBACK').catch(() => undefined);
    await c.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
