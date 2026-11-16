// Masquage SQL partagé par les bancs de migrations (`migrations-btrim`,
// `migrations-now-trigger`). Sorti tel quel de `migrations-btrim.test.mjs`
// (lot `autonomie-pieges-restes`, partie 2) : un banc node:test qui en
// importerait un autre rejouerait ses tests.

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
