#!/usr/bin/env node
// Garde-fou d'écriture de fichiers. Deux niveaux, pas un mur unique :
//
//   REFUS   — secrets et répertoires d'infrastructure. Rien de légitime ne
//             s'écrit là depuis une session ; le blocage reste dur (exit 2).
//   DEMANDE — migrations DESTRUCTIVES, et toute écriture de migration par
//             Bash (D-523, autorisation permanente bornée du 2026-11-14 : le
//             schéma et les migrations non destructives s'écrivent sans
//             confirmation ; le destructif reste à la confirmation du
//             responsable). La rendre ici, plutôt que d'exiger une variable
//             d'environnement, garde la confirmation DANS la session (et donc
//             tracée) au lieu de la reléguer à un rituel hors extension.
//
// Il n'y a volontairement PLUS d'échappatoire par variable d'environnement.
// `WN_ALLOW_PROTECTED_WRITE=1` désactivait ce hook pour la SESSION ENTIÈRE, pas
// pour la migration qui l'avait motivée : une session ouverte le matin pour un
// gate restait sans filet tout le reste de la journée (constaté le 2026-07-20).
// Le niveau DEMANDE rend l'échappatoire inutile ; le niveau REFUS ne doit pas
// en avoir.
//
// ARMÉ AUSSI SUR BASH (t18, 2026-10-22). Une commande qui écrit un fichier
// protégé — redirection, `tee`, `sed -i`, `cp`… — reçoit le MÊME verdict que
// par Edit/Write : `cibles-ecriture-bash.mjs` en lit les cibles, chacune passe
// par `juger()` ci-dessous. Un interpréteur qui CITE un chemin protégé
// (`python3 -c "open(…)"`) reçoit « demande » : son écriture éventuelle
// échappe à toute analyse. Le reste — script opaque, chemin par variable —
// est un silence assumé, dit dans `.claude/rules/hooks-garde-fous.md`.
import fs from "node:fs";
import path from "node:path";
import { ciblesEcritureBash } from "./cibles-ecriture-bash.mjs";

let data = {};
try {
  data = JSON.parse(fs.readFileSync(0, "utf8"));
} catch {
  process.exit(0);
}

// Niveau REFUS : aucune écriture, jamais.
const refus = [
  "/.git/",
  "node_modules/",
  ".next/",
  "dist/",
  "coverage/",
  "/.env",
  ".env.local",
  ".env.production",
  ".env.development"
];

// Schéma et migrations ([[D-523]]). Plus une « demande » d'office :
// - `schema.prisma` : silence. Il ne touche aucune base par lui-même ; ce qui
//   l'applique est une migration, jugée ci-dessous, ou `prisma db push`, qui
//   demande au garde des commandes ;
// - migration écrite par Edit/Write : jugée sur le CONTENU RÉSULTANT (disque +
//   édition), lexé comme PostgreSQL ; ce qui ne se lit pas avec certitude
//   demande (voir `motifDestructif`). Destructive, elle demande ; sinon,
//   silence ;
// - migration écrite par Bash, ou citée par un interpréteur : demande
//   toujours. Le SQL réellement écrit (un `cp`, une sortie de `prisma migrate
//   diff` redirigée) n'est pas dans la commande : il ne se juge pas.
const schemaEtMigrations = [
  "prisma/schema.prisma",
  "prisma/migrations/",
  "supabase/migrations/"
];

// Ce qui détruit ou réécrit des données existantes, ou désarme une garde de
// la base — la liste de D-523 §3 : DROP, TRUNCATE, RENAME, changement de type
// (une conversion peut tronquer), MERGE (qui peut supprimer), SQL dynamique
// (il reconstruit à l'exécution ce que le texte ne montre pas), et ce qui
// neutralise un déclencheur, une règle ou la RLS (le journal append-only des
// décisions tient par ses déclencheurs).
//
// PRINCIPE : CE QUE LE LEXEUR NE COMPREND PAS DEMANDE (contre-revues Codex et
// wn-reviewer du 2026-11-14, deux passes chacune). Les motifs se cherchent sur
// le texte LEXÉ — commentaires (imbriqués compris) devenus espaces, chaînes
// et identifiants cités devenus `lit` et `ident` — et sur le texte brut de
// chaque corps `$tag$…$tag$`. Une construction que le lexeur ne sait pas
// lire avec certitude (U&, UESCAPE, chaîne, identifiant, commentaire ou corps
// non fermé) demande d'office. Un mot destructif cité en commentaire ou dans
// une chaîne ne demande donc plus : l'en-tête « aucun DROP » des migrations
// du dépôt reste muet. `EXECUTE FUNCTION|PROCEDURE` (déclencheurs) et
// `GRANT|REVOKE EXECUTE ON` ne sont pas du SQL dynamique — hors d'un corps.
const MOTIFS_DESTRUCTIFS = [
  // `DROP NOT NULL`, `DROP DEFAULT` et `ON COMMIT DROP` (table temporaire)
  // n'effacent aucune donnée ; un DROP de contrainte, d'index ou de
  // déclencheur demande (il peut désarmer une garde).
  { nom: "DROP", motif: /(?<!\bon\s+commit\s+)\bdrop\b(?!\s+(not\s+null|default)\b)/ },
  // `BEFORE TRUNCATE` (déclencheur append-only) et `REVOKE …, TRUNCATE` ne
  // tronquent rien.
  { nom: "TRUNCATE", motif: /(?<!\b(before|after|or)\s+|,\s*)\btruncate\b/ },
  { nom: "RENAME", motif: /\brename\b/ },
  { nom: "MERGE", motif: /\bmerge\b/ },
  { nom: "ALTER … TYPE", motif: /\balter\s+((column|attribute)\s+)?[^\s;]+\s+(set\s+data\s+)?type\b/ },
  { nom: "EXECUTE dynamique", motif: /\bexecute\b(?!\s+(function|procedure|on)\b)/ },
  { nom: "DISABLE TRIGGER", motif: /\bdisable\s+(trigger|rule)\b/ },
  // En mode origine, un déclencheur REPLICA ne se déclenche plus.
  { nom: "ENABLE REPLICA", motif: /\benable\s+replica\s+(trigger|rule)\b/ },
  { nom: "DISABLE ROW LEVEL SECURITY", motif: /\b(disable|no\s+force)\s+row\s+level\s+security\b/ },
  { nom: "CREATE RULE", motif: /\bcreate\s+(or\s+replace\s+)?rule\b/ },
  // Des droits ouverts aux rôles d'API, ou une politique RLS réécrite
  // (PR-Agent, #2137) : la RLS ne protège plus ce qu'elle protégeait.
  { nom: "GRANT à un rôle ouvert", motif: /\bgrant\b[^;]*\bto\s+[^;]*\b(public|anon|authenticated)\b/ },
  { nom: "ALTER POLICY", motif: /\balter\s+policy\b/ },
  // Contourner la RLS sans toucher à la politique : un rôle BYPASSRLS ou
  // SUPERUSER, ou un nouveau propriétaire de table (PR-Agent, #2137).
  { nom: "BYPASSRLS ou SUPERUSER", motif: /\b(bypassrls|superuser)\b/ },
  { nom: "OWNER TO", motif: /\bowner\s+to\b/ },
  { nom: "session_replication_role", motif: /\bsession_replication_role\b/ }
];

// Une instruction qui écrit des lignes : `DELETE FROM`, `UPDATE [ONLY] table
// [[AS] alias] SET` (nom qualifié compris, une fois les points recollés), ou
// la branche `DO UPDATE SET` d'un INSERT … ON CONFLICT. Pas `BEFORE UPDATE
// ON` ni `UPDATE OF` d'un déclencheur.
const SUPPRIME = /\bdelete\s+from\b/g;
// Large à dessein : tout UPDATE qu'un SET suit dans la même instruction,
// sauf après BEFORE, AFTER, OR, FOR, OF, une virgule (déclencheur, droits,
// verrou) — `UPDATE ONLY (t) * AS p SET` compris (wn-reviewer, troisième
// passe).
const MODIFIE = /(?<!\b(before|after|or|for|of|instead\s+of)\s+|,\s*)\bupdate\b(?=[^;]*\bset\b)/g;

// Identifiants cités qui gardent leur nom dans le texte lexé.
const IDENTIFIANTS_SENSIBLES = new Set(["public", "anon", "authenticated", "session_replication_role"]);

// Étiquette d'un corps dollar : `$$` ou `$tag$`, tag aux règles d'un
// identifiant (lettres Unicode comprises : `$é$` est valide).
// Lue en place (drapeau `y`), sans fenêtre : une étiquette n'a pas de
// longueur maximale (Codex, troisième passe).
const ETIQUETTE_DOLLAR = /\$((?:[\p{L}_][\p{L}\p{N}_]*)?)\$/uy;

/** L'étiquette `$…$` qui commence en `i`, ou `null`. */
function etiquetteEn(texte, i) {
  ETIQUETTE_DOLLAR.lastIndex = i;
  const trouve = ETIQUETTE_DOLLAR.exec(texte);
  return trouve ? trouve[0] : null;
}

/**
 * Le SQL lexé (`texte`), les corps `$…$` bruts (`corps`), le contenu des
 * identifiants cités (`identifiants`), et `incomplet` si
 * une construction n'a pas pu être lue avec certitude.
 */
function lexer(source) {
  const texte = source.replace(/\r\n?/g, "\n");
  // La sortie s'accumule en morceaux ; `fin` en garde les derniers
  // caractères. Lire la fin d'une chaîne accumulée l'aplatit en entier :
  // à chaque littéral, le coût devenait quadratique (PR-Agent, #2137).
  const morceaux = [];
  let fin = "";
  // Les blancs s'écrasent dans `fin` : 300 espaces entre `DO` et son
  // littéral ne font plus sortir `DO` de la fenêtre (wn-reviewer, #2137).
  // Seul le morceau ajouté s'écrase, et la fenêtre ne se coupe qu'au-delà de
  // 512 caractères : le coût reste linéaire, à petite constante.
  const ajouter = (x) => {
    morceaux.push(x);
    const y = x.length === 1 ? (/\s/.test(x) ? " " : x) : x.replace(/\s+/g, " ");
    fin += fin.endsWith(" ") && y.startsWith(" ") ? y.slice(1) : y;
    if (fin.length > 512) fin = fin.slice(-256);
  };
  const corps = [];
  const identifiants = [];
  let incomplet = /\bu&['"]|\buescape\b/.test(texte);
  for (let i = 0; i < texte.length; i++) {
    const c = texte[i];
    if (c === "-" && texte[i + 1] === "-") {
      while (i < texte.length && texte[i] !== "\n") i++;
      ajouter(" ");
    } else if (c === "/" && texte[i + 1] === "*") {
      // Les commentaires de PostgreSQL s'imbriquent.
      let profondeur = 1;
      i += 2;
      while (i < texte.length && profondeur > 0) {
        if (texte[i] === "/" && texte[i + 1] === "*") { profondeur++; i += 2; }
        else if (texte[i] === "*" && texte[i + 1] === "/") { profondeur--; i += 2; }
        else i++;
      }
      if (profondeur > 0) incomplet = true;
      i--;
      ajouter(" ");
    } else if (c === '"') {
      let ferme = false;
      const debut = i + 1;
      for (i++; i < texte.length; i++) {
        if (texte[i] !== '"') continue;
        if (texte[i + 1] === '"') { i++; continue; }
        ferme = true;
        break;
      }
      if (!ferme) incomplet = true;
      const nom = texte.slice(debut, i).replace(/""/g, '"');
      identifiants.push(nom);
      // Un rôle ou un paramètre sensible garde son nom (`TO "anon"`, la
      // forme qu'écrit Prisma) : sinon le motif GRANT ne le verrait pas
      // (PR-Agent, #2137).
      ajouter(IDENTIFIANTS_SENSIBLES.has(nom) ? ` ${nom} ` : " ident ");
    } else if (c === "'") {
      // Chaîne E (`E'…'`) : la barre oblique échappe le caractère suivant.
      const chaineE = texte[i - 1] === "e" && !/[\p{L}\p{N}_$]/u.test(texte[i - 2] ?? " ");
      // Le `e` de `E'…'` vient d'être émis seul : il se retire.
      if (chaineE) { morceaux.pop(); fin = fin.slice(0, -1); }
      const debutChaine = i + 1;
      let ferme = false;
      for (i++; i < texte.length; i++) {
        if (chaineE && texte[i] === "\\") { i++; continue; }
        if (texte[i] !== "'") continue;
        if (texte[i + 1] === "'") { i++; continue; }
        ferme = true;
        break;
      }
      if (!ferme) incomplet = true;
      // `DO '…'` ou `AS '…'` (corps de fonction entre apostrophes) : la
      // chaîne est un corps, lu brut comme un `$…$` (Codex, troisième passe).
      // Le corps se décode comme PostgreSQL le lit : `''` vaut `'`, et dans
      // une chaîne E, `\x` vaut `x` (Codex, quatrième passe : `''--''`
      // brut ouvrait un faux commentaire).
      // Seule la fin de la sortie compte (motif ancré).
      if (/\b(do(\s+language\s+\S+)?|as)\s*$/.test(fin)) {
        const brut = texte.slice(debutChaine, i);
        // `\xHH`, `\ooo`, `\uXXXX` d'une chaîne E se décodent en lettres
        // que le crochet ne voit pas (`\x54RUNCATE`) : non lu avec
        // certitude (wn-reviewer, quatrième passe).
        if (chaineE && /\\[0-7xuU]/.test(brut)) incomplet = true;
        corps.push(chaineE ? brut.replace(/''/g, "'").replace(/\\(.)/gs, "$1") : brut.replace(/''/g, "'"));
      }
      ajouter(" lit ");
    } else if (c === "$" && !/[\p{L}\p{N}_$]/u.test(texte[i - 1] ?? " ") && etiquetteEn(texte, i)) {
      const etiquette = etiquetteEn(texte, i);
      const fin = texte.indexOf(etiquette, i + etiquette.length);
      if (fin === -1) {
        incomplet = true;
        corps.push(texte.slice(i + etiquette.length));
        i = texte.length;
      } else {
        corps.push(texte.slice(i + etiquette.length, fin));
        i = fin + etiquette.length - 1;
      }
      ajouter(" lit ");
    } else {
      ajouter(c);
    }
  }
  return { texte: morceaux.join(""), corps, identifiants, incomplet };
}

/** Profondeur de parenthèses à la position `fin` du texte lexé. */
function profondeurA(instruction, fin) {
  let profondeur = 0;
  for (let i = 0; i < fin; i++) {
    if (instruction[i] === "(") profondeur++;
    else if (instruction[i] === ")") profondeur = Math.max(0, profondeur - 1);
  }
  return profondeur;
}

/**
 * Une condition qui ne borne rien : chaque terme d'un AND est `true`,
 * `1 = 1` ou `not false` (parenthèses ignorées), ou l'un des termes d'un OR
 * l'est.
 */
function conditionTautologique(condition) {
  // Conversions ignorées : `::type` (qualifié ou tableau compris) et
  // `CAST(x AS type)` (Codex, quatrième passe : `true::pg_catalog.bool`).
  const plate = condition
    .replace(/::\s*[\w.]+(\s*\[\s*\])*/g, " ")
    .replace(/\bcast\b/g, " ")
    .replace(/\bas\s+[\w.]+(\s*\[\s*\])*/g, " ")
    .replace(/[()]/g, " ").replace(/\s+/g, " ").trim();
  return plate.split(/\bor\b/).some((terme) =>
    terme.split(/\band\b/).every((facteur) => /^(true|1 ?= ?1|not false)$/.test(facteur.trim())));
}

// Lu en place (drapeau `y`) : trancher la suite à chaque caractère était
// quadratique sur une longue instruction.
const WHERE_EN = /where\b/y;
function whereEn(texte, i) {
  WHERE_EN.lastIndex = i;
  return WHERE_EN.test(texte);
}

/**
 * Une clause WHERE de niveau supérieur, dans `suite` (le texte lexé qui suit
 * le DELETE ou l'UPDATE), qui ne soit pas tautologique.
 */
function whereBorne(suite) {
  let profondeur = 0;
  for (let i = 0; i < suite.length; i++) {
    const c = suite[i];
    if (c === "(") profondeur++;
    else if (c === ")") profondeur = Math.max(0, profondeur - 1);
    else if (profondeur === 0 && c === "w" && whereEn(suite, i) && !/\w/.test(suite[i - 1] ?? " ")) {
      const condition = suite.slice(i + 5).split(/\breturning\b/)[0];
      return !conditionTautologique(condition);
    }
  }
  return false;
}

/**
 * Le motif destructif d'un texte lexé, ou `null`. `dansCorps` : le texte est
 * un corps de fonction ou de DO, que le crochet ne juge pas — toute écriture
 * de lignes ou tout EXECUTE y demande, borné ou non.
 */
function jugerLexe(source, dansCorps, profondeurCorps = 0) {
  const { texte: lexe, corps, identifiants, incomplet } = lexer(source);
  const ou = dansCorps ? " dans un corps de fonction ou de DO" : "";
  // Un corps qui ne se lexe pas (`$$Table de l'auteur$$` est un littéral,
  // pas du code) se lit brut, sans aucune exception : tout mot qui écrit,
  // détruit ou désarme y demande.
  if (incomplet && dansCorps) {
    return /\b(delete|update|execute|truncate|drop|merge|rename|alter|disable|replica|rule|session_replication_role)\b/.test(source)
      ? `mot destructif${ou}, corps non lexable (non jugé)`
      : null;
  }
  if (incomplet) return `SQL non lu avec certitude${ou} (U&, UESCAPE, ou chaîne, identifiant, commentaire ou corps $…$ non fermé)`;
  for (const { nom, motif } of MOTIFS_DESTRUCTIFS) {
    if (motif.test(lexe)) return nom + ou;
  }
  // Un paramètre cité (`SET "session_replication_role" = replica`).
  if (identifiants.includes("session_replication_role")) return "session_replication_role" + ou;
  // Les actions de clé étrangère (`ON DELETE …`, `ON UPDATE …`) ne sont pas
  // des instructions ; `"public"."T"` (lexé `ident . ident`) se recolle.
  const code = lexe.replace(/\bon\s+(delete|update)\b/g, " ").replace(/\s*\.\s*/g, ".");
  if (dansCorps) {
    // `EXECUTE function` (variable PL/pgSQL) est dynamique ; `EXECUTE ON`
    // ne l'est pas, ON étant réservé.
    // Dans un corps, aucune exception pour UPDATE : `OPEN c FOR UPDATE t
    // SET … RETURNING` écrit (wn-reviewer, quatrième passe).
    if (/\bexecute\b(?!\s+on\b)/.test(code) || new RegExp(SUPPRIME.source).test(code) || /\bupdate\b[^;]*\bset\b/.test(code)) {
      return "DELETE, UPDATE ou EXECUTE dans un corps de fonction ou de DO (non jugé)";
    }
  } else {
    for (const instruction of code.split(";")) {
      for (const [ecrit, motif] of [["DELETE", SUPPRIME], ["UPDATE", MODIFIE]]) {
        for (const trouve of instruction.matchAll(motif)) {
          // Dans une CTE ou une sous-requête : le WHERE qui suit n'est pas le sien.
          if (profondeurA(instruction, trouve.index) > 0) return `${ecrit} dans une sous-instruction`;
          if (!whereBorne(instruction.slice(trouve.index + trouve[0].length))) return `${ecrit} sans WHERE`;
        }
      }
    }
  }
  // Chaque corps se lexe à son tour (commentaires et chaînes compris) :
  // un `-- or` ou un `/**/` n'y déclenche plus d'exception.
  if (corps.length && profondeurCorps >= 8) return "corps de fonction imbriqués trop profondément (non jugé)";
  for (const texte of corps) {
    const verdict = jugerLexe(texte, true, profondeurCorps + 1);
    if (verdict) return verdict;
  }
  return null;
}

/** Le motif destructif d'un SQL de migration, ou `null`. */
function motifDestructif(sql) {
  const source = String(sql).toLowerCase();
  // `set_config('session_replication_role', …)` : le nom est dans une
  // chaîne. Cherché sur le texte entier — il ne sert à rien d'autre.
  if (/session_replication_role/.test(source)) return "session_replication_role";
  return jugerLexe(source, false);
}

/** Contenu résultant d'un Write/Edit (disque + édition), comme pour le marqueur plus bas. */
function contenuResultant(filePath, toolInput) {
  let surDisque = null;
  try {
    const absolu = path.resolve(process.env.CLAUDE_PROJECT_DIR || process.cwd(), filePath);
    surDisque = fs.readFileSync(absolu, "utf8");
  } catch {
    // Fichier neuf ou illisible : seul le contenu entrant est jugé.
  }
  const appliquer = (texte, edit) => {
    if (typeof texte !== "string" || !edit || typeof edit.old_string !== "string"
      || typeof edit.new_string !== "string") return texte;
    return edit.replace_all
      ? texte.split(edit.old_string).join(edit.new_string)
      : texte.replace(edit.old_string, () => edit.new_string);
  };
  let resultat = typeof toolInput.content === "string" ? toolInput.content : surDisque;
  resultat = appliquer(resultat, toolInput);
  if (Array.isArray(toolInput.edits)) {
    for (const edit of toolInput.edits) resultat = appliquer(resultat, edit);
  }
  // Les fragments entrants aussi : une édition dont `old_string` ne s'applique
  // pas laisserait sinon un DROP du `new_string` hors du jugement.
  const fragments = [toolInput.new_string, ...(Array.isArray(toolInput.edits) ? toolInput.edits.map((e) => e?.new_string) : [])]
    .filter((t) => typeof t === "string");
  return [resultat, ...fragments].filter((t) => typeof t === "string").join("\n;\n");
}

// Niveau DEMANDE — fichiers cliniques (Socle LOT-02). Six tables signées
// (`validationExterne: true`) et deux fichiers de constantes cliniques : la
// constitution exige pour toute modification une décision D-xxx et un
// fragment changelog.d/ (DC-17, DC-18) — l'autorisation en un clic
// matérialise cette confirmation dans la session. JAMAIS « refus » : le
// niveau demande n'interdit pas le travail, il le rend explicite.
//
// PORTÉE, dite sans sur-promettre : Edit/Write, et depuis t18 les écritures
// Bash aux formes reconnues (voir l'en-tête) — pas un script opaque.
//
// Motifs en minuscules (le chemin est normalisé plus haut) et ancrés par leur
// répertoire : `includes()` sans ancrage ferait d'un motif court un filet
// trop large. Vérifié à l'écriture du lot : chaque motif matche exactement UN
// fichier suivi du dépôt. Les compagnons de test (`*.test.ts`) ne matchent
// pas — le sha épinglé s'y ré-épingle librement, c'est la CI qui le juge.
const demandeClinique = [
  "src/lib/clinical/orientationrulesv1.ts",
  "src/lib/clinical/stoprulesv1.ts",
  "src/lib/clinical/priorityrulesv1.ts",
  "src/lib/clinical/contradictionsv1.ts",
  "src/lib/clinical/corpussynthesev1.ts",
  "src/lib/biology-library/indicationsbiologiev1.ts",
  "src/lib/equilibre/constants.ts",
  "src/lib/questions.ts",
  // Candidats du LOT-02, tranchés le 2026-10-21 (plan D/41) : les libellés
  // des règles d'arrêt, et le questionnaire alimentaire qui pilote
  // `VERSION_SCORE_EQUILIBRE`. La fixture `chaineC1Fixture` reste libre.
  "src/lib/clinical/stopruleslibelles.ts",
  "src/lib/questionnaires/alimentaire.ts"
];

/**
 * Verdict pour un chemin : `{ niveau: 'refus', motif, message }`,
 * `{ niveau: 'demande', motif, raison }`, ou `null` (silence).
 */
function juger(filePath, toolInput, origine = "outil") {
  // `path.posix.normalize` replie `/./`, `//` et `..` AVANT la comparaison :
  // sans lui, `web/src/lib/./clinical/x.ts` échappait à tout motif
  // multi-segment (relecture adversariale du Socle LOT-02 — le défaut était
  // hérité et touchait déjà le niveau « demande » Prisma). Les motifs REFUS,
  // mono-segment, n'y étaient pas sensibles ; rien n'est abaissé, des chemins
  // d'évitement se referment.
  const normalized = path.posix
    .normalize(filePath.replaceAll("\\", "/"))
    .toLowerCase();

  for (const motif of refus) {
    if (normalized.includes(motif)) {
      return {
        niveau: "refus",
        motif,
        message:
          `Action bloquée par WellNeuro : modification protégée de ${filePath}. ` +
          `Règle : ${motif}. Secrets et répertoires d'infrastructure ne s'écrivent ` +
          `pas depuis une session — aucune dérogation.`
      };
    }
  }

  for (const motif of schemaEtMigrations) {
    if (!normalized.includes(motif)) continue;
    const rappel =
      `Le SQL committé s'appliquera à la base de production Scalingo ` +
      `HORS du build : le merge sur main lance le workflow release-db, ` +
      `qui l'écrit après le minuteur de son environnement, sans clic ` +
      `humain (D-520). La porte est donc le merge : contre-revue Codex ` +
      `P0 et GO de wn-reviewer avant lui, une migration à la fois.`;
    if (origine !== "outil") {
      return {
        niveau: "demande",
        motif,
        raison:
          `Écriture de schéma ou de migration Prisma par Bash (${motif}) : le ` +
          `SQL réellement écrit n'est pas dans la commande, il ne se juge pas ` +
          `(D-523). Écrire la migration par Edit/Write, où son contenu se ` +
          `juge, ou confirmer ici. ` + rappel
      };
    }
    if (motif === "prisma/schema.prisma" || !normalized.endsWith(".sql")) return null;
    const destructif = motifDestructif(contenuResultant(filePath, toolInput));
    if (!destructif) return null;
    return {
      niveau: "demande",
      motif,
      raison:
        `Migration destructive détectée (${destructif}) : ${filePath}. ` +
        `D-523 : DROP, TRUNCATE, DELETE ou UPDATE sans WHERE (ou sous un ` +
        `WHERE tautologique), MERGE, renommage, changement de type, SQL ` +
        `dynamique (EXECUTE) et ce qui désarme un déclencheur, une règle ou ` +
        `la RLS restent soumis à la confirmation du responsable ; ce que le ` +
        `crochet ne lit pas avec certitude (corps $…$, CTE, U&, construction ` +
        `non fermée) demande aussi. ` +
        `autoriser vaut cette confirmation. ` + rappel
    };
  }

  for (const motif of demandeClinique) {
    if (normalized.includes(motif)) {
      return {
        niveau: "demande",
        motif,
        raison:
          `Fichier clinique protégé (${motif}) : table signée ou constantes ` +
          `cliniques. Toute modification — même une ligne, même un ` +
          `commentaire — exige une décision D-xxx et un fragment ` +
          `changelog.d/ (DC-17, DC-18) ; un fichier au sha épinglé devra ` +
          `être ré-épinglé dans son banc. Autoriser vaut confirmation ` +
          `explicite dans la session.`
      };
    }
  }

  // Niveau DEMANDE — toute table signée, récente ou future (BP-01, D-266).
  // La liste ci-dessus est littérale : neuf tables signées après le Socle n'y
  // étaient pas (catalogue des conduites, signaux de sécurité, portes
  // biologiques…), et la prochaine n'y serait pas davantage. Le critère est
  // donc le marqueur lui-même, `validationExterne: true` hors commentaire,
  // cherché dans le fichier sur disque ET dans le contenu entrant (`Write` d'un
  // fichier neuf, `Edit` qui pose le marqueur). Les compagnons de test restent
  // en silence, comme plus haut : leurs fixtures portent le marqueur.
  const estSourceDeProduction =
    /\.([cm]?[tj]sx?|json)$/.test(normalized) && !/\.(test|spec)\.[a-z]+$/.test(normalized);

  if (estSourceDeProduction) {
    // Commentaires retirés : blocs `/* */`, et `//` jusqu'à la fin de ligne
    // quand il est HORS d'une chaîne de la même ligne (une URL `'http://…'`
    // n'est pas un commentaire ; `x = 1; // validationExterne: true` en est un).
    const retirerFinDeLigne = (ligne) => {
      let guillemet = null;
      for (let i = 0; i < ligne.length; i++) {
        const c = ligne[i];
        if (guillemet) {
          if (c === "\\") i++;
          else if (c === guillemet) guillemet = null;
        } else if (c === "'" || c === '"' || c === "`") guillemet = c;
        else if (c === "/" && ligne[i + 1] === "/") return ligne.slice(0, i);
      }
      return ligne;
    };
    const sansCommentaires = (texte) =>
      String(texte)
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .split("\n")
        .map(retirerFinDeLigne)
        .join("\n");
    let surDisque = null;
    try {
      const absolu = path.resolve(process.env.CLAUDE_PROJECT_DIR || process.cwd(), filePath);
      surDisque = fs.readFileSync(absolu, "utf8");
    } catch {
      // Fichier neuf ou illisible : seul le contenu entrant est jugé.
    }
    // Le source RÉSULTANT est jugé, pas seulement chaque fragment : remplacer
    // `false` par `true` sur une table au verrou éteint ne porte le marqueur
    // complet ni sur disque ni dans le fragment — seulement après l'édition.
    const appliquer = (texte, edit) => {
      if (typeof texte !== "string" || !edit || typeof edit.old_string !== "string"
        || typeof edit.new_string !== "string") return texte;
      return edit.replace_all
        ? texte.split(edit.old_string).join(edit.new_string)
        : texte.replace(edit.old_string, () => edit.new_string);
    };
    let resultat = typeof toolInput.content === "string" ? toolInput.content : surDisque;
    resultat = appliquer(resultat, toolInput);
    if (Array.isArray(toolInput.edits)) {
      for (const edit of toolInput.edits) resultat = appliquer(resultat, edit);
    }
    const textes = [surDisque, resultat];
    for (const champ of [toolInput.content, toolInput.new_string]) {
      if (typeof champ === "string") textes.push(champ);
    }
    if (Array.isArray(toolInput.edits)) {
      for (const edit of toolInput.edits) {
        if (edit && typeof edit.new_string === "string") textes.push(edit.new_string);
      }
    }
    // Clé nue ou entre guillemets (`"validationExterne": true` en JSON).
    //
    // LA STRUCTURE DES FICHES D'USAGE est couverte verrou posé OU ÉTEINT
    // ([[D-314]] §2, critère de fin de F05) : elle est livrée vide et non signée,
    // et ce qu'on y écrit avant la signature est déjà le périmètre que le
    // responsable signera. Ailleurs, un verrou éteint reste en silence.
    // LA STRUCTURE DE LA BIBLIOTHÈQUE DES OPTIONS aussi ([[D-480]] §5.5, BP-17
    // PR 4) : livrée vide et non signée, sur le même patron.
    const structureFichesUsage = /(^|\/)web\/src\/lib\/(fiches-usage|bibliotheque-options)\//.test(normalized);
    const marqueur = structureFichesUsage
      ? /["']?validationExterne["']?\s*:\s*(true|false)/
      : /["']?validationExterne["']?\s*:\s*true/;
    if (textes.some((texte) => typeof texte === "string" && marqueur.test(sansCommentaires(texte)))) {
      return {
        niveau: "demande",
        motif: "validationExterne",
        raison:
          // Le littéral du marqueur n'est PAS recopié ici : ce hook se
          // demanderait sinon confirmation pour sa propre édition.
          `Table signée détectée (marqueur validationExterne) : ${filePath}. ` +
          `Toute modification — même une ligne, même un commentaire — exige ` +
          `une décision D-xxx et un fragment changelog.d/ (DC-17, DC-18) ; ` +
          `un fichier au sha épinglé devra être ré-épinglé dans son banc. ` +
          `Autoriser vaut confirmation explicite dans la session.`
      };
    }
  }

  return null;
}

function rendre(verdict) {
  if (verdict?.niveau === "refus") {
    console.error(verdict.message);
    process.exit(2);
  }
  if (verdict?.niveau === "demande") {
    process.stdout.write(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "ask",
        permissionDecisionReason: verdict.raison
      }
    }));
  }
  process.exit(0);
}

const toolInput = data.tool_input || {};

if (typeof toolInput.command === "string") {
  // Bash. Chaque cible d'écriture est jugée comme un Write dont le contenu
  // entrant serait le texte de la commande qui l'écrit, tube et heredocs
  // compris (un heredoc qui pose le marqueur d'une table signée neuve
  // demande, comme son Write). Le refus l'emporte.
  const cwd = data.cwd || process.cwd();
  const { ecritures, mentions } = ciblesEcritureBash(toolInput.command, cwd);
  const verdicts = ecritures
    .map(({ chemin: cible, contenu }) => {
      const v = juger(cible, { content: contenu }, "bash");
      if (!v) return null;
      const prefixe = `Écriture par commande Bash vers ${cible}. `;
      return v.niveau === "refus"
        ? { ...v, message: prefixe + v.message }
        : { ...v, raison: prefixe + v.raison };
    })
    .filter(Boolean);
  // Une MENTION n'est pas une écriture prouvée : au plus « demande ». Les
  // répertoires d'infrastructure (`node_modules/`, `.next/`, `dist/`…) qu'un
  // interpréteur cite à chaque lancement restent en silence ; un `.env`
  // cité demande.
  for (const cible of mentions) {
    const v = juger(cible, {}, "bash");
    if (!v || (v.niveau === "refus" && !v.motif.includes(".env"))) continue;
    verdicts.push({
      niveau: "demande",
      motif: v.motif,
      raison:
        `Commande d'interpréteur citant ${cible} : une écriture par ` +
        `l'interpréteur échappe à l'analyse de la commande, elle est donc ` +
        `jugée comme possible. ` +
        (v.niveau === "refus"
          ? `Règle : ${v.motif} — secrets, aucune écriture depuis une session.`
          : v.raison)
    });
  }
  rendre(verdicts.find((v) => v.niveau === "refus") ?? verdicts[0]);
}

const filePath = String(
  toolInput.file_path || toolInput.path || toolInput.notebook_path || ""
);
if (!filePath) process.exit(0);
rendre(juger(filePath, toolInput));
