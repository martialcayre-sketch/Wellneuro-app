// BANC À DEUX SESSIONS — les constats du praticien sur un besoin sans score et
// leurs pièces ([[D-347]], t40, migration `constats_besoin_praticien_v1`).
//
// POURQUOI CE FICHIER EXISTE. Le contrat SQL
// (`prisma/checks/constats_besoin_praticien_v1_negatif.sql`) joue une seule
// session : il relit que les verrous EXISTENT et où, pas qu'ils SÉRIALISENT,
// et il ne peut figurer ni une transaction déjà commise ni un autre niveau
// d'isolation. Même discipline que le banc des constats de [[D-331]]. Les
// courses et les gestes entre transactions :
//
//   1. DEUX PREMIÈRES POSES CONCURRENTES sur un même besoin : la seconde
//      attend la première, puis est refusée — jamais deux constats en
//      vigueur (verrou du besoin, espace 347) ;
//   2. UN REMPLACEMENT PUIS UN RETRAIT CONCURRENT de la même tête : le
//      retrait attend, puis est refusé — il visait une tête qui ne l'est
//      plus ;
//   3. UNE PIÈCE APRÈS LE COMMIT de son constat : refusée (les pièces
//      s'écrivent avec leur constat) ; un « à soutenir » sans pièce passe
//      (pièces facultatives, [[D-347]] §2) ;
//   4. UNE CORRECTION PUIS UNE PIÈCE CONCURRENTE sur la même ligne : la pièce
//      attend (verrous de clé de BP-09), puis est refusée ;
//   5. UNE INVALIDATION PUIS UNE PIÈCE CONCURRENTE sur la même passation : la
//      pièce attend (`FOR SHARE`), relit la passation invalidée, et est
//      refusée ;
//   6. REPEATABLE READ REFUSÉ PAR LA BASE ;
//   7. L'EFFACEMENT CONTRE UNE POSE : l'effacement prend le dossier
//      `FOR UPDATE` en premier ; la pose, qui prend le dossier avant tout
//      autre verrou, l'attend sans interblocage, puis passe quand
//      l'effacement est annulé ;
//   8. UNE SUPPRESSION HORS EFFACEMENT, dossier conservé : refusée au COMMIT.
// Chaque course constate d'abord que la seconde session est BLOQUÉE sur un
// verrou (`pg_stat_activity`) : sans ce constat, une course « gagnée » ne
// prouverait rien — elle aurait pu se jouer en série.
//
// UN DOSSIER PAR COURSE : la base n'admet que quatre besoins (2, 6, 7, 11),
// donc quatre têtes par dossier ; chaque course a la sienne, dans son propre
// dossier.
//
// ÉCRIT EN BASE, ET COMMET : une course ne se joue pas dans une transaction
// annulée. La base visée doit donc être NOMMÉE : `WN_CONSTAT_BESOIN_BANC_BASE`
// doit égaler le nom de la base de `DATABASE_URL`, sur un hôte local. Les
// fixtures (identité de fixture, suffixe propre au run) sont effacées à la
// fin, dans l'ordre de l'effacement nommé du dossier, dossiers compris.
//
// LANCÉ PAR `node scripts/banc-constats-besoin-deux-sessions.test.mjs`,
// pas par `node --test` : T3 extrait les `node --test` de ci.yml et les joue
// AVANT d'avoir une base. Il a son propre pas, après les contrats SQL, en CI
// comme en T3.

import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import pg from 'pg';

const URL_BASE = process.env.DATABASE_URL;
if (!URL_BASE) throw new Error('DATABASE_URL est requise.');
const BASE_ATTENDUE = process.env.WN_CONSTAT_BESOIN_BANC_BASE;
const BASE_REELLE = new URL(URL_BASE).pathname.slice(1);
// Hôte LOCAL seulement (garde-fou de T3) : le banc commet des écritures.
const HOTE = new URL(URL_BASE).hostname;
if (HOTE !== '127.0.0.1' && HOTE !== 'localhost') {
  throw new Error(`REFUS : DATABASE_URL vise l'hôte « ${HOTE} », le banc n'écrit que sur une base locale.`);
}
if (!BASE_ATTENDUE || BASE_ATTENDUE !== BASE_REELLE) {
  throw new Error(
    `REFUS : DATABASE_URL vise « ${BASE_REELLE} », WN_CONSTAT_BESOIN_BANC_BASE annonce « ${BASE_ATTENDUE ?? ''} ».`,
  );
}

const RUN = randomBytes(4).toString('hex');
const PRATICIEN = 'praticien@wellneuro.fr';
const ANALYTE = `BIO_BANC_CB_${RUN.toUpperCase()}`;
const COURSES = [1, 2, 3, 4, 5, 6, 7, 8];
const id = nom => `${nom}_${RUN}`;
/** Un dossier par course : chaque course a ses propres têtes. */
const patient = n => `PAT_BANC_CB_${RUN}_${n}`;
const PATIENTS = COURSES.map(patient);
/** Le besoin visé par chaque course : un des quatre admis. */
const BESOIN = 6;
/** Une date de prélèvement par course : chaque course a sa propre clé. */
const date = jour => `2026-09-${String(jour).padStart(2, '0')} 08:00:00`;

/** Une session : un client dédié, jamais un pool — l'ordre des instructions est le banc. */
async function session() {
  const client = new pg.Client({ connectionString: URL_BASE });
  await client.connect();
  const { rows } = await client.query('SELECT pg_backend_pid() AS pid');
  return { client, pid: rows[0].pid };
}

const saisie = (nom, n, jour) => ({
  text: `INSERT INTO resultats_biologiques (id, id_patient, analyte_code, valeur, unite, preleve_le, source, saisi_par)
         VALUES ($1, $2, $3, 1, 'mg/L', $4::timestamp, 'saisie_praticien', $5)`,
  values: [id(nom), patient(n), ANALYTE, date(jour), PRATICIEN],
});

const correction = (nom, n, cible, jour) => ({
  text: `INSERT INTO resultats_biologiques (id, id_patient, analyte_code, valeur, unite, preleve_le, source, saisi_par, supersedes_resultat_id)
         VALUES ($1, $2, $3, 2, 'mg/L', $4::timestamp, 'saisie_praticien', $5, $6)`,
  values: [id(nom), patient(n), ANALYTE, date(jour), PRATICIEN, id(cible)],
});

const passation = (nom, n) => ({
  text: `INSERT INTO questionnaire_reponses (id, id_reponse, id_patient, email_patient, id_questionnaire, titre, scores_json)
         VALUES ($1, $1, $2, $3, 'Q_BANC', 'Questionnaire de banc', '{}')`,
  values: [id(nom), patient(n), `michel.dogne+banc-cb-${RUN}-${n}@example.test`],
});

const pose = (nom, n, { verdict = 'sans_objet', motif = 'hors_population', remplace = null } = {}) => ({
  text: `INSERT INTO constats_besoin_praticien (id, id_patient, acte, besoin, verdict, motif, id_constat_remplace, praticien_email)
         VALUES ($1, $2, 'pose', $3, $4, $5, $6, $7)`,
  values: [id(nom), patient(n), BESOIN, verdict, motif, remplace ? id(remplace) : null, PRATICIEN],
});

const retrait = (nom, n, tete) => ({
  text: `INSERT INTO constats_besoin_praticien (id, id_patient, acte, besoin, id_constat_remplace, praticien_email)
         VALUES ($1, $2, 'retrait', $3, $4, $5)`,
  values: [id(nom), patient(n), BESOIN, id(tete), PRATICIEN],
});

const pieceResultat = (nom, n, constat, resultat) => ({
  text: `INSERT INTO pieces_constats_besoin_praticien (id, id_constat, id_patient, id_resultat) VALUES ($1, $2, $3, $4)`,
  values: [id(nom), id(constat), patient(n), id(resultat)],
});

const pieceReponse = (nom, n, constat, reponse) => ({
  text: `INSERT INTO pieces_constats_besoin_praticien (id, id_constat, id_patient, id_questionnaire_reponse) VALUES ($1, $2, $3, $4)`,
  values: [id(nom), id(constat), patient(n), id(reponse)],
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

/** Les constats commis sur le besoin du dossier d'une course, dans l'ordre. */
async function actes(observateur, n) {
  const { rows } = await observateur.query(
    `SELECT id, acte FROM constats_besoin_praticien WHERE id_patient = $1 AND besoin = $2 ORDER BY ordre`,
    [patient(n), BESOIN],
  );
  return rows.map(r => `${r.acte}:${r.id.slice(0, -RUN.length - 1)}`);
}

/** Une transaction entière : BEGIN, les instructions, COMMIT ; l'erreur, ou null. */
async function transaction(client, instructions, debut = 'BEGIN') {
  try {
    await client.query(debut);
    for (const instruction of instructions) await client.query(instruction);
    await client.query('COMMIT');
    return null;
  } catch (err) {
    await client.query('ROLLBACK');
    return err;
  }
}

let observateur;

before(async () => {
  ({ client: observateur } = await session());
  const err = await transaction(observateur, [
    ...COURSES.map(n => ({
      text: `INSERT INTO patients (id, id_patient, email, prenom, nom, praticien_email, updated_at)
             VALUES ($1, $2, $3, 'Michel', 'Dogné', $4, CURRENT_TIMESTAMP)`,
      values: [id(`pat_banc_cb_${n}`), patient(n), `michel.dogne+banc-cb-${RUN}-${n}@example.test`, PRATICIEN],
    })),
    {
      text: `INSERT INTO biology_analytes (id, code, libelle, type_prelevement, source_provenance, niveau_completude, updated_at)
             VALUES ($1, $2, 'Analyte de banc', 'sang', 'saisie_praticien', 'partielle', CURRENT_TIMESTAMP)`,
      values: [id('bio_banc_cb'), ANALYTE],
    },
    saisie('res_course4', 4, 4),
    passation('rep_course5', 5),
  ]);
  if (err) throw err;
});

after(async () => {
  // L'ordre de l'effacement nommé du dossier (`patient/effacement.ts`), en
  // une transaction et dossiers compris : la suppression des constats n'est
  // admise qu'avec eux. La connexion se ferme quoi qu'il arrive.
  const par = [PATIENTS];
  try {
    const err = await transaction(observateur, [
      { text: 'DELETE FROM pieces_constats_besoin_praticien WHERE id_patient = ANY($1)', values: par },
      { text: 'DELETE FROM constats_besoin_praticien WHERE id_patient = ANY($1)', values: par },
      { text: 'DELETE FROM questionnaire_reponses WHERE id_patient = ANY($1)', values: par },
      { text: 'DELETE FROM resultats_biologiques WHERE id_patient = ANY($1)', values: par },
      { text: 'DELETE FROM patients WHERE id_patient = ANY($1)', values: par },
      { text: 'DELETE FROM biology_analytes WHERE code = $1', values: [ANALYTE] },
    ]);
    if (err) throw err;
  } finally {
    await observateur.end();
  }
});

describe('Constats sur un besoin sans score — deux sessions (D-347, t40)', () => {
  it('1. deux premières poses concurrentes : la seconde attend, puis est refusée — une seule tête', async () => {
    const a = await session();
    const b = await session();
    try {
      await a.client.query('BEGIN');
      await a.client.query(pose('c1_a', 1));
      const enVol = b.client.query(pose('c1_b', 1)).then(() => null, err => err);
      await attendreBloquee(observateur, b.pid);
      await a.client.query('COMMIT');
      const refus = await enVol;
      assert.ok(refus, 'la seconde pose est passée : deux constats en vigueur sur un besoin.');
      assert.match(refus.message, /porte un constat en vigueur/);
      assert.deepEqual(await actes(observateur, 1), ['pose:c1_a']);
    } finally {
      await a.client.end();
      await b.client.end();
    }
  });

  it('2. un remplacement puis un retrait concurrent de la même tête : le retrait attend, puis est refusé', async () => {
    const a = await session();
    const b = await session();
    try {
      assert.equal(await transaction(observateur, [pose('c2_tete', 2)]), null);
      await a.client.query('BEGIN');
      await a.client.query(pose('c2_remplace', 2, { remplace: 'c2_tete' }));
      const enVol = b.client.query(retrait('r2', 2, 'c2_tete')).then(() => null, err => err);
      await attendreBloquee(observateur, b.pid);
      await a.client.query('COMMIT');
      const refus = await enVol;
      assert.ok(refus, 'le retrait est passé sur une tête déjà remplacée.');
      assert.match(refus.message, /seul le constat en vigueur/);
      assert.deepEqual(await actes(observateur, 2), ['pose:c2_tete', 'pose:c2_remplace']);
    } finally {
      await a.client.end();
      await b.client.end();
    }
  });

  it('3. une pièce après le COMMIT de son constat est refusée ; un « à soutenir » sans pièce passe', async () => {
    const b = await session();
    try {
      assert.equal(await transaction(observateur, [pose('c3', 3), passation('rep_course3', 3)]), null);
      const tardive = await transaction(b.client, [pieceReponse('p3', 3, 'c3', 'rep_course3')]);
      assert.ok(tardive, 'une pièce s’est ajoutée à un constat déjà commis.');
      assert.match(tardive.message, /dans la transaction qui le pose/);
      const sansPiece = await transaction(b.client, [
        pose('c3_sout', 3, { verdict: 'a_soutenir', motif: null, remplace: 'c3' }),
      ]);
      assert.equal(sansPiece, null, 'un « à soutenir » sans pièce a été refusé : les pièces sont facultatives.');
      assert.deepEqual(await actes(observateur, 3), ['pose:c3', 'pose:c3_sout']);
    } finally {
      await b.client.end();
    }
  });

  it('4. une correction puis une pièce concurrente sur la même ligne : la pièce attend, puis est refusée', async () => {
    const a = await session();
    const b = await session();
    try {
      await a.client.query('BEGIN');
      await a.client.query(correction('cor_course4', 4, 'res_course4', 4));
      await b.client.query('BEGIN');
      await b.client.query(pose('c4', 4, { verdict: 'non_retenu', motif: 'non_ressorti_entretien' }));
      const enVol = b.client.query(pieceResultat('p4', 4, 'c4', 'res_course4')).then(() => null, err => err);
      await attendreBloquee(observateur, b.pid);
      await a.client.query('COMMIT');
      const refus = await enVol;
      await b.client.query('ROLLBACK');
      assert.ok(refus, 'la pièce est passée sur une ligne que la correction concurrente supplante.');
      assert.match(refus.message, /a été corrigé ; seule la tête du fil se cite/);
      assert.deepEqual(await actes(observateur, 4), []);
    } finally {
      await a.client.end();
      await b.client.end();
    }
  });

  it('5. une invalidation puis une pièce concurrente sur la même passation : la pièce attend, puis est refusée', async () => {
    const a = await session();
    const b = await session();
    try {
      await a.client.query('BEGIN');
      await a.client.query({
        text: `UPDATE questionnaire_reponses SET statut_validite = 'INVALID' WHERE id = $1`,
        values: [id('rep_course5')],
      });
      await b.client.query('BEGIN');
      await b.client.query(pose('c5', 5, { verdict: 'non_retenu', motif: 'non_ressorti_entretien' }));
      const enVol = b.client.query(pieceReponse('p5', 5, 'c5', 'rep_course5')).then(() => null, err => err);
      await attendreBloquee(observateur, b.pid);
      await a.client.query('COMMIT');
      const refus = await enVol;
      await b.client.query('ROLLBACK');
      assert.ok(refus, 'la pièce est passée sur une passation que l’invalidation concurrente exclut.');
      assert.match(refus.message, /exclue du raisonnement \(INVALID\)/);
      assert.deepEqual(await actes(observateur, 5), []);
    } finally {
      await a.client.end();
      await b.client.end();
    }
  });

  it('6. REPEATABLE READ est refusé par la base', async () => {
    const b = await session();
    try {
      const refus = await transaction(b.client, [pose('c6', 6)], 'BEGIN ISOLATION LEVEL REPEATABLE READ');
      assert.ok(refus, 'une pose en REPEATABLE READ est passée.');
      assert.match(refus.message, /constat sur un besoin refusé en REPEATABLE READ/);
      assert.deepEqual(await actes(observateur, 6), []);
    } finally {
      await b.client.end();
    }
  });

  it('7. l’effacement contre une pose : la pose attend le dossier, sans interblocage, puis passe', async () => {
    const a = await session();
    const b = await session();
    try {
      // Le premier geste de `effacerDossier` : le dossier verrouillé. Si la
      // pose verrouillait le besoin AVANT le dossier, un effacement qui
      // l'attendrait pendant qu'elle attend le dossier interbloquerait.
      await a.client.query('BEGIN');
      await a.client.query('SELECT 1 FROM patients WHERE id_patient = $1 FOR UPDATE', [patient(7)]);
      const enVol = b.client.query(pose('c7', 7)).then(() => null, err => err);
      await attendreBloquee(observateur, b.pid);
      await a.client.query('ROLLBACK');
      assert.equal(await enVol, null, 'la pose a échoué après l’effacement annulé (interblocage ?).');
      assert.deepEqual(await actes(observateur, 7), ['pose:c7']);
    } finally {
      await a.client.end();
      await b.client.end();
    }
  });

  it('8. une suppression hors effacement, dossier conservé, est refusée au COMMIT', async () => {
    const b = await session();
    try {
      assert.equal(await transaction(observateur, [pose('c8', 8)]), null);
      const refus = await transaction(b.client, [
        { text: 'DELETE FROM constats_besoin_praticien WHERE id = $1', values: [id('c8')] },
      ]);
      assert.ok(refus, 'un constat a été supprimé alors que son dossier demeure.');
      assert.match(refus.message, /suppression refusée/);
      assert.deepEqual(await actes(observateur, 8), ['pose:c8']);
    } finally {
      await b.client.end();
    }
  });
});
