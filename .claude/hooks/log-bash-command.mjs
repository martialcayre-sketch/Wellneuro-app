#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

let data = {};
try {
  data = JSON.parse(fs.readFileSync(0, "utf8"));
} catch {
  process.exit(0);
}

const command = String(data.tool_input?.command || "").trim();
if (!command) process.exit(0);

const projectDir = process.env.CLAUDE_PROJECT_DIR || data.cwd || process.cwd();
const logDir = path.join(projectDir, ".claude", "logs");

const redacted = command
  .replace(/(password|token|secret|api[_-]?key)=("[^"]*"|'[^']*'|\S+)/gi, "$1=<masqué>")
  .replace(/postgres(?:ql)?:\/\/[^\s]+/gi, "postgresql://<masqué>");

// Hook d'observabilité pure (async dans settings.json) : une écriture en échec
// (disque plein, droits) ne doit jamais produire un code de sortie non nul.
try {
  fs.mkdirSync(logDir, { recursive: true });
  fs.appendFileSync(
    path.join(logDir, "bash-commands.log"),
    `${new Date().toISOString()} ${redacted}\n`
  );
} catch {
  // rien : journaliser ne décide de rien
}
process.exit(0);
