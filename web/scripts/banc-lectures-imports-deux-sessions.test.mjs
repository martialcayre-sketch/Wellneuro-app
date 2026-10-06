// BANC À DEUX SESSIONS — l'acte de lecture d'un import biologique validé
// ([[D-268]], BIO-PARCOURS BP-10, migration `lectures_imports_biologiques_v1`).
//
// POURQUOI CE FICHIER EXISTE. Le contrat SQL (`prisma/checks/
// lectures_imports_biologiques_v1_negatif.sql`) joue une seule session : il
// vérifie que le verrou de l'import EXISTE, pas qu'il SÉRIALISE. La migration
// a renvoyé la preuve à un banc à deux sessions, avec la route ; la revue du
// lot de migration et la passe Codex l'ont demandé. Les courses jouées ici :
//
//   1. DEUX LECTURES CONCURRENTES sur le même import, en READ COMMITTED (le
//      régime de l'écrivain) : la seconde ATTEND la première, puis est
//      refusée — une seule lecture active ;
//   2. TÉMOIN : la même course sous REPEATABLE READ laisse passer DEUX
//      lectures. C'est la raison pour laquelle l'écrivain reste en READ
//      COMMITTED (`import/acteLecture.ts`), et la preuve que la course 1 est
//      réellement concurrente ;
//   3. UNE LECTURE CONTRE LA DERNIÈRE DÉCISION, commise : la lecture attend la
//      décision en vol, puis PASSE — elle n'est pas refusée sur l'état d'avant ;
//   4. LA MÊME, décision ANNULÉE : la lecture attend, puis est refusée — une
//      ligne reste à décider.
// Chaque course constate d'abord que la seconde session est BLOQUÉE sur un
// verrou (`pg_stat_activity`) : sans ce constat, une course « gagnée » ne
// prouverait rien — elle aurait pu se jouer en série.
//
// ÉCRIT EN BASE, ET COMMET : une course ne se joue pas dans une transaction
// annulée. La base visée doit donc être NOMMÉE (patron des bancs NABM et
// Ciqual) : `WN_BIO_LECTURE_BANC_BASE` doit égaler le nom de la base de
// `DATABASE_URL`. Les fixtures (identité de fixture, suffixe propre au run)
// sont effacées à la fin, dans l'ordre de l'effacement nommé du dossier.
//
// LANCÉ PAR `node scripts/banc-lectures-imports-deux-sessions.test.mjs`, pas
// par `node --test` : T3 extrait les `node --test` de ci.yml et les joue AVANT
// d'avoir une base. Il a son propre pas, après les contrats SQL, en CI comme
// en T3.

import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import pg from 'pg';

const URL_BASE = process.env.DATABASE_URL;
if (!URL_BASE) throw new Error('DATABASE_URL est requise.');
const BASE_ATTENDUE = process.env.WN_BIO_LECTURE_BANC_BASE;
const BASE_REELLE = new URL(URL_BASE).pathname.slice(1);
if (!BASE_ATTENDUE || BASE_ATTENDUE !== BASE_REELLE) {
  throw new Error(
    `REFUS : DATABASE_URL vise « ${BASE_REELLE} », WN_BIO_LECTURE_BANC_BASE annonce « ${BASE_ATTENDUE ?? ''} ».`,
  );
}

const RUN = randomBytes(4).toString('hex');
const PATIENT = `PAT_BANC_LIB_${RUN}`;
const PRATICIEN = 'praticien@wellneuro.fr';
const ANALYTE = `BIO_BANC_LIB_${RUN.toUpperCase()}`;
const id = nom => `${nom}_${RUN}`;

/** Une session : un client dédié, jamais un pool — l'ordre des instructions est le banc. */
async function session() {
  const client = new pg.Client({ connectionString: URL_BASE });
  await client.connect();
  const { rows } = await client.query('SELECT pg_backend_pid() AS pid');
  return { client, pid: rows[0].pid };
}

const lecture = idImport => ({
  text: `INSERT INTO lectures_imports_biologiques (id, id_patient, id_import, acte, praticien_email)
         VALUES ($1, $2, $3, 'lecture', $4)`,
  values: [id(`lec_${idImport}_${randomBytes(3).toString('hex')}`), PATIENT, id(idImport), PRATICIEN],
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

async function lecturesActives(observateur, idImport) {
  const { rows } = await observateur.query(
    `SELECT count(*)::int AS n FROM lectures_imports_biologiques a
     WHERE a.id_import = $1 AND a.acte = 'lecture'
       AND NOT EXISTS (SELECT 1 FROM lectures_imports_biologiques r
                       WHERE r.acte = 'revocation' AND r.id_lecture_revoquee = a.id)`,
    [id(idImport)],
  );
  return rows[0].n;
}

/** Quatre imports : trois entièrement validés, deux validés qui gardent une ligne proposée. */
const IMPORTS_DECIDES = ['imp_course', 'imp_temoin'];
const IMPORTS_PARTIELS = ['imp_decision', 'imp_decision_annulee'];

let observateur;

before(async () => {
  ({ client: observateur } = await session());
  try {
    await poserFixtures();
  } catch (err) {
    // Une transaction avortée ferait échouer le nettoyage, et la connexion
    // restée ouverte retiendrait le processus : on annule, puis on remonte.
    await observateur.query('ROLLBACK');
    throw err;
  }
});

async function poserFixtures() {
  const q = (text, values) => observateur.query(text, values);
  await q('BEGIN');
  await q(
    `INSERT INTO patients (id, id_patient, email, prenom, nom, praticien_email, updated_at)
     VALUES ($1, $2, $3, 'Sophie', 'Nicola', $4, CURRENT_TIMESTAMP)`,
    [id('pat_banc_lib'), PATIENT, `sophie.nicola+banc-${RUN}@example.test`, PRATICIEN],
  );
  await q(
    `INSERT INTO biology_analytes (id, code, libelle, type_prelevement, source_provenance, niveau_completude, updated_at)
     VALUES ($1, $2, 'Analyte de banc', 'sang', 'saisie_praticien', 'partielle', CURRENT_TIMESTAMP)`,
    [id('bio_banc_lib'), ANALYTE],
  );
  await q(
    `INSERT INTO comptes_rendus_biologiques (id, id_patient, contenu, type_mime, empreinte_sha256, depose_par)
     VALUES ($1, $2, convert_to($3, 'UTF8'), 'application/pdf', encode(sha256(convert_to($3, 'UTF8')), 'hex'), $4)`,
    [id('cr_banc'), PATIENT, `banc ${RUN}`, PRATICIEN],
  );
  for (const imp of [...IMPORTS_DECIDES, ...IMPORTS_PARTIELS]) {
    await q(
      `INSERT INTO imports_biologiques (id, id_patient, id_compte_rendu, modele, version_prompt, lance_par)
       VALUES ($1, $2, $3, 'modele-banc', 'bio-extraction-v3', $4)`,
      [id(imp), PATIENT, id('cr_banc'), PRATICIEN],
    );
    await q(
      `INSERT INTO lignes_biologiques_candidates (id, id_patient, id_import, rang, page, libelle_lu, valeur_lue, statut_mapping)
       VALUES ($1, $2, $3, 1, 1, 'Libellé', '1', 'inconnu')`,
      [id(`lig_${imp}_1`), PATIENT, id(imp)],
    );
    if (IMPORTS_PARTIELS.includes(imp)) {
      await q(
        `INSERT INTO lignes_biologiques_candidates (id, id_patient, id_import, rang, page, libelle_lu, valeur_lue, statut_mapping)
         VALUES ($1, $2, $3, 2, 1, 'Libellé', '1', 'inconnu')`,
        [id(`lig_${imp}_2`), PATIENT, id(imp)],
      );
    }
  }
  await q(
    `UPDATE imports_biologiques SET statut = 'extrait', termine_le = CURRENT_TIMESTAMP WHERE id_patient = $1`,
    [PATIENT],
  );
  await q('COMMIT');
  // Les résultats sont saisis APRÈS la fin des extractions (la décision d'une
  // ligne le vérifie) : instant posé à la main, après une courte attente.
  await new Promise(r => setTimeout(r, 20));
  await q('BEGIN');
  for (const [rang, imp] of [...IMPORTS_DECIDES, ...IMPORTS_PARTIELS].entries()) {
    await q(
      `INSERT INTO resultats_biologiques (id, id_patient, analyte_code, valeur, unite, preleve_le, source, saisi_par, saisi_le)
       VALUES ($1, $2, $3, 1, 'mg/L', TIMESTAMP '2026-09-01 08:00:00' + make_interval(days => $4), 'saisie_praticien', $5,
               clock_timestamp() AT TIME ZONE 'UTC')`,
      [id(`res_${imp}`), PATIENT, ANALYTE, rang, PRATICIEN],
    );
    await q(
      `UPDATE lignes_biologiques_candidates SET statut = 'validee', id_resultat = $1, traite_par = $2 WHERE id = $3`,
      [id(`res_${imp}`), PRATICIEN, id(`lig_${imp}_1`)],
    );
  }
  await q('COMMIT');
}

after(async () => {
  // L'ordre de l'effacement nommé du dossier (`patient/effacement.ts`), en
  // une transaction ; la connexion se ferme quoi qu'il arrive.
  const par = [PATIENT];
  try {
    await observateur.query('BEGIN');
    await observateur.query('DELETE FROM lectures_imports_biologiques WHERE id_patient = $1', par);
    await observateur.query('DELETE FROM lignes_biologiques_candidates WHERE id_patient = $1', par);
    await observateur.query('DELETE FROM imports_biologiques WHERE id_patient = $1', par);
    await observateur.query('DELETE FROM comptes_rendus_biologiques WHERE id_patient = $1', par);
    await observateur.query('DELETE FROM resultats_biologiques WHERE id_patient = $1', par);
    await observateur.query('DELETE FROM patients WHERE id_patient = $1', par);
    await observateur.query('DELETE FROM biology_analytes WHERE code = $1', [ANALYTE]);
    await observateur.query('COMMIT');
  } finally {
    await observateur.end();
  }
});

describe('Actes de lecture — deux sessions (D-268, BP-10)', () => {
  it('1. deux lectures concurrentes en READ COMMITTED : la seconde attend, puis est refusée', async () => {
    const a = await session();
    const b = await session();
    try {
      await a.client.query('BEGIN');
      await a.client.query(lecture('imp_course'));
      // B en autocommit, comme l'écrivain : une instruction, hors transaction.
      const enVol = b.client.query(lecture('imp_course')).then(() => null, err => err);
      await attendreBloquee(observateur, b.pid);
      await a.client.query('COMMIT');
      const refus = await enVol;
      assert.ok(refus, 'la seconde lecture est passée : deux lectures actives.');
      assert.match(refus.message, /porte déjà une lecture active/);
      assert.equal(await lecturesActives(observateur, 'imp_course'), 1);
    } finally {
      await a.client.end();
      await b.client.end();
    }
  });

  it('2. TÉMOIN : la même course sous REPEATABLE READ laisse passer deux lectures — l’écrivain reste en READ COMMITTED', async () => {
    const a = await session();
    const b = await session();
    try {
      await a.client.query('BEGIN');
      await a.client.query(lecture('imp_temoin'));
      await b.client.query('BEGIN ISOLATION LEVEL REPEATABLE READ');
      const enVol = b.client.query(lecture('imp_temoin')).then(() => null, err => err);
      await attendreBloquee(observateur, b.pid);
      await a.client.query('COMMIT');
      assert.equal(await enVol, null, 'sous REPEATABLE READ, la seconde lecture devait passer (instantané d’avant le verrou).');
      await b.client.query('COMMIT');
      assert.equal(await lecturesActives(observateur, 'imp_temoin'), 2);
    } finally {
      await a.client.end();
      await b.client.end();
    }
  });

  it('3. une lecture contre la dernière décision COMMISE : elle attend la décision, puis passe', async () => {
    const a = await session();
    const b = await session();
    try {
      await a.client.query('BEGIN');
      await a.client.query(
        `UPDATE lignes_biologiques_candidates SET statut = 'ecartee', motif_ecart = 'ecartee_par_praticien', traite_par = $1
         WHERE id = $2`,
        [PRATICIEN, id('lig_imp_decision_2')],
      );
      const enVol = b.client.query(lecture('imp_decision')).then(() => null, err => err);
      await attendreBloquee(observateur, b.pid);
      await a.client.query('COMMIT');
      assert.equal(await enVol, null, 'la lecture a été refusée sur l’état d’avant la décision.');
      assert.equal(await lecturesActives(observateur, 'imp_decision'), 1);
    } finally {
      await a.client.end();
      await b.client.end();
    }
  });

  it('4. la même, décision ANNULÉE : la lecture attend, puis est refusée — une ligne reste à décider', async () => {
    const a = await session();
    const b = await session();
    try {
      await a.client.query('BEGIN');
      await a.client.query(
        `UPDATE lignes_biologiques_candidates SET statut = 'ecartee', motif_ecart = 'ecartee_par_praticien', traite_par = $1
         WHERE id = $2`,
        [PRATICIEN, id('lig_imp_decision_annulee_2')],
      );
      const enVol = b.client.query(lecture('imp_decision_annulee')).then(() => null, err => err);
      await attendreBloquee(observateur, b.pid);
      await a.client.query('ROLLBACK');
      const refus = await enVol;
      assert.ok(refus, 'la lecture est passée alors qu’une ligne reste à décider.');
      assert.match(refus.message, /a encore des lignes à décider/);
      assert.equal(await lecturesActives(observateur, 'imp_decision_annulee'), 0);
    } finally {
      await a.client.end();
      await b.client.end();
    }
  });
});
