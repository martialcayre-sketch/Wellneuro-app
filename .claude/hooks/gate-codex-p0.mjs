#!/usr/bin/env node
// Garde-fou de rappel : avant `gh pr create` ou `gh pr merge`, si le diff de
// la branche touche une classe P0 de `docs/claude/POLITIQUE_REVUE.md`
// (auth/portail/token, migration, clinique/scoring, garde-fous) et qu'aucune
// trace de passe Codex n'est visible dans les fragments changelog/handoff du
// lot ni dans les messages de commit, DEMANDE une confirmation explicite au
// lieu de laisser l'oubli passer en silence.
//
// Ce n'est PAS un mur de sécurité : la politique de revue est un jugement
// (indépendance utile ou non), pas une propriété vérifiable mécaniquement.
// Le hook ne peut voir ni la conversation ni un Codex lancé hors dépôt par
// l'utilisateur — il ne peut que repérer l'ABSENCE de trace, jamais prouver
// qu'une passe a eu lieu. D'où « ask », jamais « deny » : un faux négatif
// (Codex fait mais non tracé dans un fragment) se lève d'un clic ; un faux
// négatif inverse (Codex oublié) est exactement l'incident du 2026-08-22
// que ce hook existe pour ne plus laisser passer.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const DELAI_GIT_MS = 10_000;

let data = {};
try {
  data = JSON.parse(fs.readFileSync(0, "utf8"));
} catch {
  process.exit(0);
}

if (String(data.tool_name || "") !== "Bash") process.exit(0);

const commande = String(data.tool_input?.command || "");
if (!commande) process.exit(0);

// Ancré en tête de segment (après &&, ||, ;, retour à la ligne) pour éviter
// qu'une occurrence en prose (corps de PR, commentaire) ne déclenche —
// même logique que le masquage de littéraux de `block-risky-commands.mjs`,
// version simplifiée : ici une fausse alerte ne coûte qu'une confirmation.
const segments = commande.split(/(?:&&|\|\||;|\n)/);
const declenche = segments.some((segment) =>
  /^\s*gh\s+pr\s+(create|merge)\b/.test(segment)
);
if (!declenche) process.exit(0);

const cwd = String(data.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd());

function git(args) {
  return spawnSync("git", args, {
    cwd,
    encoding: "utf8",
    timeout: DELAI_GIT_MS,
    killSignal: "SIGKILL",
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
  });
}

if (git(["rev-parse", "--show-toplevel"]).status !== 0) process.exit(0);

let mergeBase = null;
for (const ref of ["origin/main", "main"]) {
  const res = git(["merge-base", "HEAD", ref]);
  if (res.status === 0 && res.stdout.trim()) {
    mergeBase = res.stdout.trim();
    break;
  }
}
// Pas de base de comparaison trouvable : rien à classer, on n'invente pas un
// risque. Fail-open — ce hook est un rappel, pas un verrou de sécurité.
if (!mergeBase) process.exit(0);

const committed = git(["diff", "--name-only", `${mergeBase}...HEAD`]);
const nonCommitte = git(["diff", "--name-only", "HEAD"]);
if (committed.status !== 0 && nonCommitte.status !== 0) process.exit(0);

const fichiers = new Set(
  [committed.stdout, nonCommitte.stdout]
    .filter((sortie) => typeof sortie === "string")
    .flatMap((sortie) => sortie.split("\n"))
    .map((ligne) => ligne.trim())
    .filter(Boolean)
);
if (fichiers.size === 0) process.exit(0);

function normalise(p) {
  return path.posix.normalize(p.replaceAll("\\", "/")).toLowerCase();
}

// Classes P0 de POLITIQUE_REVUE.md § Classification, plus la classe Auth et
// les six tables signées de `protect-wellneuro-files.mjs` (même liste,
// dupliquée à dessein : ce hook lit un diff de commits, l'autre un chemin
// d'édition — les faire dépendre l'un de l'autre casserait au premier
// renommage de fichier sans que rien ne le signale ici).
const motifsP0 = [
  "lib/auth.ts",
  "app/portail/",
  "app/api/portail/",
  "middleware.ts",
  "prisma/schema.prisma",
  "prisma/migrations/",
  "supabase/migrations/",
  "lib/clinical/orientationrulesv1.ts",
  "lib/clinical/stoprulesv1.ts",
  "lib/clinical/priorityrulesv1.ts",
  "lib/clinical/contradictionsv1.ts",
  "lib/clinical/corpussynthesev1.ts",
  "lib/biology-library/indicationsbiologiev1.ts",
  "lib/equilibre/constants.ts",
  "lib/questions.ts",
];

const toucheP0 = [...fichiers].filter((f) => {
  const n = normalise(f);
  return motifsP0.some((motif) => n.includes(motif));
});
if (toucheP0.length === 0) process.exit(0);

// Recherche de trace Codex : fragments changelog/handoff touchés par la
// branche, lus sur le disque (l'état courant du working tree, pas le diff
// texte — plus simple, et suffisant : ces fragments ne sont réécrits par
// personne d'autre une fois posés) ; à défaut, les messages de commit depuis
// la base de comparaison.
const fragmentsPertinents = [...fichiers].filter((f) =>
  /^changelog\.d\/.*\.md$/.test(f) || /^docs\/claude\/handoffs\/.*\.md$/.test(f)
);

let traceCodex = fragmentsPertinents.some((f) => {
  try {
    return /codex/i.test(fs.readFileSync(path.join(cwd, f), "utf8"));
  } catch {
    return false;
  }
});

if (!traceCodex) {
  const messages = git(["log", `${mergeBase}..HEAD`, "--format=%B"]);
  if (messages.status === 0 && /codex/i.test(messages.stdout)) traceCodex = true;
}

if (traceCodex) {
  process.stdout.write(JSON.stringify({
    systemMessage:
      `Diff P0 (${toucheP0.length} fichier(s) : ${toucheP0.slice(0, 3).join(", ")}` +
      `${toucheP0.length > 3 ? ", …" : ""}) — trace Codex trouvée dans les ` +
      `fragments/commits de la branche.`,
  }));
  process.exit(0);
}

process.stdout.write(JSON.stringify({
  hookSpecificOutput: {
    hookEventName: "PreToolUse",
    permissionDecision: "ask",
    permissionDecisionReason:
      `Le diff touche une classe P0 (docs/claude/POLITIQUE_REVUE.md) : ` +
      `${toucheP0.join(", ")}. Pour P0, une passe Codex est OBLIGATOIRE ` +
      `avant PR/merge, et aucune trace n'apparaît dans les fragments ` +
      `changelog.d/handoffs ni dans les messages de commit de la branche. ` +
      `Confirmer que la passe a eu lieu (ou l'a rendue inutile — cas nommé ` +
      `en § Signaux), ou l'interrompre pour préparer le bloc ` +
      `$wellneuro-pr-review avant de continuer.`,
  },
}));
process.exit(0);
