// BANC DE REJEU — la migration des dix-sept liens analyte-axe signés
// ([[D-351]] §5, F79, migration `20261024160000_biology_liens_axe_signes_v1`).
//
// POURQUOI CE FICHIER EXISTE. La base du CI est construite par `migrate
// deploy` seul et ne porte aucun claim : la migration n'y écrit rien (corpus
// vide = aucun lien, arbitrage du responsable du 2026-10-24), et le contrat de
// la liste exacte (`prisma/checks/biology_liens_axe_v1.sql`) n'y voit qu'une
// cible vide. Sans ce banc, le chemin d'insertion et le contrat complet ne
// tourneraient pour la première fois qu'en production. Ici, chaque cas :
//   1. ouvre une transaction et pose les seize claims cités en fixture
//      (`VALIDE`, actifs, non supplantés, v1.0 ; texte, source et embedding
//      fictifs) ;
//   2. rejoue le fichier de migration TEL QU'IL EST COMMITTÉ — lu sur le
//      disque, jamais recopié ;
//   3. joue le contrat de la liste exacte, ou constate l'échec attendu ;
//   4. annule tout.
// Les cas qui doivent rougir sont reconnus à leur motif, pas au seul échec :
// un échec pour une autre raison laisserait le banc vert sans rien prouver.
// Le message reçu n'est jamais imprimé, seul son code SQLSTATE l'est.
//
// LA BASE NOMMÉE N'EST PAS ÉCRITE PAR ERREUR. Tout le banc (rejeux et cas à
// deux sessions) tourne dans un CLONE jetable de la base nommée (`CREATE
// DATABASE … TEMPLATE`), supprimé à la fin. Un COMMIT glissé dans la
// migration ou dans le contrat ne toucherait que le clone. La garde lexicale
// reste, en refus précoce et lisible. À la fin, la suppression du clone est
// exigée, et une session neuve compare la base nommée à son relevé d'avant
// le banc.
//
// PÉRIMÈTRE DE LA MENACE (arbitrage du responsable du 2026-10-24, troisième
// passe Codex de #1687) : le banc protège la base nommée contre une ERREUR
// dans deux fichiers committés et relus en P0 — instruction de transaction
// glissée, nom de base qui déborde, hôte détourné par l'URL. Il ne prétend
// pas résister à un SQL délibérément hostile : sous le rôle superutilisateur
// du CI, un tel SQL atteint de toute façon la base nommée (dblink), et il
// aurait des droits complets en production, où ces fichiers s'appliquent.
// La garde refuse quand même les moyens connus de sortir du clone
// (`CREATE EXTENSION`, dblink, postgres_fdw).
//
// La base visée doit être NOMMÉE et locale (patron des bancs à deux
// sessions) : `WN_LIENS_AXE_BANC_BASE` doit égaler le nom de la base de
// `DATABASE_URL`. Le rôle doit pouvoir créer une base (superutilisateur au
// CI et en T3), et aucune autre session ne doit être ouverte sur la base
// nommée pendant le clonage. Le banc refuse une base qui porte déjà un
// corpus : il n'a de sens que sur une base sans claim.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const URL_BASE = process.env.DATABASE_URL;
if (!URL_BASE) throw new Error('DATABASE_URL est requise.');
const BASE_ATTENDUE = process.env.WN_LIENS_AXE_BANC_BASE;
const URL_ANALYSEE = new URL(URL_BASE);
// `pg` lit aussi les paramètres de la chaîne de requête (`?host=`…), qui
// priment sur l'hôte de l'URL : contrôler `hostname` seul ne disait pas où
// le client se connecte (troisième passe Codex de #1687). Le banc refuse
// toute chaîne de requête, et ne transmet jamais l'URL à `pg` : il lui donne
// une configuration construite champ par champ, dont l'hôte est contrôlé.
if (URL_ANALYSEE.search !== '' || URL_ANALYSEE.hash !== '') {
  throw new Error('REFUS : DATABASE_URL porte des paramètres, le banc n\'accepte qu\'hôte, port, rôle et base.');
}
const HOTE = URL_ANALYSEE.hostname;
if (HOTE !== '127.0.0.1' && HOTE !== 'localhost') {
  throw new Error(`REFUS : DATABASE_URL vise l'hôte « ${HOTE} », le banc ne joue que sur une base locale.`);
}
const BASE_REELLE = decodeURIComponent(URL_ANALYSEE.pathname.slice(1));
if (!BASE_ATTENDUE || BASE_ATTENDUE !== BASE_REELLE) {
  throw new Error(
    `REFUS : DATABASE_URL vise « ${BASE_REELLE} », WN_LIENS_AXE_BANC_BASE annonce « ${BASE_ATTENDUE ?? ''} ».`,
  );
}
const configVers = (database) => ({
  host: HOTE,
  port: URL_ANALYSEE.port ? Number(URL_ANALYSEE.port) : 5432,
  user: decodeURIComponent(URL_ANALYSEE.username),
  password: decodeURIComponent(URL_ANALYSEE.password) || undefined,
  database,
});

const WEB = join(dirname(fileURLToPath(import.meta.url)), '..');
const MIGRATION = readFileSync(
  join(WEB, 'prisma/migrations/20261024160000_biology_liens_axe_signes_v1/migration.sql'),
  'utf8',
);
const CONTRAT = readFileSync(join(WEB, 'prisma/checks/biology_liens_axe_v1.sql'), 'utf8');

// GARDE DE TRANSACTION, en refus précoce. Un COMMIT (ou END, ABORT…) dans la
// migration, ou un contrat qui finirait par COMMIT, ferait du rejeu autre
// chose qu'un rejeu annulé. La garde LIT le SQL : un analyseur lexical
// parcourt le texte caractère par caractère et reconnaît, dans cet ordre de
// priorité à chaque position, les commentaires `--` et `/* */` (imbriqués),
// les chaînes `'…'` (avec `''`, et les antislashs des chaînes `E'…'`), les
// identifiants `"…"` et les corps `$étiquette$…$étiquette$`. Seul le texte
// hors de ces blocs est découpé au point-virgule. Ses deux premières
// versions, à coups d'expressions régulières, laissaient passer
// `SELECT 1; COMMIT;`, puis `/* fin */ COMMIT;` et un `--` logé dans une
// chaîne (passe Codex de #1687).
const TRANSACTION = /^(BEGIN|COMMIT|END|ROLLBACK|ABORT|START\s+TRANSACTION|SAVEPOINT|RELEASE|PREPARE\s+TRANSACTION)\b/i;
function instructions(sql) {
  const resultat = [];
  let courante = '';
  let i = 0;
  const n = sql.length;
  const identifiant = (c) => /[A-Za-z0-9_]/.test(c ?? '');
  while (i < n) {
    const c = sql[i];
    const suivant = sql[i + 1];
    if (c === '-' && suivant === '-') {
      while (i < n && sql[i] !== '\n') i += 1;
      courante += ' ';
    } else if (c === '/' && suivant === '*') {
      let profondeur = 1;
      i += 2;
      while (i < n && profondeur > 0) {
        if (sql[i] === '/' && sql[i + 1] === '*') { profondeur += 1; i += 2; }
        else if (sql[i] === '*' && sql[i + 1] === '/') { profondeur -= 1; i += 2; }
        else i += 1;
      }
      courante += ' ';
    } else if (c === "'") {
      const echappee = /[Ee]/.test(sql[i - 1] ?? '') && !identifiant(sql[i - 2]);
      i += 1;
      while (i < n) {
        if (echappee && sql[i] === '\\') { i += 2; continue; }
        if (sql[i] === "'" && sql[i + 1] === "'") { i += 2; continue; }
        if (sql[i] === "'") { i += 1; break; }
        i += 1;
      }
      courante += "''";
    } else if (c === '"') {
      i += 1;
      while (i < n) {
        if (sql[i] === '"' && sql[i + 1] === '"') { i += 2; continue; }
        if (sql[i] === '"') { i += 1; break; }
        i += 1;
      }
      courante += '""';
    } else if (c === '$' && !identifiant(sql[i - 1])) {
      const m = /^\$([A-Za-z_][A-Za-z0-9_]*)?\$/.exec(sql.slice(i));
      if (m) {
        const fin = sql.indexOf(m[0], i + m[0].length);
        i = fin === -1 ? n : fin + m[0].length;
        courante += ' $$ ';
      } else {
        courante += c;
        i += 1;
      }
    } else if (c === ';') {
      resultat.push(courante);
      courante = '';
      i += 1;
    } else {
      courante += c;
      i += 1;
    }
  }
  resultat.push(courante);
  return resultat.map((x) => x.replace(/\s+/g, ' ').trim().toUpperCase()).filter(Boolean);
}
// La migration : aucune instruction de transaction.
function migrationSure(sql) {
  return !instructions(sql).some((x) => TRANSACTION.test(x));
}
// Le contrat : BEGIN TRANSACTION READ ONLY en tête, ROLLBACK en dernier, et
// aucune autre instruction de transaction.
function contratSur(sql) {
  const tout = instructions(sql);
  const tx = tout.filter((x) => TRANSACTION.test(x));
  return tx.length === 2 && tx[0] === 'BEGIN TRANSACTION READ ONLY' && tx[1] === 'ROLLBACK'
    && tout[0] === tx[0] && tout.at(-1) === 'ROLLBACK';
}
// Les moyens connus de sortir du clone vers une autre base, ou vers le
// système : extension posée à la volée, dblink, postgres_fdw, COPY vers un
// programme. Cherchés dans le texte ENTIER, corps entre dollars compris
// (troisième passe Codex de #1687 ; refus d'une erreur, pas d'un adversaire,
// voir l'en-tête).
function sansSortie(sql) {
  return !/\b(dblink\w*|postgres_fdw)\b/i.test(sql)
    && !instructions(sql).some((x) => /^CREATE (OR REPLACE )?EXTENSION\b/.test(x) || /\bPROGRAM\b/.test(x));
}
// La garde s'éprouve elle-même avant toute connexion : les contre-exemples
// des passes Codex, et leurs voisins, doivent être refusés.
const avantRollback = (ajout) => CONTRAT.replace(/ROLLBACK;\s*$/, `${ajout}\nROLLBACK;\n`);
const MUTATIONS_SORTIE = [
  ['migration + « CREATE EXTENSION dblink; »', () => sansSortie(`${MIGRATION}\nCREATE EXTENSION dblink;\n`)],
  ["migration + dblink_exec dans un bloc DO", () => sansSortie(`${MIGRATION}\nDO $x$ BEGIN PERFORM dblink_exec('dbname=x', 'SELECT 1'); END $x$;\n`)],
  ['contrat + « CREATE EXTENSION postgres_fdw; »', () => sansSortie(avantRollback('CREATE EXTENSION postgres_fdw;'))],
  ["migration + « COPY t TO PROGRAM 'x'; »", () => sansSortie(`${MIGRATION}\nCOPY t TO PROGRAM 'x';\n`)],
];
for (const [nom, sur] of MUTATIONS_SORTIE) {
  if (sur()) throw new Error(`REFUS : la garde de sortie du clone laisse passer la mutation « ${nom} ».`);
}
if (!sansSortie(MIGRATION) || !sansSortie(CONTRAT)) {
  throw new Error('REFUS : la migration ou le contrat porte un moyen de sortir du clone (extension, dblink, postgres_fdw, PROGRAM).');
}
const MUTATIONS_GARDE = [
  ['migration + « SELECT 1; COMMIT; »', () => migrationSure(`${MIGRATION}\nSELECT 1; COMMIT;\n`)],
  ['migration + « END; » en fin', () => migrationSure(`${MIGRATION}\nEND;\n`)],
  ['migration + « /* fin */ COMMIT; »', () => migrationSure(`${MIGRATION}\n/* fin */ COMMIT;\n`)],
  ['migration + « /* a /* b */ c */ COMMIT; »', () => migrationSure(`${MIGRATION}\n/* a /* b */ c */ COMMIT;\n`)],
  ["migration + « SELECT '--'; COMMIT; » puis « SELECT 'x'; »", () => migrationSure(`${MIGRATION}\nSELECT '--'; COMMIT;\nSELECT 'x';\n`)],
  ["migration + « SELECT E'\\\\''; COMMIT; »", () => migrationSure(`${MIGRATION}\nSELECT E'\\''; COMMIT;\n`)],
  ['migration + « SELECT $q$;$q$; COMMIT; »', () => migrationSure(`${MIGRATION}\nSELECT $q$;$q$; COMMIT;\n`)],
  ['contrat clos par COMMIT', () => contratSur(CONTRAT.replace(/ROLLBACK;\s*$/, 'COMMIT;\n'))],
  ['contrat + « COMMIT; » avant le ROLLBACK', () => contratSur(avantRollback('COMMIT;'))],
  ['contrat + « /* fin */ COMMIT; » avant le ROLLBACK', () => contratSur(avantRollback('/* fin */ COMMIT;'))],
];
for (const [nom, sur] of MUTATIONS_GARDE) {
  if (sur()) throw new Error(`REFUS : la garde de transaction laisse passer la mutation « ${nom} ».`);
}
if (!migrationSure(MIGRATION)) {
  throw new Error('REFUS : la migration porte une instruction de transaction, le rejeu ne serait plus annulé.');
}
if (!contratSur(CONTRAT)) {
  throw new Error('REFUS : le contrat ne s\'ouvre pas par BEGIN TRANSACTION READ ONLY ou ne se clôt pas par le seul ROLLBACK.');
}

// ── Le clone jetable ──────────────────────────────────────────────────────
// Créé depuis la base nommée (migrations appliquées, trigger posé par
// `migrate deploy`), par une session sur la base de maintenance `postgres`.
// Un clone resté d'un banc interrompu est d'abord supprimé.
//
// LE NOM DU CLONE NE PEUT PAS DÉSIGNER LA SOURCE. Il était `<base>_f79_rejeu` :
// PostgreSQL tronque un identifiant à 63 octets, et pour un nom source assez
// long le suffixe disparaissait — le `DROP … WITH (FORCE)` supprimait la base
// source (troisième passe Codex de #1687). Le nom est désormais court et de
// longueur fixe (préfixe et empreinte de la base source, 23 octets), contrôlé
// AVANT tout DROP : il diffère de la source et des bases de maintenance, et
// tient sous la limite.
const LIMITE_IDENTIFIANT = 63;
const MAINTENANCE = ['postgres', 'template0', 'template1'];
if (!/^[a-z0-9_]+$/.test(BASE_REELLE) || Buffer.byteLength(BASE_REELLE) > LIMITE_IDENTIFIANT) {
  throw new Error(`REFUS : nom de base inattendu « ${BASE_REELLE} ».`);
}
if (MAINTENANCE.includes(BASE_REELLE)) {
  throw new Error(`REFUS : « ${BASE_REELLE} » est une base de maintenance.`);
}
const CLONE = `wn_banc_f79_${createHash('sha256').update(BASE_REELLE).digest('hex').slice(0, 11)}`;
if (CLONE === BASE_REELLE || MAINTENANCE.includes(CLONE) || Buffer.byteLength(CLONE) > LIMITE_IDENTIFIANT
    || !/^wn_banc_f79_[0-9a-f]{11}$/.test(CLONE)) {
  throw new Error(`REFUS : le nom du clone « ${CLONE} » ne se distingue pas de la base source.`);
}

// Relevé de la base nommée AVANT le banc : le constat final la compare à
// lui, table par table, et non à une liste de fixtures connues — un analyte
// ou un lien étranger, quel que soit son code, fait rougir.
const RELEVE = `
  SELECT (SELECT count(*) FROM biology_analytes)::int AS analytes,
         (SELECT count(*) FROM biology_ratios)::int AS rapports,
         (SELECT count(*) FROM biology_analyte_links)::int AS liens,
         (SELECT count(*) FROM rag_corpus_claims)::int AS claims`;
const releverBase = async () => {
  const c = new pg.Client(configVers(BASE_REELLE));
  await c.connect();
  try {
    return (await c.query(RELEVE)).rows[0];
  } finally {
    await c.end();
  }
};
const AVANT = await releverBase();

const maintenance = new pg.Client(configVers('postgres'));
await maintenance.connect();
await maintenance.query(`DROP DATABASE IF EXISTS "${CLONE}" WITH (FORCE)`);
await maintenance.query(`CREATE DATABASE "${CLONE}" TEMPLATE "${BASE_REELLE}"`);

// Les seize claims distincts cités par D-351 §2 (WN-CL-0294-004 porte deux
// liens). La liste exacte, elle, n'est écrite que dans la migration et dans
// le contrat : le banc ne la recopie pas, il les confronte.
const CLAIMS = [
  'WN-CL-0025-010', 'WN-CL-0041-061', 'WN-CL-0042-005', 'WN-CL-0043-014',
  'WN-CL-0043-030', 'WN-CL-0107-031', 'WN-CL-0107-033', 'WN-CL-0110-012',
  'WN-CL-0125-046', 'WN-CL-0125-047', 'WN-CL-0161-070', 'WN-CL-0161-081',
  'WN-CL-0291-015', 'WN-CL-0293-013', 'WN-CL-0294-004', 'WN-CL-0390-010',
];

const PRELUDE = `
BEGIN;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM rag_corpus_claims) THEN
    RAISE EXCEPTION 'banc F79 : la base porte déjà un corpus, refus';
  END IF;
  IF EXISTS (SELECT 1 FROM biology_analyte_links WHERE cible_type = 'axe') THEN
    RAISE EXCEPTION 'banc F79 : la base porte déjà des liens d''axe, refus';
  END IF;
END $$;
-- Le trigger existe déjà (migration appliquée par migrate deploy) : la
-- migration rejouée le recrée.
DROP TRIGGER biology_analyte_links_nutriment_axe_exclusifs ON public.biology_analyte_links;
INSERT INTO public.rag_corpus_claims
  (id, claim_id, source_id, version_claim, texte_normalise, content_sha256,
   typologie_lecture, prescriptif, statut, validateur, valide_at, active,
   metadata, embedding_model, embedding_dimensions, embedding)
SELECT '__f79_' || c.claim_id, c.claim_id, 'WN-SRC-0000', 'v1.0',
       'Fixture de banc — rejeu F79.', md5(c.claim_id) || md5('v1.0'),
       'déclaré', false, 'VALIDE', 'banc', now(), true,
       '{"fixture": "f79"}'::jsonb, 'banc', 1536,
       ('[' || repeat('0,', 1535) || '0]')::extensions.vector
FROM unnest(ARRAY[${CLAIMS.map((c) => `'${c}'`).join(', ')}]) AS c(claim_id);
`;

// Chaque cas : `avant` s'exécute après les fixtures et avant la migration,
// `apres` entre la migration et le contrat ; `motif` est le fragment du
// message attendu (null = le cas doit passer).
const CAS = [
  { nom: 'positif : 17 liens, liste exacte, claims certifiés', motif: null },

  // ── La migration refuse tout, faute d'un claim conforme ─────────────────
  {
    nom: 'claim REJETE',
    avant: `UPDATE rag_corpus_claims SET statut = 'REJETE' WHERE claim_id = 'WN-CL-0043-014';`,
    motif: 'D-351 §5 : 16 lien(s) sur 17',
  },
  {
    nom: 'claim inactif',
    avant: `UPDATE rag_corpus_claims SET active = false WHERE claim_id = 'WN-CL-0161-081';`,
    motif: 'D-351 §5 : 16 lien(s) sur 17',
  },
  {
    nom: 'claim supplanté',
    avant: `UPDATE rag_corpus_claims SET superseded_at = now() WHERE claim_id = 'WN-CL-0107-033';`,
    motif: 'D-351 §5 : 16 lien(s) sur 17',
  },
  {
    nom: 'claim dans une autre version que v1.0',
    avant: `UPDATE rag_corpus_claims SET version_claim = 'v1.1' WHERE claim_id = 'WN-CL-0291-015';`,
    motif: 'D-351 §5 : 16 lien(s) sur 17',
  },
  {
    nom: 'claim porteur de deux liens, absent',
    avant: `DELETE FROM rag_corpus_claims WHERE claim_id = 'WN-CL-0294-004';`,
    motif: 'D-351 §5 : 15 lien(s) sur 17',
  },
  {
    nom: 'cible axe déjà peuplée',
    avant: `INSERT INTO biology_analyte_links (id, analyte_code, cible_type, cible_code, direction, claim_id, version_claim)
            VALUES ('__f79_prealable', 'BIO_HOMOCYSTEINE', 'axe', 'methylation', 'haut_evocateur', 'WN-CL-0043-014', 'v1.0');`,
    motif: 'la table porte déjà des liens d\'axe',
  },

  // ── Le contrat rougit sur un lien en plus, en moins ou modifié ──────────
  {
    nom: 'un lien en moins',
    apres: `DELETE FROM biology_analyte_links WHERE id = 'bal_f79_05';`,
    motif: 'D-351 §2 : les liens d\'axe s\'écartent',
  },
  {
    nom: 'un lien en plus',
    apres: `INSERT INTO biology_analyte_links (id, analyte_code, cible_type, cible_code, direction, claim_id, version_claim)
            VALUES ('__f79_en_trop', 'BIO_CRP_US', 'axe', 'stress_oxydant', 'haut_evocateur', 'WN-CL-0125-047', 'v1.0');`,
    motif: 'D-351 §2 : les liens d\'axe s\'écartent',
  },
  {
    nom: 'sens modifié',
    apres: `UPDATE biology_analyte_links SET direction = 'haut_evocateur' WHERE id = 'bal_f79_11';`,
    motif: 'D-351 §2 : les liens d\'axe s\'écartent',
  },
  {
    nom: 'niveau de preuve inscrit',
    apres: `UPDATE biology_analyte_links SET niveau_preuve = 'C' WHERE id = 'bal_f79_01';`,
    motif: 'D-351 §2 : les liens d\'axe s\'écartent',
  },
  {
    nom: 'lien désactivé',
    apres: `UPDATE biology_analyte_links SET actif = false WHERE id = 'bal_f79_02';`,
    motif: 'D-351 §2 : les liens d\'axe s\'écartent',
  },
  {
    nom: 'claim échangé',
    apres: `UPDATE biology_analyte_links SET claim_id = 'WN-CL-0043-014' WHERE id = 'bal_f79_09';`,
    motif: 'D-351 §2 : les liens d\'axe s\'écartent',
  },
  {
    nom: 'version du claim modifiée',
    apres: `UPDATE biology_analyte_links SET version_claim = 'v1.1' WHERE id = 'bal_f79_07';`,
    motif: 'D-351 §2 : les liens d\'axe s\'écartent',
  },
  {
    nom: 'analyte échangé',
    apres: `UPDATE biology_analyte_links SET analyte_code = 'BIO_CRP_US' WHERE id = 'bal_f79_14';`,
    motif: 'D-351 §2 : les liens d\'axe s\'écartent',
  },
  {
    nom: 'axe échangé',
    apres: `UPDATE biology_analyte_links SET cible_code = 'inflammation' WHERE id = 'bal_f79_16';`,
    motif: 'D-351 §2 : les liens d\'axe s\'écartent',
  },

  // ── Le contrat rougit quand un claim cité cesse d'être certifié ─────────
  {
    nom: 'claim supplanté après la migration',
    apres: `UPDATE rag_corpus_claims SET superseded_at = now() WHERE claim_id = 'WN-CL-0110-012';`,
    motif: 'D-351 §5 : 1 lien(s) d\'axe citent un claim',
  },
];

let echecs = 0;
try {
  for (const cas of CAS) {
    const script = [PRELUDE, cas.avant ?? '', MIGRATION, cas.apres ?? '', CONTRAT].join('\n');
    const client = new pg.Client(configVers(CLONE));
    await client.connect();
    let erreur = null;
    try {
      await client.query(script);
    } catch (e) {
      erreur = e;
    }
    // Le contrat finit par ROLLBACK ; un script interrompu laisse une
    // transaction avortée. Dans les deux cas, rien ne survit.
    await client.query('ROLLBACK').catch(() => {});
    await client.end();

    if (cas.motif === null) {
      if (erreur) {
        echecs += 1;
        console.error(`ÉCHEC  ${cas.nom} : refusé (SQLSTATE ${erreur.code ?? '?'}) alors qu'il doit passer.`);
      } else {
        console.log(`ok     ${cas.nom}`);
      }
    } else if (!erreur) {
      echecs += 1;
      console.error(`ÉCHEC  ${cas.nom} : ACCEPTÉ alors qu'il doit rougir.`);
    } else if (!String(erreur.message).includes(cas.motif)) {
      echecs += 1;
      console.error(`ÉCHEC  ${cas.nom} : refusé pour un autre motif (SQLSTATE ${erreur.code ?? '?'}).`);
    } else {
      console.log(`ok     ${cas.nom} (refusé pour le bon motif)`);
    }
  }

  // ── Concurrence et isolation, à deux sessions ─────────────────────────────
  // Le contrat négatif joue une seule session : il prouve que le trigger
  // refuse, pas que le verrou SÉRIALISE, ni que l'isolation est gardée (passe
  // Codex de #1687). Ici, le trigger est celui que `migrate deploy` a posé sur
  // la base, recopié dans le clone. Ces cas COMMETTENT des lignes de test (un
  // analyte et ses liens, préfixe `__f79c_`), dans le clone seulement.
  const ANALYTE_CONC = 'BIO_TEST_F79_CONC';
  const nouveau = async () => {
    const c = new pg.Client(configVers(CLONE));
    await c.connect();
    return c;
  };
  const lien = (id, cible, code, actif = true) => ({
    text: `INSERT INTO biology_analyte_links (id, analyte_code, cible_type, cible_code, direction, claim_id, version_claim, actif)
           VALUES ($1, $2, $3, $4, 'haut_evocateur', 'WN-CL-0000-000', 'v1.0', $5)`,
    values: [id, ANALYTE_CONC, cible, code, actif],
  });
  async function refusAttendu(nom, promesse, motif) {
    try {
      await promesse;
      echecs += 1;
      console.error(`ÉCHEC  ${nom} : ACCEPTÉ alors qu'il doit être refusé.`);
    } catch (e) {
      if (String(e.message).includes(motif)) {
        console.log(`ok     ${nom} (refusé pour le bon motif)`);
      } else {
        echecs += 1;
        console.error(`ÉCHEC  ${nom} : refusé pour un autre motif (SQLSTATE ${e.code ?? '?'}).`);
      }
    }
  }

  const admin = await nouveau();
  const sessions = [];
  try {
    await admin.query(
      `INSERT INTO biology_analytes (id, code, libelle, type_prelevement, source_provenance, niveau_completude, updated_at)
       VALUES ('__f79c_analyte', $1, 'x', 'sang', 'saisie_praticien', 'partielle', now())`,
      [ANALYTE_CONC],
    );

    // C1 — READ COMMITTED : la seconde écriture ATTEND le verrou, puis voit le
    // lien validé et se fait refuser. Sans le verrou, elle passerait.
    {
      const a = await nouveau();
      const b = await nouveau();
      sessions.push(a, b);
      await a.query('BEGIN');
      await a.query(lien('__f79c_axe', 'axe', 'methylation'));
      await b.query('BEGIN');
      const pidB = (await b.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
      const ecritureB = b.query(lien('__f79c_nut', 'nutriment', 'zinc'));
      ecritureB.catch(() => {});
      let bloquee = false;
      for (let i = 0; i < 50 && !bloquee; i += 1) {
        const { rows } = await admin.query(
          `SELECT 1 FROM pg_stat_activity WHERE pid = $1 AND wait_event_type = 'Lock' AND wait_event = 'advisory'`,
          [pidB],
        );
        bloquee = rows.length > 0;
        if (!bloquee) await new Promise((r) => setTimeout(r, 100));
      }
      if (bloquee) {
        console.log('ok     C1 : la seconde écriture attend le verrou de la première');
      } else {
        echecs += 1;
        console.error('ÉCHEC  C1 : la seconde écriture n\'a pas attendu le verrou consultatif.');
      }
      await a.query('COMMIT');
      await refusAttendu('C1 : nutriment après un axe validé, en READ COMMITTED', ecritureB, 'porte déjà un lien actif');
      await b.query('ROLLBACK').catch(() => {});
    }

    // C2, C3 — une écriture active nutriment ou axe est refusée d'emblée sous
    // REPEATABLE READ et SERIALIZABLE, où l'instantané précède le verrou.
    for (const [nom, iso] of [['C2', 'REPEATABLE READ'], ['C3', 'SERIALIZABLE']]) {
      const b = await nouveau();
      sessions.push(b);
      await b.query(`BEGIN ISOLATION LEVEL ${iso}`);
      await refusAttendu(
        `${nom} : écriture d'un axe sous ${iso}`,
        b.query(lien(`__f79c_${nom}`, 'axe', 'inflammation')),
        'refusé sous l\'isolation',
      );
      await b.query('ROLLBACK').catch(() => {});
    }

    // C4 — la réactivation d'un nutriment dormant, sous REPEATABLE READ.
    await admin.query(lien('__f79c_dormant', 'nutriment', 'zinc', false));
    {
      const b = await nouveau();
      sessions.push(b);
      await b.query('BEGIN ISOLATION LEVEL REPEATABLE READ');
      await refusAttendu(
        'C4 : réactivation d\'un nutriment sous REPEATABLE READ',
        b.query(`UPDATE biology_analyte_links SET actif = true WHERE id = '__f79c_dormant'`),
        'refusé sous l\'isolation',
      );
      await b.query('ROLLBACK').catch(() => {});
    }

    // C5 — témoin : le refus est borné aux liens actifs nutriment/axe. Un
    // besoin s'écrit sous REPEATABLE READ.
    {
      const b = await nouveau();
      sessions.push(b);
      await b.query('BEGIN ISOLATION LEVEL REPEATABLE READ');
      try {
        await b.query(lien('__f79c_besoin', 'besoin', '3'));
        console.log('ok     C5 : un lien de besoin s\'écrit sous REPEATABLE READ');
      } catch (e) {
        echecs += 1;
        console.error(`ÉCHEC  C5 : lien de besoin refusé sous REPEATABLE READ (SQLSTATE ${e.code ?? '?'}).`);
      }
      await b.query('ROLLBACK').catch(() => {});
    }
  } finally {
    for (const c of sessions) await c.end().catch(() => {});
    await admin.end();
  }
} catch (e) {
  echecs += 1;
  console.error(`ÉCHEC  le banc s'est interrompu (${e.name ?? 'erreur'}, SQLSTATE ${e.code ?? '?'}).`);
} finally {
  // La suppression du clone est EXIGÉE : un clone resté porterait les
  // fixtures, et son échec ne doit jamais laisser le banc vert.
  try {
    await maintenance.query(`DROP DATABASE "${CLONE}" WITH (FORCE)`);
    console.log('ok     clone jetable supprimé');
  } catch (e) {
    echecs += 1;
    console.error(`ÉCHEC  suppression du clone « ${CLONE} » (SQLSTATE ${e.code ?? '?'}).`);
  }
  await maintenance.end().catch(() => {});
}

// ── La base nommée n'a rien reçu ──────────────────────────────────────────
// Constaté par une session neuve, APRÈS la suppression du clone, contre le
// relevé d'avant le banc : analytes, rapports, liens et claims, table par
// table. Toute ligne en plus ou en moins, quel que soit son code, fait
// rougir — le constat ne cherche plus seulement les fixtures connues
// (troisième passe Codex de #1687). Une erreur de ce constat fait aussi
// rougir le banc.
try {
  const APRES = await releverBase();
  const ecarts = Object.keys(AVANT).filter((cle) => AVANT[cle] !== APRES[cle]);
  if (ecarts.length > 0) {
    echecs += 1;
    console.error(`ÉCHEC  la base nommée a changé pendant le banc : ${ecarts
      .map((cle) => `${cle} ${AVANT[cle]} → ${APRES[cle]}`)
      .join(', ')}.`);
  } else {
    console.log('ok     la base nommée est identique à son relevé d\'avant le banc');
  }
} catch (e) {
  echecs += 1;
  console.error(`ÉCHEC  constat sur la base nommée impossible (SQLSTATE ${e.code ?? '?'}).`);
}

if (echecs > 0) {
  console.error(`banc F79 : ${echecs} échec(s).`);
  process.exit(1);
}
console.log(`banc F79 : ${CAS.length} rejeux, garde de transaction éprouvée, cinq cas à deux sessions conformes.`);
