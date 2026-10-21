// BANC À DEUX SESSIONS — les données physiologiques déclarées, les
// traitements en cours et la pièce de traitement d'un constat ([[D-335]],
// BP-13, migration `donnees_physiologiques_traitements_v1`).
//
// POURQUOI CE FICHIER EXISTE. Le contrat SQL
// (`prisma/checks/donnees_physiologiques_traitements_v1_negatif.sql`) joue
// une seule session : il relit que les verrous EXISTENT et où, pas qu'ils
// SÉRIALISENT, et il ne peut figurer ni une transaction déjà commise ni un
// autre niveau d'isolation. Les courses et les gestes entre transactions :
//
//   1. DEUX PREMIÈRES POSES CONCURRENTES sur un même critère : la seconde
//      attend la première, puis est refusée — jamais deux lignes en vigueur
//      (verrou du critère dans le dossier, espace 335) ;
//   2. UN REMPLACEMENT PUIS UN RETRAIT CONCURRENT de la même tête : le
//      retrait attend, puis est refusé — il visait une tête qui ne l'est
//      plus ;
//   3. DEUX REMPLACEMENTS CONCURRENTS d'un même traitement : le second
//      attend (verrou des traitements du dossier), puis est refusé par le
//      trigger — pas seulement par l'unicité du successeur ;
//   4. UN REMPLACEMENT DE TRAITEMENT PUIS UNE PIÈCE CONCURRENTE qui le
//      cite : la pièce attend (même verrou), puis est refusée — jamais une
//      pièce sur une ligne déjà remplacée ;
//   5. REPEATABLE READ REFUSÉ PAR LA BASE, sur les deux tables ;
//   6. L'EFFACEMENT CONTRE DEUX POSES : l'effacement prend le dossier
//      `FOR UPDATE` en premier ; les poses, qui prennent le dossier avant
//      tout autre verrou, l'attendent sans interblocage, puis passent quand
//      l'effacement est annulé ;
//   7. UNE SUPPRESSION HORS EFFACEMENT, dossier conservé : refusée au
//      COMMIT, sur les deux tables.
// Chaque course constate d'abord que la seconde session est BLOQUÉE sur un
// verrou (`pg_stat_activity`) : sans ce constat, une course « gagnée » ne
// prouverait rien — elle aurait pu se jouer en série.
//
// ÉCRIT EN BASE, ET COMMET : une course ne se joue pas dans une transaction
// annulée. La base visée doit donc être NOMMÉE : `WN_PHYSIO_BANC_BASE` doit
// égaler le nom de la base de `DATABASE_URL`, sur un hôte local. Les
// fixtures (identité de fixture, suffixe propre au run, noms de traitement
// synthétiques) sont effacées à la fin, dans l'ordre de l'effacement nommé du
// dossier, dossier compris.
//
// LANCÉ PAR `node scripts/banc-physio-traitements-deux-sessions.test.mjs`,
// pas par `node --test` : T3 extrait les `node --test` de ci.yml et les joue
// AVANT d'avoir une base. Il a son propre pas, après les contrats SQL, en CI
// comme en T3.

import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import pg from 'pg';

const URL_BASE = process.env.DATABASE_URL;
if (!URL_BASE) throw new Error('DATABASE_URL est requise.');
const BASE_ATTENDUE = process.env.WN_PHYSIO_BANC_BASE;
const BASE_REELLE = new URL(URL_BASE).pathname.slice(1);
// Hôte LOCAL seulement (garde-fou de T3) : le banc commet des écritures.
const HOTE = new URL(URL_BASE).hostname;
if (HOTE !== '127.0.0.1' && HOTE !== 'localhost') {
  throw new Error(`REFUS : DATABASE_URL vise l'hôte « ${HOTE} », le banc n'écrit que sur une base locale.`);
}
if (!BASE_ATTENDUE || BASE_ATTENDUE !== BASE_REELLE) {
  throw new Error(
    `REFUS : DATABASE_URL vise « ${BASE_REELLE} », WN_PHYSIO_BANC_BASE annonce « ${BASE_ATTENDUE ?? ''} ».`,
  );
}

const RUN = randomBytes(4).toString('hex');
const PATIENT = `PAT_BANC_PHYSIO_${RUN}`;
const PRATICIEN = 'praticien@wellneuro.fr';
const id = nom => `${nom}_${RUN}`;

/** Une session : un client dédié, jamais un pool — l'ordre des instructions est le banc. */
async function session() {
  const client = new pg.Client({ connectionString: URL_BASE });
  await client.connect();
  const { rows } = await client.query('SELECT pg_backend_pid() AS pid');
  return { client, pid: rows[0].pid };
}

/** Une pose du praticien sur un critère fermé. */
const physio = (nom, critere, reponse, remplace = null) => ({
  text: `INSERT INTO donnees_physiologiques (id, id_patient, acte, critere, reponse, source, id_ligne_remplacee, praticien_email)
         VALUES ($1, $2, 'pose', $3, $4, 'praticien', $5, $6)`,
  values: [id(nom), PATIENT, critere, reponse, remplace ? id(remplace) : null, PRATICIEN],
});

const retraitPhysio = (nom, critere, tete) => ({
  text: `INSERT INTO donnees_physiologiques (id, id_patient, acte, critere, source, id_ligne_remplacee, praticien_email)
         VALUES ($1, $2, 'retrait', $3, 'praticien', $4, $5)`,
  values: [id(nom), PATIENT, critere, id(tete), PRATICIEN],
});

/** Une pose du praticien sur un fil de traitement ; un nom synthétique. */
const traitement = (nom, remplace = null) => ({
  text: `INSERT INTO traitements_en_cours (id, id_patient, acte, nature, nom, debut_precision, prescrit_par_tiers, source, id_ligne_remplacee, praticien_email)
         VALUES ($1, $2, 'pose', 'medicament', 'TRAITEMENT_BANC', 'inconnu', 'inconnu', 'praticien', $3, $4)`,
  values: [id(nom), PATIENT, remplace ? id(remplace) : null, PRATICIEN],
});

/** Un constat sans pièce requise, posé pour recevoir une pièce de traitement. */
const constat = nom => ({
  text: `INSERT INTO constats_praticien (id, id_patient, acte, hypothese_code, verdict, motif, structure_sha256, praticien_email)
         VALUES ($1, $2, 'pose', $3, 'non_evaluable', 'piece_attendue_manquante', repeat('a', 64), $4)`,
  values: [id(nom), PATIENT, `HYP_BANC_${RUN.toUpperCase()}_TRAITEMENT`, PRATICIEN],
});

const pieceTraitement = (nom, constatNom, traitementNom) => ({
  text: `INSERT INTO pieces_constats_praticien (id, id_constat, id_patient, id_traitement) VALUES ($1, $2, $3, $4)`,
  values: [id(nom), id(constatNom), PATIENT, id(traitementNom)],
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

/** Les lignes commises d'une table dont le nom commence par `prefixe`, dans l'ordre. */
async function lignes(observateur, table, prefixe) {
  const { rows } = await observateur.query(
    `SELECT id, acte FROM ${table} WHERE id_patient = $1 AND id LIKE $2 ORDER BY ordre`,
    [PATIENT, `${prefixe}\\_%`],
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
    {
      text: `INSERT INTO patients (id, id_patient, email, prenom, nom, praticien_email, updated_at)
             VALUES ($1, $2, $3, 'Michel', 'Dogné', $4, CURRENT_TIMESTAMP)`,
      values: [id('pat_banc_physio'), PATIENT, `michel.dogne+banc-physio-${RUN}@example.test`, PRATICIEN],
    },
  ]);
  if (err) throw err;
});

after(async () => {
  // L'ordre de l'effacement nommé du dossier (`patient/effacement.ts`), en
  // une transaction et dossier compris : la suppression de ces lignes n'est
  // admise qu'avec lui. La connexion se ferme quoi qu'il arrive.
  const par = [PATIENT];
  try {
    const err = await transaction(observateur, [
      { text: 'DELETE FROM pieces_constats_praticien WHERE id_patient = $1', values: par },
      { text: 'DELETE FROM constats_praticien WHERE id_patient = $1', values: par },
      { text: 'DELETE FROM donnees_physiologiques WHERE id_patient = $1', values: par },
      { text: 'DELETE FROM traitements_en_cours WHERE id_patient = $1', values: par },
      { text: 'DELETE FROM patients WHERE id_patient = $1', values: par },
    ]);
    if (err) throw err;
  } finally {
    await observateur.end();
  }
});

describe('Données physiologiques et traitements — deux sessions (D-335, BP-13)', () => {
  it('1. deux premières poses concurrentes sur un critère : la seconde attend, puis est refusée — une seule tête', async () => {
    const a = await session();
    const b = await session();
    try {
      await a.client.query('BEGIN');
      await a.client.query(physio('d1_a', 'grossesse', 'non'));
      const enVol = b.client.query(physio('d1_b', 'grossesse', 'inconnu')).then(() => null, err => err);
      await attendreBloquee(observateur, b.pid);
      await a.client.query('COMMIT');
      const refus = await enVol;
      assert.ok(refus, 'la seconde pose est passée : deux lignes en vigueur sur un critère.');
      assert.match(refus.message, /porte une ligne en vigueur/);
      assert.deepEqual(await lignes(observateur, 'donnees_physiologiques', 'd1'), ['pose:d1_a']);
    } finally {
      await a.client.end();
      await b.client.end();
    }
  });

  it('2. un remplacement puis un retrait concurrent de la même tête : le retrait attend, puis est refusé', async () => {
    const a = await session();
    const b = await session();
    try {
      assert.equal(await transaction(observateur, [physio('d2_tete', 'allaitement', 'non')]), null);
      await a.client.query('BEGIN');
      await a.client.query(physio('d2_remplace', 'allaitement', 'oui', 'd2_tete'));
      const enVol = b.client.query(retraitPhysio('d2_retrait', 'allaitement', 'd2_tete')).then(() => null, err => err);
      await attendreBloquee(observateur, b.pid);
      await a.client.query('COMMIT');
      const refus = await enVol;
      assert.ok(refus, 'le retrait est passé sur une tête déjà remplacée.');
      assert.match(refus.message, /seule la ligne en vigueur sur ce critère se retire/);
      assert.deepEqual(await lignes(observateur, 'donnees_physiologiques', 'd2'), ['pose:d2_tete', 'pose:d2_remplace']);
    } finally {
      await a.client.end();
      await b.client.end();
    }
  });

  it('3. deux remplacements concurrents d’un traitement : le second attend, puis est refusé par le trigger', async () => {
    const a = await session();
    const b = await session();
    try {
      assert.equal(await transaction(observateur, [traitement('t3_tete')]), null);
      await a.client.query('BEGIN');
      await a.client.query(traitement('t3_a', 't3_tete'));
      const enVol = b.client.query(traitement('t3_b', 't3_tete')).then(() => null, err => err);
      await attendreBloquee(observateur, b.pid);
      await a.client.query('COMMIT');
      const refus = await enVol;
      assert.ok(refus, 'le second remplacement est passé : deux successeurs pour une ligne.');
      assert.match(refus.message, /remplacement refusé : seule une ligne en vigueur de ce dossier/);
      assert.deepEqual(await lignes(observateur, 'traitements_en_cours', 't3'), ['pose:t3_tete', 'pose:t3_a']);
    } finally {
      await a.client.end();
      await b.client.end();
    }
  });

  it('4. un remplacement de traitement puis une pièce concurrente qui le cite : la pièce attend, puis est refusée', async () => {
    const a = await session();
    const b = await session();
    try {
      assert.equal(await transaction(observateur, [traitement('t4_tete')]), null);
      await a.client.query('BEGIN');
      await a.client.query(traitement('t4_remplace', 't4_tete'));
      await b.client.query('BEGIN');
      await b.client.query(constat('c4'));
      const enVol = b.client.query(pieceTraitement('p4', 'c4', 't4_tete')).then(() => null, err => err);
      await attendreBloquee(observateur, b.pid);
      await a.client.query('COMMIT');
      const refus = await enVol;
      await b.client.query('ROLLBACK');
      assert.ok(refus, 'la pièce est passée sur un traitement que le remplacement concurrent supplante.');
      assert.match(refus.message, /a été remplacé ou retiré ; seule la ligne en vigueur se cite/);
      const { rows } = await observateur.query(
        'SELECT count(*)::int AS n FROM pieces_constats_praticien WHERE id_patient = $1',
        [PATIENT],
      );
      assert.equal(rows[0].n, 0);
    } finally {
      await a.client.end();
      await b.client.end();
    }
  });

  it('5. REPEATABLE READ est refusé par la base, sur les deux tables', async () => {
    const b = await session();
    try {
      const rr = 'BEGIN ISOLATION LEVEL REPEATABLE READ';
      const refusDonnee = await transaction(b.client, [physio('d5', 'sexe_declare', 'inconnu')], rr);
      assert.ok(refusDonnee, 'une donnée posée en REPEATABLE READ est passée.');
      assert.match(refusDonnee.message, /ligne refusée en REPEATABLE READ/);
      const refusTraitement = await transaction(b.client, [traitement('t5')], rr);
      assert.ok(refusTraitement, 'un traitement posé en REPEATABLE READ est passé.');
      assert.match(refusTraitement.message, /ligne refusée en REPEATABLE READ/);
      assert.deepEqual(await lignes(observateur, 'donnees_physiologiques', 'd5'), []);
      assert.deepEqual(await lignes(observateur, 'traitements_en_cours', 't5'), []);
    } finally {
      await b.client.end();
    }
  });

  it('6. l’effacement contre deux poses : elles attendent le dossier, sans interblocage, puis passent', async () => {
    const a = await session();
    const b = await session();
    const c = await session();
    try {
      // Le premier geste de `effacerDossier` : le dossier verrouillé. Si une
      // pose prenait son verrou consultatif AVANT le dossier, un effacement
      // qui l'attendrait pendant qu'elle attend le dossier interbloquerait.
      await a.client.query('BEGIN');
      await a.client.query('SELECT 1 FROM patients WHERE id_patient = $1 FOR UPDATE', [PATIENT]);
      const donnee = b.client.query(physio('d6', 'statut_menstruel', 'inconnu')).then(() => null, err => err);
      const ligne = c.client.query(traitement('t6')).then(() => null, err => err);
      await attendreBloquee(observateur, b.pid);
      await attendreBloquee(observateur, c.pid);
      await a.client.query('ROLLBACK');
      assert.equal(await donnee, null, 'la donnée a échoué après l’effacement annulé (interblocage ?).');
      assert.equal(await ligne, null, 'le traitement a échoué après l’effacement annulé (interblocage ?).');
      assert.deepEqual(await lignes(observateur, 'donnees_physiologiques', 'd6'), ['pose:d6']);
      assert.deepEqual(await lignes(observateur, 'traitements_en_cours', 't6'), ['pose:t6']);
    } finally {
      await a.client.end();
      await b.client.end();
      await c.client.end();
    }
  });

  it('7. une suppression hors effacement, dossier conservé, est refusée au COMMIT', async () => {
    const b = await session();
    try {
      assert.equal(await transaction(observateur, [physio('d7', 'sexe_declare', 'inconnu'), traitement('t7')]), null);
      const refusDonnee = await transaction(b.client, [
        { text: 'DELETE FROM donnees_physiologiques WHERE id = $1', values: [id('d7')] },
      ]);
      assert.ok(refusDonnee, 'une donnée a été supprimée alors que son dossier demeure.');
      assert.match(refusDonnee.message, /donnees_physiologiques : suppression refusée/);
      const refusTraitement = await transaction(b.client, [
        { text: 'DELETE FROM traitements_en_cours WHERE id = $1', values: [id('t7')] },
      ]);
      assert.ok(refusTraitement, 'un traitement a été supprimé alors que son dossier demeure.');
      assert.match(refusTraitement.message, /traitements_en_cours : suppression refusée/);
      assert.deepEqual(await lignes(observateur, 'donnees_physiologiques', 'd7'), ['pose:d7']);
      assert.deepEqual(await lignes(observateur, 'traitements_en_cours', 't7'), ['pose:t7']);
    } finally {
      await b.client.end();
    }
  });
});
