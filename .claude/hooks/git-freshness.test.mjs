import assert from "node:assert/strict";
import test from "node:test";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const hook = path.join(path.dirname(fileURLToPath(import.meta.url)), "git-freshness.mjs");

function run(command, cwd) {
  const result = spawnSync("git", command, { cwd, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  return result;
}

function invoke(cwd, input) {
  return spawnSync("node", [hook], {
    cwd,
    input: JSON.stringify(input),
    encoding: "utf8",
  });
}

// Même dérivation que le hook : le banc sème des marqueurs à horodatage
// contrôlé sans qu'aucune variable d'environnement n'entre dans la décision.
function marqueur(cwd, sessionId) {
  const key = crypto.createHash("sha256").update(`${cwd}\0${sessionId}`).digest("hex");
  return path.join(os.tmpdir(), "wellneuro-claude-git-freshness", `${key}.json`);
}

function lireMarqueur(cwd, sessionId) {
  return JSON.parse(fs.readFileSync(marqueur(cwd, sessionId), "utf8"));
}

function semerMarqueur(cwd, sessionId, contenu) {
  const fichier = marqueur(cwd, sessionId);
  fs.mkdirSync(path.dirname(fichier), { recursive: true, mode: 0o700 });
  fs.writeFileSync(fichier, JSON.stringify(contenu), { mode: 0o600 });
  return fichier;
}

function sha(ref, cwd) {
  return run(["rev-parse", ref], cwd).stdout.trim();
}

// Une absence de refus ne prouve rien si le hook a pu planter : un hook mort
// produit lui aussi un stdout sans `permissionDecision`.
function assertAutorise(resultat, message) {
  assert.equal(resultat.status, 0, resultat.stderr);
  assert.equal(resultat.stderr, "", "le hook ne doit rien écrire sur stderr");
  assert.doesNotMatch(resultat.stdout, /permissionDecision/, message);
}

function repo() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "wn-freshness-test-"));
  const remote = path.join(root, "remote.git");
  const work = path.join(root, "work");
  run(["init", "--bare", remote], root);
  run(["clone", remote, work], root);
  run(["config", "user.email", "test@wellneuro.invalid"], work);
  run(["config", "user.name", "Test WellNeuro"], work);
  fs.writeFileSync(path.join(work, "README.md"), "test\n");
  run(["add", "README.md"], work);
  run(["commit", "-m", "initial"], work);
  run(["branch", "-M", "main"], work);
  run(["push", "-u", "origin", "main"], work);
  return { root, remote, work };
}

// Fait avancer origin/main côté serveur, par un second clone : le worktree
// testé ne verra le nouveau commit que s'il fetch réellement.
function avancerLeRemote({ root, remote }, nom) {
  // `-b main` : le dépôt nu a été créé avec un HEAD sur `master`, un clone
  // simple laisserait une branche non née et le push ne serait pas fast-forward.
  const autre = path.join(root, `autre-${nom}`);
  run(["clone", "-b", "main", remote, autre], root);
  run(["config", "user.email", "test@wellneuro.invalid"], autre);
  run(["config", "user.name", "Test WellNeuro"], autre);
  fs.writeFileSync(path.join(autre, `${nom}.txt`), `${nom}\n`);
  run(["add", `${nom}.txt`], autre);
  run(["commit", "-m", nom], autre);
  run(["push", "origin", "HEAD:main"], autre);
  return sha("HEAD", autre);
}

function casserLeRemote(work) {
  run(["remote", "set-url", "origin", path.join(work, "remote-inexistant.git")], work);
}

test("une session fraîche autorise Edit", (t) => {
  const { root, work } = repo();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const session = `fresh-${Date.now()}`;
  t.after(() => fs.rmSync(marqueur(work, session), { force: true }));
  const start = invoke(work, { hook_event_name: "SessionStart", session_id: session, cwd: work });
  assert.equal(start.status, 0);
  assert.match(start.stdout, /Freshness Git vérifiée/);
  const edit = invoke(work, { hook_event_name: "PreToolUse", session_id: session, cwd: work, tool_name: "Edit" });
  assert.equal(edit.status, 0);
  assertAutorise(edit);
});

test("sans marqueur, l'édition est évaluée à chaud plutôt que refusée", (t) => {
  const { root, work } = repo();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const session = `sans-marqueur-${Date.now()}`;
  t.after(() => fs.rmSync(marqueur(work, session), { force: true }));
  assert.equal(fs.existsSync(marqueur(work, session)), false);
  const edit = invoke(work, { hook_event_name: "PreToolUse", session_id: session, cwd: work, tool_name: "Edit" });
  assertAutorise(edit);
  const ecrit = lireMarqueur(work, session);
  assert.equal(ecrit.headContains, true);
  assert.equal(ecrit.fetchOk, true);
  assert.equal(typeof ecrit.verifiedAt, "number");
});

test("un commit local après la vérification n'interrompt pas la session", (t) => {
  const { root, work } = repo();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const session = `changed-${Date.now()}`;
  t.after(() => fs.rmSync(marqueur(work, session), { force: true }));
  invoke(work, { hook_event_name: "SessionStart", session_id: session, cwd: work });
  fs.writeFileSync(path.join(work, "second.txt"), "second\n");
  run(["add", "second.txt"], work);
  run(["commit", "-m", "second"], work);
  const edit = invoke(work, { hook_event_name: "PreToolUse", session_id: session, cwd: work, tool_name: "Write" });
  assertAutorise(edit);
});

test("origin/main avance et HEAD le contient : l'édition reste autorisée", (t) => {
  const { root, work } = repo();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const session = `origin-contenu-${Date.now()}`;
  t.after(() => fs.rmSync(marqueur(work, session), { force: true }));
  invoke(work, { hook_event_name: "SessionStart", session_id: session, cwd: work });

  // La branche locale porte déjà le commit qui devient origin/main.
  fs.writeFileSync(path.join(work, "remote-change.txt"), "change\n");
  run(["add", "remote-change.txt"], work);
  run(["commit", "-m", "remote change"], work);
  run(["push", "origin", "HEAD:main"], work);

  const edit = invoke(work, { hook_event_name: "PreToolUse", session_id: session, cwd: work, tool_name: "Write" });
  assertAutorise(edit);
  assert.equal(lireMarqueur(work, session).originMain, sha("HEAD", work));
});

test("origin/main avance et HEAD ne le contient pas : refus nommant les deux SHA", (t) => {
  const contexte = repo();
  const { root, work } = contexte;
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const session = `origin-divergent-${Date.now()}`;
  t.after(() => fs.rmSync(marqueur(work, session), { force: true }));

  // Aucun marqueur : l'évaluation est entièrement à chaud, fetch compris.
  const distant = avancerLeRemote(contexte, "amont");
  const local = sha("HEAD", work);

  const edit = invoke(work, { hook_event_name: "PreToolUse", session_id: session, cwd: work, tool_name: "Write" });
  assert.match(edit.stdout, /"permissionDecision":"deny"/);
  assert.match(edit.stdout, new RegExp(local));
  assert.match(edit.stdout, new RegExp(distant));
});

test("branche remise à niveau en session : l'édition est autorisée sans reprise", (t) => {
  const contexte = repo();
  const { root, work } = contexte;
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const session = `remise-a-niveau-${Date.now()}`;
  t.after(() => fs.rmSync(marqueur(work, session), { force: true }));

  // SessionStart constate la divergence : le marqueur l'enregistre, il n'y a
  // plus d'absence de fichier qui vaudrait refus définitif.
  avancerLeRemote(contexte, "avant-session");
  const start = invoke(work, { hook_event_name: "SessionStart", session_id: session, cwd: work });
  assert.match(start.stdout, /ne contient pas le nouvel/);
  assert.equal(lireMarqueur(work, session).headContains, false);

  const bloque = invoke(work, { hook_event_name: "PreToolUse", session_id: session, cwd: work, tool_name: "Edit" });
  assert.match(bloque.stdout, /"permissionDecision":"deny"/);

  // Arbitrage humain hors du hook : la branche est remise à niveau.
  run(["merge", "--ff-only", "origin/main"], work);

  const edit = invoke(work, { hook_event_name: "PreToolUse", session_id: session, cwd: work, tool_name: "Edit" });
  assertAutorise(edit);
  assert.equal(lireMarqueur(work, session).headContains, true);
});

test("sans marqueur et sans fetch possible, l'édition est refusée — à chaque tentative", (t) => {
  const { root, work } = repo();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const session = `hors-ligne-neuf-${Date.now()}`;
  t.after(() => fs.rmSync(marqueur(work, session), { force: true }));
  casserLeRemote(work);

  // La première tentative écrit un marqueur `verifiedAt: null` : la seconde le
  // relit. Une conversion laxiste y verrait une vérification aboutie et
  // ouvrirait le mode dégradé — le refus doit tenir indéfiniment.
  for (const rang of [1, 2, 3]) {
    const edit = invoke(work, { hook_event_name: "PreToolUse", session_id: session, cwd: work, tool_name: "Edit" });
    assert.match(edit.stdout, /"permissionDecision":"deny"/, `tentative ${rang}`);
    assert.match(edit.stdout, /aucune vérification n'a jamais abouti/, `tentative ${rang}`);
  }
  assert.equal(lireMarqueur(work, session).verifiedAt, null);
});

test("les autres outils d'écriture sont gardés comme Edit et Write", (t) => {
  const contexte = repo();
  const { root, work } = contexte;
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  avancerLeRemote(contexte, "outils");

  for (const outil of ["Edit", "Write", "MultiEdit", "NotebookEdit"]) {
    const session = `outil-${outil}-${Date.now()}`;
    t.after(() => fs.rmSync(marqueur(work, session), { force: true }));
    const edit = invoke(work, { hook_event_name: "PreToolUse", session_id: session, cwd: work, tool_name: outil });
    assert.match(edit.stdout, /"permissionDecision":"deny"/, outil);
  }
});

test("SessionStart hors ligne sur un dépôt jamais vérifié : l'édition reste refusée", (t) => {
  const { root, work } = repo();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const session = `hors-ligne-demarrage-${Date.now()}`;
  t.after(() => fs.rmSync(marqueur(work, session), { force: true }));
  casserLeRemote(work);

  const start = invoke(work, { hook_event_name: "SessionStart", session_id: session, cwd: work });
  assert.match(start.stdout, /aucune vérification n'a jamais abouti/);
  assert.doesNotMatch(start.stdout, /Freshness Git vérifiée/);

  const edit = invoke(work, { hook_event_name: "PreToolUse", session_id: session, cwd: work, tool_name: "Edit" });
  assert.match(edit.stdout, /"permissionDecision":"deny"/);
});

test("un horodatage de vérification falsifiable ne vaut pas vérification", (t) => {
  const { root, work } = repo();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  casserLeRemote(work);

  // Toutes ces valeurs valent 0 ou NaN une fois passées par `Number()`.
  for (const valeur of [null, 0, false, "", [], "1786449068984", Number.NaN, -1]) {
    const session = `verifie-faux-${JSON.stringify(valeur)}-${Date.now()}`;
    t.after(() => fs.rmSync(marqueur(work, session), { force: true }));
    semerMarqueur(work, session, {
      originMain: sha("HEAD", work),
      headContains: true,
      fetchOk: false,
      verifiedAt: valeur,
      lastAttemptAt: Date.now() - 20 * 60 * 1000,
    });
    const edit = invoke(work, { hook_event_name: "PreToolUse", session_id: session, cwd: work, tool_name: "Edit" });
    assert.match(edit.stdout, /"permissionDecision":"deny"/, `verifiedAt = ${JSON.stringify(valeur)}`);
  }
});

test("un fetch qui pend ne fait pas tomber le garde en autorisation", (t) => {
  const { root, work } = repo();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const session = `fetch-suspendu-${Date.now()}`;
  t.after(() => fs.rmSync(marqueur(work, session), { force: true }));

  // `git fetch` qui ne rend jamais la main : le cas d'un remote dont les
  // paquets sont absorbés, ou d'une invite d'identifiants. Sans délai, le hook
  // serait tué par le harnais sans avoir rien émis — donc sans rien interdire.
  const vraiGit = spawnSync("sh", ["-c", "command -v git"], { encoding: "utf8" }).stdout.trim();
  const shim = path.join(root, "shim");
  fs.mkdirSync(shim);
  fs.writeFileSync(
    path.join(shim, "git"),
    `#!/bin/sh\nif [ "$1" = "fetch" ]; then sleep 120; fi\nexec ${vraiGit} "$@"\n`,
    { mode: 0o755 },
  );

  const debut = Date.now();
  const edit = spawnSync("node", [hook], {
    cwd: work,
    input: JSON.stringify({ hook_event_name: "PreToolUse", session_id: session, cwd: work, tool_name: "Edit" }),
    encoding: "utf8",
    env: { ...process.env, PATH: `${shim}:${process.env.PATH}` },
    timeout: 60_000,
  });
  assert.ok(Date.now() - debut < 30_000, "le hook doit rendre la main sans attendre le réseau");
  assert.match(edit.stdout, /"permissionDecision":"deny"/);
  assert.equal(lireMarqueur(work, session).fetchOk, false);
});

test("le message de mode dégradé n'est pas une décision", (t) => {
  const { root, work } = repo();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const session = `degrade-json-${Date.now()}`;
  t.after(() => fs.rmSync(marqueur(work, session), { force: true }));
  invoke(work, { hook_event_name: "SessionStart", session_id: session, cwd: work });
  casserLeRemote(work);
  const precedent = lireMarqueur(work, session);
  semerMarqueur(work, session, { ...precedent, lastAttemptAt: Date.now() - 20 * 60 * 1000 });

  const edit = invoke(work, { hook_event_name: "PreToolUse", session_id: session, cwd: work, tool_name: "Edit" });
  const sortie = JSON.parse(edit.stdout);
  assert.deepEqual(Object.keys(sortie), ["systemMessage"]);
  assert.match(sortie.systemMessage, /mode dégradé/);
  assert.match(sortie.systemMessage, /vérifiée il y a/);
});

test("SessionStart refetche même dans la fenêtre ouverte", (t) => {
  const contexte = repo();
  const { root, work } = contexte;
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const session = `demarrage-force-${Date.now()}`;
  t.after(() => fs.rmSync(marqueur(work, session), { force: true }));
  invoke(work, { hook_event_name: "SessionStart", session_id: session, cwd: work });

  const distant = avancerLeRemote(contexte, "pendant-fenetre");
  const start = invoke(work, { hook_event_name: "SessionStart", session_id: session, cwd: work });
  assert.match(start.stdout, /ne contient pas/);
  assert.equal(lireMarqueur(work, session).originMain, distant);
});

test("fetch impossible mais vérification antérieure : autorisé en mode dégradé", (t) => {
  const { root, work } = repo();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const session = `hors-ligne-verifie-${Date.now()}`;
  t.after(() => fs.rmSync(marqueur(work, session), { force: true }));
  invoke(work, { hook_event_name: "SessionStart", session_id: session, cwd: work });
  casserLeRemote(work);

  // Fenêtre réseau périmée : le hook retente, échoue, et retombe sur la
  // dernière référence connue.
  const precedent = lireMarqueur(work, session);
  semerMarqueur(work, session, { ...precedent, lastAttemptAt: Date.now() - 20 * 60 * 1000 });

  const edit = invoke(work, { hook_event_name: "PreToolUse", session_id: session, cwd: work, tool_name: "Edit" });
  assertAutorise(edit);
  assert.match(edit.stdout, /mode dégradé/);
  const ecrit = lireMarqueur(work, session);
  assert.equal(ecrit.fetchOk, false);
  assert.equal(ecrit.verifiedAt, precedent.verifiedAt);
});

test("marqueur frais : aucun fetch, donc aucun réseau", (t) => {
  const contexte = repo();
  const { root, work } = contexte;
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const session = `fenetre-ouverte-${Date.now()}`;
  t.after(() => fs.rmSync(marqueur(work, session), { force: true }));
  invoke(work, { hook_event_name: "SessionStart", session_id: session, cwd: work });
  const tentative = lireMarqueur(work, session).lastAttemptAt;

  // Le remote avance et devient injoignable : un fetch échouerait bruyamment.
  avancerLeRemote(contexte, "ignore");
  casserLeRemote(work);

  const edit = invoke(work, { hook_event_name: "PreToolUse", session_id: session, cwd: work, tool_name: "Edit" });
  assertAutorise(edit);
  assert.doesNotMatch(edit.stdout, /mode dégradé/);
  // La fenêtre ne glisse pas : lastAttemptAt reste celui du dernier vrai fetch.
  assert.equal(lireMarqueur(work, session).lastAttemptAt, tentative);
});

test("marqueur périmé : le refetch a bien lieu", (t) => {
  const contexte = repo();
  const { root, work } = contexte;
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const session = `fenetre-perimee-${Date.now()}`;
  t.after(() => fs.rmSync(marqueur(work, session), { force: true }));
  invoke(work, { hook_event_name: "SessionStart", session_id: session, cwd: work });

  const distant = avancerLeRemote(contexte, "hors-fenetre");
  const precedent = lireMarqueur(work, session);
  semerMarqueur(work, session, { ...precedent, lastAttemptAt: Date.now() - 20 * 60 * 1000 });

  // Sans refetch, origin/main resterait local et l'édition passerait.
  const edit = invoke(work, { hook_event_name: "PreToolUse", session_id: session, cwd: work, tool_name: "Edit" });
  assert.match(edit.stdout, /"permissionDecision":"deny"/);
  assert.match(edit.stdout, new RegExp(distant));
  assert.equal(lireMarqueur(work, session).originMain, distant);
});
