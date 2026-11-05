// BANC À DEUX SESSIONS — positions d'expert et arbitrages de conflits
// ([[D-439]], BP-12b, migration `positions_expert_v1`).
//
// POURQUOI CE FICHIER EXISTE. Le contrat SQL
// (`prisma/checks/positions_expert_v1_negatif.sql`) joue une seule
// session : il ne voit ni une transaction déjà commise ni un autre niveau
// d'isolation. La contre-revue Codex de #1871 (P1-1) l'a montré. Une
// transaction SERIALIZABLE dont l'instantané précède une première pose commise
// en READ COMMITTED posait une seconde tête sur le même couple, et la
// détection des conflits de SERIALIZABLE ne voyait rien, faute de deux
// écrivains SERIALIZABLE. Les courses :
//
//   1. DEUX PREMIÈRES POSES CONCURRENTES sur un couple conflit × fiche : la
//      seconde attend la première, puis est refusée ;
//   2. DEUX PREMIÈRES VERSIONS CONCURRENTES d'une position : la seconde
//      attend, puis est refusée — jamais deux versions courantes ;
//   3. UNE RÉVISION PUIS UN ACTE CONCURRENT sur l'ancienne version : l'acte
//      attend, puis est refusé ;
//   4. UN RETRAIT PUIS UN ARBITRAGE CONCURRENT qui retient la position :
//      l'arbitrage attend (couple, puis position), puis est refusé ;
//   5. UNE RÉVOCATION PUIS UN REMPLACEMENT CONCURRENT de la même tête : le
//      remplacement attend, puis est refusé ;
//   6. LE SCÉNARIO DE CODEX : instantané SERIALIZABLE pris, première pose
//      commise en READ COMMITTED, seconde pose de la transaction SERIALIZABLE
//      — refusée, une seule tête ; de même pour une première version ;
//   7. REPEATABLE READ ET SERIALIZABLE REFUSÉS sur les trois tables.
// Chaque course constate d'abord que la seconde session est BLOQUÉE sur un
// verrou (`pg_stat_activity`) : sans ce constat, une course « gagnée » ne
// prouverait rien — elle aurait pu se jouer en série.
//
// ÉCRIT EN BASE, ET COMMET : une course ne se joue pas dans une transaction
// annulée. La base visée doit donc être NOMMÉE : `WN_POSITIONS_EXPERT_BANC_BASE`
// doit égaler le nom de la base de `DATABASE_URL`, sur un hôte local. Les
// tables sont append-only : les lignes du run s'effacent à la fin dans UNE
// transaction qui désactive leurs triggers, supprime, puis les réactive.
// Le DDL est transactionnel : un échec annule le tout, triggers compris. Aucune
// donnée patient, texte synthétique seulement.
//
// LANCÉ PAR `node scripts/banc-positions-expert-deux-sessions.test.mjs`,
// pas par `node --test` : T3 extrait les `node --test` de ci.yml et les joue
// AVANT d'avoir une base. Il a son propre pas, après les contrats SQL, en CI
// comme en T3.

import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import pg from 'pg';

const URL_BASE = process.env.DATABASE_URL;
if (!URL_BASE) throw new Error('DATABASE_URL est requise.');
const BASE_ATTENDUE = process.env.WN_POSITIONS_EXPERT_BANC_BASE;
const BASE_REELLE = new URL(URL_BASE).pathname.slice(1);
// Hôte LOCAL seulement (garde-fou de T3) : le banc commet des écritures.
const HOTE = new URL(URL_BASE).hostname;
// `pg` lit un paramètre `host` (ou `hostaddr`) AVANT l'autorité de l'URL :
// `postgresql://localhost/base?host=distant` passerait le contrôle ci-dessous
// et écrirait ailleurs (revue CodeRabbit de #1871).
for (const param of ['host', 'hostaddr']) {
  if (new URL(URL_BASE).searchParams.has(param)) {
    throw new Error(`REFUS : le paramètre « ${param} » de DATABASE_URL remplace l'hôte visé.`);
  }
}
if (HOTE !== '127.0.0.1' && HOTE !== 'localhost') {
  throw new Error(`REFUS : DATABASE_URL vise l'hôte « ${HOTE} », le banc n'écrit que sur une base locale.`);
}
if (!BASE_ATTENDUE || BASE_ATTENDUE !== BASE_REELLE) {
  throw new Error(
    `REFUS : DATABASE_URL vise « ${BASE_REELLE} », WN_POSITIONS_EXPERT_BANC_BASE annonce « ${BASE_ATTENDUE ?? ''} ».`,
  );
}

const RUN = randomBytes(4).toString('hex');
const RUN_MAJ = RUN.toUpperCase();
const AUTEUR = 'praticien@wellneuro.fr';
const S = 'a'.repeat(64);
const id = nom => `${nom}_${RUN}`;
/** Les lignes du run, et elles seules : le `_` est échappé, sinon `LIKE` y
 * voit un joker (revue CodeRabbit de #1871). `RUN` n'est fait que d'hexa. */
const MOTIF_RUN = `%\\_${RUN}`;
/** Un couple par course : chaque course a sa propre tête. */
const conflit = n => `CS-BANC${RUN_MAJ}-${n}`;
const fiche = n => `FU_BANC_${RUN_MAJ}_${n}`;
/** Les identifiants de position du run, tirés libres au `before`. */
let positions = [];

const CONTENU = {
  enonce: 'Énoncé de banc.',
  perimetre: 'Périmètre de banc.',
  population: 'Population de banc.',
  limites: 'Limites de banc.',
};
const sha = texte => createHash('sha256').update(texte, 'utf8').digest('hex');
/** L'empreinte de la migration, recalculée en JS : elle doit être acceptée par la base. */
const EMPREINTE = sha(['enonce', 'perimetre', 'population', 'limites'].map(c => sha(CONTENU[c])).join(''));

/** Une session : un client dédié, jamais un pool — l'ordre des instructions est le banc. */
async function session() {
  const client = new pg.Client({ connectionString: URL_BASE });
  await client.connect();
  const { rows } = await client.query('SELECT pg_backend_pid() AS pid');
  return { client, pid: rows[0].pid };
}

const version = (nom, p, numero, revisee = null) => ({
  text: `INSERT INTO positions_expert_versions (id, position_id, version, dossier, contenu, claims_appui, id_version_revisee, auteur)
         VALUES ($1, $2, $3, 'fer', $4::jsonb, ARRAY['WN-CL-0001-001@v1.0'], $5, $6)`,
  values: [id(nom), positions[p], numero, JSON.stringify(CONTENU), revisee ? id(revisee) : null, AUTEUR],
});

const acte = (nom, cible, quoi = 'signee') => ({
  text: `INSERT INTO positions_expert_actes (id, id_version, acte, empreinte, auteur, relecture_integrale, motif)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
  values: [id(nom), id(cible), quoi, EMPREINTE, AUTEUR, quoi === 'signee', quoi === 'retiree' ? 'Motif de banc.' : null],
});

const pose = (nom, n, { remplace = null, position = null } = {}) => ({
  text: `INSERT INTO arbitrages_conflits_sources
           (id, conflit_id, fiche_id, acte, id_arbitrage_remplace, claim_retenu, id_position_version, conflit_sha256, structure_sha256, motif, auteur)
         VALUES ($1, $2, $3, 'pose', $4, $5, $6, $7, $7, 'Motif de banc.', $8)`,
  values: [
    id(nom), conflit(n), fiche(n), remplace ? id(remplace) : null,
    position ? null : 'WN-CL-0001-001@v1.0', position ? id(position) : null, S, AUTEUR,
  ],
});

const revocation = (nom, n, tete) => ({
  text: `INSERT INTO arbitrages_conflits_sources (id, conflit_id, fiche_id, acte, id_arbitrage_remplace, motif, auteur)
         VALUES ($1, $2, $3, 'revocation', $4, 'Motif de banc.', $5)`,
  values: [id(nom), conflit(n), fiche(n), id(tete), AUTEUR],
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

/** Les têtes d'un couple : les poses que rien ne vise. */
async function tetes(observateur, n) {
  const { rows } = await observateur.query(
    `SELECT a.id FROM arbitrages_conflits_sources a
     WHERE a.conflit_id = $1 AND a.fiche_id = $2 AND a.acte = 'pose'
       AND NOT EXISTS (SELECT 1 FROM arbitrages_conflits_sources s WHERE s.id_arbitrage_remplace = a.id)
     ORDER BY a.ordre`,
    [conflit(n), fiche(n)],
  );
  return rows.map(r => r.id.slice(0, -RUN.length - 1));
}

/** Les versions courantes d'une position : celles qu'aucune version ne révise. */
async function courantes(observateur, p) {
  const { rows } = await observateur.query(
    `SELECT v.id FROM positions_expert_versions v
     WHERE v.position_id = $1
       AND NOT EXISTS (SELECT 1 FROM positions_expert_versions s WHERE s.id_version_revisee = v.id)
     ORDER BY v.id`,
    [positions[p]],
  );
  return rows.map(r => r.id.slice(0, -RUN.length - 1));
}

let observateur;

before(async () => {
  ({ client: observateur } = await session());
  // Huit identifiants `WN-PE-NNNN` libres dans cette base, tirés au hasard :
  // le format n'a que quatre chiffres, et le run ne doit heurter aucune ligne.
  const { rows } = await observateur.query(
    `SELECT 'WN-PE-' || lpad(n::text, 4, '0') AS p FROM generate_series(1, 9999) n
     WHERE NOT EXISTS (SELECT 1 FROM positions_expert_versions v WHERE v.position_id = 'WN-PE-' || lpad(n::text, 4, '0'))
     ORDER BY random() LIMIT 8`,
  );
  positions = rows.map(r => r.p);
  assert.equal(positions.length, 8, 'moins de huit identifiants de position libres.');
});

after(async () => {
  try {
    const err = await transaction(observateur, [
      'ALTER TABLE arbitrages_conflits_sources DISABLE TRIGGER USER',
      'ALTER TABLE positions_expert_actes DISABLE TRIGGER USER',
      'ALTER TABLE positions_expert_versions DISABLE TRIGGER USER',
      { text: 'DELETE FROM arbitrages_conflits_sources WHERE id LIKE $1', values: [MOTIF_RUN] },
      { text: 'DELETE FROM positions_expert_actes WHERE id LIKE $1', values: [MOTIF_RUN] },
      // Les révisions avant ce qu'elles révisent (clé auto-référente).
      { text: 'DELETE FROM positions_expert_versions WHERE id LIKE $1 AND id_version_revisee IS NOT NULL', values: [MOTIF_RUN] },
      { text: 'DELETE FROM positions_expert_versions WHERE id LIKE $1', values: [MOTIF_RUN] },
      'ALTER TABLE positions_expert_versions ENABLE TRIGGER USER',
      'ALTER TABLE positions_expert_actes ENABLE TRIGGER USER',
      'ALTER TABLE arbitrages_conflits_sources ENABLE TRIGGER USER',
    ]);
    if (err) throw err;
  } finally {
    await observateur.end();
  }
});

describe('positions d’expert et arbitrages — deux sessions', () => {
  it('1. deux premières poses concurrentes : la seconde attend, puis est refusée', async () => {
    const a = await session();
    const b = await session();
    try {
      await a.client.query('BEGIN');
      await a.client.query(pose('p1a', 1));
      const enVol = b.client.query(pose('p1b', 1)).then(() => null, err => err);
      await attendreBloquee(observateur, b.pid);
      await a.client.query('COMMIT');
      const refus = await enVol;
      assert.ok(refus, 'deux premières poses ont passé sur le même couple.');
      assert.match(refus.message, /porte un arbitrage en vigueur/);
      assert.deepEqual(await tetes(observateur, 1), ['p1a']);
    } finally {
      await a.client.end();
      await b.client.end();
    }
  });

  it('2. deux premières versions concurrentes : la seconde attend, puis est refusée', async () => {
    const a = await session();
    const b = await session();
    try {
      await a.client.query('BEGIN');
      await a.client.query(version('v2a', 0, 'v1.0'));
      const enVol = b.client.query(version('v2b', 0, 'v2.0')).then(() => null, err => err);
      await attendreBloquee(observateur, b.pid);
      await a.client.query('COMMIT');
      const refus = await enVol;
      assert.ok(refus, 'deux premières versions ont passé pour la même position.');
      assert.match(refus.message, /doit réviser la version courante/);
      assert.deepEqual(await courantes(observateur, 0), ['v2a']);
    } finally {
      await a.client.end();
      await b.client.end();
    }
  });

  it('3. une révision puis un acte concurrent sur l’ancienne version : l’acte est refusé', async () => {
    const a = await session();
    const b = await session();
    try {
      assert.equal(await transaction(observateur, [version('v3', 1, 'v1.0')]), null);
      await a.client.query('BEGIN');
      await a.client.query(version('v3r', 1, 'v1.1', 'v3'));
      const enVol = b.client.query(acte('a3', 'v3')).then(() => null, err => err);
      await attendreBloquee(observateur, b.pid);
      await a.client.query('COMMIT');
      const refus = await enVol;
      assert.ok(refus, 'une version révisée a reçu un acte.');
      assert.match(refus.message, /a été révisée/);
      assert.deepEqual(await courantes(observateur, 1), ['v3r']);
    } finally {
      await a.client.end();
      await b.client.end();
    }
  });

  it('4. un retrait puis un arbitrage concurrent qui retient la position : l’arbitrage est refusé', async () => {
    const a = await session();
    const b = await session();
    try {
      // L'empreinte calculée en JS est celle que la base recalcule : la
      // signature passe.
      assert.equal(await transaction(observateur, [version('v4', 2, 'v1.0'), acte('a4s', 'v4')]), null);
      await a.client.query('BEGIN');
      await a.client.query(acte('a4r', 'v4', 'retiree'));
      const enVol = b.client.query(pose('p4', 4, { position: 'v4' })).then(() => null, err => err);
      await attendreBloquee(observateur, b.pid);
      await a.client.query('COMMIT');
      const refus = await enVol;
      assert.ok(refus, 'une position retirée a été retenue.');
      assert.match(refus.message, /n'est pas signée en vigueur/);
      assert.deepEqual(await tetes(observateur, 4), []);
    } finally {
      await a.client.end();
      await b.client.end();
    }
  });

  it('5. une révocation puis un remplacement concurrent de la même tête : le remplacement est refusé', async () => {
    const a = await session();
    const b = await session();
    try {
      assert.equal(await transaction(observateur, [pose('p5', 5)]), null);
      await a.client.query('BEGIN');
      await a.client.query(revocation('r5', 5, 'p5'));
      const enVol = b.client.query(pose('p5b', 5, { remplace: 'p5' })).then(() => null, err => err);
      await attendreBloquee(observateur, b.pid);
      await a.client.query('COMMIT');
      const refus = await enVol;
      assert.ok(refus, 'une tête révoquée a été remplacée.');
      assert.match(refus.message, /n'est pas arbitré/);
      assert.deepEqual(await tetes(observateur, 5), []);
    } finally {
      await a.client.end();
      await b.client.end();
    }
  });

  it('6. le scénario de Codex : SERIALIZABLE contre une écriture READ COMMITTED commise — refusé', async () => {
    const a = await session();
    const b = await session();
    try {
      // L'instantané de A est fixé AVANT la pose de B.
      await a.client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');
      await a.client.query('SELECT count(*) FROM arbitrages_conflits_sources');
      assert.equal(await transaction(b.client, [pose('p6b', 6)]), null);
      const refusPose = await a.client.query(pose('p6a', 6)).then(() => null, err => err);
      await a.client.query('ROLLBACK');
      assert.ok(refusPose, 'une seconde tête a passé en SERIALIZABLE.');
      assert.match(refusPose.message, /arbitrage refusé en SERIALIZABLE/);
      assert.deepEqual(await tetes(observateur, 6), ['p6b']);

      // De même pour deux premières versions d'une position.
      await a.client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');
      await a.client.query('SELECT count(*) FROM positions_expert_versions');
      assert.equal(await transaction(b.client, [version('v6b', 3, 'v1.0')]), null);
      const refusVersion = await a.client.query(version('v6a', 3, 'v2.0')).then(() => null, err => err);
      await a.client.query('ROLLBACK');
      assert.ok(refusVersion, 'une seconde version courante a passé en SERIALIZABLE.');
      assert.match(refusVersion.message, /version de position refusée en SERIALIZABLE/);
      assert.deepEqual(await courantes(observateur, 3), ['v6b']);
    } finally {
      await a.client.end();
      await b.client.end();
    }
  });

  it('7. REPEATABLE READ et SERIALIZABLE sont refusés sur les trois tables', async () => {
    const b = await session();
    try {
      assert.equal(await transaction(observateur, [version('v7', 4, 'v1.0')]), null);
      for (const niveau of ['REPEATABLE READ', 'SERIALIZABLE']) {
        const debut = `BEGIN ISOLATION LEVEL ${niveau}`;
        const cas = [
          [version(`v7_${niveau.length}`, 5, 'v1.0'), new RegExp(`version de position refusée en ${niveau}`)],
          [acte(`a7_${niveau.length}`, 'v7'), new RegExp(`acte de position refusé en ${niveau}`)],
          [pose(`p7_${niveau.length}`, 7), new RegExp(`arbitrage refusé en ${niveau}`)],
        ];
        for (const [instruction, attendu] of cas) {
          const refus = await transaction(b.client, [instruction], debut);
          assert.ok(refus, `une écriture est passée en ${niveau}.`);
          assert.match(refus.message, attendu);
        }
      }
      assert.deepEqual(await courantes(observateur, 5), []);
      assert.deepEqual(await tetes(observateur, 7), []);
    } finally {
      await b.client.end();
    }
  });
});
