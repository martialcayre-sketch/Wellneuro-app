// BANC À DEUX SESSIONS — la naissance d'un lien magique contre la fermeture du
// dossier (t16, écart résiduel n° 3 de [[D-126]]).
//
// POURQUOI CE FICHIER EXISTE. `api/portail/lien/demande` lit l'éligibilité du
// dossier AVANT sa transaction. Sous contention du verrou consultatif du
// patient, une désactivation pouvait commettre entre cette lecture et la
// création : elle fermait les liens en vol, pas celui qui naissait après elle.
// Le correctif relit l'éligibilité DANS la transaction, sous `FOR SHARE` sur la
// ligne du dossier (`lib/portail/emissionSurDemande.ts`). Ce banc joue le VRAI
// écrivain (`emettreLienSurDemande`, client Prisma de production) contre
// PostgreSQL ; les gestes praticien sont rejoués en SQL, dans l'ordre de leurs
// routes (ligne du dossier d'abord, puis les liens).
//
//   1. LA COURSE RÉSIDUELLE ELLE-MÊME : la demande attend le verrou consultatif
//      (tenu par une troisième session) ; la désactivation commet pendant
//      l'attente. Avant le correctif, le lien naissait ouvert ; ici, refus.
//   2. DÉSACTIVATION EN COURS : la ligne du dossier est verrouillée par la
//      désactivation non commise ; la demande attend sur `FOR SHARE`, puis lit
//      le dossier fermé — refus, aucun lien.
//   3. RÉVOCATION ANNULÉE : même attente, mais la révocation est annulée — la
//      demande passe et le lien naît. La relecture attend, elle ne refuse pas
//      par excès.
//   4. RÉVOCATION COMMISE pendant l'attente de la relecture : refus.
//   5. DEMANDE D'ABORD : la demande tient la ligne du dossier (`FOR SHARE`) et
//      sa création est retenue par un tiers (`LOCK TABLE … IN SHARE MODE`) ; la
//      désactivation attend la ligne ; tout se relâche — le lien naît, puis la
//      désactivation le FERME (son `UPDATE`, instruction suivante, le voit).
// Chaque course constate d'abord que la demande est BLOQUÉE (`pg_stat_activity`,
// lue depuis une session hors transaction) : sans ce constat, une course
// « gagnée » ne prouverait rien.
//
// ÉCRIT EN BASE ET COMMET : base NOMMÉE (`WN_PORTAIL_LIEN_BANC_BASE`) et
// LOCALE, fixtures effacées à la fin. Lancé par
// `node prisma/runWithAlias.js scripts/banc-naissance-lien-deux-sessions.test.ts`
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
if (process.env.WN_PORTAIL_LIEN_BANC_BASE !== cible.pathname.slice(1)) {
  throw new Error(`REFUS : DATABASE_URL vise « ${cible.pathname.slice(1)} », WN_PORTAIL_LIEN_BANC_BASE ne l'annonce pas.`);
}
// Un pool d'UNE connexion sérialiserait tout : posé AVANT l'import du client.
process.env.DB_POOL_MAX = '4';
// Le jeton se hache avec ce secret (`empreinteJeton`) ; un secret de banc s'il manque.
process.env.NEXTAUTH_SECRET ??= 'secret-de-banc-non-production';

const RUN = randomBytes(4).toString('hex');
const PATIENT = `PAT_BANC_LIEN_${RUN}`;
const PRATICIEN = 'praticien@wellneuro.fr';

async function poserFixtures(c: pg.Client) {
  await c.query(
    `INSERT INTO patients (id, id_patient, email, prenom, nom, praticien_email, updated_at)
     VALUES ($1, $2, $3, 'Jennifer', 'Martin', $4, CURRENT_TIMESTAMP)`,
    [`pat_banc_lien_${RUN}`, PATIENT, `jennifer.martin+banc-lien-${RUN}@example.test`, PRATICIEN],
  );
}

async function effacerFixtures(c: pg.Client) {
  await c.query('BEGIN');
  await c.query('DELETE FROM portail_magic_links WHERE id_patient = $1', [PATIENT]);
  await c.query('DELETE FROM patients WHERE id_patient = $1', [PATIENT]);
  await c.query('COMMIT');
}

async function rouvrirDossier(c: pg.Client) {
  await c.query('UPDATE patients SET actif = true, access_token_revoked = false WHERE id_patient = $1', [PATIENT]);
}

async function nombreDeLiens(c: pg.Client): Promise<number> {
  const { rows } = await c.query('SELECT count(*)::int AS n FROM portail_magic_links WHERE id_patient = $1', [PATIENT]);
  return rows[0].n;
}

/** Attend qu'une session soit bloquée sur un verrou, sur une requête qui contient `motif`. */
async function attendreBlocage(observateur: pg.Client, motif: string) {
  const limite = Date.now() + 10_000;
  while (Date.now() < limite) {
    const { rows } = await observateur.query(
      `SELECT count(*)::int AS n FROM pg_stat_activity
       WHERE datname = current_database() AND wait_event_type = 'Lock' AND query ILIKE $1`,
      [`%${motif}%`],
    );
    if (rows[0].n >= 1) return;
    await new Promise(r => setTimeout(r, 25));
  }
  assert.fail(`la demande devait attendre sur « ${motif} » : la course n'a pas eu lieu.`);
}

/** La désactivation, dans l'ordre de `api/praticien/patients` PATCH : dossier, puis liens. */
async function desactiver(c: pg.Client) {
  await c.query('SELECT 1 FROM patients WHERE id_patient = $1 FOR UPDATE', [PATIENT]);
  await c.query('UPDATE patients SET actif = false WHERE id_patient = $1', [PATIENT]);
  await c.query(
    `UPDATE portail_magic_links SET expire_le = now()
     WHERE id_patient = $1 AND consomme_le IS NULL AND expire_le > now()`,
    [PATIENT],
  );
}

async function main() {
  const { emettreLienSurDemande } = await import('@/lib/portail/emissionSurDemande');
  const { prisma } = await import('@/lib/prisma');
  const tiers = new pg.Client({ connectionString: URL_BASE });
  const geste = new pg.Client({ connectionString: URL_BASE });
  const observateur = new pg.Client({ connectionString: URL_BASE });
  await Promise.all([tiers.connect(), geste.connect(), observateur.connect()]);
  try {
    await poserFixtures(observateur);

    // 1. La course résiduelle : désactivation commise PENDANT l'attente du
    //    verrou consultatif.
    await tiers.query('BEGIN');
    await tiers.query('SELECT pg_advisory_xact_lock(74, hashtext($1))', [PATIENT]);
    const enVol1 = emettreLienSurDemande(PATIENT, new Date());
    try {
      await attendreBlocage(observateur, 'pg_advisory_xact_lock');
      await geste.query('BEGIN');
      await desactiver(geste);
      await geste.query('COMMIT');
    } finally {
      await tiers.query('COMMIT');
      await Promise.allSettled([enVol1]);
    }
    assert.deepEqual(await enVol1, { refus: 'dossier_ferme' });
    assert.equal(await nombreDeLiens(observateur), 0, 'aucun lien ne doit naître après la fermeture');
    console.log('ok 1 — désactivation commise pendant l’attente du verrou consultatif : refus, aucun lien');

    // 2. Désactivation EN COURS : la demande attend la ligne du dossier.
    await rouvrirDossier(observateur);
    await geste.query('BEGIN');
    await desactiver(geste);
    const enVol2 = emettreLienSurDemande(PATIENT, new Date());
    try {
      await attendreBlocage(observateur, 'access_token_revoked FROM patients');
      await geste.query('COMMIT');
    } finally {
      await geste.query('ROLLBACK').catch(() => {});
      await Promise.allSettled([enVol2]);
    }
    assert.deepEqual(await enVol2, { refus: 'dossier_ferme' });
    assert.equal(await nombreDeLiens(observateur), 0);
    console.log('ok 2 — désactivation en cours : la demande attend, puis lit le dossier fermé');

    // 3. Révocation ANNULÉE : la demande attend, puis passe.
    await rouvrirDossier(observateur);
    await geste.query('BEGIN');
    await geste.query('UPDATE patients SET access_token_revoked = true WHERE id_patient = $1', [PATIENT]);
    const enVol3 = emettreLienSurDemande(PATIENT, new Date());
    try {
      await attendreBlocage(observateur, 'access_token_revoked FROM patients');
    } finally {
      await geste.query('ROLLBACK');
      await Promise.allSettled([enVol3]);
    }
    const issue3 = await enVol3;
    assert.ok('jeton' in issue3, `la demande devait passer : ${JSON.stringify(issue3)}`);
    assert.equal(await nombreDeLiens(observateur), 1);
    console.log('ok 3 — révocation annulée : la demande attend, puis le lien naît');

    // 4. Révocation COMMISE, dans l'ordre de `api/praticien/token` DELETE.
    await geste.query('BEGIN');
    await geste.query(
      'UPDATE patients SET access_token_revoked = true, sessions_invalides_avant = now() WHERE id_patient = $1',
      [PATIENT],
    );
    await geste.query(
      `UPDATE portail_magic_links SET expire_le = now()
       WHERE id_patient = $1 AND consomme_le IS NULL AND expire_le > now()`,
      [PATIENT],
    );
    const enVol4 = emettreLienSurDemande(PATIENT, new Date());
    try {
      await attendreBlocage(observateur, 'access_token_revoked FROM patients');
      await geste.query('COMMIT');
    } finally {
      await geste.query('ROLLBACK').catch(() => {});
      await Promise.allSettled([enVol4]);
    }
    assert.deepEqual(await enVol4, { refus: 'dossier_ferme' });
    assert.equal(await nombreDeLiens(observateur), 1, 'seul le lien du cas 3 existe');
    console.log('ok 4 — révocation commise pendant la relecture : refus, aucun lien neuf');

    // 5. Demande D'ABORD : le geste qui suit ferme le lien neuf.
    await rouvrirDossier(observateur);
    await tiers.query('BEGIN');
    await tiers.query('LOCK TABLE portail_magic_links IN SHARE MODE');
    const enVol5 = emettreLienSurDemande(PATIENT, new Date());
    let desactivation: Promise<unknown> | null = null;
    try {
      await attendreBlocage(observateur, 'INSERT INTO "public"."portail_magic_links"');
      await geste.query('BEGIN');
      desactivation = desactiver(geste);
      await attendreBlocage(observateur, 'FOR UPDATE');
    } finally {
      await tiers.query('COMMIT');
      await Promise.allSettled([enVol5, desactivation]);
    }
    await geste.query('COMMIT');
    const issue5 = await enVol5;
    assert.ok('jeton' in issue5, `la demande devait passer : ${JSON.stringify(issue5)}`);
    const { rows: ouverts } = await observateur.query(
      'SELECT count(*)::int AS n FROM portail_magic_links WHERE id_patient = $1 AND expire_le > now()',
      [PATIENT],
    );
    assert.deepEqual(ouverts, [{ n: 0 }], 'la désactivation doit fermer le lien né juste avant elle');
    console.log('ok 5 — demande d’abord : le lien naît, puis la désactivation le ferme');
  } finally {
    try {
      await tiers.query('ROLLBACK').catch(() => {});
      await geste.query('ROLLBACK').catch(() => {});
      await effacerFixtures(observateur);
    } finally {
      await Promise.all([tiers.end(), geste.end(), observateur.end()]);
      await prisma.$disconnect();
    }
  }
}

main().catch(err => {
  console.error('ÉCHEC du banc de la naissance d’un lien :', err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
