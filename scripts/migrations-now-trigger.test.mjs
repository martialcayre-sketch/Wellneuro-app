// Piège converti en contrôle (lot `autonomie-pieges-restes`, partie 2) :
// `now()` nu dans le corps d'une fonction trigger.
//
// Constaté le 2026-10-02 (BIO-INGEST LOT-02, #1280) : Prisma 7 pose lui-même
// `@default(now())`, en UTC côté client. Un trigger qui pose un instant par
// `now()` et le compare à une écriture Prisma a deux défauts :
// - `now()` suit le fuseau de la session : UTC en production, Europe/Paris sur
//   la base brew du Mac. D'où un décalage d'une à deux heures, en local
//   seulement ;
// - `now()` est figé au début de la transaction : une transition peut être
//   datée avant un résultat créé dans la même transaction.
// Les deux sont passés T3 et le CI, joués en UTC. La forme retenue :
// `clock_timestamp() AT TIME ZONE 'UTC'`.
//
// Ce banc refuse, dans le corps d'une fonction `RETURNS trigger` d'une
// migration NEUVE : `now()`, `CURRENT_TIMESTAMP`, `transaction_timestamp()`,
// `statement_timestamp()`, `LOCALTIMESTAMP`, `CURRENT_TIME`, `LOCALTIME` et
// `CURRENT_DATE` (date calendaire au fuseau de la session).
// Les migrations appliquées sont gelées à leur compte : Prisma les verrouille
// par somme de contrôle, et leur resserrage serait une migration à part. Le
// gel est strict : une hausse rougit, et une baisse aussi, puisqu'une
// migration appliquée ne change plus — une baisse dirait que le parseur lit mal.
//
// HORS CHAMP, à dessein : les `DEFAULT CURRENT_TIMESTAMP` que Prisma écrit, et
// les `INSERT … CURRENT_TIMESTAMP` des catalogues, qui ne comparent rien. Les
// fonctions qui ne sont pas des triggers non plus. Un corps de trigger écrit
// entre apostrophes (`AS '…'`) est lu comme un corps dollar.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { masquerSql } from "./lib/sql-masque.mjs";

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIGRATIONS = path.join(RACINE, "web/prisma/migrations");

// Comptes gelés le 2026-11-16, sur origin/main ca9d3499. Ne s'allonge jamais.
const GEL = {
  "20260723100000_rag_claim_decisions_journal_v1": 1,
  "20260723120000_rag_claim_decisions_issue_unique_v1": 1,
  "20260727140000_rag_claim_garde_seuils_v1": 1,
  "20260926150000_fiches_assiette_catalogue_v1": 2,
  "20260927190000_fiches_assiette_remises_v1": 1,
};

const INSTANT_DE_SESSION =
  /\b(?:now\s*\(\s*\)|current_timestamp\b|current_date\b|transaction_timestamp\s*\(\s*\)|statement_timestamp\s*\(\s*\)|localtimestamp\b|current_time\b|localtime\b)/gi;

/**
 * Les corps des fonctions `RETURNS trigger` d'un fichier SQL, commentaires et
 * chaînes masqués (`masquerSql`, lecture « contexte », qui garde le corps
 * comme du SQL et préserve les positions).
 */
export function corpsDeTriggers(sql) {
  const masque = masquerSql(sql, "contexte");
  const corps = [];
  const creation = /\bCREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\b/gi;
  let h;
  while ((h = creation.exec(masque))) {
    const as = /\bAS\b/gi;
    as.lastIndex = h.index;
    const a = as.exec(masque);
    if (!a) continue;
    if (!/\bRETURNS\s+(?:pg_catalog\s*\.\s*)?"?trigger\b/i.test(masque.slice(h.index, a.index))) continue;
    // La balise est masquée en blancs : on la relit dans le texte d'origine,
    // après les blancs et les commentaires glissés entre `AS` et elle, sautés
    // explicitement — un `$$` cité dans ce commentaire n'ouvre rien (P3 de
    // wn-reviewer, P2 de Codex).
    let ouverture = a.index + a[0].length;
    for (;;) {
      while (/\s/.test(sql[ouverture] ?? "")) ouverture += 1;
      if (sql.startsWith("--", ouverture)) {
        const fin = sql.indexOf("\n", ouverture);
        ouverture = fin === -1 ? sql.length : fin;
      } else if (sql.startsWith("/*", ouverture)) {
        const fin = sql.indexOf("*/", ouverture + 2);
        ouverture = fin === -1 ? sql.length : fin + 2;
      } else break;
    }
    // Corps entre apostrophes (`AS '…'`, apostrophe doublée) : lu aussi (Codex).
    if (sql[ouverture] === "'") {
      let j = ouverture + 1;
      while (j < sql.length && !(sql[j] === "'" && sql[j + 1] !== "'")) j += sql[j] === "'" ? 2 : 1;
      corps.push(masquerSql(sql.slice(ouverture + 1, j).replace(/''/g, "'"), "contexte"));
      continue;
    }
    const balise = /^\$([A-Za-z_][A-Za-z0-9_]*)?\$/.exec(sql.slice(ouverture));
    if (!balise) continue;
    const debut = ouverture + balise[0].length;
    const fin = sql.indexOf(balise[0], debut);
    corps.push(masque.slice(debut, fin === -1 ? masque.length : fin));
  }
  return corps;
}

export function compterInstantsDeSession(sql) {
  return corpsDeTriggers(sql).reduce((total, c) => total + (c.match(INSTANT_DE_SESSION) ?? []).length, 0);
}

function lireMigrations() {
  return fs
    .readdirSync(MIGRATIONS, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .filter((nom) => fs.existsSync(path.join(MIGRATIONS, nom, "migration.sql")))
    .sort();
}

const trigger = (corps, balise = "$$") =>
  `CREATE OR REPLACE FUNCTION public.f()\nRETURNS trigger\nLANGUAGE plpgsql\nAS ${balise}\nBEGIN\n${corps}\n  RETURN NEW;\nEND;\n${balise};\n`;

test("parseur : now() et ses équivalents comptent dans un corps de trigger", () => {
  assert.equal(compterInstantsDeSession(trigger("  NEW.cree_le := now();")), 1);
  assert.equal(compterInstantsDeSession(trigger("  NEW.cree_le := NOW( );")), 1);
  assert.equal(compterInstantsDeSession(trigger("  NEW.a := CURRENT_TIMESTAMP; NEW.b := localtimestamp;")), 2);
  assert.equal(compterInstantsDeSession(trigger("  NEW.a := transaction_timestamp();", "$corps$")), 1);
});

test("parseur : commentaire avant la balise, RETURNS pg_catalog.trigger, CURRENT_DATE", () => {
  const sql = "CREATE FUNCTION public.f() RETURNS pg_catalog.trigger LANGUAGE plpgsql\nAS -- corps\n$$ BEGIN NEW.a := now(); NEW.d := CURRENT_DATE; RETURN NEW; END; $$;";
  assert.equal(compterInstantsDeSession(sql), 2);
});

test("parseur : corps entre apostrophes, et `$$` cité dans un commentaire avant la balise (Codex)", () => {
  const apostrophes =
    "CREATE FUNCTION f() RETURNS trigger LANGUAGE plpgsql AS 'BEGIN NEW.a := now(); NEW.b := ''x''; RETURN NEW; END;';";
  assert.equal(compterInstantsDeSession(apostrophes), 1);
  const dollarCite = "CREATE FUNCTION f() RETURNS trigger LANGUAGE plpgsql\nAS -- corps $$\n$$ BEGIN NEW.a := now(); RETURN NEW; END; $$;";
  assert.equal(compterInstantsDeSession(dollarCite), 1);
});

test("parseur : la forme retenue, les commentaires et les chaînes ne comptent pas", () => {
  assert.equal(compterInstantsDeSession(trigger("  NEW.cree_le := clock_timestamp() AT TIME ZONE 'UTC';")), 0);
  assert.equal(compterInstantsDeSession(trigger("  -- jamais now() ici\n  RAISE EXCEPTION 'now() refusé';")), 0);
});

test("parseur : hors d'un trigger, rien ne compte", () => {
  const sql = [
    'CREATE TABLE t ("cree_le" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);',
    "INSERT INTO t (cree_le) VALUES (CURRENT_TIMESTAMP);",
    "UPDATE t SET cree_le = now() WHERE cree_le IS NULL;",
    "CREATE FUNCTION public.g() RETURNS timestamp LANGUAGE sql AS $$ SELECT now() $$;",
  ].join("\n");
  assert.equal(compterInstantsDeSession(sql), 0);
  assert.equal(compterInstantsDeSession(sql + "\n" + trigger("  NEW.a := now();")), 1);
});

test("migrations : les corps de trigger sont bien lus — anti-vacuité", () => {
  const fonctions = lireMigrations().reduce(
    (n, nom) => n + corpsDeTriggers(fs.readFileSync(path.join(MIGRATIONS, nom, "migration.sql"), "utf8")).length,
    0,
  );
  // 110 le 2026-11-16 ; le compte ne peut que croître.
  assert.ok(fonctions >= 110, `seulement ${fonctions} fonctions trigger lues`);
});

test("migrations : aucun now() nu dans un trigger hors du gel, aucun compte gelé en hausse", () => {
  // Chaque migration gelée existe encore : sinon son compte ne serait jamais
  // comparé (Codex).
  const presentes = new Set(lireMigrations());
  assert.deepEqual(Object.keys(GEL).filter((nom) => !presentes.has(nom)), [], "migration gelée introuvable");
  const fautes = [];
  for (const nom of lireMigrations()) {
    const n = compterInstantsDeSession(fs.readFileSync(path.join(MIGRATIONS, nom, "migration.sql"), "utf8"));
    const permis = GEL[nom] ?? 0;
    if (n > permis || (nom in GEL && n !== permis)) fautes.push(`${nom} : ${n} (gel : ${permis})`);
  }
  assert.deepEqual(
    fautes,
    [],
    "instant de session dans un corps de trigger (ou gel qui baisse : le parseur lit mal) : écrire `clock_timestamp() AT TIME ZONE 'UTC'` (fuseau de session et instant figé par la transaction)",
  );
});
