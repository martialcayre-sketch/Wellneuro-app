#!/usr/bin/env node
// Garde-fou des serveurs MCP Prisma (plugin `prisma` : Prisma-Local,
// Prisma-Remote).
//
// Pourquoi ce hook existe : `block-risky-commands.mjs` demande confirmation
// pour `prisma migrate` tapé dans Bash, mais un outil MCP ne passe pas par
// Bash. Le plugin Prisma expose `migrate-dev` (crée ET applique une migration)
// et `Prisma-Studio` (édite la base en direct) : sans ce hook, la règle « pas
// de migration Prisma ni d'écriture en base hors migration relue puis
// release-db approuvée » (`D-087`) se contournait par un appel MCP.
//
// Liste blanche, pas liste noire : un outil MCP Prisma que ce hook ne connaît
// pas est refusé. Seule la lecture de l'état des migrations passe sans
// interruption.
import fs from "node:fs";

let data = {};
try {
  data = JSON.parse(fs.readFileSync(0, "utf8"));
} catch {
  data = {};
}

const outil = String(data.tool_name || "");
const nomCourt = outil.split("__").pop() || "";

const LECTURES = new Set(["migrate-status"]);

const decision = (permissionDecision, permissionDecisionReason) => {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision,
      permissionDecisionReason
    }
  }));
  process.exit(0);
};

if (LECTURES.has(nomCourt)) {
  decision(
    "allow",
    "Lecture de l'état des migrations Prisma : autorisée sans interruption."
  );
}

decision(
  "deny",
  `Outil MCP Prisma refusé (« ${nomCourt || "inconnu"} »). Une migration se ` +
  "crée par `prisma migrate dev --create-only` sur une base locale, sur " +
  "demande explicite, puis se relit en PR et s'applique par release-db " +
  "approuvée (D-087) ; la base ne s'édite jamais en direct."
);
