#!/usr/bin/env node
// À chaque démarrage/reprise, fetch origin/main sans toucher au worktree puis
// mémorise, par session, que HEAD contient bien la référence fraîche. Avant
// Edit/Write, refuse si cette preuve manque ou si origin/main a changé depuis.
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

let input = {};
try {
  input = JSON.parse(fs.readFileSync(0, "utf8"));
} catch {
  process.exit(0);
}

const event = String(input.hook_event_name || "");
const sessionId = String(input.session_id || "");
const cwd = String(input.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd());
if (!sessionId || !event) process.exit(0);

const key = crypto.createHash("sha256").update(`${cwd}\0${sessionId}`).digest("hex");
const markerDir = path.join(os.tmpdir(), "wellneuro-claude-git-freshness");
const markerPath = path.join(markerDir, `${key}.json`);

function git(args) {
  return spawnSync("git", args, { cwd, encoding: "utf8" });
}

function deny(reason) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: reason,
    },
  }));
}

if (event === "SessionStart") {
  fs.mkdirSync(markerDir, { recursive: true, mode: 0o700 });
  fs.rmSync(markerPath, { force: true });

  const root = git(["rev-parse", "--show-toplevel"]);
  if (root.status !== 0) {
    process.stdout.write("Freshness Git non vérifiée : session hors dépôt. Aucune édition autorisée.\n");
    process.exit(0);
  }

  const fetch = git(["fetch", "--quiet", "origin", "main"]);
  if (fetch.status !== 0) {
    process.stdout.write("Freshness Git non vérifiée : `git fetch origin main` a échoué. Aucune édition avant résolution.\n");
    process.exit(0);
  }

  const head = git(["rev-parse", "HEAD"]);
  const originMain = git(["rev-parse", "origin/main"]);
  const contains = git(["merge-base", "--is-ancestor", "origin/main", "HEAD"]);
  if (head.status !== 0 || originMain.status !== 0 || contains.status !== 0) {
    process.stdout.write("Freshness Git vérifiée, mais la branche ne contient pas le nouvel `origin/main`. Aucune édition avant arbitrage.\n");
    process.exit(0);
  }

  fs.writeFileSync(markerPath, JSON.stringify({
    originMain: originMain.stdout.trim(),
  }), { mode: 0o600 });
  process.stdout.write(`Freshness Git vérifiée : HEAD contient origin/main ${originMain.stdout.trim().slice(0, 12)}.\n`);
  process.exit(0);
}

if (event === "PreToolUse" && /^(Edit|Write)$/.test(String(input.tool_name || ""))) {
  let marker;
  try {
    marker = JSON.parse(fs.readFileSync(markerPath, "utf8"));
  } catch {
    deny("Édition bloquée : la freshness Git de cette session n'est pas validée. Reprendre la session après un fetch réussi et l'arbitrage de toute divergence avec origin/main.");
    process.exit(0);
  }

  const originMain = git(["rev-parse", "origin/main"]);
  if (
    originMain.status !== 0 || originMain.stdout.trim() !== marker.originMain
  ) {
    deny("Édition bloquée : origin/main a changé depuis la vérification de début de session. Reprendre la session pour revérifier la freshness Git.");
  }
}
