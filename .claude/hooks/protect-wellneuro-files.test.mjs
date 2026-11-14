// Banc de test du garde-fou d'écriture de fichiers.
//
//   node --test .claude/hooks/
//
// Créé au Socle LOT-02, en même temps que le niveau « demande » clinique :
// jusque-là ce hook n'avait AUCUN banc — le mur d'écriture n'était éprouvé
// que pour les commandes (`block-risky-commands.test.mjs`). Le glob de
// `ci.yml` (« Hooks de garde-fous ») ramasse ce fichier sans qu'on le câble.
//
// Trois familles, dans l'ordre du hook : ce qui doit rester REFUSÉ, ce qui
// doit DEMANDER (Prisma d'un côté, clinique de l'autre — leurs motifs
// d'autorisation ne se confondent pas), ce qui doit passer en SILENCE. Les
// cas « silence » sont aussi importants que les autres : un motif trop court
// qui matcherait un voisin ferait demander une confirmation sans objet, et
// une garde qui crie tout le temps ne se lit plus.
//
// Convention `node:test`, comme `block-risky-commands.test.mjs`.
import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const hook = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "protect-wellneuro-files.mjs"
);

/**
 * Verdict du hook pour un chemin : { verdict: 'passe'|'demande'|'refus', sortie }.
 * `entree` complète `tool_input` (contenu d'un Write, fragments d'un Edit).
 */
function jugement(filePath, entree = {}) {
  const res = spawnSync("node", [hook], {
    input: JSON.stringify({ tool_input: { file_path: filePath, ...entree } }),
    encoding: "utf8",
  });
  if (res.status === 2) return { verdict: "refus", sortie: res.stderr || "" };
  const sortie = res.stdout || "";
  return { verdict: sortie.includes('"ask"') ? "demande" : "passe", sortie };
}

// ── Ce qui doit rester refusé — UN CAS PAR MOTIF de la liste `refus` ─────────
// La relecture adversariale du LOT-02 l'a mesuré : trois cas sur neuf motifs
// laissaient l'abaissement silencieux de six protections invisibles au banc.

for (const chemin of [
  "web/.env.local",
  "web/.env.production",
  "web/.env.development",
  "web/.env",
  "/Users/x/depot/.git/config",
  "web/node_modules/paquet/index.js",
  "web/.next/cache/x.js",
  "web/dist/bundle.js",
  "web/coverage/lcov.info",
]) {
  test(`refus dur : ${chemin}`, () => {
    assert.equal(jugement(chemin).verdict, "refus");
  });
}

// ── Schéma et migrations — autorisation permanente bornée (D-523) ──────────
// Le schéma et les migrations non destructives s'écrivent sans confirmation ;
// une migration destructive demande, avec le motif Prisma (release-db, D-520),
// jamais le motif clinique. Un cas par motif destructif.

const MIGRATION = "web/prisma/migrations/20261114000000_x/migration.sql";

for (const chemin of [
  "web/prisma/schema.prisma",
  MIGRATION,
  "supabase/migrations/20260822000000_x.sql",
  "web/prisma/migrations/migration_lock.toml",
]) {
  test(`silence D-523 (sans contenu destructif) : ${chemin}`, () => {
    assert.equal(jugement(chemin).verdict, "passe");
  });
}

test("silence D-523 : schema.prisma, même un modèle retiré (la migration le portera)", () => {
  const j = jugement("web/prisma/schema.prisma", { old_string: "model A {\n}", new_string: "" });
  assert.equal(j.verdict, "passe");
});

for (const sql of [
  'CREATE TABLE "x" ("id" TEXT NOT NULL, CONSTRAINT "x_pkey" PRIMARY KEY ("id"));',
  'ALTER TABLE "patients" ADD COLUMN "y" TEXT;',
  'CREATE INDEX "x_y_idx" ON "x"("y");',
  'UPDATE "x" SET "y" = \'a\' WHERE "y" IS NULL;',
  'DELETE FROM "x" WHERE "id" = \'a\';',
  'DELETE FROM "x" WHERE "id" IN (SELECT "id" FROM "y");',
  'ALTER TABLE "x" ADD CONSTRAINT "x_y_fkey" FOREIGN KEY ("y") REFERENCES "y"("id") ON DELETE SET NULL ON UPDATE CASCADE;',
  'CREATE TRIGGER "t" BEFORE UPDATE ON "x" FOR EACH ROW EXECUTE FUNCTION f();',
  'CREATE TRIGGER "t" BEFORE INSERT ON "x" FOR EACH ROW EXECUTE PROCEDURE f();',
  'UPDATE "x" SET "y" = \'a; b\' WHERE "id" = 1;',
  'UPDATE "x" AS p SET "y" = 1 WHERE p."id" = 2;',
  'DELETE FROM "x" WHERE true AND "id" = 1;',
  'CREATE TRIGGER "t" BEFORE UPDATE OF "y" ON "x" FOR EACH ROW EXECUTE FUNCTION f();',
  'ALTER TABLE "x" ENABLE ROW LEVEL SECURITY;',
  // Seconde passe (2026-11-14) : un mot cité en commentaire ou en chaîne ne
  // demande plus — l'en-tête « aucun DROP » des migrations du dépôt reste muet.
  '-- Migration additive : aucun DROP, aucun TRUNCATE.\nALTER TABLE "x" ADD COLUMN "z" TEXT;',
  '/* TRUNCATE "x" */ ALTER TABLE "x" ADD COLUMN "z" TEXT;',
  'COMMENT ON TABLE "x" IS \'jamais de DROP ici\';',
  'GRANT EXECUTE ON FUNCTION f() TO app;',
  'REVOKE EXECUTE ON FUNCTION f() FROM PUBLIC;',
  'UPDATE "public"."x" SET "y" = 1 WHERE "id" = 2;',
  'CREATE FUNCTION f() RETURNS trigger AS $$ BEGIN NEW."y" := now(); RETURN NEW; END $$ LANGUAGE plpgsql;',
  'COMMENT ON TABLE "x" IS $$Table de l\'auteur$$;\nDELETE FROM "x" WHERE "id" = 1;',
  'INSERT INTO "x" ("id") VALUES (1) ON CONFLICT DO NOTHING;',
  'ALTER TABLE "x" ALTER COLUMN "y" DROP NOT NULL;',
  'ALTER TABLE "x" ALTER COLUMN "y" DROP DEFAULT;',
  'CREATE TEMP TABLE r (id int) ON COMMIT DROP;',
  'CREATE TRIGGER "t" BEFORE UPDATE OR DELETE OR TRUNCATE ON "x" FOR EACH STATEMENT EXECUTE FUNCTION f();',
  'CREATE TRIGGER "t" BEFORE TRUNCATE ON "x" FOR EACH STATEMENT EXECUTE FUNCTION f();',
  'REVOKE UPDATE, DELETE, TRUNCATE ON "x" FROM app;',
  'DO $$ BEGIN REVOKE EXECUTE ON FUNCTION f() FROM anon; END $$;',
]) {
  test(`silence D-523, migration non destructive : ${sql.slice(0, 50)}`, () => {
    assert.equal(jugement(MIGRATION, { content: sql }).verdict, "passe");
  });
}

for (const [motif, sql] of [
  ["DROP", 'ALTER TABLE "x" DROP COLUMN "y";'],
  ["DROP", 'DROP TABLE "x";'],
  ["DROP", 'drop index "x_y_idx";'],
  ["TRUNCATE", 'TRUNCATE "x";'],
  ["RENAME", 'ALTER TABLE "x" RENAME COLUMN "y" TO "z";'],
  ["ALTER … TYPE", 'ALTER TABLE "x" ALTER COLUMN "y" TYPE VARCHAR(10);'],
  ["ALTER … TYPE", 'ALTER TABLE "x" ALTER COLUMN "y" SET DATA TYPE INTEGER;'],
  ["DELETE sans WHERE", 'DELETE FROM "x";'],
  ["UPDATE sans WHERE", 'UPDATE "x" SET "y" = NULL;'],
  ["UPDATE sans WHERE", 'UPDATE "x" SET "y" = 1 WHERE "id" = 2;\nUPDATE "x" SET "z" = 3;'],
  // Sondes de la contre-revue Codex du 2026-11-14 (cinq P1).
  ["DROP", "SELECT '--'; DROP SCHEMA IF EXISTS public CASCADE;"],
  ["DELETE sans WHERE", "DELETE FROM t RETURNING 'where';"],
  ["UPDATE sans WHERE", "UPDATE t AS p SET v = 'efface';"],
  ["ALTER … TYPE", "ALTER TABLE t ALTER v TYPE varchar(1) USING v::varchar(1);"],
  ["EXECUTE dynamique", "DO $$ BEGIN EXECUTE 'DR' || 'OP SCHEMA IF EXISTS public CASCADE'; END $$;"],
  // WHERE seulement dans une sous-requête ou un commentaire : toutes les lignes.
  ["UPDATE sans WHERE", 'UPDATE "x" SET "y" = (SELECT "z" FROM "w" WHERE "w"."id" = 1);'],
  ["DELETE sans WHERE", 'DELETE FROM "x" -- where "id" = 1\n;'],
  ["DELETE sans WHERE", 'DELETE FROM "x" USING "y";'],
  // Sondes de wn-reviewer du 2026-11-14 (NO-GO, trois P1 et le P2 n° 5).
  ["UPDATE sans WHERE", 'UPDATE u SET e = NULL RETURNING 1 AS "where";'],
  ["UPDATE sans WHERE", "UPDATE u SET e = $q$where$q$;"],
  ["DELETE sans WHERE", `CREATE TABLE "a'b"(id int);\nDELETE FROM u;\nCREATE TABLE "c'd"(id int);`],
  ["DELETE sans WHERE", 'CREATE TABLE "a--b"(id int); DELETE FROM u;'],
  ["DELETE sans WHERE", "SELECT E'\\''; DELETE FROM u; SELECT 1;"],
  ["MERGE", "MERGE INTO u USING (SELECT 1) s ON true WHEN MATCHED THEN DELETE;"],
  ["ALTER … TYPE", "ALTER TABLE u ALTER COLUMN age /* */ TYPE smallint;"],
  ["ALTER … TYPE", 'ALTER TABLE u ALTER COLUMN "age" SET /*x*/ DATA TYPE smallint;'],
  ["DELETE sans WHERE", "DELETE FROM u WHERE true;"],
  ["UPDATE sans WHERE", "UPDATE u SET e = 1 WHERE 1 = 1;"],
  ["DISABLE TRIGGER", "ALTER TABLE j DISABLE TRIGGER ALL;"],
  ["DISABLE ROW LEVEL SECURITY", 'ALTER TABLE "j" DISABLE ROW LEVEL SECURITY;'],
  ["CREATE RULE", "CREATE OR REPLACE RULE r AS ON DELETE TO j DO INSTEAD NOTHING;"],
  ["session_replication_role", "SET session_replication_role = replica;"],
  // Seconde passe du 2026-11-14 : wn-reviewer (cinq P1, deux P2) et Codex
  // (onze P1). Ce que le lexeur ne lit pas avec certitude demande.
  ["UPDATE sans WHERE", 'UPDATE "public"."Patient" SET note = NULL;'],
  ["UPDATE sans WHERE", 'UPDATE ONLY "public"."Patient" AS p SET note = NULL;'],
  ["UPDATE sans WHERE", "UPDATE t SET a = $é$ where $é$;"],
  ["DELETE sans WHERE", "DELETE FROM accounts RETURNING $é$WHERE id = 1$é$;"],
  ["DELETE sans WHERE", 'COMMENT ON TABLE "t" IS $$Table de l\'auteur$$;\nDELETE FROM "t";\nCOMMENT ON COLUMN "t"."a" IS \'x\';'],
  ["DELETE sans WHERE", 'SELECT $$--$$; DELETE FROM "Patient";'],
  ["DELETE sans WHERE", "DELETE FROM t /* /* */ WHERE id = 1 */;"],
  ["DISABLE TRIGGER", "ALTER TABLE accounts DISABLE /* a /* b */ c */ TRIGGER USER;"],
  ["DELETE dans une sous-instruction", 'WITH d AS (DELETE FROM "Patient" RETURNING id) SELECT id FROM d WHERE id > 0;'],
  ["DELETE dans une sous-instruction", "WITH efface AS (DELETE FROM accounts RETURNING *) SELECT * FROM efface WHERE FALSE;"],
  ["DELETE sans WHERE", "DELETE FROM accounts WHERE (TRUE);"],
  ["UPDATE sans WHERE", "UPDATE t SET v = 1 WHERE 1 = 1 AND true;"],
  ["DELETE sans WHERE", "DELETE FROM t WHERE id = 1 OR true;"],
  ["UPDATE sans WHERE", "INSERT INTO t (id, v) VALUES (1, 2) ON CONFLICT (id) DO UPDATE SET v = excluded.v;"],
  ["DELETE sans WHERE", "-- migration\rDELETE FROM accounts;"],
  ["dans un corps", "DO $$DECLARE function text := 'DEL' || 'ETE FROM accounts'; BEGIN EXECUTE function; END;$$;"],
  ["dans un corps", "CREATE FUNCTION purge() RETURNS void AS $f$ DELETE FROM t WHERE id = 1 $f$ LANGUAGE sql;"],
  ["non lu avec certitude", 'ALTER TABLE accounts ALTER COLUMN U&"name" UESCAPE \'!\' TYPE varchar(1) USING name::varchar(1);'],
  ["non lu avec certitude", 'SET U&"session\\005freplication_role" = replica;'],
  ["non lu avec certitude", 'CREATE TABLE "x" (id int); /* commentaire non fermé DROP TABLE "y";'],
  ["session_replication_role", 'SET "session_replication_role" = replica;'],
  ["DROP", 'DROP TRIGGER IF EXISTS "t_append_only" ON "x";'],
  ["DROP", 'ALTER TABLE "x" DROP CONSTRAINT "x_y_check";'],
  ["TRUNCATE", 'TRUNCATE TABLE "x", "y";'],
  // Troisième passe de wn-reviewer.
  ["TRUNCATE dans un corps", `DO 'BEGIN TRUNCATE "Patient"; END';`],
  ["corps non lexable", "DO $$ BEGIN RAISE NOTICE 'l''auteur; END $$; -- apostrophe orpheline\nSELECT $q$ l'auteur DELETE FROM t $q$;"],
  ["dans un corps", `DO LANGUAGE plpgsql E'BEGIN DELETE FROM "Patient"; END';`],
  ["dans un corps", `CREATE PROCEDURE p() LANGUAGE sql AS 'DELETE FROM "Patient"'; CALL p();`],
  ["session_replication_role", "SELECT set_config('session_replication_role','replica',false);"],
  ["TRUNCATE dans un corps", 'DO $$ BEGIN -- or\n TRUNCATE "Patient"; END $$;'],
  ["TRUNCATE dans un corps", 'DO $$ BEGIN -- ,\n TRUNCATE "Patient"; END $$;'],
  ["DROP dans un corps", 'DO $$ BEGIN -- on commit\n DROP TABLE "Patient"; END $$;'],
  ["dans un corps", 'DO $$ BEGIN DELETE/**/FROM "Patient"; END $$;'],
  ["dans un corps", 'DO $$ BEGIN UPDATE public . "Patient" SET nom = 1; END $$;'],
  ["UPDATE sans WHERE", 'UPDATE "Patient" * AS p SET "nom" = 1;'],
  ["UPDATE sans WHERE", 'UPDATE ONLY ("Patient") SET "nom" = 1;'],
  ["ENABLE REPLICA", 'ALTER TABLE "Journal" ENABLE REPLICA TRIGGER "append_only";'],
  ["ALTER … TYPE", "ALTER TYPE comp ALTER ATTRIBUTE a TYPE int;"],
  ["DELETE sans WHERE", "DELETE FROM t WHERE true::boolean;"],
  // PR-Agent, #2137.
  ["GRANT à un rôle ouvert", 'GRANT SELECT, UPDATE ON "patients" TO anon;'],
  ["GRANT à un rôle ouvert", 'GRANT ALL ON ALL TABLES IN SCHEMA public TO PUBLIC;'],
  ["ALTER POLICY", 'ALTER POLICY "p" ON "patients" USING (true);'],
  ["GRANT à un rôle ouvert", 'GRANT SELECT, UPDATE ON "Patient" TO "anon";'],
  ["GRANT à un rôle ouvert", 'GRANT SELECT ON "public"."Patient" TO "authenticated";'],
  // Quatrième passe de wn-reviewer.
  ["non lu avec certitude", `DO E'BEGIN \\x54RUNCATE "Patient"; END';`],
  ["non lu avec certitude", `DO E'BEGIN \\124RUNCATE "Patient"; END';`],
  ["non lu avec certitude", `DO E'BEGIN \\u0044ELETE FROM "Patient"; END';`],
  ["non lu avec certitude", `CREATE FUNCTION f() RETURNS void LANGUAGE sql AS E'\\x44ELETE FROM "Patient"'; SELECT f();`],
  ["dans un corps", 'DO $$ DECLARE c refcursor; r record; BEGIN OPEN c FOR UPDATE "Patient" SET nom = 1 RETURNING *; FETCH c INTO r; END $$;'],
  ["dans un corps", 'DO $$ DECLARE c CURSOR FOR UPDATE "Patient" SET nom = 1 RETURNING *; BEGIN OPEN c; END $$;'],
  // Quatrième passe Codex.
  ["dans un corps", "DO 'BEGIN RAISE NOTICE ''--''; DELETE FROM public.t; END;';"],
  ["dans un corps", "DO E'BEGIN RAISE NOTICE \\'--\\'; DELETE FROM public.t; END;';"],
  ["DELETE sans WHERE", "DELETE FROM public.t WHERE TRUE::pg_catalog.bool;"],
  ["DELETE sans WHERE", "DELETE FROM public.t WHERE CAST(true AS boolean);"],
  // Troisième passe Codex.
  ["dans un corps", "DO 'BEGIN DELETE FROM public.accounts; END;';"],
  ["dans un corps", "DO LANGUAGE plpgsql 'BEGIN UPDATE t SET a = 1; END';"],
  ["dans un corps", "CREATE FUNCTION f() RETURNS void AS 'DELETE FROM t' LANGUAGE sql;"],
  ["UPDATE sans WHERE", "UPDATE ONLY (public.accounts) SET active = false;"],
  ["UPDATE sans WHERE", "UPDATE accounts * SET active = false;"],
  ["dans un corps", `DO $${"a".repeat(150)}$\nDECLARE function text := 'DELETE FROM public.accounts';\nBEGIN EXECUTE function; END;\n$${"a".repeat(150)}$;`],
]) {
  test(`demande D-523, migration destructive (${motif}) : ${sql.slice(0, 50)}`, () => {
    const j = jugement(MIGRATION, { content: sql });
    assert.equal(j.verdict, "demande", j.sortie);
    assert.match(j.sortie, new RegExp(motif.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(j.sortie, /D-523/);
    // Le motif Prisma reste le motif Prisma : release-db, D-520 — jamais le
    // motif clinique (la disjonction se teste dans les deux sens).
    assert.match(j.sortie, /release-db/);
    assert.match(j.sortie, /D-520/);
    assert.doesNotMatch(j.sortie, /D-xxx/);
    assert.doesNotMatch(j.sortie, /approuv|à la main/);
  });
}

test("demande D-523 : un Edit qui pose un DROP, même sur un fichier absent du disque", () => {
  const j = jugement(MIGRATION, { old_string: "absent", new_string: 'DROP TABLE "x";' });
  assert.equal(j.verdict, "demande", j.sortie);
});

test("demande D-523 : supabase/migrations destructive", () => {
  assert.equal(jugement("supabase/migrations/20260822000000_x.sql", { content: "TRUNCATE x;" }).verdict, "demande");
});

// ── Ce qui doit demander — fichiers cliniques (Socle LOT-02) ─────────────────
// Un cas par motif, avec la casse RÉELLE des fichiers du dépôt : c'est la
// normalisation en minuscules du hook qui est éprouvée, pas une casse choisie
// pour matcher.

for (const chemin of [
  "web/src/lib/clinical/orientationRulesV1.ts",
  "web/src/lib/clinical/stopRulesV1.ts",
  "web/src/lib/clinical/priorityRulesV1.ts",
  "web/src/lib/clinical/contradictionsV1.ts",
  "web/src/lib/clinical/corpusSyntheseV1.ts",
  "web/src/lib/biology-library/indicationsBiologieV1.ts",
  "web/src/lib/equilibre/constants.ts",
  "web/src/lib/questions.ts",
  // Candidats du LOT-02, tranchés le 2026-10-21 (plan D/41).
  "web/src/lib/clinical/stopRulesLibelles.ts",
  "web/src/lib/questionnaires/alimentaire.ts",
]) {
  test(`demande clinique : ${chemin}`, () => {
    const j = jugement(chemin);
    assert.equal(j.verdict, "demande");
    // Le motif clinique cite la constitution, jamais release-db : les deux
    // demandes ne se confondent pas.
    assert.match(j.sortie, /D-xxx/);
    assert.match(j.sortie, /DC-17/);
    assert.doesNotMatch(j.sortie, /release-db/);
  });
}

// ── Ce qui doit passer en silence ────────────────────────────────────────────

for (const chemin of [
  // Les compagnons de test : le sha épinglé s'y ré-épingle librement.
  "web/src/lib/clinical/orientationRulesV1.test.ts",
  "web/src/lib/questions.test.ts",
  // La fixture du LOT-02 reste libre (tranché le 2026-10-21, plan D/41), et
  // le compagnon de test du questionnaire alimentaire ne matche pas.
  "web/src/lib/clinical-engine/chaineC1Fixture.ts",
  "web/src/lib/questionnaires/alimentaire.test.ts",
  // Un voisin ordinaire, et le module de garde lui-même.
  "web/src/lib/documents/vocabulaire.ts",
  "web/src/lib/consultation/email.ts",
  "docs/claude/SESSION_LOG.md",
]) {
  test(`silence : ${chemin}`, () => {
    assert.equal(jugement(chemin).verdict, "passe");
  });
}

// ── Robustesse d'entrée ──────────────────────────────────────────────────────

test("entrée illisible : silence, jamais un crash", () => {
  const res = spawnSync("node", [hook], { input: "{pas du json", encoding: "utf8" });
  assert.equal(res.status, 0);
});

test("chemin absent : silence", () => {
  const res = spawnSync("node", [hook], {
    input: JSON.stringify({ tool_input: {} }),
    encoding: "utf8",
  });
  assert.equal(res.status, 0);
  assert.equal((res.stdout || "").includes('"ask"'), false);
});

test("antislashs Windows et casse mélangée : le motif clinique matche quand même", () => {
  const j = jugement("web\\src\\lib\\clinical\\OrientationRulesV1.TS");
  assert.equal(j.verdict, "demande");
});

// ── Évitement par segments — le trou mesuré par la relecture adversariale ────
// `includes()` sur un motif multi-segment cassait dès qu'un `/./`, un `//` ou
// un `..` s'intercalait ; `path.posix.normalize` les replie désormais AVANT la
// comparaison. Sondes sur un motif clinique ET sur Prisma (le défaut était
// hérité : `web/prisma/./schema.prisma` passait déjà en silence).

for (const chemin of [
  "web/src/lib/./clinical/orientationRulesV1.ts",
  "web/src/lib//clinical/orientationRulesV1.ts",
  "web/src/lib/clinical/../clinical/orientationRulesV1.ts",
  "web/src/./lib/questions.ts",
]) {
  test(`évitement par segments refermé (clinique) : ${chemin}`, () => {
    assert.equal(jugement(chemin).verdict, "demande");
  });
}

test("évitement par segments refermé (Prisma) : web/prisma/./migrations, contenu destructif", () => {
  const j = jugement("web/prisma/./migrations/20261114000000_x/migration.sql", { content: 'DROP TABLE "x";' });
  assert.equal(j.verdict, "demande");
  assert.match(j.sortie, /release-db/);
});

// ── Le verdict se lit en JSON, pas en sous-chaîne ────────────────────────────
// `sortie.includes('"ask"')` passerait sur du JSON malformé qui contient le
// mot : ce cas prouve que la sortie EST le protocole attendu.

test("la sortie « demande » est du JSON valide au protocole PreToolUse", () => {
  const j = jugement("web/src/lib/questions.ts");
  const parsed = JSON.parse(j.sortie);
  assert.equal(parsed.hookSpecificOutput.hookEventName, "PreToolUse");
  assert.equal(parsed.hookSpecificOutput.permissionDecision, "ask");
  assert.equal(typeof parsed.hookSpecificOutput.permissionDecisionReason, "string");
});

test("file_path hostile (objet, null) : silence, jamais un crash", () => {
  for (const hostile of [{ chemin: "x" }, null, 42]) {
    const res = spawnSync("node", [hook], {
      input: JSON.stringify({ tool_input: { file_path: hostile } }),
      encoding: "utf8",
    });
    assert.equal(res.status, 0);
    // Un verdict « demande » sort aussi en 0 : le silence se prouve sur la
    // sortie, pas sur le seul code (contre-vérification adversariale).
    assert.equal(res.stdout || "", "");
  }
});

// ── Tables signées détectées par leur marqueur (BP-01, D-266) ───────────────
// La liste littérale a laissé hors du hook neuf tables signées après le
// Socle. Le marqueur `validationExterne: true` (hors commentaire) fait
// désormais foi : sur disque, et dans le contenu entrant d'un Write ou d'un
// Edit — une table signée NEUVE demande dès sa création.

function jugementBrut(toolInput) {
  const res = spawnSync("node", [hook], {
    input: JSON.stringify({ tool_input: toolInput }),
    encoding: "utf8",
  });
  const sortie = res.stdout || "";
  return { verdict: sortie.includes('"ask"') ? "demande" : "passe", sortie, status: res.status };
}

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const sansCommentaires = (texte) =>
  texte.replace(/\/\*[\s\S]*?\*\//g, "").split("\n").filter((l) => !/^\s*\/\//.test(l)).join("\n");
const signesSuivis = spawnSync(
  "git", ["grep", "-l", "validationExterne:", "--", "web/src"], { cwd: racine, encoding: "utf8" },
).stdout.split("\n").filter(Boolean)
  .filter((f) => /\.tsx?$/.test(f) && !/\.(test|spec)\.tsx?$/.test(f))
  .filter((f) => /validationExterne:\s*true/.test(sansCommentaires(readFileSync(path.join(racine, f), "utf8"))));

test("le dépôt porte au moins les quatorze tables signées du jour de BP-01", () => {
  assert.ok(signesSuivis.length >= 14, `trouvées : ${signesSuivis.length}`);
});

for (const chemin of signesSuivis) {
  test(`demande table signée (marqueur) : ${chemin}`, () => {
    const j = jugementBrut({ file_path: path.join(racine, chemin) });
    assert.equal(j.verdict, "demande");
    assert.match(j.sortie, /DC-17/);
  });
}

test("Write d'une table signée NEUVE : demande dès la création", () => {
  const j = jugementBrut({
    file_path: path.join(racine, "web/src/lib/fiches-usage/ficheUsageBesoin2V1.ts"),
    content: "export const META = {\n  validationExterne: true,\n};\n",
  });
  assert.equal(j.verdict, "demande");
  assert.match(j.sortie, /validationExterne/);
});

// D-314 §2 : la structure des fiches d'usage est couverte verrou ÉTEINT aussi —
// ce qu'on y écrit avant la signature est le périmètre que le responsable
// signera. Le même marqueur éteint ailleurs reste en silence (cas plus bas).
test("structure des fiches d'usage au verrou ÉTEINT : demande", () => {
  const j = jugementBrut({
    file_path: path.join(racine, "web/src/lib/fiches-usage/ficheUsageBesoin2V1.ts"),
    content: "export const META = {\n  validationExterne: false,\n};\n",
  });
  assert.equal(j.verdict, "demande");
  assert.match(j.sortie, /DC-17/);
});

// D-480 §5.5 (BP-17 PR 4) : la structure de la bibliothèque des options, même
// patron — verrou éteint couvert ; le vocabulaire du dossier, sans marqueur, et
// un compagnon de test restent en silence.
test("structure de la bibliothèque des options au verrou ÉTEINT : demande", () => {
  const j = jugementBrut({
    file_path: path.join(racine, "web/src/lib/bibliotheque-options/bibliothequeBesoin2V1.ts"),
    content: "export const META = {\n  validationExterne: false,\n};\n",
  });
  assert.equal(j.verdict, "demande");
  assert.match(j.sortie, /DC-17/);
});

test("structure de la bibliothèque des options sur disque (verrou éteint) : demande", () => {
  const j = jugementBrut({ file_path: path.join(racine, "web/src/lib/bibliotheque-options/bibliothequeBesoin2V1.ts") });
  assert.equal(j.verdict, "demande");
  assert.match(j.sortie, /DC-17/);
});

test("bibliothèque des options : vocabulaire sans marqueur et compagnon de test, silence", () => {
  for (const fichier of ["web/src/lib/bibliotheque-options/vocabulaire.ts", "web/src/lib/bibliotheque-options/bibliothequeBesoin2V1.test.ts"]) {
    const j = jugementBrut({ file_path: path.join(racine, fichier) });
    assert.equal(j.verdict, "passe", fichier);
  }
});

test("même marqueur éteint hors des deux structures : silence", () => {
  const j = jugementBrut({
    file_path: path.join(racine, "web/src/lib/documents/vocabulaire.ts"),
    content: "export const META = {\n  validationExterne: false,\n};\n",
  });
  assert.equal(j.verdict, "passe");
});

test("structure des fiches d'usage : marqueur éteint en commentaire seulement, silence", () => {
  const j = jugementBrut({
    file_path: path.join(racine, "web/src/lib/fiches-usage/lecture.ts"),
    content: "// la structure porte `validationExterne: false` tant qu'elle n'est pas signée\nexport const x = 1;\n",
  });
  assert.equal(j.verdict, "passe");
});

test("Edit qui pose le marqueur sur un fichier ordinaire : demande", () => {
  const j = jugementBrut({
    file_path: path.join(racine, "web/src/lib/documents/vocabulaire.ts"),
    old_string: "x",
    new_string: "  validationExterne: true,",
  });
  assert.equal(j.verdict, "demande");
});

test("MultiEdit qui pose le marqueur : demande", () => {
  const j = jugementBrut({
    file_path: path.join(racine, "web/src/lib/documents/vocabulaire.ts"),
    edits: [{ old_string: "a", new_string: "b" }, { old_string: "c", new_string: "validationExterne: true" }],
  });
  assert.equal(j.verdict, "demande");
});

for (const [cas, entree] of [
  ["extension .mts", { file_path: path.join(racine, "web/src/lib/neuf/table.mts"), content: "export const M = { validationExterne: true };" }],
  ["extension .cts", { file_path: path.join(racine, "web/src/lib/neuf/table.cts"), content: "export const M = { validationExterne: true };" }],
  ["clé entre guillemets (JSON)", { file_path: path.join(racine, "web/src/lib/neuf/table.json"), content: '{ "validationExterne": true }' }],
]) {
  test(`demande table signée : ${cas}`, () => {
    assert.equal(jugementBrut(entree).verdict, "demande");
  });
}

test("Edit qui bascule le verrou false → true (source résultant jugé) : demande", () => {
  const j = jugementBrut({
    file_path: path.join(racine, "web/src/lib/clinical/replisAssietteV1.ts"),
    // Le fragment ne porte pas le marqueur complet : seul le source
    // RÉSULTANT le porte (contournement relevé par la revue Copilot).
    old_string: "Externe: false,",
    new_string: "Externe: true,",
  });
  assert.equal(j.verdict, "demande");
});

test("Edit qui ne touche qu'un mot du verrou (fragment sans le marqueur) : demande", () => {
  const j = jugementBrut({
    file_path: path.join(racine, "web/src/lib/neuf/fictif.ts"),
    content: undefined,
    old_string: "false",
    new_string: "true",
  });
  // Fichier absent du disque : rien à appliquer, silence attendu ; le cas
  // réel (fichier présent) est couvert ci-dessus.
  assert.equal(j.verdict, "passe");
});

test("le hook ne se demande pas confirmation pour sa propre édition", () => {
  assert.equal(jugementBrut({ file_path: path.join(racine, ".claude/hooks/protect-wellneuro-files.mjs") }).verdict, "passe");
});

for (const [cas, entree] of [
  ["marqueur en commentaire de fin de ligne", {
    file_path: path.join(racine, "web/src/lib/neuf/z.ts"),
    content: "const x = 'http://exemple'; // validationExterne: true\n",
  }],
  ["marqueur en commentaire seulement", {
    file_path: path.join(racine, "web/src/lib/neuf/x.ts"),
    content: "// une table signée porte `validationExterne: true`\n/* validationExterne: true */\n",
  }],
  ["table au verrou éteint (validationExterne: false)", {
    file_path: path.join(racine, "web/src/lib/clinical/replisAssietteV1.ts"),
  }],
  ["compagnon de test d'une table signée", {
    file_path: path.join(racine, "web/src/lib/clinical/safetySignalsV1.test.ts"),
    content: "const META = { validationExterne: true };",
  }],
  ["fichier neuf ordinaire", {
    file_path: path.join(racine, "web/src/lib/neuf/y.ts"),
    content: "export const x = 1;\n",
  }],
]) {
  test(`silence : ${cas}`, () => {
    const j = jugementBrut(entree);
    assert.equal(j.status, 0);
    assert.equal(j.verdict, "passe");
  });
}
