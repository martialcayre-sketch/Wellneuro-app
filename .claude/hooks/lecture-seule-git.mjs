#!/usr/bin/env node
// Garde des agents en lecture seule (`wn-reviewer`, `wn-fable`, surcharge
// `Explore`) : refuse toute commande Git qui modifierait HEAD, l'index, l'arbre
// de travail, les branches ou le dépôt distant.
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
// refus de `block-risky-commands.mjs`. `echo "git checkout"` est refusé : faux
// positif assumé — une reformulation coûte moins qu'une copie partagée déplacée.
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
  "rebase", "pull", "push", "cherry-pick", "revert", "am", "apply", "rm",
  "mv", "add", "update-ref", "update-index", "gc", "prune", "init", "clone",
]);

// Sous-commandes dont seule une forme est en lecture.
function mutanteSelonArgs(sous, args) {
  const a = args.trim();
  switch (sous) {
    case "stash":
      return !/^(list|show)\b/.test(a);
    case "worktree":
      return !/^list\b/.test(a);
    case "branch":
      return /(^|\s)(-[dDmMcCf]\b|--(delete|move|copy|force|set-upstream-to|unset-upstream|edit-description)\b)/.test(a);
    case "tag":
      return a !== "" && !/^(-l\b|--list\b|-n\d*\b|--contains\b|--points-at\b|--merged\b|--no-merged\b|--sort\b)/.test(a);
    case "config":
      return !/(^|\s)(--get\S*|--list|-l)\b/.test(a);
    case "remote":
      return /^(add|remove|rm|rename|set-url|set-head|set-branches|prune|update)\b/.test(a);
    case "submodule":
      return /^(update|add|deinit|sync|init|absorbgitdirs)\b/.test(a);
    case "notes":
      return /^(add|append|copy|edit|merge|remove|prune)\b/.test(a);
    default:
      return false;
  }
}

// `git` en position de commande, options globales comprises
// (`git -C chemin checkout`, `git -c k=v switch`, `git --no-pager reset`).
const invocation =
  /(?:^|[\s;&|(){}`$!])git((?:\s+(?:-C\s+\S+|-c\s+\S+|--git-dir(?:=|\s+)\S+|--work-tree(?:=|\s+)\S+|--namespace(?:=|\s+)\S+|--[a-z][a-z-]*|-[pP]))*)\s+([a-z][a-z-]*)([^;&|\n]*)/g;

for (const m of commande.matchAll(invocation)) {
  const sous = m[2];
  const args = m[3] || "";
  if (toujoursMutantes.has(sous) || mutanteSelonArgs(sous, args)) {
    console.error(
      `Agent en lecture seule : \`git ${sous}\` modifierait l'état Git d'une copie ` +
      `que d'autres sessions partagent. Lire par \`git diff origin/main...HEAD\`, ` +
      `\`git diff\`, \`git show\`, \`git log\` — jamais checkout, switch, reset, stash ` +
      `ni commit. Si la revue exige une autre branche, le dire dans le rendu.`
    );
    process.exit(2);
  }
}

process.exit(0);
