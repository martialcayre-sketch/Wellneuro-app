// BANC À DEUX SESSIONS — l'avis du praticien contre la modification de son
// signalement ([[D-281]] §5, migration `saf_ei_avis_verrou_signalement_v1` ;
// passe Codex de #1474).
//
// POURQUOI CE FICHIER EXISTE. Les contrats SQL
// (`prisma/checks/trust_aer_patient_fige_verdict_v1_negatif.sql` et voisins)
// jouent une seule session : ils éprouvent l'avis PUIS le changement de
// patient refusé, l'un après l'autre. Ils ne prouvent pas que le `FOR SHARE`
// du trigger d'insertion de l'avis SÉRIALISE les écritures. Sans lui, une
// transaction qui délie le signalement (programme supprimé) puis change son
// patient, et une autre qui pose un avis pour l'ancien patient, passaient
// toutes deux — signalement au patient B, avis au patient A (reproduit le
// 2026-10-15). Les courses jouées ici, en READ COMMITTED :
//
//   1. MODIFICATION D'ABORD : l'avis ATTEND la transaction qui délie et
//      change le patient, puis est refusé — le signalement n'est plus le sien ;
//   2. AVIS D'ABORD : la transaction qui délie et change le patient ATTEND
//      l'avis en vol, puis est refusée — le patient d'un signalement qui porte
//      un avis est figé ;
//   3. TÉMOIN de 1 : la modification en vol est ANNULÉE — l'avis attend, puis
//      passe ;
//   4. TÉMOIN de 2 : l'avis en vol est ANNULÉ — la modification attend, puis
//      passe ;
//   5. EFFACEMENT IDP2 EN VOL : le dossier est verrouillé (`FOR UPDATE`, comme
//      `effacerDossier`), un avis arrive, puis l'effacement supprime programme,
//      signalement et dossier — l'avis attend SANS tenir le signalement, aucun
//      interblocage, l'effacement passe et l'avis est refusé.
// Chaque course constate d'abord que la seconde session est BLOQUÉE sur un
// verrou (`pg_stat_activity`) : sans ce constat, une course « gagnée » ne
// prouverait rien. Et chacune finit sur l'état de la base : jamais un avis
// qui porte un autre patient que son signalement.
//
// ÉCRIT EN BASE, ET COMMET : la base visée doit être NOMMÉE —
// `WN_SAF_EI_AVIS_BANC_BASE` doit égaler le nom de la base de `DATABASE_URL`,
// sur un hôte local. Les fixtures (identités de fixture, suffixe propre au
// run) sont effacées à la fin, dans l'ordre de l'effacement nommé du dossier.
//
// LANCÉ PAR `node scripts/banc-avis-signalement-deux-sessions.test.mjs`, pas
// par `node --test` : T3 extrait les `node --test` de ci.yml et les joue AVANT
// d'avoir une base. Il a son propre pas, après les contrats SQL, en CI comme
// en T3.

import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import pg from 'pg';

const URL_BASE = process.env.DATABASE_URL;
if (!URL_BASE) throw new Error('DATABASE_URL est requise.');
const BASE_ATTENDUE = process.env.WN_SAF_EI_AVIS_BANC_BASE;
const BASE_REELLE = new URL(URL_BASE).pathname.slice(1);
// Hôte LOCAL seulement (garde-fou de T3) : le banc commet des écritures.
const HOTE = new URL(URL_BASE).hostname;
if (HOTE !== '127.0.0.1' && HOTE !== 'localhost') {
  throw new Error(`REFUS : DATABASE_URL vise l'hôte « ${HOTE} », le banc n'écrit que sur une base locale.`);
}
if (!BASE_ATTENDUE || BASE_ATTENDUE !== BASE_REELLE) {
  throw new Error(
    `REFUS : DATABASE_URL vise « ${BASE_REELLE} », WN_SAF_EI_AVIS_BANC_BASE annonce « ${BASE_ATTENDUE ?? ''} ».`,
  );
}

const RUN = randomBytes(4).toString('hex');
const PATIENT_A = `PAT_BANC_AVIS_A_${RUN}`;
const PATIENT_B = `PAT_BANC_AVIS_B_${RUN}`;
/** Le dossier que la course 5 efface : il porte sa propre course. */
const PATIENT_C = `PAT_BANC_AVIS_C_${RUN}`;
const PRATICIEN = 'praticien@wellneuro.fr';
const H = 'ab'.repeat(32);
const id = nom => `${nom}_${RUN}`;

/** Une course par signalement du formulaire d'avant, chacun lié à son programme approuvé. */
const COURSES = ['modification_dabord', 'avis_dabord', 'modification_annulee', 'avis_annule'];
const EFFACEMENT = 'effacement';

/** Une session : un client dédié, jamais un pool — l'ordre des instructions est le banc. */
async function session() {
  const client = new pg.Client({ connectionString: URL_BASE });
  await client.connect();
  const { rows } = await client.query('SELECT pg_backend_pid() AS pid');
  return { client, pid: rows[0].pid };
}

// Les identifiants sont produits par le banc (suffixe hexadécimal) : les
// instructions à plusieurs requêtes ne prennent pas de paramètres.

/** Délier le signalement (l'effacement du programme le remet à NULL), puis changer son patient. */
const modification = course => [
  `DELETE FROM protocol_diffusion_approvals WHERE id = '${id(`pda_${course}`)}'`,
  `DELETE FROM protocol_drafts WHERE id = '${id(`pd_${course}`)}'`,
  `UPDATE trust_adverse_effect_reports SET id_patient = '${PATIENT_B}' WHERE id = '${id(`aer_${course}`)}'`,
];

/** Un avis « non impliqué » pour le patient d'origine. */
const avis = (course, patient = PATIENT_A) => [
  `INSERT INTO trust_adverse_effect_verdicts (id, id_patient, report_id, verdict, rendu_par)
   VALUES ('${id(`aev_${course}`)}', '${patient}', '${id(`aer_${course}`)}', 'non_implique', '${PRATICIEN}')`,
];

/** `effacerDossier` réduit à ce que la course touche, dans son ordre : le dossier verrouillé d'abord. */
const verrouDossier = patient => [`SELECT 1 FROM patients WHERE id_patient = '${patient}' FOR UPDATE`];
const suiteEffacement = patient => [
  `DELETE FROM protocol_diffusion_approvals WHERE id_patient = '${patient}'`,
  `DELETE FROM protocol_drafts WHERE id_patient = '${patient}'`,
  `DELETE FROM trust_adverse_effect_verdicts WHERE id_patient = '${patient}'`,
  `DELETE FROM trust_adverse_effect_reports WHERE id_patient = '${patient}'`,
  `DELETE FROM patients WHERE id_patient = '${patient}'`,
];

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
    `SELECT r.id_patient = $2 AS signalement_patient_a,
            r.protocol_draft_id IS NOT NULL AS lie,
            (SELECT count(*)::int FROM trust_adverse_effect_verdicts v WHERE v.report_id = r.id) AS avis,
            (SELECT count(*)::int FROM trust_adverse_effect_verdicts v
              WHERE v.report_id = r.id AND v.id_patient <> r.id_patient) AS avis_d_un_autre_patient
     FROM trust_adverse_effect_reports r
     WHERE r.id = $1`,
    [id(`aer_${course}`), PATIENT_A],
  );
  return rows[0];
}

let observateur;

before(async () => {
  ({ client: observateur } = await session());
  try {
    await observateur.query('BEGIN');
    await observateur.query(
      `INSERT INTO patients (id, id_patient, email, prenom, nom, praticien_email, updated_at) VALUES
         ($1, $2, $3, 'Sophie', 'Nicola', $10, CURRENT_TIMESTAMP),
         ($4, $5, $6, 'Michel', 'Dogné', $10, CURRENT_TIMESTAMP),
         ($7, $8, $9, 'Jennifer', 'Martin', $10, CURRENT_TIMESTAMP)`,
      [
        id('pat_banc_avis_a'), PATIENT_A, `sophie.nicola+banc-${RUN}@example.test`,
        id('pat_banc_avis_b'), PATIENT_B, `michel.dogne+banc-${RUN}@example.test`,
        id('pat_banc_avis_c'), PATIENT_C, `jennifer.martin+banc-${RUN}@example.test`,
        PRATICIEN,
      ],
    );
    for (const [course, patient] of [...COURSES.map(c => [c, PATIENT_A]), [EFFACEMENT, PATIENT_C]]) {
      await observateur.query(
        `INSERT INTO protocol_drafts
           (id, id_patient, decision_card_id, decision_card_input_hash, snapshot_input_hash,
            review_input_hash, selected_priority_id, payload, input_hash, contract_version, updated_at)
         VALUES ($1, $2, 'dc_banc', $3, $3, $3, 'prio_banc', '{"actions":[]}'::jsonb, $3, 'c1-protocol-draft-v4', CURRENT_TIMESTAMP)`,
        [id(`pd_${course}`), patient, H],
      );
      await observateur.query(
        `INSERT INTO protocol_diffusion_approvals
           (id, id_patient, protocol_draft_id, decision_card_input_hash, protocol_draft_input_hash, approved_at, confirmation)
         VALUES ($1, $2, $3, $4, $4, CURRENT_TIMESTAMP, 'content_approved_for_diffusion')`,
        [id(`pda_${course}`), patient, id(`pd_${course}`), H],
      );
      // Le formulaire d'avant : programme renseigné, aucun rattachement.
      await observateur.query(
        `INSERT INTO trust_adverse_effect_reports
           (id, id_patient, produit_libelle, symptomes, severite_declaree, orientation, regle_id, regle_version, protocol_draft_id)
         VALUES ($1, $2, 'produit', 'symptomes', 'incertaine', 'orientation', 'SAF-EI-01', '1', $3)`,
        [id(`aer_${course}`), patient, id(`pd_${course}`)],
      );
    }
    await observateur.query('COMMIT');
  } catch (err) {
    // Une transaction avortée ferait échouer le nettoyage, et la connexion
    // restée ouverte retiendrait le processus : on annule, puis on remonte.
    await observateur.query('ROLLBACK');
    throw err;
  }
});

after(async () => {
  // L'ordre de l'effacement nommé du dossier (`patient/effacement.ts`), en
  // une transaction, pour les deux patients ; la connexion se ferme quoi
  // qu'il arrive.
  const par = [[PATIENT_A, PATIENT_B, PATIENT_C]];
  try {
    await observateur.query('BEGIN');
    await observateur.query('DELETE FROM protocol_diffusion_approvals WHERE id_patient = ANY($1)', par);
    await observateur.query('DELETE FROM protocol_drafts WHERE id_patient = ANY($1)', par);
    await observateur.query('DELETE FROM trust_adverse_effect_verdicts WHERE id_patient = ANY($1)', par);
    await observateur.query('DELETE FROM trust_adverse_effect_reports WHERE id_patient = ANY($1)', par);
    await observateur.query('DELETE FROM patients WHERE id_patient = ANY($1)', par);
    await observateur.query('COMMIT');
  } finally {
    await observateur.end();
  }
});

/**
 * A ouvre une transaction et pose ses écritures ; B joue les siennes dans sa
 * propre transaction et doit attendre A. Rend l'erreur de B, ou null.
 */
async function course({ premiere, seconde, issueA, suiteA = [] }) {
  const a = await session();
  const b = await session();
  // B ne rejette jamais : son issue est sa valeur (null, ou l'erreur).
  let enVol = Promise.resolve(null);
  try {
    await a.client.query('BEGIN');
    for (const sql of premiere) await a.client.query(sql);
    enVol = (async () => {
      try {
        await b.client.query('BEGIN');
        for (const sql of seconde) await b.client.query(sql);
        await b.client.query('COMMIT');
        return null;
      } catch (err) {
        await b.client.query('ROLLBACK').catch(() => {});
        return err;
      }
    })();
    await attendreBloquee(observateur, b.pid);
    // Les écritures de A APRÈS que B attend : c'est là qu'un interblocage
    // se nouerait (course 5).
    for (const sql of suiteA) await a.client.query(sql);
    await a.client.query(issueA);
    return await enVol;
  } finally {
    // A d'abord : sa connexion fermée annule sa transaction et libère B.
    await a.client.end();
    await enVol;
    await b.client.end();
  }
}

describe('Avis contre modification du signalement — deux sessions (D-281 §5)', () => {
  it('1. modification d’abord : l’avis attend, puis est refusé', async () => {
    const refus = await course({ premiere: modification('modification_dabord'), seconde: avis('modification_dabord'), issueA: 'COMMIT' });
    assert.ok(refus, 'l’avis est passé sur un signalement passé à un autre patient.');
    assert.match(refus.message, /le signalement n'est pas celui du patient/);
    assert.deepEqual(await etat(observateur, 'modification_dabord'), {
      signalement_patient_a: false, lie: false, avis: 0, avis_d_un_autre_patient: 0,
    });
  });

  it('2. avis d’abord : la modification attend, puis est refusée', async () => {
    const refus = await course({ premiere: avis('avis_dabord'), seconde: modification('avis_dabord'), issueA: 'COMMIT' });
    assert.ok(refus, 'le patient a changé sous un avis : l’avis porte un autre patient que son signalement.');
    assert.match(refus.message, /le patient d'un signalement qui porte un avis est figé/);
    assert.deepEqual(await etat(observateur, 'avis_dabord'), {
      signalement_patient_a: true, lie: true, avis: 1, avis_d_un_autre_patient: 0,
    });
  });

  it('3. TÉMOIN : la modification en vol est annulée — l’avis attend, puis passe', async () => {
    const refus = await course({ premiere: modification('modification_annulee'), seconde: avis('modification_annulee'), issueA: 'ROLLBACK' });
    assert.equal(refus, null, `l’avis a été refusé sur une modification annulée (${refus?.message}).`);
    assert.deepEqual(await etat(observateur, 'modification_annulee'), {
      signalement_patient_a: true, lie: true, avis: 1, avis_d_un_autre_patient: 0,
    });
  });

  it('4. TÉMOIN : l’avis en vol est annulé — la modification attend, puis passe', async () => {
    const refus = await course({ premiere: avis('avis_annule'), seconde: modification('avis_annule'), issueA: 'ROLLBACK' });
    assert.equal(refus, null, `la modification a été refusée sur un avis annulé (${refus?.message}).`);
    assert.deepEqual(await etat(observateur, 'avis_annule'), {
      signalement_patient_a: false, lie: false, avis: 0, avis_d_un_autre_patient: 0,
    });
  });

  it('5. effacement IDP2 en vol : l’avis attend sans interbloquer, l’effacement passe', async () => {
    const refus = await course({
      premiere: verrouDossier(PATIENT_C),
      seconde: avis(EFFACEMENT, PATIENT_C),
      suiteA: suiteEffacement(PATIENT_C),
      issueA: 'COMMIT',
    });
    assert.ok(refus, 'un avis est passé sur un dossier effacé.');
    assert.notEqual(refus.code, '40P01', 'l’avis et l’effacement se sont interbloqués.');
    assert.match(refus.message, /le signalement n'est pas celui du patient/);
    const { rows } = await observateur.query(
      `SELECT (SELECT count(*)::int FROM patients WHERE id_patient = $1) AS dossiers,
              (SELECT count(*)::int FROM trust_adverse_effect_reports WHERE id_patient = $1) AS signalements,
              (SELECT count(*)::int FROM trust_adverse_effect_verdicts WHERE id_patient = $1) AS avis`,
      [PATIENT_C],
    );
    assert.deepEqual(rows[0], { dossiers: 0, signalements: 0, avis: 0 });
  });
});
