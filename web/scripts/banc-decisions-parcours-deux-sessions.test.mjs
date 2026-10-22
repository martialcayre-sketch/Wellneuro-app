// BANC À DEUX SESSIONS — les décisions de parcours ([[D-343]], BP-15,
// migration `decisions_parcours_v1`).
//
// POURQUOI CE FICHIER EXISTE. Le contrat SQL
// (`prisma/checks/decisions_parcours_v1_negatif.sql`) joue une seule
// session : il relit que les verrous EXISTENT et où, pas qu'ils SÉRIALISENT,
// et il ne peut figurer ni une transaction déjà commise ni un autre niveau
// d'isolation. Les courses et les gestes entre transactions :
//
//   1. DEUX PREMIÈRES RÉVISIONS CONCURRENTES sur une version : la seconde
//      attend la première, puis est refusée — jamais deux révisions en
//      vigueur (verrou des décisions du dossier, espace 343) ;
//   2. UN REMPLACEMENT PUIS UN RETRAIT CONCURRENT du même événement : le
//      retrait attend, puis est refusé — il visait une tête qui ne l'est
//      plus ;
//   3. DEUX REMPLACEMENTS CONCURRENTS d'un même événement : le second
//      attend, puis est refusé par le trigger — pas seulement par l'unicité
//      du successeur ;
//   4. REPEATABLE READ REFUSÉ PAR LA BASE ;
//   5. L'EFFACEMENT CONTRE DEUX POSES : l'effacement prend le dossier
//      `FOR UPDATE` en premier ; les poses l'attendent, puis passent quand
//      l'effacement est annulé. L'effacement ne prenant pas le verrou 343,
//      cette course ne prouve pas l'ORDRE « dossier, puis 343 » du trigger :
//      c'est le contrat SQL (cas 14) qui le relit ;
//   6. UNE SUPPRESSION HORS EFFACEMENT, dossier conservé : refusée au
//      COMMIT ;
//   7. L'EFFACEMENT COMMIS CONTRE UNE POSE EN ATTENTE : la pose, qui
//      attendait le dossier, est refusée et ne laisse aucune ligne
//      orpheline.
// Chaque course constate d'abord que la seconde session est BLOQUÉE sur un
// verrou (`pg_stat_activity`) : sans ce constat, une course « gagnée » ne
// prouverait rien — elle aurait pu se jouer en série.
//
// ÉCRIT EN BASE, ET COMMET : une course ne se joue pas dans une transaction
// annulée. La base visée doit donc être NOMMÉE : `WN_DECISIONS_BANC_BASE`
// doit égaler le nom de la base de `DATABASE_URL`, sur un hôte local. Les
// fixtures (identité de fixture, suffixe propre au run, versions et actions
// synthétiques) sont effacées à la fin, dans l'ordre de l'effacement nommé
// du dossier, dossier compris.
//
// LANCÉ PAR `node scripts/banc-decisions-parcours-deux-sessions.test.mjs`,
// pas par `node --test` : T3 extrait les `node --test` de ci.yml et les joue
// AVANT d'avoir une base. Il a son propre pas, après les contrats SQL, en CI
// comme en T3.

import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import pg from 'pg';

const URL_BASE = process.env.DATABASE_URL;
if (!URL_BASE) throw new Error('DATABASE_URL est requise.');
const BASE_ATTENDUE = process.env.WN_DECISIONS_BANC_BASE;
const BASE_REELLE = new URL(URL_BASE).pathname.slice(1);
// Hôte LOCAL seulement (garde-fou de T3) : le banc commet des écritures.
const HOTE = new URL(URL_BASE).hostname;
if (HOTE !== '127.0.0.1' && HOTE !== 'localhost') {
  throw new Error(`REFUS : DATABASE_URL vise l'hôte « ${HOTE} », le banc n'écrit que sur une base locale.`);
}
if (!BASE_ATTENDUE || BASE_ATTENDUE !== BASE_REELLE) {
  throw new Error(
    `REFUS : DATABASE_URL vise « ${BASE_REELLE} », WN_DECISIONS_BANC_BASE annonce « ${BASE_ATTENDUE ?? ''} ».`,
  );
}

const RUN = randomBytes(4).toString('hex');
const PATIENT = `PAT_BANC_DP_${RUN}`;
/** Le dossier que la course 7 efface pour de bon. */
const PATIENT_EFFACE = `PAT_BANC_DP_EFF_${RUN}`;
const PRATICIEN = 'praticien@wellneuro.fr';
const id = nom => `${nom}_${RUN}`;
const VERSION = id('pd_banc_dp');
const VERSION_EFFACE = id('pd_banc_dp_eff');

/** Une session : un client dédié, jamais un pool — l'ordre des instructions est le banc. */
async function session() {
  const client = new pg.Client({ connectionString: URL_BASE });
  await client.connect();
  const { rows } = await client.query('SELECT pg_backend_pid() AS pid');
  return { client, pid: rows[0].pid };
}

/** Une révision du praticien sur la version. */
const revision = (nom, issue, remplace = null) => ({
  text: `INSERT INTO decisions_parcours (id, id_patient, acte, id_version, nature, issue, motif, id_ligne_remplacee, praticien_email)
         VALUES ($1, $2, 'pose', $3, 'revision', $4, $5, $6, $7)`,
  values: [id(nom), PATIENT, VERSION, issue, issue === 'maintenir' ? null : 'choix_du_patient',
           remplace ? id(remplace) : null, PRATICIEN],
});

/** Un début de l'action synthétique, de date inconnue. */
const debut = (nom, remplace = null, patient = PATIENT, version = VERSION) => ({
  text: `INSERT INTO decisions_parcours (id, id_patient, acte, id_version, id_action, nature, evenement_inconnu, source, id_ligne_remplacee, praticien_email)
         VALUES ($1, $2, 'pose', $3, 'ACTION_BANC', 'debut', true, 'constate_par_praticien', $4, $5)`,
  values: [id(nom), patient, version, remplace ? id(remplace) : null, PRATICIEN],
});

const retrait = (nom, tete) => ({
  text: `INSERT INTO decisions_parcours (id, id_patient, acte, id_version, id_ligne_remplacee, praticien_email)
         VALUES ($1, $2, 'retrait', $3, $4, $5)`,
  values: [id(nom), PATIENT, VERSION, id(tete), PRATICIEN],
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

/** Les lignes commises dont le nom commence par `prefixe`, dans l'ordre. */
async function lignes(observateur, prefixe) {
  const { rows } = await observateur.query(
    `SELECT id, acte FROM decisions_parcours WHERE id_patient = $1 AND id LIKE $2 ORDER BY ordre`,
    [PATIENT, `${prefixe}\\_%`],
  );
  return rows.map(r => `${r.acte}:${r.id.slice(0, -RUN.length - 1)}`);
}

/** Une transaction entière : BEGIN, les instructions, COMMIT ; l'erreur, ou null. */
async function transaction(client, instructions, debutTx = 'BEGIN') {
  try {
    await client.query(debutTx);
    for (const instruction of instructions) await client.query(instruction);
    await client.query('COMMIT');
    return null;
  } catch (err) {
    await client.query('ROLLBACK');
    return err;
  }
}

const versionFixture = (version, patient) => ({
  text: `INSERT INTO protocol_drafts (id, id_patient, decision_card_id, decision_card_input_hash, snapshot_input_hash,
                                     review_input_hash, selected_priority_id, payload, input_hash, contract_version, updated_at)
         VALUES ($1, $2, 'dc_banc', repeat('1', 64), repeat('2', 64), repeat('3', 64), 'prio', '{}'::jsonb,
                 repeat('4', 64), 'c1-protocol-draft-v1', CURRENT_TIMESTAMP)`,
  values: [version, patient],
});

let observateur;

before(async () => {
  ({ client: observateur } = await session());
  const err = await transaction(observateur, [
    {
      text: `INSERT INTO patients (id, id_patient, email, prenom, nom, praticien_email, updated_at)
             VALUES ($1, $2, $3, 'Michel', 'Dogné', $4, CURRENT_TIMESTAMP)`,
      values: [id('pat_banc_dp'), PATIENT, `michel.dogne+banc-dp-${RUN}@example.test`, PRATICIEN],
    },
    {
      text: `INSERT INTO patients (id, id_patient, email, prenom, nom, praticien_email, updated_at)
             VALUES ($1, $2, $3, 'Michel', 'Dogné', $4, CURRENT_TIMESTAMP)`,
      values: [id('pat_banc_dp_eff'), PATIENT_EFFACE, `michel.dogne+banc-dp-eff-${RUN}@example.test`, PRATICIEN],
    },
    versionFixture(VERSION, PATIENT),
    versionFixture(VERSION_EFFACE, PATIENT_EFFACE),
  ]);
  if (err) throw err;
});

after(async () => {
  // L'ordre de l'effacement nommé du dossier (`patient/effacement.ts`), en
  // une transaction et dossier compris : la suppression de ces lignes n'est
  // admise qu'avec lui. La connexion se ferme quoi qu'il arrive.
  const par = [[PATIENT, PATIENT_EFFACE]];
  try {
    const err = await transaction(observateur, [
      { text: 'DELETE FROM decisions_parcours WHERE id_patient = ANY($1)', values: par },
      { text: 'DELETE FROM protocol_drafts WHERE id_patient = ANY($1)', values: par },
      { text: 'DELETE FROM patients WHERE id_patient = ANY($1)', values: par },
    ]);
    if (err) throw err;
  } finally {
    await observateur.end();
  }
});

describe('Décisions de parcours — deux sessions (D-343, BP-15)', () => {
  it('1. deux premières révisions concurrentes sur une version : la seconde attend, puis est refusée — une seule en vigueur', async () => {
    const a = await session();
    const b = await session();
    try {
      await a.client.query('BEGIN');
      await a.client.query(revision('r1_a', 'maintenir'));
      const enVol = b.client.query(revision('r1_b', 'arreter')).then(() => null, err => err);
      await attendreBloquee(observateur, b.pid);
      await a.client.query('COMMIT');
      const refus = await enVol;
      assert.ok(refus, 'la seconde révision est passée : deux révisions en vigueur sur une version.');
      assert.match(refus.message, /la version porte une révision en vigueur/);
      assert.deepEqual(await lignes(observateur, 'r1'), ['pose:r1_a']);
    } finally {
      await a.client.end();
      await b.client.end();
    }
  });

  it('2. un remplacement puis un retrait concurrent du même événement : le retrait attend, puis est refusé', async () => {
    const a = await session();
    const b = await session();
    try {
      assert.equal(await transaction(observateur, [debut('e2_tete')]), null);
      await a.client.query('BEGIN');
      await a.client.query(debut('e2_remplace', 'e2_tete'));
      const enVol = b.client.query(retrait('e2_retrait', 'e2_tete')).then(() => null, err => err);
      await attendreBloquee(observateur, b.pid);
      await a.client.query('COMMIT');
      const refus = await enVol;
      assert.ok(refus, 'le retrait est passé sur une tête déjà remplacée.');
      assert.match(refus.message, /retrait refusé : seule une ligne en vigueur de ce dossier/);
      assert.deepEqual(await lignes(observateur, 'e2'), ['pose:e2_tete', 'pose:e2_remplace']);
    } finally {
      await a.client.end();
      await b.client.end();
    }
  });

  it('3. deux remplacements concurrents d’un événement : le second attend, puis est refusé par le trigger', async () => {
    const a = await session();
    const b = await session();
    try {
      assert.equal(await transaction(observateur, [debut('e3_tete')]), null);
      await a.client.query('BEGIN');
      await a.client.query(debut('e3_a', 'e3_tete'));
      const enVol = b.client.query(debut('e3_b', 'e3_tete')).then(() => null, err => err);
      await attendreBloquee(observateur, b.pid);
      await a.client.query('COMMIT');
      const refus = await enVol;
      assert.ok(refus, 'le second remplacement est passé : deux successeurs pour une ligne.');
      assert.match(refus.message, /remplacement refusé : seule une ligne en vigueur de ce dossier/);
      assert.deepEqual(await lignes(observateur, 'e3'), ['pose:e3_tete', 'pose:e3_a']);
    } finally {
      await a.client.end();
      await b.client.end();
    }
  });

  it('4. REPEATABLE READ est refusé par la base', async () => {
    const b = await session();
    try {
      const refus = await transaction(b.client, [debut('e4')], 'BEGIN ISOLATION LEVEL REPEATABLE READ');
      assert.ok(refus, 'une décision posée en REPEATABLE READ est passée.');
      assert.match(refus.message, /ligne refusée en REPEATABLE READ/);
      assert.deepEqual(await lignes(observateur, 'e4'), []);
    } finally {
      await b.client.end();
    }
  });

  it('5. l’effacement contre deux poses : elles attendent le dossier, sans interblocage, puis passent', async () => {
    const a = await session();
    const b = await session();
    const c = await session();
    try {
      // Le premier geste de `effacerDossier` : le dossier verrouillé ; les
      // poses l'attendent, sans échouer.
      await a.client.query('BEGIN');
      await a.client.query('SELECT 1 FROM patients WHERE id_patient = $1 FOR UPDATE', [PATIENT]);
      const premier = b.client.query(debut('e5_b')).then(() => null, err => err);
      const second = c.client.query(debut('e5_c')).then(() => null, err => err);
      await attendreBloquee(observateur, b.pid);
      await attendreBloquee(observateur, c.pid);
      await a.client.query('ROLLBACK');
      assert.equal(await premier, null, 'la première pose a échoué après l’effacement annulé (interblocage ?).');
      assert.equal(await second, null, 'la seconde pose a échoué après l’effacement annulé (interblocage ?).');
      assert.equal((await lignes(observateur, 'e5')).length, 2);
    } finally {
      await a.client.end();
      await b.client.end();
      await c.client.end();
    }
  });

  it('6. une suppression hors effacement, dossier conservé, est refusée au COMMIT', async () => {
    const b = await session();
    try {
      assert.equal(await transaction(observateur, [debut('e6')]), null);
      const refus = await transaction(b.client, [
        { text: 'DELETE FROM decisions_parcours WHERE id = $1', values: [id('e6')] },
      ]);
      assert.ok(refus, 'une décision a été supprimée alors que son dossier demeure.');
      assert.match(refus.message, /decisions_parcours : suppression refusée/);
      assert.deepEqual(await lignes(observateur, 'e6'), ['pose:e6']);
    } finally {
      await b.client.end();
    }
  });

  it('7. l’effacement commis contre une pose en attente : la pose est refusée, sans ligne orpheline', async () => {
    const a = await session();
    const b = await session();
    try {
      await a.client.query('BEGIN');
      await a.client.query('SELECT 1 FROM patients WHERE id_patient = $1 FOR UPDATE', [PATIENT_EFFACE]);
      const enVol = b.client
        .query(debut('e7', null, PATIENT_EFFACE, VERSION_EFFACE))
        .then(() => null, err => err);
      await attendreBloquee(observateur, b.pid);
      await a.client.query('DELETE FROM protocol_drafts WHERE id_patient = $1', [PATIENT_EFFACE]);
      await a.client.query('DELETE FROM patients WHERE id_patient = $1', [PATIENT_EFFACE]);
      await a.client.query('COMMIT');
      const refus = await enVol;
      assert.ok(refus, 'une pose est passée sur un dossier effacé.');
      // Le dossier disparu n'a plus de praticien : c'est CE refus qui joue.
      assert.match(refus.message, /seul le praticien du dossier/);
      const { rows } = await observateur.query(
        'SELECT count(*)::int AS n FROM decisions_parcours WHERE id_patient = $1',
        [PATIENT_EFFACE],
      );
      assert.equal(rows[0].n, 0, 'une ligne orpheline survit à l’effacement de son dossier.');
    } finally {
      await a.client.end();
      await b.client.end();
    }
  });
});
