// Banc de `scripts/lib/plan-journal-rubriques.mjs` et de
// `scripts/wn-plan-journal-rubriques.mjs` (D-502 §4, Q3 bis ; D-325 §5).
//
// Fixtures NEUTRES : identifiants fictifs (`0000-00n`), aucun texte de claim,
// et AUCUN nom de rubrique écrit ici — chaque nom se fabrique à l'exécution
// depuis la liste fermée lue dans le code. Tout se joue en mémoire ou dans
// un dossier temporaire : le dépôt n'est jamais écrit.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { JOURNAL } from "./plan-journal.mjs";
import {
  codesDepuisSource,
  compterAssociations,
  FENETRE,
  jugerJournal,
  lignesEnCause,
  lireRubriques,
  racinesDesCodes,
  SOURCE_RUBRIQUES,
} from "./plan-journal-rubriques.mjs";
import { principal } from "../wn-plan-journal-rubriques.mjs";

const RACINE = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const CODES = lireRubriques(RACINE);
/** Nom en prose fabriqué depuis un code : premier mot, majuscule initiale. */
const nom = (code) => code.split("_")[0].replace(/^./, (c) => c.toUpperCase());
const ID = "WN-CL-0000-001";
const COURT = "0000-002";

test("les codes se lisent dans le module de vocabulaire, sans copie", () => {
  assert.ok(CODES.length > 0);
  for (const c of CODES) assert.match(c, /^[a-z]+(?:_[a-z]+)*$/);
  assert.throws(() => codesDepuisSource("export const AUTRE = [] as const;"), /introuvable/);
  assert.throws(() => codesDepuisSource("export const RUBRIQUES_FICHE_USAGE = [\n] as const;"), /vide/);
});

test("identifiant et nom de rubrique après un mot de l'acte : refusé, pour chaque rubrique", () => {
  for (const c of CODES) {
    assert.ok(compterAssociations(`- ${ID} étiqueté au besoin 2, rubrique ${nom(c)} ;`, CODES) > 0, c);
    assert.ok(compterAssociations(`- ${COURT} à 0000-006 sont signés au besoin 2, en ${nom(c)} : …`, CODES) > 0, c);
    assert.ok(compterAssociations(`- \`${ID}\` (rubrique d'${nom(c)}, épinglé)`, CODES) > 0, c);
    assert.ok(compterAssociations(`- ${COURT} : clé \`${c}\``, CODES) > 0, c);
  }
});

test("accents et pluriel ne font pas passer un nom", () => {
  const r = racinesDesCodes(CODES)[0];
  const accentue = r.replace(/e/, "é").toUpperCase();
  assert.ok(compterAssociations(`${ID} rubriques ${accentue}s`, CODES) > 0);
});

test("un nom seul, ou un identifiant seul, ne rougit pas", () => {
  for (const c of CODES) {
    assert.equal(compterAssociations(`- étiqueté au besoin 2, rubrique ${nom(c)}`, CODES), 0, c);
    assert.equal(compterAssociations(`- clé \`${c}\` de l'atelier`, CODES), 0, c);
  }
  assert.equal(compterAssociations(`- ${ID} et ${COURT} étiquetés au besoin 2, signés`, CODES), 0);
});

test("un nom sans mot de l'acte, ou au-delà de la fenêtre, ne rougit pas", () => {
  const [a, b] = CODES.map(nom);
  assert.equal(compterAssociations(`- ${a} à ${b} : ${ID}`, CODES), 0);
  const loin = Array.from({ length: FENETRE }, (_, k) => `mot${k}`).join(" ");
  assert.equal(compterAssociations(`- ${ID} rubrique ${loin} ${a}`, CODES), 0);
  assert.equal(
    compterAssociations(`- ${ID} cités par rubrique de la chaîne d'usage (${CODES.map(nom).join(", ")})`, CODES),
    0,
  );
});

test("la forme occultée de D-502 et D-504 passe", () => {
  assert.equal(compterAssociations(`  - **Relecture** : \`${ID}\` (source \`WN-SRC-0000\`, rubrique occultée (\`D-504\`), épinglé)`, CODES), 0);
  assert.equal(compterAssociations(`    - ${COURT} à 0000-006 sont signés au besoin 2 (rubrique occultée, \`D-502\`) : …`, CODES), 0);
  assert.equal(
    compterAssociations(`    - 8 signatures : 6 étiquetées au besoin 2, rubrique occultée (\`D-502\`) (${COURT}, 0000-003)`, CODES),
    0,
  );
  assert.equal(compterAssociations(`  - **Étiquetage délégué** : \`${ID}\` étiqueté au besoin 2, rubrique occultée (\`D-502\`)`, CODES), 0);
});

test("les lignes occultées par D-502 (trois) et D-504 (une) passent dans l'arbre courant", () => {
  const lire = (f) => fs.readFileSync(path.join(RACINE, JOURNAL, f), "utf8");
  const a = lignesEnCause(lire("H15/2026-11-11-02-relecture-87-claims-polyphenols.md"), CODES);
  const b = lignesEnCause(lire("H15/2026-11-12-03-preuve-besoin-2-achevee.md"), CODES);
  const c = lignesEnCause(lire("H15/2026-11-12-01-iom-2000-relecture-0649-005.md"), CODES);
  for (const l of [6, 10]) assert.ok(!a.includes(l), `l.${l}`);
  assert.ok(!b.includes(11));
  assert.ok(!c.includes(2));
});

function racineFabriquee(fragments) {
  const r = fs.mkdtempSync(path.join(os.tmpdir(), "plan-journal-rubriques-"));
  fs.mkdirSync(path.join(r, path.dirname(SOURCE_RUBRIQUES)), { recursive: true });
  fs.copyFileSync(path.join(RACINE, SOURCE_RUBRIQUES), path.join(r, SOURCE_RUBRIQUES));
  for (const [rel, texte] of Object.entries(fragments)) {
    fs.mkdirSync(path.join(r, JOURNAL, path.dirname(rel)), { recursive: true });
    fs.writeFileSync(path.join(r, JOURNAL, rel), texte);
  }
  return r;
}

test("jugerJournal rend chemin et ligne, rien d'autre", () => {
  const c = CODES[0];
  const r = racineFabriquee({
    "H00/2026-01-01-01-propre.md": `- **Mise à jour (2026-01-01, x)** : ${ID} signé.\n`,
    "H00/2026-01-01-02-ecart.md": `- **Mise à jour (2026-01-01, y)** : rien.\n  - ${COURT} étiqueté au besoin 2, rubrique ${nom(c)}.\n`,
  });
  assert.deepEqual(jugerJournal(r), [{ chemin: `${JOURNAL}/H00/2026-01-01-02-ecart.md`, ligne: 2 }]);
});

test("la ligne de commande bloque, en rapport opaque", () => {
  const c = CODES[0];
  const r = racineFabriquee({ "H00/2026-01-01-01-ecart.md": `- ${ID} étiqueté au besoin 2, rubrique ${nom(c)}.\n` });
  const lignes = [];
  const sortie = { log: (s) => lignes.push(s) };
  assert.equal(principal({ GITHUB_ACTIONS: "true" }, r, sortie), 1);
  const texte = lignes.join("\n");
  assert.match(texte, /^::error file=docs\/claude\/plan-journal\/H00\/2026-01-01-01-ecart\.md,line=1::/);
  assert.ok(!texte.includes(ID));
  assert.ok(!texte.toLowerCase().includes(nom(c).toLowerCase()));
});

test("la ligne de commande se tait sur un journal propre ou absent", () => {
  const sortie = { log: () => {} };
  assert.equal(principal({}, racineFabriquee({ "H00/2026-01-01-01-propre.md": `- ${ID} signé.\n` }), sortie), 0);
  assert.equal(principal({}, racineFabriquee({}), sortie), 0);
});
