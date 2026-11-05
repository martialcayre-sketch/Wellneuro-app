#!/usr/bin/env node
// Découpage du registre unique `docs/DECISIONS.md` en un fichier par décision
// (D-418 §3).
//
// Usage :
//   node scripts/wn-decisions-decouper.mjs --depuis <ref>      # git show <ref>:docs/DECISIONS.md
//   node scripts/wn-decisions-decouper.mjs --fichier <chemin>  # un registre unique sur disque
//   … --verifier   n'écrit rien : juge les fichiers présents contre le registre lu
//
// Le script se rejoue : sur un `main` plus récent, il réécrit chaque décision
// du registre lu (créée, modifiée ou inchangée) et laisse en place les
// fichiers qu'il ne connaît pas. Une PR ouverte qui a ajouté une entrée au
// registre unique la convertit de même, depuis sa propre branche (§6).
// Après l'écriture, le banc de découpage tourne toujours ; un écart rend 1.
//
// Le texte est repris à l'identique, à deux exceptions près (§3) :
//   - le titre : `### D-NNN — …` devient `# D-NNN — …` ;
//   - les liens écrits relativement au fichier (`../web/…`, `claude/…`) :
//     leur cible est recalculée pour la profondeur du répertoire de
//     destination, et désigne la même ressource. Les cibles écrites depuis la
//     racine du dépôt (`web/…`, `docs/…`, `scripts/…`…), que lit
//     `scripts/wn-ancres-doctrine.mjs`, ne bougent pas ; ni rien de ce qui est
//     dans un bloc ou un segment de code.
// Les lignes vides qui séparaient deux entrées ne sont pas du texte de
// décision : chaque fichier finit par un seul saut de ligne, et le banc compare
// chaque entrée débarrassée de ses lignes vides finales.
//
// Arguments inconnus : refus, code 2, rien d'écrit.

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

import {
  ARCHIVES,
  PAGE,
  REPERTOIRE,
  SECTION_ACTIVE,
  SECTION_ARCHIVE,
  nomDecision,
  nomFichier,
} from "./lib/registre-decisions.mjs";

/** Le répertoire du registre unique : base de ses liens relatifs. */
const REPERTOIRE_SOURCE = path.posix.dirname(PAGE);

const TITRE_ANCIEN = /^### D-(\d+) — (.+)$/;
const SECTION = /^## Décisions (actives|archivées)\s*$/;

/** Une cible écrite depuis la racine du dépôt : elle ne bouge pas (§3). */
const RACINES = /^(?:web|docs|scripts|prisma|\.claude|\.github)\//;

/**
 * Une cible relative au fichier : ni URL, ni ancre, ni écrite depuis la
 * racine, et un chemin (au moins un `/`). `chemin` ou `…`, écrits en exemple
 * dans la prose, ne sont pas des chemins.
 * @param {string} cible
 */
export function estRelativeAuFichier(cible) {
  if (/^[a-z][a-z0-9+.-]*:/i.test(cible)) return false;
  if (cible.startsWith("#") || cible.startsWith("/")) return false;
  if (RACINES.test(cible)) return false;
  return cible.includes("/");
}

function separerFragment(cible) {
  const i = cible.search(/[#?]/);
  return i === -1 ? [cible, ""] : [cible.slice(0, i), cible.slice(i)];
}

/**
 * Le chemin, depuis la racine du dépôt, qu'une cible désigne depuis `dossier`.
 * @param {string} dossier
 * @param {string} cible
 */
export function resoudre(dossier, cible) {
  const [chemin, fragment] = separerFragment(cible);
  return `${path.posix.normalize(path.posix.join(dossier, chemin))}${fragment}`;
}

function rebaser(cible, depuis, vers) {
  const [chemin, fragment] = separerFragment(cible);
  const absolu = path.posix.normalize(path.posix.join(depuis, chemin));
  return `${path.posix.relative(vers, absolu)}${fragment}`;
}

/**
 * Applique `fn` au texte HORS code : blocs clôturés (```) et segments en
 * accents graves sont rendus tels quels.
 * @param {string} texte
 * @param {(morceau: string) => string} fn
 */
function horsCode(texte, fn) {
  const lignes = texte.split("\n");
  let dansBloc = false;
  return lignes
    .map((ligne) => {
      if (/^\s*```/.test(ligne)) {
        dansBloc = !dansBloc;
        return ligne;
      }
      if (dansBloc) return ligne;
      return ligne
        .split(/(`+[^`]*?`+)/)
        .map((morceau, i) => (i % 2 === 1 ? morceau : fn(morceau)))
        .join("");
    })
    .join("\n");
}

/**
 * Recalcule les liens relatifs au fichier, de `depuis` vers `vers`.
 * @returns {{texte: string, liens: Array<{avant: string, apres: string}>}}
 */
export function rebaserLiens(texte, depuis, vers) {
  const liens = [];
  const sortie = horsCode(texte, (morceau) =>
    morceau.replace(/\]\(([^)\s]+)\)/g, (tout, cible) => {
      if (!estRelativeAuFichier(cible)) return tout;
      const apres = rebaser(cible, depuis, vers);
      liens.push({ avant: cible, apres });
      return `](${apres})`;
    }),
  );
  return { texte: sortie, liens };
}

const sansLignesVidesFinales = (texte) => texte.replace(/(?:\n[ \t]*)+$/, "");

/**
 * Le registre unique, découpé. Lève sur un doublon de numéro ou sur un titre
 * de section inattendu — jamais un découpage approximatif.
 * @param {string} texte
 * @returns {{entrees: Array<{numero: number, id: string, section: string, texte: string}>, horsEntrees: string[]}}
 */
export function decouperRegistre(texte) {
  if (texte.includes("\r")) throw new Error("registre en fins de ligne CRLF : découpage refusé");
  const lignes = texte.split("\n");
  const entrees = [];
  const horsEntrees = [];
  let section = null;
  let courante = null;
  const clore = () => {
    if (!courante) return;
    entrees.push({ ...courante, texte: sansLignesVidesFinales(courante.lignes.join("\n")) });
    delete entrees.at(-1).lignes;
    courante = null;
  };
  for (const ligne of lignes) {
    const s = SECTION.exec(ligne);
    if (s) {
      clore();
      section = s[1] === "actives" ? SECTION_ACTIVE : SECTION_ARCHIVE;
      horsEntrees.push(ligne);
      continue;
    }
    const t = TITRE_ANCIEN.exec(ligne);
    if (t) {
      clore();
      if (section === null) throw new Error(`« ${ligne.slice(0, 60)} » précède la section active`);
      const numero = Number.parseInt(t[1], 10);
      courante = { numero, id: nomDecision(numero), section, lignes: [ligne] };
      continue;
    }
    if (courante) courante.lignes.push(ligne);
    else horsEntrees.push(ligne);
  }
  clore();
  const vus = new Map();
  for (const e of entrees) {
    if (vus.has(e.numero)) throw new Error(`${e.id} porté par deux entrées : découpage refusé`);
    vus.set(e.numero, e);
  }
  return { entrees, horsEntrees: horsEntrees.filter((l) => l.trim() !== "") };
}

/** Le répertoire de destination d'une entrée. */
export const dossierDe = (section) => (section === SECTION_ARCHIVE ? ARCHIVES : REPERTOIRE);

/**
 * Le contenu du fichier d'une entrée.
 * @returns {{chemin: string, contenu: string, liens: Array<{avant: string, apres: string}>}}
 */
export function versFichier(entree) {
  const dossier = dossierDe(entree.section);
  const [titre, ...reste] = entree.texte.split("\n");
  const corps = rebaserLiens(reste.join("\n"), REPERTOIRE_SOURCE, dossier);
  const nouveauTitre = titre.replace(/^### /, "# ");
  const contenu = `${[nouveauTitre, ...(reste.length ? [corps.texte] : [])].join("\n")}\n`;
  return { chemin: `${dossier}/${nomFichier(entree.numero)}`, contenu, liens: corps.liens };
}

/**
 * L'inverse de `versFichier` : le texte de l'entrée tel que le registre unique
 * le portait.
 * @param {string} chemin
 * @param {string} contenu
 */
export function versEntree(chemin, contenu) {
  const dossier = path.posix.dirname(chemin);
  const [titre, ...reste] = sansLignesVidesFinales(contenu).split("\n");
  const corps = rebaserLiens(reste.join("\n"), dossier, REPERTOIRE_SOURCE);
  return [titre.replace(/^# /, "### "), ...(reste.length ? [corps.texte] : [])].join("\n");
}

/**
 * Le banc de découpage (§3) : chaque entrée du registre a son fichier, à sa
 * place, une seule fois ; le fichier rend l'entrée aux titres et aux liens
 * près ; chaque lien réécrit désigne la même ressource ; aucun texte de
 * décision ne vit hors d'une entrée.
 * @param {string} texteRegistre
 * @param {(chemin: string) => string | null} lire
 * @returns {{fautes: string[], entrees: number, liens: number}}
 */
export function verifierDecoupage(texteRegistre, lire) {
  const fautes = [];
  const { entrees, horsEntrees } = decouperRegistre(texteRegistre);
  if (entrees.length === 0) fautes.push("aucune entrée lue dans le registre : banc sans objet");
  const attendusHors = new Set(["## Décisions actives", "## Décisions archivées"]);
  for (const ligne of horsEntrees) {
    if (attendusHors.has(ligne.trim()) || ligne.startsWith("# ") || ligne.startsWith(">")) continue;
    fautes.push(`texte hors de toute entrée : « ${ligne.slice(0, 80)} »`);
  }
  let liens = 0;
  for (const e of entrees) {
    const { chemin, liens: reecrits } = versFichier(e);
    const autre = `${dossierDe(e.section === SECTION_ACTIVE ? SECTION_ARCHIVE : SECTION_ACTIVE)}/${nomFichier(e.numero)}`;
    const contenu = lire(chemin);
    if (contenu === null) {
      fautes.push(`${e.id} : ${chemin} absent`);
      continue;
    }
    if (lire(autre) !== null) fautes.push(`${e.id} : présent aussi en ${autre} (doublon)`);
    if (versEntree(chemin, contenu) !== e.texte) fautes.push(`${e.id} : ${chemin} ne rend pas l'entrée du registre`);
    for (const l of reecrits) {
      liens += 1;
      const avant = resoudre(REPERTOIRE_SOURCE, l.avant);
      const apres = resoudre(path.posix.dirname(chemin), l.apres);
      if (avant !== apres) fautes.push(`${e.id} : le lien ${l.avant} désignait ${avant}, il désigne ${apres}`);
    }
  }
  return { fautes, entrees: entrees.length, liens };
}

/**
 * Écrit les fichiers des entrées ; rapporte, par fichier, ce qui s'est passé.
 * @param {string} racine
 * @param {string} texteRegistre
 */
export function ecrireDecoupage(racine, texteRegistre) {
  const { entrees } = decouperRegistre(texteRegistre);
  const bilan = { creees: [], modifiees: [], inchangees: [], deplacees: [] };
  for (const e of entrees) {
    const { chemin, contenu } = versFichier(e);
    const absolu = path.join(racine, chemin);
    const autre = path.join(racine, dossierDe(e.section === SECTION_ACTIVE ? SECTION_ARCHIVE : SECTION_ACTIVE), nomFichier(e.numero));
    if (fs.existsSync(autre)) {
      fs.rmSync(autre);
      bilan.deplacees.push(e.id);
    }
    fs.mkdirSync(path.dirname(absolu), { recursive: true });
    const avant = fs.existsSync(absolu) ? fs.readFileSync(absolu, "utf8") : null;
    if (avant === contenu) {
      bilan.inchangees.push(e.id);
      continue;
    }
    fs.writeFileSync(absolu, contenu, "utf8");
    (avant === null ? bilan.creees : bilan.modifiees).push(e.id);
  }
  return bilan;
}

/**
 * @param {string[]} argv
 * @returns {{depuis?: string, fichier?: string, verifier: boolean} | {erreur: string}}
 */
export function analyserArguments(argv) {
  const r = { verifier: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--verifier") r.verifier = true;
    else if ((a === "--depuis" || a === "--fichier") && argv[i + 1] && !argv[i + 1].startsWith("--")) {
      r[a.slice(2)] = argv[i + 1];
      i += 1;
    } else return { erreur: `argument inconnu ou incomplet : ${a}` };
  }
  if (!r.depuis === !r.fichier) return { erreur: "une source, et une seule : --depuis <ref> ou --fichier <chemin>" };
  return r;
}

function lireSource(racine, args) {
  if (args.fichier) return fs.readFileSync(path.resolve(racine, args.fichier), "utf8");
  return execFileSync("git", ["show", `${args.depuis}:${PAGE}`], {
    cwd: racine,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 64 * 1024 * 1024,
  });
}

/** @returns {number} le code de sortie */
export function principal(argv, racine = process.cwd()) {
  const args = analyserArguments(argv);
  if ("erreur" in args) {
    console.error(
      `✗ ${args.erreur} — usage : node scripts/wn-decisions-decouper.mjs (--depuis <ref> | --fichier <chemin>) [--verifier]`,
    );
    return 2;
  }
  let texte;
  try {
    texte = lireSource(racine, args);
  } catch (e) {
    console.error(`✗ registre illisible : ${String(e?.stderr || e?.message || e).trim().split("\n")[0]}`);
    return 2;
  }
  try {
    if (!args.verifier) {
      const b = ecrireDecoupage(racine, texte);
      console.log(
        `Écrit : ${b.creees.length} créée(s), ${b.modifiees.length} modifiée(s), ${b.inchangees.length} inchangée(s)` +
          (b.deplacees.length ? `, ${b.deplacees.length} déplacée(s) entre actives et archivées (${b.deplacees.join(", ")})` : "") +
          ".",
      );
      if (b.modifiees.length) console.log(`  modifiées : ${b.modifiees.join(", ")}`);
      if (b.creees.length && b.creees.length <= 20) console.log(`  créées : ${b.creees.join(", ")}`);
    }
    const lire = (chemin) => {
      const absolu = path.join(racine, chemin);
      return fs.existsSync(absolu) ? fs.readFileSync(absolu, "utf8") : null;
    };
    const { fautes, entrees, liens } = verifierDecoupage(texte, lire);
    for (const f of fautes) console.error(`✗ ${f}`);
    if (fautes.length > 0) return 1;
    console.log(`OK : ${entrees} entrée(s) découpée(s) à l'identique (titres et liens près), ${liens} lien(s) rebasé(s) vers la même ressource.`);
    return 0;
  } catch (e) {
    console.error(`✗ ${e.message}`);
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(principal(process.argv.slice(2)));
}
