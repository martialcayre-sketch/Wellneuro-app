// Piège converti en contrôle (lot `autonomie-frictions`, partie c) :
// `btrim(texte)` à UN argument ne retire que l'espace ASCII (U+0020). Un CHECK
// « texte non vide » écrit ainsi laisse passer une tabulation ou un retour
// ligne — mesuré en base le 2026-08-25, pas déduit. La forme qui tient :
// `btrim(texte, E' \t\r\n')`.
//
// Le piège vivait dans la mémoire des sessions ; une session qui ne la lisait
// pas le reposait. Ce banc le refuse dans toute migration NEUVE. Les
// migrations déjà écrites sont gelées à leur compte d'aujourd'hui : elles sont
// appliquées en production, Prisma les verrouille par somme de contrôle, et
// leur resserrage est une migration à part (`D-111`), hors de ce banc. Le gel
// n'admet aucune hausse : un compte qui monte dans un dossier gelé rougit
// aussi.
//
// La lecture ignore les commentaires SQL et le contenu des chaînes : un
// commentaire qui cite `btrim(x)` pour expliquer le piège n'est pas un appel.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIGRATIONS = path.join(RACINE, "web/prisma/migrations");

// Comptes gelés le 2026-11-13 (parseur ci-dessous, sur origin/main 24d8641d).
// Ne s'allonge jamais : une migration neuve écrit `btrim` à deux arguments.
const GEL = {
  "20260725160000_cb_biologie_catalogue_v1": 3,
  "20260726094500_cb_nabm_snapshot_v1": 1,
  "20260805070000_booklet_note_transmise": 1,
  "20260815010000_arbitrage_biologique_sans_valeurs": 1,
  "20260817140000_panels_biologie_documentes": 1,
  "20260822153000_alliance_dossier_deux_voix_v1": 5,
  "20260823120000_alliance_objectif_trois_voix_v1": 4,
  "20260907140000_criteres_dossier_constates": 1,
};

/**
 * Remplace commentaires et littéraux de chaîne par des blancs de même
 * longueur : ce qui reste est la structure SQL. Gère `--`, `/* *\/`, `'…'`
 * (apostrophe doublée), `E'…'` (antislash d'échappement) et `$tag$…$tag$`.
 */
export function masquerSql(sql) {
  let sortie = "";
  let i = 0;
  const n = sql.length;
  const blanc = (s) => s.replace(/[^\n]/g, " ");
  while (i < n) {
    const c = sql[i];
    const suivant = sql[i + 1];
    if (c === "-" && suivant === "-") {
      const fin = sql.indexOf("\n", i);
      const j = fin === -1 ? n : fin;
      sortie += blanc(sql.slice(i, j));
      i = j;
    } else if (c === "/" && suivant === "*") {
      const fin = sql.indexOf("*/", i + 2);
      const j = fin === -1 ? n : fin + 2;
      sortie += blanc(sql.slice(i, j));
      i = j;
    } else if (c === "$") {
      const m = /^\$([A-Za-z_][A-Za-z0-9_]*)?\$/.exec(sql.slice(i));
      if (!m) {
        sortie += c;
        i += 1;
        continue;
      }
      // Le corps d'une fonction `$$ … $$` est du SQL : un trigger peut y
      // appeler `btrim`. On garde le corps, on ne masque que les balises.
      sortie += blanc(m[0]);
      i += m[0].length;
    } else if (c === "'") {
      const echappe = i > 0 && /[eE]/.test(sql[i - 1]) && !/[A-Za-z0-9_]/.test(sql[i - 2] ?? "");
      let j = i + 1;
      while (j < n) {
        if (echappe && sql[j] === "\\") {
          j += 2;
          continue;
        }
        if (sql[j] === "'") {
          if (sql[j + 1] === "'") {
            j += 2;
            continue;
          }
          break;
        }
        j += 1;
      }
      const fin = Math.min(j + 1, n);
      // Les apostrophes restent : `btrim(x, '')` garde son second argument.
      sortie += "'" + blanc(sql.slice(i + 1, fin - 1)) + (fin - 1 > i ? "'" : "");
      i = fin;
    } else {
      sortie += c;
      i += 1;
    }
  }
  return sortie;
}

/** Nombre d'appels `btrim(…)` à un seul argument dans un texte SQL. */
export function compterBtrimUnArgument(sql) {
  const s = masquerSql(sql);
  const re = /\bbtrim\s*\(/gi;
  let compte = 0;
  let m;
  while ((m = re.exec(s))) {
    let profondeur = 1;
    let virgules = 0;
    let j = m.index + m[0].length;
    for (; j < s.length && profondeur > 0; j += 1) {
      const c = s[j];
      if (c === "(") profondeur += 1;
      else if (c === ")") profondeur -= 1;
      else if (c === "," && profondeur === 1) virgules += 1;
    }
    if (profondeur === 0 && virgules === 0) compte += 1;
  }
  return compte;
}

function lireMigrations() {
  return fs
    .readdirSync(MIGRATIONS, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .filter((nom) => fs.existsSync(path.join(MIGRATIONS, nom, "migration.sql")))
    .sort();
}

test("parseur : un argument compte, deux arguments non", () => {
  assert.equal(compterBtrimUnArgument("CHECK (btrim(texte) <> '')"), 1);
  assert.equal(compterBtrimUnArgument("CHECK (BTRIM( texte ) <> '')"), 1);
  assert.equal(compterBtrimUnArgument("CHECK (btrim(texte, E' \\t\\r\\n') <> '')"), 0);
  assert.equal(compterBtrimUnArgument("CHECK (btrim(texte, ' \t\r\n') <> '')"), 0);
  assert.equal(compterBtrimUnArgument("CHECK (btrim(lower(texte)) <> '')"), 1);
  assert.equal(compterBtrimUnArgument("CHECK (btrim(coalesce(a, b)) <> '')"), 1);
  assert.equal(compterBtrimUnArgument("CHECK (btrim(coalesce(a, b), ' \t') <> '')"), 0);
});

test("parseur : commentaires et chaînes ne sont pas des appels", () => {
  assert.equal(compterBtrimUnArgument("-- btrim(x) ne retire que l'espace\nSELECT 1;"), 0);
  assert.equal(compterBtrimUnArgument("/* btrim(x) */ SELECT 1;"), 0);
  assert.equal(compterBtrimUnArgument("COMMENT ON COLUMN t.c IS 'btrim(x) interdit';"), 0);
  assert.equal(compterBtrimUnArgument("SELECT E'l\\'btrim(x)';"), 0);
});

test("parseur : le corps d'une fonction $$ … $$ est lu", () => {
  const sql = "CREATE FUNCTION f() RETURNS trigger AS $$ BEGIN IF btrim(NEW.t) = '' THEN RAISE; END IF; END $$ LANGUAGE plpgsql;";
  assert.equal(compterBtrimUnArgument(sql), 1);
  const sql2 = "CREATE FUNCTION f() RETURNS trigger AS $corps$ BEGIN IF btrim(NEW.t, ' \t') = '' THEN RAISE; END IF; END $corps$ LANGUAGE plpgsql;";
  assert.equal(compterBtrimUnArgument(sql2), 0);
});

test("migrations : aucun btrim à un argument hors du gel, aucun compte gelé en hausse", () => {
  const ecarts = [];
  const vus = new Set();
  for (const nom of lireMigrations()) {
    const sql = fs.readFileSync(path.join(MIGRATIONS, nom, "migration.sql"), "utf8");
    const compte = compterBtrimUnArgument(sql);
    const gele = GEL[nom] ?? 0;
    if (nom in GEL) vus.add(nom);
    // Égalité stricte : un gel plus large que le compte réel laisserait passer
    // une hausse jusqu'à lui.
    if (compte !== gele) {
      ecarts.push(`${nom} : ${compte} appel(s) btrim à un argument (gel : ${gele})`);
    }
  }
  assert.deepEqual(
    ecarts,
    [],
    "btrim(texte) ne retire que l'espace ASCII : écrire btrim(texte, E' \\t\\r\\n') " +
      "(mémoire btrim-un-argument, D-111).",
  );
  // Un dossier gelé disparu signale un gel à relire, pas une victoire.
  assert.deepEqual(
    Object.keys(GEL).filter((nom) => !vus.has(nom)),
    [],
    "Dossier du gel introuvable : relire la liste GEL.",
  );
});
