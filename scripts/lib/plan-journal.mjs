// JOURNAL DU PLAN EN FRAGMENTS — D-371 (plan, fiche H90).
//
// Les lignes « Mise à jour (date…) » d'une fiche Fnn ou Hnn sortent du plan
// vers `docs/claude/plan-journal/<fiche>/<nom>.md`, un fichier par mise à
// jour, jamais réécrit. La fiche garde UNE ligne de renvoi permanente, posée à
// la place de ses mises à jour (ou, sans mise à jour, après sa dernière puce).
// Les lignes « Mise à jour » hors fiche (en-tête, §0 à §11) restent en place.
//
// Ce module est pur : il découpe un texte et le reconstruit, sans toucher au
// disque — sauf `lireJournal`, qui LIT un dossier. Aucune écriture ici : elle
// vit dans `scripts/wn-plan-bascule.mjs`, derrière son drapeau.
//
// La propriété qui fonde tout le reste, éprouvée par
// `scripts/lib/plan-journal.test.mjs` sur le plan réel : pour tout plan P,
// reconstruire(basculer(P)) === P, à l'octet près.
//
// Règles de découpage, et rien d'autre :
//   - une fiche court de son titre `#### Fnn · …` (ou `Hnn`) jusqu'au titre
//     suivant, de n'importe quel niveau ;
//   - une mise à jour commence par une ligne `- **Mise à jour (AAAA-MM-JJ…)**`
//     et emporte ses lignes de suite : indentées, ou vides SI une ligne
//     indentée les suit (une liste ou un tableau dans la mise à jour) ;
//   - les mises à jour d'une fiche doivent se suivre sans autre ligne entre
//     elles, et leurs dates ne pas reculer : sinon la place de chacune ne se
//     reconstruirait pas de l'ordre des noms. Une telle fiche est ÉCARTÉE —
//     laissée en place, intacte, et nommée au rapport — plutôt que réordonnée :
//     la remettre en ordre est un geste sur le texte, pas l'affaire du script.
//
// Ordre de lecture du journal : par nom de fichier, ordre des points de code
// (jamais celui de la locale). Nom produit par la bascule :
// `<date>-<nn>-<slug>.md`, `nn` = rang à deux chiffres parmi les mises à jour
// de la même date dans la fiche.

import fs from "node:fs";
import path from "node:path";

export const PLAN = "docs/claude/PLAN_WELLNEURO.md";
export const JOURNAL = "docs/claude/plan-journal";

const TITRE_FICHE = /^#### ([FH]\d+) · /;
const TITRE = /^#{1,6} /;
// Deux formes de titre : `(date, libellé)` et `(date), libellé` (H86).
const MISE_A_JOUR = /^- \*\*Mise à jour \((\d{4}-\d{2}-\d{2})(?:, ([^)]*(?:\([^)]*\)[^)]*)*))?\)(?:, ([^*]+))?\*\* :/;
const DEBUT_MISE_A_JOUR = /^- \*\*Mise à jour\b/;
const RENVOI = /^- \*\*Journal\*\* : `docs\/claude\/plan-journal\/([^/`]+)\/`/;
const PUCE = /^- /;
const SUITE = /^\s+\S/;
const VIDE = /^\s*$/;
// Le rang `nn` est exigé : sans lui, deux fragments du même jour se liraient
// dans l'ordre alphabétique de leur slug, pas dans l'ordre d'écriture.
export const NOM_FRAGMENT = /^\d{4}-\d{2}-\d{2}-\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*\.md$/;
export const ID_FICHE = /^[FH]\d+$/;

export function ligneDeRenvoi(fiche) {
  return `- **Journal** : \`${JOURNAL}/${fiche}/\` — mises à jour datées, un fichier par mise à jour, jamais réécrit ; lecture : \`node scripts/wn-plan-fiche.mjs ${fiche}\`.`;
}

/** Comparaison par points de code, indépendante de la locale. */
export function comparerNoms(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * Indice de la dernière ligne d'un bloc commencé en `i` (une puce et ses
 * lignes de suite). Une ligne vide n'appartient au bloc que si une ligne
 * indentée la suit.
 */
function finDeBloc(lignes, i, borne) {
  let fin = i;
  let j = i + 1;
  while (j < borne) {
    if (SUITE.test(lignes[j])) {
      fin = j;
      j++;
      continue;
    }
    if (VIDE.test(lignes[j])) {
      let k = j;
      while (k < borne && VIDE.test(lignes[k])) k++;
      if (k < borne && SUITE.test(lignes[k])) {
        fin = k;
        j = k + 1;
        continue;
      }
    }
    break;
  }
  return fin;
}

/** Vrai si `AAAA-MM-JJ` désigne un jour qui existe (le nom d'un fragment la garde à jamais). */
function dateReelle(date) {
  const d = new Date(`${date}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === date;
}

/** Slug ASCII d'un libellé de mise à jour. */
export function slug(libelle) {
  const s = (libelle ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (s === "") return "mise-a-jour";
  if (s.length <= 48) return s;
  const coupe = s.slice(0, 48);
  const tiret = coupe.lastIndexOf("-");
  return (tiret > 0 ? coupe.slice(0, tiret) : coupe).replace(/-+$/, "");
}

/**
 * Les fiches d'un texte de plan : `{ id, titre, fin, majs, renvois }`, où
 * `titre` est l'indice de la ligne de titre, `fin` l'indice (exclu) de la
 * ligne qui la termine, `majs` les blocs de mise à jour `{ debut, fin, date,
 * libelle }` (fin incluse), `renvois` les indices des lignes de renvoi.
 */
export function analyserFiches(lignes) {
  const fiches = [];
  for (let i = 0; i < lignes.length; i++) {
    const m = TITRE_FICHE.exec(lignes[i]);
    if (!m) continue;
    let fin = i + 1;
    while (fin < lignes.length && !TITRE.test(lignes[fin])) fin++;
    const fiche = { id: m[1], titre: i, fin, majs: [], renvois: [], anomalies: [] };
    for (let j = i + 1; j < fin; j++) {
      const r = RENVOI.exec(lignes[j]);
      if (r) {
        fiche.renvois.push(j);
        if (r[1] !== fiche.id) fiche.anomalies.push(`ligne ${j + 1} : renvoi vers ${r[1]} dans la fiche ${fiche.id}`);
        continue;
      }
      if (!DEBUT_MISE_A_JOUR.test(lignes[j])) continue;
      const mm = MISE_A_JOUR.exec(lignes[j]);
      const f = finDeBloc(lignes, j, fin);
      if (!mm) fiche.anomalies.push(`ligne ${j + 1} : mise à jour sans date lisible`);
      else if (!dateReelle(mm[1])) fiche.anomalies.push(`ligne ${j + 1} : date ${mm[1]} hors du calendrier`);
      fiche.majs.push({ debut: j, fin: f, date: mm?.[1] ?? null, libelle: mm?.[2] ?? mm?.[3] ?? null });
      j = f;
    }
    fiches.push(fiche);
    i = fin - 1;
  }
  return fiches;
}

/** Indice où poser le renvoi d'une fiche sans mise à jour : après sa dernière puce de tête. */
function placeSansMiseAJour(lignes, fiche) {
  let j = fiche.titre + 1;
  let apres = j;
  while (j < fiche.fin && PUCE.test(lignes[j])) {
    const f = finDeBloc(lignes, j, fiche.fin);
    apres = f + 1;
    j = f + 1;
  }
  return apres;
}

/** Ce qui empêche de reconstruire une fiche à sa place exacte. */
function irregularites(f, lignes) {
  const motifs = [...f.anomalies];
  // Une mise à jour que la suite des puces de tête n'atteint pas suit un
  // paragraphe (« **File D : …** ») : elle peut être celle du groupe, pas de
  // la fiche.
  if (f.majs.length > 0 && placeSansMiseAJour(lignes, f) <= f.majs[0].debut) {
    motifs.push(`mise à jour hors de la suite des puces de tête (ligne ${f.majs[0].debut + 1})`);
  }
  const parDate = new Map();
  for (const m of f.majs) parDate.set(m.date, (parDate.get(m.date) ?? 0) + 1);
  for (const [date, n] of parDate) if (n > 99) motifs.push(`${n} mises à jour le ${date} — le rang tient sur deux chiffres`);
  for (let k = 1; k < f.majs.length; k++) {
    const avant = f.majs[k - 1];
    const m = f.majs[k];
    if (m.debut !== avant.fin + 1) motifs.push(`mises à jour non contiguës (lignes ${avant.fin + 1} et ${m.debut + 1})`);
    if (avant.date && m.date && m.date < avant.date) motifs.push(`date en recul (${avant.date} puis ${m.date}, ligne ${m.debut + 1})`);
  }
  return motifs;
}

/**
 * Découpe un plan. Rend `{ plan, fragments, ecartees, refus }` :
 * `fragments` est une liste `{ fiche, nom, contenu }` dans l'ordre du plan ;
 * `ecartees` les fiches laissées intactes `{ fiche, motifs }` ; `refus` les
 * raisons qui interdisent toute bascule (alors `plan` vaut `null`). Aucune
 * écriture.
 */
export function basculer(texte) {
  const lignes = texte.split("\n");
  const fiches = analyserFiches(lignes);
  const refus = [];
  const vus = new Set();
  for (const f of fiches) {
    if (vus.has(f.id)) refus.push(`fiche ${f.id} en double (ligne ${f.titre + 1})`);
    vus.add(f.id);
    if (f.renvois.length > 0) refus.push(`fiche ${f.id} : ligne de renvoi déjà posée (ligne ${f.renvois[0] + 1}) — bascule déjà jouée ?`);
  }
  if (refus.length > 0) return { plan: null, fragments: [], ecartees: [], refus };

  const sortie = [];
  const fragments = [];
  const ecartees = [];
  let curseur = 0;
  for (const f of fiches) {
    const motifs = irregularites(f, lignes);
    if (motifs.length > 0) {
      ecartees.push({ fiche: f.id, motifs });
      continue;
    }
    if (f.majs.length === 0) {
      const place = placeSansMiseAJour(lignes, f);
      sortie.push(...lignes.slice(curseur, place), ligneDeRenvoi(f.id));
      curseur = place;
      continue;
    }
    const premiere = f.majs[0];
    sortie.push(...lignes.slice(curseur, premiere.debut), ligneDeRenvoi(f.id));
    const rangs = new Map();
    for (const m of f.majs) {
      const rang = (rangs.get(m.date) ?? 0) + 1;
      rangs.set(m.date, rang);
      const contenu = lignes.slice(m.debut, m.fin + 1).join("\n") + "\n";
      fragments.push({ fiche: f.id, nom: `${m.date}-${String(rang).padStart(2, "0")}-${slug(m.libelle)}.md`, contenu });
    }
    curseur = f.majs[f.majs.length - 1].fin + 1;
  }
  sortie.push(...lignes.slice(curseur));
  const plan = sortie.join("\n");
  return { plan, fragments, ecartees, refus };
}

/**
 * Le journal en mémoire : `Map<fiche, [{ nom, contenu }]>`, chaque liste triée
 * par nom. Accepte une liste `{ fiche, nom, contenu }`.
 */
export function journalDepuisFragments(fragments) {
  const j = new Map();
  for (const f of fragments) {
    if (!j.has(f.fiche)) j.set(f.fiche, []);
    j.get(f.fiche).push({ nom: f.nom, contenu: f.contenu });
  }
  for (const liste of j.values()) liste.sort((a, b) => comparerNoms(a.nom, b.nom));
  return j;
}

/**
 * Lit le journal sur disque. Un dossier absent rend un journal vide. Un
 * dossier ou un fichier qui n'a pas la forme attendue est une erreur levée,
 * jamais ignoré en silence.
 */
export function lireJournal(dossier) {
  const j = new Map();
  if (!fs.existsSync(dossier)) return j;
  for (const entree of fs.readdirSync(dossier, { withFileTypes: true }).sort((a, b) => comparerNoms(a.name, b.name))) {
    if (entree.isFile() && entree.name === "README.md") continue;
    if (!entree.isDirectory() || !ID_FICHE.test(entree.name)) {
      throw new Error(`${path.join(dossier, entree.name)} : entrée inattendue dans le journal (attendu : un dossier Fnn ou Hnn)`);
    }
    const liste = [];
    const datesRangs = new Set();
    for (const f of fs.readdirSync(path.join(dossier, entree.name), { withFileTypes: true })) {
      if (!f.isFile() || !NOM_FRAGMENT.test(f.name)) {
        throw new Error(`${path.join(dossier, entree.name, f.name)} : nom de fragment non conforme (attendu : AAAA-MM-JJ-nn-slug.md)`);
      }
      if (!dateReelle(f.name.slice(0, 10))) {
        throw new Error(`${path.join(dossier, entree.name, f.name)} : date du nom hors du calendrier`);
      }
      // Un couple date-rang ne sert qu'une fois par fiche, quel que soit le
      // slug : sinon l'ordre du jour suivrait l'alphabet du slug.
      const dateRang = f.name.slice(0, 13);
      if (f.name.slice(11, 13) === "00" || datesRangs.has(dateRang)) {
        throw new Error(`${path.join(dossier, entree.name, f.name)} : rang 00 ou couple date-rang déjà pris dans la fiche`);
      }
      datesRangs.add(dateRang);
      const contenu = fs.readFileSync(path.join(dossier, entree.name, f.name), "utf8");
      // Un titre dans un fragment couperait la fiche à la reconstruction, ou y
      // ferait naître une fiche fantôme.
      if (contenu.split("\n").some((l) => TITRE.test(l))) {
        throw new Error(`${path.join(dossier, entree.name, f.name)} : ligne de titre dans un fragment (une mise à jour n'ouvre pas de section)`);
      }
      liste.push({ nom: f.name, contenu });
    }
    liste.sort((a, b) => comparerNoms(a.nom, b.nom));
    j.set(entree.name, liste);
  }
  return j;
}

function lignesDuFragment(contenu) {
  const c = contenu.endsWith("\n") ? contenu.slice(0, -1) : contenu;
  return c.split("\n");
}

/**
 * Reconstruit le plan : chaque ligne de renvoi est remplacée par les
 * fragments de sa fiche, dans l'ordre des noms. Lève une erreur si un dossier
 * du journal n'a pas de fiche portant son renvoi — un fragment ne se perd pas
 * en silence.
 */
export function reconstruire(texte, journal) {
  const lignes = texte.split("\n");
  const fiches = analyserFiches(lignes);
  const servis = new Set();
  const erreurs = [];
  const parLigne = new Map();
  for (const f of fiches) {
    erreurs.push(...f.anomalies.filter((a) => a.includes("renvoi")).map((a) => `fiche ${f.id} : ${a}`));
    if (f.renvois.length > 1) erreurs.push(`fiche ${f.id} : ${f.renvois.length} lignes de renvoi`);
    if (f.renvois.length >= 1) {
      parLigne.set(f.renvois[0], f.id);
      servis.add(f.id);
    }
  }
  for (const id of journal.keys()) {
    if (!servis.has(id) && journal.get(id).length > 0) erreurs.push(`journal ${id} : aucune ligne de renvoi dans le plan — ses fragments ne se liraient pas`);
  }
  if (erreurs.length > 0) throw new Error(erreurs.join("\n"));
  const sortie = [];
  for (let i = 0; i < lignes.length; i++) {
    const id = parLigne.get(i);
    if (id === undefined) {
      sortie.push(lignes[i]);
      continue;
    }
    for (const frag of journal.get(id) ?? []) sortie.push(...lignesDuFragment(frag.contenu));
  }
  return sortie.join("\n");
}

/**
 * Le texte d'une fiche avec son journal, tel que le plan reconstruit le
 * porte : du titre à la dernière ligne non vide de la fiche. `null` si la
 * fiche n'existe pas.
 */
export function lireFiche(texte, journal, id) {
  const reconstruit = reconstruire(texte, journal);
  const lignes = reconstruit.split("\n");
  const fiche = analyserFiches(lignes).find((f) => f.id === id);
  if (!fiche) return null;
  let fin = fiche.fin;
  while (fin > fiche.titre + 1 && VIDE.test(lignes[fin - 1])) fin--;
  return lignes.slice(fiche.titre, fin).join("\n") + "\n";
}
