// Lecture du registre des décisions, un fichier par décision (D-418).
//
// Depuis la bascule de D-418, une décision vit dans `docs/decisions/D-NNN.md`
// (archivée : `docs/decisions/archivees/D-NNN.md`), nommée par son seul
// numéro, première ligne `# D-NNN — <titre>`. `docs/DECISIONS.md` n'est plus
// qu'une page fixe qui dit où lire.
//
// Ce module est la seule lecture partagée du répertoire : le garde de
// numérotation, la réservation, `wn-cycle`, `wn-decisions` et le découpage
// passent par lui. Une lecture qui ne trouve AUCUNE décision lève : un outil
// qui se viderait en silence (D-418 §5) rendrait la même sortie qu'un
// registre sain.

import fs from "node:fs";
import path from "node:path";

export const REPERTOIRE = "docs/decisions";
export const SOUS_REPERTOIRE_ARCHIVES = "archivees";
export const ARCHIVES = `${REPERTOIRE}/${SOUS_REPERTOIRE_ARCHIVES}`;
export const PAGE = "docs/DECISIONS.md";

export const SECTION_ACTIVE = "actives";
export const SECTION_ARCHIVE = "archivées";

/** `D-NNN.md`, NNN sur trois chiffres au moins. */
export const NOM_FICHIER = /^D-(\d{3,})\.md$/;

/** La première ligne d'une décision : `# D-NNN — <titre>`. */
export const TITRE = /^# D-(\d+) — (.+)$/;

export const nomDecision = (n) => `D-${String(n).padStart(3, "0")}`;

/** Le nom de fichier canonique d'un numéro : `D-042.md`, jamais `D-42.md`. */
export const nomFichier = (n) => `${nomDecision(n)}.md`;

/**
 * Le numéro d'un nom de fichier canonique, sinon `null` (`D-42.md`,
 * `D-042-intitule.md`, `README.md`…).
 * @param {string} nom
 */
export function numeroDuNom(nom) {
  const m = NOM_FICHIER.exec(nom);
  if (!m) return null;
  const n = Number.parseInt(m[1], 10);
  return nomFichier(n) === nom ? n : null;
}

/**
 * Tout ce que portent les deux répertoires, décision ou non — le garde juge
 * aussi ce qui n'a pas la forme d'une décision.
 * @param {string} racine
 * @returns {{present: boolean, entrees: Array<{chemin: string, nom: string, section: string, dossier: boolean}>}}
 */
export function listerEntrees(racine) {
  const entrees = [];
  const absolu = path.join(racine, REPERTOIRE);
  if (!fs.existsSync(absolu)) return { present: false, entrees };
  for (const e of fs.readdirSync(absolu, { withFileTypes: true })) {
    if (e.isDirectory() && e.name === SOUS_REPERTOIRE_ARCHIVES) {
      for (const a of fs.readdirSync(path.join(absolu, e.name), { withFileTypes: true })) {
        entrees.push({ chemin: `${ARCHIVES}/${a.name}`, nom: a.name, section: SECTION_ARCHIVE, dossier: a.isDirectory() });
      }
      continue;
    }
    entrees.push({ chemin: `${REPERTOIRE}/${e.name}`, nom: e.name, section: SECTION_ACTIVE, dossier: e.isDirectory() });
  }
  entrees.sort((a, b) => a.chemin.localeCompare(b.chemin));
  return { present: true, entrees };
}

/**
 * Les décisions du registre, du plus récent au plus ancien (numéro
 * décroissant), contenu compris. Les entrées qui n'ont pas la forme d'une
 * décision sont ignorées ici : c'est le garde qui les refuse.
 * @param {string} racine
 * @returns {Array<{numero: number, id: string, chemin: string, section: string, contenu: string}>}
 */
export function lireDecisions(racine) {
  const { present, entrees } = listerEntrees(racine);
  if (!present) throw new Error(`${REPERTOIRE}/ introuvable depuis ${racine}`);
  const decisions = [];
  for (const e of entrees) {
    if (e.dossier) continue;
    const numero = numeroDuNom(e.nom);
    if (numero === null) continue;
    decisions.push({
      numero,
      id: nomDecision(numero),
      chemin: e.chemin,
      section: e.section,
      contenu: fs.readFileSync(path.join(racine, e.chemin), "utf8"),
    });
  }
  if (decisions.length === 0) throw new Error(`aucune décision lue dans ${REPERTOIRE}/`);
  decisions.sort((a, b) => b.numero - a.numero || a.section.localeCompare(b.section));
  return decisions;
}

/**
 * Normalise `D-418`, `D-0418`, `418` ou `d-418` en numéro, sinon `null`.
 * @param {string} brut
 */
export function numeroDemande(brut) {
  const m = /^(?:D-)?(\d+)$/i.exec(String(brut ?? "").trim());
  return m ? Number.parseInt(m[1], 10) : null;
}

/**
 * Une décision par son numéro, active ou archivée ; lève si elle est absente.
 * @param {string} racine
 * @param {string} id `D-418`, `418`…
 */
export function lireDecision(racine, id) {
  const numero = numeroDemande(id);
  if (numero === null) throw new Error(`numéro de décision illisible : ${id}`);
  const trouvee = lireDecisions(racine).find((d) => d.numero === numero);
  if (!trouvee) throw new Error(`${nomDecision(numero)} absente de ${REPERTOIRE}/`);
  return trouvee;
}
