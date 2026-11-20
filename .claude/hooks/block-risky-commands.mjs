#!/usr/bin/env node
// Garde-fou des commandes Bash. Deux niveaux, et deux portées d'inspection
// différentes — c'est le cœur de la correction :
//
//   REFUS   — inspecte la commande BRUTE, littéraux compris. Un faux positif
//             coûte une reformulation ; un faux négatif coûte des données.
//             `bash -c "rm -rf /"` doit donc rester attrapé. Seule exception,
//             détaillée plus bas : le corps d'un heredoc dans une commande où
//             rien ne sait exécuter quoi que ce soit est de la donnée.
//   DEMANDE — inspecte la commande dont les littéraux ont été MASQUÉS. Un corps
//             de PR décrivant « prisma migrate deploy » est de la prose entre
//             guillemets, jamais une exécution : c'est précisément le faux
//             positif qui a bloqué un `gh pr create` le 2026-07-20.
import fs from "node:fs";

let data = {};
try {
  data = JSON.parse(fs.readFileSync(0, "utf8"));
} catch {
  process.exit(0);
}

const original = String(data.tool_input?.command || "");
if (!original.trim()) process.exit(0);
const brute = original.toLowerCase();

// Scripts portant leur propre garde-fou interne, plus strict que ce hook :
// base éphémère jetable pour l'un, refus de toute URL non-locale pour l'autre.
// Sans cette dérogation, `npm run test:worktree` déclencherait le motif
// « prisma migrate » alors qu'il ne touche qu'un PostgreSQL temporaire.
//
// DEUX PROPRIÉTÉS, et l'absence de chacune était un trou :
//
// 1. La dérogation ne lève QUE le niveau « demande ». Elle sortait auparavant
//    en `exit(0)` avant tout contrôle, refus compris : il suffisait d'écrire
//    `rm -rf / # npm run test:worktree` pour traverser le garde-fou entier.
//    Rien dans sa raison d'être ne justifiait qu'elle touche au refus.
//
// 2. Elle exige que la commande COMMENCE par l'invocation, un `cd … &&` de tête
//    mis à part. Un motif cherché n'importe où se contrefait avec un
//    commentaire : `npx prisma migrate deploy # npm run test:worktree`
//    silencieusement autorisé, alors que c'est exactement ce que le niveau
//    « demande » existe pour faire relire.
const sansPrefixeCd = brute.replace(/^\s*cd\s+[^\s&;|]+\s*&&\s*/, "");
// `wn-dev-db.sh` construit lui-même l'URL de la base locale de son worktree
// (127.0.0.1) avant `prisma migrate deploy` : c'est la voie locale sans
// demande de D-523 (`wn-local-migrate.sh`, qu'elle citait, est retiré depuis
// le 2026-09-01). Une enveloppe ne vaut que SEULE : chaînée (`&&`, `||`, `;`,
// `|`, retour à la ligne, substitution), la suite serait dispensée avec elle
// (wn-reviewer, 2026-11-14).
const enveloppesSures = [
  /^npm\s+run\s+test:worktree\b/,
  /^(bash\s+)?scripts\/wn-test-worktree\.sh\b/,
  /^(bash\s+)?scripts\/wn-dev-db\.sh\b/
];
const enveloppeSure =
  enveloppesSures.some((motif) => motif.test(sansPrefixeCd)) &&
  // Redirections `2>&1` mises à part, tout `&`, `|`, `;`, retour à la ligne,
  // substitution de commande ou de processus (`$(`, accent grave, `<(`,
  // `>(`) chaîne une autre commande (wn-reviewer, troisième passe).
  !/[&|;\n`]|\$\(|[<>]\(/.test(sansPrefixeCd.replace(/\d*[<>]&\d*-?/g, " "));

// Un heredoc ne transporte du CODE que si quelque chose, dans la commande, sait
// l'exécuter. `cat >> docs/claude/SESSION_LOG.md <<'ENTREE'` écrit un texte, et
// ce texte peut citer `rm -rf /` sans rien détruire. Le 2026-07-20 ce hook a
// bloqué deux fois de la prose pour cette raison, dont le journal de session qui
// décrivait le hook lui-même.
//
// On ne cherche pas à deviner QUI consomme le heredoc — `cat <<EOF | bash`
// rendrait cette analyse fausse. On exige qu'aucun vecteur d'exécution
// n'apparaisse dans la STRUCTURE de la commande : tout, sauf les corps de
// heredoc.
//
// La distinction structure / corps est le cœur du contrôle, et la première
// version de ce correctif ne la faisait pas : elle cherchait les vecteurs dans
// la commande ENTIÈRE, corps compris. Or un corps de PR citant
// `scripts/check_no_secrets.sh` contient `sh`, un journal citant
// `npm run check` contient `npm` — le masquage se désactivait, et la prose
// était de nouveau refusée. Exactement le cas que ce correctif vise.
//
// Seul le corps est masqué : la fin de la ligne d'ouverture est conservée,
// sinon le `| bash` de `cat <<'EOF' | bash` disparaîtrait avec le corps et
// deviendrait indétectable. C'est le cas qui compte le plus.
const vecteursExecution =
  /\b(bash|sh|zsh|ksh|dash|csh|tcsh|fish|eval|exec|source|xargs|psql|mysql|sqlite3?|python3?|perl|ruby|php|lua|rscript|osascript|node|deno|npm|npx|pnpm|yarn|make|go|cargo|java|docker|kubectl|ssh|awk|curl|wget)\b/;

// $1 : `<<DELIM` et la suite de la ligne d'ouverture (pipes, redirections…).
// $2 : le délimiteur, repris en arrière-référence pour trouver la fin du corps.
const corpsHeredoc = /(<<-?\s*'?"?(\w+)'?"?[^\n]*\n)[\s\S]*?^\s*\2\s*$/gm;
const structure = original.replace(corpsHeredoc, "$1 <<corps-masqué> ").toLowerCase();
const bruteRefus = vecteursExecution.test(structure) ? brute : structure;

// Masque le contenu des littéraux et des heredocs : ce qui reste est la
// structure exécutable de la commande.
const masquee = original
  .replace(/<<-?\s*'?"?(\w+)'?"?[\s\S]*?^\s*\1\s*$/gm, " <<contenu-masqué> ")
  .replace(/'[^']*'/g, " '' ")
  .replace(/"[^"]*"/g, ' "" ')
  .toLowerCase();

const refus = [
  /\brm\s+-rf\s+(\/|\*|\.($|\s)|~)/,
  /\bgit\s+reset\s+--hard\b/,
  /\bgit\s+clean\s+-[^\n]*[fdx][^\n]*\b(?!.*\s-n)/,
  /\bgit\s+(checkout|restore)\s+--?\s*\.\s*$/,
  /\b(drop\s+(table|database|schema)|truncate\s+table)\b/,
  /\bdelete\s+from\s+[^;\n]+(?:;|$)/,
  /\b(cat|type|more|get-content)\s+[^\n]*\.env\b/,
  /\bprintenv\b/,
  /\benv\s*\|/,
  /\bset\s*\|\s*(grep|findstr)\b/
];

const demande = [
  {
    // `migrate status` et `migrate diff` n'écrivent dans aucune base : silence
    // ([[D-523]]) — sauf `--from-migrations` (rejoue les migrations dans une
    // base fantôme, comme `--to-migrations`), `-o|--output` (qui écrit un
    // fichier, une migration peut-être), `--shadow…` ou `--config` (qui peut désigner une autre
    // base). Le reste touche une base, et le garde ne sait pas laquelle.
    // `prisma@7`, ou une option avant la sous-commande (`prisma --config x
    // migrate deploy`), ne la masquent pas. Le silence exige un segment que
    // le garde lit en entier : ni guillemet, ni `$`, ni accent grave, ni barre
    // oblique (le shell y assemble `--from-"migrations"` ou cache un
    // `$(: migrate diff)`), et aucun `db` ni `migrate` avant le `migrate
    // status|diff` (`db push --schema=a migrate diff`) — Codex et wn-reviewer,
    // 2026-11-14. La base locale se migre sans demande par
    // `scripts/wn-dev-db.sh --migrate` (enveloppe sûre ci-dessus).
    motif: /\bprisma(?:@\S*)?\s(?!(?:(?!--(?:from-migrations|to-migrations|config|shadow|output)|-o\b|\bdb\b|\bmigrate\b)[^\n;&|#'"$`\\])*?\bmigrate\s+(?:status|diff)\b(?:(?!--(?:from-migrations|to-migrations|config|shadow|output)|-o\b)[^\n;&|#'"$`\\])*(?:[\n;&|#]|$))[^\n;&|#]*?\b(?:migrate|db\s+(?:push|execute))\b/,
    raison:
      "Commande Prisma touchant une base. Vérifier sur QUELLE base : la " +
      "production ne se migre que par release-db, depuis une migration " +
      "mergée et contre-revue (D-520) ; la base locale, par " +
      "scripts/wn-dev-db.sh --migrate, sans demande (D-523)."
  },
  {
    // Prisma dans une substitution (`psql -f <(npx prisma migrate diff …)`,
    // `$(…)`, accent grave) : sa sortie devient l'entrée d'une autre
    // commande, que le garde ne voit pas (wn-reviewer, quatrième passe).
    motif: /(?:<\(|\$\(|`)[^)`]*\bprisma(?:@\S*)?\s(?:[^)`]*\s)?(?:migrate|db)\b/,
    raison:
      "Commande Prisma dans une substitution : sa sortie alimente une autre " +
      "commande, peut-être un client SQL. La production ne s'écrit que par " +
      "release-db (D-520) ; une migration s'écrit par Write (D-523)."
  },
  {
    // Un `migrate diff --script` en silence, versé dans un client SQL ou un
    // interpréteur, écrit dans une base (wn-reviewer, 2026-11-14).
    // Liste blanche de lecteurs : `| env psql`, `| command sh`… demandent
    // (Codex, troisième passe).
    // `sort -o`, `uniq - fichier`, `less -o` écrivent : hors liste.
    // Ancré sur l'appel `prisma … migrate|db`, pas sur le mot : `cat
    // web/prisma/schema.prisma | sed` reste libre (PR-Agent, #2137).
    motif: /\bprisma(?:@\S*)?\s(?:[^\n;&|#]*\s)?(?:migrate|db)\b[^\n;&#]*(?<!\|)\|(?!\|)(?!\s*(?:head|tail|grep|more|cat|wc)\b)/,
    raison:
      "Sortie Prisma versée dans un client SQL ou un interpréteur : elle " +
      "s'exécute sur une base que le garde ne connaît pas. La production ne " +
      "s'écrit que par release-db (D-520) ; une migration s'écrit par Write, " +
      "où son contenu se juge (D-523)."
  },
  {
    motif: /\bsupabase\s+db\s+(push|reset|diff)\b/,
    raison:
      "Commande Supabase touchant une base. Même règle : la production ne se " +
      "migre que par une migration committée et relue."
  },
  {
    motif: /\bgit\s+push\b[^\n]*--force(?:-with-lease)?\b/,
    raison:
      "Push forcé : réécrit l'historique distant. Légitime après un rebase de " +
      "branche de travail, jamais sur main."
  }
];

for (const motif of refus) {
  if (motif.test(bruteRefus)) {
    console.error(
      `Commande bloquée par WellNeuro : ${original}. ` +
      `Elle est destructive ou peut exposer des secrets. ` +
      `Aucune dérogation depuis la session : après confirmation explicite, ` +
      `l'utilisateur la lance lui-même dans son terminal.`
    );
    process.exit(2);
  }
}

// REFUS SUR LA STRUCTURE — pièges d'outillage convertis en contrôles (lot
// `autonomie-frictions`, 2026-11-13). Ils ne détruisent pas de données : un
// faux positif sur de la prose coûterait plus qu'un contournement par
// `bash -c "…"`. Ils lisent donc la commande MASQUÉE, comme la « demande », et
// non la commande brute.
//
// `prisma format` réaligne une centaine de lignes de `schema.prisma` étrangères
// au diff et noie la revue d'une migration (mémoire prisma-format, constaté
// deux fois). `prisma validate` vérifie sans écrire ; `prisma format --check`
// n'écrit rien non plus et reste permis. Une version épinglée
// (`npx prisma@7 format`) est le même geste ; un `--check` placé après un `#`
// est un commentaire du shell, pas une option.
const refusStructure = [
  {
    motif: /\bprisma(?:@\S*)?\s+format\b(?![^\n;&|#]*--check\b)/,
    raison:
      "`prisma format` réaligne une centaine de lignes de schema.prisma " +
      "étrangères au diff. Aligner à la main le bloc touché, puis " +
      "`npx prisma validate` (ou `prisma format --check`, qui n'écrit rien)."
  }
];

for (const { motif, raison } of refusStructure) {
  if (motif.test(masquee)) {
    console.error(`Commande bloquée par WellNeuro : ${raison}`);
    process.exit(2);
  }
}

// MODIFICATEURS ZSH (lot `autonomie-pieges-restes`, partie 2). Le shell de ces
// sessions est zsh : dans `$VAR:r…`, `:r` est un modificateur (« retire
// l'extension »), comme `:h`, `:t`, `:e`, `:a`, `:l`, `:u`, `:q`… `git push
// origin "$NEW:refs/heads/x"` part en `<sha>efs/heads/x` et échoue sans
// nommer le shell (mémoire zsh-modificateur-parametre-git-refspec). Les
// guillemets doubles n'y changent rien : zsh y développe aussi. On masque
// donc seulement ce qui est réellement inerte — chaîne entre apostrophes
// HORS guillemets doubles (« l'ajout » dans un message de commit n'en ouvre
// pas), caractère échappé par `\`, corps d'un heredoc à délimiteur cité
// (`<<'FIN'` ; un `<<FIN` nu développe, il reste lu) — et non la commande
// masquée ci-dessus, qui efface les guillemets doubles. `${VAR}:refs/…`
// passe. Modificateurs retenus, constatés par `zsh -fc` : `:f`, `:F` et `:g`
// ne jouent que devant un autre (`:fe…` de `feat/x`, `:gh…` de
// `gh-pages`) ; `:w` et `:x` ne s'appliquent pas à un paramètre.
//
// Les heredocs se lisent en UN passage, dans l'ordre (partie 3, routés de
// #2184) : tout corps est masqué de la commande, qu'il soit cité ou nu, et
// seul le corps d'un heredoc nu est gardé à part pour être lu brut.
// - Un corps nu laissé dans la commande ouvrait, par l'apostrophe de
//   « l'ajout », une chaîne qui masquait la suite (`git push` compris :
//   faux négatif, PR-Agent).
// - Un `<<EOF` nu DANS le corps d'un heredoc cité est du texte : le passage
//   unique le consomme avec ce corps, sans le relire comme heredoc.
// - Dans un corps nu, `\$` est littéral (constaté par `zsh -f`) : les
//   échappements sont retirés avant la lecture.
// - Lecture LIGNE PAR LIGNE, comme zsh : tous les heredocs ouverts sur une
//   ligne, dans l'ordre (`cat <<'A' <<B`), puis leurs corps à la suite ; une
//   regex qui avalait la fin de la ligne d'ouverture ne voyait que le premier
//   (P2 de wn-reviewer).
// - `<<<` est une chaîne, pas un heredoc. Le terminateur est la ligne EXACTE
//   (tabulations de tête admises sous `<<-` seulement) : `  EOF` ne clôt rien
//   pour zsh, et le clore plus tôt démasquait une apostrophe (P3).
// - Le délimiteur est un MOT shell entier, citations retirées : `<<'FIN-PR'`
//   (Codex), `<<"E"OF` et `<<'E'OF` terminent sur `EOF`, et une citation
//   n'importe où dans le mot rend le corps inerte.
// - Un heredoc CITÉ qui atteint la fin de la commande sans terminateur n'en
//   est pas un pour ce crochet : un `<<'FIN'` cité dans un message de commit
//   ou un commentaire masquait toute la suite (P1 de wn-reviewer). Ses lignes
//   retournent à la structure. Un heredoc NU non terminé reste lu brut.
//   Entre guillemets doubles, `\` n'échappe que `$`, `` ` ``, `"` et `\`
//   (`<<"E\\OF"` termine sur `E\OF`, Codex).
//
// Partie 4 (routés de #2192) : un lecteur CONSCIENT DES CITATIONS, en un seul
// passage sur toute la commande, avec une pile de contextes (code, `$(…)`,
// accent grave, guillemets doubles, apostrophes, `$'…'`, arithmétique).
// - Un `<<` n'ouvre un heredoc qu'en contexte de code — `$(…)` compris, même
//   entre guillemets doubles (`"$(cat <<'EOF' …)"`) — jamais entre guillemets
//   ou apostrophes, dans un commentaire ni dans `$((1<<2))`. Un faux
//   `<<'EOF'` dans un message de commit, suivi plus loin d'une vraie ligne
//   `EOF`, masquait tout ce qui les séparait, `git push` compris (focus area
//   PR-Agent sur #2192, préexistant sur `main`).
// - Une apostrophe n'est inerte qu'en contexte de code. Sous `$(…)`, même
//   entre guillemets doubles, le contexte redevient du code ; dans
//   `"$(printf "l'ajout") $NEW:r"`, l'apostrophe est entre les guillemets
//   internes, donc du texte, et zsh développe `$NEW:r` (constaté par `zsh -f`).
// - Un commentaire (`#` en tête de mot, hors citation) reste lu tel quel : ses
//   apostrophes et ses `<<` sont du texte, rien n'y est masqué.
// - Dans un corps NU, `\` en fin de ligne joint la ligne suivante (constaté
//   par `zsh -f` : `$NEW\` puis `:refs` donne `abc123efs`, et `foo\` puis la
//   ligne terminatrice donne `fooF`, qui ne clôt pas).
const OUVERTURE_HEREDOC = /<<(?!<)(-?)[ \t]*((?:'[^'\n]*'|"(?:\\[^\n]|[^"\\\n])*"|\\[^\n]|[^\s'"\\<>|;&()])+)/y;
function delimiteurSansCitation(mot) {
  return mot.replace(/'([^']*)'|"((?:\\[^\n]|[^"\\\n])*)"|\\(.)/g, (_m, simple, double, echappe) =>
    simple ?? (double !== undefined ? double.replace(/\\([$`"\\])/g, "$1") : echappe),
  );
}
const finEchappee = (l) => (/\\+$/.exec(l)?.[0].length ?? 0) % 2 === 1;
const CONTEXTES_CODE = new Set(["code", "sous", "bq"]);
// Rend la structure, littéraux inertes blanchis (apostrophes en contexte de
// code, `$'…'`, caractères échappés ; corps de heredoc retirés), et à part
// les corps des heredocs nus, échappements retirés.
function lireCommande(commande) {
  const lignes = commande.split("\n");
  const pile = [{ t: "code", p: 0 }];
  const corpsNus = [];
  let structure = "";
  let enAttente = [];
  let i = 0;
  // Début de mot au sens de zsh, tenu au fil des caractères : ni un `\x`
  // échappé, ni le `)` qui ferme `$(…)` ou `$((…))` n'en ouvrent un (P2 de
  // wn-reviewer) ; le `)` d'un sous-shell, si. Une ligne continuée par `\`
  // garde le début de mot de la précédente (`echo x\` puis `#` : mot `x#`,
  // Codex).
  let debut = true;
  let continuee = false;
  while (i < lignes.length) {
    const ligne = lignes[i];
    i += 1;
    let commentaire = false;
    let suite = false;
    if (!continuee) debut = true;
    for (let j = 0; j < ligne.length; j += 1) {
      const c = ligne[j];
      const haut = pile.at(-1);
      if (commentaire) {
        structure += c;
      } else if (haut.t === "sq") {
        if (c === "'") {
          pile.pop();
          debut = false;
        }
        structure += " ";
      } else if (haut.t === "ansi") {
        if (c === "\\") {
          structure += "  ";
          j += 1;
        } else {
          if (c === "'") {
            pile.pop();
            debut = false;
          }
          structure += " ";
        }
      } else if (haut.t === "arith" && !/['"\\`$]/.test(c)) {
        // Citations, échappements et substitutions d'une expression
        // arithmétique se lisent comme ailleurs : leurs parenthèses ne
        // comptent pas (`$(( $(printf '))') ))`, Codex).
        if (c === "(") haut.p += 1;
        else if (c === ")" && haut.p > 0) haut.p -= 1;
        else if (c === ")") {
          pile.pop();
          debut = false;
          if (ligne[j + 1] === ")") {
            structure += ")";
            j += 1;
          }
        }
        structure += c;
      } else if (c === "\\") {
        if (j === ligne.length - 1) suite = true;
        else debut = false;
        structure += "  ";
        j += 1;
      } else if (c === "$" && ligne.startsWith("((", j + 1)) {
        pile.push({ t: "arith", p: 0 });
        structure += "$((";
        j += 2;
      } else if (c === "$" && ligne[j + 1] === "(") {
        pile.push({ t: "sous", p: 0 });
        debut = true;
        structure += "$(";
        j += 1;
      } else if (c === "`") {
        if (haut.t === "bq") pile.pop();
        else pile.push({ t: "bq", p: 0 });
        debut = haut.t !== "bq";
        structure += c;
      } else if (haut.t === "dq") {
        if (c === '"') {
          pile.pop();
          debut = false;
        }
        structure += c;
      } else if (c === "'") {
        pile.push({ t: "sq", p: 0 });
        structure += " ";
      } else if (c === "$" && ligne[j + 1] === "'") {
        pile.push({ t: "ansi", p: 0 });
        structure += "  ";
        j += 1;
      } else if (c === '"') {
        pile.push({ t: "dq", p: 0 });
        structure += c;
      } else if (c === "#" && debut) {
        commentaire = true;
        structure += c;
      } else if (c === "(" && ligne[j + 1] === "(" && debut) {
        pile.push({ t: "arith", p: 0 });
        structure += "((";
        j += 1;
      } else if (c === "(") {
        if (haut.t === "sous") haut.p += 1;
        debut = true;
        structure += c;
      } else if (c === ")") {
        if (haut.t === "sous" && haut.p > 0) haut.p -= 1;
        else if (haut.t === "sous") {
          pile.pop();
          debut = false;
        }
        if (pile.at(-1) === haut) debut = true;
        structure += c;
      } else if (c === "<" && ligne.startsWith("<<<", j)) {
        debut = false;
        structure += "<<<";
        j += 2;
      } else if (c === "<" && ligne[j + 1] === "<") {
        OUVERTURE_HEREDOC.lastIndex = j;
        const m = OUVERTURE_HEREDOC.exec(ligne);
        debut = false;
        if (m) {
          enAttente.push({ tiret: m[1], mot: m[2] });
          // Le délimiteur n'est jamais développé : `<<'$NEW:r'` est inerte (Codex).
          structure += "<<" + " ".repeat(m[0].length - 2);
          j += m[0].length - 1;
        } else structure += c;
      } else {
        debut = /[\s;&|]/.test(c);
        structure += c;
      }
    }
    continuee = suite;
    structure += "\n";
    // Les corps commencent après la première fin de ligne lue en contexte de
    // code, hors continuation par `\`.
    if (!enAttente.length || suite || !CONTEXTES_CODE.has(pile.at(-1).t)) continue;
    let consomme = false;
    for (const { tiret, mot } of enAttente) {
      const cite = /['"\\]/.test(mot);
      const delimiteur = delimiteurSansCitation(mot);
      const depart = i;
      const corps = [];
      let termine = false;
      let jointe = false;
      while (i < lignes.length) {
        const l = lignes[i];
        i += 1;
        if (!jointe && (tiret ? l.replace(/^\t+/, "") : l) === delimiteur) {
          termine = true;
          break;
        }
        corps.push(l);
        jointe = !cite && finEchappee(l);
      }
      if (cite && !termine) {
        i = depart;
        continue;
      }
      consomme = true;
      if (!cite) corpsNus.push(corps.join("\n").replace(/\\(\n|[^\n])/g, (_m, x) => (x === "\n" ? "" : "  ")));
    }
    enAttente = [];
    if (consomme) structure += " <<corps-masqué> \n";
  }
  return { structure, corpsNus: corpsNus.join("\n") };
}
const heredocs = lireCommande(original);
// Le corps d'un heredoc à délimiteur NU est lu brut, à part : ses apostrophes
// sont du texte, que zsh développe (`cat <<FIN\n'$NEW:refs'\nFIN`, Codex).
const MODIFICATEUR_ZSH = /\$(?:[A-Za-z_][A-Za-z0-9_]*|\d):[fFg]?[aAcehlPqQrstu&]/;
if (MODIFICATEUR_ZSH.test(heredocs.structure) || MODIFICATEUR_ZSH.test(heredocs.corpsNus)) {
  console.error(
    "Commande bloquée par WellNeuro : un `$VAR:x` non accolé — zsh lit `:r`, `:h`, `:t`, `:e`… " +
    "comme un modificateur de paramètre (`\"$NEW:refs/heads/x\"` devient `<sha>efs/heads/x`). " +
    "Écrire `${NEW}:refs/heads/x`."
  );
  process.exit(2);
}

// TÂCHE DE FOND QUI FINIT PAR `echo … $?` (lot `autonomie-pieges-restes`,
// partie 6). Le code d'une tâche de fond est celui de sa DERNIÈRE commande :
// avec `…; echo "code=$?"`, c'est celui d'`echo`, donc 0. La notification
// annonce « exit code 0 » sur un échec : une attente de CI a été rapportée
// verte alors qu'elle n'avait jamais tourné (mémoire
// taches-de-fond-demarrent-a-la-racine, 2026-08-24 et 2026-08-27). Redirigé
// vers un journal (`>> f`), l'`echo` ment pareil à la notification. La forme
// sûre garde le code et le rend : `…; c=$?; echo "code=$c" >> f; exit $c`.
// Lu sur la structure (corps de heredoc retirés), en fond seulement : au
// premier plan, la session lit la sortie elle-même.
// Avant le test (relecture adverse) : les redirections (`>&2`, `2>&1`, `&>`)
// sont retirées, leur `&` ne coupe rien ; un `;`, `}` ou `&` final ne change
// pas la dernière commande ; un tube final vers `tee` ou `cat` rend 0 aussi.
// `${?}`, `print` (zsh), `builtin echo` et `command echo` sont la même forme.
const ECHO_CODE_FINAL =
  /(?:^|[;&|\n{(])\s*(?:(?:builtin|command)\s+)?(?:echo|printf|print)\b[^;&|\n]*\$(?:\?|\{\?\})[^;&|\n]*(?:\|\s*(?:tee|cat)\b[^;&|\n]*)?$/;
const finDeStructure = heredocs.structure
  .replace(/\d*[<>]&\d*-?|&>>?/g, " ")
  .replace(/[\s;}&]+$/, "");
if (data.tool_input?.run_in_background === true && ECHO_CODE_FINAL.test(finDeStructure)) {
  console.error(
    "Commande bloquée par WellNeuro : en tâche de fond, le code rendu est celui de la dernière commande. " +
    "Un `echo … $?` final rend 0, et la notification dira « exit code 0 » même sur un échec. " +
    "Écrire `… > journal 2>&1; c=$?; echo \"code=$c\" >> journal; exit $c`, puis lire la dernière ligne du journal."
  );
  process.exit(2);
}

// SONDAGE — n'est plus refusé depuis le 2026-10-24 : le responsable autorise,
// pour toutes les sessions, le contrôle en boucle (CI, revue CodeRabbit,
// déploiement). `wn-attendre-ci.mjs` en tâche de fond reste la forme préférée
// pour un CI — une notification au lieu d'un appel par tour.

// La dérogation n'agit qu'ici : le niveau « refus » ci-dessus s'applique à
// toutes les commandes, sans exception.
// Les redirections (`2>&1`, `>&2`, `&>`, `&>>`) ne chaînent rien : leur `&`
// ne doit pas couper un segment, sinon `… --script 2>&1 | psql` échappe au
// motif du tube (PR-Agent, #2137).
const masqueeSansRedirection = masquee.replace(/\d*[<>]&\d*-?|&>>?/g, " ");
for (const { motif, raison } of enveloppeSure ? [] : demande) {
  if (motif.test(masqueeSansRedirection)) {
    process.stdout.write(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "ask",
        permissionDecisionReason: raison
      }
    }));
    process.exit(0);
  }
}

process.exit(0);
