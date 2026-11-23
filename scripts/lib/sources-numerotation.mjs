// Numérotation du registre des sources du corpus (`WN-SRC-NNNN`) —
// piège « réservation WN-SRC » du lot `autonomie-pieges-restes`, partie 13.
//
// LE PIÈGE. Rien ne réservait un numéro de source entre deux sessions. Le
// 2026-11-01, #1808 prenait `WN-SRC-0577` à `0588` au registre pendant qu'une
// autre session (#1810) ingérait en base sous `0577` à `0582`. La base est la
// partie irréversible — claims immuables, aucune route pour retirer un
// passage — : c'est la plage sans extrait en base qui a cédé, et #1808 a été
// renumérotée. Deux sessions qui lisent le même maximum sur `main` prennent le
// même numéro, et l'ingestion en base précède la PR.
//
// LA RÉPONSE, calquée sur les décisions (D-370) :
//   - **réserver à la rédaction, avant toute ingestion** :
//       node scripts/wn-reserver-source.mjs [--nombre N]
//     crée par l'API GitHub `refs/tags/reserve/WN-SRC-NNNN`, premier numéro
//     libre au-dessus du registre de `main` et des réservations ;
//   - **ce garde**, exécuté par `npm run check` et par le CI :
//       - **refus** (toujours, aucune lecture distante) : registre illisible,
//         vide ou qui n'est pas une liste ; notice sans `sourceId` à la forme
//         `WN-SRC-NNNN` (quatre chiffres au moins, sans zéro de tête en trop) ;
//         **doublon** de `sourceId`. Deux PR qui ajoutent chacune la même
//         notice en fin de liste se heurtent dans Git ; une résolution qui
//         garde les deux passerait sans ce refus (un ajout au milieu de la
//         liste, lui, ne se heurte pas dans Git : seul ce refus le voit) ;
//       - **avertissement, sur une PR seulement** : une source ajoutée par la
//         PR (absente de sa base) qu'aucune réservation ne couvre. Une
//         réservation n'a pas de titulaire : le garde constate qu'elle existe,
//         pas qu'elle est celle de la PR (même limite que D-370). Jamais
//         rouge, comme l'accompagnement des décisions (D-370 §4) : tout
//         durcissement demanderait une décision. Les réservations ne se lisent
//         que s'il y a une source ajoutée.
//
// Sur une PR — `GITHUB_EVENT_NAME=pull_request`, posé par Actions, ou `--pr`
// au poste local —, la base est `HEAD^1` en CI (premier parent du commit de
// fusion) ; au poste, l'ancêtre commun avec `origin/main`. Base illisible :
// avertissement, jamais refus — rien de ce qu'elle sert n'est bloquant.
//
// Codes de sortie : 0 = registre sain (avertissements compris) ; 1 = refus ;
// 2 = registre absent ou vide (contrôle sans objet, refus d'être vert).
//
// Banc : `scripts/lib/sources-numerotation.test.mjs`.

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const REGISTRE_SOURCES = "docs/claude/corpus/source_registry.json";
export const PREFIXE_RESERVATION_SOURCE = "refs/tags/reserve/WN-SRC-";

const FORME_SOURCE = /^WN-SRC-(\d{4,})$/;

/**
 * Le numéro d'un identifiant de source à la forme canonique, ou `null`.
 * Canonique : quatre chiffres au moins, sans zéro de tête au-delà de quatre
 * (`WN-SRC-0854`, `WN-SRC-10000` ; jamais `WN-SRC-854` ni `WN-SRC-00854`).
 * @param {unknown} id
 * @returns {number | null}
 */
export function numeroSource(id) {
  if (typeof id !== "string") return null;
  const m = FORME_SOURCE.exec(id);
  if (!m) return null;
  if (m[1].length > 4 && m[1][0] === "0") return null;
  return Number.parseInt(m[1], 10);
}

/** @param {number} n */
export function nomSource(n) {
  return `WN-SRC-${String(n).padStart(4, "0")}`;
}

/** @param {number} n */
export function referenceSource(n) {
  return `refs/tags/reserve/${nomSource(n)}`;
}

/**
 * Juge le texte du registre.
 * @param {string} texte
 * @returns {{violations: string[], numeros: number[], illisible: boolean}}
 *   `illisible` : JSON invalide ou pas une liste — aucun numéro n'est lu.
 */
export function auditerRegistre(texte) {
  let notices;
  try {
    notices = JSON.parse(texte);
  } catch (e) {
    return { violations: [`JSON illisible (${String(e?.message ?? e).split("\n")[0]})`], numeros: [], illisible: true };
  }
  if (!Array.isArray(notices)) {
    return { violations: ["le registre n'est pas une liste de notices"], numeros: [], illisible: true };
  }
  const violations = [];
  const numeros = [];
  const vus = new Map();
  notices.forEach((notice, i) => {
    const id = notice?.sourceId;
    const n = numeroSource(id);
    if (n === null) {
      violations.push(`notice ${i} : sourceId ${JSON.stringify(id ?? null)} hors de la forme WN-SRC-NNNN`);
      return;
    }
    if (vus.has(n)) {
      violations.push(`${nomSource(n)} en double (notices ${vus.get(n)} et ${i})`);
      return;
    }
    vus.set(n, i);
    numeros.push(n);
  });
  return { violations, numeros, illisible: false };
}

/**
 * Les numéros de la tête absents de la base, du plus haut au plus bas.
 * @param {Set<number>} numerosBase
 * @param {number[]} numerosTete
 */
export function sourcesAjoutees(numerosBase, numerosTete) {
  return numerosTete.filter((n) => !numerosBase.has(n)).sort((a, b) => b - a);
}

export function ghParDefaut(args) {
  return execFileSync("gh", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 64 * 1024 * 1024,
  });
}

/**
 * Les numéros de source réservés, lus sur GitHub — toutes pages. Une
 * référence hors forme canonique est ignorée.
 * @param {(args: string[]) => string} gh
 * @returns {Set<number>}
 */
export function lireReservationsSources(gh = ghParDefaut) {
  const sortie = gh(["api", "--paginate", "--slurp", "repos/{owner}/{repo}/git/matching-refs/tags/reserve/WN-SRC-"]);
  const pages = JSON.parse(sortie);
  if (!Array.isArray(pages)) throw new Error("réponse inattendue de matching-refs");
  const numeros = new Set();
  for (const ref of pages.flat()) {
    const nom = String(ref?.ref ?? "");
    if (!nom.startsWith(PREFIXE_RESERVATION_SOURCE)) continue;
    const n = numeroSource(nom.slice("refs/tags/reserve/".length));
    if (n !== null) numeros.add(n);
  }
  return numeros;
}

function git(racine, args) {
  return execFileSync("git", args, {
    cwd: racine,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 64 * 1024 * 1024,
  });
}

function messageErreur(e) {
  return String(e?.stderr || e?.message || e).trim().split(/\r?\n/)[0];
}

/**
 * Le contrôle complet, sans effet de bord : rend les lignes à afficher et le
 * code de sortie. `lireBase` et `lireReservations` ne sont appelés que sur une
 * PR, et le second seulement s'il y a une source ajoutée.
 * @param {{
 *   texte: string | null,
 *   surPR: boolean,
 *   enCI?: boolean,
 *   lireBase?: () => string | null,
 *   lireReservations?: () => Set<number>,
 * }} options
 * @returns {{code: number, sorties: string[], erreurs: string[]}}
 */
export function controler({ texte, surPR, enCI = false, lireBase, lireReservations }) {
  const sorties = [];
  const erreurs = [];
  const avertir = (m) => sorties.push(`${enCI ? `::warning file=${REGISTRE_SOURCES}::` : "⚠ "}${m}`);

  if (texte === null) {
    erreurs.push(`✗ ${REGISTRE_SOURCES} introuvable — contrôle sans objet, refus d'être vert.`);
    return { code: 2, sorties, erreurs };
  }
  const tete = auditerRegistre(texte);
  if (!tete.illisible && tete.numeros.length === 0 && tete.violations.length === 0) {
    erreurs.push(`✗ Aucune notice lue dans ${REGISTRE_SOURCES} — contrôle sans objet, refus d'être vert.`);
    return { code: 2, sorties, erreurs };
  }
  if (tete.violations.length > 0) {
    for (const v of tete.violations) erreurs.push(`✗ ${REGISTRE_SOURCES} — ${v}`);
    erreurs.push(
      `\n→ Un numéro de source désigne une seule notice. Une source neuve prend un numéro réservé : ` +
        `node scripts/wn-reserver-source.mjs.`,
    );
    return { code: 1, sorties, erreurs };
  }

  if (surPR) {
    let texteBase = null;
    try {
      texteBase = lireBase?.() ?? null;
    } catch {
      texteBase = null;
    }
    const base = texteBase === null ? null : auditerRegistre(texteBase);
    if (base === null || base.illisible) {
      avertir("registre illisible sur la base de la PR — sources ajoutées sans réservation non vérifiées.");
    } else {
      const ajoutees = sourcesAjoutees(new Set(base.numeros), tete.numeros);
      if (ajoutees.length > 0) {
        let reservations = null;
        try {
          reservations = lireReservations();
        } catch (e) {
          avertir(`réservations illisibles (${messageErreur(e)}) : ${ajoutees.map(nomSource).join(", ")} non vérifiées.`);
        }
        if (reservations) {
          const maxBase = Math.max(...base.numeros);
          for (const n of ajoutees) {
            if (reservations.has(n)) {
              // La référence ne dit pas QUI a réservé : ce garde constate
              // qu'une réservation existe, pas qu'elle est celle de la PR.
              sorties.push(`OK : une réservation existe pour ${nomSource(n)} (son titulaire n'est pas vérifié).`);
            } else if (n < maxBase) {
              avertir(
                `${nomSource(n)} ajouté sans réservation, sous le maximum de la base (${nomSource(maxBase)}) : ` +
                  `le script de réservation ne rend jamais un numéro comblant un trou. Vérifier qu'aucune autre ` +
                  `session ne l'a pris (PR ouvertes, base) avant d'ingérer.`,
              );
            } else {
              avertir(
                `${nomSource(n)} ajouté sans réservation — une autre session peut ingérer en base sous le même ` +
                  `numéro. Réserver avant d'ingérer : node scripts/wn-reserver-source.mjs.`,
              );
            }
          }
        }
      }
    }
  }

  const max = Math.max(...tete.numeros);
  sorties.push(
    `OK : ${tete.numeros.length} notices, jusqu'à ${nomSource(max)}, sans doublon, formes canoniques${surPR ? " (PR)" : ""}.`,
  );
  return { code: 0, sorties, erreurs };
}

/** L'ancêtre commun de `HEAD` et de `ref`, ou `null`. */
function ancetreCommun(racine, ref) {
  try {
    return git(racine, ["merge-base", "HEAD", ref]).trim() || null;
  } catch {
    return null;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const racine = process.cwd();
  const args = process.argv.slice(2);
  const inconnu = args.find((a) => a !== "--pr");
  if (inconnu !== undefined) {
    console.error(`✗ argument inconnu : ${inconnu} — usage : node scripts/lib/sources-numerotation.mjs [--pr]`);
    process.exit(2);
  }
  let texte = null;
  try {
    texte = fs.readFileSync(path.join(racine, REGISTRE_SOURCES), "utf8");
  } catch {
    texte = null;
  }
  const enCIdePR = process.env.GITHUB_EVENT_NAME === "pull_request";
  const r = controler({
    texte,
    surPR: args.includes("--pr") || enCIdePR,
    enCI: process.env.GITHUB_ACTIONS === "true",
    lireBase: () => {
      const base = enCIdePR ? "HEAD^1" : ancetreCommun(racine, "origin/main");
      return base === null ? null : git(racine, ["show", `${base}:${REGISTRE_SOURCES}`]);
    },
    lireReservations: () => lireReservationsSources(ghParDefaut),
  });
  for (const s of r.sorties) console.log(s);
  for (const e of r.erreurs) console.error(e);
  process.exit(r.code);
}
