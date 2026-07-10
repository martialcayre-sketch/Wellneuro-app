#!/usr/bin/env node
import fs from "node:fs";

if (process.env.WN_ALLOW_RISKY_COMMAND === "1") process.exit(0);

let data = {};
try {
  data = JSON.parse(fs.readFileSync(0, "utf8"));
} catch {
  process.exit(0);
}

const original = String(data.tool_input?.command || "");
const command = original.toLowerCase();
if (!command) process.exit(0);

const risky = [
  /\brm\s+-rf\s+(\/|\*|\.($|\s)|~)/,
  /\bgit\s+reset\s+--hard\b/,
  /\bgit\s+push\b[^\n]*--force(?:-with-lease)?\b/,
  /\bgit\s+clean\s+-[^\n]*[fdx][^\n]*\b(?!.*\s-n)/,
  /\bgit\s+(checkout|restore)\s+--?\s*\.\s*$/,
  /\bprisma\s+(migrate|db\s+push|db\s+execute)\b/,
  /\bsupabase\s+db\s+(push|reset|diff)\b/,
  /\b(drop\s+(table|database|schema)|truncate\s+table)\b/,
  /\bdelete\s+from\s+[^;\n]+(?:;|$)/,
  /\b(cat|type|more|get-content)\s+[^\n]*\.env\b/,
  /\bprintenv\b/,
  /\benv\s*\|/,
  /\bset\s*\|\s*(grep|findstr)\b/
];

for (const pattern of risky) {
  if (pattern.test(command)) {
    console.error(
      `Commande bloquée par WellNeuro : ${original}. ` +
      `Elle est destructive, touche aux migrations ou peut exposer des secrets. ` +
      `Après confirmation explicite seulement, utiliser une session dédiée avec ` +
      `WN_ALLOW_RISKY_COMMAND=1.`
    );
    process.exit(2);
  }
}

process.exit(0);
