// BANC DE L'ÉCRIVAIN CONTRE POSTGRESQL — l'acte de lecture d'un import validé
// ([[D-268]], BIO-PARCOURS BP-10), arbitrage du responsable du 2026-10-06.
//
// POURQUOI CE FICHIER EXISTE, À CÔTÉ DU BANC À DEUX SESSIONS. Celui-là joue du
// SQL brut : il prouve que la BASE sérialise. Celui-ci joue le VRAI écrivain
// (`poserActeLecture`, client Prisma et adaptateur `pg` de production) : il
// prouve que deux requêtes simultanées donnent un acte et un refus NOMMÉ —
// jamais deux actes, jamais un 500. Les bancs de route ne l'éprouvent que sur
// des mocks.
//
// LA COURSE EST FORCÉE, PAS ESPÉRÉE. Une troisième session verrouille l'import
// (`FOR SHARE`) : les deux écrivains passent leur relecture préalable (des
// SELECT simples, que le verrou ne bloque pas), puis BLOQUENT tous deux sur
// l'insertion — le trigger prend `FOR NO KEY UPDATE`. Le banc constate les
// deux attentes avant de relâcher. L'un commet ; l'autre est refusé par la
// base, et c'est le chemin « refus → relecture » qui doit le nommer :
//   1. deux lectures → une lecture, un `lecture_deja_active` ;
//   2. deux révocations de la même lecture → une révocation, un
//      `lecture_deja_revoquee` (l'index unique partiel refuse la seconde).
//
// ÉCRIT EN BASE ET COMMET : base NOMMÉE (`WN_BIO_LECTURE_BANC_BASE`) et LOCALE,
// fixtures effacées à la fin. Lancé par
// `node prisma/runWithAlias.js scripts/banc-ecrivain-lecture-deux-requetes.test.ts`
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
if (process.env.WN_BIO_LECTURE_BANC_BASE !== cible.pathname.slice(1)) {
  throw new Error(`REFUS : DATABASE_URL vise « ${cible.pathname.slice(1)} », WN_BIO_LECTURE_BANC_BASE ne l'annonce pas.`);
}
// Un pool d'UNE connexion (le défaut) sérialiserait les deux écrivains : il
// n'y aurait pas de course. Posé AVANT l'import du client Prisma.
process.env.DB_POOL_MAX = '4';

const RUN = randomBytes(4).toString('hex');
const PATIENT = `PAT_BANC_ECR_${RUN}`;
const PRATICIEN = 'praticien@wellneuro.fr';
const ANALYTE = `BIO_BANC_ECR_${RUN.toUpperCase()}`;
const IMPORT = `imp_banc_ecr_${RUN}`;

async function poserFixtures(c: pg.Client) {
  await c.query('BEGIN');
  await c.query(
    `INSERT INTO patients (id, id_patient, email, prenom, nom, praticien_email, updated_at)
     VALUES ($1, $2, $3, 'Jennifer', 'Martin', $4, CURRENT_TIMESTAMP)`,
    [`pat_banc_ecr_${RUN}`, PATIENT, `jennifer.martin+banc-${RUN}@example.test`, PRATICIEN],
  );
  await c.query(
    `INSERT INTO biology_analytes (id, code, libelle, type_prelevement, source_provenance, niveau_completude, updated_at)
     VALUES ($1, $2, 'Analyte de banc', 'sang', 'saisie_praticien', 'partielle', CURRENT_TIMESTAMP)`,
    [`bio_banc_ecr_${RUN}`, ANALYTE],
  );
  await c.query(
    `INSERT INTO comptes_rendus_biologiques (id, id_patient, contenu, type_mime, empreinte_sha256, depose_par)
     VALUES ($1, $2, convert_to($3, 'UTF8'), 'application/pdf', encode(sha256(convert_to($3, 'UTF8')), 'hex'), $4)`,
    [`cr_banc_ecr_${RUN}`, PATIENT, `banc ${RUN}`, PRATICIEN],
  );
  await c.query(
    `INSERT INTO imports_biologiques (id, id_patient, id_compte_rendu, modele, version_prompt, lance_par)
     VALUES ($1, $2, $3, 'modele-banc', 'bio-extraction-v3', $4)`,
    [IMPORT, PATIENT, `cr_banc_ecr_${RUN}`, PRATICIEN],
  );
  await c.query(
    `INSERT INTO lignes_biologiques_candidates (id, id_patient, id_import, rang, page, libelle_lu, valeur_lue, statut_mapping)
     VALUES ($1, $2, $3, 1, 1, 'Libellé', '1', 'inconnu')`,
    [`lig_banc_ecr_${RUN}`, PATIENT, IMPORT],
  );
  await c.query(`UPDATE imports_biologiques SET statut = 'extrait', termine_le = CURRENT_TIMESTAMP WHERE id = $1`, [IMPORT]);
  await c.query('COMMIT');
  // Le résultat est saisi APRÈS la fin de l'extraction (la décision le vérifie).
  await new Promise(r => setTimeout(r, 20));
  await c.query('BEGIN');
  await c.query(
    `INSERT INTO resultats_biologiques (id, id_patient, analyte_code, valeur, unite, preleve_le, source, saisi_par, saisi_le)
     VALUES ($1, $2, $3, 1, 'mg/L', TIMESTAMP '2026-09-01 08:00:00', 'saisie_praticien', $4, clock_timestamp() AT TIME ZONE 'UTC')`,
    [`res_banc_ecr_${RUN}`, PATIENT, ANALYTE, PRATICIEN],
  );
  await c.query(
    `UPDATE lignes_biologiques_candidates SET statut = 'validee', id_resultat = $1, traite_par = $2 WHERE id = $3`,
    [`res_banc_ecr_${RUN}`, PRATICIEN, `lig_banc_ecr_${RUN}`],
  );
  await c.query('COMMIT');
}

async function effacerFixtures(c: pg.Client) {
  // L'ordre de l'effacement nommé du dossier (`patient/effacement.ts`).
  const par = [PATIENT];
  await c.query('BEGIN');
  await c.query('DELETE FROM lectures_imports_biologiques WHERE id_patient = $1', par);
  await c.query('DELETE FROM lignes_biologiques_candidates WHERE id_patient = $1', par);
  await c.query('DELETE FROM imports_biologiques WHERE id_patient = $1', par);
  await c.query('DELETE FROM comptes_rendus_biologiques WHERE id_patient = $1', par);
  await c.query('DELETE FROM resultats_biologiques WHERE id_patient = $1', par);
  await c.query('DELETE FROM patients WHERE id_patient = $1', par);
  await c.query('DELETE FROM biology_analytes WHERE code = $1', [ANALYTE]);
  await c.query('COMMIT');
}

/**
 * Attend que `n` insertions dans la table des actes soient bloquées sur un
 * verrou. `c` est une session d'OBSERVATION, hors transaction : dans la
 * transaction qui tient le verrou, `pg_stat_activity` est figée à sa première
 * lecture et ne verrait jamais l'attente.
 */
async function attendreInsertionsBloquees(c: pg.Client, n: number) {
  const limite = Date.now() + 10_000;
  while (Date.now() < limite) {
    const { rows } = await c.query(
      `SELECT count(*)::int AS n FROM pg_stat_activity
       WHERE datname = current_database() AND wait_event_type = 'Lock'
         AND query ILIKE '%lectures_imports_biologiques%'`,
    );
    if (rows[0].n >= n) return;
    await new Promise(r => setTimeout(r, 25));
  }
  assert.fail(`${n} insertions devaient attendre le verrou de l'import : la course n'a pas eu lieu.`);
}

/** Verrouille l'import, lance deux actes, constate leurs attentes, relâche. */
async function course<T>(
  verrou: pg.Client,
  observateur: pg.Client,
  deux: () => [Promise<T>, Promise<T>],
): Promise<T[]> {
  await verrou.query('BEGIN');
  await verrou.query('SELECT id FROM imports_biologiques WHERE id = $1 FOR SHARE', [IMPORT]);
  const enVol = deux();
  try {
    await attendreInsertionsBloquees(observateur, 2);
  } finally {
    // Relâcher puis ATTENDRE les deux écrivains, même en échec : une
    // insertion encore en vol commettrait pendant le nettoyage.
    await verrou.query('COMMIT');
    await Promise.allSettled(enVol);
  }
  return Promise.all(enVol);
}

async function main() {
  const { poserActeLecture } = await import('@/lib/biology-library/import/acteLecture');
  const { prisma } = await import('@/lib/prisma');
  const verrou = new pg.Client({ connectionString: URL_BASE });
  const observateur = new pg.Client({ connectionString: URL_BASE });
  await verrou.connect();
  await observateur.connect();
  try {
    await poserFixtures(verrou);
    const entree = { idPatient: PATIENT, idImport: IMPORT, praticienEmail: PRATICIEN };

    // 1. Deux lectures.
    const lectures = await course(verrou, observateur, () => [
      poserActeLecture({ ...entree, demande: { acte: 'lecture' } }),
      poserActeLecture({ ...entree, demande: { acte: 'lecture' } }),
    ]);
    const lue = lectures.find(i => i.ok);
    assert.equal(lectures.filter(i => i.ok).length, 1, `une seule lecture devait passer : ${JSON.stringify(lectures)}`);
    assert.deepEqual(
      lectures.filter(i => !i.ok).map(i => !i.ok && i.reason),
      ['lecture_deja_active'],
      `le refus doit être nommé : ${JSON.stringify(lectures)}`,
    );
    assert.ok(lue && lue.ok);
    console.log('ok 1 — deux lectures simultanées : une lecture, un « lecture_deja_active »');

    // 2. Deux révocations de cette lecture.
    const demande = { acte: 'revocation' as const, idLecture: lue.acte.id, code: 'lecture_a_refaire' as const };
    const revocations = await course(verrou, observateur, () => [
      poserActeLecture({ ...entree, demande }),
      poserActeLecture({ ...entree, demande }),
    ]);
    assert.equal(revocations.filter(i => i.ok).length, 1, `une seule révocation devait passer : ${JSON.stringify(revocations)}`);
    assert.deepEqual(
      revocations.filter(i => !i.ok).map(i => !i.ok && i.reason),
      ['lecture_deja_revoquee'],
      `le refus doit être nommé : ${JSON.stringify(revocations)}`,
    );
    console.log('ok 2 — deux révocations simultanées : une révocation, un « lecture_deja_revoquee »');

    const { rows } = await verrou.query(
      `SELECT acte, count(*)::int AS n FROM lectures_imports_biologiques WHERE id_import = $1 GROUP BY acte ORDER BY acte`,
      [IMPORT],
    );
    assert.deepEqual(rows, [{ acte: 'lecture', n: 1 }, { acte: 'revocation', n: 1 }]);
    console.log('ok 3 — la table porte exactement une lecture et une révocation');
  } finally {
    try {
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
  console.error('ÉCHEC du banc de l’écrivain :', err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
