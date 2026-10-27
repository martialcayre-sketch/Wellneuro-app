#!/usr/bin/env node
// RÉSERVATION D'UN NUMÉRO DE DÉCISION — D-370 §1 (plan, fiche H87).
//
// Le numéro d'une décision se réserve à la RÉDACTION, plus au merge. Ce script
// lit le dernier numéro de `docs/DECISIONS.md` sur `main` et les réservations
// existantes, puis crée par l'API GitHub la référence
// `refs/tags/reserve/D-NNN` du premier numéro libre. La référence pointe sur la
// tête de `main` et ne porte que le numéro : aucune autre donnée (dépôt
// public). Elle reste après le merge — aucun nettoyage.
//
// QUATRE ISSUES, et rien d'autre :
//   - **créée** — le numéro est à vous ; le réutiliser jusqu'au merge ;
//   - **déjà existante** — seule cause qui fait passer au numéro suivant :
//     une autre session l'a réservé entre la lecture et la création ;
//   - **inconnu** — tout autre refus (indisponibilité, délai réseau, droit,
//     objet introuvable…) : la référence a pu être créée ou non. Aucun nouvel
//     essai automatique, le rédacteur relance — un second essai sur une
//     création peut-être réussie réserverait deux numéros pour une décision ;
//   - **partiel** — pour plusieurs numéros, ceux créés restent réservés même
//     si une création suivante échoue ; le résultat partiel est rendu.
//
// Codes de sortie : 0 = tous les numéros demandés réservés ; 3 = inconnu, ou
// garde-fou de 50 « déjà existante » d'affilée atteint (résultat partiel
// affiché) ; 2 = rien n'a été tenté (usage, `main`, registre
// ou réservations illisibles).
//
// Usage :
//   node scripts/wn-reserver-decision.mjs            un numéro
//   node scripts/wn-reserver-decision.mjs --nombre 3 trois numéros
//
// Banc : `scripts/wn-reserver-decision.test.mjs`, sur API simulée.

import { pathToFileURL } from "node:url";

import {
  extraireDecisions,
  FICHIER,
  ghParDefaut,
  lireReservations,
  nomDecision,
  referenceReservation,
} from "./lib/decisions-numerotation.mjs";

// Garde-fou contre une boucle sans fin si l'API rendait « déjà existante » à
// chaque numéro : au-delà de ce nombre de refus d'affilée, arrêt.
const ESSAIS_MAX = 50;

const DEJA_EXISTANTE = /Reference already exists/i;

/**
 * Le refus de création se lit dans le message, jamais dans le seul statut :
 * « Reference already exists » et « Object does not exist » sont tous deux
 * des HTTP 422.
 * @param {string} sortie stderr et stdout de `gh api`
 * @returns {"existe" | "inconnu"}
 */
export function classerRefusCreation(sortie) {
  return DEJA_EXISTANTE.test(sortie ?? "") ? "existe" : "inconnu";
}

function messageErreur(e) {
  return String(e?.stderr || e?.message || e).trim().split(/\r?\n/)[0];
}

/**
 * L'API GitHub par `gh` : trois lectures, une création.
 * @param {(args: string[]) => string} gh
 */
export function apiGitHub(gh = ghParDefaut) {
  return {
    teteMain() {
      const sha = JSON.parse(gh(["api", "repos/{owner}/{repo}/commits/main"])).sha;
      if (!/^[0-9a-f]{40}$/.test(sha ?? "")) throw new Error("sha de main illisible");
      return sha;
    },
    registre(sha) {
      return gh(["api", "-H", "Accept: application/vnd.github.raw", `repos/{owner}/{repo}/contents/${FICHIER}?ref=${sha}`]);
    },
    reservations() {
      return lireReservations(gh);
    },
    creer(ref, sha) {
      try {
        gh(["api", "-X", "POST", "repos/{owner}/{repo}/git/refs", "-f", `ref=${ref}`, "-f", `sha=${sha}`]);
        return { issue: "creee" };
      } catch (e) {
        const sortie = `${e?.stderr ?? ""}\n${e?.stdout ?? ""}\n${e?.message ?? ""}`;
        return { issue: classerRefusCreation(sortie), detail: messageErreur(e) };
      }
    },
  };
}

/**
 * @param {{nombre?: number, api: ReturnType<typeof apiGitHub>}} options
 * @returns {{statut: "ok" | "inconnu" | "epuise" | "illisible", reserves: number[], inconnu?: number, detail?: string, sautes: number[]}}
 */
export function reserver({ nombre = 1, api }) {
  let sha;
  let maxMain;
  let reservations;
  try {
    sha = api.teteMain();
    const numeros = extraireDecisions(api.registre(sha)).map((d) => d.numero);
    if (numeros.length === 0) throw new Error(`aucune décision lue dans ${FICHIER} sur main`);
    maxMain = Math.max(...numeros);
    reservations = api.reservations();
  } catch (e) {
    return { statut: "illisible", reserves: [], sautes: [], detail: messageErreur(e) };
  }

  const reserves = [];
  const sautes = [];
  let candidat = maxMain + 1;
  let essais = 0;
  while (reserves.length < nombre) {
    if (reservations.has(candidat)) {
      candidat += 1;
      continue;
    }
    if (essais >= ESSAIS_MAX) {
      return { statut: "epuise", reserves, sautes, detail: `${ESSAIS_MAX} créations refusées « déjà existante » d'affilée` };
    }
    essais += 1;
    const r = api.creer(referenceReservation(candidat), sha);
    if (r.issue === "creee") {
      reserves.push(candidat);
      essais = 0;
    } else if (r.issue === "existe") {
      sautes.push(candidat);
    } else {
      return { statut: "inconnu", reserves, sautes, inconnu: candidat, detail: r.detail };
    }
    candidat += 1;
  }
  return { statut: "ok", reserves, sautes };
}

/**
 * @param {string[]} argv
 * @returns {{nombre: number} | {erreur: string}}
 */
export function analyserArguments(argv) {
  let nombre = 1;
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--nombre" && /^[1-9]\d*$/.test(argv[i + 1] ?? "")) {
      nombre = Number(argv[i + 1]);
      i += 1;
      continue;
    }
    return { erreur: `argument inconnu : ${argv[i]}` };
  }
  return { nombre };
}

/** @returns {number} le code de sortie */
export function principal(argv, api = apiGitHub()) {
  const args = analyserArguments(argv);
  if ("erreur" in args) {
    console.error(`✗ ${args.erreur} — usage : node scripts/wn-reserver-decision.mjs [--nombre N]`);
    return 2;
  }
  const r = reserver({ nombre: args.nombre, api });
  for (const n of r.sautes) console.log(`· ${nomDecision(n)} déjà réservé par ailleurs — numéro suivant.`);
  for (const n of r.reserves) console.log(`✓ ${nomDecision(n)} réservé (${referenceReservation(n)}).`);
  if (r.statut === "illisible") {
    console.error(`✗ Rien n'a été réservé : ${r.detail}.`);
    return 2;
  }
  if (r.statut === "epuise") {
    console.error(
      `✗ Arrêt : ${r.detail} — aucune référence laissée dans un état inconnu ; relancer le script.` +
        (r.reserves.length > 0 ? ` Les numéros ci-dessus restent réservés.` : ""),
    );
    return 3;
  }
  if (r.statut === "inconnu") {
    console.error(
      `✗ ${nomDecision(r.inconnu)} : issue inconnue (${r.detail}) — la référence a pu être créée ou non. ` +
        `Aucun nouvel essai : relancer le script, qui saute les numéros déjà réservés ; si ` +
        `${referenceReservation(r.inconnu)} existe sans décision au merge, il se ferme par une pierre tombale.` +
        (r.reserves.length > 0 ? ` Les numéros ci-dessus restent réservés.` : ""),
    );
    return 3;
  }
  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  process.exit(principal(process.argv.slice(2)));
}
