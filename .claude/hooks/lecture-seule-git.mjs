#!/usr/bin/env node
// Garde des agents en lecture seule (`wn-reviewer`, `wn-fable`, et la surcharge
// `Explore` quand elle existe) : refuse toute commande Git qui modifierait HEAD,
// l'index, l'arbre de travail, les branches ou le dépôt distant — et toute
// commande `gh` qui ferait l'un de ces gestes, localement ou sur GitHub.
//
// Pourquoi un hook et pas une consigne : un agent de revue a déjà fait un
// `git checkout` dans la copie principale PARTAGÉE — la session qui l'avait
// lancé a ensuite édité la mauvaise branche. « Ne modifie rien » était écrit
// dans son prompt. Une règle oubliée une fois devient exécutable.
//
// Armé depuis le frontmatter `hooks:` des agents concernés, jamais depuis
// `.claude/settings.json` : la session principale, elle, a le droit de committer.
//
// Portée d'inspection : la commande BRUTE, littéraux compris, comme le niveau
// refus de `block-risky-commands.mjs` — `bash -c "git checkout main"` et même
// `echo "git checkout"` sont refusés : faux positif assumé, une reformulation
// coûte moins qu'une copie partagée déplacée.
//
// Sortie : exit 2 (l'outil est bloqué, le message revient à l'agent) ; exit 0
// sinon. Aucune dérogation par variable d'environnement.
import fs from "node:fs";

let data = {};
try {
  data = JSON.parse(fs.readFileSync(0, "utf8"));
} catch {
  process.exit(0);
}

const commande = String(data.tool_input?.command || "");
if (!commande.trim()) process.exit(0);

// Sous-commandes qui écrivent, quels que soient leurs arguments.
const toujoursMutantes = new Set([
  "checkout", "switch", "restore", "reset", "clean", "commit", "merge",
  "rebase", "pull", "push", "cherry-pick", "revert", "am", "rm", "mv", "add",
  "update-ref", "update-index", "gc", "prune", "init", "clone", "bisect",
  "symbolic-ref", "read-tree", "checkout-index", "sparse-checkout", "replace",
  "filter-branch", "filter-repo",
]);

// Drapeaux qui, sur `git branch`, créent, déplacent ou suppriment.
const brancheMutante =
  /(^|\s)(-[dDmMcCfut]\b|--(delete|move|copy|force|track|no-track|set-upstream-to|set-upstream|unset-upstream|edit-description|create-reflog)\b)/;
// Premier argument d'un `git branch` qui ne fait que lister.
const brancheLecture =
  /^(-a|-r|-l|-vv?|-i|--all|--remotes|--list|--show-current|--contains|--no-contains|--merged|--no-merged|--points-at|--sort|--format|--column|--no-column|--color|--no-color|--abbrev|--no-abbrev|--ignore-case|--omit-empty)\b/;

// Sous-commandes dont seule une forme est en lecture.
function mutanteSelonArgs(sous, args) {
  const a = args.trim();
  if (/(^|\s)--output(=|\s)/.test(a)) return true; // écrit un fichier (diff, log…)
  switch (sous) {
    case "stash":
      return !/^(list|show)\b/.test(a);
    case "worktree":
      return !/^list\b/.test(a);
    case "branch":
      return brancheMutante.test(a) || (a !== "" && !brancheLecture.test(a));
    case "tag":
      return a !== "" && !/^(-l\b|--list\b|-n\d*\b|--contains\b|--points-at\b|--merged\b|--no-merged\b|--sort\b)/.test(a);
    case "config": {
      if (/(^|\s)(--add|--unset\S*|--replace-all|--rename-section|--remove-section|--edit|-e)\b/.test(a)) return true;
      if (/(^|\s)(--get\S*|--list|-l|get|list)\b/.test(a)) return false;
      const positionnels = a.split(/\s+/).filter((t) => t && !t.startsWith("-"));
      return positionnels.length !== 1;
    }
    case "apply":
      return !/(^|\s)(--check|--stat|--numstat|--summary)\b/.test(a);
    case "fetch":
      // Une refspec à destination locale (`main:main`, `+HEAD:refs/heads/x`)
      // écrit une branche ; une URL (`https://…`) n'en est pas une.
      return /(^|\s)\+?(?![\w.+-]+:\/\/)[^\s:-][^\s:]*:\S+/.test(a) || /(^|\s)\+\S/.test(a);
    case "reflog":
      return /^(expire|delete)\b/.test(a);
    case "lfs":
      return !/^(ls-files|status|env|version|logs)\b/.test(a);
    case "remote":
      return /^(add|remove|rm|rename|set-url|set-head|set-branches|prune|update)\b/.test(a);
    case "submodule":
      return /^(update|add|deinit|sync|init|absorbgitdirs|foreach)\b/.test(a);
    case "notes":
      return /^(add|append|copy|edit|merge|remove|prune)\b/.test(a);
    default:
      return false;
  }
}

// `git` en position de commande — y compris après un guillemet (`bash -c "git …"`),
// un chemin (`/usr/bin/git`), un antislash (`\git`) — options globales comprises
// (`-C "chemin avec espace"`, `-c k=v`, `--git-dir x`, `--exec-path=…`).
const invocation =
  /(?:^|[\s;&|(){}`$!"'\\/])git(?:\.exe)?((?:\s+(?:-C\s+(?:"[^"]*"|'[^']*'|\S+)|-c\s+\S+|--(?:git-dir|work-tree|namespace)\s+\S+|--[a-z][a-z-]*(?:=\S+)?|-[pP]))*)\s+([a-z][a-z-]*)([^;&|\n]*)/g;

// `gh` qui déplace la copie locale (`pr checkout`, `pr merge`, `repo sync`) ou
// écrit sur GitHub (revue, merge, commentaire, relance…). La revue et le merge
// appartiennent à Copilot ; l'agent rend un verdict, il ne l'applique pas.
const ghMutant =
  /(?:^|[\s;&|(){}`$!"'\\/])gh\s+(?:pr\s+(?:checkout|co|merge|close|reopen|review|ready|edit|comment|create|lock|unlock)|repo\s+(?:sync|edit|delete|rename|archive|fork|clone|set-default)|issue\s+(?:create|close|reopen|comment|edit|delete|lock|unlock|transfer)|release\s+(?:create|delete|edit|upload)|workflow\s+(?:run|enable|disable)|run\s+(?:rerun|cancel|delete)|label\s+(?:create|edit|delete)|api\b[^\n]*(?:-X|--method)\s*(?:POST|PUT|PATCH|DELETE))\b/i;

function refuser(geste) {
  console.error(
    `Agent en lecture seule : \`${geste}\` modifierait la copie que d'autres sessions ` +
    `partagent, ou le dépôt distant. Lire par \`git diff origin/main...HEAD\`, ` +
    `\`git diff\`, \`git show\`, \`git log\`, \`gh pr diff\` — jamais checkout, switch, ` +
    `reset, stash, commit ni merge. Si la revue exige une autre branche, le dire dans le rendu.`
  );
  process.exit(2);
}

const gh = ghMutant.exec(commande);
if (gh) refuser(gh[0].trim().replace(/^["'\\/(]+/, ""));

for (const m of commande.matchAll(invocation)) {
  const sous = m[2];
  const args = m[3] || "";
  if (toujoursMutantes.has(sous) || mutanteSelonArgs(sous, args)) refuser(`git ${sous}`);
}

process.exit(0);
