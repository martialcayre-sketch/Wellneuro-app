#!/usr/bin/env node
// Transporte les compositions résolues par `projeter.mjs` vers le pivot
// clinique, en POSTant sur /api/internal/supplements/compositions.
//
// C'EST LE FRÈRE MINCE DE `projeter.mjs`. Même lecture en flux, même index de
// référentiel, même résolution ligne à ligne (`resolution.mjs`, inchangé).
// Ce que ce module AJOUTE : la mise en forme du payload attendu par
// `parseCompositionsPayload` (web/src/lib/supplement-library/compositions.ts),
// le découpage en lots, et l'envoi — rien de plus. Aucune règle de résolution
// ne vit ici ; toute divergence de couverture avec `projeter.mjs` serait un bug
// de CE fichier, jamais une seconde vérité clinique.
//
// `--dry-run` PAR DÉFAUT. Sans `--envoyer`, ce script n'ouvre AUCUNE connexion
// réseau — la mesure (le livrable du lot) s'imprime et rien d'autre. L'envoi
// réel exige `--envoyer` ET `SUPPLEMENTS_INTERNAL_SECRET` dans l'environnement ;
// l'un sans l'autre est un refus nommé sur stderr, jamais un envoi silencieux.
//
// CE QUE CE MODULE N'ÉCRIT PAS : aucune règle clinique, aucun seuil, aucune
// alerte de sécurité. Il ne crée pas non plus de fiche produit — un produit
// absent en base est rapporté (`produitsIncomplets`), jamais inventé.
//
// Usage :
//   node transporter.mjs [--fiches <ndjson>] [--referentiel <dossier>]
//                         [--limite <n>] [--exemples <n>]
//                         [--version-formulation <n>]
//                         [--envoyer --url <base>]
//
// GARDE DEUX CLÉS SUR LA CIBLE, ET LES DEUX NE VIVENT PAS AU MÊME ENDROIT.
// `--envoyer` exige `SUPPLEMENTS_TRANSPORT_HOTE` dans l'environnement, qui doit
// nommer l'hôte de `--url` ; sinon refus nommé sur stderr et `exit 1`. Même
// motif que `--base` dans `web/prisma/importNabm.ts`, et le même détail qui le
// fait tenir : la contre-clé est confrontée à une VARIABLE D'ENVIRONNEMENT, pas
// à un second argument. Deux arguments vivent sur la même ligne de commande, et
// l'opérateur dérive le second du premier — copier l'hôte de `--url` dans
// `--hote` ne coûtait rien et ne prouvait rien. La variable, elle, se pose avec
// le secret, dans le shell de la cible, une fois. Il n'y a pas d'allowlist de
// domaine : c'est la concordance des deux clés qui garde, pas une liste qu'il
// aurait fallu élargir au premier besoin.
//
// `--version-formulation` est FACULTATIF et sans défaut. Omis, le champ n'est
// pas envoyé et le serveur écrit sur la version COURANTE du produit. Ne le poser
// que pour une reprise visant sciemment une version précise.
//
// Secret lu dans SUPPLEMENTS_INTERNAL_SECRET — même variable que
// `referentiel/ingest.mjs` et `ingest/ingest.mjs` : une voie d'ingestion, un
// secret. Jamais en argument (la ligne de commande est visible des autres
// processus), jamais affiché.

import { createReadStream, existsSync, readFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { homedir } from 'node:os';
import { join } from 'node:path';

import { projeterReferentiel } from '../referentiel/lib/projection.mjs';
import {
  construireIndexReferentiel,
  normaliserDose,
  resoudreLigneComposition,
  UNITES_CANONIQUES,
} from './lib/resolution.mjs';

// ── Constantes recopiées du serveur ─────────────────────────────────────────
//
// RECOPIE de `SUPPLEMENTS_MAX_BATCH_SIZE` (web/src/lib/supplement-library/
// config.ts), comme `resolution.mjs` recopie `SUPPLEMENTS_UNITES` : `tools/`
// est autonome et n'importe pas de TypeScript. `transporter.test.mjs` relit le
// fichier TypeScript et compare — une divergence casse le test, elle ne dort
// pas silencieusement jusqu'à un 422 en production.
export const TAILLE_LOT_MAX = 500;

// RECOPIE de `LIGNES_MAX_PAR_LOT` (web/src/lib/supplement-library/
// compositions.ts). Le serveur borne DEUX grandeurs, pas une : le nombre de
// produits ET le nombre total de lignes du lot. Ne borner que les produits
// laisse passer un lot recevable en apparence et refusé en 422 — mesuré sur
// l'échantillon, une fiche porte ~5,2 lignes, donc 500 produits en font ~2 600 :
// sous la borne, mais sans marge garantie sur des fiches riches. Le refus serait
// fail-closed et nommé, jamais une écriture fausse ; il coûterait quand même un
// aller-retour d'exploitation pour un défaut connu d'avance.
export const LIGNES_MAX_PAR_LOT = 5000;

const UNITES_CANONIQUES_SET = new Set(UNITES_CANONIQUES);

// ── Fonctions pures (testées sans I/O) ──────────────────────────────────────

/** Découpe une liste en lots d'au plus `taille` éléments, dans l'ordre. */
export function decouperEnLots(elements, taille = TAILLE_LOT_MAX) {
  const lots = [];
  for (let i = 0; i < elements.length; i += taille) {
    lots.push(elements.slice(i, i + taille));
  }
  return lots;
}

/**
 * Découpe en respectant les DEUX bornes du serveur : produits par lot et lignes
 * par lot. C'est celle-ci que `main()` emploie ; `decouperEnLots` reste la
 * primitive, utile quand seule la cardinalité compte.
 *
 * Un produit qui dépasse à lui seul la borne de lignes ne peut entrer dans aucun
 * lot : il est REFUSÉ par son nom, jamais glissé dans un lot qui sera rejeté en
 * bloc, et jamais écarté en silence — sans quoi le compte annoncé par la mesure
 * et le compte réellement transporté divergeraient sans que personne le voie.
 */
export function decouperEnLotsBornes(
  produits,
  tailleMax = TAILLE_LOT_MAX,
  lignesMax = LIGNES_MAX_PAR_LOT,
) {
  const lots = [];
  const refuses = [];
  let courant = [];
  let lignesCourantes = 0;

  for (const produit of produits) {
    const n = Array.isArray(produit.lignes) ? produit.lignes.length : 0;
    if (n > lignesMax) {
      // `sourceIdentifiant`, et non `identifiant` : c'est la clé que
      // `formaterProduitPourEnvoi` produit, donc la seule que les produits
      // traversant cette fonction portent réellement. La première version
      // lisait `produit.identifiant`, absent de cette forme — tout produit
      // réellement refusé s'imprimait « (sans identifiant) », et le refus « par
      // son nom » ne nommait rien. Le banc était vert parce qu'il fabriquait
      // ses fixtures à la main ; il part désormais de la sortie réelle.
      refuses.push({ identifiant: produit.sourceIdentifiant ?? '(sans identifiant)', lignes: n });
      continue;
    }
    if (courant.length > 0 && (courant.length >= tailleMax || lignesCourantes + n > lignesMax)) {
      lots.push(courant);
      courant = [];
      lignesCourantes = 0;
    }
    courant.push(produit);
    lignesCourantes += n;
  }
  if (courant.length > 0) lots.push(courant);

  return { lots, refuses };
}

/**
 * L'identifiant du produit tel qu'écrit en base par la voie d'ingestion
 * (`tools/supplements/ingest/ingest.mjs`, fonction `ficheVersPayload`).
 *
 * MÊME RÈGLE, VOLONTAIREMENT. `sourceIdentifiant` en base est l'identifiant
 * Compl'Alim numérique (`p.idComplAlim`), PAS `fiche.sourceId`
 * (`complalim-<id>`) — cette dernière valeur n'existe nulle part dans
 * `supplement_products`. Diverger ici ferait chercher chaque produit sous un
 * identifiant qu'aucune fiche en base ne porte : zéro écriture, un bilan
 * entièrement `produitsIncomplets`, sans qu'aucune ligne ne soit fausse — mais
 * sans qu'aucune ne soit écrite non plus.
 */
export function identifiantProduit(fiche) {
  const idComplAlim = fiche?.produit?.idComplAlim;
  return Number.isFinite(idComplAlim) ? String(idComplAlim) : fiche?.sourceId ?? null;
}

/**
 * Met en forme un produit résolu au format attendu par `parseCompositionsPayload`.
 *
 * Ne prend AUCUNE décision de résolution — elle est déjà faite en amont
 * (`resoudreLigneComposition`, `normaliserDose`). Cette fonction ne fait que
 * respecter le contrat : position par défaut = rang d'insertion, `null`
 * explicite là où la valeur manque (jamais `undefined`, que `JSON.stringify`
 * effacerait silencieusement du corps envoyé).
 *
 * `versionFormulation` est la SEULE exception à cette règle du `null` explicite,
 * et elle est délibérée : le champ est ABSENT du corps quand l'opérateur ne l'a
 * pas nommé, ce qui fait résoudre au serveur la version COURANTE du produit
 * (pointeur `supplement_product_versions_courantes`). Une valeur en dur — 1, par
 * exemple — écrirait après la première réingestion sur une ligne que le
 * catalogue ne sert plus : succès compté, fiche restée coquille, aucune erreur
 * nulle part. Voir `CompositionProduitInput.versionFormulation`.
 */
export function formaterProduitPourEnvoi({ sourceIdentifiant, versionFormulation = null, sourceLignes, lignes }) {
  return {
    sourceIdentifiant,
    ...(versionFormulation === null ? {} : { versionFormulation }),
    sourceLignes,
    lignes: lignes.map((ligne, i) => {
      const unite = ligne.unite ?? null;
      if (unite !== null && !UNITES_CANONIQUES_SET.has(unite)) {
        // Garde de dernier recours : `normaliserDose` ne peut pas rendre une
        // unité hors vocabulaire, mais si elle le faisait un jour, ce module ne
        // doit pas la laisser passer en silence vers la route.
        throw new Error(`Unité « ${unite} » hors vocabulaire canonique — ligne rejetée avant envoi.`);
      }
      return {
        ingredientSourceIdentifiant: ligne.ingredientSourceIdentifiant,
        formeSourceIdentifiant: ligne.formeSourceIdentifiant ?? null,
        doseParDjr: ligne.doseParDjr ?? null,
        unite,
        position: ligne.position ?? i,
      };
    }),
  };
}

/**
 * Nommé, pour que `main` distingue ce refus de toute autre erreur réseau.
 *
 * `cumulLotsPrecedents` porte ce que les lots ACCEPTÉS ont écrit — rien de plus.
 * Il s'appelait `bilanPartiel`, ce qui laissait croire qu'il disait aussi ce que
 * le lot refusé avait commité avant de s'arrêter : la route n'en rend rien, et
 * elle n'en rendra rien (une écriture interrompue n'a pas d'inventaire). Le nom
 * dit désormais ce que la valeur contient. Ce qu'il faut faire en face n'a pas
 * changé et ne demande pas cet inventaire : rejouer, l'écriture est idempotente.
 */
export class EnvoiRefuse extends Error {
  constructor(rang, total, statut, raison, cumulLotsPrecedents) {
    super(`Lot ${rang}/${total} refusé (HTTP ${statut}) : ${raison}`);
    this.name = 'EnvoiRefuse';
    this.rang = rang;
    this.total = total;
    this.statut = statut;
    this.raison = raison;
    this.cumulLotsPrecedents = cumulLotsPrecedents;
  }
}

/**
 * Envoie une série de lots, dans l'ordre, à la route de compositions.
 *
 * UN LOT REFUSÉ ARRÊTE LA SÉRIE. Il ne se saute pas : les lots suivants
 * porteraient peut-être sur les mêmes produits ou sur un référentiel dont la
 * même cause d'échec les affecterait tous, et continuer masquerait un
 * problème systémique derrière un bilan partiellement vert. `EnvoiRefuse`
 * nomme le lot, son rang, et la raison rendue par la route — jamais une erreur
 * réseau générique.
 *
 * `fetchImpl` est injectable : c'est ce qui rend « `--dry-run` n'ouvre aucune
 * connexion » vérifiable structurellement (un `fetch` factice qui jette si on
 * l'appelle), et ce qui rend ce test possible sans réseau ni serveur.
 */
export async function envoyerSerie(lots, { url, secret, provenance = 'complalim', fetchImpl = fetch }) {
  // `produitsDenominateurCorrige` : produits dont les LIGNES étaient déjà
  // identiques mais dont `compositionSourceLignes` divergeait, et que le rejeu
  // a réparés. Compté à part de `produitsInchanges` — un rejeu qui répare n'est
  // pas un rejeu qui ne fait rien, et c'est précisément le chiffre qu'une
  // reprise après correction du dénominateur doit pouvoir lire.
  const cumul = {
    produitsEcrits: 0,
    produitsInchanges: 0,
    produitsDenominateurCorrige: 0,
    lignesCreees: 0,
  };
  const produitsDivergents = [];
  const produitsIncomplets = [];

  for (const [i, lot] of lots.entries()) {
    const rep = await fetchImpl(`${url}/api/internal/supplements/compositions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secret}` },
      body: JSON.stringify({ provenance, produits: lot }),
    });
    const corps = await rep.json().catch(() => ({}));

    if (!rep.ok) {
      throw new EnvoiRefuse(i + 1, lots.length, rep.status, corps.error ?? '—', {
        ...cumul,
        produitsDivergents,
        produitsIncomplets,
      });
    }

    const resume = corps.resume ?? {};
    cumul.produitsEcrits += resume.produitsEcrits ?? 0;
    cumul.produitsInchanges += resume.produitsInchanges ?? 0;
    cumul.produitsDenominateurCorrige += resume.produitsDenominateurCorrige ?? 0;
    cumul.lignesCreees += resume.lignesCreees ?? 0;
    if (Array.isArray(resume.produitsDivergents)) produitsDivergents.push(...resume.produitsDivergents);
    if (Array.isArray(resume.produitsIncomplets)) produitsIncomplets.push(...resume.produitsIncomplets);
  }

  return { ...cumul, produitsDivergents, produitsIncomplets, lotsEnvoyes: lots.length };
}

// ── Résolution d'une fiche (même règles que projeter.mjs) ───────────────────

const CATEGORIES = [
  ['plantes', 'plantes'],
  ['substances', 'substances'],
  ['microOrganismes', 'micro_organismes'],
  ['nutriments', 'nutriments'],
  ['autresIngredientsActifs', 'autres_ingredients_actifs'],
];

/** Le libellé qui identifie une ligne, par catégorie — copie de `projeter.mjs`. */
function libelleDe(entree, categorie) {
  if (typeof entree === 'string') return entree;
  if (categorie === 'micro_organismes') {
    return `${(entree?.genre ?? '').trim()} ${(entree?.espece ?? '').trim()}`.trim();
  }
  return typeof entree?.nom === 'string' ? entree.nom : '';
}

/**
 * Résout toutes les lignes actives d'une fiche, et met à jour les compteurs
 * de mesure passés par référence (mêmes noms que `projeter.mjs`, pour que les
 * deux rapports restent comparables).
 *
 * Rend `{ sourceLignes, lignes }` — `lignes` ne porte que ce qui s'écrirait
 * (statut « resolu »), dans l'ordre de la fiche source. Un même couple
 * (ingrédient, forme) répété DANS la fiche (deux colonnes différentes nommant
 * le même actif) n'est écrit qu'une fois : la base porte
 * `@@unique([productId, ingredientId, formeId])` et `parseCompositionsPayload`
 * rejette tout le lot sur un doublon intra-produit. Aucune fusion de deux doses
 * n'est honnête — on garde la première rencontrée et on compte les suivantes.
 *
 * DEUX DOUBLONS, DEUX DÉNOMINATEURS. La clé de doublon ne porte ni la dose ni
 * l'unité, et `resoudreLigneComposition` rend `forme: null` sur toute
 * résolution « ingrédient direct » : deux libellés de deux colonnes
 * différentes tombent donc régulièrement sur la même clé sans porter la même
 * quantité. Il faut les distinguer, sinon le dénominateur ment :
 *
 * - doublon STRICTEMENT IDENTIQUE (même ingrédient, même forme, même dose,
 *   même unité) : la ligne écartée ne perd aucune information, elle sort donc
 *   du dénominateur. Sans cela, une fiche intégralement résolue resterait
 *   « partielle » à l'écran — prudent dans le sens, faux dans le motif.
 * - doublon DIVERGENT (dose ou unité différente) : la ligne écartée emporte
 *   une quantité que rien ne réécrira jamais. Elle RESTE au dénominateur, la
 *   fiche reste « partielle », et l'écran dit vrai. La sortir rendrait
 *   `lignes.length === sourceLignes` donc `integre`, donc « Compatible » et
 *   « Aucun cumul » servis sur une fiche dont la dose totale est sous-évaluée.
 *   Et `compositionSourceLignes` écrit faux est DÉFINITIF : le rejeu d'un
 *   produit identique revient en `produitsInchanges`, et l'append-only
 *   interdit de réécrire les lignes.
 */
function resoudreFiche(fiche, index, mesure) {
  const composition = fiche.composition ?? {};
  let sourceLignes = 0;
  const lignes = [];
  // Clé → empreinte (dose, unité) de la ligne RETENUE pour cette clé. C'est
  // cette empreinte qui décide si un doublon perd de l'information ou non.
  const clesVues = new Map();

  for (const [champ, categorie] of CATEGORIES) {
    const entrees = Array.isArray(composition[champ]) ? composition[champ] : [];
    const compteur = mesure.parCategorie.get(categorie);

    for (const entree of entrees) {
      const libelle = libelleDe(entree, categorie);
      if (!libelle) continue;
      if (categorie === 'micro_organismes' && entree?.inactive === true) continue;

      sourceLignes += 1;
      compteur.lignes += 1;

      const r = resoudreLigneComposition(libelle, categorie, index);
      if (r.statut === 'resolu') {
        compteur.resolues += 1;

        const brute = entree?.doseParDjr ?? null;
        const d = normaliserDose(brute, entree?.unite ?? null, categorie);

        const ingredientSourceIdentifiant = r.ingredient.sourceIdentifiant;
        const formeSourceIdentifiant = r.forme?.sourceIdentifiant ?? null;
        const cle = `${ingredientSourceIdentifiant}#${formeSourceIdentifiant ?? '—'}`;
        const empreinte = `${d.dose ?? '—'}#${d.unite ?? '—'}`;
        const empreinteRetenue = clesVues.get(cle);
        if (empreinteRetenue !== undefined) {
          mesure.doublonsIntraFiche += 1;
          if (empreinteRetenue === empreinte) {
            // Rien de perdu : la ligne écartée disait exactement ce que la
            // ligne retenue dit déjà. Elle sort du dénominateur, sinon une
            // fiche intégralement résolue resterait « partielle ».
            mesure.doublonsIntraFicheIdentiques += 1;
            sourceLignes -= 1;
          } else {
            // Une dose (ou une unité) est perdue et ne reviendra jamais : elle
            // RESTE au dénominateur. La fiche restera « partielle », ce qui est
            // exactement ce qu'elle est.
            mesure.doublonsIntraFicheDivergents += 1;
          }
          continue;
        }
        clesVues.set(cle, empreinte);
        // `compteur.lignes` / `compteur.resolues`, eux, gardent le doublon dans
        // les deux cas : ils mesurent la COUVERTURE du résolveur sur ce que la
        // source écrit, pas l'intégrité d'une fiche. Deux grandeurs, deux
        // comptes.

        lignes.push({
          ingredientSourceIdentifiant,
          formeSourceIdentifiant,
          doseParDjr: d.dose,
          unite: d.unite,
          position: lignes.length,
        });
      } else if (r.statut === 'ambigu') {
        compteur.ambigues += 1;
      } else {
        compteur.inconnues += 1;
        const dejaLa = mesure.inconnus.get(libelle);
        if (dejaLa) dejaLa.n += 1;
        else mesure.inconnus.set(libelle, { n: 1, categorie });
      }
    }
  }

  return { sourceLignes, lignes };
}

// ── Rapport de mesure ────────────────────────────────────────────────────────

function imprimerMesure(mesure, exemples, log) {
  const pct = (n, d) => (d === 0 ? '—' : `${((100 * n) / d).toFixed(1)} %`);

  log('# Transport des compositions — mesure');
  log();
  log(`Fiches vues : **${mesure.fichesUniques}** uniques sur ${mesure.lignesLues} lignes lues (${mesure.doublons} doublons ignorés).`);
  log(
    `Fiches portant au moins une ligne résolue — celles qui passeraient de « coquille » à ` +
      `« composition connue » : **${mesure.fichesAvecComposition}** (${pct(mesure.fichesAvecComposition, mesure.fichesUniques)}).`,
  );
  if (mesure.doublonsIntraFiche > 0) {
    log(
      `Lignes dupliquées à l'intérieur d'une même fiche, écartées (une seule gardée) : ${mesure.doublonsIntraFiche}, ` +
        `dont **${mesure.doublonsIntraFicheIdentiques} identiques** (même dose, même unité) et ` +
        `**${mesure.doublonsIntraFicheDivergents} divergentes** (dose ou unité différente).`,
    );
    log();
    log(
      "Les identiques sortent du dénominateur `sourceLignes` : rien n'est perdu, et les laisser dedans " +
        'ferait passer pour « partielle » une fiche entièrement résolue. Les divergentes y RESTENT : ' +
        'la dose écartée ne reviendra jamais, et la fiche doit rester « partielle » à l’écran plutôt que ' +
        'de servir « Compatible » sur une quantité sous-évaluée.',
    );
  }
  log();
  log('## Lignes par catégorie');
  log();
  log('| Catégorie | Lignes | Résolues | Ambiguës | Inconnues |');
  log('|---|--:|--:|--:|--:|');
  let totalLignes = 0;
  let totalResolues = 0;
  for (const [, cat] of CATEGORIES) {
    const c = mesure.parCategorie.get(cat);
    totalLignes += c.lignes;
    totalResolues += c.resolues;
    log(`| \`${cat}\` | ${c.lignes} | ${c.resolues} (${pct(c.resolues, c.lignes)}) | ${c.ambigues} | ${c.inconnues} |`);
  }
  log(`| **total** | **${totalLignes}** | **${totalResolues} (${pct(totalResolues, totalLignes)})** | | |`);
  log();

  const inconnusTries = [...mesure.inconnus.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, exemples);
  log(`## Libellés inconnus les plus fréquents (${mesure.inconnus.size} distincts, échantillon)`);
  log();
  if (inconnusTries.length === 0) log('_Aucun._');
  else {
    log('| Libellé | Catégorie | Lignes |');
    log('|---|---|--:|');
    for (const [libelle, d] of inconnusTries) log(`| ${libelle} | \`${d.categorie}\` | ${d.n} |`);
  }
  log();
}

// ── CLI ──────────────────────────────────────────────────────────────────────

function parseArgv(argv) {
  const opt = (nom, defaut = null) => {
    const i = argv.indexOf(nom);
    return i >= 0 && argv[i + 1] ? argv[i + 1] : defaut;
  };
  return {
    fiches: opt('--fiches', join(homedir(), '.wellneuro/supplements/normalized/fiches.ndjson')),
    referentiel: opt('--referentiel', join(homedir(), '.wellneuro/supplements/referentiel')),
    limite: Number(opt('--limite', '0')) || Infinity,
    exemples: Number(opt('--exemples', '25')),
    // `null` par DÉFAUT, et non 1 : sans demande explicite, le champ n'est pas
    // envoyé et le serveur résout la version courante du produit. Un défaut de 1
    // écrivait sur la v1 d'un produit réingéré en v2 — succès compté, fiche
    // restée coquille. Voir `formaterProduitPourEnvoi`.
    versionFormulation: opt('--version-formulation', null),
    envoyer: argv.includes('--envoyer'),
    url: opt('--url', null),
  };
}

function chargerReferentiel(dossier, sortie, stderr) {
  function charger(nom) {
    const chemin = join(dossier, `ref-${nom}.ndjson`);
    if (!existsSync(chemin)) {
      stderr(`Fichier absent : ${chemin} — lancer moisson.mjs d'abord.`);
      sortie(2);
      return null;
    }
    return readFileSync(chemin, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  }

  const substances = charger('substances');
  const formes = charger('other-ingredients');
  const plantes = charger('plants');
  const micro = charger('microorganisms');
  if (!substances || !formes || !plantes || !micro) return null;

  const projection = projeterReferentiel({ substances, formes, plantes, micro });
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
  return construireIndexReferentiel(ingredientsIndex, formesIndex);
}

/**
 * Point d'entrée CLI. Reçoit ses dépendances (env, fetch, sortie, flux
 * d'écriture) en paramètres pour rester testable sans process réel : c'est ce
 * qui permet de vérifier « `--envoyer` sans secret refuse » sans jamais lire
 * de fichier ni ouvrir de connexion.
 */
export async function main(argv = process.argv.slice(2), deps = {}) {
  const {
    env = process.env,
    fetchImpl = fetch,
    sortie = (code) => process.exit(code),
    stderr = (msg) => console.error(msg),
    // Défaut sur `''` et non `undefined` : le rapport appelle `log()` sans
    // argument pour ses lignes vides, et `console.log(undefined)` imprime
    // littéralement « undefined ». Le rapport EST le livrable de ce lot.
    stdout = (msg = '') => console.log(msg),
  } = deps;

  const options = parseArgv(argv);

  // `--version-formulation` : accepté seulement s'il nomme un entier ≥ 1. Une
  // valeur illisible ne retombe PAS sur « la courante » — l'opérateur a demandé
  // une version précise, la lui substituer en silence est le contraire du geste.
  let versionFormulation = null;
  if (options.versionFormulation !== null) {
    versionFormulation = Number(options.versionFormulation);
    if (!Number.isInteger(versionFormulation) || versionFormulation < 1) {
      stderr(
        `Refusé : --version-formulation « ${options.versionFormulation} » n’est pas un entier ≥ 1. ` +
          'Sans cette option, le serveur écrit sur la version COURANTE du produit.',
      );
      sortie(1);
      return;
    }
  }

  // Le refus d'un envoi mal formé se décide AVANT toute lecture de fichier :
  // pourquoi lire 284 Mo pour échouer ensuite sur un secret absent.
  let secret = null;
  if (options.envoyer) {
    secret = env.SUPPLEMENTS_INTERNAL_SECRET?.trim() ?? '';
    if (!secret || secret.length < 32) {
      stderr(
        'Envoi refusé : --envoyer exige SUPPLEMENTS_INTERNAL_SECRET dans l’environnement ' +
          '(32 caractères minimum) — ni envoi silencieux, ni dry-run silencieux.',
      );
      sortie(1);
      return;
    }
    if (!options.url) {
      stderr('Envoi refusé : --envoyer exige --url <base> (ex. https://app.wellneuro.fr).');
      sortie(1);
      return;
    }

    // ── Garde deux clés, comme l'import NABM (`web/prisma/importNabm.ts`) ────
    //
    // `--url` seul ne garde rien : une lettre de différence et ce sont 138 728
    // produits écrits en production sans qu'un mot l'ait annoncé. Aucune
    // allowlist de domaine ici — elle n'aurait empêché que la cible qu'on aurait
    // ajoutée le jour où on en a eu besoin. Ce qui garde, c'est la CONCORDANCE :
    // l'environnement de la cible nomme l'hôte, et le script refuse si ce n'est
    // pas celui de l'URL.
    //
    // LA CONTRE-CLÉ EST DANS L'ENVIRONNEMENT, ET C'EST TOUTE LA GARDE. Une
    // première version demandait un second ARGUMENT (`--hote`) : deux clés sur
    // la même ligne de commande, dont la seconde se dérive de la première par
    // un copier-coller. Elle ne pouvait attraper qu'une faute de frappe, jamais
    // une erreur de cible — celui qui écrit `--url https://app.wellneuro.fr` en
    // croyant viser le staging écrit `--hote app.wellneuro.fr` juste après, et
    // les deux clés concordent. `SUPPLEMENTS_TRANSPORT_HOTE` se pose là où le
    // secret est déjà posé : dans le shell de la cible, une fois, et pas au
    // moment où l'on tape la commande.
    let hoteVise;
    try {
      hoteVise = new URL(options.url).hostname;
    } catch {
      stderr(`Envoi refusé : --url « ${options.url} » n’est pas une URL absolue lisible.`);
      sortie(1);
      return;
    }
    const hoteAnnonce = env.SUPPLEMENTS_TRANSPORT_HOTE?.trim() ?? '';
    if (!hoteAnnonce) {
      stderr(
        `Envoi refusé : --envoyer exige SUPPLEMENTS_TRANSPORT_HOTE dans l’environnement. ` +
          `L’URL vise « ${hoteVise} » ; poser cette variable à côté du secret, dans le shell de ` +
          'la cible, pour confirmer que c’est bien elle.',
      );
      sortie(1);
      return;
    }
    if (hoteAnnonce !== hoteVise) {
      stderr(
        `Envoi refusé : SUPPLEMENTS_TRANSPORT_HOTE annonce « ${hoteAnnonce} » mais --url vise ` +
          `« ${hoteVise} ». Ce sont deux cibles différentes — rien n’a été envoyé.`,
      );
      sortie(1);
      return;
    }
  }

  if (!existsSync(options.fiches)) {
    stderr(`Fichier absent : ${options.fiches} — lancer tools/supplements/import/parse.mjs d'abord.`);
    sortie(2);
    return;
  }

  const index = chargerReferentiel(options.referentiel, sortie, stderr);
  if (!index) return;

  const mesure = {
    parCategorie: new Map(CATEGORIES.map(([, cat]) => [cat, { lignes: 0, resolues: 0, ambigues: 0, inconnues: 0 }])),
    inconnus: new Map(),
    doublonsIntraFiche: 0,
    doublonsIntraFicheIdentiques: 0,
    doublonsIntraFicheDivergents: 0,
    lignesLues: 0,
    fichesUniques: 0,
    doublons: 0,
    fichesAvecComposition: 0,
  };
  const vus = new Set();
  const produits = [];

  const flux = createInterface({
    input: createReadStream(options.fiches, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });

  for await (const ligne of flux) {
    if (!ligne.trim()) continue;
    mesure.lignesLues += 1;
    if (mesure.lignesLues > options.limite) break;

    let fiche;
    try {
      fiche = JSON.parse(ligne);
    } catch {
      continue;
    }

    const id = fiche?.sourceId;
    if (typeof id !== 'string' || !id) continue;
    if (vus.has(id)) {
      mesure.doublons += 1;
      continue;
    }
    vus.add(id);
    mesure.fichesUniques += 1;

    const { sourceLignes, lignes } = resoudreFiche(fiche, index, mesure);
    if (lignes.length === 0) continue; // Rien de nouveau à transporter pour cette fiche.

    mesure.fichesAvecComposition += 1;
    produits.push(
      formaterProduitPourEnvoi({
        sourceIdentifiant: identifiantProduit(fiche),
        versionFormulation,
        sourceLignes,
        lignes,
      }),
    );
  }

  imprimerMesure(mesure, options.exemples, stdout);

  const { lots, refuses } = decouperEnLotsBornes(produits, TAILLE_LOT_MAX, LIGNES_MAX_PAR_LOT);
  stdout(
    `Lots à transporter : ${lots.length} (≤ ${TAILLE_LOT_MAX} produits et ≤ ${LIGNES_MAX_PAR_LOT} lignes chacun), ` +
      `${produits.length - refuses.length} produit(s) au total.`,
  );
  if (refuses.length > 0) {
    stdout(
      `\n**${refuses.length} produit(s) NON transportable(s)** — plus de ${LIGNES_MAX_PAR_LOT} lignes à eux seuls, ` +
        `donc aucun lot ne peut les porter. Ils ne sont pas comptés ci-dessus :`,
    );
    for (const r of refuses.slice(0, 10)) stdout(`- \`${r.identifiant}\` (${r.lignes} lignes)`);
    if (refuses.length > 10) stdout(`- … et ${refuses.length - 10} autre(s).`);
  }

  if (!options.envoyer) {
    stdout(
      '\nDry-run : aucun envoi, aucune connexion ouverte. Pour transporter réellement, relancer avec ' +
        '--envoyer --url <base>, SUPPLEMENTS_INTERNAL_SECRET et SUPPLEMENTS_TRANSPORT_HOTE dans l’environnement.',
    );
    return;
  }

  stdout(`\nEnvoi vers ${options.url} — ceci ÉCRIT en base (production si l'URL en pointe une).`);
  try {
    const bilan = await envoyerSerie(lots, { url: options.url, secret, fetchImpl });
    stdout(`\nTerminé. ${JSON.stringify(bilan)}`);
  } catch (e) {
    if (e instanceof EnvoiRefuse) {
      stderr(`\n${e.message}`);
      stderr(`Écrit par les lots ACCEPTÉS avant celui-ci : ${JSON.stringify(e.cumulLotsPrecedents)}`);
      stderr(
        `Le lot ${e.rang} lui-même peut avoir commité une partie de ses produits (une transaction par produit) ` +
          'et n’en rend aucun inventaire. Corriger la cause, puis REJOUER depuis le début : ' +
          'l’écriture est idempotente, un produit déjà écrit revient en « produitsInchanges ».',
      );
      stderr('La série s’arrête ici — le lot refusé ne se saute pas.');
    } else {
      stderr(`\nÉchec d’envoi : ${e.message}`);
    }
    sortie(1);
    return;
  }
}

// Exécuté en CLI seulement (import pour test → pas d'exécution de `main`).
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
