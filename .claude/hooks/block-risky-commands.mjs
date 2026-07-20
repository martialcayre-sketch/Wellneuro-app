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

if (process.env.WN_ALLOW_RISKY_COMMAND === "1") process.exit(0);

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
// Sans cette sortie, `npm run test:worktree` déclencherait le motif « prisma
// migrate » alors qu'il ne touche qu'un PostgreSQL temporaire.
const enveloppesSures = [
  /\bscripts\/wn-test-worktree\.sh\b/,
  /\bscripts\/wn-local-migrate\.sh\b/,
  /\bnpm\s+run\s+test:worktree\b/
];
if (enveloppesSures.some((motif) => motif.test(brute))) process.exit(0);

// Un heredoc ne transporte du CODE que si quelque chose, dans la commande, sait
// l'exécuter. `cat >> docs/claude/SESSION_LOG.md <<'ENTREE'` écrit un texte, et
// ce texte peut citer `rm -rf /` sans rien détruire. Le 2026-07-20 ce hook a
// bloqué deux fois de la prose pour cette raison, dont le journal de session qui
// décrivait le hook lui-même.
//
// Le test est volontairement grossier et conservateur : on ne cherche pas à
// deviner QUI consomme le heredoc — `cat <<EOF | bash` rendrait cette analyse
// fausse — on exige qu'AUCUN vecteur d'exécution n'apparaisse dans la commande
// entière. Sans quoi le corps reste inspecté intégralement, et `bash -c` comme
// `psql <<SQL … DROP TABLE …` restent attrapés.
const vecteursExecution =
  /\b(bash|sh|zsh|ksh|dash|eval|exec|source|xargs|psql|mysql|sqlite3?|python3?|perl|ruby|node|deno|npm|npx|pnpm|yarn|make|docker|kubectl|ssh|awk)\b/;

const heredoc = /<<-?\s*'?"?(\w+)'?"?[\s\S]*?^\s*\1\s*$/gm;
const bruteRefus = vecteursExecution.test(brute)
  ? brute
  : original.replace(heredoc, " <<données-masquées> ").toLowerCase();

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
    motif: /\bprisma\s+(migrate|db\s+push|db\s+execute)\b/,
    raison:
      "Commande Prisma touchant une base. Vérifier sur QUELLE base : la " +
      "production ne doit être migrée que par le build Vercel de main, à " +
      "partir d'une migration relue en PR."
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
      `Après confirmation explicite seulement, utiliser une session dédiée avec ` +
      `WN_ALLOW_RISKY_COMMAND=1.`
    );
    process.exit(2);
  }
}

for (const { motif, raison } of demande) {
  if (motif.test(masquee)) {
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
