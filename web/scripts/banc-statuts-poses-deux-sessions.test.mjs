// BANC À DEUX SESSIONS — le statut posé près d'une valeur biologique
// ([[D-322]], F58, migration `statuts_poses_resultats_biologiques_v1`).
//
// POURQUOI CE FICHIER EXISTE. Le trigger des statuts ne tient ses refus que
// par ses verrous — ceux de BP-09, pris par la même fonction
// (`resultats_biologiques_verrouiller_cle` : le dossier `FOR KEY SHARE`, puis
// la clé de la ligne visée). Le contrat SQL (`prisma/checks/
// statuts_poses_resultats_biologiques_v1_negatif.sql`) joue une seule
// session : il relit que l'appel EXISTE et où, pas qu'il SÉRIALISE. La revue
// `wn-reviewer` de la migration l'a demandé pour la PR du code. Les courses :
//
//   1. DEUX POSES CONCURRENTES DU MÊME STATUT : la seconde attend la
//      première, puis est refusée — un double clic n'écrit pas deux fois ;
//   2. UNE POSE PUIS UN RETRAIT CONCURRENT : le retrait attend, puis passe —
//      il a lu la pose que le verrou a laissé commettre ;
//   3. UNE CORRECTION PUIS UNE POSE CONCURRENTE de la même ligne (relecture
//      CodeRabbit de la migration) : la pose attend, puis est refusée — jamais
//      un statut posé sur une ligne déjà supplantée ;
//   4. UNE POSE PUIS UNE CORRECTION CONCURRENTE : la correction attend, puis
//      passe — l'ordre est sériel, la valeur corrigée apparaît sans statut
//      ([[D-322]] §3) ;
//   5. REPEATABLE READ REFUSÉ PAR LA BASE, par la fonction partagée ;
//   6. L'EFFACEMENT CONTRE UNE POSE : l'effacement prend le dossier
//      `FOR UPDATE` en premier ; la pose, qui prend le dossier avant tout
//      autre verrou, l'attend au lieu de croiser ses verrous (pas
//      d'interblocage), puis passe quand l'effacement est annulé.
// Chaque course constate d'abord que la seconde session est BLOQUÉE sur un
// verrou (`pg_stat_activity`) : sans ce constat, une course « gagnée » ne
// prouverait rien — elle aurait pu se jouer en série.
//
// ÉCRIT EN BASE, ET COMMET : une course ne se joue pas dans une transaction
// annulée. La base visée doit donc être NOMMÉE : `WN_BIO_STATUT_BANC_BASE`
// doit égaler le nom de la base de `DATABASE_URL`, sur un hôte local. Les
// fixtures (identité de fixture, suffixe propre au run) sont effacées à la
// fin, dans l'ordre de l'effacement nommé du dossier.
//
// LANCÉ PAR `node scripts/banc-statuts-poses-deux-sessions.test.mjs`, pas par
// `node --test` : T3 extrait les `node --test` de ci.yml et les joue AVANT
// d'avoir une base. Il a son propre pas, après les contrats SQL, en CI comme
// en T3.

import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import pg from 'pg';

const URL_BASE = process.env.DATABASE_URL;
if (!URL_BASE) throw new Error('DATABASE_URL est requise.');
const BASE_ATTENDUE = process.env.WN_BIO_STATUT_BANC_BASE;
const BASE_REELLE = new URL(URL_BASE).pathname.slice(1);
// Hôte LOCAL seulement (garde-fou de T3) : le banc commet des écritures.
const HOTE = new URL(URL_BASE).hostname;
if (HOTE !== '127.0.0.1' && HOTE !== 'localhost') {
  throw new Error(`REFUS : DATABASE_URL vise l'hôte « ${HOTE} », le banc n'écrit que sur une base locale.`);
}
if (!BASE_ATTENDUE || BASE_ATTENDUE !== BASE_REELLE) {
  throw new Error(
    `REFUS : DATABASE_URL vise « ${BASE_REELLE} », WN_BIO_STATUT_BANC_BASE annonce « ${BASE_ATTENDUE ?? ''} ».`,
  );
}

const RUN = randomBytes(4).toString('hex');
const PATIENT = `PAT_BANC_STAT_${RUN}`;
const PRATICIEN = 'praticien@wellneuro.fr';
const ANALYTE = `BIO_BANC_STAT_${RUN.toUpperCase()}`;
const id = nom => `${nom}_${RUN}`;
/** Une date de prélèvement par course : chaque course a sa propre clé. */
const date = jour => `2026-09-${String(jour).padStart(2, '0')} 08:00:00`;

/** Une session : un client dédié, jamais un pool — l'ordre des instructions est le banc. */
async function session() {
  const client = new pg.Client({ connectionString: URL_BASE });
  await client.connect();
  const { rows } = await client.query('SELECT pg_backend_pid() AS pid');
  return { client, pid: rows[0].pid };
}

const saisie = (nom, jour) => ({
  text: `INSERT INTO resultats_biologiques (id, id_patient, analyte_code, valeur, unite, preleve_le, source, saisi_par)
         VALUES ($1, $2, $3, 1, 'mg/L', $4::timestamp, 'saisie_praticien', $5)`,
  values: [id(nom), PATIENT, ANALYTE, date(jour), PRATICIEN],
});

const correction = (nom, cible, jour) => ({
  text: `INSERT INTO resultats_biologiques (id, id_patient, analyte_code, valeur, unite, preleve_le, source, saisi_par, supersedes_resultat_id)
         VALUES ($1, $2, $3, 2, 'mg/L', $4::timestamp, 'saisie_praticien', $5, $6)`,
  values: [id(nom), PATIENT, ANALYTE, date(jour), PRATICIEN, id(cible)],
});

const pose = (nom, resultat, statut = 'a_suivre') => ({
  text: `INSERT INTO statuts_poses_resultats_biologiques (id, id_patient, id_resultat, acte, statut, praticien_email)
         VALUES ($1, $2, $3, 'pose', $4, $5)`,
  values: [id(nom), PATIENT, id(resultat), statut, PRATICIEN],
});

const retrait = (nom, resultat) => ({
  text: `INSERT INTO statuts_poses_resultats_biologiques (id, id_patient, id_resultat, acte, praticien_email)
         VALUES ($1, $2, $3, 'retrait', $4)`,
  values: [id(nom), PATIENT, id(resultat), PRATICIEN],
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

/** Les actes commis sur une ligne, dans l'ordre. */
async function actes(observateur, resultat) {
  const { rows } = await observateur.query(
    `SELECT acte, statut FROM statuts_poses_resultats_biologiques WHERE id_resultat = $1 ORDER BY ordre`,
    [id(resultat)],
  );
  return rows.map(r => (r.acte === 'pose' ? `pose:${r.statut}` : 'retrait'));
}

let observateur;

before(async () => {
  ({ client: observateur } = await session());
  try {
    await observateur.query('BEGIN');
    await observateur.query(
      `INSERT INTO patients (id, id_patient, email, prenom, nom, praticien_email, updated_at)
       VALUES ($1, $2, $3, 'Michel', 'Dogné', $4, CURRENT_TIMESTAMP)`,
      [id('pat_banc_stat'), PATIENT, `michel.dogne+banc-${RUN}@example.test`, PRATICIEN],
    );
    await observateur.query(
      `INSERT INTO biology_analytes (id, code, libelle, type_prelevement, source_provenance, niveau_completude, updated_at)
       VALUES ($1, $2, 'Analyte de banc', 'sang', 'saisie_praticien', 'partielle', CURRENT_TIMESTAMP)`,
      [id('bio_banc_stat'), ANALYTE],
    );
    // Une mesure courante par course.
    for (const jour of [1, 2, 3, 4, 5, 6]) await observateur.query(saisie(`res_course${jour}`, jour));
    await observateur.query('COMMIT');
  } catch (err) {
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
    await observateur.query('DELETE FROM statuts_poses_resultats_biologiques WHERE id_patient = $1', par);
    await observateur.query('DELETE FROM resultats_biologiques WHERE id_patient = $1', par);
    await observateur.query('DELETE FROM patients WHERE id_patient = $1', par);
    await observateur.query('DELETE FROM biology_analytes WHERE code = $1', [ANALYTE]);
    await observateur.query('COMMIT');
  } finally {
    await observateur.end();
  }
});

describe('Statuts posés près d’une valeur — deux sessions (D-322, F58)', () => {
  it('1. deux poses concurrentes du même statut : la seconde attend, puis est refusée', async () => {
    const a = await session();
    const b = await session();
    try {
      await a.client.query('BEGIN');
      await a.client.query(pose('st_course1_a', 'res_course1'));
      const enVol = b.client.query(pose('st_course1_b', 'res_course1')).then(() => null, err => err);
      await attendreBloquee(observateur, b.pid);
      await a.client.query('COMMIT');
      const refus = await enVol;
      assert.ok(refus, 'la seconde pose est passée : le même statut écrit deux fois.');
      assert.match(refus.message, /est déjà le statut actif/);
      assert.deepEqual(await actes(observateur, 'res_course1'), ['pose:a_suivre']);
    } finally {
      await a.client.end();
      await b.client.end();
    }
  });

  it('2. une pose puis un retrait concurrent : le retrait attend, lit la pose, et passe', async () => {
    const a = await session();
    const b = await session();
    try {
      await a.client.query('BEGIN');
      await a.client.query(pose('st_course2', 'res_course2'));
      const enVol = b.client.query(retrait('rt_course2', 'res_course2')).then(() => null, err => err);
      await attendreBloquee(observateur, b.pid);
      await a.client.query('COMMIT');
      assert.equal(await enVol, null, 'le retrait a été refusé : il n’a pas lu la pose commise.');
      assert.deepEqual(await actes(observateur, 'res_course2'), ['pose:a_suivre', 'retrait']);
    } finally {
      await a.client.end();
      await b.client.end();
    }
  });

  it('3. une correction puis une pose concurrente de la même ligne : la pose attend, puis est refusée', async () => {
    const a = await session();
    const b = await session();
    try {
      await a.client.query('BEGIN');
      await a.client.query(correction('cor_course3', 'res_course3', 3));
      const enVol = b.client.query(pose('st_course3', 'res_course3')).then(() => null, err => err);
      await attendreBloquee(observateur, b.pid);
      await a.client.query('COMMIT');
      const refus = await enVol;
      assert.ok(refus, 'la pose est passée sur une ligne que la correction concurrente supplante.');
      assert.match(refus.message, /a été corrigé ; seule la tête du fil porte un statut/);
      assert.deepEqual(await actes(observateur, 'res_course3'), []);
    } finally {
      await a.client.end();
      await b.client.end();
    }
  });

  it('4. une pose puis une correction concurrente : la correction attend, puis passe — la correction sans statut', async () => {
    const a = await session();
    const b = await session();
    try {
      await a.client.query('BEGIN');
      await a.client.query(pose('st_course4', 'res_course4'));
      const enVol = b.client.query(correction('cor_course4', 'res_course4', 4)).then(() => null, err => err);
      await attendreBloquee(observateur, b.pid);
      await a.client.query('COMMIT');
      assert.equal(await enVol, null, 'la correction a été refusée après la pose.');
      assert.deepEqual(await actes(observateur, 'res_course4'), ['pose:a_suivre']);
      assert.deepEqual(await actes(observateur, 'cor_course4'), []);
    } finally {
      await a.client.end();
      await b.client.end();
    }
  });

  it('5. REPEATABLE READ est refusé par la base, pour une pose comme pour un retrait', async () => {
    const b = await session();
    try {
      await b.client.query('BEGIN ISOLATION LEVEL REPEATABLE READ');
      const refus = await b.client.query(pose('st_course5', 'res_course5')).then(() => null, err => err);
      assert.ok(refus, 'une pose en REPEATABLE READ est passée.');
      assert.match(refus.message, /écriture refusée en REPEATABLE READ/);
      await b.client.query('ROLLBACK');
      await b.client.query('BEGIN ISOLATION LEVEL REPEATABLE READ');
      const refusRetrait = await b.client.query(retrait('rt_course5', 'res_course2')).then(() => null, err => err);
      assert.ok(refusRetrait, 'un retrait en REPEATABLE READ est passé.');
      assert.match(refusRetrait.message, /écriture refusée en REPEATABLE READ/);
      await b.client.query('ROLLBACK');
      assert.deepEqual(await actes(observateur, 'res_course5'), []);
    } finally {
      await b.client.end();
    }
  });

  it('6. l’effacement contre une pose : la pose attend le dossier, sans interblocage, puis passe', async () => {
    const a = await session();
    const b = await session();
    try {
      // Les premiers gestes de `effacerDossier` : le dossier verrouillé, puis
      // la suppression du résultat même que la pose vise. Si la pose
      // verrouillait la clé AVANT le dossier, cette suppression l'attendrait
      // pendant qu'elle attend le dossier : interblocage, et l'une des deux
      // tuée.
      await a.client.query('BEGIN');
      await a.client.query('SELECT 1 FROM patients WHERE id_patient = $1 FOR UPDATE', [PATIENT]);
      const enVol = b.client.query(pose('st_course6', 'res_course6')).then(() => null, err => err);
      await attendreBloquee(observateur, b.pid);
      await a.client.query('DELETE FROM resultats_biologiques WHERE id = $1', [id('res_course6')]);
      await a.client.query('ROLLBACK');
      assert.equal(await enVol, null, 'la pose a échoué après l’effacement annulé (interblocage ?).');
      assert.deepEqual(await actes(observateur, 'res_course6'), ['pose:a_suivre']);
    } finally {
      await a.client.end();
      await b.client.end();
    }
  });
});
