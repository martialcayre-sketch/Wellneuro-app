// BANC DE L'ÉCRIVAIN NABM CONTRE POSTGRESQL — signature, retrait, constat
// « aucun acte » et son retrait (M-3c, PR 2, F54).
//
// POURQUOI CE FICHIER EXISTE. La migration `20261016100000_nabm_journal_
// constats_v1` refuse au COMMIT tout geste sans sa ligne de journal, et toute
// dernière ligne de journal qui ne concorde pas avec l'état final. Les bancs
// Vitest de `correspondancesNabm.ts` ne jouent que des mocks : ils ne
// prouvent pas que la base ACCEPTE ce que l'écrivain écrit. Celui-ci joue le
// VRAI écrivain (`deciderCorrespondance`, `deciderConstat`, client Prisma et
// adaptateur `pg` de production) et vérifie, contre la base :
//   0. contre-épreuve : une signature brute sans journal est refusée — la
//      garde est armée, le vert des gestes ci-dessous n'est pas un vide ;
//   1. signer : une ligne `signature` de la même transaction ; la date rendue
//      est celle que la base a posée (N-3 c) ;
//   2. retirer avec cette date : accepté, la ligne `retrait_signature`
//      recopie la signature effacée ;
//   3. retirer à nouveau : `etat_divergent`, aucune ligne de journal, pas
//      d'erreur technique (N-3 a) ;
//   4. re-signer depuis la proposition, puis retirer : les lignes dans
//      l'ordre des gestes (N-3 b) ;
//   5. constater sur le millésime vu : accepté, date relue ; constater encore,
//      ou sur un autre millésime : `etat_divergent`, rien d'écrit ;
//   6. signer un analyte qui porte un constat : `constat_present`, rien
//      d'écrit ; puis retirer le constat : accepté, journalisé ;
//   7. course avec un import NABM (R2) : un geste lancé pendant qu'une
//      session tient le verrou de l'import (`SHARE ROW EXCLUSIVE` sur
//      `biology_catalog_versions_courantes`, celui de `prisma/importNabm.ts`)
//      ATTEND sa fin avant de lire le millésime ;
//   8. un import qui dure : l'attente bornée (3 s) rend `import_en_cours`,
//      rien n'est écrit, aucune requête ne reste en file ;
//   9. un autre geste tient l'analyte : son attente épuisée rend
//      `etat_divergent`, jamais `import_en_cours` ;
//  10. signature en lot ([[D-326]] §2) : trois couples, dont deux du même
//      analyte, dans une transaction — acceptés au COMMIT, une ligne de
//      journal chacun ;
//  11. tout ou rien : un lot dont la dernière ligne vise un acte absent du
//      millésime est refusé, la ligne nommée, et rien n'est écrit — ni
//      correspondance, ni journal.
//
// ÉCRIT EN BASE ET COMMET : base NOMMÉE (`WN_NABM_GESTES_BANC_BASE`) et
// LOCALE. Le journal est en ajout seul et sa clé vers l'analyte est RESTRICT :
// l'analyte de banc et les lignes de journal RESTENT (base jetable de T3 et du
// CI). L'analyte de banc finit inactif, en provenance `labo` (le contrat de
// données du catalogue compte les `saisie_praticien`). Le constat se pose sur
// un analyte du catalogue que la liste préparée range « aucun acte » — le seul
// où l'écrivain l'accepte — et il est retiré à la fin, par l'écrivain.
// Lancé par `node prisma/runWithAlias.js scripts/banc-nabm-gestes-prisma.test.ts`
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
if (process.env.WN_NABM_GESTES_BANC_BASE !== cible.pathname.slice(1)) {
  throw new Error(`REFUS : DATABASE_URL vise « ${cible.pathname.slice(1)} », WN_NABM_GESTES_BANC_BASE ne l'annonce pas.`);
}

// Les dates sont des `timestamp` sans fuseau, écrites en UTC (convention de
// Prisma, que les triggers suivent) : `pg` les lirait en heure locale.
pg.types.setTypeParser(1114, valeur => new Date(`${valeur.replace(' ', 'T')}Z`));

const RUN = randomBytes(4).toString('hex');
const PRATICIEN = 'praticien@wellneuro.fr';
const ANALYTE = `BIO_BANC_GESTE_${RUN.toUpperCase()}`;
// Les analytes de banc du lot (D-326 §2) : le premier reçoit deux couples, le
// second aucun (lot refusé).
const ANALYTE_LOT = `BIO_BANC_LOT_${RUN.toUpperCase()}`;
const ANALYTE_LOT_REFUS = `BIO_BANC_LOTR_${RUN.toUpperCase()}`;
const ANALYTES_DE_BANC = [ANALYTE, ANALYTE_LOT, ANALYTE_LOT_REFUS];
const SOURCE = 'nabm_smt_ans';
const id = (nom: string) => `${nom}_${RUN}`;

let millesime = '';
let codeActe = '';
let codeActe2 = '';
let codeAbsent = '';
let pointeurDeBanc = false;
let analyteConstat = '';

type Ligne = { acte: string; code_acte: string | null; praticien_email: string; efface_par: string | null; efface_le: Date | null };

async function journal(c: pg.Client, analyte: string): Promise<Ligne[]> {
  const { rows } = await c.query<Ligne>(
    `SELECT acte, code_acte, praticien_email, efface_par, efface_le
       FROM biology_analyte_nabm_journal WHERE analyte_code = $1 ORDER BY ordre`,
    [analyte],
  );
  return rows;
}

async function poserFixtures(c: pg.Client, aucunActe: readonly string[], millesimeListe: string) {
  const { rows } = await c.query(
    `SELECT v.version_source, (
       SELECT a.code_acte FROM biology_nabm_actes a
       WHERE a.version_source = v.version_source AND NOT a.inactif ORDER BY a.code_acte LIMIT 1
     ) AS code_acte, (
       SELECT a.code_acte FROM biology_nabm_actes a
       WHERE a.version_source = v.version_source AND NOT a.inactif ORDER BY a.code_acte OFFSET 1 LIMIT 1
     ) AS code_acte2
     FROM biology_catalog_versions_courantes v WHERE v.source_provenance = $1`,
    [SOURCE],
  );
  // Un analyte que la liste range « aucun acte », présent, actif, sans
  // signature ni constat : celui du constat.
  const libres = await c.query<{ code: string }>(
    `SELECT a.code FROM biology_analytes a
      WHERE a.code = ANY($1::text[]) AND a.actif
        AND NOT EXISTS (SELECT 1 FROM biology_analyte_nabm n WHERE n.analyte_code = a.code AND n.verifie_par IS NOT NULL)
        AND NOT EXISTS (SELECT 1 FROM biology_analyte_nabm_constats k WHERE k.analyte_code = a.code)
      ORDER BY a.code LIMIT 1`,
    [aucunActe],
  );
  assert.ok(libres.rows[0], 'aucun analyte « aucun acte » libre au catalogue : le banc ne peut pas poser de constat.');
  analyteConstat = libres.rows[0].code;

  await c.query('BEGIN');
  // Le constat ne se pose que sur le millésime où la liste a été relue :
  // le pointeur de banc le porte, un pointeur existant doit le porter.
  if (rows[0]?.code_acte) {
    millesime = rows[0].version_source;
    codeActe = rows[0].code_acte;
    assert.ok(rows[0].code_acte2, 'un seul acte actif au millésime courant : le banc du lot en demande deux.');
    codeActe2 = rows[0].code_acte2;
    assert.equal(
      millesime,
      millesimeListe,
      `le millésime courant de la base (${millesime}) n'est pas celui de la liste (${millesimeListe}) : aucun constat ne se pose.`,
    );
  } else {
    assert.equal(rows.length, 0, 'un millésime courant sans acte actif : le banc ne peut pas choisir son acte.');
    millesime = millesimeListe;
    codeActe = '0001';
    codeActe2 = '0002';
    pointeurDeBanc = true;
    await c.query(
      `INSERT INTO biology_catalog_versions_courantes (id, source_provenance, version_source, updated_at)
       VALUES ($1, $2, $3, now())`,
      [id('pointeur'), SOURCE, millesime],
    );
    await c.query(
      `INSERT INTO biology_nabm_actes (id, code_acte, version_source, libelle, updated_at)
       VALUES ($1, $2, $3, 'Acte de banc', now())`,
      [id('acte'), codeActe, millesime],
    );
    await c.query(
      `INSERT INTO biology_nabm_actes (id, code_acte, version_source, libelle, updated_at)
       VALUES ($1, $2, $3, 'Second acte de banc', now())`,
      [id('acte2'), codeActe2, millesime],
    );
  }
  // Un code à quatre chiffres absent du millésime : la ligne refusée du lot.
  const { rows: absent } = await c.query<{ code: string }>(
    `SELECT lpad(n::text, 4, '0') AS code FROM generate_series(9999, 1, -1) n
      WHERE NOT EXISTS (
        SELECT 1 FROM biology_nabm_actes a WHERE a.version_source = $1 AND a.code_acte = lpad(n::text, 4, '0'))
      LIMIT 1`,
    [millesime],
  );
  codeAbsent = absent[0].code;
  for (const [nom, code] of [['analyte', ANALYTE], ['analyte_lot', ANALYTE_LOT], ['analyte_lotr', ANALYTE_LOT_REFUS]]) {
    await c.query(
      `INSERT INTO biology_analytes (id, code, libelle, type_prelevement, source_provenance, niveau_completude, updated_at)
       VALUES ($1, $2, 'Analyte de banc', 'sang', 'labo', 'partielle', now())`,
      [id(nom), code],
    );
  }
  await c.query('COMMIT');
}

async function effacerFixtures(c: pg.Client) {
  await c.query('BEGIN');
  // Ce qu'un échec aurait laissé signé se retire avec sa ligne de journal.
  await c.query(
    `INSERT INTO biology_analyte_nabm_journal (id, analyte_code, acte, code_acte, nature, praticien_email, efface_par, efface_le)
     SELECT $1 || c.analyte_code || '_' || c.code_acte, c.analyte_code, 'retrait_signature', c.code_acte, c.nature, $2, c.verifie_par, c.verifie_le
       FROM biology_analyte_nabm c WHERE c.analyte_code = ANY($3::text[]) AND c.verifie_par IS NOT NULL`,
    [`banc_rs_${RUN}_`, PRATICIEN, ANALYTES_DE_BANC],
  );
  await c.query('DELETE FROM biology_analyte_nabm WHERE analyte_code = ANY($1::text[])', [ANALYTES_DE_BANC]);
  if (analyteConstat) {
    await c.query(
      `INSERT INTO biology_analyte_nabm_journal (id, analyte_code, acte, millesime, praticien_email, efface_par, efface_le)
       SELECT $1, k.analyte_code, 'retrait_constat', k.millesime, $2, k.verifie_par, k.verifie_le
         FROM biology_analyte_nabm_constats k WHERE k.analyte_code = $3 AND k.verifie_par = $2`,
      [id('banc_rk'), PRATICIEN, analyteConstat],
    );
    await c.query('DELETE FROM biology_analyte_nabm_constats WHERE analyte_code = $1 AND verifie_par = $2', [
      analyteConstat,
      PRATICIEN,
    ]);
  }
  await c.query('UPDATE biology_analytes SET actif = false WHERE code = ANY($1::text[])', [ANALYTES_DE_BANC]);
  if (pointeurDeBanc) {
    await c.query('DELETE FROM biology_catalog_versions_courantes WHERE id = $1', [id('pointeur')]);
    await c.query('DELETE FROM biology_nabm_actes WHERE id = ANY($1::text[])', [[id('acte'), id('acte2')]]);
  }
  await c.query('COMMIT');
}

/** Attend qu'une requête de `c2` soit bloquée sur un verrou (session
 *  d'observation hors transaction : `pg_stat_activity` y est fraîche). */
async function attendreBlocage(c: pg.Client, motif: string) {
  const limite = Date.now() + 10_000;
  while (Date.now() < limite) {
    const { rows } = await c.query(
      `SELECT count(*)::int AS n FROM pg_stat_activity
        WHERE datname = current_database() AND wait_event_type = 'Lock' AND query ILIKE $1`,
      [`%${motif}%`],
    );
    if (rows[0].n >= 1) return;
    await new Promise(r => setTimeout(r, 25));
  }
  assert.fail(`le geste devait attendre le verrou de l'import (${motif}) : la course n'a pas eu lieu.`);
}

async function main() {
  const { deciderConstat, deciderCorrespondance, signerCorrespondancesLot } = await import(
    '@/lib/biology-library/correspondancesNabm'
  );
  const { CANDIDATS_NABM, MILLESIME_LISTE_NABM } = await import('@/lib/biology-library/candidatsNabm');
  const { prisma } = await import('@/lib/prisma');
  const c = new pg.Client({ connectionString: URL_BASE });
  const verrou = new pg.Client({ connectionString: URL_BASE });
  await c.connect();
  await verrou.connect();
  try {
    const aucunActe = Object.entries(CANDIDATS_NABM)
      .filter(([, v]) => v.situation === 'aucun_acte')
      .map(([code]) => code);
    await poserFixtures(c, aucunActe, MILLESIME_LISTE_NABM);
    const signer = { analyteCode: ANALYTE, codeActe, decision: 'signer' as const, nature: 'isole', praticien: PRATICIEN };

    // 0. Contre-épreuve : sans journal, la base refuse.
    await c.query('BEGIN');
    await assert.rejects(
      async () => {
        await c.query(
          `INSERT INTO biology_analyte_nabm (id, analyte_code, code_acte, nature, verifie_par, verifie_le)
           VALUES ($1, $2, $3, 'isole', $4, now())`,
          [id('brute'), ANALYTE, codeActe, PRATICIEN],
        );
        await c.query('COMMIT');
      },
      /aucune ligne de journal « signature »/,
    );
    await c.query('ROLLBACK').catch(() => {});
    assert.deepEqual(await journal(c, ANALYTE), []);
    console.log('ok 0 — contre-épreuve : une signature brute sans journal est refusée au COMMIT');

    // 1. Signer.
    const s1 = await deciderCorrespondance({ ...signer, etatAttendu: 'absente' });
    assert.ok(s1.ok, `la signature devait passer : ${JSON.stringify(s1)}`);
    const { rows: enBase } = await c.query<{ verifie_le: Date }>(
      'SELECT verifie_le FROM biology_analyte_nabm WHERE analyte_code = $1 AND code_acte = $2',
      [ANALYTE, codeActe],
    );
    assert.equal(s1.correspondance.verifieLe, enBase[0].verifie_le.toISOString(), 'la date rendue doit être celle de la base');
    assert.deepEqual(
      (await journal(c, ANALYTE)).map(l => [l.acte, l.code_acte, l.praticien_email]),
      [['signature', codeActe, PRATICIEN]],
    );
    console.log('ok 1 — signer : une ligne « signature », date rendue = date posée par la base');

    // 2. Retirer avec la date rendue.
    const retirer = { ...signer, decision: 'retirer' as const, etatAttendu: 'signee' as const, nature: undefined };
    const r1 = await deciderCorrespondance({ ...retirer, verifieLeVu: new Date(s1.correspondance.verifieLe!) });
    assert.deepEqual(r1, { ok: true, correspondance: { codeActe, etat: 'proposition', verifiePar: null, verifieLe: null } });
    const apresRetrait = await journal(c, ANALYTE);
    assert.equal(apresRetrait.length, 2);
    assert.equal(apresRetrait[1].acte, 'retrait_signature');
    assert.equal(apresRetrait[1].efface_par, PRATICIEN);
    assert.equal(apresRetrait[1].efface_le?.toISOString(), s1.correspondance.verifieLe);
    console.log('ok 2 — retirer sur la date rendue : accepté, « retrait_signature » recopie la signature effacée');

    // 3. Retirer à nouveau : refus nommé, rien d'écrit.
    const r2 = await deciderCorrespondance({ ...retirer, verifieLeVu: new Date(s1.correspondance.verifieLe!) });
    assert.deepEqual(r2, { ok: false, raison: 'etat_divergent' });
    assert.equal((await journal(c, ANALYTE)).length, 2);
    console.log('ok 3 — retrait d’une signature déjà retirée : « etat_divergent », aucune ligne de journal');

    // 4. Re-signer depuis la proposition, puis retirer : l'ordre des gestes.
    const s2 = await deciderCorrespondance({ ...signer, etatAttendu: 'proposition', nature: 'groupe_ou' });
    assert.ok(s2.ok, `la re-signature devait passer : ${JSON.stringify(s2)}`);
    const r3 = await deciderCorrespondance({ ...retirer, verifieLeVu: new Date(s2.correspondance.verifieLe!) });
    assert.ok(r3.ok, `le second retrait devait passer : ${JSON.stringify(r3)}`);
    assert.deepEqual(
      (await journal(c, ANALYTE)).map(l => l.acte),
      ['signature', 'retrait_signature', 'signature', 'retrait_signature'],
    );
    console.log('ok 4 — re-signer puis retirer : quatre lignes, dans l’ordre des gestes');

    // 5. Constater, puis constater encore, puis sur un autre millésime.
    const constat = { analyteCode: analyteConstat, decision: 'constater' as const, praticien: PRATICIEN };
    const k1 = await deciderConstat({ ...constat, millesimeVu: millesime });
    assert.ok(k1.ok && k1.constat, `le constat devait passer : ${JSON.stringify(k1)}`);
    const { rows: kBase } = await c.query<{ verifie_le: Date }>(
      'SELECT verifie_le FROM biology_analyte_nabm_constats WHERE analyte_code = $1',
      [analyteConstat],
    );
    assert.equal(k1.constat.verifieLe, kBase[0].verifie_le.toISOString(), 'la date rendue doit être celle de la base');
    const lignesConstat = (await journal(c, analyteConstat)).length;
    assert.deepEqual(await deciderConstat({ ...constat, millesimeVu: millesime }), { ok: false, raison: 'etat_divergent' });
    assert.equal((await journal(c, analyteConstat)).length, lignesConstat);
    console.log('ok 5 — constater : accepté, date relue ; constater encore : « etat_divergent », rien d’écrit');

    // 6. Signer un analyte à constat, puis retirer le constat.
    const s3 = await deciderCorrespondance({ ...signer, analyteCode: analyteConstat, etatAttendu: 'absente' });
    assert.deepEqual(s3, { ok: false, raison: 'constat_present' });
    assert.equal((await journal(c, analyteConstat)).length, lignesConstat);
    const k2 = await deciderConstat({
      analyteCode: analyteConstat,
      decision: 'retirer',
      verifieLeVu: new Date(k1.constat.verifieLe),
      praticien: PRATICIEN,
    });
    assert.deepEqual(k2, { ok: true, constat: null });
    const fin = await journal(c, analyteConstat);
    assert.equal(fin.length, lignesConstat + 1);
    assert.equal(fin.at(-1)?.acte, 'retrait_constat');
    assert.equal(fin.at(-1)?.efface_le?.toISOString(), k1.constat.verifieLe);
    console.log('ok 6 — signature sur un analyte à constat : « constat_present » ; retrait du constat journalisé');

    // 7. Course avec un import NABM : le geste attend le verrou de l'import.
    await verrou.query('BEGIN');
    await verrou.query('LOCK TABLE biology_catalog_versions_courantes IN SHARE ROW EXCLUSIVE MODE');
    const enVol = deciderCorrespondance({ ...signer, etatAttendu: 'proposition' });
    try {
      await attendreBlocage(c, 'LOCK TABLE biology_catalog_versions_courantes IN SHARE MODE');
    } finally {
      await verrou.query('COMMIT');
      await Promise.allSettled([enVol]);
    }
    const s4 = await enVol;
    assert.ok(s4.ok, `le geste devait passer après l'import : ${JSON.stringify(s4)}`);
    console.log('ok 7 — un geste lancé pendant un import attend la fin de l’import (verrou de partage)');

    // 8. Un import qui dure : l'attente est bornée, le refus est nommé.
    const avant8 = (await journal(c, analyteConstat)).length;
    await verrou.query('BEGIN');
    await verrou.query('LOCK TABLE biology_catalog_versions_courantes IN SHARE ROW EXCLUSIVE MODE');
    // Sans borne, le geste ne rendrait JAMAIS la main tant que l'import tient
    // son verrou (Prisma n'interrompt pas la requête en file) : le banc
    // relâche le verrou au bout de 10 s et échoue, au lieu de bloquer.
    const enVol8 = deciderConstat({ analyteCode: analyteConstat, decision: 'constater', millesimeVu: millesime, praticien: PRATICIEN });
    let k8: Awaited<typeof enVol8> | 'bloque';
    try {
      k8 = await Promise.race([enVol8, new Promise<'bloque'>(r => setTimeout(() => r('bloque'), 10_000))]);
    } finally {
      await verrou.query('COMMIT');
      await Promise.allSettled([enVol8]);
    }
    assert.notEqual(k8, 'bloque', 'le geste a attendu l’import sans borne : la connexion reste retenue');
    if (k8 !== 'bloque' && k8.ok) {
      // Un constat posé malgré tout serait retiré par le nettoyage final.
      assert.fail(`le geste devait être refusé pendant l'import : ${JSON.stringify(k8)}`);
    }
    assert.deepEqual(k8, { ok: false, raison: 'import_en_cours' });
    assert.equal((await journal(c, analyteConstat)).length, avant8);
    const { rows: enAttente } = await c.query(
      `SELECT count(*)::int AS n FROM pg_stat_activity
        WHERE datname = current_database() AND wait_event_type = 'Lock' AND query ILIKE '%IN SHARE MODE%'`,
    );
    assert.equal(enAttente[0].n, 0, 'aucune requête du geste ne doit rester en file après le refus');
    console.log('ok 8 — import qui dure : « import_en_cours » au bout de 3 s, rien d’écrit, aucune requête en file');

    // 9. Un autre geste tient l'analyte : son attente épuisée ne se dit pas
    //    « import » (revue CodeRabbit de #1496).
    await verrou.query('BEGIN');
    await verrou.query('SELECT pg_advisory_xact_lock(292, hashtext($1))', [analyteConstat]);
    const enVol9 = deciderConstat({ analyteCode: analyteConstat, decision: 'constater', millesimeVu: millesime, praticien: PRATICIEN });
    let k9: Awaited<typeof enVol9> | 'bloque';
    try {
      k9 = await Promise.race([enVol9, new Promise<'bloque'>(r => setTimeout(() => r('bloque'), 10_000))]);
    } finally {
      await verrou.query('COMMIT');
      await Promise.allSettled([enVol9]);
    }
    assert.deepEqual(k9, { ok: false, raison: 'etat_divergent' });
    assert.equal((await journal(c, analyteConstat)).length, avant8);
    console.log('ok 9 — analyte tenu par un autre geste : « etat_divergent » au bout de 3 s, rien d’écrit');

    // 10. Signature en lot : trois couples, deux du même analyte, une transaction.
    const avant10 = (await journal(c, ANALYTE)).length;
    const l10 = await signerCorrespondancesLot({
      lignes: [
        { analyteCode: ANALYTE_LOT, codeActe, nature: 'isole' },
        { analyteCode: ANALYTE_LOT, codeActe: codeActe2, nature: 'groupe_et' },
        { analyteCode: ANALYTE, codeActe: codeActe2, nature: 'isole' },
      ],
      praticien: PRATICIEN,
    });
    assert.deepEqual(l10, { ok: true, signees: 3 });
    const { rows: signeesLot } = await c.query<{ verifie_par: string }>(
      `SELECT verifie_par FROM biology_analyte_nabm
        WHERE analyte_code = $1 OR (analyte_code = $2 AND code_acte = $3)`,
      [ANALYTE_LOT, ANALYTE, codeActe2],
    );
    assert.equal(signeesLot.length, 3);
    assert.ok(signeesLot.every(l => l.verifie_par === PRATICIEN), 'chaque couple porte la signature de la session');
    assert.deepEqual(
      (await journal(c, ANALYTE_LOT)).map(l => [l.acte, l.code_acte, l.praticien_email]),
      [
        ['signature', codeActe, PRATICIEN],
        ['signature', codeActe2, PRATICIEN],
      ],
    );
    assert.equal((await journal(c, ANALYTE)).length, avant10 + 1);
    console.log('ok 10 — lot de trois couples (deux du même analyte) : accepté au COMMIT, une ligne de journal chacun');

    // 11. Tout ou rien : la dernière ligne vise un acte absent du millésime.
    const l11 = await signerCorrespondancesLot({
      lignes: [
        { analyteCode: ANALYTE_LOT_REFUS, codeActe, nature: 'isole' },
        { analyteCode: ANALYTE_LOT_REFUS, codeActe: codeAbsent, nature: 'isole' },
      ],
      praticien: PRATICIEN,
    });
    assert.deepEqual(l11, {
      ok: false,
      raison: 'acte_introuvable',
      ligne: { analyteCode: ANALYTE_LOT_REFUS, codeActe: codeAbsent },
    });
    const { rows: rien } = await c.query<{ n: number }>(
      'SELECT count(*)::int AS n FROM biology_analyte_nabm WHERE analyte_code = $1',
      [ANALYTE_LOT_REFUS],
    );
    assert.equal(rien[0].n, 0, 'la première ligne, valide, ne doit pas avoir été écrite');
    assert.deepEqual(await journal(c, ANALYTE_LOT_REFUS), []);
    console.log('ok 11 — lot refusé sur sa dernière ligne : la ligne nommée, aucune correspondance ni journal écrits');
  } finally {
    try {
      await verrou.query('ROLLBACK').catch(() => {});
      await effacerFixtures(c);
    } finally {
      await c.end();
      await verrou.end();
      await prisma.$disconnect();
    }
  }
}

main().catch(err => {
  console.error('ÉCHEC du banc de l’écrivain NABM :', err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
