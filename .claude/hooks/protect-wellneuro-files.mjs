#!/usr/bin/env node
import fs from "node:fs";

if (process.env.WN_ALLOW_PROTECTED_WRITE === "1") process.exit(0);

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
const protectedPatterns = [
  "/.git/",
  "node_modules/",
  ".next/",
  "dist/",
  "coverage/",
  "/.env",
  ".env.local",
  ".env.production",
  ".env.development",
  "prisma/schema.prisma",
  "prisma/migrations/",
  "supabase/migrations/"
];

for (const pattern of protectedPatterns) {
  if (normalized.includes(pattern)) {
    console.error(
      `Action bloquée par WellNeuro : modification protégée de ${filePath}. ` +
      `Règle : ${pattern}. Une confirmation explicite et une session dédiée ` +
      `avec WN_ALLOW_PROTECTED_WRITE=1 sont nécessaires.`
    );
    process.exit(2);
  }
}

process.exit(0);
