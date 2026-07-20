#!/usr/bin/env node
// Garde-fou du serveur MCP Supabase (outil `execute_sql`).
//
// Pourquoi ce hook existe : les autres garde-fous du dépôt n'inspectent que
// Bash, Edit et Write. Le serveur MCP Supabase parle directement à la base de
// PRODUCTION sans passer par aucun d'eux — `execute_sql` y écrit aussi bien
// qu'il y lit. Sans ce hook, toute la doctrine « la production ne se modifie
// que par une migration relue en PR » reposait sur la seule discipline.
//
// Le hook rend la LECTURE gratuite et sans interruption — c'est ce qui retire
// toute raison de sortir vers psql pour vérifier un déploiement — et rend
// l'ÉCRITURE impossible.
import fs from "node:fs";

let data = {};
try {
  data = JSON.parse(fs.readFileSync(0, "utf8"));
} catch {
  process.exit(0);
}

const query = String(data.tool_input?.query || "");
if (!query.trim()) process.exit(0);

// Neutralise commentaires, chaînes et identifiants entre guillemets : un
// mot-clé cité (`SELECT 'drop table'`) ne doit pas déclencher le refus, et un
// mot-clé masqué par un commentaire ne doit pas échapper à l'analyse.
const sql = query
  .replace(/--[^\n]*/g, " ")
  .replace(/\/\*[\s\S]*?\*\//g, " ")
  .replace(/'(?:[^']|'')*'/g, " '' ")
  .replace(/"(?:[^"]|"")*"/g, ' "" ')
  .replace(/\$\$[\s\S]*?\$\$/g, " $$ ")
  .toLowerCase();

const premierMot = (sql.match(/[a-z_]+/) || [""])[0];
const ouverturesLecture = new Set([
  "select", "with", "explain", "show", "table", "values"
]);

// `select ... into` crée une table : c'est une écriture déguisée en lecture.
const ecriture =
  /\b(insert|update|delete|drop|truncate|alter|create|grant|revoke|copy|vacuum|refresh|reindex|cluster|lock|merge|call|do|set|reset|begin|commit|rollback|comment)\b/;
const selectInto = /\bselect\b[\s\S]*?\binto\b/;

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

if (!ouverturesLecture.has(premierMot)) {
  decision(
    "deny",
    `Requête MCP Supabase refusée : elle commence par « ${premierMot} », qui ` +
    `n'est pas une lecture. La base de production ne se modifie que par une ` +
    `migration Prisma committée, relue en PR et appliquée au build Vercel de main.`
  );
}

if (ecriture.test(sql) || selectInto.test(sql)) {
  decision(
    "deny",
    "Requête MCP Supabase refusée : elle contient une opération d'écriture ou " +
    "de DDL. La base de production ne se modifie que par une migration Prisma " +
    "committée, relue en PR et appliquée au build Vercel de main."
  );
}

decision(
  "allow",
  "Lecture seule sur la base Supabase : autorisée sans interruption."
);
