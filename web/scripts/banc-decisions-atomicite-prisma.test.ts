// BANC DE L'ATOMICITÉ DES DÉCISIONS CONTRE POSTGRESQL — BIO-INGEST,
// `deciderLignes` (`lib/biology-library/import/decisions.ts`).
//
// POURQUOI CE FICHIER EXISTE. La contre-revue par mutations du 2026-11-07
// (M2, lot d25-b2) a créé le résultat sur le client GLOBAL au lieu du client
// de la transaction : les 32 tests unitaires sont restés verts, leur double
// passant le client global à la transaction. Avec un vrai client, ce résultat
// serait commis à part, et un refus ultérieur laisserait une mesure au dossier
// sans ligne qui la désigne. Le test unitaire exige désormais les écritures
// sur `tx` ; ce banc joue le VRAI code (client Prisma et adaptateur `pg` de
// production) contre la vraie base :
//
//   1. UN REFUS APRÈS LA CRÉATION : une autre session tient la ligne
//      (`FOR UPDATE`). La décision passe sa relecture sous le verrou (un
//      SELECT, que le verrou de ligne ne bloque pas), crée le résultat, puis
//      BLOQUE sur la mise à jour de la ligne. Le banc constate l'attente,
//      l'autre session écarte la ligne et commet : la mise à jour ne trouve
//      plus de ligne proposée (`count !== 1`). Attendu : `ligne_deja_traitee`,
//      aucun résultat au dossier, la ligne écartée par l'autre session et ne
//      désignant aucun résultat, le document intact ;
//   2. LE TÉMOIN : la même décision, sans course, passe (résultat créé, ligne
//      validée, document purgé). Sans lui, le cas 1 pourrait être vert pour
//      une autre raison qu'un refus après la création.
//
// LA COURSE EST FORCÉE, PAS ESPÉRÉE : l'attente se constate dans
// `pg_stat_activity`, depuis une session d'OBSERVATION distincte.
//
// ÉCRIT EN BASE ET COMMET : base NOMMÉE (`WN_BIO_DECISIONS_BANC_BASE`) et
// LOCALE, fixtures effacées à la fin. Lancé par
// `node prisma/runWithAlias.js scripts/banc-decisions-atomicite-prisma.test.ts`
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
if (process.env.WN_BIO_DECISIONS_BANC_BASE !== cible.pathname.slice(1)) {
  throw new Error(`REFUS : DATABASE_URL vise « ${cible.pathname.slice(1)} », WN_BIO_DECISIONS_BANC_BASE ne l'annonce pas.`);
}
// Avec le pool d'UNE connexion par défaut, une écriture faite hors de la
// transaction attendrait la connexion que la transaction tient : elle
// échouerait avec elle, et la faute passerait inaperçue. Posé AVANT l'import
// du client Prisma.
process.env.DB_POOL_MAX = '4';

const RUN = randomBytes(4).toString('hex');
const PATIENT = `PAT_BANC_DEC_${RUN}`;
const PRATICIEN = 'praticien@wellneuro.fr';
const ANALYTE = `BIO_BANC_DEC_${RUN.toUpperCase()}`;
const PRELEVE = '2026-09-01T06:30:00.000Z';

/** Un compte rendu, son extraction terminée et une ligne proposée. */
async function poserExtraction(c: pg.Client, cas: string) {
  const cr = `cr_banc_dec_${cas}_${RUN}`;
  const imp = `imp_banc_dec_${cas}_${RUN}`;
  const ligne = `lig_banc_dec_${cas}_${RUN}`;
  await c.query('BEGIN');
  await c.query(
    `INSERT INTO comptes_rendus_biologiques (id, id_patient, contenu, type_mime, empreinte_sha256, depose_par)
     VALUES ($1, $2, convert_to($3, 'UTF8'), 'application/pdf', encode(sha256(convert_to($3, 'UTF8')), 'hex'), $4)`,
    [cr, PATIENT, `banc ${cas} ${RUN}`, PRATICIEN],
  );
  await c.query(
    `INSERT INTO imports_biologiques (id, id_patient, id_compte_rendu, modele, version_prompt, lance_par)
     VALUES ($1, $2, $3, 'modele-banc', 'bio-extraction-v3', $4)`,
    [imp, PATIENT, cr, PRATICIEN],
  );
  await c.query(
    `INSERT INTO lignes_biologiques_candidates
       (id, id_patient, id_import, rang, page, libelle_lu, valeur_lue, unite_lue, preleve_le_lu, heure_lue, statut_mapping)
     VALUES ($1, $2, $3, 1, 1, 'Libellé', '1', 'mg/L', $4, true, 'inconnu')`,
    [ligne, PATIENT, imp, new Date(PRELEVE)],
  );
  // La base date elle-même la fin de l'extraction (trigger).
  await c.query(`UPDATE imports_biologiques SET statut = 'extrait', termine_le = CURRENT_TIMESTAMP WHERE id = $1`, [imp]);
  await c.query('COMMIT');
  // Le résultat doit être saisi APRÈS la fin de l'extraction (trigger des lignes).
  await new Promise(r => setTimeout(r, 20));
  return { cr, imp, ligne };
}

async function etat(c: pg.Client, x: { cr: string; ligne: string }) {
  const resultats = await c.query('SELECT count(*)::int AS n FROM resultats_biologiques WHERE id_patient = $1', [PATIENT]);
  const ligne = await c.query('SELECT statut, id_resultat FROM lignes_biologiques_candidates WHERE id = $1', [x.ligne]);
  const doc = await c.query('SELECT contenu IS NOT NULL AS present, motif_purge FROM comptes_rendus_biologiques WHERE id = $1', [x.cr]);
  return { resultats: resultats.rows[0].n as number, ligne: ligne.rows[0], document: doc.rows[0] };
}

/**
 * Attend que la mise à jour de la ligne par la décision soit bloquée sur un
 * verrou. `c` est une session d'OBSERVATION, hors transaction : dans la
 * transaction qui tient le verrou, `pg_stat_activity` est figée à sa première
 * lecture et ne verrait jamais l'attente.
 */
async function attendreMiseAJourBloquee(c: pg.Client) {
  const limite = Date.now() + 10_000;
  while (Date.now() < limite) {
    const { rows } = await c.query(
      `SELECT count(*)::int AS n FROM pg_stat_activity
       WHERE datname = current_database() AND wait_event_type = 'Lock'
         AND query ILIKE 'UPDATE%lignes_biologiques_candidates%'`,
    );
    if (rows[0].n >= 1) return;
    await new Promise(r => setTimeout(r, 25));
  }
  assert.fail('La mise à jour de la ligne devait attendre le verrou de l’autre session : la course n’a pas eu lieu.');
}

async function main() {
  const { prisma } = await import('@/lib/prisma');
  const { deciderLignes } = await import('@/lib/biology-library/import/decisions');
  const c = new pg.Client({ connectionString: URL_BASE });
  const verrou = new pg.Client({ connectionString: URL_BASE });
  await c.connect();
  await verrou.connect();
  try {
    await c.query(
      `INSERT INTO patients (id, id_patient, email, prenom, nom, praticien_email, updated_at)
       VALUES ($1, $2, $3, 'Sophie', 'Nicola', $4, CURRENT_TIMESTAMP)`,
      [`pat_banc_dec_${RUN}`, PATIENT, `sophie.nicola+banc-${RUN}@example.test`, PRATICIEN],
    );
    await c.query(
      `INSERT INTO biology_analytes (id, code, libelle, type_prelevement, source_provenance, niveau_completude, unite, updated_at)
       VALUES ($1, $2, 'Analyte de banc', 'sang', 'saisie_praticien', 'partielle', 'mg/L', CURRENT_TIMESTAMP)`,
      [`bio_banc_dec_${RUN}`, ANALYTE],
    );
    const decider = (x: { imp: string; ligne: string }) => deciderLignes({
      idPatient: PATIENT,
      idImport: x.imp,
      traitePar: PRATICIEN,
      decisions: [{ idLigne: x.ligne, decision: 'valider', analyteCode: ANALYTE, valeur: '1', preleveLe: PRELEVE }],
    });

    // 1. Le refus tombe APRÈS la création du résultat.
    const course = await poserExtraction(c, 'course');
    await verrou.query('BEGIN');
    await verrou.query('SELECT id FROM lignes_biologiques_candidates WHERE id = $1 FOR UPDATE', [course.ligne]);
    const enVol = decider(course);
    try {
      await attendreMiseAJourBloquee(c);
      await verrou.query(
        `UPDATE lignes_biologiques_candidates SET statut = 'ecartee', motif_ecart = 'ecartee_par_praticien', traite_par = $1
         WHERE id = $2`,
        [PRATICIEN, course.ligne],
      );
      await verrou.query('COMMIT');
    } catch (err) {
      await verrou.query('ROLLBACK');
      await enVol;
      throw err;
    }
    const issue1 = await enVol;
    assert.equal(issue1.ok === false && issue1.reason, 'ligne_deja_traitee', `1 : ${JSON.stringify(issue1)}`);
    const apres1 = await etat(c, course);
    assert.equal(apres1.resultats, 0, '1 : un résultat reste au dossier — il a été écrit hors de la transaction.');
    assert.deepEqual(apres1.ligne, { statut: 'ecartee', id_resultat: null }, '1 : la ligne ne porte pas le seul écart de l’autre session.');
    assert.deepEqual(apres1.document, { present: true, motif_purge: null }, '1 : le document a été touché.');
    console.log('ok 1 - un refus après la création annule tout : aucun résultat, ligne non rattachée, document intact');

    // 2. Le témoin : la même décision, sans course, passe.
    const temoin = await poserExtraction(c, 'temoin');
    const issue2 = await decider(temoin);
    assert.deepEqual(issue2, { ok: true, validees: 1, ecartees: 0, documentPurge: true }, `2 : ${JSON.stringify(issue2)}`);
    const apres2 = await etat(c, temoin);
    assert.equal(apres2.resultats, 1, '2 : le résultat du témoin manque.');
    assert.equal(apres2.ligne.statut, 'validee');
    assert.ok(apres2.ligne.id_resultat, '2 : la ligne validée ne désigne aucun résultat.');
    assert.deepEqual(apres2.document, { present: false, motif_purge: 'lignes_decidees' });
    console.log('ok 2 - le témoin : la même décision, sans course, passe');
  } finally {
    // L'ordre de l'effacement nommé du dossier (`patient/effacement.ts`).
    try {
      const par = [PATIENT];
      await c.query('BEGIN');
      await c.query('DELETE FROM lignes_biologiques_candidates WHERE id_patient = $1', par);
      await c.query('DELETE FROM imports_biologiques WHERE id_patient = $1', par);
      await c.query('DELETE FROM comptes_rendus_biologiques WHERE id_patient = $1', par);
      await c.query('DELETE FROM resultats_biologiques WHERE id_patient = $1', par);
      await c.query('DELETE FROM patients WHERE id_patient = $1', par);
      await c.query('DELETE FROM biology_analytes WHERE code = $1', [ANALYTE]);
      await c.query('COMMIT');
    } finally {
      await verrou.end();
      await c.end();
      await prisma.$disconnect();
    }
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
