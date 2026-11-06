// Contrôle d'une classe de défaut qui s'est produite trois fois : un garde
// **bloquant en CI** qu'aucun palier local n'exécute.
//
// C'est l'histoire du lint (résolue le 2026-07-21 : le CI le lançait,
// `npm run check` non, et une PR verte en local cassait en CI), puis celle des
// sept bancs d'outillage câblés en CI le 2026-08-03 et laissés hors de `check`
// le lendemain, puis celle de l'anti-secrets — `check` n'en faisait que la
// passe `--staged` quand le CI scanne le dépôt entier. Un palier qui ne couvre
// pas ce que le CI vérifie ne protège de rien : il rend vert, et le CI rouge.
//
// La règle gardée ici, et rien d'autre : **tout ce que le job `verify` exécute
// AVANT d'installer npm doit être atteignable depuis `npm run check`.** Ce
// découpage n'est pas arbitraire — ces étapes-là ne demandent que `node`, `git`
// et `bash`, elles coûtent quelques secondes, et rien ne justifie qu'un
// développeur les découvre en CI. Ce qui vient après (build, Prisma, E2E) a
// ses propres paliers, T2 et T3.
//
// Ce contrôle ne dit pas si un garde est bon, et il n'est pas symétrique : il
// vérifie que **tout ce que le CI exécute avant npm est atteignable depuis
// `check`**, pas l'inverse. `check` peut légitimement en faire plus (lint,
// type-check, Vitest…). Dire « une étape ajoutée d'un seul côté » serait donc
// promettre une propriété que ce banc n'a pas.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const CI = path.join(RACINE, ".github/workflows/ci.yml");
const PACKAGE = path.join(RACINE, "web/package.json");

/**
 * Les commandes `node`/`bash` du job `verify` exécutées AVANT
 * `actions/setup-node` — c'est-à-dire celles qui ne demandent ni `npm ci` ni
 * build.
 *
 * Deux formes sont lues, et c'est un correctif de revue du 2026-08-04. La
 * première version ne lisait que le `run:` d'une seule ligne : un garde
 * bloquant écrit en bloc `run: |` multi-ligne sortait **silencieusement** de la
 * liste attendue, et la parité restait verte. C'est une donnée d'entrée — la
 * forme d'écriture du YAML — qui décidait de ce qui est contrôlé, la classe de
 * défaut la plus répétée de ce dépôt. Le seul bloc multi-ligne d'aujourd'hui
 * (le calcul du périmètre du diff) n'appelle ni `node` ni `bash` ; le jour où
 * un bloc en appellera un, il entrera dans la liste comme les autres, et sa
 * présence dans `check` sera exigée. Si cet appel-là n'a rien d'un garde, le
 * remède est de le sortir du bloc, pas d'élargir ce filtre.
 */
export function commandesCiAvantNpm(yml) {
  const lignes = yml.split(/\r?\n/);
  const setup = lignes.findIndex((l) => /^\s*-\s*uses:\s*actions\/setup-node@/.test(l));
  assert.ok(setup > 0, "étape `actions/setup-node` introuvable — le découpage du job a changé");
  return commandesNodeBash(lignes.slice(0, setup));
}

/** Les appels `node`/`bash` d'une suite de lignes, en `run:` simple ou en bloc. */
function commandesNodeBash(lignesLues) {
  const commandes = [];
  // Indentation du `run: |` en cours, ou `null` hors bloc. Un bloc scalaire
  // YAML court jusqu'à la première ligne non vide moins indentée que lui.
  let blocIndentation = null;
  for (const ligne of lignesLues) {
    if (blocIndentation !== null) {
      const indentation = /^[ \t]*/.exec(ligne)[0].length;
      if (ligne.trim() !== "" && indentation <= blocIndentation) blocIndentation = null;
      else {
        const m = /^\s*(node|bash)\s+(.*\S)\s*$/.exec(ligne);
        if (m) commandes.push(`${m[1]} ${m[2]}`.replace(/\s+/g, " "));
        continue;
      }
    }
    const bloc = /^(\s*)(?:-\s+)?run:\s*[|>][-+]?\s*$/.exec(ligne);
    if (bloc) {
      blocIndentation = bloc[1].length;
      continue;
    }
    const m = /^\s*(?:-\s+)?run:\s+(node|bash)\s+(.*\S)\s*$/.exec(ligne);
    if (!m) continue;
    commandes.push(`${m[1]} ${m[2]}`.replace(/\s+/g, " "));
  }
  return commandes;
}

/**
 * Ce que `commandesCiAvantNpm` ne voit pas : les autres jobs. Elle ne lit que
 * ce qui précède le PREMIER `setup-node` du fichier, celui de `controles`.
 * Depuis le découpage du 2026-10-27 (H91, temps 1), une étape node posée avant
 * le `setup-node` de `typage-tests` ou d'`e2e` échapperait donc à la parité —
 * dette routée par la revue `wn-reviewer` du temps 1.
 *
 * Le remède est un refus, pas un élargissement de la lecture : dans un job
 * autre que `controles`, aucune étape `run:` avant `setup-node` — les bancs
 * node vivent dans `controles`, que la parité lit. Seule exception, l'étape du
 * périmètre, partagée par l'alias `*perimetre`. Tout autre alias est refusé :
 * son contenu vit ailleurs dans le fichier, et ce banc ne le verrait pas.
 *
 * Un job sans `setup-node` (`verify`) n'a pas d'« avant » : il tourne entier
 * sur le Node préinstallé du runner. Ses blocs de shell restent admis, mais un
 * appel `node` ou `bash` y est refusé, pour la même raison qu'ailleurs.
 *
 * Rend les étapes fautives de chaque job autre que `controles`, sous la forme
 * `job : ligne`.
 */
export function etapesHorsParite(yml) {
  const lignes = yml.split(/\r?\n/);
  const debutJobs = lignes.findIndex((l) => /^jobs:\s*$/.test(l));
  assert.ok(debutJobs >= 0, "section `jobs:` introuvable");
  const entetes = [];
  lignes.forEach((l, i) => {
    // Un commentaire en fin d'en-tête ne doit pas rattacher le job au précédent.
    const m = /^  ([a-z0-9_-]+):\s*(?:#.*)?$/.exec(l);
    if (i > debutJobs && m) entetes.push({ job: m[1], debut: i });
  });
  const fautes = [];
  entetes.forEach(({ job, debut }, k) => {
    if (job === "controles") return;
    const corps = lignes.slice(debut + 1, k + 1 < entetes.length ? entetes[k + 1].debut : lignes.length);
    const setup = corps.findIndex((l) => /^\s*-\s*uses:\s*actions\/setup-node@/.test(l));
    if (setup < 0) {
      for (const c of commandesNodeBash(corps)) fautes.push(`${job} : ${c}`);
      return;
    }
    for (const l of corps.slice(0, setup)) {
      const t = l.trim();
      if (/^(?:-\s+)?run:/.test(t)) fautes.push(`${job} : ${t}`);
      else if (/^-\s+\*/.test(t) && t !== "- *perimetre") fautes.push(`${job} : ${t}`);
      // Une action locale peut lancer `node` sans `run:` visible ici.
      else if (/^(?:-\s+)?uses:\s*\.\//.test(t)) fautes.push(`${job} : ${t}`);
    }
  });
  return fautes;
}

/**
 * `check` développé : les `npm run x` remplacés par leur contenu, récursivement.
 *
 * Le refus porte sur un **cycle**, pas sur une seconde visite : ce qui interdit
 * de développer, c'est de retomber sur un script déjà ouvert PLUS HAUT dans la
 * même branche. Un ensemble de scripts en diamant — deux scripts appelant un
 * même troisième — est parfaitement légal et se développe deux fois. La version
 * à `Set` partagé sur toute la récursion confondait les deux et aurait fait
 * échouer le banc sur un faux « cycle ».
 */
export function developper(scripts, nom = "check", pile = []) {
  assert.ok(scripts[nom], `script npm absent : ${nom}`);
  assert.ok(!pile.includes(nom), `cycle de scripts npm : ${[...pile, nom].join(" → ")}`);
  const chemin = [...pile, nom];
  return scripts[nom].replace(/npm run ([A-Za-z0-9:_-]+)/g, (_, n) => developper(scripts, n, chemin));
}

/**
 * Les commandes atteignables depuis `check`, une par élément. Les chemins sont
 * ramenés à la racine du dépôt : `check` tourne depuis `web/` et écrit donc
 * `../scripts/…`, le CI depuis la racine et écrit `scripts/…`.
 */
export function commandesDeCheck(scripts) {
  return developper(scripts)
    .split("&&")
    .map((c) => c.trim().replace(/\.\.\//g, "").replace(/\s+/g, " "))
    .filter((c) => c !== "" && c !== "cd ..");
}

const yml = fs.readFileSync(CI, "utf8");
const scripts = JSON.parse(fs.readFileSync(PACKAGE, "utf8")).scripts;
const attendues = commandesCiAvantNpm(yml);
const disponibles = commandesDeCheck(scripts);

test("le découpage tient : le CI a bien des gardes avant npm", () => {
  // Un banc qui n'a rien à comparer serait vert sans objet — même refus que
  // les gardes qu'il surveille.
  assert.ok(attendues.length >= 8, `seulement ${attendues.length} commandes lues dans ${CI}`);
  assert.ok(disponibles.length >= 8, `seulement ${disponibles.length} commandes lues dans check`);
});

for (const commande of attendues) {
  const banc = /^node --test (.+)$/.exec(commande);
  if (banc) {
    // `node --test a.mjs b.mjs` en CI, un seul appel groupé côté `check` : ce
    // qui compte est que le FICHIER soit exécuté, pas la forme de l'appel.
    for (const fichier of banc[1].split(" ").filter((a) => !a.startsWith("-"))) {
      test(`\`npm run check\` exécute le banc ${fichier}`, () => {
        const trouve = disponibles.some(
          (c) => c.startsWith("node --test ") && c.split(" ").includes(fichier),
        );
        assert.ok(
          trouve,
          `${fichier} est bloquant en CI et n'est lancé par aucun palier local — ` +
            `c'est la leçon du lint, à l'identique.`,
        );
      });
    }
    continue;
  }
  test(`\`npm run check\` exécute ${commande}`, () => {
    assert.ok(
      disponibles.includes(commande),
      `« ${commande} » est bloquant en CI et absent de check.\n` +
        `Commandes de check : ${disponibles.join(" · ")}`,
    );
  });
}

// ── La dérivation elle-même, éprouvée sur un YAML fabriqué ──────────────────
//
// Ce qui suit ne contrôle plus la parité mais l'INSTRUMENT qui la mesure : une
// liste `attendues` incomplète rend le banc vert sans rien avoir comparé, et
// c'est exactement la classe de défaut que ce fichier est censé fermer.

const YAML_BLOC = `jobs:
  verify:
    steps:
      - name: Périmètre du diff
        run: |
          if [ -z "$base" ]; then
            echo "docs_only=false" >> "$GITHUB_OUTPUT"
          fi
      - name: Un futur garde écrit en bloc
        run: |
          node scripts/futur-garde.mjs --strict
          bash scripts/futur-garde.sh
      - name: Un garde d'une seule ligne
        run: node scripts/garde-simple.mjs
      - uses: actions/setup-node@v4
      - name: Après npm, hors périmètre
        run: |
          node scripts/apres-npm.mjs
`;

test("un garde écrit en bloc `run: |` avant setup-node entre dans la liste attendue", () => {
  // Le cas négatif de la dérivation : avec l'ancienne lecture — le seul `run:`
  // d'une ligne —, ces deux commandes sortaient SILENCIEUSEMENT du périmètre,
  // et une étape bloquante absente de `check` restait verte.
  const lues = commandesCiAvantNpm(YAML_BLOC);
  assert.deepEqual(lues, [
    "node scripts/futur-garde.mjs --strict",
    "bash scripts/futur-garde.sh",
    "node scripts/garde-simple.mjs",
  ]);
});

test("la dérivation s'arrête à setup-node et ne remonte pas le shell des blocs", () => {
  const lues = commandesCiAvantNpm(YAML_BLOC);
  assert.equal(
    lues.some((c) => c.includes("apres-npm")),
    false,
    "une étape postérieure à setup-node a ses propres paliers (T2/T3)",
  );
  assert.equal(
    lues.some((c) => c.includes("echo") || c.includes("GITHUB_OUTPUT")),
    false,
    "le shell d'un bloc n'est pas une commande gardée",
  );
});

test("une étape bloquante en bloc, absente de `check`, fait échouer la comparaison", () => {
  // La morsure, jouée sur les mêmes données que le banc réel : la commande est
  // lue côté CI et introuvable côté `check`.
  const attenduesFabriquees = commandesCiAvantNpm(YAML_BLOC);
  const disponiblesFabriquees = commandesDeCheck({ check: "node scripts/garde-simple.mjs" });
  const manquantes = attenduesFabriquees.filter((c) => !disponiblesFabriquees.includes(c));
  assert.deepEqual(manquantes, [
    "node scripts/futur-garde.mjs --strict",
    "bash scripts/futur-garde.sh",
  ]);
});

test("le bloc réel du CI n'introduit aucune commande node/bash aujourd'hui", () => {
  // Le calcul du périmètre du diff ne garde rien, il décide d'un `if`. Si un
  // jour il appelle `node` ou `bash`, ce test-ci ne bouge pas — mais la
  // commande devient exigible dans `check`, ce qui est le comportement voulu.
  assert.deepEqual(
    attendues.filter((c) => /GITHUB_OUTPUT|docs_only/.test(c)),
    [],
  );
});

// ── Les autres jobs : rien avant leur `setup-node`, hors périmètre ──────────

const YAML_JOBS = `jobs:
  controles:
    steps:
      - &perimetre
        name: Périmètre du diff
        run: |
          echo "docs_only=false" >> "$GITHUB_OUTPUT"
      - name: Banc de controles, lu par la parité
        run: node --test scripts/banc.test.mjs
      - uses: actions/setup-node@v4
  typage-tests:
    steps:
      - uses: actions/checkout@v4
      - *perimetre
      - name: Banc glissé avant setup-node
        run: node --test scripts/glisse.test.mjs
      - name: Bloc glissé avant setup-node
        run: |
          bash scripts/glisse.sh
      - uses: actions/setup-node@v4
      - name: Après setup-node, hors périmètre
        run: npx tsc --noEmit
  e2e:
    steps:
      - uses: actions/checkout@v4
      - *perimetre
      - *autre_ancre
      - uses: ./.github/actions/locale
      - uses: actions/setup-node@v4
  nouveau: # job commenté en en-tête
    steps:
      - name: Banc d'un job neuf
        run: node scripts/glisse-nouveau.mjs
      - uses: actions/setup-node@v4
  verify:
    needs: [controles, typage-tests, e2e]
    steps:
      - name: Agrégateur, sans setup-node
        run: |
          test "\${{ needs.e2e.result }}" = success
      - name: Garde glissé dans un job sans setup-node
        run: node scripts/glisse-verify.mjs
`;

test("une étape `run:` avant le setup-node d'un autre job que `controles` est refusée", () => {
  // La morsure de la dette : la parité ne lit que `controles`, ces étapes-là
  // tournaient en CI sans qu'aucun palier local ne les exige.
  assert.deepEqual(etapesHorsParite(YAML_JOBS), [
    "typage-tests : run: node --test scripts/glisse.test.mjs",
    "typage-tests : run: |",
    "e2e : - *autre_ancre",
    "e2e : - uses: ./.github/actions/locale",
    "nouveau : run: node scripts/glisse-nouveau.mjs",
    "verify : node scripts/glisse-verify.mjs",
  ]);
});

test("le périmètre, `controles` et ce qui suit setup-node restent admis", () => {
  const fautes = etapesHorsParite(YAML_JOBS).join("\n");
  assert.equal(/perimetre|banc\.test|tsc|needs\.e2e/.test(fautes), false, fautes);
});

test("aucun autre job du CI réel n'a d'étape avant son setup-node", () => {
  // Un banc qui ne trouverait aucun job à examiner serait vert sans objet.
  const examines = [...yml.matchAll(/^  ([a-z0-9_-]+):\s*$/gm)].map((m) => m[1]);
  for (const job of ["controles", "typage-tests", "e2e", "verify"]) {
    assert.ok(examines.includes(job), `job ${job} introuvable dans ${CI}`);
  }
  assert.deepEqual(etapesHorsParite(yml), []);
});

test("developper distingue un diamant d'un cycle", () => {
  // Deux scripts appelant un même troisième : légal, développé deux fois.
  const diamant = {
    check: "npm run a && npm run b",
    a: "npm run c",
    b: "npm run c",
    c: "node scripts/c.mjs",
  };
  assert.equal(developper(diamant), "node scripts/c.mjs && node scripts/c.mjs");
  // Un vrai cycle, lui, reste refusé.
  assert.throws(() => developper({ check: "npm run a", a: "npm run check" }), /cycle de scripts npm/);
  assert.throws(() => developper({ check: "npm run absent" }), /script npm absent/);
});

// La liste des codes de `wn-campaign-audit` vit en DEUX exemplaires — `ci.yml`
// et `web/package.json`. On ne peut pas la factoriser proprement : un job
// GitHub Actions ne lit pas `package.json` sans étape supplémentaire, et
// déplacer la liste dans le script en ferait un défaut par défaut, invisible.
// À défaut de source unique, la dérive est rendue bruyante — c'est la même
// réponse que pour `docs/DECISIONS.md` : ne pas supprimer le doublon, le
// rendre impossible à manquer.
test("les codes bloquants de wn-campaign-audit sont identiques des deux côtés", () => {
  const codes = (texte) => {
    const m = /--fail-on-warning-codes\s+([a-z_,]+)/.exec(texte);
    return m ? m[1].split(",").sort() : null;
  };
  const cotéCi = codes(yml);
  const cotéNpm = codes(scripts["campaign-audit-check"] || "");
  assert.ok(cotéCi && cotéCi.length > 0, "liste de codes introuvable dans ci.yml");
  assert.deepEqual(cotéNpm, cotéCi);
});
