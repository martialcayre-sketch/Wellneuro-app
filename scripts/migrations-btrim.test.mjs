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
// Depuis le lot `autonomie-pieges-restes`, la famille entière est vue :
// `ltrim(x)`, `rtrim(x)` et `trim(x)` sans caractères ont le même défaut.
// Aucune migration n'en contenait : leur gel est à zéro.

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
 *
 * Deux lectures d'une chaîne `$tag$`, que `compterBtrimUnArgument` combine :
 * - `"contexte"` : du SQL après `AS`, `DO [LANGUAGE x]` ou `EXECUTE`, un
 *   littéral ailleurs ;
 * - `"sql"` : la lecture d'avant, à l'identique, qui lit tout contenu dollar
 *   comme du SQL.
 */
export function masquerSql(sql, lecture = "contexte") {
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
    } else if (c === "$" && lecture === "sql") {
      // Lecture d'avant, À L'IDENTIQUE (code de #2074) : seules les balises
      // sont masquées, le contenu est lu par la boucle comme du SQL. Aucune
      // exception : le maximum des deux lectures ne peut ainsi jamais tomber
      // sous l'ancien compte.
      const m = /^\$([A-Za-z_][A-Za-z0-9_]*)?\$/.exec(sql.slice(i));
      sortie += m ? blanc(m[0]) : c;
      i += m ? m[0].length : 1;
    } else if (c === "$") {
      // Collé à un identifiant (`a$b$c`, `é$q$`), un `$` en fait partie : pas
      // de délimiteur, sinon la suite du fichier serait effacée jusqu'au
      // prochain. Postgres admet les lettres non ASCII dans un identifiant.
      const m = /[\p{L}\p{N}_$]/u.test(sql[i - 1] ?? "") ? null : /^\$([A-Za-z_][A-Za-z0-9_]*)?\$/.exec(sql.slice(i));
      if (!m) {
        sortie += c;
        i += 1;
        continue;
      }
      // Une chaîne `$tag$ … $tag$` est du SQL quand elle suit `AS` (corps de
      // fonction, de trigger), `DO [LANGUAGE x]` ou `EXECUTE` (SQL dynamique,
      // exécuté) : elle est lue, masquée à son tour (ses propres chaînes,
      // commentaires et `$q$` imbriqués). Ailleurs (`COMMENT … IS $$…$$`,
      // argument `btrim($$a,b$$)`), c'est un littéral, rendu comme `'…'` : sa
      // virgule n'est pas un second argument, et il reste visible comme
      // argument.
      const ouverture = i + m[0].length;
      const fermeture = sql.indexOf(m[0], ouverture);
      const fin = fermeture === -1 ? n : fermeture + m[0].length;
      const corps = /(?:\bAS|\bDO(?:\s+LANGUAGE\s+(?:\w+|"[^"]*"))?|\bEXECUTE)\s*$/i.test(sortie);
      if (corps) {
        const finContenu = fermeture === -1 ? n : fermeture;
        sortie += blanc(m[0]) + masquerSql(sql.slice(ouverture, finContenu), lecture);
        if (fermeture !== -1) sortie += blanc(m[0]);
      } else {
        const brut = sql.slice(i, fin);
        sortie += brut.length >= 2 ? "'" + blanc(brut.slice(1, -1)) + "'" : blanc(brut);
      }
      i = fin;
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

/**
 * Nombre d'appels de la famille `trim` sans jeu de caractères, donc qui ne
 * retirent que l'espace ASCII : `btrim(x)`, `ltrim(x)`, `rtrim(x)`, et
 * `trim(x)`, `trim(both from x)`. `trim(both E' \t' from x)` et
 * `trim(x, ' \t')` nomment leurs caractères et ne comptent pas.
 *
 * Le compte retenu est le plus haut des deux lectures de `masquerSql`. Ce banc
 * ne peut donc jamais voir moins que la lecture d'avant : une forme que
 * l'heuristique « contexte » ne reconnaît pas (`EXECUTE format($q$…$q$)`,
 * `DO LANGUAGE "plpgsql"`) reste comptée. Prix accepté, des refus prudents,
 * les faux positifs de la lecture d'avant : `trim($$ $$ from t)`, un appel cité
 * dans un littéral dollar (`COMMENT … IS $$btrim(x)$$`, `RAISE NOTICE`).
 * Aucune migration n'a ces formes.
 */
export function compterBtrimUnArgument(sql) {
  return Math.max(compterDans(masquerSql(sql, "sql")), compterDans(masquerSql(sql, "contexte")));
}

function compterDans(s) {
  const re = /\b(btrim|ltrim|rtrim|trim)\s*\(/gi;
  let compte = 0;
  let m;
  while ((m = re.exec(s))) {
    // `plat` : le contenu au premier niveau, les parenthèses imbriquées vidées.
    let profondeur = 1;
    let plat = "";
    let j = m.index + m[0].length;
    for (; j < s.length && profondeur > 0; j += 1) {
      const c = s[j];
      if (c === "(") {
        profondeur += 1;
        if (profondeur === 2) plat += "(";
      } else if (c === ")") {
        profondeur -= 1;
        if (profondeur === 1) plat += ")";
      } else if (profondeur === 1) plat += c;
    }
    if (profondeur !== 0) continue;
    let caracteres = plat.includes(",");
    if (!caracteres && m[1].toLowerCase() === "trim") {
      const [avant, ...apres] = plat.split(/\bfrom\b/i);
      caracteres = apres.length > 0 && avant.replace(/\b(?:leading|trailing|both)\b/gi, "").trim() !== "";
    }
    if (!caracteres) compte += 1;
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

// P2 de wn-reviewer et de Codex sur #2074.
test("parseur : trim, ltrim et rtrim sans caractères comptent", () => {
  assert.equal(compterBtrimUnArgument("CHECK (ltrim(t) <> '')"), 1);
  assert.equal(compterBtrimUnArgument("CHECK (RTRIM(t) <> '')"), 1);
  assert.equal(compterBtrimUnArgument("CHECK (trim(t) <> '')"), 1);
  assert.equal(compterBtrimUnArgument("CHECK (trim(both from t) <> '')"), 1);
  assert.equal(compterBtrimUnArgument("CHECK (trim(leading from lower(t)) <> '')"), 1);
  assert.equal(compterBtrimUnArgument("CHECK (ltrim(t, E' \\t') <> '')"), 0);
  assert.equal(compterBtrimUnArgument("CHECK (trim(both E' \\t\\r\\n' from t) <> '')"), 0);
  assert.equal(compterBtrimUnArgument("CHECK (trim(both chr(9) from t) <> '')"), 0);
  assert.equal(compterBtrimUnArgument("CHECK (trim(t, ' \t') <> '')"), 0);
});

test("parseur : un littéral dollar hors corps est une chaîne", () => {
  // Sa virgule n'est pas un second argument…
  assert.equal(compterBtrimUnArgument("SELECT btrim($$a,b$$);"), 1);
  // Refus prudent, accepté : la lecture d'avant lit un appel cité dans un
  // commentaire dollar (forme absente des migrations).
  assert.equal(compterBtrimUnArgument("COMMENT ON COLUMN t.c IS $$btrim(x)$$;"), 1);
  // Une apostrophe dans un littéral dollar ne masque pas la suite du fichier.
  assert.equal(compterBtrimUnArgument("COMMENT ON TABLE t IS $$l'arbitrage$$;\nALTER TABLE t ADD CHECK (btrim(c) <> '');"), 1);
});

test("parseur : corps après AS, DO [LANGUAGE x] et EXECUTE lus ; littéraux imbriqués non", () => {
  assert.equal(compterBtrimUnArgument("DO $$ BEGIN PERFORM btrim(x); END $$;"), 1);
  assert.equal(compterBtrimUnArgument("DO LANGUAGE plpgsql $$ BEGIN PERFORM btrim(x); END $$;"), 1);
  // Le SQL dynamique est exécuté : il est lu.
  assert.equal(compterBtrimUnArgument("DO $$ BEGIN EXECUTE $q$ALTER TABLE t ADD CHECK (btrim(c) <> '')$q$; END $$;"), 1);
  // Refus prudent, accepté : la lecture d'avant lit ce message comme du SQL.
  assert.equal(compterBtrimUnArgument("DO $$ BEGIN RAISE NOTICE $m$btrim(x)$m$; END $$;"), 1);
  assert.equal(compterBtrimUnArgument("CREATE FUNCTION f() RETURNS text AS $f$ SELECT 'it''s' || btrim(x) $f$ LANGUAGE sql;"), 1);
});

test("parseur : un $ collé à un identifiant n'ouvre pas de littéral", () => {
  assert.equal(compterBtrimUnArgument("SELECT a$b$c FROM t; ALTER TABLE t ADD CHECK (btrim(c) <> '');"), 1);
  assert.equal(compterBtrimUnArgument("CREATE TABLE t (é$q$ text, c text CHECK (btrim(c) <> ''));"), 1);
});

// Contre-revue Codex sur #2094 : jamais moins que la lecture d'avant.
test("parseur : les formes que le contexte ne reconnaît pas restent comptées", () => {
  assert.equal(compterBtrimUnArgument("DO $$ BEGIN EXECUTE format($q$ALTER TABLE t ADD CHECK (btrim(c) <> '')$q$); END $$;"), 1);
  assert.equal(compterBtrimUnArgument('DO LANGUAGE "plpgsql" $$ BEGIN PERFORM btrim(chr(9)); END $$;'), 1);
  // Refus prudent, accepté : un jeu de caractères en littéral dollar compte.
  assert.equal(compterBtrimUnArgument("CHECK (trim($$ $$ from t) <> '')"), 1);
  // Revue de l'écart (wn-reviewer) : une balise fermante précédée de `IS` ne
  // fait plus rien perdre.
  assert.equal(compterBtrimUnArgument("DO $$ BEGIN RAISE NOTICE $m$state IS $m$; EXECUTE format($q$ALTER TABLE t ADD CHECK (btrim(c) <> '')$q$); END $$;"), 1);
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
