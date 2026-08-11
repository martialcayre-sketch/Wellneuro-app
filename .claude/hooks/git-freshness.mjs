#!/usr/bin/env node
// Au démarrage/reprise, fetch origin/main sans toucher au worktree et mémorise
// le constat. Avant Edit/Write, réévalue : l'appartenance de origin/main à HEAD
// est toujours recalculée à chaud, en local ; seul le fetch réseau est limité à
// une tentative toutes les 15 minutes. Le verdict est porté par l'état Git réel,
// jamais par l'absence du marqueur. Aucun pull, merge, rebase ni checkout.
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const FENETRE_FETCH_MS = 15 * 60 * 1000;

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

// Un hook tué n'émet aucun verdict, donc n'interdit rien : aucune commande Git
// ne doit pouvoir pendre. Un remote injoignable qui absorbe les paquets, ou une
// invite d'identifiants, bloquerait `fetch` indéfiniment — le délai le
// transforme en échec de fetch, qui a déjà son chemin de décision.
const DELAI_GIT_MS = 10_000;

function git(args) {
  return spawnSync("git", args, {
    cwd,
    encoding: "utf8",
    timeout: DELAI_GIT_MS,
    killSignal: "SIGKILL",
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
  });
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

// Le marqueur est un cache de tentative, jamais une autorisation : son absence
// signifie « jamais vérifié », pas « refusé ».
function lireMarqueur() {
  try {
    const brut = JSON.parse(fs.readFileSync(markerPath, "utf8"));
    return brut && typeof brut === "object" ? brut : null;
  } catch {
    return null;
  }
}

function ecrireMarqueur(marqueur) {
  try {
    fs.mkdirSync(markerDir, { recursive: true, mode: 0o700 });
    fs.writeFileSync(markerPath, JSON.stringify(marqueur), { mode: 0o600 });
  } catch {
    // Un marqueur non écrit coûte un fetch de plus, jamais une autorisation.
  }
}

// Strict : `Number(null)` vaut 0, et 0 est fini. Une conversion laxiste ferait
// passer un `verifiedAt: null` — que ce hook écrit lui-même — pour une
// vérification aboutie à l'époque Unix, et le refus « jamais vérifié »
// s'effondrerait dès la deuxième tentative.
function horodatage(valeur) {
  return typeof valeur === "number" && Number.isFinite(valeur) && valeur > 0 ? valeur : null;
}

// Un mode dégradé muet est un mode dégradé qu'on oublie : il dit toujours de
// quand date la référence sur laquelle il s'appuie.
function age(depuis) {
  if (depuis === null) return "à une date inconnue";
  const minutes = Math.max(0, Math.round((Date.now() - depuis) / 60_000));
  if (minutes < 60) return `il y a ${minutes} min`;
  const heures = Math.floor(minutes / 60);
  return heures < 24 ? `il y a ${heures} h` : `il y a ${Math.floor(heures / 24)} j`;
}

function sha(ref) {
  const resultat = git(["rev-parse", ref]);
  return resultat.status === 0 ? resultat.stdout.trim() : null;
}

// Constat local, sans réseau : c'est lui qui décide, pas le marqueur.
function constater() {
  const head = sha("HEAD");
  const originMain = sha("origin/main");
  const contient = Boolean(head && originMain)
    && git(["merge-base", "--is-ancestor", "origin/main", "HEAD"]).status === 0;
  return { head, originMain, contient };
}

function evaluer({ forcerFetch = false } = {}) {
  const precedent = lireMarqueur();
  const maintenant = Date.now();
  const derniereTentative = horodatage(precedent?.lastAttemptAt);
  const recent = !forcerFetch
    && derniereTentative !== null
    && maintenant >= derniereTentative
    && maintenant - derniereTentative < FENETRE_FETCH_MS;

  let fetchOk;
  let lastAttemptAt;
  if (recent) {
    // Fenêtre encore ouverte : aucun réseau, et lastAttemptAt n'avance pas —
    // sinon la fenêtre glisserait à chaque édition et le refetch n'aurait
    // jamais lieu.
    fetchOk = precedent.fetchOk === true;
    lastAttemptAt = derniereTentative;
  } else {
    fetchOk = git(["fetch", "--quiet", "origin", "main"]).status === 0;
    lastAttemptAt = maintenant;
  }

  const constat = constater();
  const verifiedAt = (!recent && fetchOk) ? maintenant : horodatage(precedent?.verifiedAt);

  ecrireMarqueur({
    originMain: constat.originMain,
    headContains: constat.contient,
    fetchOk,
    verifiedAt,
    lastAttemptAt,
  });

  return { constat, fetchOk, verifiedAt };
}

if (event === "SessionStart") {
  if (git(["rev-parse", "--show-toplevel"]).status !== 0) {
    process.stdout.write("Freshness Git non vérifiée : session hors dépôt. Aucune édition autorisée.\n");
    process.exit(0);
  }

  const { constat, fetchOk, verifiedAt } = evaluer({ forcerFetch: true });

  if (!fetchOk && verifiedAt === null) {
    process.stdout.write("Freshness Git non vérifiée : `git fetch origin main` a échoué et aucune vérification n'a jamais abouti. Aucune édition avant résolution.\n");
    process.exit(0);
  }
  if (!constat.head || !constat.originMain) {
    process.stdout.write("Freshness Git non vérifiée : `HEAD` ou `origin/main` est illisible. Aucune édition avant résolution.\n");
    process.exit(0);
  }
  if (!constat.contient) {
    const source = fetchOk ? "le nouvel `origin/main`" : "l'`origin/main` connu (fetch impossible)";
    process.stdout.write(`Freshness Git : la branche ne contient pas ${source} (HEAD ${constat.head.slice(0, 12)} · origin/main ${constat.originMain.slice(0, 12)}). Aucune édition avant arbitrage ; le garde réévalue à chaque tentative d'édition, sans reprise de session.\n`);
    process.exit(0);
  }

  const degrade = fetchOk ? "" : ` (mode dégradé : fetch impossible, référence vérifiée ${age(verifiedAt)})`;
  process.stdout.write(`Freshness Git vérifiée : HEAD contient origin/main ${constat.originMain.slice(0, 12)}${degrade}.\n`);
  process.exit(0);
}

// Le matcher `Edit|Write` de settings.json n'est pas ancré : il fait entrer ici
// MultiEdit et NotebookEdit, qui écrivent des fichiers comme les autres. Les
// ignorer ouvrirait une porte que `protect-wellneuro-files.mjs`, lui, ferme.
if (event === "PreToolUse" && /^(Edit|Write|MultiEdit|NotebookEdit)$/.test(String(input.tool_name || ""))) {
  const { constat, fetchOk, verifiedAt } = evaluer();

  if (!constat.head || !constat.originMain) {
    deny(`Édition bloquée : ${constat.head ? "`origin/main`" : "`HEAD`"} est illisible dans ce dépôt${fetchOk ? "" : ", et `git fetch origin main` a échoué"}. Aucune édition avant résolution.`);
    process.exit(0);
  }
  if (!constat.contient) {
    deny(`Édition bloquée : la branche ne contient pas \`origin/main\` (HEAD ${constat.head} · origin/main ${constat.originMain}). Remettre la branche à niveau par arbitrage humain — ni pull, ni merge, ni rebase automatique. L'édition est réévaluée dès la tentative suivante, sans reprise de session.`);
    process.exit(0);
  }
  if (!fetchOk && verifiedAt === null) {
    deny("Édition bloquée : `git fetch origin main` a échoué et aucune vérification n'a jamais abouti dans cette session. La fraîcheur d'`origin/main` n'est pas établie. Aucune édition avant résolution.");
    process.exit(0);
  }
  if (!fetchOk) {
    process.stdout.write(JSON.stringify({
      systemMessage: `Freshness Git en mode dégradé : \`git fetch origin main\` a échoué, la vérification porte sur la dernière référence connue (origin/main ${constat.originMain.slice(0, 12)}, vérifiée ${age(verifiedAt)}), que HEAD contient.`,
    }));
  }
  process.exit(0);
}
