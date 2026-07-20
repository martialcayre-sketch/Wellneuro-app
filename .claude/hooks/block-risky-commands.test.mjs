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
function verdict(command) {
  const res = spawnSync("node", [hook], {
    input: JSON.stringify({ tool_input: { command } }),
    encoding: "utf8",
    // La dérogation ne doit jamais teinter un résultat de test.
    env: { ...process.env, WN_ALLOW_RISKY_COMMAND: "" },
  });
  if (res.status === 2) return "refus";
  return (res.stdout || "").includes('"ask"') ? "demande" : "passe";
}

// ── Ce qui doit rester refusé ────────────────────────────────────────────────
// Un faux négatif coûte des données. Ces cas priment sur tout confort.

test("une commande destructive nue est refusée", () => {
  assert.equal(verdict("rm -rf /"), "refus");
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

// ── Niveau « demande » : inchangé par le masquage des heredocs ───────────────

test("prisma migrate deploy demande une autorisation", () => {
  assert.equal(verdict("npx prisma migrate deploy"), "demande");
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
