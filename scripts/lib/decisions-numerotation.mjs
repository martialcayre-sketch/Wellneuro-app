// Contrôle d'une classe de défaut que rien d'autre ne voit : deux branches
// parallèles qui posent chacune une décision dans `docs/DECISIONS.md` prennent
// le MÊME numéro.
//
// Ce fichier reste délibérément à créneau unique. Contrairement au journal de
// session (`merge=union`, `.gitattributes`) et au handoff (un fragment par lot,
// `docs/claude/handoffs/`), on ne l'éclate pas : une décision se lit dans la
// suite des autres, s'amende, se contredit, et huit renvois croisés pointent
// déjà vers des `D-NNN` précis. Le remède n'est donc pas de supprimer le
// conflit — il est de rendre la collision IMPOSSIBLE À MANQUER. Un conflit de
// merge sur ce fichier est bruyant et se résout ; un doublon de numéro est
// silencieux et se propage : le 2026-08-03 puis le 2026-08-04, `D-013` puis
// `D-014` ont été pris deux fois, et chaque réparation a coûté huit renvois à
// renuméroter.
//
// Trois refus, un avertissement, et rien d'autre (D-370 §2) :
//   - **doublon** — le même `D-NNN` porté par deux titres ;
//   - **trou sans réservation, sur une PR** — un numéro manquant dans la suite,
//     qu'aucune référence `refs/tags/reserve/D-NNN` ne couvre ; la numérotation
//     est une suite, pas une étiquette : un tel trou signifie qu'une décision a
//     été perdue, ou qu'un renvoi pointe vers le vide ;
//   - **désordre** — la section active est rangée au RANG NUMÉRIQUE, du plus
//     haut au plus bas. Une entrée insérée au mauvais rang après une résolution
//     de conflit se voit ici et nulle part ailleurs ;
//   - **trou en avertissement** — sur une PR, un trou couvert par une
//     réservation est « en vol » : une autre branche porte ce numéro et n'a pas
//     encore mergé. Sur `main` (et hors PR, au poste local), un trou n'est
//     JAMAIS rouge : son verdict ne dépend d'aucune référence distante, et le
//     garde n'en lit aucune. À partir de trois trous, l'avertissement rappelle
//     la pierre tombale — seuil d'affichage, pas une capacité.
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
// l'ancien régime : relire `origin/main` juste avant le merge, fusionner `main`
// plutôt que rebaser, renuméroter ici puis reprendre registre, fragment et
// code.
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
// faire : **un numéro ne se libère jamais.** Supprimer le titre `### D-NNN`
// d'une décision abandonnée, annulée ou remplacée creuse un trou dans la suite,
// et le garde le refuse — à raison : huit renvois du dépôt pointent vers des
// `D-NNN` précis, et l'un d'eux désignerait alors le vide.
//
// Quatre gestes, et rien d'autre :
//   - **la décision est dépassée** → la déplacer sous la section « archivées »,
//     titre et numéro inchangés. La suite reste pleine, la section active
//     s'allège, et les renvois continuent de tomber juste.
//   - **la décision est annulée ou remplacée** → la garder en place et le dire
//     dans son corps (« annulée le …, remplacée par D-0xx »). Ce garde ne lit
//     pas le contenu : le statut est affaire humaine, la numérotation non.
//   - **le titre a été écrit par erreur, avant tout merge sur `main`** → alors
//     seulement, le retirer *et* renuméroter ce qui suit, puis reprendre les
//     renvois. C'est le seul cas où la suite se referme, et il ne concerne
//     qu'une branche qui n'a jamais été publiée.
//   - **le numéro a été réservé puis abandonné** → le fermer par une pierre
//     tombale, à son rang dans la section active : `### D-NNN — Numéro non
//     utilisé`, avec sa ligne « Date ». Il ne se réutilise jamais, et la
//     réservation reste (D-370 §2).
//
// Ce que ce contrôle NE fait pas, délibérément : lire le contenu d'une
// décision. Ni la date, ni le statut, ni les champs. Un garde qui juge le fond
// d'un arbitrage clinique serait faux dans les deux sens ; celui-ci ne tient
// que la mécanique de la numérotation, qui est exacte.

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

export const FICHIER = "docs/DECISIONS.md";

const TITRE_SECTION = /^##\s+(.+?)\s*$/;
const TITRE_DECISION = /^###\s+D-(\d+)\b\s*(?:—\s*(.*))?$/;

const SECTION_ACTIVE = "actives";
const SECTION_ARCHIVE = "archivées";

// À partir de ce nombre de trous, l'avertissement rappelle la pierre tombale.
// Seuil d'affichage, pas une capacité (D-370 §2) : rien n'est refusé au-delà.
export const SEUIL_AFFICHAGE_TROUS = 3;

const PREFIXE_RESERVATION = "refs/tags/reserve/D-";
const REFERENCE_RESERVATION = /^refs\/tags\/reserve\/D-(\d+)$/;

export const nomDecision = (n) => `D-${String(n).padStart(3, "0")}`;

/** La référence qui réserve un numéro — elle ne porte que lui (D-370 §1). */
export const referenceReservation = (n) => `${PREFIXE_RESERVATION}${String(n).padStart(3, "0")}`;

/**
 * Les décisions du fichier, dans l'ordre du texte.
 * @param {string} texte
 * @returns {Array<{numero: number, brut: string, ligne: number, section: string, titre: string}>}
 */
export function extraireDecisions(texte) {
  const decisions = [];
  let section = "";
  texte.split(/\r?\n/).forEach((ligne, index) => {
    const s = TITRE_SECTION.exec(ligne);
    if (s) {
      const nom = s[1].toLowerCase();
      if (nom.includes(SECTION_ACTIVE)) section = SECTION_ACTIVE;
      else if (nom.includes(SECTION_ARCHIVE)) section = SECTION_ARCHIVE;
      else section = nom;
      return;
    }
    const d = TITRE_DECISION.exec(ligne);
    if (!d) return;
    decisions.push({
      numero: Number.parseInt(d[1], 10),
      brut: `D-${d[1]}`,
      ligne: index + 1,
      section,
      titre: (d[2] || "").trim(),
    });
  });
  return decisions;
}

/**
 * Les numéros absents de la suite, de 1 au plus haut.
 * @param {ReturnType<typeof extraireDecisions>} decisions
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
 * @param {ReturnType<typeof extraireDecisions>} decisions
 * @param {{surPR?: boolean, reservations?: Set<number> | null, erreurReservations?: string, surBase?: Set<number> | null}} [contexte]
 *   `surPR` : le trou se juge contre les réservations (`reservations`, lues par
 *   l'appelant ; `null` = illisibles, motif dans `erreurReservations`) et
 *   contre la base de la PR (`surBase`, numéros de son registre ; `null` = non
 *   lue). Un numéro présent sur la base est MERGÉ : son trou est une décision
 *   supprimée, refusée même réservée — une réservation ne se nettoie jamais,
 *   « en vol » veut dire réservé et pas encore mergé. Hors PR, un trou n'est
 *   qu'un avertissement et rien n'est lu.
 * @returns {{violations: Array<{genre: string, ligne: number, message: string}>, avertissements: Array<{genre: string, ligne: number, message: string}>, comptees: number, max: number}}
 */
export function auditerDecisions(decisions, contexte = {}) {
  const { surPR = false, reservations = null, erreurReservations = "", surBase = null } = contexte;
  const violations = [];
  const avertissements = [];

  // 1. Doublons. Le défaut d'origine, et le seul qui se propage en silence :
  //    deux décisions distinctes rendues indiscernables par leurs renvois.
  const parNumero = new Map();
  for (const d of decisions) {
    if (!parNumero.has(d.numero)) parNumero.set(d.numero, []);
    parNumero.get(d.numero).push(d);
  }
  for (const [numero, liste] of [...parNumero.entries()].sort((a, b) => a[0] - b[0])) {
    if (liste.length < 2) continue;
    const lignes = liste.map((d) => d.ligne).join(", ");
    violations.push({
      genre: "doublon",
      ligne: liste[1].ligne,
      message:
        `${nomDecision(numero)} est porté par ${liste.length} décisions ` +
        `(lignes ${lignes}) — renuméroter la plus récente et reprendre ses renvois.`,
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
      ligne: 0,
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
      ligne: 0,
      message:
        `${liste(supprimees)} existe${accord(supprimees)} sur la base de la PR et manque${accord(supprimees)} ` +
        `ici : décision supprimée (résolution de conflit qui perd une entrée ?), refusée même ` +
        `réservée. Un numéro mergé ne se libère jamais — déplacer sous « archivées », ou ` +
        `garder en place en disant « annulée ».`,
    });
  }
  const nonMerges = manquants.filter((n) => !supprimees.includes(n));
  if (nonMerges.length > 0 && surPR) {
    if (reservations === null) {
      violations.push({
        genre: "trou",
        ligne: 0,
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
          ligne: 0,
          message:
            `${liste(enVol)} en vol : réservé${enVol.length > 1 ? "s" : ""}, pas encore ` +
            `mergé${enVol.length > 1 ? "s" : ""} (refs/tags/reserve/D-…).` +
            rappelPierreTombale,
        });
      }
      if (perdus.length > 0) {
        violations.push({
          genre: "trou",
          ligne: 0,
          message:
            `la suite est trouée : ${liste(perdus)} manque${accord(perdus)} entre D-001 et ` +
            `${nomDecision(max)}, sans réservation. Un numéro ne se libère jamais : une ` +
            `décision dépassée se DÉPLACE sous « archivées » (numéro inchangé), une décision ` +
            `annulée ou remplacée se garde en place en le disant dans son corps, un numéro ` +
            `réservé puis abandonné se ferme par une pierre tombale. Ne renuméroter que sur ` +
            `une branche jamais publiée.`,
        });
      }
    }
  }

  // 3. Ordre de la section active — au rang numérique, du plus haut au plus
  //    bas (D-370 §3). C'est ce qui casse après une résolution de conflit.
  const actives = decisions.filter((d) => d.section === SECTION_ACTIVE);
  for (let i = 1; i < actives.length; i += 1) {
    const precedente = actives[i - 1];
    const courante = actives[i];
    // `<=` et non `<` : deux numéros égaux sont déjà nommés comme doublon.
    // Les compter une seconde fois en désordre rendrait deux constats pour un
    // seul défaut, et le second désignerait un remède faux (« déplacer »).
    if (courante.numero <= precedente.numero) continue;
    violations.push({
      genre: "désordre",
      ligne: courante.ligne,
      message:
        `${courante.brut} suit ${precedente.brut} dans la section active, rangée au rang ` +
        `numérique du plus haut au plus bas — l'insérer à son rang.`,
    });
  }

  return { violations, avertissements, comptees: decisions.length, max };
}

export function lireFichier(racine) {
  const chemin = path.join(racine, FICHIER);
  if (!fs.existsSync(chemin)) return null;
  return fs.readFileSync(chemin, "utf8");
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
 * Les décisions de `tete` dont le numéro est absent de `base`.
 * @param {string} texteBase
 * @param {string} texteTete
 */
export function decisionsAjoutees(texteBase, texteTete) {
  const avant = new Set(extraireDecisions(texteBase).map((d) => d.numero));
  return extraireDecisions(texteTete).filter((d) => !avant.has(d.numero));
}

function messageErreur(e) {
  return String(e?.stderr || e?.message || e).trim().split(/\r?\n/)[0];
}

/** Le registre à un commit donné, ou `null` s'il est illisible. */
function lireRegistreA(racine, ref) {
  try {
    return execFileSync("git", ["show", `${ref}:${FICHIER}`], {
      cwd: racine,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch {
    return null;
  }
}

/** L'ancêtre commun de `HEAD` et de `ref`, ou `null`. */
function ancetreCommun(racine, ref) {
  try {
    return execFileSync("git", ["merge-base", "HEAD", ref], { cwd: racine, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim() || null;
  } catch {
    return null;
  }
}

// L'étape d'accompagnement de `ci.yml` (D-370 §4) : sur une PR non
// documentaire, signale une décision ajoutée sans réservation — sa
// renumérotation coûterait un CI complet. Jamais bloquante : elle sort 0 dans
// tous les cas, lecture impossible comprise.
function accompagner(racine, base, gh) {
  const texteBase = lireRegistreA(racine, base);
  if (texteBase === null) {
    console.log(`::warning::Accompagnement des réservations sans objet : ${FICHIER} illisible sur ${base}.`);
    return 0;
  }
  const texteTete = lireFichier(racine) ?? "";
  const ajoutees = decisionsAjoutees(texteBase, texteTete);
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
      `::warning file=${FICHIER},line=${d.ligne}::${d.brut} ajouté sans réservation — ` +
        `si une autre PR le prend d'abord, la renumérotation coûtera un CI complet. ` +
        `Réserver : node scripts/wn-reserver-decision.mjs (D-370 §4).`,
    );
  }
  return 0;
}

// Exécuté directement : le contrôle bloquant du CI. Comme ses voisins de
// `scripts/lib/`, il refuse d'être vert sur un fichier absent ou sans aucune
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

  const texte = lireFichier(racine);
  if (texte === null) {
    console.error(`✗ ${FICHIER} introuvable depuis ${racine} — contrôle sans objet, refus d'être vert.`);
    process.exit(2);
  }
  const decisions = extraireDecisions(texte);
  if (decisions.length === 0) {
    console.error(`✗ Aucune décision lue dans ${FICHIER} — contrôle sans objet, refus d'être vert.`);
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
    // La base, lue localement (`git show`, aucun appel distant) : `HEAD^1`,
    // premier parent du commit de fusion de la PR, en CI ; au poste local,
    // l'ancêtre commun avec `origin/main` — `origin/main` lui-même ferait lire
    // comme supprimée une décision mergée après la création de la branche
    // (revue CodeRabbit de #1743). Base illisible ⇒ refus, en CI comme avec
    // `--pr` : la suppression n'est pas vérifiable.
    const base = enCIdePR ? "HEAD^1" : ancetreCommun(racine, "origin/main");
    const texteBase = base === null ? null : lireRegistreA(racine, base);
    if (texteBase === null) {
      console.error(`✗ ${FICHIER} illisible sur ${base ?? "l'ancêtre commun avec origin/main"} — décision supprimée non vérifiable sur une PR.`);
      process.exit(1);
    }
    surBase = new Set(extraireDecisions(texteBase).map((d) => d.numero));
  }

  const { violations, avertissements, comptees, max } = auditerDecisions(decisions, {
    surPR,
    reservations,
    erreurReservations,
    surBase,
  });
  const enCI = process.env.GITHUB_ACTIONS === "true";
  for (const a of avertissements) {
    console.log(`${enCI ? "::warning::" : "⚠ "}${FICHIER} — ${a.message}`);
  }
  for (const v of violations) {
    const ou = v.ligne > 0 ? `${FICHIER}:${v.ligne}` : FICHIER;
    console.error(`✗ ${ou} — ${v.message}`);
  }
  if (violations.length > 0) {
    console.error(
      `\n→ La numérotation de ${FICHIER} est une suite : un numéro, une décision, ` +
        `et la section active rangée au rang numérique, du plus haut au plus bas.`,
    );
    process.exit(1);
  }
  const trous = avertissements.length > 0 ? "trous en avertissement" : "sans trou";
  console.log(
    `OK : ${comptees} décisions, D-001 à ${nomDecision(max)}, sans doublon, ${trous}, ` +
      `section active au rang numérique${surPR ? " (PR)" : ""}.`,
  );
}
