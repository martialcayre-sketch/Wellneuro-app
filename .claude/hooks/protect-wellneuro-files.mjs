#!/usr/bin/env node
// Garde-fou d'écriture de fichiers. Deux niveaux, pas un mur unique :
//
//   REFUS   — secrets et répertoires d'infrastructure. Rien de légitime ne
//             s'écrit là depuis une session ; le blocage reste dur (exit 2).
//   DEMANDE — schéma et migrations. La règle CLAUDE.md exige une « confirmation
//             explicite dans la conversation » : c'est exactement une décision
//             d'autorisation. La rendre ici, plutôt que d'exiger une variable
//             d'environnement, garde la confirmation DANS la session (et donc
//             tracée) au lieu de la reléguer à un rituel hors extension.
//
// Il n'y a volontairement PLUS d'échappatoire par variable d'environnement.
// `WN_ALLOW_PROTECTED_WRITE=1` désactivait ce hook pour la SESSION ENTIÈRE, pas
// pour la migration qui l'avait motivée : une session ouverte le matin pour un
// gate restait sans filet tout le reste de la journée (constaté le 2026-07-20).
// Le niveau DEMANDE rend l'échappatoire inutile ; le niveau REFUS ne doit pas
// en avoir.
import fs from "node:fs";

let data = {};
try {
  data = JSON.parse(fs.readFileSync(0, "utf8"));
} catch {
  process.exit(0);
}

const toolInput = data.tool_input || {};
const filePath = String(
  toolInput.file_path || toolInput.path || toolInput.notebook_path || ""
);
if (!filePath) process.exit(0);

const normalized = filePath.replaceAll("\\", "/").toLowerCase();

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

// Niveau DEMANDE : écriture possible, sur autorisation explicite.
const demande = [
  "prisma/schema.prisma",
  "prisma/migrations/",
  "supabase/migrations/"
];

for (const motif of refus) {
  if (normalized.includes(motif)) {
    console.error(
      `Action bloquée par WellNeuro : modification protégée de ${filePath}. ` +
      `Règle : ${motif}. Secrets et répertoires d'infrastructure ne s'écrivent ` +
      `pas depuis une session — aucune dérogation.`
    );
    process.exit(2);
  }
}

for (const motif of demande) {
  if (normalized.includes(motif)) {
    process.stdout.write(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "ask",
        permissionDecisionReason:
          `Écriture de schéma ou de migration Prisma (${motif}). ` +
          `Le SQL committé sera appliqué à la base de production Supabase au ` +
          `prochain build Vercel de main (web/scripts/vercel-build.sh, ` +
          `prisma migrate deploy). Une migration doit rester additive : ` +
          `colonnes nullables, ni DROP ni renommage.`
      }
    }));
    process.exit(0);
  }
}

process.exit(0);
