// Banc du découpage du registre (D-418 §3) : `scripts/wn-decisions-decouper.mjs`.
//
// Ce qu'il prouve :
//   - la concaténation des fichiers rend le registre d'origine, aux titres
//     près, et aux liens près une fois leurs cibles résolues ;
//   - chaque lien réécrit désigne la même ressource qu'avant, et rien d'écrit
//     depuis la racine, ni rien dans du code, ne bouge ;
//   - aucune entrée n'est perdue ni dupliquée ;
//   - le script se rejoue (sur un `main` plus récent) et refuse ce qu'il ne
//     comprend pas, sans rien écrire.
// Puis, tant que la base de la PR porte encore le registre unique, la même
// épreuve sur le registre réel : c'est la preuve de la bascule elle-même.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  analyserArguments,
  decouperRegistre,
  ecrireDecoupage,
  estRelativeAuFichier,
  principal,
  rebaserLiens,
  resoudre,
  verifierDecoupage,
  versEntree,
  versFichier,
} from "./wn-decisions-decouper.mjs";

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const REGISTRE = [
  "# Registre des décisions Wellneuro",
  "",
  "> Append-only.",
  "",
  "## Décisions actives",
  "",
  "### D-004 — La plus récente",
  "",
  "- Date : 2026-11-05",
  "- Référence : [route](../web/src/a.ts#L12), [lot](claude/campagnes/x/LOT-01.md), [frag](changelog.d/2026-08-04-x.md)",
  "- Ancre : [« texte cité »](web/src/a.ts), [doc](docs/claude/b.md), [ci](.github/workflows/ci.yml)",
  "- Exemple : `[« texte exact »](chemin)` et `[x](../web/dans-du-code.ts)`, [url](https://example.invalid/a/b)",
  "",
  "## Un sous-titre de corps",
  "",
  "```",
  "[bloc](../web/dans-un-bloc.ts)",
  "```",
  "### D-003 — Collée à la précédente, sans ligne vide",
  "",
  "- Date : 2026-11-04",
  "",
  "",
  "### D-002 — Deux lignes vides avant la suivante",
  "",
  "Voir [[D-001]].",
  "",
  "## Décisions archivées",
  "",
  "> Les décisions anciennes sont versionnées ailleurs.",
  "",
  "### D-001 — Archivée",
  "",
  "- Lien : [x](../scripts/y.mjs)",
  "",
].join("\n");

function avecDepot(corps) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "wn-decouper-"));
  try {
    return corps(tmp);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

const lireDepuis = (racine) => (chemin) => {
  const absolu = path.join(racine, chemin);
  return fs.existsSync(absolu) ? fs.readFileSync(absolu, "utf8") : null;
};

// ── Les liens ───────────────────────────────────────────────────────────────

test("estRelativeAuFichier : ../, claude/ oui ; racine (changelog.d/ compris), URL, ancre, mot seul non", () => {
  for (const c of ["../web/a.ts", "claude/x.md", "./a/b.md"]) assert.equal(estRelativeAuFichier(c), true, c);
  for (const c of ["web/a.ts", "docs/a.md", "scripts/a.mjs", "prisma/a", "changelog.d/x.md", ".claude/a", ".github/a.yml", "https://x/y", "#ancre", "/abs/x", "chemin", "…"]) {
    assert.equal(estRelativeAuFichier(c), false, c);
  }
});

test("rebaserLiens : la cible recalculée désigne la même ressource, fragment compris", () => {
  const { texte, liens } = rebaserLiens("[a](../web/a.ts#L3) [b](claude/b.md) [c](web/c.ts)", "docs", "docs/decisions");
  assert.equal(texte, "[a](../../web/a.ts#L3) [b](../claude/b.md) [c](web/c.ts)");
  assert.deepEqual(liens.map((l) => l.apres), ["../../web/a.ts#L3", "../claude/b.md"]);
  for (const l of liens) assert.equal(resoudre("docs/decisions", l.apres), resoudre("docs", l.avant));
  const archive = rebaserLiens("[a](../web/a.ts)", "docs", "docs/decisions/archivees");
  assert.equal(archive.texte, "[a](../../../web/a.ts)");
});

test("rebaserLiens : rien ne bouge dans un segment ou un bloc de code", () => {
  const source = "`[x](../web/a.ts)` puis\n```\n[y](../web/b.ts)\n```\n``[z](../web/c.ts)``";
  assert.equal(rebaserLiens(source, "docs", "docs/decisions").texte, source);
});

// ── Le découpage ────────────────────────────────────────────────────────────

test("decouperRegistre : chaque entrée, à sa section, sans ses lignes vides finales", () => {
  const { entrees, horsEntrees } = decouperRegistre(REGISTRE);
  assert.deepEqual(entrees.map((e) => [e.id, e.section]), [
    ["D-004", "actives"],
    ["D-003", "actives"],
    ["D-002", "actives"],
    ["D-001", "archivées"],
  ]);
  assert.ok(entrees[0].texte.endsWith("```"), "un sous-titre ## de corps reste dans son entrée");
  assert.ok(entrees[0].texte.includes("## Un sous-titre de corps"));
  assert.ok(entrees[1].texte.endsWith("- Date : 2026-11-04"));
  assert.ok(horsEntrees.includes("> Les décisions anciennes sont versionnées ailleurs."));
});

test("decouperRegistre : un numéro porté deux fois est refusé, jamais découpé", () => {
  assert.throws(() => decouperRegistre(REGISTRE.replace("### D-003", "### D-004")), /D-004 porté par deux entrées/);
});

test("decouperRegistre : une entrée avant la section active, ou des fins CRLF, sont refusées", () => {
  assert.throws(() => decouperRegistre("### D-001 — x\n## Décisions actives\n"), /précède la section active/);
  assert.throws(() => decouperRegistre(REGISTRE.replace(/\n/g, "\r\n")), /CRLF/);
});

test("versFichier puis versEntree : aller-retour exact, titre # et liens rebasés", () => {
  for (const e of decouperRegistre(REGISTRE).entrees) {
    const f = versFichier(e);
    assert.match(f.contenu, new RegExp(`^# ${e.id} — `));
    assert.ok(f.contenu.endsWith("\n") && !f.contenu.endsWith("\n\n"), `${e.id} finit par un seul saut de ligne`);
    assert.equal(versEntree(f.chemin, f.contenu), e.texte);
  }
  const [d4] = decouperRegistre(REGISTRE).entrees;
  const f4 = versFichier(d4);
  assert.equal(f4.chemin, "docs/decisions/D-004.md");
  assert.ok(f4.contenu.includes("[route](../../web/src/a.ts#L12)"));
  assert.ok(f4.contenu.includes("[« texte cité »](web/src/a.ts)"), "une ancre écrite depuis la racine ne bouge pas");
  assert.ok(f4.contenu.includes("`[x](../web/dans-du-code.ts)`"));
  assert.ok(f4.contenu.includes("[bloc](../web/dans-un-bloc.ts)"));
  assert.equal(f4.liens.length, 2);
  assert.ok(f4.contenu.includes("[frag](changelog.d/2026-08-04-x.md)"), "changelog.d/ est écrit depuis la racine : inchangé");
  const d1 = versFichier(decouperRegistre(REGISTRE).entrees[3]);
  assert.equal(d1.chemin, "docs/decisions/archivees/D-001.md");
  assert.ok(d1.contenu.includes("[x](../../../scripts/y.mjs)"));
});

test("écriture puis banc : vert, et chaque défaut planté le fait rougir", () => {
  avecDepot((tmp) => {
    const bilan = ecrireDecoupage(tmp, REGISTRE);
    assert.equal(bilan.creees.length, 4);
    const lire = lireDepuis(tmp);
    const sain = verifierDecoupage(REGISTRE, lire);
    assert.deepEqual(sain.fautes, []);
    assert.equal(sain.entrees, 4);
    assert.equal(sain.liens, 3);

    const d3 = path.join(tmp, "docs/decisions/D-003.md");
    const texteD3 = fs.readFileSync(d3, "utf8");

    fs.rmSync(d3);
    assert.match(verifierDecoupage(REGISTRE, lire).fautes.join("\n"), /D-003 : docs\/decisions\/D-003\.md absent/);

    fs.writeFileSync(d3, texteD3.replace("2026-11-04", "2026-11-03"));
    assert.match(verifierDecoupage(REGISTRE, lire).fautes.join("\n"), /D-003 : .* ne rend pas l'entrée/);
    fs.writeFileSync(d3, texteD3);

    fs.mkdirSync(path.join(tmp, "docs/decisions/archivees"), { recursive: true });
    fs.writeFileSync(path.join(tmp, "docs/decisions/archivees/D-003.md"), texteD3);
    assert.match(verifierDecoupage(REGISTRE, lire).fautes.join("\n"), /D-003 : présent aussi en .*archivees\/D-003\.md \(doublon\)/);
    fs.rmSync(path.join(tmp, "docs/decisions/archivees/D-003.md"));

    const d4 = path.join(tmp, "docs/decisions/D-004.md");
    fs.writeFileSync(d4, fs.readFileSync(d4, "utf8").replace("../../web/src/a.ts#L12", "../web/src/a.ts#L12"));
    assert.match(verifierDecoupage(REGISTRE, lire).fautes.join("\n"), /D-004 : .* ne rend pas l'entrée/);
  });
});

test("banc : la contre-épreuve sans rebaserLiens voit un mot changé et une cible racine rebasée", () => {
  // Un défaut SYMÉTRIQUE de rebaserLiens passerait l'aller-retour : la
  // contre-épreuve masque les cibles et compare le reste, puis exige qu'une
  // cible changée ait été relative au fichier (revue wn-reviewer de t58, R3).
  const fichiers = new Map(decouperRegistre(REGISTRE).entrees.map((e) => versFichier(e)).map((f) => [f.chemin, f.contenu]));
  const chemin = "docs/decisions/D-004.md";
  const contenu = fichiers.get(chemin);
  const fautes = (texte) => verifierDecoupage(REGISTRE, (c) => (c === chemin ? texte : fichiers.get(c) ?? null)).fautes.join("\n");
  assert.equal(fautes(contenu), "");
  assert.match(fautes(contenu.replace("La plus récente", "La plus recente")), /D-004 : un texte hors cible de lien a changé/);
  assert.match(fautes(contenu.replace("[« texte cité »](web/src/a.ts)", "[« texte cité »](../../web/src/a.ts)")), /D-004 : la cible web\/src\/a\.ts, écrite depuis la racine, a changé/);
});

test("banc : un texte de décision hors de toute entrée est une faute (entrée perdue)", () => {
  const perdu = REGISTRE.replace("## Décisions actives\n", "## Décisions actives\n\nUn paragraphe orphelin.\n");
  avecDepot((tmp) => {
    ecrireDecoupage(tmp, perdu);
    assert.match(verifierDecoupage(perdu, lireDepuis(tmp)).fautes.join("\n"), /hors de toute entrée : « Un paragraphe orphelin/);
  });
});

test("rejeu : sur un registre plus récent, nouvelle entrée créée, amendement réécrit, inconnus laissés", () => {
  avecDepot((tmp) => {
    ecrireDecoupage(tmp, REGISTRE);
    fs.writeFileSync(path.join(tmp, "docs/decisions/D-010.md"), "# D-010 — posée après la bascule\n");
    const plusRecent = REGISTRE.replace("## Décisions actives\n\n", "## Décisions actives\n\n### D-005 — Ajoutée entre-temps\n\n- Date : 2026-11-06\n\n").replace(
      "Voir [[D-001]].",
      "Voir [[D-001]].\n\n**Amendement du 2026-11-06.** Un paragraphe daté.",
    );
    const bilan = ecrireDecoupage(tmp, plusRecent);
    assert.deepEqual(bilan.creees, ["D-005"]);
    assert.deepEqual(bilan.modifiees, ["D-002"]);
    assert.deepEqual(bilan.inchangees.sort(), ["D-001", "D-003", "D-004"]);
    assert.ok(fs.existsSync(path.join(tmp, "docs/decisions/D-010.md")), "un fichier que le registre ne connaît pas reste");
    assert.deepEqual(verifierDecoupage(plusRecent, lireDepuis(tmp)).fautes, []);
  });
});

test("rejeu : une décision passée aux archives quitte docs/decisions/", () => {
  avecDepot((tmp) => {
    ecrireDecoupage(tmp, REGISTRE);
    const archivee = REGISTRE.replace(/### D-003[^]*?(?=### D-002)/, "").replace("### D-001 — Archivée", "### D-003 — Collée à la précédente, sans ligne vide\n\n- Date : 2026-11-04\n\n### D-001 — Archivée");
    const bilan = ecrireDecoupage(tmp, archivee);
    assert.deepEqual(bilan.deplacees, ["D-003"]);
    assert.ok(!fs.existsSync(path.join(tmp, "docs/decisions/D-003.md")));
    assert.ok(fs.existsSync(path.join(tmp, "docs/decisions/archivees/D-003.md")));
    assert.deepEqual(verifierDecoupage(archivee, lireDepuis(tmp)).fautes, []);
  });
});

test("arguments : une source et une seule ; tout argument inconnu refusé, rien écrit", () => {
  assert.deepEqual(analyserArguments(["--depuis", "origin/main"]), { verifier: false, depuis: "origin/main" });
  assert.deepEqual(analyserArguments(["--fichier", "r.md", "--verifier"]), { verifier: true, fichier: "r.md" });
  for (const argv of [[], ["--depuis"], ["--depuis", "a", "--fichier", "b"], ["--dry-run", "--depuis", "a"], ["origin/main"]]) {
    assert.ok("erreur" in analyserArguments(argv), JSON.stringify(argv));
  }
  avecDepot((tmp) => {
    fs.writeFileSync(path.join(tmp, "r.md"), REGISTRE);
    const sortieErreur = console.error;
    console.error = () => {};
    try {
      assert.equal(principal(["--fichier", "r.md", "--force"], tmp), 2);
    } finally {
      console.error = sortieErreur;
    }
    assert.ok(!fs.existsSync(path.join(tmp, "docs/decisions")), "un refus d'arguments n'écrit rien");
  });
});

test("--verifier n'écrit rien et rougit sur un découpage absent", () => {
  avecDepot((tmp) => {
    fs.writeFileSync(path.join(tmp, "r.md"), REGISTRE);
    const [log, err] = [console.log, console.error];
    console.log = () => {};
    console.error = () => {};
    try {
      assert.equal(principal(["--fichier", "r.md", "--verifier"], tmp), 1);
      assert.ok(!fs.existsSync(path.join(tmp, "docs/decisions")));
      assert.equal(principal(["--fichier", "r.md"], tmp), 0);
      assert.equal(principal(["--fichier", "r.md", "--verifier"], tmp), 0);
    } finally {
      [console.log, console.error] = [log, err];
    }
  });
});

// ── Le registre réel ────────────────────────────────────────────────────────
//
// Tant que la base de la PR porte le registre unique (la PR de bascule, ou une
// branche partie avant), le découpage du dépôt se juge contre lui, entrée par
// entrée. Après la bascule, la base n'a plus de registre unique : l'épreuve est
// sans objet, et le dit.

function registreUniqueDeLaBase() {
  const git = (...a) => execFileSync("git", a, { cwd: RACINE, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 64 * 1024 * 1024 });
  const candidats = [];
  if (process.env.GITHUB_EVENT_NAME === "pull_request") candidats.push("HEAD^1");
  try {
    candidats.push(git("merge-base", "HEAD", "origin/main").trim());
  } catch {
    // pas d'origin/main : rien à essayer de plus
  }
  for (const ref of candidats) {
    try {
      const texte = git("show", `${ref}:docs/DECISIONS.md`);
      if (/^### D-\d+/m.test(texte)) return { ref, texte };
    } catch {
      // base illisible : candidat suivant
    }
  }
  return null;
}

test("registre réel : le découpage du dépôt rend le registre unique de la base, entrée par entrée", (t) => {
  const base = registreUniqueDeLaBase();
  if (base === null) {
    t.skip("la base ne porte plus de registre unique (bascule de D-418 mergée) : épreuve sans objet");
    return;
  }
  const { fautes, entrees } = verifierDecoupage(base.texte, lireDepuis(RACINE));
  assert.deepEqual(fautes, [], `contre ${base.ref} — rejouer : node scripts/wn-decisions-decouper.mjs --depuis origin/main`);
  assert.ok(entrees >= 442, `${entrees} entrées seulement`);
});
