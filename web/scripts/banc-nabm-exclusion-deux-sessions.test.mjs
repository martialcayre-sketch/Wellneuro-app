// BANC À DEUX SESSIONS — l'exclusion signature ↔ constat « aucun acte » NABM
// (M-3c, F54, migration `20261016100000_nabm_journal_constats_v1`).
//
// POURQUOI CE FICHIER EXISTE. L'exclusion se lit dans l'AUTRE table : une
// signature regarde les constats, un constat regarde les signatures. Sans
// verrou, deux écritures concurrentes sur le même analyte passeraient toutes
// deux. Le contrat SQL (`prisma/checks/nabm_journal_constats_v1_negatif.sql`)
// joue une seule session : il prouve le refus, pas la SÉRIALISATION par le
// verrou consultatif de l'analyte (espace 292). La revue `wn-reviewer` du
// lot l'a demandé avant la release-db. Les courses :
//
//   1. UN CONSTAT EN VOL, PUIS UNE SIGNATURE du même analyte : la signature
//      ATTEND le constat, puis est refusée (« porte un constat ») ;
//   2. UNE SIGNATURE EN VOL, PUIS UN CONSTAT : le constat attend, puis est
//      refusé (« porte une correspondance signée »).
// Chaque course constate d'abord que la seconde session est BLOQUÉE sur un
// verrou (`pg_stat_activity`) : sans ce constat, une course « gagnée » ne
// prouverait rien — elle aurait pu se jouer en série.
//
// ÉCRIT EN BASE, ET COMMET : une course ne se joue pas dans une transaction
// annulée. La base visée doit donc être NOMMÉE : `WN_NABM_EXCLUSION_BANC_BASE`
// doit égaler le nom de la base de `DATABASE_URL`, sur un hôte local. Le
// constat et la signature commis sont retirés à la fin, journal compris ;
// les deux analytes de banc et leurs lignes de journal RESTENT (journal en
// ajout seul, clé RESTRICT vers l'analyte) — d'où une base jetable : celle
// de T3 et du CI, recréée à chaque passe. Les analytes de banc sont rendus
// inactifs à la fin, et portés en provenance `labo` : le contrat de données
// du catalogue compte exactement les analytes `saisie_praticien`, sans
// filtre sur `actif` (contre-revue du lot, N-2).
//
// LANCÉ PAR `node scripts/banc-nabm-exclusion-deux-sessions.test.mjs`, pas par
// `node --test` : T3 extrait les `node --test` de ci.yml et les joue AVANT
// d'avoir une base. Il a son propre pas, après les contrats SQL, en CI comme
// en T3.

import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import pg from 'pg';

const URL_BASE = process.env.DATABASE_URL;
if (!URL_BASE) throw new Error('DATABASE_URL est requise.');
const BASE_ATTENDUE = process.env.WN_NABM_EXCLUSION_BANC_BASE;
const BASE_REELLE = new URL(URL_BASE).pathname.slice(1);
// Hôte LOCAL seulement (garde-fou de T3) : le banc commet des écritures.
const HOTE = new URL(URL_BASE).hostname;
if (HOTE !== '127.0.0.1' && HOTE !== 'localhost') {
  throw new Error(`REFUS : DATABASE_URL vise l'hôte « ${HOTE} », le banc n'écrit que sur une base locale.`);
}
if (!BASE_ATTENDUE || BASE_ATTENDUE !== BASE_REELLE) {
  throw new Error(
    `REFUS : DATABASE_URL vise « ${BASE_REELLE} », WN_NABM_EXCLUSION_BANC_BASE annonce « ${BASE_ATTENDUE ?? ''} ».`,
  );
}

const RUN = randomBytes(4).toString('hex');
const PRATICIEN = 'praticien@wellneuro.fr';
const ANALYTE_1 = `BIO_BANC_NABM_${RUN.toUpperCase()}_1`;
const ANALYTE_2 = `BIO_BANC_NABM_${RUN.toUpperCase()}_2`;
const id = nom => `${nom}_${RUN}`;
const SOURCE = 'nabm_smt_ans';

/** Le millésime et l'acte de la course : ceux de la base s'ils existent, sinon des fixtures. */
let millesime;
let codeActe;
let pointeurDeBanc = false;

/** Une session : un client dédié, jamais un pool — l'ordre des instructions est le banc. */
async function session() {
  const client = new pg.Client({ connectionString: URL_BASE });
  await client.connect();
  const { rows } = await client.query('SELECT pg_backend_pid() AS pid');
  return { client, pid: rows[0].pid };
}

const journalConstat = analyte => ({
  text: `INSERT INTO biology_analyte_nabm_journal (id, analyte_code, acte, millesime, praticien_email)
         VALUES ($1, $2, 'constat_aucun_acte', $3, $4)`,
  values: [id(`j_k_${analyte}`), analyte, millesime, PRATICIEN],
});
const constat = analyte => ({
  text: `INSERT INTO biology_analyte_nabm_constats (id, analyte_code, millesime, verifie_par)
         VALUES ($1, $2, $3, $4)`,
  values: [id(`k_${analyte}`), analyte, millesime, PRATICIEN],
});
const journalSignature = analyte => ({
  text: `INSERT INTO biology_analyte_nabm_journal (id, analyte_code, acte, code_acte, nature, millesime, praticien_email)
         VALUES ($1, $2, 'signature', $3, 'isole', $4, $5)`,
  values: [id(`j_s_${analyte}`), analyte, codeActe, millesime, PRATICIEN],
});
const signature = analyte => ({
  text: `INSERT INTO biology_analyte_nabm (id, analyte_code, code_acte, nature, verifie_par, verifie_le)
         VALUES ($1, $2, $3, 'isole', $4, now())`,
  values: [id(`s_${analyte}`), analyte, codeActe, PRATICIEN],
});

/** Attend que la session `pid` soit bloquée sur un verrou — sinon la course n'en est pas une. */
async function attendreBloquee(observateur, pid) {
  const limite = Date.now() + 10_000;
  while (Date.now() < limite) {
    const { rows } = await observateur.query(`SELECT wait_event_type FROM pg_stat_activity WHERE pid = $1`, [pid]);
    if (rows[0]?.wait_event_type === 'Lock') return;
    await new Promise(r => setTimeout(r, 25));
  }
  assert.fail(`la session ${pid} n'a jamais attendu de verrou : la course s'est jouée en série.`);
}

/** Joue une écriture et son journal dans une transaction de B, en vol. */
async function enVol(client, ecriture, journal) {
  await client.query('BEGIN');
  await client.query(journal);
  return client.query(ecriture).then(
    async () => {
      await client.query('ROLLBACK');
      return null;
    },
    async err => {
      await client.query('ROLLBACK');
      return err;
    },
  );
}

let observateur;

before(async () => {
  ({ client: observateur } = await session());
  const { rows } = await observateur.query(
    `SELECT v.version_source, (
       SELECT a.code_acte FROM biology_nabm_actes a
       WHERE a.version_source = v.version_source AND NOT a.inactif ORDER BY a.code_acte LIMIT 1
     ) AS code_acte
     FROM biology_catalog_versions_courantes v WHERE v.source_provenance = $1`,
    [SOURCE],
  );
  try {
    await observateur.query('BEGIN');
    if (rows[0]?.code_acte) {
      millesime = rows[0].version_source;
      codeActe = rows[0].code_acte;
    } else {
      assert.equal(rows.length, 0, 'un millésime courant sans acte actif : le banc ne peut pas choisir son acte.');
      millesime = `BANC_${RUN}`;
      codeActe = '0001';
      pointeurDeBanc = true;
      await observateur.query(
        `INSERT INTO biology_catalog_versions_courantes (id, source_provenance, version_source, updated_at)
         VALUES ($1, $2, $3, now())`,
        [id('pointeur'), SOURCE, millesime],
      );
      await observateur.query(
        `INSERT INTO biology_nabm_actes (id, code_acte, version_source, libelle, updated_at)
         VALUES ($1, $2, $3, 'Acte de banc', now())`,
        [id('acte'), codeActe, millesime],
      );
    }
    for (const [nom, code] of [['a1', ANALYTE_1], ['a2', ANALYTE_2]]) {
      await observateur.query(
        `INSERT INTO biology_analytes (id, code, libelle, type_prelevement, source_provenance, niveau_completude, updated_at)
         VALUES ($1, $2, 'Analyte de banc', 'sang', 'labo', 'partielle', now())`,
        [id(nom), code],
      );
    }
    await observateur.query('COMMIT');
  } catch (err) {
    await observateur.query('ROLLBACK');
    throw err;
  }
});

after(async () => {
  try {
    await observateur.query('BEGIN');
    // Retirer ce que les courses ont commis, journal compris.
    await observateur.query(
      `INSERT INTO biology_analyte_nabm_journal (id, analyte_code, acte, millesime, praticien_email, efface_par, efface_le)
       SELECT $1 || k.analyte_code, k.analyte_code, 'retrait_constat', k.millesime, $2, k.verifie_par, k.verifie_le
       FROM biology_analyte_nabm_constats k WHERE k.analyte_code = ANY($3::text[])`,
      [`banc_rk_${RUN}_`, PRATICIEN, [ANALYTE_1, ANALYTE_2]],
    );
    await observateur.query('DELETE FROM biology_analyte_nabm_constats WHERE analyte_code = ANY($1::text[])', [
      [ANALYTE_1, ANALYTE_2],
    ]);
    await observateur.query(
      `INSERT INTO biology_analyte_nabm_journal (id, analyte_code, acte, code_acte, nature, praticien_email, efface_par, efface_le)
       SELECT $1 || c.analyte_code, c.analyte_code, 'retrait_signature', c.code_acte, c.nature, $2, c.verifie_par, c.verifie_le
       FROM biology_analyte_nabm c WHERE c.analyte_code = ANY($3::text[]) AND c.verifie_par IS NOT NULL`,
      [`banc_rs_${RUN}_`, PRATICIEN, [ANALYTE_1, ANALYTE_2]],
    );
    await observateur.query('DELETE FROM biology_analyte_nabm WHERE analyte_code = ANY($1::text[])', [
      [ANALYTE_1, ANALYTE_2],
    ]);
    await observateur.query('UPDATE biology_analytes SET actif = false WHERE code = ANY($1::text[])', [
      [ANALYTE_1, ANALYTE_2],
    ]);
    if (pointeurDeBanc) {
      await observateur.query('DELETE FROM biology_catalog_versions_courantes WHERE id = $1', [id('pointeur')]);
      await observateur.query('DELETE FROM biology_nabm_actes WHERE id = $1', [id('acte')]);
    }
    await observateur.query('COMMIT');
  } finally {
    await observateur.end();
  }
});

describe('Exclusion signature ↔ constat NABM — deux sessions (M-3c, F54)', () => {
  it('1. un constat en vol, puis une signature du même analyte : la signature attend, puis est refusée', async () => {
    const a = await session();
    const b = await session();
    try {
      await a.client.query('BEGIN');
      await a.client.query(constat(ANALYTE_1));
      await a.client.query(journalConstat(ANALYTE_1));
      const course = enVol(b.client, signature(ANALYTE_1), journalSignature(ANALYTE_1));
      await attendreBloquee(observateur, b.pid);
      await a.client.query('COMMIT');
      const refus = await course;
      assert.ok(refus, 'la signature est passée : un constat et une signature coexistent.');
      assert.match(refus.message, /porte un constat « aucun acte »/);
      const { rows } = await observateur.query(
        'SELECT count(*)::int AS n FROM biology_analyte_nabm WHERE analyte_code = $1 AND verifie_par IS NOT NULL',
        [ANALYTE_1],
      );
      assert.equal(rows[0].n, 0);
    } finally {
      await a.client.end();
      await b.client.end();
    }
  });

  it('2. une signature en vol, puis un constat du même analyte : le constat attend, puis est refusé', async () => {
    const a = await session();
    const b = await session();
    try {
      await a.client.query('BEGIN');
      await a.client.query(signature(ANALYTE_2));
      await a.client.query(journalSignature(ANALYTE_2));
      const course = enVol(b.client, constat(ANALYTE_2), journalConstat(ANALYTE_2));
      await attendreBloquee(observateur, b.pid);
      await a.client.query('COMMIT');
      const refus = await course;
      assert.ok(refus, 'le constat est passé : une signature et un constat coexistent.');
      assert.match(refus.message, /porte une correspondance signée/);
      const { rows } = await observateur.query(
        'SELECT count(*)::int AS n FROM biology_analyte_nabm_constats WHERE analyte_code = $1',
        [ANALYTE_2],
      );
      assert.equal(rows[0].n, 0);
    } finally {
      await a.client.end();
      await b.client.end();
    }
  });
});
