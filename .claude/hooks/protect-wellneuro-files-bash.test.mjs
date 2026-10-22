// Banc du crochet d'écriture sur Bash (t18, 2026-10-22).
//
//   node --test .claude/hooks/
//
// Ce que ce banc prouve : une commande Bash qui écrit un fichier protégé
// reçoit le MÊME verdict que par Edit/Write — refus pour les secrets et
// l'infrastructure, demande pour Prisma, les fichiers cliniques nommés et
// toute table signée. Jusque-là `sed -i` ou `cat > f <<EOF` sur un fichier
// clinique passaient sans un mot : le crochet n'était armé que sur
// Edit|Write.
//
// Quatre familles : les FORMES reconnues (une par forme, sur le même fichier
// clinique), les verdicts ÉGAUX à Edit/Write (refus, Prisma, marqueur), les
// MENTIONS par un interpréteur (au plus « demande »), et le SILENCE — lectures,
// prose, et les trous ASSUMÉS, épinglés pour qu'un élargissement ou un recul
// se voie au banc.
import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ici = path.dirname(fileURLToPath(import.meta.url));
const hook = path.join(ici, "protect-wellneuro-files.mjs");
const racine = path.resolve(ici, "..", "..");

/** Verdict du hook pour une commande Bash lancée depuis `cwd`. */
function jugement(command, cwd = racine) {
  const res = spawnSync("node", [hook], {
    input: JSON.stringify({ tool_name: "Bash", tool_input: { command }, cwd }),
    encoding: "utf8",
    env: { ...process.env, CLAUDE_PROJECT_DIR: racine },
  });
  if (res.status === 2) return { verdict: "refus", sortie: res.stderr || "" };
  assert.equal(res.status, 0, res.stderr);
  const sortie = res.stdout || "";
  return { verdict: sortie.includes('"ask"') ? "demande" : "passe", sortie };
}

const Q = "web/src/lib/questions.ts";

// ── Formes reconnues : chacune demande sur un fichier clinique nommé ────────
for (const commande of [
  `echo x > ${Q}`,
  `echo x >> ${Q}`,
  `echo x >| ${Q}`,
  `ls &> ${Q}`,
  `ls 2> ${Q}`,
  `ls >&${Q}`,
  `echo x > "${Q}"`,
  `echo x > ./web/src/lib/../lib/questions.ts`,
  `echo x > ${path.join(racine, Q)}`,
  `echo x > $CLAUDE_PROJECT_DIR/${Q}`,
  `printf x | tee ${Q}`,
  `printf x | tee -a /tmp/journal.txt ${Q}`,
  `sed -i '' 's/a/b/' ${Q}`,
  `sed -i.bak 's/a/b/' ${Q}`,
  `sed -Ei 's/a/b/' ${Q}`,
  `sed --in-place -e 's/a/b/' ${Q}`,
  `perl -pi -e 's/a/b/' ${Q}`,
  `cp /tmp/x.ts ${Q}`,
  `cp /tmp/questions.ts web/src/lib/`,
  `cp -t web/src/lib /tmp/questions.ts`,
  `mv /tmp/x.ts ${Q}`,
  `install -m 644 /tmp/x.ts ${Q}`,
  `truncate -s 0 ${Q}`,
  `dd if=/dev/zero of=${Q} bs=1 count=0`,
  `git checkout -- ${Q}`,
  `git checkout HEAD~1 -- ${Q}`,
  `git restore ${Q}`,
  `git restore --source HEAD~1 --worktree --staged ${Q}`,
  `git -C web restore src/lib/questions.ts`,
  `cd web && sed -i '' 's/a/b/' src/lib/questions.ts`,
  `cd web; echo x >> src/lib/questions.ts`,
  `sed -i '' 's/a/b/' web/src/lib/clinical/*.ts`,
  `echo $(sed -i '' s/a/b/ ${Q})`,
  `cat > ${Q} <<'EOF'\nexport const x = 1;\nEOF`,
  `FOO=1 sudo tee ${Q} < /tmp/x`,
  // Revue /code-review medium du 2026-10-22, un cas par constat corrigé.
  `echo $((1<<2))\nsed -i '' 's/a/b/' ${Q}`,
  `(( x = 1 << 2 )); echo x > ${Q}`,
  `cp ${Q}{.bak,}`,
  `echo x > web/src/lib/{questions,autre}.ts`,
  `sed -i '' 's/a/b/' web/src/lib/clin*/stopRulesV1.ts`,
  `timeout -s KILL 10 sed -i '' 's/a/b/' ${Q}`,
  `timeout -k 5 10 tee ${Q} < /tmp/x`,
  `(cd /tmp && true); sed -i '' 's/a/b/' ${Q}`,
  `rsync -e ssh /tmp/questions.ts web/src/lib/`,
  `rsync --exclude '*.log' /tmp/questions.ts web/src/lib/`,
  // Revue CodeRabbit #1643 : substitutions entre guillemets doubles.
  `echo "$(sed -i '' s/a/b/ ${Q})"`,
  "echo \"`tee " + Q + " < /tmp/x`\"",
  `cd web && echo "résultat : $(sed -i '' s/a/b/ src/lib/questions.ts)"`,
  `echo "$(sed -i 's/)/x/' ${Q})"`,
  `if true; then sed -i '' 's/a/b/' ${Q}; fi`,
  `for f in a; do sed -i '' 's/a/b/' ${Q}; done`,
  `{ sed -i '' 's/a/b/' ${Q}; }`,
  `! sed -i '' 's/a/b/' ${Q}`,
  `if true; then x=1; else cp /tmp/x.ts ${Q}; fi`,
]) {
  test(`forme reconnue, demande : ${commande.split("\n")[0]}`, () => {
    const { verdict, sortie } = jugement(commande);
    assert.equal(verdict, "demande", sortie);
    assert.match(sortie, /Écriture par commande Bash/);
    assert.match(sortie, /DC-17/);
  });
}

// ── Même verdict qu'Edit/Write ───────────────────────────────────────────────
for (const commande of [
  "echo SECRET=1 >> web/.env.local",
  "echo SECRET=1 > .env",
  "cd web && echo SECRET=1 > .env.production",
  "echo x > .git/info/exclude",
  "cp /tmp/x.js web/node_modules/paquet/index.js",
  // Le refus l'emporte sur une demande voisine de la même commande.
  `echo x > ${Q} && echo y > web/.env.local`,
]) {
  test(`refus, comme par Edit/Write : ${commande}`, () => {
    const { verdict, sortie } = jugement(commande);
    assert.equal(verdict, "refus", sortie);
    assert.match(sortie, /Action bloquée par WellNeuro/);
  });
}

test("Prisma : demande, motif Prisma (pas le motif clinique)", () => {
  const { verdict, sortie } = jugement("echo '-- x' >> web/prisma/schema.prisma");
  assert.equal(verdict, "demande");
  assert.match(sortie, /migration Prisma/);
  assert.doesNotMatch(sortie, /DC-17/);
});

test("table signée hors liste (marqueur sur disque) : demande", () => {
  const cible = "web/src/lib/clinical/catalogueConduitesV1.ts";
  assert.match(fs.readFileSync(path.join(racine, cible), "utf8"), /validationExterne: true/);
  const { verdict, sortie } = jugement(`sed -i '' 's/a/a/' ${cible}`);
  assert.equal(verdict, "demande", sortie);
  assert.match(sortie, /Table signée détectée/);
});

test("table signée NEUVE posée par heredoc : demande, comme son Write", () => {
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), "wn-t18-"));
  const marqueur = ["validation", "Externe: true"].join("");
  const { verdict, sortie } = jugement(
    `cat > ${dossier}/nouvelleTable.ts <<'EOF'\nexport const t = { ${marqueur} };\nEOF`
  );
  assert.equal(verdict, "demande", sortie);
  assert.match(sortie, /Table signée détectée/);
});

// ── Mentions par un interpréteur : demande, jamais refus ─────────────────────
for (const commande of [
  `python3 -c "open('${Q}','w').write('x')"`,
  `node -e "require('fs').writeFileSync('web/src/lib/clinical/stopRulesV1.ts','')"`,
  `python3 <<'EOF'\nopen('${Q}', 'w')\nEOF`,
  `cat <<'EOF' | python3\nopen('${Q}', 'w')\nEOF`,
  `bash -c "echo x > ${Q}"`,
  `cd web && npx tsx -e "require('fs').writeFileSync('src/lib/questions.ts','')"`,
  `python3 -c "open('web/.env.local','a')"`,
  `awk '{ print > "out" }' ${Q}`,
]) {
  test(`mention par un interpréteur, demande : ${commande.split("\n")[0]}`, () => {
    const { verdict, sortie } = jugement(commande);
    assert.equal(verdict, "demande", sortie);
    assert.match(sortie, /Commande d'interpréteur citant/);
  });
}

// Le `i` de `-MFile::Spec` ou de `-rfileutils` n'est pas `-i` : pas une
// écriture certaine (qui refuserait sur un `.env`), seulement une mention.
for (const commande of [`perl -MFile::Spec -e 1 ${Q}`, `ruby -rfileutils -e 'puts 1' ${Q}`]) {
  test(`option à argument, mention et non écriture : ${commande}`, () => {
    const { verdict, sortie } = jugement(commande);
    assert.equal(verdict, "demande", sortie);
    assert.doesNotMatch(sortie, /Écriture par commande Bash/);
    assert.equal(jugement(commande.replace(Q, "web/.env.local")).verdict, "demande");
  });
}

// ── Silence : lectures, prose, cibles libres ─────────────────────────────────
for (const commande of [
  `cat ${Q}`,
  `grep -n question ${Q}`,
  `sed -n 1,10p ${Q}`,
  `git diff ${Q}`,
  `git add ${Q}`,
  `git restore --staged ${Q}`,
  `git checkout ${Q.replace(/\//g, "-")}`,
  `cp ${Q} /tmp/copie.ts`,
  `echo x > /tmp/sortie.txt`,
  `ls > /dev/null 2>&1`,
  `ls 2>&-`,
  `ls >&2`,
  `echo "> ${Q}"`,
  `git commit -m "sed -i sur ${Q} && node x > ${Q}"`,
  `cat >> docs/claude/SESSION_LOG.md <<'EOF'\nsed -i '' 's/a/b/' ${Q}\npython3 -c "open('${Q}','w')"\nEOF`,
  `sed -i '' 's/a/b/' web/src/lib/clinical/stopRulesV1.test.ts`,
  `node --test .claude/hooks/*.test.mjs`,
  `cd web && npx vitest run src/lib/clinical/stopRulesV1.test.ts`,
  `node node_modules/.bin/vitest run`,
  `rm -rf web/.next`,
  `echo x >> docs/claude/SESSION_LOG.md`,
  // Revue du 2026-10-22 : lectures prises à tort pour des écritures.
  `awk '{ print $1 }' ${Q}`,
  `sed -E -n 's/a/b/p' ${Q}`,
  `(cd web && sed -i '' 's/a/b/' ../README.md); cat ${Q}`,
  // Le marqueur cité par une commande VOISINE n'est pas le contenu du fichier.
  `git commit -m "${["validation", "Externe: true"].join("")}" && echo ok > /tmp/sortie.json`,
]) {
  test(`silence : ${commande.split("\n")[0]}`, () => {
    const { verdict, sortie } = jugement(commande);
    assert.equal(verdict, "passe", sortie);
  });
}

test("arithmétique entre guillemets doubles : pas un heredoc, la suite reste jugée", () => {
  assert.equal(jugement(`echo "$((1<<2))"\nls`).verdict, "passe");
  assert.equal(jugement(`echo "$((1<<2))"\necho x > ${Q}`).verdict, "demande");
});

test("accolades en cascade : borne tenue, verdict rendu sans exploser", () => {
  const cascade = "{a,b}".repeat(40);
  const debut = Date.now();
  const { verdict } = jugement(`node -e "x" ${cascade} && echo x > ${Q}`);
  assert.equal(verdict, "demande");
  assert.ok(Date.now() - debut < 5000, `trop lent : ${Date.now() - debut} ms`);
});

// ── Trous ASSUMÉS (hooks-garde-fous.md) : épinglés, pas promis ───────────────
// Le jour où l'un d'eux est couvert, ce test rougit et la doc se met à jour.
for (const commande of [
  `rm ${Q}`,
  `mv ${Q} /tmp/ailleurs.ts`,
  `F=${Q}; echo x > $F`,
  `git apply /tmp/correctif.patch`,
  `npm run format`,
  `find web/src/lib -name questions.ts -exec sed -i '' 's/a/b/' {} +`,
  `grep -l x ${Q} | xargs sed -i '' 's/a/b/'`,
  `git checkout -- web/src/lib/`,
  `git checkout origin/main`,
  `git stash pop`,
]) {
  test(`trou assumé, silence documenté : ${commande}`, () => {
    assert.equal(jugement(commande).verdict, "passe");
  });
}

// ── Câblage : le crochet est armé sur les DEUX outils ────────────────────────
test("settings.json arme protect-wellneuro-files.mjs sur Edit|Write ET sur Bash", () => {
  const settings = JSON.parse(fs.readFileSync(path.join(racine, ".claude", "settings.json"), "utf8"));
  const armes = (settings.hooks.PreToolUse || [])
    .filter((bloc) => (bloc.hooks || []).some((h) => h.command.includes("protect-wellneuro-files.mjs")))
    .map((bloc) => bloc.matcher);
  assert.ok(armes.includes("Edit|Write"), armes.join(", "));
  assert.ok(armes.includes("Bash"), armes.join(", "));
});
