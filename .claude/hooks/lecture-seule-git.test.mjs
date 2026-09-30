// Banc du garde des agents en lecture seule.
//
//   node --test .claude/hooks/
//
// Deux familles, et la seconde compte autant que la première : un garde qui
// refuserait `git diff` rendrait l'agent de revue aveugle, et on finirait par
// le retirer du frontmatter.
import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const hook = path.join(path.dirname(fileURLToPath(import.meta.url)), "lecture-seule-git.mjs");

/** 'refus' | 'passe' */
function verdict(command) {
  const res = spawnSync("node", [hook], {
    input: JSON.stringify({ tool_input: { command } }),
    encoding: "utf8",
  });
  return res.status === 2 ? "refus" : "passe";
}

// ── Refusé : ce qui déplace HEAD, l'index, l'arbre ou le distant ────────────
for (const cmd of [
  "git checkout main",
  "git switch -c revue",
  "git restore web/src/app/page.tsx",
  "git reset --hard origin/main",
  "git stash",
  "git stash push -m x",
  "git stash pop",
  "git commit -am wip",
  "git merge origin/main",
  "git rebase origin/main",
  "git pull",
  "git push origin HEAD",
  "git cherry-pick abc123",
  "git clean -fd",
  "git worktree add ../x",
  "git branch -D vieille",
  "git branch --force x origin/main",
  "git tag v1",
  "git config user.name x",
  "git -C /Users/x/depot checkout main",
  "git -c advice.detachedHead=false checkout abc",
  "git --no-pager reset HEAD~1",
  "cd web && git checkout -- .",
  "git status && git checkout main",
  "echo ok; git switch main",
  "(git stash)",
  "git fetch origin && git reset --hard origin/main",
  // Revue adverse de #1259 : formes qui passaient.
  "gh pr checkout 1259",
  "gh pr co 1259",
  "gh pr merge 1259 --squash --delete-branch",
  "gh pr review 1259 --approve",
  "gh pr comment 1259 --body x",
  "gh repo sync",
  "gh api -X POST repos/o/r/pulls/1/reviews",
  'bash -c "git checkout main"',
  "sh -c 'git checkout main'",
  "git submodule foreach 'git checkout main'",
  "/usr/bin/git checkout main",
  "/opt/homebrew/bin/git checkout main",
  "\\git checkout main",
  "git.exe checkout main",
  'git -C "/a b" checkout main',
  "git --exec-path=/x checkout main",
  "git --config-env=a.b=C checkout main",
  'echo "git checkout"',
  "git bisect start",
  "git bisect reset",
  "git symbolic-ref HEAD refs/heads/x",
  "git read-tree HEAD",
  "git checkout-index -a -f",
  "git sparse-checkout set web",
  "git lfs pull",
  "git branch x",
  "git branch -u origin/main",
  "git branch --track x origin/main",
  "git fetch origin main:main",
  "git fetch origin +HEAD:refs/heads/main",
  "git reflog expire --all",
  "git reflog delete HEAD@{1}",
  "git replace a b",
  "git diff --output=web/x.txt",
  "git log --output=README.md",
  "git config set user.name x",
  // Revue Copilot de #1259 : liste blanche, une sous-commande inconnue est refusée.
  "git maintenance run",
  "git frobnicate",
  "git remote add x https://example.org/x.git",
  "git submodule update --init",
  "git notes add -m x",
]) {
  test(`refusé : ${cmd}`, () => assert.equal(verdict(cmd), "refus"));
}

// ── Passe : ce dont une revue a besoin ──────────────────────────────────────
for (const cmd of [
  "git diff origin/main...HEAD",
  "git diff --stat",
  "git show HEAD:web/package.json",
  "git log --oneline -20",
  "git status --short",
  "git blame web/src/lib/auth.ts",
  "git grep -n requireAuth",
  "git ls-files .claude",
  "git rev-parse --show-toplevel",
  "git merge-base origin/main HEAD",
  "git branch --show-current",
  "git branch -a",
  "git tag -l",
  "git tag --contains abc",
  "git stash list",
  "git worktree list",
  "git config --get remote.origin.url",
  "git remote -v",
  "git fetch origin main",
  "git -C /Users/x/depot log -1",
  "gh pr diff 12",
  "gh pr view 12 --comments",
  "gh api repos/o/r/pulls/12/comments",
  "gh run view 1 --log-failed",
  "git config user.name",
  "git config get user.name",
  "git config -l",
  "git apply --check x.patch",
  "git apply --stat x.patch",
  "git branch -vv",
  "git branch -r --contains abc",
  "git branch --list 'wn-*'",
  "git remote show origin",
  "git reflog -5",
  "git fetch https://github.com/o/r main",
  "git stash show -p",
  "git log --format=%H -1",
  "grep -rn digital web/src",
  "ls .github/workflows",
  "npx tsc --noEmit",
]) {
  test(`passe : ${cmd}`, () => assert.equal(verdict(cmd), "passe"));
}

test("un mot contenant « git » n'est pas une invocation", () => {
  assert.equal(verdict("cat digital-reset.md"), "passe");
  assert.equal(verdict("ls .github/workflows && cat .gitignore"), "passe");
});

test("une entrée illisible ne bloque pas (le garde ne décide que sur une commande)", () => {
  const res = spawnSync("node", [hook], { input: "pas du json", encoding: "utf8" });
  assert.equal(res.status, 0);
});

// ── Armement : les agents en lecture seule portent bien ce garde ────────────
// Sans ce test, retirer le bloc `hooks:` d'un frontmatter désarmerait le garde
// sans qu'aucun banc ne rougisse.

for (const agent of ["wn-reviewer", "wn-fable", "Explore"]) {
  test(`${agent} arme le garde lecture seule, en échec fermé`, () => {
    const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
    const texte = fs.readFileSync(path.join(racine, ".claude", "agents", `${agent}.md`), "utf8");
    const frontmatter = texte.split(/^---$/m)[1] || "";
    assert.match(frontmatter, /PreToolUse:[\s\S]*matcher: "Bash"[\s\S]*lecture-seule-git\.mjs/);
    assert.match(frontmatter, /exit 2/);
  });
}
