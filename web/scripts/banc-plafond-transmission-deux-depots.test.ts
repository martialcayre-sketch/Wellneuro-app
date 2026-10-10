// BANC DU PLAFOND DES TRANSMISSIONS PATIENT CONTRE POSTGRESQL ([[D-269]] §5,
// BIO-INGEST LOT-11) — deux dépôts simultanés ne franchissent pas le plafond
// de 3 documents « en attente » ou « reçus » non purgés.
//
// POURQUOI UN BANC SUR BASE RÉELLE. Le plafond n'est PAS tenu par la base
// (la migration `bio_ingest_transmission_patient_v1` le renvoie au code) : il
// tient au VERROU CONSULTATIF que `deposerTransmission` prend sur le dossier,
// sous lequel il rejuge les plafonds. Les bancs de route ne l'éprouvent que
// sur des mocks ; celui-ci joue le VRAI écrivain (client Prisma et adaptateur
// `pg` de production).
//
// LA COURSE EST FORCÉE, PAS ESPÉRÉE. Le dossier porte déjà 2 documents. Une
// troisième session tient le verrou consultatif du dossier : les deux dépôts
// ouvrent leur transaction et BLOQUENT tous deux sur
// `pg_advisory_xact_lock`. Le banc constate les deux attentes avant de
// relâcher. L'un commet ; l'autre, qui rejuge sous le verrou, voit le
// troisième document et rend `plafond_en_attente` — jamais un 4e, jamais une
// exception. Le témoin (étape 1) montre ce que vaudrait le seul contrôle
// préalable de la route : il laisse passer les deux.
//
// ÉCRIT EN BASE ET COMMET : base NOMMÉE (`WN_BIO_PORTAIL_BANC_BASE`) et
// LOCALE, fixtures effacées à la fin. Lancé par
// `node prisma/runWithAlias.js scripts/banc-plafond-transmission-deux-depots.test.ts`
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
if (process.env.WN_BIO_PORTAIL_BANC_BASE !== cible.pathname.slice(1)) {
  throw new Error(`REFUS : DATABASE_URL vise « ${cible.pathname.slice(1)} », WN_BIO_PORTAIL_BANC_BASE ne l'annonce pas.`);
}
// Un pool d'UNE connexion (le défaut) sérialiserait les deux dépôts : il n'y
// aurait pas de course. Posé AVANT l'import du client Prisma.
process.env.DB_POOL_MAX = '4';

const RUN = randomBytes(4).toString('hex');
const PATIENT = `PAT_BANC_PLAF_${RUN}`;
const PRATICIEN = 'praticien@wellneuro.fr';
const CLE_VERROU = `bio_ingest_transmission:${PATIENT}`;

async function poserFixtures(c: pg.Client) {
  await c.query('BEGIN');
  await c.query(
    `INSERT INTO patients (id, id_patient, email, prenom, nom, praticien_email, updated_at)
     VALUES ($1, $2, $3, 'Jennifer', 'Martin', $4, CURRENT_TIMESTAMP)`,
    [`pat_banc_plaf_${RUN}`, PATIENT, `jennifer.martin+banc-plafond-${RUN}@example.test`, PRATICIEN],
  );
  // Deux documents transmis, non purgés, sans ligne validée : il reste UNE place.
  for (const rang of [1, 2]) {
    await c.query(
      `INSERT INTO comptes_rendus_biologiques (id, id_patient, contenu, type_mime, empreinte_sha256, origine, depose_par)
       VALUES ($1, $2, convert_to($3, 'UTF8'), 'application/pdf', encode(sha256(convert_to($3, 'UTF8')), 'hex'), 'patient', NULL)`,
      [`cr_banc_plaf_${RUN}_${rang}`, PATIENT, `banc plafond ${RUN} ${rang}`],
    );
  }
  await c.query('COMMIT');
}

async function effacerFixtures(c: pg.Client) {
  const par = [PATIENT];
  await c.query('BEGIN');
  await c.query('DELETE FROM comptes_rendus_biologiques WHERE id_patient = $1', par);
  await c.query('DELETE FROM patients WHERE id_patient = $1', par);
  await c.query('COMMIT');
}

/**
 * Attend que `n` sessions soient bloquées sur le verrou consultatif.
 * `c` est une session d'OBSERVATION, hors transaction : dans une transaction,
 * `pg_stat_activity` est figée à sa première lecture et ne verrait jamais
 * l'attente.
 */
async function attendreDepotsBloques(c: pg.Client, n: number) {
  const limite = Date.now() + 10_000;
  while (Date.now() < limite) {
    const { rows } = await c.query(
      `SELECT count(*)::int AS n FROM pg_stat_activity
       WHERE datname = current_database() AND wait_event_type = 'Lock'
         AND query ILIKE '%pg_advisory_xact_lock%'`,
    );
    if (rows[0].n >= n) return;
    await new Promise(r => setTimeout(r, 25));
  }
  assert.fail(`${n} dépôts devaient attendre le verrou du dossier : la course n'a pas eu lieu.`);
}

function pdf(contenu: string): Buffer {
  return Buffer.from(`%PDF-1.4\n% banc plafond ${RUN} ${contenu}\n%%EOF\n`, 'utf8');
}

async function main() {
  const { deposerTransmission, jugerPlafonds } = await import('@/lib/biology-library/import/transmission');
  const { prisma } = await import('@/lib/prisma');
  const verrou = new pg.Client({ connectionString: URL_BASE });
  const observateur = new pg.Client({ connectionString: URL_BASE });
  await verrou.connect();
  await observateur.connect();
  let verrouTenu = false;
  try {
    await poserFixtures(verrou);

    // 1. Témoin : le contrôle préalable de la route, hors verrou, laisse
    //    passer deux envois — c'est le rejugement sous verrou qui doit tenir.
    const prealables = await Promise.all([jugerPlafonds(PATIENT), jugerPlafonds(PATIENT)]);
    assert.deepEqual(prealables, [{ ok: true }, { ok: true }], `le contrôle préalable devait passer deux fois : ${JSON.stringify(prealables)}`);
    console.log('ok 1 — témoin : le contrôle préalable, hors verrou, admet les deux envois');

    // 2. Deux dépôts simultanés pour la dernière place.
    await verrou.query('SELECT pg_advisory_lock(hashtext($1))', [CLE_VERROU]);
    verrouTenu = true;
    const enVol = [
      deposerTransmission({ idPatient: PATIENT, octets: pdf('a'), typeMime: 'application/pdf' }),
      deposerTransmission({ idPatient: PATIENT, octets: pdf('b'), typeMime: 'application/pdf' }),
    ];
    try {
      await attendreDepotsBloques(observateur, 2);
    } finally {
      // Relâcher puis ATTENDRE les deux dépôts, même en échec : un dépôt
      // encore en vol commettrait pendant le nettoyage.
      await verrou.query('SELECT pg_advisory_unlock(hashtext($1))', [CLE_VERROU]);
      verrouTenu = false;
      await Promise.allSettled(enVol);
    }
    const issues = await Promise.all(enVol);
    assert.equal(issues.filter(i => i.ok).length, 1, `un seul dépôt devait passer : ${JSON.stringify(issues)}`);
    assert.deepEqual(
      issues.filter(i => !i.ok).map(i => !i.ok && i.reason),
      ['plafond_en_attente'],
      `le refus doit être nommé : ${JSON.stringify(issues)}`,
    );
    console.log('ok 2 — deux dépôts simultanés pour la dernière place : un dépôt, un « plafond_en_attente »');

    const { rows } = await verrou.query(
      `SELECT count(*)::int AS n FROM comptes_rendus_biologiques
       WHERE id_patient = $1 AND origine = 'patient' AND purge_le IS NULL`,
      [PATIENT],
    );
    assert.deepEqual(rows, [{ n: 3 }]);
    console.log('ok 3 — le dossier porte exactement 3 documents non purgés');
  } finally {
    try {
      if (verrouTenu) await verrou.query('SELECT pg_advisory_unlock(hashtext($1))', [CLE_VERROU]).catch(() => {});
      await verrou.query('ROLLBACK').catch(() => {});
      await effacerFixtures(verrou);
    } finally {
      await verrou.end();
      await observateur.end();
      await prisma.$disconnect();
    }
  }
}

main().catch(err => {
  console.error('ÉCHEC du banc du plafond des transmissions :', err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
