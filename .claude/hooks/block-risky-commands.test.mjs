// Banc de test du garde-fou des commandes Bash.
//
//   node --test .claude/hooks/
//
// Pourquoi committé plutôt que rejoué à la main : la première version du
// masquage des heredocs avait été validée sur dix cas choisis, tous verts — et
// aucun ne mêlait prose technique et citation destructive, qui est justement
// la combinaison où elle échouait. Un banc versionné ne garantit pas qu'on
// pense à tout, mais il empêche de perdre ce à quoi on a déjà pensé.
//
// Convention `node:test`, comme `scripts/wn-campaign.test.mjs`.
import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const hook = path.join(path.dirname(fileURLToPath(import.meta.url)), "block-risky-commands.mjs");

/** Verdict du hook : 'passe' | 'demande' | 'refus'. */
function verdict(command, env = {}) {
  const res = spawnSync("node", [hook], {
    input: JSON.stringify({ tool_input: { command } }),
    encoding: "utf8",
    env: { ...process.env, ...env },
  });
  if (res.status === 2) return "refus";
  return (res.stdout || "").includes('"ask"') ? "demande" : "passe";
}

// ── Ce qui doit rester refusé ────────────────────────────────────────────────
// Un faux négatif coûte des données. Ces cas priment sur tout confort.

test("une commande destructive nue est refusée", () => {
  assert.equal(verdict("rm -rf /"), "refus");
});

// L'ancienne dérogation `WN_ALLOW_RISKY_COMMAND=1` faisait sortir le hook
// avant toute lecture ; elle est retirée (plan D/41, tranché le 2026-10-21).
test("WN_ALLOW_RISKY_COMMAND=1 ne lève plus le refus", () => {
  assert.equal(verdict("rm -rf /", { WN_ALLOW_RISKY_COMMAND: "1" }), "refus");
});

test("une destructive cachée dans un littéral sous bash -c est refusée", () => {
  assert.equal(verdict('bash -c "rm -rf /"'), "refus");
});

test("du SQL destructif passé en ligne est refusé", () => {
  assert.equal(verdict("psql -c 'DROP TABLE patients'"), "refus");
});

// Le corps est masqué, mais `| bash` reste sur la ligne d'ouverture : c'est
// pour ce cas que le masquage préserve la fin de cette ligne.
for (const interpreteur of ["bash", "sh", "zsh", "fish", "tcsh", "php", "python3", "node"]) {
  test(`un heredoc canalisé vers ${interpreteur} est refusé`, () => {
    assert.equal(verdict(`cat <<'EOF' | ${interpreteur}\nrm -rf /\nEOF`), "refus");
  });
}

test("un heredoc consommé par psql est refusé", () => {
  assert.equal(verdict("psql <<'SQL'\nDROP TABLE patients;\nSQL"), "refus");
});

test("un heredoc consommé par bash est refusé", () => {
  assert.equal(verdict("bash <<'EOF'\nrm -rf /\nEOF"), "refus");
});

// ── Ce qui doit passer : de la donnée, pas du code ───────────────────────────

test("un journal de session citant une commande destructive passe", () => {
  const cmd = "cat >> docs/claude/SESSION_LOG.md <<'ENTREE'\n## Journal\nLe hook refuse `git reset --hard`.\nENTREE";
  assert.equal(verdict(cmd), "passe");
});

// Le cas manquant du premier correctif : la prose parle d'outillage.
test("un journal citant à la fois `npm run check` et une destructive passe", () => {
  const cmd = "cat >> docs/claude/SESSION_LOG.md <<'ENTREE'\n## Journal\nVerifie par npm run check.\nLe hook refuse git reset --hard.\nENTREE";
  assert.equal(verdict(cmd), "passe");
});

test("un corps de PR citant du SQL destructif passe", () => {
  const cmd = "gh pr create --body-file - <<'CORPS'\nLa migration evite DROP TABLE patients.\nCORPS";
  assert.equal(verdict(cmd), "passe");
});

// `\bsh\b` attrape la fin de `check_no_secrets.sh` : sans la distinction
// structure / corps, ce cas repassait en refus.
test("un corps de PR mentionnant un script .sh et citant du SQL destructif passe", () => {
  const cmd = "gh pr create --body-file - <<'CORPS'\nVoir scripts/check_no_secrets.sh ; on evite DROP TABLE patients.\nCORPS";
  assert.equal(verdict(cmd), "passe");
});

test("écrire un fichier avec tee passe", () => {
  assert.equal(verdict("tee /tmp/notes.txt <<'FIN'\nbonjour\nFIN"), "passe");
});

// ── Refus sur la structure : pièges convertis (lot autonomie-frictions) ──────

for (const cmd of [
  "npx prisma format",
  "cd web && npx prisma format --schema prisma/schema.prisma",
  "prisma format",
  "npx prisma validate && npx prisma format",
  // P2 de wn-reviewer sur #2074 : version épinglée, et `--check` en commentaire.
  "npx prisma@7 format",
  "npx prisma@7.2.0 format --schema prisma/schema.prisma",
  "npx prisma format # --check",
]) {
  test(`prisma format est refusé : ${cmd}`, () => assert.equal(verdict(cmd), "refus"));
}

for (const cmd of [
  "npx prisma format --check",
  "npx prisma@7 format --check",
  "cd web && npx prisma format --schema prisma/schema.prisma --check",
  "npx prisma validate",
  'gh pr comment 12 --body "ne jamais lancer prisma format"',
  "gh pr create --body-file - <<'CORPS'\nJamais npx prisma format sur le schéma.\nCORPS",
]) {
  test(`prisma format --check, validate ou prose passent : ${cmd.split("\n")[0]}`, () =>
    assert.equal(verdict(cmd), "passe"));
}

test("un --check d'une autre commande n'excuse pas prisma format", () => {
  assert.equal(verdict("npx prisma format && npm run lint -- --check"), "refus");
});

// ── Modificateurs zsh : `$VAR:r…` non accolé (lot autonomie-pieges-restes) ───

for (const cmd of [
  'git push origin "$NEW:refs/heads/ma-branche"',
  "git push origin $NEW:refs/heads/ma-branche",
  'git update-ref refs/heads/x "$SHA" && git push origin "$SHA:refs/heads/x"',
  "scp fichier $HOTE:tmp/",
  'git push origin "$1:refs/heads/x"',
  // P2 de wn-reviewer : `:fe` et `:gh` (branches `feat/…`, `gh-pages`).
  'git push origin "$SHA:feat/x"',
  'git push origin "$SHA:gh-pages"',
  // P2 de wn-reviewer : une apostrophe entre guillemets doubles n'ouvre rien.
  `git commit -m "l'ajout" && git push origin "$NEW:refs/heads/x" && echo "c'est fait"`,
  `echo "branche '$NEW:refs'"`,
  // Un heredoc à délimiteur nu développe.
  "cat <<FIN\n$NEW:refs/heads/x\nFIN",
  // P1 de wn-reviewer : une ligne vide ne clôt pas un heredoc cité.
  "cat > /tmp/f <<'EOF'\na\n\nb c'est\nEOF\ngit push origin \"$NEW:refs/heads/x\"",
  // Codex : les apostrophes d'un heredoc nu sont du texte, zsh y développe.
  "cat <<FIN\n'$NEW:refs/heads/x'\nFIN",
]) {
  test(`un $VAR:x non accolé est refusé : ${cmd}`, () => assert.equal(verdict(cmd), "refus"));
}

for (const cmd of [
  'git push origin "${NEW}:refs/heads/ma-branche"',
  "git push origin HEAD:refs/heads/ma-branche",
  "echo '$NEW:refs/heads/x est le piège'",
  'echo "\\$NEW:refs/heads/x"',
  'echo "${VAR:-defaut}" "$PATH:/usr/bin" "$HOTE:8080"',
  // `:w` et `:x` ne s'appliquent pas à un paramètre (P3 de wn-reviewer).
  "rsync -a dist/ $HOTE:www/",
  'docker run -v $PWD:/app image "code=$?"',
  'gh pr comment 1 --body "voir \\$NEW:refs/heads/x"',
  // Codex : un délimiteur cité n'est pas qu'un mot.
  "cat <<'FIN-PR'\n$NEW:refs/heads/x\nFIN-PR",
  // P1 de wn-reviewer : corps de plusieurs paragraphes.
  "gh pr create --body-file - <<'CORPS'\nPremier paragraphe.\n\nNe jamais écrire \"$NEW:refs/heads/x\" en zsh.\nCORPS",
  "git commit -m \"$(cat <<'EOF'\nfix: titre\n\nCorps qui cite \"$NEW:refs/heads/x\" et l'ajout.\n\nCo-Authored-By: X\nEOF\n)\"",
  "gh pr create --body-file - <<'CORPS'\nNe jamais écrire \"$NEW:refs/heads/x\" en zsh.\nCORPS",
]) {
  test(`accolé, inerte ou sans modificateur, passe : ${cmd.split("\n")[0]}`, () =>
    assert.equal(verdict(cmd), "passe"));
}

// ── Niveau « demande » : inchangé par le masquage des heredocs ───────────────

test("prisma migrate deploy demande une autorisation", () => {
  assert.equal(verdict("npx prisma migrate deploy"), "demande");
});

// D-523 : `migrate status` et `migrate diff` n'écrivent dans aucune base.
test("prisma migrate status et diff passent en silence (D-523)", () => {
  assert.equal(verdict("npx prisma migrate status"), "passe");
  assert.equal(verdict("npx prisma@7 migrate status"), "passe");
  assert.equal(verdict("cd web && npx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --script"), "passe");
  assert.equal(verdict("npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script | head"), "passe");
  assert.equal(verdict("npx prisma migrate status || echo absent"), "passe");
  // PR-Agent, #2137 : un chemin qui contient « prisma » n'est pas un appel.
  assert.equal(verdict("cat web/prisma/schema.prisma | sed -n 1,20p"), "passe");
  assert.equal(verdict("git diff main -- web/prisma/migrations | awk '{print $1}'"), "passe");
  assert.equal(verdict("ls web/prisma/migrations | sort"), "passe");
  assert.equal(verdict("npx prisma migrate status 2>&1 | tail -5"), "passe");
  assert.equal(verdict("x=$(ls web/prisma/migrations | tail -1)"), "passe");
});

// wn-reviewer, 2026-11-14 : une version épinglée ou une option avant la
// sous-commande ne la masquent plus ; un diff qui rejoue les migrations dans
// une base fantôme, ou qui suit une autre configuration, demande.
test("prisma@x, --config et diff --from-migrations demandent (D-523)", () => {
  for (const cmd of [
    "npx prisma@7 migrate deploy",
    "npx prisma@7.2.0 db push",
    "npx prisma --config prisma.config.ts migrate deploy",
    "npx prisma --schema prisma/schema.prisma db execute --file x.sql",
    "npx prisma --config autre.ts migrate status",
    "cd web && npx prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --script",
    "npx prisma migrate diff --shadow-database-url postgres://x --from-empty --to-schema-datamodel s",
    "npx prisma migrate diff --config autre.ts --from-empty --to-schema-datamodel s",
    // Seconde passe (Codex, wn-reviewer) : ce que le shell assemble ou cache.
    'npx prisma migrate diff "--from-migrations" prisma/migrations --to-empty',
    'npx prisma@6 migrate diff --from-"migrations" prisma/migrations --to-empty --"shadow-database-url" postgresql://u:p@db.example/app',
    'npx prisma@6 migrate reset --force --schema "prisma/schema.prisma$(: migrate diff)"',
    "npx prisma db push --schema=a migrate diff",
    "npx prisma migrate deploy --schema=a migrate status",
    "npx prisma migrate diff --from-empty --to-schema-datamodel s --script | psql $DATABASE_URL",
    "npx prisma migrate diff --from-empty --to-schema-datamodel s --script | npx prisma db execute --stdin",
    // Troisième passe Codex.
    "npx prisma@7 migrate diff --from-empty --to-migrations prisma/migrations",
    "npx prisma@7 migrate diff --from-empty --to-schema prisma/schema.prisma --script | env psql $DATABASE_URL",
    "npx prisma migrate diff --from-empty --to-schema s --script | head | command psql",
    // wn-reviewer, troisième passe : `-o` écrit une migration par Bash.
    "cd web && npx prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script -o prisma/migrations/2099_x/migration.sql",
    "npx prisma migrate diff --from-empty --to-schema s --script --output m.sql",
    // wn-reviewer, quatrième passe.
    "npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script | uniq - prisma/migrations/2099_x/migration.sql",
    "npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script | less -o prisma/migrations/2099_x/migration.sql",
    "npx prisma migrate diff --from-empty --to-schema s --script | sort -o m.sql",
    "psql -f <(npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script)",
    // PR-Agent, #2137 : une redirection avant le tube ne coupe plus le segment.
    "npx prisma migrate diff --from-empty --to-schema s --script 2>&1 | psql $DATABASE_URL",
    "npx prisma migrate diff --from-empty --to-schema s --script &> /dev/null | psql x",
    "npx prisma migrate deploy 2>&1 | tail",
  ]) {
    assert.equal(verdict(cmd), "demande", cmd);
  }
});

test("ce qui suit un migrate diff reste jugé : un deploy chaîné demande", () => {
  assert.equal(verdict("npx prisma migrate diff --script && npx prisma migrate deploy"), "demande");
  for (const cmd of ["npx prisma migrate dev", "npx prisma migrate reset --force", "npx prisma migrate resolve --applied x", "npx prisma db push", "npx prisma db execute --file x.sql"]) {
    assert.equal(verdict(cmd), "demande", cmd);
  }
});

test("un push forcé demande une autorisation", () => {
  assert.equal(verdict("git push --force-with-lease origin ma-branche"), "demande");
});

test("un corps de PR décrivant `prisma migrate deploy` ne demande rien", () => {
  const cmd = "gh pr create --body-file - <<'CORPS'\nLe merge declenche prisma migrate deploy sur main.\nCORPS";
  assert.equal(verdict(cmd), "passe");
});

test("l’enveloppe sûre laisse passer la séquence de test locale", () => {
  assert.equal(verdict("npm run test:worktree -- --fast"), "passe");
});

test("l’enveloppe sûre tolère un `cd … &&` de tête et une redirection", () => {
  assert.equal(verdict("cd web && npm run test:worktree > /tmp/sortie.log 2>&1"), "passe");
});

test("l’enveloppe sûre couvre les scripts qui portent leur propre garde-fou", () => {
  assert.equal(verdict("bash scripts/wn-dev-db.sh --migrate"), "passe");
  assert.equal(verdict("bash scripts/wn-dev-db.sh --migrate --seed"), "passe");
});

// Limite déclarée de D-523 : une substitution entre guillemets doubles est
// masquée avant le jugement, comme tout texte cité. Silence ASSUMÉ, épinglé
// pour qu'un changement du masquage se voie (wn-reviewer, cinquième passe).
test("limite D-523 : substitution entre guillemets doubles, silence assumé", () => {
  assert.equal(verdict('psql -c "$(npx prisma migrate diff --from-empty --to-schema s --script)"'), "passe");
});

// wn-reviewer, 2026-11-14 : une enveloppe ne vaut que seule.
test("l’enveloppe ne dispense pas une commande Prisma chaînée (D-523)", () => {
  for (const cmd of [
    "bash scripts/wn-dev-db.sh && npx prisma migrate deploy",
    "bash scripts/wn-dev-db.sh; npx prisma db push",
    "npm run test:worktree || npx prisma migrate reset --force",
    "bash scripts/wn-dev-db.sh $(npx prisma migrate deploy)",
    "bash scripts/wn-dev-db.sh\nnpx prisma migrate deploy",
    "bash scripts/wn-dev-db.sh --migrate & npx prisma migrate deploy",
    "npm run test:worktree & npx prisma migrate reset --force",
    "bash scripts/wn-dev-db.sh <(npx prisma migrate deploy)",
  ]) {
    assert.equal(verdict(cmd), "demande", cmd);
  }
});

// ── La dérogation ne doit pas devenir un passe-partout ───────────────────────
// Elle sortait auparavant en exit(0) avant TOUT contrôle, et se contrefaisait
// avec un commentaire. Deux trous, deux tests.

test("une destructive suivie de l’enveloppe en commentaire reste refusée", () => {
  assert.equal(verdict("rm -rf / # npm run test:worktree"), "refus");
});

test("l’enveloppe en commentaire ne dispense pas du niveau « demande »", () => {
  assert.equal(verdict("npx prisma migrate deploy # npm run test:worktree"), "demande");
});

test("l’enveloppe ne couvre pas ce qui la suit après un &&", () => {
  assert.equal(verdict("npm run test:worktree && rm -rf /"), "refus");
});

// ── Sondage : permis depuis le 2026-10-24 ────────────────────────────────────
// Le responsable autorise le contrôle en boucle pour toutes les sessions (CI,
// revue CodeRabbit, déploiement). `wn-attendre-ci.mjs` en tâche de fond reste la
// forme préférée pour un CI. Les lectures ponctuelles restent libres.

for (const cmd of [
  "gh pr checks 1259 --watch",
  "gh run watch 123456",
  "until gh pr checks 1259 | grep -q pass; do sleep 30; done",
  "while true; do gh run list --branch x -L 1; sleep 20; done",
  "for i in 1 2 3; do gh api repos/o/r/actions/runs; done",
  "sleep 60 && gh pr checks 1259",
  "gh run view 123 --json status; sleep 30; gh run view 123 --json status",
  "sleep 120; tail -5 /private/tmp/x/tasks/b09p0cu7s.output",
]) {
  test(`sondage permis : ${cmd}`, () => assert.equal(verdict(cmd), "passe"));
}

for (const cmd of [
  "gh pr checks 1259",
  "gh run view 123 --log-failed",
  "gh pr view 1259 --json statusCheckRollup",
  "node scripts/wn-attendre-ci.mjs 1259",
  "sleep 2",
  "tail -5 /private/tmp/x/tasks/b09p0cu7s.output",
  "gh pr create --title x --body \"until gh pr checks passe, sleep 30 et relire\"",
  // Revue Copilot de #1260 : une boucle close avant la lecture n'est pas un sondage.
  "for f in a b; do echo \"$f\"; done; gh pr checks 1259",
]) {
  test(`lecture ponctuelle permise : ${cmd}`, () => assert.equal(verdict(cmd), "passe"));
}
