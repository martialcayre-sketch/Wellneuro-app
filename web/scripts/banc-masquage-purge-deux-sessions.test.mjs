// BANC À DEUX SESSIONS — le masquage de l'identité contre la purge de son
// document ([[D-284]] §5, lot (j), migration `bio_ingest_masquage_identite_v1`).
//
// POURQUOI CE FICHIER EXISTE. Le contrat SQL
// (`prisma/checks/bio_ingest_masquage_identite_v1_negatif.sql`) joue une seule
// session : il éprouve la purge PUIS le masquage refusé, l'un après l'autre. Il
// ne prouve pas que le `FOR UPDATE` du trigger d'insertion SÉRIALISE les
// écritures. Sans lui, une purge validée pendant qu'un masquage est en vol ne
// verrait pas ses pages, et rien ne les purgerait plus (revue `wn-reviewer` du
// lot 1, P1) ; et une lecture demandée, ou un import ouvert, pendant qu'un
// masquage est en vol laisserait poser des pages sous une lecture déjà partie
// (revue Copilot de #1426 : un `FOR SHARE` ne gênait ni le `FOR SHARE` de
// l'import, ni le `FOR KEY SHARE` de la clé étrangère du travail). Les
// courses jouées ici, en READ COMMITTED :
//
//   1. PURGE D'ABORD : le masquage ATTEND la purge en vol, puis est refusé —
//      le document est purgé ;
//   2. MASQUAGE D'ABORD : la purge ATTEND le masquage en vol, puis passe — et
//      ses pages sont purgées avec elle ;
//   3. TÉMOIN de 1 : la purge en vol est ANNULÉE — le masquage attend, puis
//      passe, ses pages intactes ;
//   4. TÉMOIN de 2 : le masquage en vol est ANNULÉ — la purge attend, puis
//      passe, sans aucun masquage ;
//   5. LECTURE DEMANDÉE D'ABORD : le masquage ATTEND la demande en vol, puis
//      est refusé — aucun masquage pendant une lecture ;
//   6. IMPORT OUVERT D'ABORD : le masquage ATTEND l'import en vol, puis est
//      refusé ;
//   7. MASQUAGE D'ABORD : la demande ATTEND le masquage en vol, puis passe —
//      masquer, puis demander, est le parcours normal ;
//   8. TÉMOIN de 5 : la demande en vol est ANNULÉE — le masquage attend, puis
//      passe.
// Chaque course constate d'abord que la seconde session est BLOQUÉE sur un
// verrou (`pg_stat_activity`) : sans ce constat, une course « gagnée » ne
// prouverait rien. Et chacune finit sur l'état de la base : jamais une page
// masquée vivante sur un document purgé.
//
// ÉCRIT EN BASE, ET COMMET : la base visée doit être NOMMÉE —
// `WN_BIO_MASQUAGE_BANC_BASE` doit égaler le nom de la base de `DATABASE_URL`,
// sur un hôte local. Les fixtures (identité de fixture, suffixe propre au run)
// sont effacées à la fin, dans l'ordre de l'effacement nommé du dossier.
//
// LANCÉ PAR `node scripts/banc-masquage-purge-deux-sessions.test.mjs`, pas par
// `node --test` : T3 extrait les `node --test` de ci.yml et les joue AVANT
// d'avoir une base. Il a son propre pas, après les contrats SQL, en CI comme
// en T3.

import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import pg from 'pg';

const URL_BASE = process.env.DATABASE_URL;
if (!URL_BASE) throw new Error('DATABASE_URL est requise.');
const BASE_ATTENDUE = process.env.WN_BIO_MASQUAGE_BANC_BASE;
const BASE_REELLE = new URL(URL_BASE).pathname.slice(1);
// Hôte LOCAL seulement (garde-fou de T3) : le banc commet des écritures.
const HOTE = new URL(URL_BASE).hostname;
if (HOTE !== '127.0.0.1' && HOTE !== 'localhost') {
  throw new Error(`REFUS : DATABASE_URL vise l'hôte « ${HOTE} », le banc n'écrit que sur une base locale.`);
}
if (!BASE_ATTENDUE || BASE_ATTENDUE !== BASE_REELLE) {
  throw new Error(
    `REFUS : DATABASE_URL vise « ${BASE_REELLE} », WN_BIO_MASQUAGE_BANC_BASE annonce « ${BASE_ATTENDUE ?? ''} ».`,
  );
}

const RUN = randomBytes(4).toString('hex');
const PATIENT = `PAT_BANC_MSQ_${RUN}`;
const PRATICIEN = 'praticien@wellneuro.fr';
const id = nom => `${nom}_${RUN}`;

/** Une course par document, chacun transmis par le patient : l'écart le purge sans délai. */
const COURSES = [
  'purge_dabord', 'masquage_dabord', 'purge_annulee', 'masquage_annule',
  'demande_dabord', 'import_dabord', 'masquage_avant_demande', 'demande_annulee',
];

/** Une session : un client dédié, jamais un pool — l'ordre des instructions est le banc. */
async function session() {
  const client = new pg.Client({ connectionString: URL_BASE });
  await client.connect();
  const { rows } = await client.query('SELECT pg_backend_pid() AS pid');
  return { client, pid: rows[0].pid };
}

const purge = course => ({
  text: `UPDATE comptes_rendus_biologiques
         SET contenu = NULL, motif_purge = 'ecarte', ecarte_par = $1, motif_ecart = 'illisible'
         WHERE id = $2`,
  values: [PRATICIEN, id(`cr_${course}`)],
});

const masquage = course => ({
  text: `INSERT INTO masquages_comptes_rendus
           (id, id_patient, id_compte_rendu, pages, nombre_pages, zones_masquees, aucune_identite, pose_par)
         VALUES ($1, $2, $3, ARRAY['\\xffd8ff00000000'::bytea], 1, 1, false, $4)`,
  values: [id(`mq_${course}`), PATIENT, id(`cr_${course}`), PRATICIEN],
});

const demande = course => ({
  text: `INSERT INTO travaux_extraction_biologique (id, id_patient, id_compte_rendu, demande_par)
         VALUES ($1, $2, $3, $4)`,
  values: [id(`tr_${course}`), PATIENT, id(`cr_${course}`), PRATICIEN],
});

const ouvertureImport = course => ({
  text: `INSERT INTO imports_biologiques (id, id_patient, id_compte_rendu, modele, version_prompt, lance_par)
         VALUES ($1, $2, $3, 'modele-banc', 'bio-extraction-v5', $4)`,
  values: [id(`imp_${course}`), PATIENT, id(`cr_${course}`), PRATICIEN],
});

/** Attend que la session `pid` soit bloquée sur un verrou — sinon la course n'en est pas une. */
async function attendreBloquee(observateur, pid) {
  const limite = Date.now() + 10_000;
  while (Date.now() < limite) {
    const { rows } = await observateur.query(
      `SELECT wait_event_type FROM pg_stat_activity WHERE pid = $1`,
      [pid],
    );
    if (rows[0]?.wait_event_type === 'Lock') return;
    await new Promise(r => setTimeout(r, 25));
  }
  assert.fail(`la session ${pid} n'a jamais attendu de verrou : la course s'est jouée en série.`);
}

/** L'état d'une course, lu par la session d'observation (jamais par une session de la course). */
async function etat(observateur, course) {
  const { rows } = await observateur.query(
    `SELECT c.contenu IS NULL AS document_purge,
            (SELECT count(*)::int FROM masquages_comptes_rendus m WHERE m.id_compte_rendu = c.id) AS masquages,
            (SELECT count(*)::int FROM masquages_comptes_rendus m
              WHERE m.id_compte_rendu = c.id AND cardinality(m.pages) > 0) AS pages_vivantes
     FROM comptes_rendus_biologiques c
     WHERE c.id = $1`,
    [id(`cr_${course}`)],
  );
  return rows[0];
}

/** Masquages et lectures (travaux, imports) d'une course. */
async function lectures(observateur, course) {
  const { rows } = await observateur.query(
    `SELECT (SELECT count(*)::int FROM masquages_comptes_rendus WHERE id_compte_rendu = $1) AS masquages,
            (SELECT count(*)::int FROM travaux_extraction_biologique WHERE id_compte_rendu = $1) AS travaux,
            (SELECT count(*)::int FROM imports_biologiques WHERE id_compte_rendu = $1) AS imports`,
    [id(`cr_${course}`)],
  );
  return rows[0];
}

let observateur;

before(async () => {
  ({ client: observateur } = await session());
  try {
    await observateur.query('BEGIN');
    await observateur.query(
      `INSERT INTO patients (id, id_patient, email, prenom, nom, praticien_email, updated_at)
       VALUES ($1, $2, $3, 'Jennifer', 'Martin', $4, CURRENT_TIMESTAMP)`,
      [id('pat_banc_msq'), PATIENT, `jennifer.martin+banc-${RUN}@example.test`, PRATICIEN],
    );
    for (const course of COURSES) {
      await observateur.query(
        `INSERT INTO comptes_rendus_biologiques (id, id_patient, contenu, type_mime, empreinte_sha256, origine)
         VALUES ($1, $2, convert_to($3, 'UTF8'), 'application/pdf', encode(sha256(convert_to($3, 'UTF8')), 'hex'), 'patient')`,
        [id(`cr_${course}`), PATIENT, `banc ${RUN} ${course}`],
      );
    }
    await observateur.query('COMMIT');
  } catch (err) {
    // Une transaction avortée ferait échouer le nettoyage, et la connexion
    // restée ouverte retiendrait le processus : on annule, puis on remonte.
    await observateur.query('ROLLBACK');
    throw err;
  }
});

after(async () => {
  // L'ordre de l'effacement nommé du dossier (`patient/effacement.ts`), en
  // une transaction ; la connexion se ferme quoi qu'il arrive.
  const par = [PATIENT];
  try {
    await observateur.query('BEGIN');
    await observateur.query('DELETE FROM travaux_extraction_biologique WHERE id_patient = $1', par);
    await observateur.query('DELETE FROM imports_biologiques WHERE id_patient = $1', par);
    await observateur.query('DELETE FROM masquages_comptes_rendus WHERE id_patient = $1', par);
    await observateur.query('DELETE FROM comptes_rendus_biologiques WHERE id_patient = $1', par);
    await observateur.query('DELETE FROM patients WHERE id_patient = $1', par);
    await observateur.query('COMMIT');
  } finally {
    await observateur.end();
  }
});

/** A ouvre une transaction et pose son écriture ; B, en autocommit, joue l'autre et doit attendre A. */
async function course({ premiere, seconde, issueA }) {
  const a = await session();
  const b = await session();
  try {
    await a.client.query('BEGIN');
    await a.client.query(premiere);
    const enVol = b.client.query(seconde).then(() => null, err => err);
    await attendreBloquee(observateur, b.pid);
    await a.client.query(issueA);
    return await enVol;
  } finally {
    await a.client.end();
    await b.client.end();
  }
}

describe('Masquage contre purge du document — deux sessions (D-284 §5, lot j)', () => {
  it('1. purge d’abord : le masquage attend la purge, puis est refusé', async () => {
    const refus = await course({ premiere: purge('purge_dabord'), seconde: masquage('purge_dabord'), issueA: 'COMMIT' });
    assert.ok(refus, 'le masquage est passé après la purge : des pages vivent sur un document purgé.');
    assert.match(refus.message, /document de ce compte rendu est purgé/);
    assert.deepEqual(await etat(observateur, 'purge_dabord'), { document_purge: true, masquages: 0, pages_vivantes: 0 });
  });

  it('2. masquage d’abord : la purge attend le masquage, puis passe et purge ses pages', async () => {
    const refus = await course({ premiere: masquage('masquage_dabord'), seconde: purge('masquage_dabord'), issueA: 'COMMIT' });
    assert.equal(refus, null, `la purge a été refusée derrière un masquage (${refus?.message}).`);
    assert.deepEqual(await etat(observateur, 'masquage_dabord'), { document_purge: true, masquages: 1, pages_vivantes: 0 });
  });

  it('3. TÉMOIN : la purge en vol est annulée — le masquage attend, puis passe', async () => {
    const refus = await course({ premiere: purge('purge_annulee'), seconde: masquage('purge_annulee'), issueA: 'ROLLBACK' });
    assert.equal(refus, null, `le masquage a été refusé sur une purge annulée (${refus?.message}).`);
    assert.deepEqual(await etat(observateur, 'purge_annulee'), { document_purge: false, masquages: 1, pages_vivantes: 1 });
  });

  it('4. TÉMOIN : le masquage en vol est annulé — la purge attend, puis passe', async () => {
    const refus = await course({ premiere: masquage('masquage_annule'), seconde: purge('masquage_annule'), issueA: 'ROLLBACK' });
    assert.equal(refus, null, `la purge a été refusée sur un masquage annulé (${refus?.message}).`);
    assert.deepEqual(await etat(observateur, 'masquage_annule'), { document_purge: true, masquages: 0, pages_vivantes: 0 });
  });

  it('5. lecture demandée d’abord : le masquage attend la demande, puis est refusé', async () => {
    const refus = await course({ premiere: demande('demande_dabord'), seconde: masquage('demande_dabord'), issueA: 'COMMIT' });
    assert.ok(refus, 'un masquage est passé pendant qu’une lecture naissait.');
    assert.match(refus.message, /demandée ou en cours/);
    assert.deepEqual(await lectures(observateur, 'demande_dabord'), { masquages: 0, travaux: 1, imports: 0 });
  });

  it('6. import ouvert d’abord : le masquage attend l’import, puis est refusé', async () => {
    const refus = await course({ premiere: ouvertureImport('import_dabord'), seconde: masquage('import_dabord'), issueA: 'COMMIT' });
    assert.ok(refus, 'un masquage est passé pendant qu’un import s’ouvrait.');
    assert.match(refus.message, /demandée ou en cours/);
    assert.deepEqual(await lectures(observateur, 'import_dabord'), { masquages: 0, travaux: 0, imports: 1 });
  });

  it('7. masquage d’abord : la demande attend le masquage, puis passe', async () => {
    const refus = await course({ premiere: masquage('masquage_avant_demande'), seconde: demande('masquage_avant_demande'), issueA: 'COMMIT' });
    assert.equal(refus, null, `la demande a été refusée derrière un masquage (${refus?.message}).`);
    assert.deepEqual(await lectures(observateur, 'masquage_avant_demande'), { masquages: 1, travaux: 1, imports: 0 });
  });

  it('8. TÉMOIN : la demande en vol est annulée — le masquage attend, puis passe', async () => {
    const refus = await course({ premiere: demande('demande_annulee'), seconde: masquage('demande_annulee'), issueA: 'ROLLBACK' });
    assert.equal(refus, null, `le masquage a été refusé sur une demande annulée (${refus?.message}).`);
    assert.deepEqual(await lectures(observateur, 'demande_annulee'), { masquages: 1, travaux: 0, imports: 0 });
  });
});
