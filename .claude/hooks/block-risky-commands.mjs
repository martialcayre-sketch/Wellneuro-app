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
function sansLitterauxInertes(commande) {
  const corps = commande.replace(
    // UN seul groupe pour le délimiteur : une référence arrière vers un groupe
    // vide vaut « » en JS, et `(?:\2|\3|\4)` acceptait toute ligne vide
    // comme fin du corps (P1 de wn-reviewer).
    // Un délimiteur n'est pas qu'un mot : `<<'FIN-PR'` (Codex).
    /(<<-?\s*(?:'|"|\\)([^\s'"<>|;&()]+)['"]?[^\n]*\n)[\s\S]*?^\s*\2\s*$/gm,
    "$1 <<corps-masqué> ",
  );
  let sortie = "";
  let guillemets = false;
  for (let i = 0; i < corps.length; i += 1) {
    const c = corps[i];
    if (c === "\\") {
      sortie += "  ";
      i += 1;
    } else if (c === "'" && !guillemets) {
      const fin = corps.indexOf("'", i + 1);
      const j = fin === -1 ? corps.length : fin;
      sortie += " ".repeat(j + 1 - i);
      i = j;
    } else {
      if (c === '"') guillemets = !guillemets;
      sortie += c;
    }
  }
  return sortie;
}
// Le corps d'un heredoc à délimiteur NU est lu brut, à part : ses apostrophes
// sont du texte, que zsh développe (`cat <<FIN\n'$NEW:refs'\nFIN`, Codex).
function corpsDeHeredocsNus(commande) {
  const corps = [];
  const re = /<<-?\s*([^\s'"\\<>|;&()]+)[^\n]*\n([\s\S]*?)^\s*\1\s*$/gm;
  let m;
  while ((m = re.exec(commande))) corps.push(m[2]);
  return corps.join("\n");
}
const MODIFICATEUR_ZSH = /\$(?:[A-Za-z_][A-Za-z0-9_]*|\d):[fFg]?[aAcehlPqQrstu&]/;
if (MODIFICATEUR_ZSH.test(sansLitterauxInertes(original)) || MODIFICATEUR_ZSH.test(corpsDeHeredocsNus(original))) {
  console.error(
    "Commande bloquée par WellNeuro : un `$VAR:x` non accolé — zsh lit `:r`, `:h`, `:t`, `:e`… " +
    "comme un modificateur de paramètre (`\"$NEW:refs/heads/x\"` devient `<sha>efs/heads/x`). " +
    "Écrire `${NEW}:refs/heads/x`."
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
