#!/usr/bin/env node
import fs from 'node:fs';

const input = fs.readFileSync(0, 'utf8');
let data = {};
try { data = JSON.parse(input); } catch { process.exit(0); }

const command = String(data.tool_input?.command || '').toLowerCase();
if (!command) process.exit(0);

const risky = [
  /rm\s+-rf\s+\/?/,
  /git\s+reset\s+--hard/,
  /git\s+push\s+--force/,
  /prisma\s+migrate/,
  /supabase\s+db\s+(push|reset|diff)/,
  /drop\s+table/,
  /truncate\s+table/,
  /delete\s+from\s+[^;]+/,
  /cat\s+\.env/,
  /type\s+\.env/,
  /printenv/,
  /env\s*\|/
];

for (const pattern of risky) {
  if (pattern.test(command)) {
    console.error(`Commande bloquée par WellNeuro: "${data.tool_input.command}". Raison: commande destructrice, migration, lecture de secret ou action nécessitant une confirmation explicite.`);
    process.exit(2);
  }
}

process.exit(0);
