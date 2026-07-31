#!/usr/bin/env node
// Projette les compositions déclarées sur le référentiel d'ingrédients, et
// RAPPORTE — sans rien envoyer.
//
// CET OUTIL N'ÉCRIT NULLE PART, et n'a aucune option pour le faire : ni `--url`,
// ni secret, ni client HTTP. C'est le geste qui produit le chiffre autorisant
// (ou non) le transport, pas le transport lui-même. Le séparer rend la décision
// lisible avant qu'une seule ligne n'entre en base.
//
// CE QU'IL MESURE, et pourquoi chaque compteur existe :
//
//   - la COUVERTURE par catégorie — un libellé non résolu est un actif que la
//     fiche ne déclarera pas, et le tri-état de complétude marquera la fiche
//     « partielle » sans dire lequel manque ;
//   - les libellés AMBIGUS avec leurs candidats — 69 formes du référentiel ont
//     plusieurs parents et 48 noms sont homonymes ; ces lignes ne seront pas
//     écrites, et la liste est l'arbitrage à rendre ;
//   - la DOSE, motif de rejet par motif de rejet — plus de la moitié des lignes
//     de la source sont des chaînes nues sans quantité possible, et une dose
//     absente ne doit jamais passer pour une dose nulle ;
//   - les FORMES DÉRIVÉES à créer (partie × préparation d'une plante, souche
//     d'un micro-organisme) — le référentiel ne les engendre pas, seul le
//     transport les connaît.
//
// Usage :
//   node projeter.mjs [--fiches <ndjson>] [--referentiel <dossier>] [--rapport <md>]
//                     [--limite <n>] [--exemples <n>]

import { createReadStream, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { projeterReferentiel } from '../referentiel/lib/projection.mjs';
import {
  construireIndexReferentiel,
  normaliserDose,
  resoudreLigneComposition,
} from './lib/resolution.mjs';

const args = process.argv.slice(2);
const opt = (nom, defaut = null) => {
  const i = args.indexOf(nom);
  return i >= 0 && args[i + 1] ? args[i + 1] : defaut;
};

const FICHES = opt('--fiches', join(homedir(), '.wellneuro/supplements/normalized/fiches.ndjson'));
// `fileURLToPath` plutôt que `import.meta.dirname`, qui n'existe qu'à partir de
// Node 21.2 : l'outil doit tourner partout où le dépôt tourne.
const ICI = dirname(fileURLToPath(import.meta.url));
const REFERENTIEL = opt('--referentiel', join(ICI, '../referentiel/referentiel'));
const RAPPORT = opt('--rapport', null);
const LIMITE = Number(opt('--limite', '0')) || Infinity;
const EXEMPLES = Number(opt('--exemples', '25'));

// ── Référentiel ─────────────────────────────────────────────────────────────

function charger(nom) {
  const chemin = join(REFERENTIEL, `ref-${nom}.ndjson`);
  if (!existsSync(chemin)) {
    console.error(`Fichier absent : ${chemin} — lancer moisson.mjs d'abord.`);
    process.exit(2);
  }
  return readFileSync(chemin, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
}

if (!existsSync(FICHES)) {
  console.error(`Fichier absent : ${FICHES} — lancer tools/supplements/import/parse.mjs d'abord.`);
  process.exit(2);
}

// La MÊME projection que celle qui a peuplé la base (`referentiel/ingest.mjs`
// l'importe aussi) : résoudre contre un autre index rendrait un rapport exact
// sur un référentiel qui n'existe pas.
const projection = projeterReferentiel({
  substances: charger('substances'),
  formes: charger('other-ingredients'),
  plantes: charger('plants'),
  micro: charger('microorganisms'),
});

const ingredientsIndex = projection.map((e) => ({
  ingredientId: e.sourceIdentifiant,
  nomFr: e.nomFr,
  sourceIdentifiant: e.sourceIdentifiant,
}));
const formesIndex = projection.flatMap((e) =>
  e.formes.map((f) => ({
    formeId: f.sourceIdentifiant,
    labelFr: f.labelFr,
    ingredientId: e.sourceIdentifiant,
  })),
);
const index = construireIndexReferentiel(ingredientsIndex, formesIndex);

console.error(
  `Référentiel : ${ingredientsIndex.length} ingrédients, ${formesIndex.length} formes.`,
);

// ── Parcours des fiches ─────────────────────────────────────────────────────

const CATEGORIES = [
  ['plantes', 'plantes'],
  ['substances', 'substances'],
  ['microOrganismes', 'micro_organismes'],
  ['nutriments', 'nutriments'],
  ['autresIngredientsActifs', 'autres_ingredients_actifs'],
];

const parCategorie = new Map(
  CATEGORIES.map(([, cat]) => [
    cat,
    { lignes: 0, viaIngredient: 0, viaForme: 0, ambigu: 0, inconnu: 0 },
  ]),
);
const rejetsDose = new Map();
const inconnus = new Map(); // libellé -> { n, categorie }
const ambigus = new Map(); // libellé -> { n, categorie, candidats }
const formesPlantes = new Set();
const souches = new Set();

let lignesLues = 0;
let fichesUniques = 0;
let doublons = 0;
let sansIdentifiant = 0;
let microInactives = 0;
let jsonIllisible = 0;
let fichesSansActif = 0;
let fichesToutResolu = 0;
let fichesToutDose = 0;
let lignesEcrivables = 0;
let lignesAvecDose = 0;
const vus = new Set();

/** Le libellé qui identifie une ligne, par catégorie. */
function libelleDe(entree, categorie) {
  if (typeof entree === 'string') return entree;
  if (categorie === 'micro_organismes') {
    return `${(entree?.genre ?? '').trim()} ${(entree?.espece ?? '').trim()}`.trim();
  }
  return typeof entree?.nom === 'string' ? entree.nom : '';
}

function compter(carte, cle, categorie, extra) {
  const dejaLa = carte.get(cle);
  if (dejaLa) dejaLa.n += 1;
  else carte.set(cle, { n: 1, categorie, ...extra });
}

const flux = createInterface({
  input: createReadStream(FICHES, { encoding: 'utf8' }),
  crlfDelay: Infinity,
});

for await (const ligne of flux) {
  if (!ligne.trim()) continue;
  lignesLues += 1;
  if (lignesLues > LIMITE) break;

  let fiche;
  try {
    fiche = JSON.parse(ligne);
  } catch {
    // Une ligne illisible est COMPTÉE, jamais avalée : un parseur qui se tait
    // rend un rapport de couverture optimiste.
    jsonIllisible += 1;
    continue;
  }

  // Déduplication explicite. La source répète 1 240 identifiants sur 141 388
  // lignes ; ils sont identiques sur la composition (vérifié le 2026-07-31),
  // donc n'importe laquelle convient — mais la subir par un index unique
  // reviendrait à laisser le hasard trancher.
  // Un doublon inoffensif et une fiche sans identifiant exploitable ne sont pas
  // la même chose : les confondre ferait lire « répétition » là où il y a
  // « fiche perdue », dans le rapport même qui sert à décider du transport.
  const id = fiche?.sourceId;
  if (typeof id !== 'string' || !id) {
    sansIdentifiant += 1;
    continue;
  }
  if (vus.has(id)) {
    doublons += 1;
    continue;
  }
  vus.add(id);
  fichesUniques += 1;

  const composition = fiche.composition ?? {};
  let actifs = 0;
  let resolus = 0;
  let dosables = 0;
  let doses = 0;

  for (const [champ, categorie] of CATEGORIES) {
    const entrees = Array.isArray(composition[champ]) ? composition[champ] : [];
    const compteur = parCategorie.get(categorie);

    for (const entree of entrees) {
      const libelle = libelleDe(entree, categorie);
      if (!libelle) continue;

      // Une souche INACTIVÉE est déclarée mais n'est pas un actif — `parse.mjs`
      // la distingue déjà (`inactive: true`), et `composition_source_lignes`
      // devra porter un compte de lignes ACTIVES. La compter ici rendrait un
      // total que le transport ne pourra jamais atteindre, et donc une fiche
      // éternellement « partielle » sans raison lisible.
      if (categorie === 'micro_organismes' && entree?.inactive === true) {
        microInactives += 1;
        continue;
      }

      actifs += 1;
      compteur.lignes += 1;

      const r = resoudreLigneComposition(libelle, categorie, index);
      if (r.statut === 'resolu') {
        resolus += 1;
        if (r.via === 'ingredient') compteur.viaIngredient += 1;
        else compteur.viaForme += 1;
        lignesEcrivables += 1;

        // Formes dérivées : le référentiel n'en engendre aucune pour les
        // plantes ni les micro-organismes. Seules les combinaisons réellement
        // déclarées comptent — les inventer d'avance produirait des milliers
        // de formes que personne n'emploie.
        if (categorie === 'plantes') {
          const partie = (entree?.partie ?? '').trim();
          const prep = (entree?.preparation ?? '').trim();
          if (partie || prep) {
            formesPlantes.add(`${r.ingredient.sourceIdentifiant}|${partie}|${prep}`);
          }
        } else if (categorie === 'micro_organismes') {
          const souche = (entree?.souche ?? '').trim();
          if (souche) souches.add(`${r.ingredient.sourceIdentifiant}|${souche}`);
        }
      } else if (r.statut === 'ambigu') {
        compteur.ambigu += 1;
        compter(ambigus, libelle, categorie, { candidats: r.candidats, motif: r.motif });
      } else {
        compteur.inconnu += 1;
        compter(inconnus, libelle, categorie);
      }

      // La dose se mesure sur TOUTES les lignes, résolues ou non : c'est ce qui
      // distingue « la source ne dose pas » de « nous n'avons pas su résoudre ».
      const brute = entree?.doseParDjr ?? null;
      const d = normaliserDose(brute, entree?.unite ?? null, categorie);
      if (d.dose !== null) {
        doses += 1;
        dosables += 1;
        lignesAvecDose += 1;
      } else {
        rejetsDose.set(d.rejet, (rejetsDose.get(d.rejet) ?? 0) + 1);
        if (d.rejet !== 'aucune_dose') dosables += 1;
      }
    }
  }

  if (actifs === 0) fichesSansActif += 1;
  else {
    if (resolus === actifs) fichesToutResolu += 1;
    if (dosables > 0 && doses === dosables) fichesToutDose += 1;
  }
}

// ── Rapport ─────────────────────────────────────────────────────────────────

const pct = (n, d) => (d === 0 ? '—' : `${((100 * n) / d).toFixed(1)} %`);
const lignes = [];
const dire = (s = '') => lignes.push(s);

dire('# Projection des compositions Compl’Alim → référentiel');
dire();
dire(`Fiches : **${fichesUniques}** uniques sur ${lignesLues} lignes lues (${doublons} doublons ignorés).`);
if (jsonIllisible > 0) dire(`⚠ ${jsonIllisible} ligne(s) JSON illisible(s) — non comptées dans la couverture.`);
if (sansIdentifiant > 0) dire(`⚠ ${sansIdentifiant} ligne(s) sans \`sourceId\` exploitable — **perdues**, ce ne sont pas des doublons.`);
dire(`Fiches sans aucun actif déclaré : ${fichesSansActif}.`);
dire(`Souches inactivées, déclarées mais non comptées comme actifs : ${microInactives}.`);
dire();
dire('## Couverture par catégorie');
dire();
dire('| Catégorie | Lignes | Via ingrédient | Via forme | Résolues | Ambiguës | Inconnues |');
dire('|---|--:|--:|--:|--:|--:|--:|');
let totalLignes = 0;
let totalResolues = 0;
for (const [, cat] of CATEGORIES) {
  const c = parCategorie.get(cat);
  const resolues = c.viaIngredient + c.viaForme;
  totalLignes += c.lignes;
  totalResolues += resolues;
  dire(
    `| \`${cat}\` | ${c.lignes} | ${c.viaIngredient} | ${c.viaForme} | ${resolues} (${pct(resolues, c.lignes)}) | ${c.ambigu} | ${c.inconnu} |`,
  );
}
dire(`| **total** | **${totalLignes}** | | | **${totalResolues} (${pct(totalResolues, totalLignes)})** | | |`);
dire();
dire('## Ce que le catalogue y gagnerait');
dire();
dire(`- Fiches dont **toutes** les lignes actives se résolvent : **${fichesToutResolu}** (${pct(fichesToutResolu, fichesUniques)}).`);
dire(`  C'est la seule population qui pourra un jour prétendre à \`integre\` — les autres resteront \`partielle\`, et les quatre dimensions qui se lisent sur la composition resteront non évaluées.`);
dire(`- Fiches dont **toutes** les lignes dosables portent dose + unité canonique : **${fichesToutDose}** (${pct(fichesToutDose, fichesUniques)}).`);
dire(`  C'est le plafond de la sentinelle de cumul : au-delà, elle rapprocherait des grandeurs dont une manque.`);
dire(`- Lignes de composition écrivables : **${lignesEcrivables}**, dont **${lignesAvecDose}** avec une dose (${pct(lignesAvecDose, lignesEcrivables)}).`);
dire();
dire('## Dose — motifs de refus');
dire();
dire('| Motif | Lignes |');
dire('|---|--:|');
for (const [motif, n] of [...rejetsDose].sort((a, b) => b[1] - a[1])) {
  dire(`| \`${motif}\` | ${n} |`);
}
dire();
dire('_`aucune_dose` : la source ne déclare pas de quantité (nutriments et autres actifs sont des chaînes nues). `unite_absente` et `unite_hors_vocabulaire` : une quantité est là mais sa grandeur manque ou n’est pas canonique — la ligne s’écrit sans dose, jamais avec une unité devinée._');
dire();
dire('## Formes dérivées à créer');
dire();
dire(`- Plantes (espèce × partie × préparation) : **${formesPlantes.size}**`);
dire(`- Micro-organismes (espèce × souche) : **${souches.size}**`);
dire();
dire("_Le référentiel n'engendre aucune de ces formes : seules les combinaisons réellement déclarées comptent. Sans elles, `partie` et `preparation` sont perdues, et deux extraits incomparables deviennent le même ingrédient._");
dire();

const listeTriee = (carte) => [...carte.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, EXEMPLES);

dire(`## Libellés AMBIGUS — non écrits, à arbitrer (${ambigus.size} distincts)`);
dire();
if (ambigus.size === 0) dire('_Aucun._');
else {
  dire('| Libellé | Catégorie | Lignes | Motif | Candidats |');
  dire('|---|---|--:|---|---|');
  for (const [libelle, d] of listeTriee(ambigus)) {
    dire(`| ${libelle} | \`${d.categorie}\` | ${d.n} | ${d.motif} | ${d.candidats.join(', ')} |`);
  }
}
dire();
dire(`## Libellés INCONNUS du référentiel (${inconnus.size} distincts)`);
dire();
if (inconnus.size === 0) dire('_Aucun._');
else {
  dire('| Libellé | Catégorie | Lignes |');
  dire('|---|---|--:|');
  for (const [libelle, d] of listeTriee(inconnus)) {
    dire(`| ${libelle} | \`${d.categorie}\` | ${d.n} |`);
  }
  if (inconnus.size > EXEMPLES) {
    dire();
    dire(`_${inconnus.size - EXEMPLES} libellés inconnus supplémentaires non listés (\`--exemples\` pour en voir plus). Ils sont comptés dans le tableau de couverture._`);
  }
}
dire();
dire('_Rapport produit par `tools/supplements/compositions/projeter.mjs`. Aucune écriture._');

const texte = lignes.join('\n');
if (RAPPORT) {
  writeFileSync(RAPPORT, `${texte}\n`, 'utf8');
  console.error(`Rapport écrit : ${RAPPORT}`);
} else {
  console.log(texte);
}
