#!/usr/bin/env node
import fs from 'node:fs';

const input = fs.readFileSync(0, 'utf8');
let data = {};
try { data = JSON.parse(input); } catch { process.exit(0); }

const toolInput = data.tool_input || {};
const filePath = String(toolInput.file_path || toolInput.path || '');
if (!filePath) process.exit(0);

const normalized = filePath.replaceAll('\\\\', '/').toLowerCase();

const protectedPatterns = [
  '/.git/',
  'node_modules/',
  '.next/',
  'dist/',
  'coverage/',
  '.env',
  '.env.local',
  '.env.production',
  '.env.development',
  'prisma/schema.prisma',
  'prisma/migrations/',
  'supabase/migrations/'
];

for (const pattern of protectedPatterns) {
  if (normalized.includes(pattern)) {
    console.error(`Action bloquée par WellNeuro: modification interdite de ${filePath}. Règle touchée: ${pattern}. Demander une confirmation explicite avant toute modification de schéma, migration ou secret.`);
    process.exit(2);
  }
}

process.exit(0);
