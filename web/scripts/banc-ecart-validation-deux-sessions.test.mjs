// BANC À DEUX SESSIONS — l'écart d'un compte rendu transmis par le patient
// contre la validation d'une de ses lignes ([[D-269]], BIO-INGEST LOT-04,
// migration `bio_ingest_transmission_patient_v1`).
//
// POURQUOI CE FICHIER EXISTE. Le contrat SQL
// (`prisma/checks/bio_ingest_transmission_patient_v1_negatif.sql`) joue une
// seule session : il éprouve l'écart PUIS la validation, l'un après l'autre.
// Il ne prouve pas que le `FOR SHARE` du trigger des lignes SÉRIALISE les
// deux écritures — si ce verrou disparaissait, il resterait vert (revue
// Copilot de #1352). Les courses jouées ici, en READ COMMITTED :
//
//   1. ÉCART D'ABORD : la validation ATTEND l'écart en vol, puis est refusée —
//      le document est écarté ;
//   2. VALIDATION D'ABORD : l'écart ATTEND la validation en vol, puis est
//      refusé — une ligne est validée ;
//   3. TÉMOIN de 1 : l'écart en vol est ANNULÉ — la validation attend, puis
//      passe ;
//   4. TÉMOIN de 2 : la validation en vol est ANNULÉE — l'écart attend, puis
//      passe.
// Chaque course constate d'abord que la seconde session est BLOQUÉE sur un
// verrou (`pg_stat_activity`) : sans ce constat, une course « gagnée » ne
// prouverait rien — elle aurait pu se jouer en série. Et chacune finit sur
// l'état de la base : jamais un document écarté qui porte une ligne validée.
//
// ÉCRIT EN BASE, ET COMMET : une course ne se joue pas dans une transaction
// annulée. La base visée doit donc être NOMMÉE (patron du banc des actes de
// lecture) : `WN_BIO_ECART_BANC_BASE` doit égaler le nom de la base de
// `DATABASE_URL`, sur un hôte local. Les fixtures (identité de fixture,
// suffixe propre au run) sont effacées à la fin, dans l'ordre de
// l'effacement nommé du dossier.
//
// LANCÉ PAR `node scripts/banc-ecart-validation-deux-sessions.test.mjs`, pas
// par `node --test` : T3 extrait les `node --test` de ci.yml et les joue AVANT
// d'avoir une base. Il a son propre pas, après les contrats SQL, en CI comme
// en T3.

import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import pg from 'pg';

const URL_BASE = process.env.DATABASE_URL;
if (!URL_BASE) throw new Error('DATABASE_URL est requise.');
const BASE_ATTENDUE = process.env.WN_BIO_ECART_BANC_BASE;
const BASE_REELLE = new URL(URL_BASE).pathname.slice(1);
// Hôte LOCAL seulement (garde-fou de T3) : le banc commet des écritures.
const HOTE = new URL(URL_BASE).hostname;
if (HOTE !== '127.0.0.1' && HOTE !== 'localhost') {
  throw new Error(`REFUS : DATABASE_URL vise l'hôte « ${HOTE} », le banc n'écrit que sur une base locale.`);
}
if (!BASE_ATTENDUE || BASE_ATTENDUE !== BASE_REELLE) {
  throw new Error(
    `REFUS : DATABASE_URL vise « ${BASE_REELLE} », WN_BIO_ECART_BANC_BASE annonce « ${BASE_ATTENDUE ?? ''} ».`,
  );
}

const RUN = randomBytes(4).toString('hex');
const PATIENT = `PAT_BANC_ECT_${RUN}`;
const PRATICIEN = 'praticien@wellneuro.fr';
const ANALYTE = `BIO_BANC_ECT_${RUN.toUpperCase()}`;
const id = nom => `${nom}_${RUN}`;

/** Une course par document : chacun a son import terminé et UNE ligne proposée. */
const COURSES = ['ecart_dabord', 'validation_dabord', 'ecart_annule', 'validation_annulee'];

/** Une session : un client dédié, jamais un pool — l'ordre des instructions est le banc. */
async function session() {
  const client = new pg.Client({ connectionString: URL_BASE });
  await client.connect();
  const { rows } = await client.query('SELECT pg_backend_pid() AS pid');
  return { client, pid: rows[0].pid };
}

const ecart = course => ({
  text: `UPDATE comptes_rendus_biologiques
         SET contenu = NULL, motif_purge = 'ecarte', ecarte_par = $1, motif_ecart = 'document_non_conforme'
         WHERE id = $2`,
  values: [PRATICIEN, id(`cr_${course}`)],
});

const validation = course => ({
  text: `UPDATE lignes_biologiques_candidates SET statut = 'validee', id_resultat = $1, traite_par = $2
         WHERE id = $3`,
  values: [id(`res_${course}`), PRATICIEN, id(`lig_${course}`)],
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
    `SELECT c.motif_purge, c.contenu IS NULL AS purge, l.statut AS ligne
     FROM comptes_rendus_biologiques c
     JOIN imports_biologiques i ON i.id_compte_rendu = c.id
     JOIN lignes_biologiques_candidates l ON l.id_import = i.id
     WHERE c.id = $1`,
    [id(`cr_${course}`)],
  );
  return rows[0];
}

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
     VALUES ($1, $2, $3, 'Michel', 'Dogné', $4, CURRENT_TIMESTAMP)`,
    [id('pat_banc_ect'), PATIENT, `michel.dogne+banc-${RUN}@example.test`, PRATICIEN],
  );
  await q(
    `INSERT INTO biology_analytes (id, code, libelle, type_prelevement, source_provenance, niveau_completude, updated_at)
     VALUES ($1, $2, 'Analyte de banc', 'sang', 'saisie_praticien', 'partielle', CURRENT_TIMESTAMP)`,
    [id('bio_banc_ect'), ANALYTE],
  );
  for (const course of COURSES) {
    await q(
      `INSERT INTO comptes_rendus_biologiques (id, id_patient, contenu, type_mime, empreinte_sha256, origine)
       VALUES ($1, $2, convert_to($3, 'UTF8'), 'application/pdf', encode(sha256(convert_to($3, 'UTF8')), 'hex'), 'patient')`,
      [id(`cr_${course}`), PATIENT, `banc ${RUN} ${course}`],
    );
    await q(
      `INSERT INTO imports_biologiques (id, id_patient, id_compte_rendu, modele, version_prompt, lance_par)
       VALUES ($1, $2, $3, 'modele-banc', 'bio-extraction-v3', $4)`,
      [id(`imp_${course}`), PATIENT, id(`cr_${course}`), PRATICIEN],
    );
    await q(
      `INSERT INTO lignes_biologiques_candidates (id, id_patient, id_import, rang, page, libelle_lu, valeur_lue, statut_mapping)
       VALUES ($1, $2, $3, 1, 1, 'Libellé', '1', 'inconnu')`,
      [id(`lig_${course}`), PATIENT, id(`imp_${course}`)],
    );
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
  for (const [rang, course] of COURSES.entries()) {
    await q(
      `INSERT INTO resultats_biologiques (id, id_patient, analyte_code, valeur, unite, preleve_le, source, saisi_par, saisi_le)
       VALUES ($1, $2, $3, 1, 'mg/L', TIMESTAMP '2026-09-01 08:00:00' + make_interval(days => $4), 'saisie_praticien', $5,
               clock_timestamp() AT TIME ZONE 'UTC')`,
      [id(`res_${course}`), PATIENT, ANALYTE, rang, PRATICIEN],
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

describe('Écart contre validation — deux sessions (D-269, LOT-04)', () => {
  it('1. écart d’abord : la validation attend l’écart, puis est refusée', async () => {
    const refus = await course({ premiere: ecart('ecart_dabord'), seconde: validation('ecart_dabord'), issueA: 'COMMIT' });
    assert.ok(refus, 'la validation est passée après l’écart : une valeur d’un document refusé entre au dossier.');
    assert.match(refus.message, /a été écarté/);
    assert.deepEqual(await etat(observateur, 'ecart_dabord'), { motif_purge: 'ecarte', purge: true, ligne: 'proposee' });
  });

  it('2. validation d’abord : l’écart attend la validation, puis est refusé', async () => {
    const refus = await course({ premiere: validation('validation_dabord'), seconde: ecart('validation_dabord'), issueA: 'COMMIT' });
    assert.ok(refus, 'l’écart est passé sur un document dont une ligne est validée.');
    assert.match(refus.message, /une ligne de ce compte rendu est validée/);
    assert.deepEqual(await etat(observateur, 'validation_dabord'), { motif_purge: null, purge: false, ligne: 'validee' });
  });

  it('3. TÉMOIN : l’écart en vol est annulé — la validation attend, puis passe', async () => {
    const refus = await course({ premiere: ecart('ecart_annule'), seconde: validation('ecart_annule'), issueA: 'ROLLBACK' });
    assert.equal(refus, null, `la validation a été refusée sur un écart annulé (${refus?.message}).`);
    assert.deepEqual(await etat(observateur, 'ecart_annule'), { motif_purge: null, purge: false, ligne: 'validee' });
  });

  it('4. TÉMOIN : la validation en vol est annulée — l’écart attend, puis passe', async () => {
    const refus = await course({ premiere: validation('validation_annulee'), seconde: ecart('validation_annulee'), issueA: 'ROLLBACK' });
    assert.equal(refus, null, `l’écart a été refusé sur une validation annulée (${refus?.message}).`);
    assert.deepEqual(await etat(observateur, 'validation_annulee'), { motif_purge: 'ecarte', purge: true, ligne: 'proposee' });
  });
});
