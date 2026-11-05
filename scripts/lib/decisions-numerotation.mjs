// Contrôle d'une classe de défaut que rien d'autre ne voit : deux branches
// parallèles qui posent chacune une décision prennent le MÊME numéro, ou une
// décision mergée disparaît.
//
// Depuis D-418 (2026-11-05), le registre est UN FICHIER PAR DÉCISION :
// `docs/decisions/D-NNN.md`, archivées sous `docs/decisions/archivees/`,
// nommé par son seul numéro. Deux PR qui ajoutent chacune une décision
// n'entrent plus en conflit ; deux PR qui prennent le même numéro créent deux
// fichiers au même nom, et Git le signale toujours (conflit d'ajout). C'est
// pourquoi le nom ne porte QUE le numéro (D-418 §1) : un intitulé dans le nom
// ferait passer deux décisions sous le même numéro sans conflit. Jusqu'à
// D-418, `docs/DECISIONS.md` restait délibérément à créneau unique, pour la
// même raison — rendre la collision impossible à manquer — : le 2026-08-03
// puis le 2026-08-04, `D-013` puis `D-014` avaient été pris deux fois, et
// chaque réparation avait coûté huit renvois à renuméroter.
//
// Ce qu'il refuse (D-370 §2, D-418 §5) :
//   - **nom** — dans `docs/decisions/` (et `archivees/`), tout ce qui n'est pas
//     un fichier `D-NNN.md` au nom canonique (trois chiffres au moins, sans
//     zéro de tête en trop) : `D-42.md`, `D-042-intitule.md`, un `README.md`
//     ou un sous-répertoire passeraient à côté du contrôle ;
//   - **titre** — la première ligne n'est pas `# D-NNN — <titre>` au numéro du
//     nom de fichier ;
//   - **une décision par fichier** — un second titre de décision dans le corps ;
//   - **doublon** — le même numéro actif et archivé ;
//   - **trou sans réservation, sur une PR** — un numéro manquant dans la suite,
//     qu'aucune référence `refs/tags/reserve/D-NNN` ne couvre ; la numérotation
//     est une suite, pas une étiquette : un tel trou signifie qu'une décision a
//     été perdue, ou qu'un renvoi pointe vers le vide ;
//   - **supprimée, sur une PR** — un numéro présent sur la base de la PR et
//     absent ici, même réservé ;
//   - **page fixe** — `docs/DECISIONS.md` porte un titre de décision, ou a
//     disparu : depuis D-418 §6, une PR qui y écrit encore une décision est
//     renvoyée, et des centaines de documents datés citent la page.
// Et un avertissement :
//   - **trou en avertissement** — sur une PR, un trou couvert par une
//     réservation est « en vol » : une autre branche porte ce numéro et n'a pas
//     encore mergé. Sur `main` (et hors PR, au poste local), un trou n'est
//     JAMAIS rouge : son verdict ne dépend d'aucune référence distante, et le
//     garde n'en lit aucune. À partir de trois trous, l'avertissement rappelle
//     la pierre tombale — seuil d'affichage, pas une capacité.
//
// Le « désordre » de D-370 §3 (section active rangée au rang numérique) n'a
// plus d'objet : un fichier n'a pas de rang. Il est remplacé par l'accord du
// titre et du nom, que D-418 §5 nomme.
//
// Un trou couvert par une réservation mais dont le numéro existe sur la base
// de la PR n'est pas en vol : la décision est mergée, et l'en retirer est un
// refus (« décision supprimée »). Effet de bord assumé : tant qu'un trou
// existe sur `main` (numéro en vol, ou abandonné sans pierre tombale), chaque
// PR lit l'API des réservations, et une panne passagère la rend rouge —
// relancer le CI. La pierre tombale referme ce coût.
//
// ── QUAND prendre le numéro ─────────────────────────────────────────────────
//
// **Le numéro se réserve à la RÉDACTION** (D-370 §1) :
//   node scripts/wn-reserver-decision.mjs [--nombre N]
// crée par l'API GitHub la référence `refs/tags/reserve/D-NNN` du premier
// numéro libre au-dessus de `main` et des réservations existantes. Une
// réservation ne porte que le numéro ; elle reste après le merge. Quand une
// question est tranchée, celui qui en rédige la décision réserve à ce moment
// et réutilise le numéro jusqu'au merge.
//
// Ce que la réservation remplace : jusqu'à D-370, le numéro ne se prenait
// qu'au MERGE, sur la tête de `main` relue juste avant — un pari perdu dès que
// l'intervalle entre deux merges descend sous la durée d'un CI. Le 2026-09-08,
// perdu CINQ fois en une journée (`D-142→144`, `D-145→147`, `D-152→153`) ; le
// 2026-10-24, cinq PR ont pris `D-357` en treize minutes. Chaque
// renumérotation rejoue un CI, complet pour une PR de code, avec T3 pour une
// migration.
//
// Une décision posée sans réservation reste permise : le garde ne la refuse
// pas, une étape non bloquante de `ci.yml` la signale sur une PR non
// documentaire (`--accompagnement`, D-370 §4). Elle retombe alors dans
// l'ancien régime : relire `origin/main` juste avant le merge, renuméroter
// (renommer le fichier ET sa première ligne) puis reprendre fragment et code.
//
// ── Le numéro écrit dans le SUJET de commit ─────────────────────────────────
//
// Une renumérotation tardive laisse une trace ailleurs, que ce garde ne voit
// pas : le sujet du commit de squash. Le réglage du dépôt est
// `squash_merge_commit_title = COMMIT_OR_PR_TITLE` — GitHub prend le titre du
// COMMIT quand la branche ne porte qu'un seul commit *réel* (les commits de
// fusion ne comptent pas). **Éditer le titre de la PR ne suffit donc pas**, et
// trois PR en portent la trace sur `main` : #943, #949 (dont le sujet cite un
// `D-145` qui EXISTE et désigne autre chose) et #950.
//
// Le levier, qui ne demande aucun `force`-push contrairement à un `--amend` :
//   gh pr merge <N> --squash --delete-branch --subject "<sujet exact>"
//
// ── Le jour où une décision est RETIRÉE ─────────────────────────────────────
//
// Le refus du trou a une conséquence qu'il faut avoir écrite quelque part,
// faute de quoi le CI bloquera un jour sur une PR sans que personne sache quoi
// faire : **un numéro ne se libère jamais.** Supprimer le fichier d'une
// décision abandonnée, annulée ou remplacée creuse un trou dans la suite, et le
// garde le refuse — à raison : des renvois du dépôt pointent vers des `D-NNN`
// précis, et l'un d'eux désignerait alors le vide.
//
// Quatre gestes, et rien d'autre :
//   - **la décision est dépassée** → déplacer son fichier sous
//     `docs/decisions/archivees/`, nom et première ligne inchangés. La suite
//     reste pleine, et les renvois continuent de tomber juste.
//   - **la décision est annulée ou remplacée** → la garder en place et le dire
//     dans son corps (« annulée le …, remplacée par D-0xx »). Ce garde ne lit
//     pas le contenu : le statut est affaire humaine, la numérotation non.
//   - **le fichier a été créé par erreur, avant tout merge sur `main`** → alors
//     seulement, le retirer *et* renuméroter ce qui suit, puis reprendre les
//     renvois. C'est le seul cas où la suite se referme, et il ne concerne
//     qu'une branche qui n'a jamais été publiée.
//   - **le numéro a été réservé puis abandonné** → le fermer par une pierre
//     tombale : `docs/decisions/D-NNN.md`, première ligne `# D-NNN — Numéro
//     non utilisé`, avec sa ligne « Date ». Il ne se réutilise jamais, et la
//     réservation reste (D-370 §2).
//
// Ce que ce contrôle NE fait pas, délibérément : lire le contenu d'une
// décision au-delà de ses titres. Ni la date, ni le statut, ni les champs. Un
// garde qui juge le fond d'un arbitrage clinique serait faux dans les deux
// sens ; celui-ci ne tient que la mécanique de la numérotation, qui est exacte.

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

import {
  NOM_FICHIER,
  PAGE,
  REPERTOIRE,
  SECTION_ARCHIVE,
  SOUS_REPERTOIRE_ARCHIVES,
  TITRE,
  listerEntrees,
  nomDecision,
  nomFichier,
  numeroDuNom,
} from "./registre-decisions.mjs";

export { nomDecision };

/** Ce que le garde juge, pour les messages : le répertoire du registre. */
export const FICHIER = `${REPERTOIRE}/`;

// À partir de ce nombre de trous, l'avertissement rappelle la pierre tombale.
// Seuil d'affichage, pas une capacité (D-370 §2) : rien n'est refusé au-delà.
export const SEUIL_AFFICHAGE_TROUS = 3;

const PREFIXE_RESERVATION = "refs/tags/reserve/D-";
const REFERENCE_RESERVATION = /^refs\/tags\/reserve\/D-(\d+)$/;

/**
 * Un titre de décision, à tout niveau : `# D-NNN`, `### D-NNN`… — et jusqu'à
 * trois espaces de retrait, qui restent un titre en Markdown (revue
 * wn-reviewer de t58, R1).
 */
const TITRE_QUELCONQUE = /^ {0,3}#{1,6}\s+D-\d+\b/;

/** Le titre d'une entrée du registre unique, d'avant D-418. */
const TITRE_REGISTRE_UNIQUE = /^###\s+D-(\d+)\b/;

/** La référence qui réserve un numéro — elle ne porte que lui (D-370 §1). */
export const referenceReservation = (n) => `${PREFIXE_RESERVATION}${String(n).padStart(3, "0")}`;

/**
 * Les entrées des deux répertoires, contenu des fichiers compris.
 * @param {string} racine
 */
export function lireEntrees(racine) {
  const { present, entrees } = listerEntrees(racine);
  return {
    present,
    entrees: entrees.map((e) => ({
      ...e,
      contenu: e.dossier || e.lien ? null : fs.readFileSync(path.join(racine, e.chemin), "utf8"),
    })),
  };
}

/** La page fixe, ou `null` si elle a disparu. */
export function lirePage(racine) {
  const chemin = path.join(racine, PAGE);
  return fs.existsSync(chemin) ? fs.readFileSync(chemin, "utf8") : null;
}

/**
 * Les décisions que portent les entrées : un fichier au nom canonique.
 * @param {Array<{chemin: string, nom: string, section: string, dossier: boolean}>} entrees
 * @returns {Array<{numero: number, brut: string, chemin: string, section: string}>}
 */
export function decisionsDesEntrees(entrees) {
  return entrees
    .filter((e) => !e.dossier && !e.lien && numeroDuNom(e.nom) !== null)
    .map((e) => {
      const numero = numeroDuNom(e.nom);
      return { numero, brut: nomDecision(numero), chemin: e.chemin, section: e.section };
    });
}

/**
 * La forme du registre : noms, titres, une décision par fichier, page fixe.
 * @param {Array<{chemin: string, nom: string, section: string, dossier: boolean, contenu: string | null}>} entrees
 * @param {string | null} page le texte de `docs/DECISIONS.md`, `null` s'il manque
 * @returns {Array<{genre: string, chemin: string, message: string}>}
 */
export function auditerForme(entrees, page) {
  const violations = [];
  for (const e of entrees) {
    if (e.lien) {
      violations.push({
        genre: "nom",
        chemin: e.chemin,
        message: `lien symbolique refusé — une décision est un fichier du registre, pas un renvoi vers un autre (D-418 §1).`,
      });
      continue;
    }
    const numero = e.dossier ? null : numeroDuNom(e.nom);
    if (numero === null) {
      const presque = /^D-(\d+)\.md$/.exec(e.nom);
      const attendu = !e.dossier && presque ? ` (nom canonique : ${nomFichier(Number.parseInt(presque[1], 10))})` : "";
      violations.push({
        genre: "nom",
        chemin: e.chemin,
        message:
          `${e.dossier ? "répertoire" : "fichier"} inattendu${attendu} — ${REPERTOIRE}/ et ` +
          `${SOUS_REPERTOIRE_ARCHIVES}/ ne portent que des décisions, chacune nommée par son seul ` +
          `numéro, \`D-NNN.md\` (D-418 §1).`,
      });
      continue;
    }
    const lignes = (e.contenu ?? "").split(/\r?\n/);
    const t = TITRE.exec(lignes[0] ?? "");
    if (!t || Number.parseInt(t[1], 10) !== numero || nomDecision(Number.parseInt(t[1], 10)) !== `D-${t[1]}`) {
      violations.push({
        genre: "titre",
        chemin: e.chemin,
        message: `la première ligne doit être « # ${nomDecision(numero)} — <titre> », au numéro du nom de fichier.`,
      });
    }
    const second = lignes.findIndex((l, i) => i > 0 && TITRE_QUELCONQUE.test(l));
    if (second !== -1) {
      violations.push({
        genre: "une décision par fichier",
        chemin: `${e.chemin}:${second + 1}`,
        message: `un second titre de décision (« ${lignes[second].slice(0, 60)} ») — une décision par fichier.`,
      });
    }
  }
  if (page === null) {
    violations.push({
      genre: "page fixe",
      chemin: PAGE,
      message: `${PAGE} a disparu : la page fixe reste, des documents datés la citent (D-418 §4).`,
    });
  } else {
    const ligne = page.split(/\r?\n/).findIndex((l) => TITRE_QUELCONQUE.test(l));
    if (ligne !== -1) {
      violations.push({
        genre: "page fixe",
        chemin: `${PAGE}:${ligne + 1}`,
        message:
          `${PAGE} est une page fixe : une décision s'écrit dans son propre fichier ` +
          `${REPERTOIRE}/D-NNN.md, jamais ici (D-418 §6).`,
      });
    }
  }
  return violations;
}

/**
 * Les numéros absents de la suite, de 1 au plus haut.
 * @param {Array<{numero: number}>} decisions
 * @returns {number[]}
 */
export function numerosManquants(decisions) {
  const presents = new Set(decisions.map((d) => d.numero));
  const max = decisions.reduce((m, d) => Math.max(m, d.numero), 0);
  const manquants = [];
  for (let n = 1; n <= max; n += 1) if (!presents.has(n)) manquants.push(n);
  return manquants;
}

/**
 * @param {ReturnType<typeof decisionsDesEntrees>} decisions
 * @param {{surPR?: boolean, reservations?: Set<number> | null, erreurReservations?: string, surBase?: Set<number> | null}} [contexte]
 *   `surPR` : le trou se juge contre les réservations (`reservations`, lues par
 *   l'appelant ; `null` = illisibles, motif dans `erreurReservations`) et
 *   contre la base de la PR (`surBase`, numéros de son registre ; `null` = non
 *   lue). Un numéro présent sur la base est MERGÉ : son trou est une décision
 *   supprimée, refusée même réservée — une réservation ne se nettoie jamais,
 *   « en vol » veut dire réservé et pas encore mergé. Hors PR, un trou n'est
 *   qu'un avertissement et rien n'est lu.
 * @returns {{violations: Array<{genre: string, chemin: string, message: string}>, avertissements: Array<{genre: string, message: string}>, comptees: number, max: number}}
 */
export function auditerDecisions(decisions, contexte = {}) {
  const { surPR = false, reservations = null, erreurReservations = "", surBase = null } = contexte;
  const violations = [];
  const avertissements = [];

  // 1. Doublons. Un même nom dans un même répertoire est impossible ; reste le
  //    même numéro actif ET archivé — deux décisions indiscernables par leurs
  //    renvois.
  const parNumero = new Map();
  for (const d of decisions) {
    if (!parNumero.has(d.numero)) parNumero.set(d.numero, []);
    parNumero.get(d.numero).push(d);
  }
  for (const [numero, liste] of [...parNumero.entries()].sort((a, b) => a[0] - b[0])) {
    if (liste.length < 2) continue;
    violations.push({
      genre: "doublon",
      chemin: liste.map((d) => d.chemin).join(" et "),
      message:
        `${nomDecision(numero)} est porté par ${liste.length} fichiers — une décision dépassée se ` +
        `DÉPLACE sous ${SOUS_REPERTOIRE_ARCHIVES}/, elle ne se copie pas.`,
    });
  }

  // 2. Trous. Sur une PR, un numéro absent est soit en vol (réservé par une
  //    autre branche), soit une décision perdue ou un renvoi vers le vide.
  //    Hors PR — `main` compris —, jamais rouge, et aucune lecture distante.
  const manquants = numerosManquants(decisions);
  const max = decisions.reduce((m, d) => Math.max(m, d.numero), 0);
  const liste = (ns) => ns.map(nomDecision).join(", ");
  const accord = (ns) => (ns.length > 1 ? "nt" : "");
  const rappelPierreTombale =
    manquants.length >= SEUIL_AFFICHAGE_TROUS
      ? ` ${manquants.length} ${surPR ? "numéros en vol" : "trous"} : un numéro réservé puis abandonné se ferme ` +
        `par une pierre tombale (« Numéro non utilisé », datée), jamais réutilisé.`
      : "";
  if (manquants.length > 0 && !surPR) {
    avertissements.push({
      genre: "trou",
      message:
        `${liste(manquants)} manque${accord(manquants)} entre D-001 et ${nomDecision(max)} — ` +
        `numéro en vol (réservé, pas encore mergé) ou abandonné ; jamais rouge hors PR.` +
        rappelPierreTombale,
    });
  }
  // Contre les numéros présents, pas les seuls trous : la suppression du plus
  // haut ne laisse aucun trou (revue CodeRabbit de #1743).
  const presents = new Set(decisions.map((d) => d.numero));
  const supprimees = surPR && surBase ? [...surBase].filter((n) => !presents.has(n)).sort((a, b) => a - b) : [];
  if (supprimees.length > 0) {
    violations.push({
      genre: "supprimée",
      chemin: FICHIER,
      message:
        `${liste(supprimees)} existe${accord(supprimees)} sur la base de la PR et manque${accord(supprimees)} ` +
        `ici : décision supprimée (résolution de conflit qui perd une entrée ?), refusée même ` +
        `réservée. Un numéro mergé ne se libère jamais — déplacer sous « ${SOUS_REPERTOIRE_ARCHIVES}/ », ou ` +
        `garder en place en disant « annulée ».`,
    });
  }
  const nonMerges = manquants.filter((n) => !supprimees.includes(n));
  if (nonMerges.length > 0 && surPR) {
    if (reservations === null) {
      violations.push({
        genre: "trou",
        chemin: FICHIER,
        message:
          `${liste(nonMerges)} manque${accord(nonMerges)} et les réservations sont illisibles ` +
          `(${erreurReservations || "lecture impossible"}) — trou non vérifiable sur une PR ; ` +
          `relancer le CI.`,
      });
    } else {
      const enVol = nonMerges.filter((n) => reservations.has(n));
      const perdus = nonMerges.filter((n) => !reservations.has(n));
      if (enVol.length > 0) {
        avertissements.push({
          genre: "trou",
          message:
            `${liste(enVol)} en vol : réservé${enVol.length > 1 ? "s" : ""}, pas encore ` +
            `mergé${enVol.length > 1 ? "s" : ""} (refs/tags/reserve/D-…).` +
            rappelPierreTombale,
        });
      }
      if (perdus.length > 0) {
        violations.push({
          genre: "trou",
          chemin: FICHIER,
          message:
            `la suite est trouée : ${liste(perdus)} manque${accord(perdus)} entre D-001 et ` +
            `${nomDecision(max)}, sans réservation. Un numéro ne se libère jamais : une ` +
            `décision dépassée se DÉPLACE sous « ${SOUS_REPERTOIRE_ARCHIVES}/ » (numéro inchangé), une décision ` +
            `annulée ou remplacée se garde en place en le disant dans son corps, un numéro ` +
            `réservé puis abandonné se ferme par une pierre tombale. Ne renuméroter que sur ` +
            `une branche jamais publiée.`,
        });
      }
    }
  }

  return { violations, avertissements, comptees: decisions.length, max };
}

/**
 * `gh` en lecture, sortie standard rendue ; lève sur tout échec. Partagé avec
 * `scripts/wn-reserver-decision.mjs`.
 * @param {string[]} args
 */
export function ghParDefaut(args) {
  return execFileSync("gh", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 64 * 1024 * 1024,
  });
}

/**
 * Les numéros réservés, lus sur GitHub — toutes pages.
 * @param {(args: string[]) => string} gh
 * @returns {Set<number>}
 */
export function lireReservations(gh = ghParDefaut) {
  const sortie = gh(["api", "--paginate", "--slurp", `repos/{owner}/{repo}/git/matching-refs/tags/reserve/D-`]);
  const pages = JSON.parse(sortie);
  if (!Array.isArray(pages)) throw new Error("réponse inattendue de matching-refs");
  const numeros = new Set();
  for (const ref of pages.flat()) {
    const m = REFERENCE_RESERVATION.exec(ref?.ref ?? "");
    if (m) numeros.add(Number.parseInt(m[1], 10));
  }
  return numeros;
}

/**
 * Les numéros que portent des chemins relatifs à `docs/decisions/` (`D-001.md`,
 * `archivees/D-002.md`) — la forme d'une liste `git ls-tree` ou d'un arbre de
 * l'API. Ce qui n'a pas la forme d'une décision est ignoré.
 * @param {string[]} chemins
 * @returns {number[]}
 */
export function numerosDesChemins(chemins) {
  const numeros = [];
  for (const c of chemins) {
    const morceaux = c.split("/");
    const nom = morceaux.at(-1);
    const ok = morceaux.length === 1 || (morceaux.length === 2 && morceaux[0] === SOUS_REPERTOIRE_ARCHIVES);
    const n = ok ? numeroDuNom(nom) : null;
    if (n !== null) numeros.push(n);
  }
  return numeros;
}

/**
 * Les numéros du registre UNIQUE d'avant D-418 (`### D-NNN` de
 * `docs/DECISIONS.md`). Ne sert qu'à lire une base antérieure à la bascule :
 * la PR de bascule elle-même, ou une branche partie avant.
 * @param {string} texte
 * @returns {number[]}
 */
export function numerosDuRegistreUnique(texte) {
  return texte
    .split(/\r?\n/)
    .map((l) => TITRE_REGISTRE_UNIQUE.exec(l))
    .filter(Boolean)
    .map((m) => Number.parseInt(m[1], 10));
}

function git(racine, args) {
  return execFileSync("git", args, {
    cwd: racine,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 64 * 1024 * 1024,
  });
}

/**
 * Les numéros du registre à un commit donné, ou `null` s'il est illisible. Un
 * commit d'avant la bascule n'a pas `docs/decisions/` : son registre unique se
 * lit alors.
 * @param {string} racine
 * @param {string} ref
 * @returns {Set<number> | null}
 */
export function numerosA(racine, ref) {
  let liste;
  try {
    liste = git(racine, ["ls-tree", "-r", "--name-only", ref, "--", `${REPERTOIRE}/`]);
  } catch {
    return null;
  }
  const chemins = liste
    .split("\n")
    .filter(Boolean)
    .map((c) => c.slice(REPERTOIRE.length + 1));
  if (chemins.length > 0) return new Set(numerosDesChemins(chemins));
  try {
    const n = numerosDuRegistreUnique(git(racine, ["show", `${ref}:${PAGE}`]));
    return n.length > 0 ? new Set(n) : null;
  } catch {
    return null;
  }
}

/**
 * Les décisions de la tête dont le numéro est absent de la base.
 * @param {Set<number>} numerosBase
 * @param {ReturnType<typeof decisionsDesEntrees>} decisionsTete
 */
export function decisionsAjoutees(numerosBase, decisionsTete) {
  return decisionsTete.filter((d) => !numerosBase.has(d.numero)).sort((a, b) => b.numero - a.numero);
}

function messageErreur(e) {
  return String(e?.stderr || e?.message || e).trim().split(/\r?\n/)[0];
}

/** L'ancêtre commun de `HEAD` et de `ref`, ou `null`. */
function ancetreCommun(racine, ref) {
  try {
    return git(racine, ["merge-base", "HEAD", ref]).trim() || null;
  } catch {
    return null;
  }
}

// L'étape d'accompagnement de `ci.yml` (D-370 §4) : sur une PR non
// documentaire, signale une décision ajoutée sans réservation — sa
// renumérotation coûterait un CI complet. Jamais bloquante : elle sort 0 dans
// tous les cas, lecture impossible comprise.
function accompagner(racine, base, gh) {
  const numerosBase = numerosA(racine, base);
  if (numerosBase === null) {
    console.log(`::warning::Accompagnement des réservations sans objet : registre illisible sur ${base}.`);
    return 0;
  }
  const ajoutees = decisionsAjoutees(numerosBase, decisionsDesEntrees(lireEntrees(racine).entrees));
  if (ajoutees.length === 0) {
    console.log("OK : aucune décision ajoutée par cette PR.");
    return 0;
  }
  let reservations;
  try {
    reservations = lireReservations(gh);
  } catch (e) {
    console.log(`::warning::Réservations illisibles (${messageErreur(e)}) : ${ajoutees.map((d) => d.brut).join(", ")} non vérifiées.`);
    return 0;
  }
  for (const d of ajoutees) {
    if (reservations.has(d.numero)) {
      console.log(`OK : ${d.brut} réservé.`);
      continue;
    }
    console.log(
      `::warning file=${d.chemin},line=1::${d.brut} ajouté sans réservation — ` +
        `si une autre PR le prend d'abord, la renumérotation coûtera un CI complet. ` +
        `Réserver : node scripts/wn-reserver-decision.mjs (D-370 §4).`,
    );
  }
  return 0;
}

// Exécuté directement : le contrôle bloquant du CI. Comme ses voisins de
// `scripts/lib/`, il refuse d'être vert sur un répertoire absent ou sans aucune
// décision — un scan qui ne trouve rien rendrait « aucune violation »,
// c'est-à-dire la même sortie qu'un registre sain.
//
// Sur une PR — `GITHUB_EVENT_NAME=pull_request`, posé par Actions, ou `--pr`
// au poste local —, un trou se juge contre les réservations, lues seulement
// s'il y a un trou. Partout ailleurs, aucune lecture distante. La commande
// reste la même en CI et dans `npm run check` (banc de parité).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const racine = process.cwd();
  const args = process.argv.slice(2);

  const iAcc = args.indexOf("--accompagnement");
  if (iAcc !== -1) {
    const base = args[iAcc + 1];
    if (!base) {
      console.log("::warning::--accompagnement attend un commit de base — étape sans objet.");
      process.exit(0);
    }
    process.exit(accompagner(racine, base, ghParDefaut));
  }

  const { present, entrees } = lireEntrees(racine);
  if (!present) {
    console.error(`✗ ${REPERTOIRE}/ introuvable depuis ${racine} — contrôle sans objet, refus d'être vert.`);
    process.exit(2);
  }
  const decisions = decisionsDesEntrees(entrees);
  if (decisions.length === 0) {
    console.error(`✗ Aucune décision lue dans ${REPERTOIRE}/ — contrôle sans objet, refus d'être vert.`);
    process.exit(2);
  }

  const enCIdePR = process.env.GITHUB_EVENT_NAME === "pull_request";
  const surPR = args.includes("--pr") || enCIdePR;
  let reservations = null;
  let erreurReservations = "";
  let surBase = null;
  if (surPR && numerosManquants(decisions).length > 0) {
    try {
      reservations = lireReservations(ghParDefaut);
    } catch (e) {
      erreurReservations = messageErreur(e);
    }
  }
  if (surPR) {
    // La base, lue localement (`git`, aucun appel distant) : `HEAD^1`,
    // premier parent du commit de fusion de la PR, en CI ; au poste local,
    // l'ancêtre commun avec `origin/main` — `origin/main` lui-même ferait lire
    // comme supprimée une décision mergée après la création de la branche
    // (revue CodeRabbit de #1743). Base illisible ⇒ refus, en CI comme avec
    // `--pr` : la suppression n'est pas vérifiable.
    const base = enCIdePR ? "HEAD^1" : ancetreCommun(racine, "origin/main");
    surBase = base === null ? null : numerosA(racine, base);
    if (surBase === null) {
      console.error(`✗ registre illisible sur ${base ?? "l'ancêtre commun avec origin/main"} — décision supprimée non vérifiable sur une PR.`);
      process.exit(1);
    }
  }

  const forme = auditerForme(entrees, lirePage(racine));
  const { violations, avertissements, comptees, max } = auditerDecisions(decisions, {
    surPR,
    reservations,
    erreurReservations,
    surBase,
  });
  const toutes = [...forme, ...violations];
  const enCI = process.env.GITHUB_ACTIONS === "true";
  for (const a of avertissements) {
    console.log(`${enCI ? "::warning::" : "⚠ "}${FICHIER} — ${a.message}`);
  }
  for (const v of toutes) {
    console.error(`✗ ${v.chemin} — ${v.message}`);
  }
  if (toutes.length > 0) {
    console.error(
      `\n→ La numérotation de ${FICHIER} est une suite : un numéro, un fichier \`D-NNN.md\` dont la ` +
        `première ligne porte ce numéro, et ${PAGE} reste une page fixe.`,
    );
    process.exit(1);
  }
  const trous = avertissements.length > 0 ? "trous en avertissement" : "sans trou";
  const archivees = decisions.filter((d) => d.section === SECTION_ARCHIVE).length;
  console.log(
    `OK : ${comptees} décisions (${archivees} archivée${archivees > 1 ? "s" : ""}), D-001 à ${nomDecision(max)}, ` +
      `sans doublon, ${trous}, noms et titres accordés, ${PAGE} fixe${surPR ? " (PR)" : ""}.`,
  );
}
