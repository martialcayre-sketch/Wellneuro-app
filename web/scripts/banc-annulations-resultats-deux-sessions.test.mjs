// BANC À DEUX SESSIONS — l'annulation d'un résultat et la garde anti-doublon
// devenue trigger ([[D-294]], BIO-PARCOURS BP-09, migration
// `annulations_resultats_biologiques_v1`).
//
// POURQUOI CE FICHIER EXISTE. L'index unique partiel que la migration retire
// était sûr face aux courses par construction ; le trigger qui le remplace ne
// l'est que par ses verrous (le dossier `FOR KEY SHARE`, puis un verrou
// consultatif sur la clé). Le contrat SQL (`prisma/checks/
// annulations_resultats_biologiques_v1_negatif.sql`) joue une seule session :
// il relit que les verrous EXISTENT, pas qu'ils SÉRIALISENT. La revue
// `wn-reviewer` du lot l'a demandé avant la release-db. Les courses :
//
//   1. DEUX SAISIES NEUVES CONCURRENTES de la même clé, en READ COMMITTED (le
//      régime des écrivains Prisma) : la seconde ATTEND la première, puis est
//      refusée en violation d'unicité lisible par l'adaptateur Prisma — ce que
//      faisait l'index ;
//   2. REPEATABLE READ REFUSÉ PAR LA BASE (passe Codex du lot, P0-1) : sous
//      ce niveau, l'instantané masquerait la ligne que le verrou laisse
//      commettre et la garde passerait deux mesures ; une saisie comme un acte
//      y échouent, et une seule mesure reste ;
//   6. LA MÊME COURSE EN SERIALIZABLE : une seule mesure est commise (conflit
//      de sérialisation ou doublon) ;
//   3. DEUX ANNULATIONS CONCURRENTES du même fil : la seconde attend, puis est
//      refusée — une seule annulation active ;
//   4. UNE SAISIE NEUVE CONTRE UNE RÉVOCATION sur une place libérée : la
//      révocation attend la saisie, puis est refusée — la place est reprise ;
//   5. L'EFFACEMENT CONTRE UNE ANNULATION : l'effacement prend le dossier
//      `FOR UPDATE` en premier ; l'annulation, qui prend le dossier avant tout
//      autre verrou, l'attend au lieu de croiser ses verrous (pas
//      d'interblocage), puis passe quand l'effacement est annulé. PORTÉE
//      (contre-revue du lot, P2-5) : la course prouve qu'aucun verrou du fil
//      n'est pris avant le dossier ; elle passerait aussi sans le
//      `FOR KEY SHARE` explicite, que la clé étrangère des annulations vers
//      le dossier prend d'elle-même — sa présence est tenue par le contrat
//      (cas 13). L'effacement qui COMMET n'est pas joué.
// Chaque course constate d'abord que la seconde session est BLOQUÉE sur un
// verrou (`pg_stat_activity`) : sans ce constat, une course « gagnée » ne
// prouverait rien — elle aurait pu se jouer en série.
//
// ÉCRIT EN BASE, ET COMMET : une course ne se joue pas dans une transaction
// annulée. La base visée doit donc être NOMMÉE : `WN_BIO_ANNULATION_BANC_BASE`
// doit égaler le nom de la base de `DATABASE_URL`, sur un hôte local. Les
// fixtures (identité de fixture, suffixe propre au run) sont effacées à la
// fin, dans l'ordre de l'effacement nommé du dossier.
//
// LANCÉ PAR `node scripts/banc-annulations-resultats-deux-sessions.test.mjs`,
// pas par `node --test` : T3 extrait les `node --test` de ci.yml et les joue
// AVANT d'avoir une base. Il a son propre pas, après les contrats SQL, en CI
// comme en T3.

import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import pg from 'pg';

const URL_BASE = process.env.DATABASE_URL;
if (!URL_BASE) throw new Error('DATABASE_URL est requise.');
const BASE_ATTENDUE = process.env.WN_BIO_ANNULATION_BANC_BASE;
const BASE_REELLE = new URL(URL_BASE).pathname.slice(1);
// Hôte LOCAL seulement (garde-fou de T3) : le banc commet des écritures.
const HOTE = new URL(URL_BASE).hostname;
if (HOTE !== '127.0.0.1' && HOTE !== 'localhost') {
  throw new Error(`REFUS : DATABASE_URL vise l'hôte « ${HOTE} », le banc n'écrit que sur une base locale.`);
}
if (!BASE_ATTENDUE || BASE_ATTENDUE !== BASE_REELLE) {
  throw new Error(
    `REFUS : DATABASE_URL vise « ${BASE_REELLE} », WN_BIO_ANNULATION_BANC_BASE annonce « ${BASE_ATTENDUE ?? ''} ».`,
  );
}

const RUN = randomBytes(4).toString('hex');
const PATIENT = `PAT_BANC_ANN_${RUN}`;
const PRATICIEN = 'praticien@wellneuro.fr';
const ANALYTE = `BIO_BANC_ANN_${RUN.toUpperCase()}`;
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

const annulation = (nom, resultat) => ({
  text: `INSERT INTO annulations_resultats_biologiques (id, id_patient, id_resultat, acte, motif_annulation, praticien_email)
         VALUES ($1, $2, $3, 'annulation', 'mauvais_analyte', $4)`,
  values: [id(nom), PATIENT, id(resultat), PRATICIEN],
});

const revocation = (nom, resultat, annulee) => ({
  text: `INSERT INTO annulations_resultats_biologiques (id, id_patient, id_resultat, acte, id_annulation_revoquee, motif_revocation, praticien_email)
         VALUES ($1, $2, $3, 'revocation', $4, 'resultat_verifie_exact', $5)`,
  values: [id(nom), PATIENT, id(resultat), id(annulee), PRATICIEN],
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

async function courantesALaDate(observateur, jour) {
  const { rows } = await observateur.query(
    `SELECT count(*)::int AS n FROM resultats_biologiques
     WHERE id_patient = $1 AND analyte_code = $2 AND preleve_le = $3::timestamp AND supersedes_resultat_id IS NULL`,
    [PATIENT, ANALYTE, date(jour)],
  );
  return rows[0].n;
}

let observateur;

before(async () => {
  ({ client: observateur } = await session());
  try {
    await observateur.query('BEGIN');
    await observateur.query(
      `INSERT INTO patients (id, id_patient, email, prenom, nom, praticien_email, updated_at)
       VALUES ($1, $2, $3, 'Jennifer', 'Martin', $4, CURRENT_TIMESTAMP)`,
      [id('pat_banc_ann'), PATIENT, `jennifer.martin+banc-${RUN}@example.test`, PRATICIEN],
    );
    await observateur.query(
      `INSERT INTO biology_analytes (id, code, libelle, type_prelevement, source_provenance, niveau_completude, updated_at)
       VALUES ($1, $2, 'Analyte de banc', 'sang', 'saisie_praticien', 'partielle', CURRENT_TIMESTAMP)`,
      [id('bio_banc_ann'), ANALYTE],
    );
    // Courses 3, 4 et 5 : une mesure courante chacune.
    await observateur.query(saisie('res_course3', 3));
    await observateur.query(saisie('res_course4', 4));
    await observateur.query(saisie('res_course5', 5));
    // Course 4 : la place est libérée avant la course.
    await observateur.query(annulation('ann_course4', 'res_course4'));
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
    await observateur.query('DELETE FROM annulations_resultats_biologiques WHERE id_patient = $1', par);
    await observateur.query('DELETE FROM resultats_biologiques WHERE id_patient = $1', par);
    await observateur.query('DELETE FROM patients WHERE id_patient = $1', par);
    await observateur.query('DELETE FROM biology_analytes WHERE code = $1', [ANALYTE]);
    await observateur.query('COMMIT');
  } finally {
    await observateur.end();
  }
});

describe('Annulations de résultats et garde anti-doublon — deux sessions (D-294, BP-09)', () => {
  it('1. deux saisies neuves concurrentes de la même clé : la seconde attend, puis est refusée comme un doublon', async () => {
    const a = await session();
    const b = await session();
    try {
      await a.client.query('BEGIN');
      await a.client.query(saisie('res_course1_a', 1));
      // B en autocommit, comme un écrivain hors transaction.
      const enVol = b.client.query(saisie('res_course1_b', 1)).then(() => null, err => err);
      await attendreBloquee(observateur, b.pid);
      await a.client.query('COMMIT');
      const refus = await enVol;
      assert.ok(refus, 'la seconde saisie est passée : deux mesures courantes pour une clé.');
      assert.equal(refus.code, '23505');
      // La lecture même de l'adaptateur Prisma (`@prisma/adapter-pg`) : sans
      // ces champs, pas de P2002, et le 409 `doublon_mesure` deviendrait 500.
      assert.deepEqual(refus.detail?.match(/Key \(([^)]+)\)/)?.at(1)?.split(', '), ['id_patient', 'analyte_code', 'preleve_le']);
      assert.equal(refus.constraint, 'cb_resultat_bio_patient_analyte_idx');
      assert.equal(await courantesALaDate(observateur, 1), 1);
    } finally {
      await a.client.end();
      await b.client.end();
    }
  });

  it('2. REPEATABLE READ est refusé par la base : la course qui y créerait deux mesures n’a pas lieu', async () => {
    // Sous REPEATABLE READ, l'instantané masquerait la ligne que le verrou
    // laisse commettre : la garde passerait deux mesures (passe Codex, P0-1).
    // La base refuse donc ce niveau, pour une saisie comme pour un acte.
    const a = await session();
    const b = await session();
    try {
      await a.client.query('BEGIN');
      await a.client.query(saisie('res_course2_a', 2));
      await b.client.query('BEGIN ISOLATION LEVEL REPEATABLE READ');
      const refus = await b.client.query(saisie('res_course2_b', 2)).then(() => null, err => err);
      assert.ok(refus, 'une saisie en REPEATABLE READ est passée.');
      assert.match(refus.message, /écriture refusée en REPEATABLE READ/);
      await b.client.query('ROLLBACK');
      await b.client.query('BEGIN ISOLATION LEVEL REPEATABLE READ');
      const refusActe = await b.client.query(annulation('ann_course2', 'res_course3')).then(() => null, err => err);
      assert.ok(refusActe, 'un acte d’annulation en REPEATABLE READ est passé.');
      assert.match(refusActe.message, /écriture refusée en REPEATABLE READ/);
      await b.client.query('ROLLBACK');
      await a.client.query('COMMIT');
      assert.equal(await courantesALaDate(observateur, 2), 1);
    } finally {
      await a.client.end();
      await b.client.end();
    }
  });

  it('6. la même course en SERIALIZABLE : une seule mesure est commise', async () => {
    const a = await session();
    const b = await session();
    try {
      await a.client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');
      await a.client.query(saisie('res_course6_a', 6));
      await b.client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');
      const enVol = b.client.query(saisie('res_course6_b', 6)).then(() => null, err => err);
      await attendreBloquee(observateur, b.pid);
      await a.client.query('COMMIT');
      // L'échec peut tomber à l'insertion ou au COMMIT : 40001 (conflit de
      // sérialisation) ou 23505 — jamais deux mesures.
      let refus = await enVol;
      if (!refus) refus = await b.client.query('COMMIT').then(() => null, err => err);
      else await b.client.query('ROLLBACK');
      assert.ok(refus, 'en SERIALIZABLE, les deux saisies ont été commises.');
      assert.ok(['40001', '23505'].includes(refus.code), `refus inattendu : ${refus.code} ${refus.message}`);
      assert.equal(await courantesALaDate(observateur, 6), 1);
    } finally {
      await a.client.end();
      await b.client.end();
    }
  });

  it('3. deux annulations concurrentes du même fil : la seconde attend, puis est refusée', async () => {
    const a = await session();
    const b = await session();
    try {
      await a.client.query('BEGIN');
      await a.client.query(annulation('ann_course3_a', 'res_course3'));
      const enVol = b.client.query(annulation('ann_course3_b', 'res_course3')).then(() => null, err => err);
      await attendreBloquee(observateur, b.pid);
      await a.client.query('COMMIT');
      const refus = await enVol;
      assert.ok(refus, 'la seconde annulation est passée : deux annulations actives sur un fil.');
      assert.match(refus.message, /porte déjà une annulation active/);
    } finally {
      await a.client.end();
      await b.client.end();
    }
  });

  it('4. une saisie neuve contre une révocation, sur une place libérée : la révocation attend, puis est refusée', async () => {
    const a = await session();
    const b = await session();
    try {
      await a.client.query('BEGIN');
      await a.client.query(saisie('res_course4_neuve', 4));
      const enVol = b.client.query(revocation('rev_course4', 'res_course4', 'ann_course4')).then(() => null, err => err);
      await attendreBloquee(observateur, b.pid);
      await a.client.query('COMMIT');
      const refus = await enVol;
      assert.ok(refus, 'la révocation est passée : deux mesures courantes pour une clé.');
      assert.match(refus.message, /a repris la place/);
      assert.equal(await courantesALaDate(observateur, 4), 2, 'l’ancienne (annulée) et la neuve');
    } finally {
      await a.client.end();
      await b.client.end();
    }
  });

  it('5. l’effacement contre une annulation : l’annulation attend le dossier, sans interblocage, puis passe', async () => {
    const a = await session();
    const b = await session();
    try {
      // Les premiers gestes de `effacerDossier` : le dossier verrouillé, puis
      // la suppression du résultat même que l'annulation vise. Si
      // l'annulation verrouillait le fil AVANT le dossier (première forme du
      // trigger, P1-2 de la revue), cette suppression l'attendrait pendant
      // qu'elle attend le dossier : interblocage, et l'une des deux tuée.
      await a.client.query('BEGIN');
      await a.client.query('SELECT 1 FROM patients WHERE id_patient = $1 FOR UPDATE', [PATIENT]);
      const enVol = b.client.query(annulation('ann_course5', 'res_course5')).then(() => null, err => err);
      await attendreBloquee(observateur, b.pid);
      await a.client.query('DELETE FROM resultats_biologiques WHERE id = $1', [id('res_course5')]);
      await a.client.query('ROLLBACK');
      assert.equal(await enVol, null, 'l’annulation a échoué après l’effacement annulé (interblocage ?).');
    } finally {
      await a.client.end();
      await b.client.end();
    }
  });
});
