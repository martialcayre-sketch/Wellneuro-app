// Cibles d'écriture d'une commande Bash — module PUR (aucune lecture disque
// hors l'expansion d'un motif glob), consommé par `protect-wellneuro-files.mjs`.
//
// Le crochet d'écriture ne voyait que Edit/Write : `sed -i` ou `cat > f <<EOF`
// sur un fichier clinique passaient sans un mot (t18, constat du 2026-10-22).
// Ce module lit dans une commande ce qu'elle ÉCRIT, pour que le crochet rende
// le même verdict que par Edit/Write. Deux familles, arbitrées le 2026-10-22 :
//
//   ÉCRITURES — formes reconnues, cible certaine : redirections (`>`, `>>`,
//               `>|`, `&>`, `&>>`, `<>`, `>&fichier`), `tee`, `sed -i`,
//               `perl -i`/`ruby -i`, `cp`/`mv`/`install`/`ln`/`rsync`/`ditto`
//               (destination), `truncate`, `dd of=`, `git checkout -- f`,
//               `git restore f`. Le verdict est celui d'Edit/Write.
//   MENTIONS  — un interpréteur (python, node, perl, ruby, un shell…) dont la
//               commande CITE un chemin : il peut l'écrire sans qu'aucune
//               analyse le voie (`python3 -c "open('f','w')"`). Le crochet
//               les juge au plus « demande », jamais « refus ».
//
// Hors périmètre, en silence ASSUMÉ (documenté dans hooks-garde-fous.md) : un
// script opaque (`npm run x`, `python script.py` qui ne cite pas la cible), un
// chemin porté par une variable autre que HOME/CLAUDE_PROJECT_DIR, `xargs`,
// `find -exec`, `git apply`/`patch`, les opérations Git sur l'arbre entier
// (changement de branche, merge, pull, stash, `checkout -- dossier/`), une
// suppression (`rm`, source d'un `mv`) — Edit/Write ne suppriment rien, et
// `rm -rf web/.next` doit rester libre.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const SEPARATEURS = new Set(["|", "||", "|&", "&&", "&", ";", ";;", "\n", "(", ")", "`"]);
// Séparateurs qui CLOSENT une commande de liste ; `|` et les parenthèses la
// prolongent (le contenu d'un `printf … | tee f` est celui de son tube).
const FIN_DE_LISTE = new Set(["||", "&&", "&", ";", ";;", "\n"]);
const REDIR_ECRITURE = new Set([">", ">>", ">|", "&>", "&>>", "<>"]);

const INTERPRETES = new Set([
  "node", "nodejs", "deno", "bun", "tsx", "ts-node", "perl", "ruby", "php",
  "osascript", "bash", "sh", "zsh", "ksh", "dash", "fish", "eval", "source", "."
]);
// awk n'écrit que par `print > "f"`, `system()` ou `-i inplace` : sans l'un
// d'eux, c'est une lecture, et la plus courante des lectures de fichier.
const AWK = new Set(["awk", "gawk", "mawk", "nawk"]);
function estInterprete(cmd, args) {
  if (AWK.has(cmd)) return args.some((a) => /[>|]|system|inplace/.test(a));
  return INTERPRETES.has(cmd) || /^python[\d.]*$/.test(cmd);
}

/** Indice juste après la `))` qui ferme une arithmétique ouverte en `i`. */
function finArithmetique(s, i) {
  let profondeur = 0;
  for (let j = i; j < s.length; j++) {
    if (s[j] === "(") profondeur++;
    else if (s[j] === ")" && --profondeur === 0) return j + 1;
  }
  return s.length;
}

/**
 * Découpe lexicale façon shell : mots (guillemets retirés), séparateurs,
 * redirections ; les corps de heredoc sont extraits à part, jamais lus comme
 * des commandes.
 */
export function lexer(commande) {
  const s = String(commande);
  const jetons = [];
  const corps = [];
  const heredocsEnAttente = [];
  const sousCommandes = [];
  let mot = null;
  const finirMot = () => {
    if (mot !== null) jetons.push({ t: "mot", v: mot });
    mot = null;
    for (const v of sousCommandes.splice(0)) jetons.push({ t: "sous", v });
  };
  const pousserOp = (v) => {
    finirMot();
    jetons.push({ t: SEPARATEURS.has(v) ? "sep" : "redir", v });
  };
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === "\\") {
      if (s[i + 1] === "\n") { i += 2; continue; }
      mot = (mot ?? "") + (s[i + 1] ?? "");
      i += 2;
      continue;
    }
    if (c === "'") {
      const fin = s.indexOf("'", i + 1);
      const j = fin === -1 ? s.length : fin;
      mot = (mot ?? "") + s.slice(i + 1, j);
      i = j + 1;
      continue;
    }
    if (c === "$" && s[i + 1] === "'") {
      let j = i + 2;
      let v = "";
      while (j < s.length && s[j] !== "'") {
        if (s[j] === "\\") { v += s[j + 1] ?? ""; j += 2; } else v += s[j++];
      }
      mot = (mot ?? "") + v;
      i = j + 1;
      continue;
    }
    if (c === '"') {
      // Entre guillemets doubles, `$(…)` et `` `…` `` s'EXÉCUTENT : leur
      // texte est rendu à part (jeton `sous`), analysé comme une commande
      // (revue CodeRabbit #1643). `$((…))` reste de l'arithmétique.
      let j = i + 1;
      let v = "";
      while (j < s.length && s[j] !== '"') {
        if (s[j] === "\\" && /["\\$`\n]/.test(s[j + 1] ?? "")) { v += s[j + 1]; j += 2; continue; }
        if (s[j] === "$" && s[j + 1] === "(" && s[j + 2] !== "(") {
          const fin = finArithmetique(s, j + 1);
          sousCommandes.push(s.slice(j + 2, fin - 1));
          v += s.slice(j, fin);
          j = fin;
          continue;
        }
        if (s[j] === "`") {
          let fin = j + 1;
          while (fin < s.length && s[fin] !== "`") fin += s[fin] === "\\" ? 2 : 1;
          sousCommandes.push(s.slice(j + 1, fin));
          v += s.slice(j, fin + 1);
          j = fin + 1;
          continue;
        }
        v += s[j++];
      }
      mot = (mot ?? "") + v;
      i = j + 1;
      continue;
    }
    if (c === "#" && mot === null) {
      while (i < s.length && s[i] !== "\n") i++;
      continue;
    }
    if (c === "\n") {
      pousserOp("\n");
      i++;
      // Corps des heredocs ouverts sur la ligne qui s'achève.
      while (heredocsEnAttente.length) {
        const { delim, tabs } = heredocsEnAttente.shift();
        const lignes = [];
        while (i < s.length) {
          let fin = s.indexOf("\n", i);
          if (fin === -1) fin = s.length;
          const ligne = s.slice(i, fin);
          i = fin + 1;
          if ((tabs ? ligne.replace(/^\t+/, "") : ligne).trim() === delim) break;
          lignes.push(ligne);
        }
        corps.push(lignes.join("\n"));
      }
      continue;
    }
    if (c === " " || c === "\t") { finirMot(); i++; continue; }
    // Arithmétique `$((…))` ou `((…))` : un mot opaque. Son `<<` est un
    // décalage, pas un heredoc — le lire comme tel avalerait la suite de la
    // commande dans un corps jamais analysé (revue du 2026-10-22).
    if ((c === "$" && s[i + 1] === "(" && s[i + 2] === "(") || (c === "(" && s[i + 1] === "(" && mot === null)) {
      const debut = c === "$" ? i + 1 : i;
      const fin = finArithmetique(s, debut);
      mot = (mot ?? "") + s.slice(i, fin);
      i = fin;
      continue;
    }
    if (c === "$" && s[i + 1] === "(") { pousserOp("("); i += 2; continue; }
    if (c === "<" && s[i + 1] === "<" && s[i + 2] !== "<") {
      // Heredoc : l'opérateur, puis son délimiteur (guillemets retirés).
      finirMot();
      let j = i + 2;
      const tabs = s[j] === "-";
      if (tabs) j++;
      while (s[j] === " " || s[j] === "\t") j++;
      const m = /^(['"]?)([^\s'";|&<>()]+)\1/.exec(s.slice(j));
      if (m) {
        heredocsEnAttente.push({ delim: m[2], tabs });
        jetons.push({ t: "redir", v: "<<", corps: corps.length + heredocsEnAttente.length - 1 });
        j += m[0].length;
      }
      i = j;
      continue;
    }
    if (c === ">" || c === "<" || c === "|" || c === "&" || c === ";" || c === "(" || c === ")" || c === "`") {
      // Un mot fait de chiffres collé à `>`/`<` est un descripteur (`2>`).
      if ((c === ">" || c === "<") && mot !== null && /^\d+$/.test(mot)) mot = null;
      const trois = s.slice(i, i + 3);
      const deux = s.slice(i, i + 2);
      const op = ["&>>", "<<<"].includes(trois) ? trois
        : [">>", ">|", ">&", "&>", "<>", "<&", "||", "|&", "&&", ";;"].includes(deux) ? deux
        : c;
      pousserOp(op);
      i += op.length;
      continue;
    }
    mot = (mot ?? "") + c;
    i++;
  }
  finirMot();
  return { jetons, corps };
}

/**
 * Commandes simples : `{ argv, cibles, liste, profondeur, corps }`. `liste`
 * numérote la commande de liste (tube compris), `profondeur` le sous-shell,
 * `corps` les heredocs qu'elle ouvre. Un `{ fermeture }` marque la sortie
 * d'un sous-shell, où un `cd` cesse de valoir.
 */
export function segments(jetons) {
  const out = [];
  let liste = 0;
  let profondeur = 0;
  const neuf = () => ({ argv: [], cibles: [], liste, profondeur, corps: [], sous: [] });
  let courant = neuf();
  const clore = () => {
    if (courant.argv.length || courant.cibles.length || courant.corps.length || courant.sous.length) {
      out.push(courant);
    }
  };
  for (let k = 0; k < jetons.length; k++) {
    const j = jetons[k];
    if (j.t === "sous") {
      courant.sous.push(j.v);
      continue;
    }
    if (j.t === "sep") {
      clore();
      if (FIN_DE_LISTE.has(j.v)) liste++;
      if (j.v === "(") profondeur++;
      if (j.v === ")" && profondeur > 0) {
        out.push({ fermeture: true, profondeur });
        profondeur--;
      }
      courant = neuf();
      continue;
    }
    if (j.t === "redir") {
      // `<<` : le délimiteur est déjà consommé par le lexer.
      if (j.v === "<<") {
        if (j.corps !== undefined) courant.corps.push(j.corps);
        continue;
      }
      const suivant = jetons[k + 1];
      if (suivant?.t !== "mot") continue;
      k++;
      if (REDIR_ECRITURE.has(j.v)) courant.cibles.push(suivant.v);
      // `>&2` duplique un descripteur ; `>&fichier` écrit dans un fichier.
      else if (j.v === ">&" && !/^(\d+|-)$/.test(suivant.v)) courant.cibles.push(suivant.v);
      continue;
    }
    courant.argv.push(j.v);
  }
  clore();
  return out;
}

const sansOptions = (args) => args.filter((a) => !a.startsWith("-") || a === "-");

/** Retire affectations et enveloppes de tête (`sudo`, `env`, `npx`…). */
function commandeEffective(argv) {
  const a = [...argv];
  for (;;) {
    while (a.length && /^[A-Za-z_][A-Za-z0-9_]*=/.test(a[0])) a.shift();
    const cmd = a[0];
    if (["sudo", "command", "builtin", "nohup", "time", "exec", "nice", "stdbuf", "env"].includes(cmd)) {
      a.shift();
      while (a.length && (a[0].startsWith("-") || (cmd === "env" && /^[A-Za-z_]\w*=/.test(a[0])))) {
        const opt = a.shift();
        if ((cmd === "nice" && opt === "-n") || ((cmd === "env" || cmd === "sudo") && opt === "-u")) a.shift();
      }
      continue;
    }
    if (cmd === "timeout") {
      a.shift();
      while (a.length && a[0].startsWith("-")) {
        const opt = a.shift();
        if (["-s", "-k", "--signal", "--kill-after"].includes(opt)) a.shift();
      }
      a.shift();
      continue;
    }
    if (cmd === "npx" || (cmd === "npm" && a[1] === "exec")) {
      a.splice(0, cmd === "npm" ? 2 : 1);
      while (a.length && a[0].startsWith("-")) {
        const opt = a.shift();
        if (opt === "-p" || opt === "--package") a.shift();
      }
      if (a[0] === "--") a.shift();
      continue;
    }
    return a;
  }
}

/**
 * Lit une grappe d'options courtes (`-pi`, `-Ei`, `-MFile::Spec`) :
 * `{ enPlace, script }`. Une lettre de `avecArgument` consomme le reste de
 * la grappe — le `i` de `-MFile` n'est pas une option.
 */
function grappe(option, avecArgument, lettresScript) {
  let enPlace = false;
  let script = false;
  for (const lettre of option.slice(1)) {
    if (lettre === "i") { enPlace = true; break; }
    if (lettresScript.includes(lettre)) { script = true; break; }
    if (avecArgument.includes(lettre)) break;
  }
  return { enPlace, script };
}

/** Fichiers d'une commande « en place » (sed -i, perl -i, ruby -i). */
function ciblesEnPlace(args, avecArgument, lettresScript) {
  const libres = [];
  let enPlace = false;
  let scriptVu = false;
  for (let k = 0; k < args.length; k++) {
    const a = args[k];
    if (a === "--") { libres.push(...args.slice(k + 1)); break; }
    if (a === "--in-place" || a.startsWith("--in-place=")) { enPlace = true; continue; }
    if (/^--(expression|file)=/.test(a)) { scriptVu = true; continue; }
    if (a === "--expression" || a === "--file") { scriptVu = true; k++; continue; }
    if (a.startsWith("--")) continue;
    if (a.startsWith("-") && a !== "-") {
      const g = grappe(a, avecArgument, lettresScript);
      enPlace ||= g.enPlace;
      // `-e script` : le script est l'argument suivant, sauf s'il est collé.
      if (g.script) {
        scriptVu = true;
        if (lettresScript.includes(a.at(-1))) k++;
      }
      continue;
    }
    libres.push(a);
  }
  if (!enPlace) return [];
  // `sed -i '' …` (BSD) : le suffixe vide n'est ni script ni fichier. Sans
  // `-e`/`-f`, le premier argument libre est le script.
  const fichiers = libres.filter((a) => a !== "");
  return scriptVu ? fichiers : fichiers.slice(1);
}

/** `git checkout … -- f` et `git restore f` réécrivent l'arbre de travail. */
function ecrituresGit(args) {
  let k = 0;
  let base = null;
  while (k < args.length && args[k].startsWith("-")) {
    if (args[k] === "-C") base = path.join(base ?? "", args[k + 1] ?? "");
    if (args[k] === "-C" || args[k] === "-c") k++;
    k++;
  }
  const sous = args[k];
  const reste = args.slice(k + 1);
  const relatif = (fichiers) => (base ? fichiers.map((f) => path.join(base, f)) : fichiers);
  if (sous === "checkout") {
    const tiret = reste.indexOf("--");
    return tiret === -1 ? [] : relatif(reste.slice(tiret + 1));
  }
  if (sous === "restore") {
    const indexSeul = reste.some((a) => a === "--staged" || a === "-S")
      && !reste.some((a) => a === "--worktree" || a === "-W");
    if (indexSeul) return [];
    const fichiers = [];
    for (let i = 0; i < reste.length; i++) {
      const a = reste[i];
      if (a === "-s" || a === "--source") { i++; continue; }
      if (a === "--") { fichiers.push(...reste.slice(i + 1)); break; }
      if (!a.startsWith("-")) fichiers.push(a);
    }
    return relatif(fichiers);
  }
  return [];
}

// Options SÉPARÉES de leur argument (`-e ssh`, `--exclude '*.log'`) : sans
// elles, l'argument passerait pour une source ou la destination.
const OPTIONS_A_ARGUMENT = {
  cp: ["-S", "--suffix"],
  mv: ["-S", "--suffix"],
  ln: ["-S", "--suffix"],
  install: ["-m", "-g", "-o", "-S", "--mode", "--group", "--owner", "--suffix"],
  rsync: [
    "-e", "-f", "-T", "--rsh", "--exclude", "--include", "--filter",
    "--exclude-from", "--include-from", "--files-from", "--backup-dir",
    "--suffix", "--chmod", "--chown", "--temp-dir", "--compare-dest",
    "--copy-dest", "--link-dest", "--log-file", "--password-file",
    "--rsync-path", "--partial-dir", "--max-size", "--min-size", "--bwlimit",
    "--timeout", "--port"
  ],
  ditto: []
};

/** Écritures certaines d'un argv, redirections mises à part. */
function ecrituresArgv(argv) {
  const cmd = path.basename(argv[0] ?? "");
  const args = argv.slice(1);
  switch (cmd) {
    case "tee":
      return sansOptions(args).filter((a) => a !== "-");
    case "sed":
    case "gsed":
      return ciblesEnPlace(args, "l", "ef");
    case "perl":
    case "ruby":
      return ciblesEnPlace(args, "MmIrxdDCl0FK", "eE");
    case "cp":
    case "mv":
    case "install":
    case "ln":
    case "rsync":
    case "ditto": {
      let dossierCible = null;
      const libres = [];
      for (let k = 0; k < args.length; k++) {
        const a = args[k];
        if (a === "-t" || a === "--target-directory") { dossierCible = args[++k]; continue; }
        if (a.startsWith("--target-directory=")) { dossierCible = a.slice(a.indexOf("=") + 1); continue; }
        if (OPTIONS_A_ARGUMENT[cmd].includes(a)) { k++; continue; }
        if (a.startsWith("-") && a !== "-") continue;
        libres.push(a);
      }
      if (!dossierCible && libres.length < 2) return [];
      const sources = dossierCible ? libres : libres.slice(0, -1);
      const destination = dossierCible ?? libres.at(-1);
      // Destination fichier OU dossier : les deux lectures sont jugées.
      return [destination, ...sources.map((src) => path.join(destination, path.basename(src)))];
    }
    case "truncate": {
      const out = [];
      for (let k = 0; k < args.length; k++) {
        if (["-s", "-r", "--size", "--reference"].includes(args[k])) { k++; continue; }
        if (!args[k].startsWith("-")) out.push(args[k]);
      }
      return out;
    }
    case "dd":
      return args.filter((a) => a.startsWith("of=")).map((a) => a.slice(3));
    case "git":
      return ecrituresGit(args);
    default:
      return [];
  }
}

/** Chemin absolu ; `~`, HOME et CLAUDE_PROJECT_DIR résolus, rien d'autre. */
function resoudre(brut, cwd) {
  const projet = process.env.CLAUDE_PROJECT_DIR || cwd;
  const v = String(brut)
    .replace(/^~(?=\/|$)/, os.homedir())
    .replace(/\$\{?HOME\}?(?!\w)/g, os.homedir())
    .replace(/\$\{?CLAUDE_PROJECT_DIR\}?(?!\w)/g, projet);
  return path.resolve(cwd, v);
}

/**
 * Expansion d'accolades (`f.ts{,.bak}`, `{a,b}/x`). La borne porte sur les
 * formes produites ET en attente (revue CodeRabbit #1643) : sinon des
 * accolades imbriquées gonflent la file sans fin avant le premier résultat.
 * Au-delà, les formes restantes sont gardées telles quelles.
 */
const LIMITE_FORMES = 64;
function accolades(mot) {
  const formes = [mot];
  const out = [];
  while (formes.length) {
    if (out.length + formes.length > LIMITE_FORMES) return [...out, ...formes];
    const f = formes.shift();
    let ouverture = -1;
    let profondeur = 0;
    let virgule = false;
    let trouve = null;
    for (let i = 0; i < f.length && !trouve; i++) {
      if (f[i] === "{" && f[i - 1] !== "$") {
        if (profondeur === 0) { ouverture = i; virgule = false; }
        profondeur++;
      } else if (f[i] === "}" && profondeur > 0) {
        profondeur--;
        if (profondeur === 0 && virgule) trouve = [ouverture, i];
      } else if (f[i] === "," && profondeur === 1) virgule = true;
    }
    if (!trouve) { out.push(f); continue; }
    const [a, b] = trouve;
    const parts = [];
    let p = 0;
    let debut = a + 1;
    for (let i = a + 1; i < b; i++) {
      if (f[i] === "{") p++;
      else if (f[i] === "}") p--;
      else if (f[i] === "," && p === 0) { parts.push(f.slice(debut, i)); debut = i + 1; }
    }
    parts.push(f.slice(debut, b));
    for (const part of parts) formes.push(f.slice(0, a) + part + f.slice(b + 1));
  }
  return out;
}

/** Glob étendu sur disque, motif gardé (`clinical/*.ts`, `clin*\/x.ts`). */
function etendre(absolu) {
  if (!/[*?[]/.test(absolu)) return [absolu];
  // `**` parcourrait l'arbre entier à chaque commande : motif gardé seul.
  if (absolu.includes("**")) return [absolu];
  try {
    if (typeof fs.globSync === "function") return [absolu, ...fs.globSync(absolu)];
  } catch {
    // Motif invalide pour le moteur : repli sur le dernier segment.
  }
  const nom = path.basename(absolu);
  const motif = new RegExp(
    "^" + nom.replace(/[.+^${}()|\\]/g, "\\$&").replace(/\*/g, "[^/]*").replace(/\?/g, "[^/]") + "$"
  );
  try {
    const dossier = path.dirname(absolu);
    return [absolu, ...fs.readdirSync(dossier).filter((f) => motif.test(f)).map((f) => path.join(dossier, f))];
  } catch {
    return [absolu];
  }
}

const formes = (brut, cwd) => accolades(brut).map((f) => resoudre(f, cwd)).flatMap(etendre);

/**
 * Ce qu'une commande Bash écrit et ce que ses interpréteurs citent :
 * `{ ecritures: [{ chemin, contenu }], mentions: [chemin] }`, chemins
 * absolus, accolades et globs étendus. `contenu` est le texte de la commande
 * de liste qui écrit (tube et heredocs compris) — pas la commande entière : un
 * message de commit voisin n'est pas ce que reçoit le fichier.
 */
export function ciblesEcritureBash(commande, cwdInitial) {
  const { jetons, corps } = lexer(commande);
  const segs = segments(jetons);
  const textesDeListe = new Map();
  for (const seg of segs) {
    if (seg.fermeture) continue;
    const texte = [...seg.argv, ...seg.corps.map((n) => corps[n] ?? "")].join(" ");
    textesDeListe.set(seg.liste, (textesDeListe.get(seg.liste) ?? "") + " " + texte);
  }
  // Répertoire courant par niveau de sous-shell : un `cd` dans `( … )` ne
  // survit pas à sa parenthèse.
  const cwds = [cwdInitial];
  const ecritures = new Map();
  const mentions = [];
  const cites = [];
  for (const seg of segs) {
    if (seg.fermeture) {
      cwds.length = Math.min(cwds.length, seg.profondeur);
      continue;
    }
    while (cwds.length < seg.profondeur + 1) cwds.push(cwds.at(-1));
    const cwd = cwds[seg.profondeur];
    const contenu = textesDeListe.get(seg.liste) ?? "";
    const ecrire = (brut) => {
      for (const chemin of formes(brut, cwd)) {
        ecritures.set(chemin, (ecritures.get(chemin) ?? "") + contenu);
      }
    };
    seg.cibles.forEach(ecrire);
    for (const sous of seg.sous) {
      const r = ciblesEcritureBash(sous, cwd);
      for (const { chemin, contenu: c } of r.ecritures) ecritures.set(chemin, (ecritures.get(chemin) ?? "") + c);
      mentions.push(...r.mentions);
    }
    // Les accolades s'étendent en mots distincts, comme le fait le shell.
    const argv = commandeEffective(seg.argv.flatMap(accolades));
    if (!argv.length) continue;
    const cmd = path.basename(argv[0]);
    if (cmd === "cd") {
      // `cd -` ou un chemin à variable : destination inconnue, on reste.
      const dest = sansOptions(argv.slice(1))[0];
      if (!dest) cwds[seg.profondeur] = os.homedir();
      else if (dest !== "-" && !/\$(?!\{?(HOME|CLAUDE_PROJECT_DIR)\b)/.test(dest)) {
        cwds[seg.profondeur] = resoudre(dest, cwd);
      }
      continue;
    }
    ecrituresArgv(argv).forEach(ecrire);
    if (estInterprete(cmd, argv.slice(1))) cites.push({ texte: argv.slice(1).join(" "), cwd });
  }
  if (cites.length) {
    // Un corps de heredoc n'est cité que si un interpréteur peut le lire.
    for (const texte of corps) cites.push({ texte, cwd: cwdInitial });
    for (const { texte, cwd } of cites) {
      for (const [candidat] of texte.matchAll(/[\w.~/@+${},*?-]+/g)) {
        if (candidat.includes("/") || /\.[a-z]+$/i.test(candidat)) mentions.push(...formes(candidat, cwd));
      }
    }
  }
  return {
    ecritures: [...ecritures].map(([chemin, contenu]) => ({ chemin, contenu })),
    mentions: [...new Set(mentions)]
  };
}
